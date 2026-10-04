import {
  normalizeDraft,
  planAllCardsSave,
  planDeckSave,
  type DeckDraft,
  type PoolCard,
} from '../domain/deckDraft.ts';
import { createId } from '../domain/id.ts';
import { restoreSession } from '../domain/studySession.ts';
import type { Card, Deck } from '../domain/types.ts';
import { db, type SavedSession, type StoredCard, type StoredDeck } from './db.ts';

/** The virtual deck of every card, including cards that belong to no deck. It has no row. */
export const ALL_CARDS_DECK_ID = 'all';
export const ALL_CARDS_TITLE = 'Все карточки';

export type DeckSummary = {
  id: string;
  title: string;
  cardCount: number;
  /** Cards still to remember in the unfinished session, if there is one. */
  remaining: number | undefined;
};

export type DeckList = {
  /** Undefined when there are no cards at all. */
  allCards: DeckSummary | undefined;
  decks: DeckSummary[];
};

/** Reads a deck with its cards; ALL_CARDS_DECK_ID gives the deck of all cards. */
export async function getDeck(deckId: string): Promise<Deck | undefined> {
  if (deckId === ALL_CARDS_DECK_ID) {
    return toAllCardsDeck(await db.cards.toArray());
  }

  const [storedDeck, storedCards] = await Promise.all([
    db.decks.get(deckId),
    db.cards.where('deckIds').equals(deckId).toArray(),
  ]);
  if (!storedDeck) return undefined;

  return toDeck(storedDeck, storedCards);
}

/** Everything the deck list shows, in one read so the list updates as a whole. */
export async function getDeckList(): Promise<DeckList> {
  const [storedDecks, storedCards, savedSessions] = await Promise.all([
    db.decks.toArray(),
    db.cards.toArray(),
    db.activeSessions.toArray(),
  ]);
  const savedByDeckId = new Map(savedSessions.map((saved) => [saved.deckId, saved]));

  function summarize(deck: Deck): DeckSummary {
    return {
      id: deck.id,
      title: deck.title,
      cardCount: deck.cards.length,
      remaining: getRemaining(savedByDeckId.get(deck.id), deck),
    };
  }

  const decks = storedDecks.sort(byCreatedAt).map((storedDeck) =>
    summarize(
      toDeck(
        storedDeck,
        storedCards.filter((card) => card.deckIds.includes(storedDeck.id)),
      ),
    ),
  );

  return {
    allCards: storedCards.length > 0 ? summarize(toAllCardsDeck(storedCards)) : undefined,
    decks,
  };
}

/**
 * Saves a deck draft — a new deck when deckId is undefined — and returns the deck id. New cards
 * matching existing ones join the deck as those cards; cards left out leave this deck only.
 */
export async function saveDeck(
  deckId: string | undefined,
  draft: DeckDraft,
  now: number = Date.now(),
): Promise<string> {
  const id = deckId ?? createId();
  const { title } = normalizeDraft(draft);

  await db.transaction('rw', db.decks, db.cards, async () => {
    const storedCards = await db.cards.toArray();
    const plan = planDeckSave(id, draft, storedCards);

    if (deckId) {
      await db.decks.update(deckId, { title });
    } else {
      await db.decks.add({ id, title, frontLang: 'en', backLang: 'ru', createdAt: now });
    }
    await writeCards(storedCards, plan.put, plan.add, now);
  });

  return id;
}

/** Saves the all-cards draft: cards left out are deleted for good, from every deck. */
export async function saveAllCards(draft: DeckDraft, now: number = Date.now()): Promise<void> {
  await db.transaction('rw', db.cards, async () => {
    const storedCards = await db.cards.toArray();
    const plan = planAllCardsSave(draft, storedCards);

    await db.cards.bulkDelete(plan.deleteIds);
    await writeCards(storedCards, plan.put, plan.add, now);
  });
}

/** Deletes a deck and its unfinished session; its cards and the answer log stay. */
export async function deleteDeck(deckId: string): Promise<void> {
  await db.transaction('rw', db.decks, db.cards, db.activeSessions, async () => {
    await db.decks.delete(deckId);
    await db.activeSessions.delete(deckId);
    await db.cards
      .where('deckIds')
      .equals(deckId)
      .modify((card) => {
        card.deckIds = card.deckIds.filter((id) => id !== deckId);
      });
  });
}

/** Writes planned cards; new cards keep the draft order through createdAt. */
async function writeCards(
  storedCards: StoredCard[],
  put: PoolCard[],
  add: PoolCard[],
  now: number,
) {
  const storedById = new Map(storedCards.map((card) => [card.id, card]));
  const updatedCards = put.map((card) => ({ ...storedById.get(card.id)!, ...card }));
  const newCards = add.map((card, index) => ({ ...card, createdAt: now + index }));

  await db.cards.bulkPut([...updatedCards, ...newCards]);
}

function getRemaining(saved: SavedSession | undefined, deck: Deck): number | undefined {
  if (!saved) return undefined;
  return restoreSession(saved.session, deck)?.queue.length;
}

function toDeck(storedDeck: StoredDeck, storedCards: StoredCard[]): Deck {
  const { createdAt: _createdAt, ...deckFields } = storedDeck;
  return { ...deckFields, cards: toCards(storedCards) };
}

function toAllCardsDeck(storedCards: StoredCard[]): Deck {
  return {
    id: ALL_CARDS_DECK_ID,
    title: ALL_CARDS_TITLE,
    frontLang: 'en',
    backLang: 'ru',
    cards: toCards(storedCards),
  };
}

function toCards(storedCards: StoredCard[]): Card[] {
  return [...storedCards].sort(byCreatedAt).map(({ id, front, back }) => ({ id, front, back }));
}

function byCreatedAt(a: { id: string; createdAt: number }, b: { id: string; createdAt: number }) {
  if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
  return a.id < b.id ? -1 : 1;
}
