import { useEffect, useState } from 'react';
import { DeckEditor } from '../components/DeckEditor.tsx';
import { StatusMessage } from '../components/StatusMessage.tsx';
import { draftFromDeck, type DeckDraft } from '../domain/deckDraft.ts';
import type { Deck } from '../domain/types.ts';
import {
  ALL_CARDS_DECK_ID,
  deleteDeck,
  getDeck,
  saveAllCards,
  saveDeck,
} from '../storage/decks.ts';
import { alertSaveError } from './alertSaveError.ts';

type EditDeckScreenProps = {
  deckId: string;
  onSaved: (deckId: string) => void;
  onCancel: () => void;
  onDeleted: () => void;
};

export function EditDeckScreen({ deckId, onSaved, onCancel, onDeleted }: EditDeckScreenProps) {
  // Read once: later changes to the deck must not reset what is being edited.
  const [deck, setDeck] = useState<Deck | null>();

  useEffect(() => {
    let isCurrent = true;
    getDeck(deckId)
      .then((loadedDeck) => {
        if (isCurrent) setDeck(loadedDeck ?? null);
      })
      .catch((error: unknown) => {
        console.error('Failed to read the deck', error);
        if (isCurrent) setDeck(null);
      });
    return () => {
      isCurrent = false;
    };
  }, [deckId]);

  if (deck === undefined) return <StatusMessage title="Загрузка…" />;
  if (deck === null) return <StatusMessage title="Пачка не найдена" />;

  const isAllCards = deckId === ALL_CARDS_DECK_ID;

  function handleSave(draft: DeckDraft) {
    const saving = isAllCards ? saveAllCards(draft) : saveDeck(deckId, draft);
    saving.then(() => onSaved(deckId)).catch(alertSaveError);
  }

  function handleDelete() {
    deleteDeck(deckId).then(onDeleted).catch(alertSaveError);
  }

  return (
    <DeckEditor
      mode={isAllCards ? 'all' : 'deck'}
      initialDraft={draftFromDeck(deck)}
      isNew={false}
      onSave={handleSave}
      onCancel={onCancel}
      onDelete={isAllCards ? undefined : handleDelete}
    />
  );
}
