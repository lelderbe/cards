import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DeckEditor } from '../components/DeckEditor.tsx';
import { StatusMessage } from '../components/StatusMessage.tsx';
import { draftFromGenerated, type DeckDraft } from '../domain/deckDraft.ts';
import { generateDeck } from '../generation/generateDeck.ts';
import { GenerationError, type GenerationErrorKind } from '../generation/generator.ts';
import { saveDeck } from '../storage/decks.ts';
import { alertSaveError } from './alertSaveError.ts';
import styles from './CreateDeckScreen.module.css';

const MAX_TOPIC_LENGTH = 100;

type Step =
  | { name: 'topic' }
  | { name: 'generating' }
  | { name: 'failed'; kind: GenerationErrorKind }
  | { name: 'draft'; draft: DeckDraft };

const failureMessages: Record<GenerationErrorKind, { title: string; details: string }> = {
  network: {
    title: 'Нет подключения к интернету',
    details: 'Проверьте сеть и попробуйте ещё раз.',
  },
  failed: {
    title: 'Не удалось составить пачку',
    details: 'Попробуйте ещё раз или измените тему.',
  },
};

type CreateDeckScreenProps = {
  onSaved: (deckId: string) => void;
  onCancel: () => void;
};

export function CreateDeckScreen({ onSaved, onCancel }: CreateDeckScreenProps) {
  const [topic, setTopic] = useState('');
  const [step, setStep] = useState<Step>({ name: 'topic' });
  const generationRef = useRef<AbortController>(null);

  // Leaving the screen drops a generation still in flight.
  useEffect(() => () => generationRef.current?.abort(), []);

  const canGenerate = topic.trim() !== '';

  function generate() {
    generationRef.current?.abort();
    const generation = new AbortController();
    generationRef.current = generation;
    setStep({ name: 'generating' });

    generateDeck(topic.trim(), generation.signal)
      .then((generated) => {
        if (generation.signal.aborted) return;
        setStep({ name: 'draft', draft: draftFromGenerated(generated) });
      })
      .catch((error: unknown) => {
        if (generation.signal.aborted) return;
        console.error('Failed to generate a deck', error);
        setStep({ name: 'failed', kind: error instanceof GenerationError ? error.kind : 'failed' });
      });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canGenerate) return;
    generate();
  }

  function handleCancelGeneration() {
    generationRef.current?.abort();
    setStep({ name: 'topic' });
  }

  function handleSave(draft: DeckDraft) {
    saveDeck(undefined, draft).then(onSaved).catch(alertSaveError);
  }

  if (step.name === 'generating') {
    return (
      <StatusMessage
        title="Составляю пачку…"
        details={`Тема: ${topic.trim()}`}
        actions={[{ label: 'Отмена', onClick: handleCancelGeneration }]}
      />
    );
  }

  if (step.name === 'failed') {
    return (
      <StatusMessage
        {...failureMessages[step.kind]}
        actions={[
          { label: 'Повторить', onClick: generate },
          { label: 'Изменить тему', onClick: () => setStep({ name: 'topic' }) },
        ]}
      />
    );
  }

  if (step.name === 'draft') {
    return (
      <DeckEditor
        mode="deck"
        initialDraft={step.draft}
        isNew
        onSave={handleSave}
        onCancel={onCancel}
      />
    );
  }

  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <button className={styles.back} type="button" onClick={onCancel}>
          ← Пачки
        </button>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Новая пачка</h1>
        <label className={styles.field}>
          <span className={styles.label}>Тема</span>
          <input
            className={styles.input}
            value={topic}
            maxLength={MAX_TOPIC_LENGTH}
            enterKeyHint="go"
            placeholder="Например, кухня"
            onChange={(event) => setTopic(event.target.value)}
          />
        </label>
        <button className={styles.primary} type="submit" disabled={!canGenerate}>
          Составить
        </button>
      </form>
    </section>
  );
}
