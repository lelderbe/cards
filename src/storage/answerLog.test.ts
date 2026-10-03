import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createAnswerLogEntry } from '../domain/answerLog.ts';
import { studySessionReducer, type StudySession } from '../domain/studySession.ts';
import { recordAnswer } from './answerLog.ts';
import { db } from './db.ts';
import { deleteActiveSession, deleteExpiredSessions, getActiveSession } from './sessions.ts';

const deckId = 'deck-1';

const start: StudySession = {
  id: 'session-1',
  direction: 'front-to-back',
  queue: ['a', 'b'],
  isFlipped: false,
  forgotCounts: {},
  totalCards: 2,
};

/** Answers the current card the way the study screen does and returns the next session. */
async function answer(session: StudySession, remembered: boolean, answeredAt: number) {
  const entry = createAnswerLogEntry(deckId, session, remembered, {
    answeredAt,
    durationMs: 1_500,
  });
  const nextSession = studySessionReducer(session, { type: 'answer', remembered });
  await recordAnswer(entry, nextSession);
  return nextSession;
}

beforeEach(async () => {
  await db.answerLog.clear();
  await db.activeSessions.clear();
});

describe('recordAnswer', () => {
  it('logs the answer and saves the unfinished session', async () => {
    const next = await answer(start, true, 1_000);

    const entries = await db.answerLog.toArray();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ sessionId: 'session-1', cardId: 'a', remembered: true });
    expect(await getActiveSession(deckId)).toEqual({
      deckId,
      session: next,
      lastAnsweredAt: 1_000,
    });
  });

  it('logs the last answer and deletes the finished session', async () => {
    const afterFirst = await answer(start, true, 1_000);
    await answer(afterFirst, true, 2_000);

    expect(await db.answerLog.count()).toBe(2);
    expect(await getActiveSession(deckId)).toBeUndefined();
  });

  it('logs every repeated answer to the same card separately', async () => {
    let session = await answer(start, false, 1_000); // a → end of queue
    session = await answer(session, true, 2_000); // b
    session = await answer(session, false, 3_000); // a again
    await answer(session, true, 4_000); // a

    const entries = await db.answerLog.orderBy('answeredAt').toArray();
    expect(entries.map((entry) => [entry.cardId, entry.remembered])).toEqual([
      ['a', false],
      ['b', true],
      ['a', false],
      ['a', true],
    ]);
  });

  it('keeps the log when the unfinished session is deleted or expires', async () => {
    await answer(start, true, 1_000);

    await deleteActiveSession(deckId);
    await answer(start, false, 2_000);
    await deleteExpiredSessions(Date.UTC(2100, 0, 1));

    expect(await db.answerLog.count()).toBe(2);
    expect(await getActiveSession(deckId)).toBeUndefined();
  });

  it('saves nothing when the session cannot be saved', async () => {
    const entry = createAnswerLogEntry(deckId, start, true, { answeredAt: 1_000, durationMs: 1 });
    // A function cannot be stored in IndexedDB, so saving this session fails after logging.
    const unsavable = { ...start, queue: ['b'], extra: () => {} } as StudySession;

    await expect(recordAnswer(entry, unsavable)).rejects.toThrow();

    expect(await db.answerLog.count()).toBe(0);
    expect(await getActiveSession(deckId)).toBeUndefined();
  });
});
