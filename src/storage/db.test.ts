import 'fake-indexeddb/auto';
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
});
