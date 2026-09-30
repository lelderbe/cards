import { useLiveQuery } from 'dexie-react-hooks'
import { StatusMessage } from '../components/StatusMessage.tsx'
import { db } from '../storage/db.ts'
import { formatCardCount } from './format.ts'
import styles from './DeckListScreen.module.css'

type DeckListScreenProps = {
  onOpenDeck: (deckId: string) => void
}

export function DeckListScreen({ onOpenDeck }: DeckListScreenProps) {
  const data = useLiveQuery(async () => {
    const [decks, savedSessions] = await Promise.all([
      db.decks.toArray(),
      db.activeSessions.toArray(),
    ])
    const remainingByDeckId = new Map(
      savedSessions.map((saved) => [saved.deckId, saved.session.queue.length]),
    )
    return { decks, remainingByDeckId }
  })

  if (!data) return <StatusMessage title="Загрузка…" />

  return (
    <section className={styles.screen}>
      <h1 className={styles.title}>Пачки</h1>

      <ul className={styles.list}>
        {data.decks.map((deck) => {
          const remaining = data.remainingByDeckId.get(deck.id)
          return (
            <li key={deck.id}>
              <button className={styles.deck} type="button" onClick={() => onOpenDeck(deck.id)}>
                <span className={styles.deckTitle}>{deck.title}</span>
                <span className={styles.meta}>
                  {formatCardCount(deck.cards.length)}
                  {remaining !== undefined && (
                    <span className={styles.inProgress}> · осталось {remaining}</span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
