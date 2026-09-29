import styles from './FlashCard.module.css'

type FlashCardProps = {
  question: string
  answer: string
  isFlipped: boolean
}

export function FlashCard({ question, answer, isFlipped }: FlashCardProps) {
  return (
    <div className={styles.card}>
      <div className={`${styles.inner} ${isFlipped ? styles.flipped : ''}`}>
        <div className={styles.face} aria-hidden={isFlipped}>
          {question}
        </div>
        <div className={`${styles.face} ${styles.back}`} aria-hidden={!isFlipped}>
          {answer}
        </div>
      </div>
    </div>
  )
}
