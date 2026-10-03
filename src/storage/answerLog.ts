import type { AnswerLogEntry } from '../domain/answerLog.ts';
import { isSessionFinished, type StudySession } from '../domain/studySession.ts';
import { db } from './db.ts';
import { deleteActiveSession, saveActiveSession } from './sessions.ts';

/**
 * Logs an answer and, in the same transaction, saves the session it led to — or deletes it
 * once finished — so the log and the unfinished session never disagree.
 */
export async function recordAnswer(
  entry: AnswerLogEntry,
  nextSession: StudySession,
): Promise<void> {
  await db.transaction('rw', db.answerLog, db.activeSessions, async () => {
    await db.answerLog.add(entry);

    if (isSessionFinished(nextSession)) {
      await deleteActiveSession(entry.deckId);
      return;
    }

    await saveActiveSession(entry.deckId, nextSession, entry.answeredAt);
  });
}
