import { getResults, getVisibleSide, type StudySession } from '../domain/studySession.ts'
import type { Deck } from '../domain/types.ts'
import styles from './ResultsScreen.module.css'

type ResultsScreenProps = {
  deck: Deck
  session: StudySession
  onRestart: () => void
  onBackToDeck: () => void
}

export function ResultsScreen({ deck, session, onRestart, onBackToDeck }: ResultsScreenProps) {
  const { firstTryCount, totalCards, repeated } = getResults(session, deck)
  const questionSide = getVisibleSide(session.direction, false)
  const answerSide = getVisibleSide(session.direction, true)

  return (
    <section className={styles.screen}>
      <div className={styles.summary}>
        <h1 className={styles.title}>Готово!</h1>
        <p className={styles.score}>
          С первого раза: {firstTryCount} из {totalCards}
        </p>
      </div>

      {repeated.length > 0 && (
        <div className={styles.repeated}>
          <h2 className={styles.subtitle}>Повторялись</h2>
          <ul className={styles.list}>
            {repeated.map(({ card, forgotCount }) => (
              <li className={styles.item} key={card.id}>
                <span className={styles.word}>
                  {card[questionSide]} — <span className={styles.translation}>{card[answerSide]}</span>
                </span>
                <span className={styles.forgotCount}>×{forgotCount}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.primary} type="button" onClick={onRestart}>
          Пройти ещё раз
        </button>
        <button className={styles.secondary} type="button" onClick={onBackToDeck}>
          К пачке
        </button>
      </div>
    </section>
  )
}
