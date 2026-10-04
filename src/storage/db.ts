import { Dexie, type EntityTable, type Transaction } from 'dexie';
import { starterDeck } from '../data/starterDeck.ts';
import type { AnswerLogEntry } from '../domain/answerLog.ts';
import { createId } from '../domain/id.ts';
import type { StudySession } from '../domain/studySession.ts';
import type { Card, Deck } from '../domain/types.ts';

/** A deck row; its cards live in the cards table and point back to it with deckIds. */
export type StoredDeck = Omit<Deck, 'cards'> & {
  /** Orders the deck list. */
  createdAt: number;
};

/** A card is stored once and may belong to several decks — or to none. */
export type StoredCard = Card & {
  deckIds: string[];
  /** Orders cards inside a deck. */
  createdAt: number;
};

export type SavedSession = {
  deckId: string;
  session: StudySession;
  /** Date.now() of the latest answer; the expiry is counted from it. */
  lastAnsweredAt: number;
};

export type CardsDb = Dexie & {
  decks: EntityTable<StoredDeck, 'id'>;
  cards: EntityTable<StoredCard, 'id'>;
  activeSessions: EntityTable<SavedSession, 'deckId'>;
  answerLog: EntityTable<AnswerLogEntry, 'id'>;
};

/** Splits a deck with cards into rows; card createdAt follows the deck order. */
export function toStoredDeck(deck: Deck, createdAt: number, firstCardCreatedAt = createdAt) {
  const { cards, ...deckFields } = deck;
  const storedDeck: StoredDeck = { ...deckFields, createdAt };
  const storedCards: StoredCard[] = cards.map((card, index) => ({
    ...card,
    deckIds: [deck.id],
    createdAt: firstCardCreatedAt + index,
  }));
  return { storedDeck, storedCards };
}

export function createDb(name: string): CardsDb {
  const db = new Dexie(name) as CardsDb;

  db.version(1).stores({
    decks: 'id',
    activeSessions: 'deckId',
  });

  db.version(2)
    .stores({
      answerLog: '++id, deckId, cardId, answeredAt',
    })
    .upgrade((transaction) =>
      // Sessions saved before version 2 have no id; it links their answers in the log.
      transaction
        .table<SavedSession>('activeSessions')
        .toCollection()
        .modify((saved) => {
          saved.session.id ??= createId();
        }),
    );

  db.version(3)
    .stores({
      decks: 'id, createdAt',
      cards: 'id, *deckIds',
    })
    .upgrade(moveCardsOutOfDecks);

  // Runs once, when the database is created — a deleted starter deck never comes back.
  db.on('populate', (transaction) => {
    const { storedDeck, storedCards } = toStoredDeck(starterDeck, 0);
    transaction.table('decks').add(storedDeck);
    transaction.table('cards').bulkAdd(storedCards);
  });

  return db;
}

/** Version 3: cards move from inside their deck to the cards table; sessions learn their cards. */
async function moveCardsOutOfDecks(transaction: Transaction) {
  const decks = await transaction.table<Deck>('decks').toArray();
  const cardIdsByDeckId = new Map<string, string[]>();
  let nextCardCreatedAt = 0;

  for (const [index, deck] of decks.entries()) {
    const { storedDeck, storedCards } = toStoredDeck(deck, index, nextCardCreatedAt);
    nextCardCreatedAt += storedCards.length;
    cardIdsByDeckId.set(
      deck.id,
      storedCards.map((card) => card.id),
    );
    await transaction.table('decks').put(storedDeck);
    await transaction.table('cards').bulkPut(storedCards);
  }

  // Deck contents never changed before version 3, so the deck's cards are the session's cards.
  await transaction
    .table<SavedSession>('activeSessions')
    .toCollection()
    .modify((saved) => {
      saved.session.cardIds ??= cardIdsByDeckId.get(saved.deckId) ?? saved.session.queue;
    });
}

export const db = createDb('cards');
