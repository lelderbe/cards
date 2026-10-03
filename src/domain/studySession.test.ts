import { describe, expect, it } from 'vitest';
import {
  createSession,
  getCurrentCard,
  getResults,
  getVisibleSide,
  isSessionFinished,
  restoreSession,
  studySessionReducer,
  type StudySession,
  type StudySessionAction,
} from './studySession.ts';
import type { Deck } from './types.ts';

const deck: Deck = {
  id: 'test',
  title: 'Test',
  frontLang: 'en',
  backLang: 'ru',
  cards: [
    { id: 'a', front: 'apple', back: 'яблоко' },
    { id: 'b', front: 'bread', back: 'хлеб' },
    { id: 'c', front: 'cheese', back: 'сыр' },
    { id: 'd', front: 'dill', back: 'укроп' },
  ],
};

/** random() = 0.999… keeps Fisher–Yates from swapping, so the queue keeps deck order. */
const keepOrder = () => 0.9999;

const remember: StudySessionAction = { type: 'answer', remembered: true };
const forget: StudySessionAction = { type: 'answer', remembered: false };
const flip: StudySessionAction = { type: 'flip' };

function run(session: StudySession, actions: StudySessionAction[]) {
  return actions.reduce(studySessionReducer, session);
}

describe('createSession', () => {
  it('puts every card into the queue exactly once, unflipped', () => {
    const session = createSession(deck, 'front-to-back');
    expect([...session.queue].sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(session.isFlipped).toBe(false);
    expect(session.totalCards).toBe(4);
    expect(session.forgotCounts).toEqual({});
  });

  it('takes the session id from the given generator', () => {
    const session = createSession(deck, 'front-to-back', keepOrder, () => 'session-1');
    expect(session.id).toBe('session-1');
  });

  it('gives every new session its own id', () => {
    expect(createSession(deck, 'front-to-back').id).not.toBe(
      createSession(deck, 'front-to-back').id,
    );
  });

  it('shuffles with the given random', () => {
    const session = createSession(deck, 'front-to-back', () => 0);
    expect(session.queue).not.toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('studySessionReducer', () => {
  it('flip toggles the card side back and forth', () => {
    const session = createSession(deck, 'front-to-back', keepOrder);
    const flipped = studySessionReducer(session, flip);
    expect(flipped.isFlipped).toBe(true);
    expect(studySessionReducer(flipped, flip).isFlipped).toBe(false);
  });

  it('"forget" moves the current card to the end of the queue', () => {
    const session = run(createSession(deck, 'front-to-back', keepOrder), [forget]);
    expect(session.queue).toEqual(['b', 'c', 'd', 'a']);
  });

  it('"forget" on the last remaining card shows the same card again unflipped', () => {
    const session = run(createSession(deck, 'front-to-back', keepOrder), [
      remember,
      remember,
      remember,
      flip,
      forget,
    ]);
    expect(session.queue).toEqual(['d']);
    expect(session.isFlipped).toBe(false);
  });

  it('"remember" removes the current card from the session', () => {
    const session = run(createSession(deck, 'front-to-back', keepOrder), [remember]);
    expect(session.queue).toEqual(['b', 'c', 'd']);
    expect(session.queue).not.toContain('a');
  });

  it('the next card is shown unflipped after any answer', () => {
    const start = createSession(deck, 'front-to-back', keepOrder);
    expect(run(start, [flip, remember]).isFlipped).toBe(false);
    expect(run(start, [flip, forget]).isFlipped).toBe(false);
  });

  it('keeps the session id through flips and answers', () => {
    const start = createSession(deck, 'front-to-back', keepOrder, () => 'session-1');
    expect(run(start, [flip, forget, remember, flip, remember]).id).toBe('session-1');
  });

  it('accepts an answer without flipping', () => {
    const session = run(createSession(deck, 'front-to-back', keepOrder), [remember]);
    expect(session.queue).toHaveLength(3);
  });

  it('remaining count changes only on "remember"', () => {
    const start = createSession(deck, 'front-to-back', keepOrder);
    expect(run(start, [forget]).queue).toHaveLength(4);
    expect(run(start, [remember]).queue).toHaveLength(3);
  });

  it('counts every "forget" per card', () => {
    const session = run(createSession(deck, 'front-to-back', keepOrder), [
      forget, // a
      remember, // b
      remember, // c
      remember, // d
      forget, // a
    ]);
    expect(session.forgotCounts).toEqual({ a: 2 });
  });

  it('finishes when the queue is empty and ignores further answers', () => {
    const finished = run(createSession(deck, 'front-to-back', keepOrder), [
      remember,
      remember,
      remember,
      remember,
    ]);
    expect(isSessionFinished(finished)).toBe(true);
    expect(studySessionReducer(finished, remember)).toBe(finished);
  });
});

describe('getVisibleSide', () => {
  it('front-to-back shows front, then back after flip', () => {
    expect(getVisibleSide('front-to-back', false)).toBe('front');
    expect(getVisibleSide('front-to-back', true)).toBe('back');
  });

  it('back-to-front shows back, then front after flip', () => {
    expect(getVisibleSide('back-to-front', false)).toBe('back');
    expect(getVisibleSide('back-to-front', true)).toBe('front');
  });
});

describe('getCurrentCard', () => {
  it('returns the head of the queue', () => {
    const session = run(createSession(deck, 'front-to-back', keepOrder), [remember]);
    expect(getCurrentCard(session, deck)?.id).toBe('b');
  });
});

describe('getResults', () => {
  it('all cards remembered on the first try', () => {
    const session = run(createSession(deck, 'front-to-back', keepOrder), [
      remember,
      remember,
      remember,
      remember,
    ]);
    expect(getResults(session, deck)).toEqual({ firstTryCount: 4, totalCards: 4, repeated: [] });
  });

  it('lists forgotten cards sorted by forget count, descending', () => {
    const session = run(createSession(deck, 'front-to-back', keepOrder), [
      forget, // a (1)
      forget, // b (1)
      remember, // c
      remember, // d
      remember, // a
      forget, // b (2)
      remember, // b
    ]);
    const results = getResults(session, deck);
    expect(results.firstTryCount).toBe(2);
    expect(results.totalCards).toBe(4);
    expect(results.repeated.map(({ card, forgotCount }) => [card.id, forgotCount])).toEqual([
      ['b', 2],
      ['a', 1],
    ]);
  });
});

describe('restoreSession', () => {
  const saved: StudySession = {
    id: 'session-1',
    direction: 'back-to-front',
    queue: ['c', 'a', 'd'],
    isFlipped: true,
    forgotCounts: { a: 2, b: 1 },
    totalCards: 4,
  };

  it('keeps the id, direction, queue order and forget counts', () => {
    const restored = restoreSession(saved, deck);
    expect(restored?.id).toBe('session-1');
    expect(restored?.direction).toBe('back-to-front');
    expect(restored?.queue).toEqual(['c', 'a', 'd']);
    expect(restored?.forgotCounts).toEqual({ a: 2, b: 1 });
    expect(restored?.totalCards).toBe(4);
  });

  it('shows the current card question side', () => {
    expect(restoreSession(saved, deck)?.isFlipped).toBe(false);
  });

  it('drops cards that are no longer in the deck', () => {
    const smallerDeck: Deck = { ...deck, cards: deck.cards.filter((card) => card.id !== 'a') };
    const restored = restoreSession(saved, smallerDeck);
    expect(restored?.queue).toEqual(['c', 'd']);
    expect(restored?.forgotCounts).toEqual({ b: 1 });
    expect(restored?.totalCards).toBe(3);
  });

  it('returns undefined when no queued card is left in the deck', () => {
    const otherDeck: Deck = { ...deck, cards: [{ id: 'b', front: 'bread', back: 'хлеб' }] };
    expect(restoreSession(saved, otherDeck)).toBeUndefined();
  });
});
