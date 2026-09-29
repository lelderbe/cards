import { useState } from 'react'
import { starterDeck } from './data/starterDeck.ts'
import { createSession, type StudySession } from './domain/studySession.ts'
import type { Direction } from './domain/types.ts'
import { ResultsScreen } from './screens/ResultsScreen.tsx'
import { StartScreen } from './screens/StartScreen.tsx'
import { StudyScreen } from './screens/StudyScreen.tsx'

type AppState =
  | { screen: 'start' }
  | { screen: 'study'; session: StudySession; sessionNumber: number }
  | { screen: 'results'; session: StudySession }

const deck = starterDeck

function App() {
  const [state, setState] = useState<AppState>({ screen: 'start' })
  const [direction, setDirection] = useState<Direction>('front-to-back')
  const [sessionNumber, setSessionNumber] = useState(0)

  function startSession(nextDirection: Direction) {
    const nextSessionNumber = sessionNumber + 1
    setDirection(nextDirection)
    setSessionNumber(nextSessionNumber)
    setState({
      screen: 'study',
      session: createSession(deck, nextDirection),
      sessionNumber: nextSessionNumber,
    })
  }

  function handleFinish(session: StudySession) {
    setState({ screen: 'results', session })
  }

  function handleGoHome() {
    setState({ screen: 'start' })
  }

  return (
    <main>
      {state.screen === 'start' && (
        <StartScreen deck={deck} initialDirection={direction} onStart={startSession} />
      )}
      {state.screen === 'study' && (
        <StudyScreen
          key={state.sessionNumber}
          deck={deck}
          initialSession={state.session}
          onFinish={handleFinish}
          onExit={handleGoHome}
        />
      )}
      {state.screen === 'results' && (
        <ResultsScreen
          deck={deck}
          session={state.session}
          onRestart={() => startSession(state.session.direction)}
          onHome={handleGoHome}
        />
      )}
    </main>
  )
}

export default App
