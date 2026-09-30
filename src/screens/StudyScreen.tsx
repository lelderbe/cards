import { useRef, useState } from 'react'
import { FlashCard } from '../components/FlashCard.tsx'
import { SwipeableCard, type SwipeableCardHandle } from '../components/SwipeableCard.tsx'
import {
  getCurrentCard,
  getVisibleSide,
  isSessionFinished,
  studySessionReducer,
  type StudySession,
} from '../domain/studySession.ts'
import type { Deck } from '../domain/types.ts'
import styles from './StudyScreen.module.css'

type StudyScreenProps = {
  deck: Deck
  initialSession: StudySession
  onProgress: (session: StudySession) => void
  onFinish: (session: StudySession) => void
  onExit: () => void
}

export function StudyScreen({
  deck,
  initialSession,
  onProgress,
  onFinish,
  onExit,
}: StudyScreenProps) {
  const [session, setSession] = useState(initialSession)
  // Changes on every answer so the next card (even the same one) mounts fresh at the center.
  const [answerCount, setAnswerCount] = useState(0)
  const cardRef = useRef<SwipeableCardHandle>(null)

  const card = getCurrentCard(session, deck)
  if (!card) return null

  const question = card[getVisibleSide(session.direction, false)]
  const answer = card[getVisibleSide(session.direction, true)]

  function handleFlip() {
    setSession((current) => studySessionReducer(current, { type: 'flip' }))
  }

  function handleAnswer(remembered: boolean) {
    const nextSession = studySessionReducer(session, { type: 'answer', remembered })
    if (isSessionFinished(nextSession)) {
      onFinish(nextSession)
      return
    }

    setSession(nextSession)
    onProgress(nextSession)
    setAnswerCount((count) => count + 1)
  }

  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.exit} type="button" onClick={onExit}>
          Выйти
        </button>
        <span className={styles.remaining}>Осталось {session.queue.length}</span>
      </header>

      <div className={styles.cardArea}>
        <SwipeableCard
          key={answerCount}
          ref={cardRef}
          onTap={handleFlip}
          onAnswer={handleAnswer}
        >
          <FlashCard question={question} answer={answer} isFlipped={session.isFlipped} />
        </SwipeableCard>
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.answer} ${styles.forget}`}
          type="button"
          onClick={() => cardRef.current?.swipe(false)}
        >
          Не помню
        </button>
        <button
          className={`${styles.answer} ${styles.remember}`}
          type="button"
          onClick={() => cardRef.current?.swipe(true)}
        >
          Помню
        </button>
      </div>
    </section>
  )
}
