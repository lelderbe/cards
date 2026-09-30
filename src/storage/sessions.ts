import { isSessionFresh } from '../domain/sessionExpiry.ts'
import type { StudySession } from '../domain/studySession.ts'
import { db, type SavedSession } from './db.ts'

/** Replaces the deck's previous unfinished session, if any. */
export async function saveActiveSession(
  deckId: string,
  session: StudySession,
  now: number,
): Promise<void> {
  await db.activeSessions.put({ deckId, session, lastAnsweredAt: now })
}

export function getActiveSession(deckId: string): Promise<SavedSession | undefined> {
  return db.activeSessions.get(deckId)
}

export async function deleteActiveSession(deckId: string): Promise<void> {
  await db.activeSessions.delete(deckId)
}

/** Removes unfinished sessions whose expiry has passed. Called once at app start. */
export async function deleteExpiredSessions(now: number): Promise<void> {
  await db.activeSessions
    .filter((saved) => !isSessionFresh(saved.lastAnsweredAt, now))
    .delete()
}
