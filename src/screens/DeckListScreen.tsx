import { useLiveQuery } from 'dexie-react-hooks';
import { StatusMessage } from '../components/StatusMessage.tsx';
import { getDeckList, type DeckSummary } from '../storage/decks.ts';
import { formatCardCount } from './format.ts';
import styles from './DeckListScreen.module.css';

type DeckListScreenProps = {
  onOpenDeck: (deckId: string) => void;
  onCreateDeck: () => void;
};

export function DeckListScreen({ onOpenDeck, onCreateDeck }: DeckListScreenProps) {
  const deckList = useLiveQuery(getDeckList);

  if (!deckList) return <StatusMessage title="Загрузка…" />;

  return (
    <section className={styles.screen}>
      <h1 className={styles.title}>Пачки</h1>

      {deckList.allCards && (
        <DeckButton className={styles.allCards} deck={deckList.allCards} onOpen={onOpenDeck} />
      )}

      <ul className={styles.list}>
        {deckList.decks.map((deck) => (
          <li key={deck.id}>
            <DeckButton className={styles.deck} deck={deck} onOpen={onOpenDeck} />
          </li>
        ))}
      </ul>

      {deckList.decks.length === 0 && (
        <p className={styles.empty}>Пачек пока нет. Создайте первую — по любой теме.</p>
      )}

      <button className={styles.create} type="button" onClick={onCreateDeck}>
        Создать пачку
      </button>
    </section>
  );
}

type DeckButtonProps = {
  className: string;
  deck: DeckSummary;
  onOpen: (deckId: string) => void;
};

function DeckButton({ className, deck, onOpen }: DeckButtonProps) {
  return (
    <button className={className} type="button" onClick={() => onOpen(deck.id)}>
      <span className={styles.deckTitle}>{deck.title}</span>
      <span className={styles.meta}>
        {formatCardCount(deck.cardCount)}
        {deck.remaining !== undefined && (
          <span className={styles.inProgress}> · осталось {deck.remaining}</span>
        )}
      </span>
    </button>
  );
}
