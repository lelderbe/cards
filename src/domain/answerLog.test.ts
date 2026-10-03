import { describe, expect, it } from 'vitest';
import { createAnswerLogEntry } from './answerLog.ts';
import { studySessionReducer, type StudySession } from './studySession.ts';

const session: StudySession = {
  id: 'session-1',
  direction: 'back-to-front',
  queue: ['b', 'a'],
  isFlipped: false,
  forgotCounts: {},
  totalCards: 2,
};

const timing = { answeredAt: 1_000, durationMs: 2_500 };

describe('createAnswerLogEntry', () => {
  it('records the current card, session, deck, direction and timing', () => {
    expect(createAnswerLogEntry('deck-1', session, true, timing)).toEqual({
      sessionId: 'session-1',
      deckId: 'deck-1',
      cardId: 'b',
      direction: 'back-to-front',
      remembered: true,
      wasFlipped: false,
      answeredAt: 1_000,
      durationMs: 2_500,
    });
  });

  it('records "forget" answers', () => {
    expect(createAnswerLogEntry('deck-1', session, false, timing).remembered).toBe(false);
  });

  it('marks an answer given with the answer side visible', () => {
    const flipped = studySessionReducer(session, { type: 'flip' });
    expect(createAnswerLogEntry('deck-1', flipped, false, timing).wasFlipped).toBe(true);
  });

  it('records the visible side, so flipping back and forth counts as not flipped', () => {
    const flippedBack = [{ type: 'flip' } as const, { type: 'flip' } as const].reduce(
      studySessionReducer,
      session,
    );
    expect(createAnswerLogEntry('deck-1', flippedBack, true, timing).wasFlipped).toBe(false);
  });
});
