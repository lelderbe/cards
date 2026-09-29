import { useState } from 'react'
import type { Deck, Direction } from '../domain/types.ts'
import styles from './StartScreen.module.css'

type StartScreenProps = {
  deck: Deck
  initialDirection: Direction
  onStart: (direction: Direction) => void
}

export function StartScreen({ deck, initialDirection, onStart }: StartScreenProps) {
  const [direction, setDirection] = useState<Direction>(initialDirection)

  const frontLabel = deck.frontLang.toUpperCase()
  const backLabel = deck.backLang.toUpperCase()
  const directionOptions: Array<{ value: Direction; label: string }> = [
    { value: 'front-to-back', label: `${frontLabel} → ${backLabel}` },
    { value: 'back-to-front', label: `${backLabel} → ${frontLabel}` },
  ]

  function handleStart() {
    onStart(direction)
  }

  return (
    <section className={styles.screen}>
      <div className={styles.deck}>
        <h1 className={styles.title}>{deck.title}</h1>
        <p className={styles.count}>{formatCardCount(deck.cards.length)}</p>
      </div>

      <div className={styles.directions} role="radiogroup" aria-label="Направление">
        {directionOptions.map((option) => (
          <button
            className={`${styles.direction} ${option.value === direction ? styles.selected : ''}`}
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === direction}
            onClick={() => setDirection(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <button className={styles.start} type="button" onClick={handleStart}>
        Начать
      </button>
    </section>
  )
}

function formatCardCount(count: number) {
  const lastTwoDigits = count % 100
  const lastDigit = count % 10

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} карточек`
  if (lastDigit === 1) return `${count} карточка`
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} карточки`
  return `${count} карточек`
}
