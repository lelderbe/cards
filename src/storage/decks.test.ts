import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createSession } from '../domain/studySession.ts';
import { createDb, db, type StoredCard } from './db.ts';
import {
  ALL_CARDS_DECK_ID,
  deleteDeck,
  getDeck,
  getDeckList,
  saveAllCards,
  saveDeck,
} from './decks.ts';

function card(id: string, deckIds: string[], createdAt: number): StoredCard {
  return { id, front: `front-${id}`, back: `back-${id}`, deckIds, createdAt };
}

beforeEach(async () => {
  await Promise.all([db.decks.clear(), db.cards.clear(), db.activeSessions.clear()]);
  await db.decks.bulkAdd([
    { id: 'travel', title: 'Путешествия', frontLang: 'en', backLang: 'ru', createdAt: 2 },
    { id: 'buildings', title: 'Здания', frontLang: 'en', backLang: 'ru', createdAt: 1 },
  ]);
  await db.cards.bulkAdd([
    card('ticket', ['travel'], 20),
    card('airport', ['travel', 'buildings'], 10),
    card('tower', ['buildings'], 30),
    card('fork', [], 40),
  ]);
});

describe('getDeck', () => {
  it('reads a deck with its cards in creation order', async () => {
    const deck = await getDeck('travel');

    expect(deck?.title).toBe('Путешествия');
    expect(deck?.cards).toEqual([
      { id: 'airport', front: 'front-airport', back: 'back-airport' },
      { id: 'ticket', front: 'front-ticket', back: 'back-ticket' },
    ]);
  });

  it('returns undefined for an unknown deck', async () => {
    expect(await getDeck('missing')).toBeUndefined();
  });

  it('reads every card once into the all-cards deck, including cards without a deck', async () => {
    const deck = await getDeck(ALL_CARDS_DECK_ID);

    expect(deck?.title).toBe('Все карточки');
    expect(deck?.cards.map((card) => card.id)).toEqual(['airport', 'ticket', 'tower', 'fork']);
  });
});

describe('getDeckList', () => {
  it('lists decks in creation order with their card counts', async () => {
    const deckList = await getDeckList();

    expect(deckList.decks.map(({ title, cardCount }) => ({ title, cardCount }))).toEqual([
      { title: 'Здания', cardCount: 2 },
      { title: 'Путешествия', cardCount: 2 },
    ]);
    expect(deckList.allCards?.cardCount).toBe(4);
  });

  it('counts remaining cards of an unfinished session without cards gone from the deck', async () => {
    const travel = await getDeck('travel');
    const session = createSession(travel!, 'front-to-back');
    await db.activeSessions.put({ deckId: 'travel', session, lastAnsweredAt: 1_000 });
    await db.cards.update('ticket', { deckIds: [] });

    const deckList = await getDeckList();

    expect(deckList.decks.find((deck) => deck.id === 'travel')?.remaining).toBe(1);
    expect(deckList.decks.find((deck) => deck.id === 'buildings')?.remaining).toBeUndefined();
  });

  it('has no all-cards entry when there are no cards', async () => {
    await db.cards.clear();

    expect((await getDeckList()).allCards).toBeUndefined();
  });
});

