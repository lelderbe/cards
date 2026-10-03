import type { StudySession } from './studySession.ts';
import type { Direction } from './types.ts';

export type AnswerLogEntry = {
  /** Auto-incremented by the database. */
  id?: number;
  sessionId: string;
  deckId: string;
  cardId: string;
  direction: Direction;
  remembered: boolean;
  /** Whether the answer side was visible at the moment of answering. */
  wasFlipped: boolean;
  /** Date.now() at the answer. */
  answeredAt: number;
  /** From the card being shown to the answer; raw, outliers are filtered when reading. */
  durationMs: number;
};

export type AnswerTiming = {
  answeredAt: number;
  durationMs: number;
};

/** Builds the log entry for an answer to the current card; `session` is the state before the answer. */
export function createAnswerLogEntry(
  deckId: string,
  session: StudySession,
  remembered: boolean,
  timing: AnswerTiming,
): AnswerLogEntry {
  return {
    sessionId: session.id,
    deckId,
    cardId: session.queue[0],
    direction: session.direction,
    remembered,
    wasFlipped: session.isFlipped,
    answeredAt: timing.answeredAt,
    durationMs: timing.durationMs,
  };
}
