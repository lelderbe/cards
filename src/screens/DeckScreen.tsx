import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { StatusMessage } from '../components/StatusMessage.tsx';
import { restoreSession, type StudySession } from '../domain/studySession.ts';
import type { Deck, Direction } from '../domain/types.ts';
import { db } from '../storage/db.ts';
import { formatCardCount, formatDirection } from './format.ts';
import styles from './DeckScreen.module.css';

type DeckScreenProps = {
  deckId: string;
  lastDirection: Direction;
  onBack: () => void;
  onStart: (deck: Deck, direction: Direction) => void;
  onContinue: (deck: Deck, session: StudySession) => void;
};

export function DeckScreen({ deckId, ...props }: DeckScreenProps) {
  const data = useLiveQuery(async () => {
    const [deck, saved] = await Promise.all([db.decks.get(deckId), db.activeSessions.get(deckId)]);
    return { deck, saved };
  }, [deckId]);

  if (!data) return <StatusMessage title="Загрузка…" />;
  if (!data.deck) return <StatusMessage title="Пачка не найдена" />;

  const unfinishedSession = data.saved && restoreSession(data.saved.session, data.deck);

  return <DeckDetails deck={data.deck} unfinishedSession={unfinishedSession} {...props} />;
}

type DeckDetailsProps = Omit<DeckScreenProps, 'deckId'> & {
  deck: Deck;
  unfinishedSession: StudySession | undefined;
};

function DeckDetails({
  deck,
  unfinishedSession,
  lastDirection,
  onBack,
  onStart,
  onContinue,
}: DeckDetailsProps) {
  // Applies to a new session only; "Продолжить" keeps the unfinished session's direction.
  const [direction, setDirection] = useState<Direction>(
    unfinishedSession?.direction ?? lastDirection,
  );

  const directionOptions: Direction[] = ['front-to-back', 'back-to-front'];

  function handleStart() {
    onStart(deck, direction);
  }

  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.back} type="button" onClick={onBack}>
          ← Пачки
        </button>
      </header>

      <div className={styles.content}>
        <div className={styles.deck}>
          <h1 className={styles.title}>{deck.title}</h1>
          <p className={styles.count}>{formatCardCount(deck.cards.length)}</p>
        </div>

        <div className={styles.directions} role="radiogroup" aria-label="Направление">
          {directionOptions.map((option) => (
            <button
              className={`${styles.direction} ${option === direction ? styles.selected : ''}`}
              key={option}
              type="button"
              role="radio"
              aria-checked={option === direction}
              onClick={() => setDirection(option)}
            >
              {formatDirection(deck, option)}
            </button>
          ))}
        </div>

        {unfinishedSession ? (
          <div className={styles.actions}>
            <button
              className={styles.primary}
              type="button"
              onClick={() => onContinue(deck, unfinishedSession)}
            >
              Продолжить
              <span className={styles.progress}>
                {formatDirection(deck, unfinishedSession.direction)} · осталось{' '}
                {unfinishedSession.queue.length}
              </span>
            </button>
            <button className={styles.quiet} type="button" onClick={handleStart}>
              Начать заново
            </button>
          </div>
        ) : (
          <button className={styles.primary} type="button" onClick={handleStart}>
            Начать
          </button>
        )}
      </div>
    </section>
  );
}
