import { Dexie, type EntityTable } from 'dexie';
import { starterDeck } from '../data/starterDeck.ts';
import type { AnswerLogEntry } from '../domain/answerLog.ts';
import { createId } from '../domain/id.ts';
import type { StudySession } from '../domain/studySession.ts';
import type { Deck } from '../domain/types.ts';

export type SavedSession = {
  deckId: string;
  session: StudySession;
  /** Date.now() of the latest answer; the expiry is counted from it. */
  lastAnsweredAt: number;
};

export type CardsDb = Dexie & {
  decks: EntityTable<Deck, 'id'>;
  activeSessions: EntityTable<SavedSession, 'deckId'>;
  answerLog: EntityTable<AnswerLogEntry, 'id'>;
};

export function createDb(name: string): CardsDb {
  const db = new Dexie(name) as CardsDb;

  db.version(1).stores({
    decks: 'id',
    activeSessions: 'deckId',
  });

  db.version(2)
    .stores({
      answerLog: '++id, deckId, cardId, answeredAt',
    })
    .upgrade((transaction) =>
      // Sessions saved before version 2 have no id; it links their answers in the log.
      transaction
        .table<SavedSession>('activeSessions')
        .toCollection()
        .modify((saved) => {
          saved.session.id ??= createId();
        }),
    );

  // Runs once, when the database is created — a deleted starter deck never comes back.
  db.on('populate', (transaction) => {
    transaction.table('decks').add(starterDeck);
  });

  return db;
}

export const db = createDb('cards');
