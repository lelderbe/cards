import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import type { StudySession } from '../domain/studySession.ts';
import { db } from './db.ts';
import { getDeck } from './decks.ts';
import {
  deleteActiveSession,
  deleteExpiredSessions,
  getActiveSession,
  saveActiveSession,
} from './sessions.ts';

const session: StudySession = {
  id: 'session-1',
  direction: 'back-to-front',
  queue: ['b', 'c', 'a'],
  isFlipped: false,
  forgotCounts: { a: 2 },
  cardIds: ['a', 'b', 'c', 'd'],
  totalCards: 4,
};

beforeEach(async () => {
  await db.activeSessions.clear();
});

describe('getDeck', () => {
  it('reads the starter deck', async () => {
    const deck = await getDeck('starter-travel');

    expect(deck?.title).toBe('Путешествия');
  });

  it('returns undefined for an unknown deck', async () => {
    expect(await getDeck('missing')).toBeUndefined();
  });
});

describe('active sessions', () => {
  it('reads a saved session back unchanged', async () => {
    await saveActiveSession('deck-1', session, 1_000);

    expect(await getActiveSession('deck-1')).toEqual({
      deckId: 'deck-1',
      session,
      lastAnsweredAt: 1_000,
    });
  });

  it('keeps a single session per deck: saving replaces the previous one', async () => {
    await saveActiveSession('deck-1', session, 1_000);
    const nextSession: StudySession = { ...session, queue: ['c', 'a'] };

    await saveActiveSession('deck-1', nextSession, 2_000);

    expect(await db.activeSessions.count()).toBe(1);
    expect(await getActiveSession('deck-1')).toEqual({
      deckId: 'deck-1',
      session: nextSession,
      lastAnsweredAt: 2_000,
    });
  });

  it('deletes only the given deck session', async () => {
    await saveActiveSession('deck-1', session, 1_000);
    await saveActiveSession('deck-2', session, 1_000);

    await deleteActiveSession('deck-1');

    expect(await getActiveSession('deck-1')).toBeUndefined();
    expect(await getActiveSession('deck-2')).toBeDefined();
  });
});

describe('deleteExpiredSessions', () => {
  it('deletes only expired sessions', async () => {
    const mondayLate = new Date(2026, 8, 28, 23, 50).getTime();
    const tuesdayNoon = new Date(2026, 8, 29, 12, 0).getTime();
    const wednesdayMorning = new Date(2026, 8, 30, 9, 0).getTime();
    await saveActiveSession('expired', session, mondayLate);
    await saveActiveSession('fresh', session, tuesdayNoon);

    await deleteExpiredSessions(wednesdayMorning);

    expect(await getActiveSession('expired')).toBeUndefined();
    expect(await getActiveSession('fresh')).toBeDefined();
  });
});