describe('saveDeck', () => {
  it('creates a new deck, joining a matching card instead of duplicating it', async () => {
    const deckId = await saveDeck(
      undefined,
      {
        title: ' Кухня ',
        cards: [
          { id: 'n1', front: 'spoon', back: 'ложка' },
          { id: 'n2', front: 'Front-airport', back: 'back-airport' },
        ],
      },
      100,
    );

    const deck = await getDeck(deckId);
    expect(deck?.title).toBe('Кухня');
    expect(deck?.cards.map((card) => card.id)).toEqual(['airport', 'n1']);
    expect((await db.cards.get('airport'))?.deckIds).toEqual(['travel', 'buildings', deckId]);
    expect(await db.cards.count()).toBe(5);
    expect((await getDeckList()).decks.at(-1)?.title).toBe('Кухня');
  });

  it('shows edited text in every deck of the card', async () => {
    await saveDeck('travel', {
      title: 'Путешествия',
      cards: [
        { id: 'airport', front: 'airport', back: 'аэропорт' },
        { id: 'ticket', front: 'front-ticket', back: 'back-ticket' },
      ],
    });

    const buildings = await getDeck('buildings');
    expect(buildings?.cards.find((card) => card.id === 'airport')?.back).toBe('аэропорт');
  });

  it('takes a left-out card out of the deck but keeps it among all cards', async () => {
    await saveDeck('travel', {
      title: 'Путешествия',
      cards: [{ id: 'airport', front: 'front-airport', back: 'back-airport' }],
    });

    expect((await getDeck('travel'))?.cards.map((card) => card.id)).toEqual(['airport']);
    expect((await getDeck(ALL_CARDS_DECK_ID))?.cards.map((card) => card.id)).toContain('ticket');
  });

  it('keeps the unfinished session when cards are edited or added', async () => {
    const travel = await getDeck('travel');
    const session = createSession(travel!, 'front-to-back');
    await db.activeSessions.put({ deckId: 'travel', session, lastAnsweredAt: 1_000 });

    await saveDeck('travel', {
      title: 'Путешествия',
      cards: [
        { id: 'airport', front: 'airport', back: 'аэропорт' },
        { id: 'ticket', front: 'front-ticket', back: 'back-ticket' },
        { id: 'n1', front: 'map', back: 'карта' },
      ],
    });

    expect(await db.activeSessions.get('travel')).toEqual({
      deckId: 'travel',
      session,
      lastAnsweredAt: 1_000,
    });
    expect((await getDeckList()).decks.find((deck) => deck.id === 'travel')?.remaining).toBe(2);
  });
});

describe('saveAllCards', () => {
  it('deletes left-out cards from every deck and adds new cards without a deck', async () => {
    await saveAllCards({
      title: '',
      cards: [
        { id: 'ticket', front: 'front-ticket', back: 'back-ticket' },
        { id: 'tower', front: 'front-tower', back: 'back-tower' },
        { id: 'fork', front: 'front-fork', back: 'back-fork' },
        { id: 'n1', front: 'spoon', back: 'ложка' },
      ],
    });

    expect(await db.cards.get('airport')).toBeUndefined();
    expect((await getDeck('buildings'))?.cards.map((card) => card.id)).toEqual(['tower']);
    expect((await db.cards.get('n1'))?.deckIds).toEqual([]);
  });
});

describe('deleteDeck', () => {
  it('deletes the deck and its session but keeps its cards and the answer log', async () => {
    const travel = await getDeck('travel');
    await db.activeSessions.put({
      deckId: 'travel',
      session: createSession(travel!, 'front-to-back'),
      lastAnsweredAt: 1_000,
    });
    const logEntryId = await db.answerLog.add({
      sessionId: 's',
      deckId: 'travel',
      cardId: 'ticket',
      direction: 'front-to-back',
      remembered: true,
      wasFlipped: false,
      answeredAt: 1_000,
      durationMs: 1_000,
    });

    await deleteDeck('travel');

    expect(await getDeck('travel')).toBeUndefined();
    expect(await db.activeSessions.get('travel')).toBeUndefined();
    expect((await db.cards.get('ticket'))?.deckIds).toEqual([]);
    expect((await db.cards.get('airport'))?.deckIds).toEqual(['buildings']);
    expect(await db.answerLog.get(logEntryId)).toBeDefined();
  });

  it('does not bring a deleted starter deck back when the database is reopened', async () => {
    const firstOpen = createDb('deleted-starter');
    await firstOpen.decks.delete('starter-travel');
    firstOpen.close();

    const secondOpen = createDb('deleted-starter');

    expect(await secondOpen.decks.count()).toBe(0);
    secondOpen.close();
  });
});
