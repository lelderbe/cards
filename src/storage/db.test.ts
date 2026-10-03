import 'fake-indexeddb/auto';
import { Dexie } from 'dexie';
import { describe, expect, it } from 'vitest';
import { starterDeck } from '../data/starterDeck.ts';
import { createDb } from './db.ts';

describe('createDb', () => {
  it('adds the starter deck to a new database', async () => {
    const db = createDb('populate-new');

    const decks = await db.decks.toArray();

    expect(decks).toEqual([starterDeck]);
    db.close();
  });

  it('does not add the starter deck again when the database is reopened', async () => {
    const firstOpen = createDb('populate-reopen');
    await firstOpen.open();
    firstOpen.close();

    const secondOpen = createDb('populate-reopen');
    const decks = await secondOpen.decks.toArray();

    expect(decks).toHaveLength(1);
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
    const decks = await db.decks.toArray();
    const saved = await db.activeSessions.get(starterDeck.id);

    expect(decks).toEqual([starterDeck]);
    expect(saved?.session.queue).toEqual(['travel-1']);
    expect(saved?.lastAnsweredAt).toBe(1_000);
    expect(saved?.session.id).toMatch(/^[0-9a-f]{32}$/);
    expect(await db.answerLog.count()).toBe(0);
    db.close();
  });
});
