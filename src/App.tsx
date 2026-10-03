import { useEffect, useState } from 'react';
import { StatusMessage } from './components/StatusMessage.tsx';
import type { AnswerLogEntry } from './domain/answerLog.ts';
import { createSession, type StudySession } from './domain/studySession.ts';
import type { Deck, Direction } from './domain/types.ts';
import { DeckListScreen } from './screens/DeckListScreen.tsx';
import { DeckScreen } from './screens/DeckScreen.tsx';
import { ResultsScreen } from './screens/ResultsScreen.tsx';
import { StudyScreen } from './screens/StudyScreen.tsx';
import { db } from './storage/db.ts';
import { recordAnswer } from './storage/answerLog.ts';
import { deleteActiveSession, deleteExpiredSessions } from './storage/sessions.ts';

type StorageStatus = 'opening' | 'ready' | 'failed';

type AppState =
  | { screen: 'decks' }
  | { screen: 'deck'; deckId: string }
  | { screen: 'study'; deck: Deck; session: StudySession; sessionNumber: number }
  | { screen: 'results'; deck: Deck; session: StudySession };

function App() {
  const [storageStatus, setStorageStatus] = useState<StorageStatus>('opening');
  const [state, setState] = useState<AppState>({ screen: 'decks' });
  const [lastDirection, setLastDirection] = useState<Direction>('front-to-back');
  const [sessionNumber, setSessionNumber] = useState(0);

  useEffect(() => {
    // Asks the browser not to evict our data under storage pressure; no UI either way.
    navigator.storage?.persist?.().catch(() => {});

    db.open()
      .then(() => deleteExpiredSessions(Date.now()))
      .then(() => setStorageStatus('ready'))
      .catch((error: unknown) => {
        console.error('Failed to open storage', error);
        setStorageStatus('failed');
      });
  }, []);

  function showSession(deck: Deck, session: StudySession) {
    const nextSessionNumber = sessionNumber + 1;
    setSessionNumber(nextSessionNumber);
    setState({ screen: 'study', deck, session, sessionNumber: nextSessionNumber });
  }

  function handleStart(deck: Deck, direction: Direction) {
    // A new session replaces the unfinished one right away, even before the first answer.
    deleteActiveSession(deck.id).catch(logSaveError);
    setLastDirection(direction);
    showSession(deck, createSession(deck, direction));
  }

  function handleContinue(deck: Deck, session: StudySession) {
    showSession(deck, session);
  }

  function handleProgress(session: StudySession, entry: AnswerLogEntry) {
    recordAnswer(entry, session).catch(logSaveError);
  }

  function handleFinish(deck: Deck, session: StudySession, entry: AnswerLogEntry) {
    recordAnswer(entry, session).catch(logSaveError);
    setState({ screen: 'results', deck, session });
  }

  function openDeck(deckId: string) {
    setState({ screen: 'deck', deckId });
  }

  function openDeckList() {
    setState({ screen: 'decks' });
  }

  if (storageStatus === 'opening') {
    return (
      <main>
        <StatusMessage title="Загрузка…" />
      </main>
    );
  }

  if (storageStatus === 'failed') {
    return (
      <main>
        <StatusMessage
          title="Не удалось загрузить сохранённые пачки"
          details="Браузер не дал доступ к хранилищу на устройстве. Попробуйте открыть приложение не в приватном режиме или перезапустить его."
        />
      </main>
    );
  }

  return (
    <main>
      {state.screen === 'decks' && <DeckListScreen onOpenDeck={openDeck} />}
      {state.screen === 'deck' && (
        <DeckScreen
          deckId={state.deckId}
          lastDirection={lastDirection}
          onBack={openDeckList}
          onStart={handleStart}
          onContinue={handleContinue}
        />
      )}
      {state.screen === 'study' && (
        <StudyScreen
          key={state.sessionNumber}
          deck={state.deck}
          initialSession={state.session}
          onProgress={handleProgress}
          onFinish={(session, entry) => handleFinish(state.deck, session, entry)}
          onExit={() => openDeck(state.deck.id)}
        />
      )}
      {state.screen === 'results' && (
        <ResultsScreen
          deck={state.deck}
          session={state.session}
          onRestart={() => handleStart(state.deck, state.session.direction)}
          onBackToDeck={() => openDeck(state.deck.id)}
        />
      )}
    </main>
  );
}

function logSaveError(error: unknown) {
  console.error('Failed to save study progress', error);
}

export default App;
