import { useEffect, useRef, useState, type Ref } from 'react';
import {
  createEmptyCard,
  getRemovedCardIds,
  isDraftChanged,
  validateDraft,
  type DeckDraft,
  type DraftCard,
} from '../domain/deckDraft.ts';
import { formatCardCountAccusative } from '../screens/format.ts';
import styles from './DeckEditor.module.css';

/** «deck»: a new or saved deck, × takes a card out of it. «all»: every card, × deletes for good. */
export type DeckEditorMode = 'deck' | 'all';

type DeckEditorProps = {
  mode: DeckEditorMode;
  initialDraft: DeckDraft;
  /** A draft that is not saved anywhere yet. */
  isNew: boolean;
  onSave: (draft: DeckDraft) => void;
  onCancel: () => void;
  /** Shown as «Удалить пачку» when given. */
  onDelete?: () => void;
};

export function DeckEditor({
  mode,
  initialDraft,
  isNew,
  onSave,
  onCancel,
  onDelete,
}: DeckEditorProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [focusCardId, setFocusCardId] = useState<string>();
  const focusInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    focusInputRef.current?.focus();
  }, [focusCardId]);

  const { canSave, incompleteCardIds } = validateDraft(draft, { requireTitle: mode === 'deck' });

  function handleCancel() {
    const hasUnsavedChanges = isNew || isDraftChanged(draft, initialDraft);
    if (hasUnsavedChanges && !window.confirm('Выйти без сохранения?')) return;
    onCancel();
  }

  function handleSave() {
    if (!canSave) return;

    if (mode === 'all') {
      const removedCount = getRemovedCardIds(draft, initialDraft).length;
      const question =
        `Удалить навсегда ${formatCardCountAccusative(removedCount)}? ` +
        (removedCount === 1 ? 'Она пропадёт из всех пачек.' : 'Они пропадут из всех пачек.');
      if (removedCount > 0 && !window.confirm(question)) return;
    }

    onSave(draft);
  }

  function handleDelete() {
    const question = `Удалить пачку „${initialDraft.title}“? Карточки останутся во «Всех карточках».`;
    if (!window.confirm(question)) return;
    onDelete?.();
  }

  function handleTitleChange(title: string) {
    setDraft((current) => ({ ...current, title }));
  }

  function handleCardChange(cardId: string, side: 'front' | 'back', value: string) {
    setDraft((current) => ({
      ...current,
      cards: current.cards.map((card) => (card.id === cardId ? { ...card, [side]: value } : card)),
    }));
  }

  function handleRemoveCard(cardId: string) {
    setDraft((current) => ({
      ...current,
      cards: current.cards.filter((card) => card.id !== cardId),
    }));
  }

  function handleAddCard() {
    const card = createEmptyCard();
    setDraft((current) => ({ ...current, cards: [...current.cards, card] }));
    setFocusCardId(card.id);
  }

  return (
    <section className={styles.editor}>
      <header className={styles.header}>
        <button className={styles.headerButton} type="button" onClick={handleCancel}>
          Отмена
        </button>
        <h1 className={styles.heading}>{getHeading(mode, isNew)}</h1>
        <button
          className={`${styles.headerButton} ${styles.save}`}
          type="button"
          disabled={!canSave}
          onClick={handleSave}
        >
          Сохранить
        </button>
      </header>

      <div className={styles.content}>
        {mode === 'deck' && (
          <label className={styles.titleField}>
            <span className={styles.label}>Название</span>
            <input
              className={styles.input}
              value={draft.title}
              onChange={(event) => handleTitleChange(event.target.value)}
            />
          </label>
        )}

        <ol className={styles.cards}>
          {draft.cards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              isIncomplete={incompleteCardIds.has(card.id)}
              removeLabel={mode === 'all' ? 'Удалить навсегда' : 'Убрать из пачки'}
              frontInputRef={card.id === focusCardId ? focusInputRef : undefined}
              onChange={handleCardChange}
              onRemove={handleRemoveCard}
            />
          ))}
        </ol>

        <button className={styles.add} type="button" onClick={handleAddCard}>
          + Добавить карточку
        </button>

        {onDelete && (
          <button className={styles.delete} type="button" onClick={handleDelete}>
            Удалить пачку
          </button>
        )}
      </div>
    </section>
  );
}

type CardRowProps = {
  card: DraftCard;
  isIncomplete: boolean;
  removeLabel: string;
  frontInputRef: Ref<HTMLInputElement> | undefined;
  onChange: (cardId: string, side: 'front' | 'back', value: string) => void;
  onRemove: (cardId: string) => void;
};

function CardRow({
  card,
  isIncomplete,
  removeLabel,
  frontInputRef,
  onChange,
  onRemove,
}: CardRowProps) {
  return (
    <li className={`${styles.card} ${isIncomplete ? styles.incomplete : ''}`}>
      <div className={styles.sides}>
        <input
          className={styles.input}
          ref={frontInputRef}
          lang="en"
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="EN"
          aria-label="Слово"
          value={card.front}
          onChange={(event) => onChange(card.id, 'front', event.target.value)}
        />
        <input
          className={styles.input}
          lang="ru"
          placeholder="RU"
          aria-label="Перевод"
          value={card.back}
          onChange={(event) => onChange(card.id, 'back', event.target.value)}
        />
        {isIncomplete && <p className={styles.hint}>Заполните обе стороны</p>}
      </div>
      <button
        className={styles.remove}
        type="button"
        aria-label={removeLabel}
        title={removeLabel}
        onClick={() => onRemove(card.id)}
      >
        ×
      </button>
    </li>
  );
}

function getHeading(mode: DeckEditorMode, isNew: boolean) {
  if (mode === 'all') return 'Все карточки';
  return isNew ? 'Новая пачка' : 'Правка пачки';
}
