import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DeckEditor } from '../components/DeckEditor.tsx';
import { StatusMessage } from '../components/StatusMessage.tsx';
import { draftFromGenerated, type DeckDraft } from '../domain/deckDraft.ts';
import { setAccessCode } from '../generation/accessCode.ts';
import { generateDeck } from '../generation/generateDeck.ts';
import { GenerationError, type AccessCodeProblem } from '../generation/generator.ts';
import { MAX_TOPIC_LENGTH } from '../generation/validateDeck.ts';
import { saveDeck } from '../storage/decks.ts';
import { alertSaveError } from './alertSaveError.ts';
import styles from './CreateDeckScreen.module.css';

type Step =
  | { name: 'topic' }
  | { name: 'generating' }
  | { name: 'failed'; kind: 'network' | 'failed' }
  | { name: 'accessCode'; problem: AccessCodeProblem }
  | { name: 'draft'; draft: DeckDraft };

type Message = { title: string; details: string };

const failureMessages: Record<'network' | 'failed', Message> = {
  network: {
    title: 'Нет подключения к интернету',
    details: 'Проверьте сеть и попробуйте ещё раз.',
  },
  failed: {
    title: 'Не удалось составить пачку',
    details: 'Попробуйте ещё раз или измените тему.',
  },
};

const accessCodeMessages: Record<AccessCodeProblem, Message> = {
  missing_code: {
    title: 'Нужен код доступа',
    details: 'Введите код, чтобы составлять пачки. Спросим его один раз.',
  },
  wrong_code: {
    title: 'Неверный код доступа',
    details: 'Проверьте код и попробуйте ещё раз.',
  },
};

type CreateDeckScreenProps = {
  onSaved: (deckId: string) => void;
  onCancel: () => void;
};

export function CreateDeckScreen({ onSaved, onCancel }: CreateDeckScreenProps) {
  const [topic, setTopic] = useState('');
  const [step, setStep] = useState<Step>({ name: 'topic' });
  const [accessCode, setAccessCodeInput] = useState('');
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
        const nextStep = failedStep(error);
        if (nextStep.name === 'accessCode') setAccessCodeInput('');
        setStep(nextStep);
      });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canGenerate) return;
    generate();
  }

  function handleRetryWithCode() {
    const code = accessCode.trim();
    if (code === '') return;
    setAccessCode(code);
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

  if (step.name === 'accessCode') {
    return (
      <StatusMessage
        {...accessCodeMessages[step.problem]}
        actions={[
          {
            label: 'Повторить',
            onClick: handleRetryWithCode,
            disabled: accessCode.trim() === '',
          },
          { label: 'Изменить тему', onClick: () => setStep({ name: 'topic' }) },
        ]}
      >
        <label className={styles.codeField}>
          <span className={styles.label}>Код доступа</span>
          <input
            className={styles.input}
            type="password"
            value={accessCode}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            onChange={(event) => setAccessCodeInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleRetryWithCode();
            }}
          />
        </label>
      </StatusMessage>
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
            placeholder="Например, 50 слов про путешествия"
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

function failedStep(error: unknown): Step {
  if (!(error instanceof GenerationError)) return { name: 'failed', kind: 'failed' };
  if (error.kind === 'unauthorized') {
    return { name: 'accessCode', problem: error.accessCodeProblem ?? 'missing_code' };
  }
  return { name: 'failed', kind: error.kind };
}
