import { shuffle } from './shuffle.ts'
import type { Card, Deck, Direction } from './types.ts'

export type StudySession = {
  direction: Direction
  /** Card ids still to be remembered; the head is the current card. */
  queue: string[]
  isFlipped: boolean
  forgotCounts: Record<string, number>
  totalCards: number
}

export type StudySessionAction = { type: 'flip' } | { type: 'answer'; remembered: boolean }

export type CardSide = 'front' | 'back'

export type RepeatedCard = {
  card: Card
  forgotCount: number
}

export type StudyResults = {
  firstTryCount: number
  totalCards: number
  repeated: RepeatedCard[]
}

export function createSession(
  deck: Deck,
  direction: Direction,
  random: () => number = Math.random,
): StudySession {
  return {
    direction,
    queue: shuffle(
      deck.cards.map((card) => card.id),
      random,
    ),
    isFlipped: false,
    forgotCounts: {},
    totalCards: deck.cards.length,
  }
}

export function studySessionReducer(
  session: StudySession,
  action: StudySessionAction,
): StudySession {
  if (action.type === 'flip') {
    return { ...session, isFlipped: !session.isFlipped }
  }

  const [currentId, ...rest] = session.queue
  if (currentId === undefined) return session

  if (action.remembered) {
    return { ...session, queue: rest, isFlipped: false }
  }

  return {
    ...session,
    queue: [...rest, currentId],
    isFlipped: false,
    forgotCounts: {
      ...session.forgotCounts,
      [currentId]: (session.forgotCounts[currentId] ?? 0) + 1,
    },
  }
}

export function getVisibleSide(direction: Direction, isFlipped: boolean): CardSide {
  const questionSide: CardSide = direction === 'front-to-back' ? 'front' : 'back'
  if (!isFlipped) return questionSide
  return questionSide === 'front' ? 'back' : 'front'
}

export function getCurrentCard(session: StudySession, deck: Deck): Card | undefined {
  const currentId = session.queue[0]
  return deck.cards.find((card) => card.id === currentId)
}

export function isSessionFinished(session: StudySession): boolean {
  return session.queue.length === 0
}

export function getResults(session: StudySession, deck: Deck): StudyResults {
  const repeated = deck.cards
    .filter((card) => (session.forgotCounts[card.id] ?? 0) > 0)
    .map((card) => ({ card, forgotCount: session.forgotCounts[card.id] }))
    .sort((a, b) => b.forgotCount - a.forgotCount)

  return {
    firstTryCount: session.totalCards - repeated.length,
    totalCards: session.totalCards,
    repeated,
  }
}
