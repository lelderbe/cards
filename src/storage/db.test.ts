import 'fake-indexeddb/auto';
import { Dexie } from 'dexie';
import { describe, expect, it } from 'vitest';
import { starterDeck } from '../data/starterDeck.ts';
import { restoreSession } from '../domain/studySession.ts';
import { createDb } from './db.ts';

const starterCardIds = starterDeck.cards.map((card) => card.id);

describe('createDb', () => {
  it('adds the starter deck and its cards to a new database', async () => {
    const db = createDb('populate-new');

    const decks = await db.decks.toArray();
    const cards = await db.cards.toCollection().sortBy('createdAt');

    expect(decks).toEqual([
      {
        id: starterDeck.id,
        title: starterDeck.title,
        frontLang: 'en',
        backLang: 'ru',
        createdAt: 0,
      },
    ]);
    expect(cards.map((card) => card.id)).toEqual(starterCardIds);
    expect(cards.every((card) => card.deckIds.join() === starterDeck.id)).toBe(true);
    db.close();
  });

  it('does not add the starter deck again when the database is reopened', async () => {
    const firstOpen = createDb('populate-reopen');
    await firstOpen.open();
    firstOpen.close();

    const secondOpen = createDb('populate-reopen');

    expect(await secondOpen.decks.count()).toBe(1);
    expect(await secondOpen.cards.count()).toBe(starterDeck.cards.length);
    secondOpen.close();
  });

  it('keeps decks and unfinished sessions when upgrading from version 1', async () => {
    const oldDb = new Dexie('upgrade-from-v1');
    oldDb.version(1).stores({ decks: 'id', activeSessions: 'deckId' });
    await oldDb.table('decks').add(starterDeck);
    // A session as saved by version 0.2: no id yet.
    await oldDb.table('activeSessions').add({
      deckId: starterDeck.id,
      session: {
        direction: 'front-to-back',
        queue: ['travel-1'],
        isFlipped: false,
        forgotCounts: {},
        totalCards: 25,
      },
      lastAnsweredAt: 1_000,
    });
    oldDb.close();

    const db = createDb('upgrade-from-v1');
    const saved = await db.activeSessions.get(starterDeck.id);

    expect(await db.cards.count()).toBe(starterDeck.cards.length);
    expect(saved?.session.queue).toEqual(['travel-1']);
    expect(saved?.lastAnsweredAt).toBe(1_000);
    expect(saved?.session.id).toMatch(/^[0-9a-f]{32}$/);
    expect(await db.answerLog.count()).toBe(0);
    db.close();
  });

  it('moves cards out of decks and keeps unfinished sessions when upgrading from version 2', async () => {
    const oldDb = new Dexie('upgrade-from-v2');
    oldDb.version(1).stores({ decks: 'id', activeSessions: 'deckId' });
    oldDb.version(2).stores({ answerLog: '++id, deckId, cardId, answeredAt' });
    await oldDb.table('decks').add(starterDeck);
    // A session as saved by version 0.4: no cardIds yet.
    await oldDb.table('activeSessions').add({
      deckId: starterDeck.id,
      session: {
        id: 'session-1',
        direction: 'back-to-front',
        queue: ['travel-3', 'travel-1'],
        isFlipped: false,
        forgotCounts: { 'travel-1': 1 },
        totalCards: 25,
      },
      lastAnsweredAt: 1_000,
    });
    await oldDb.table('answerLog').add({ sessionId: 'session-1', cardId: 'travel-1' });
    oldDb.close();

    const db = createDb('upgrade-from-v2');
    const decks = await db.decks.toArray();
    const cards = await db.cards.toCollection().sortBy('createdAt');
    const saved = await db.activeSessions.get(starterDeck.id);

    expect(decks).toEqual([
      {
        id: starterDeck.id,
        title: starterDeck.title,
        frontLang: 'en',
        backLang: 'ru',
        createdAt: 0,
      },
    ]);
    expect(cards.map(({ id, front, back }) => ({ id, front, back }))).toEqual(starterDeck.cards);
    expect(cards.every((card) => card.deckIds.join() === starterDeck.id)).toBe(true);
    expect(saved?.session.cardIds).toEqual(starterCardIds);
    expect(saved?.lastAnsweredAt).toBe(1_000);
    expect(await db.answerLog.count()).toBe(1);

    const restored = saved && restoreSession(saved.session, starterDeck);
    expect(restored?.queue).toEqual(['travel-3', 'travel-1']);
    expect(restored?.forgotCounts).toEqual({ 'travel-1': 1 });
    expect(restored?.totalCards).toBe(25);
    db.close();
  });
});
