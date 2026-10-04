import { describe, expect, it } from 'vitest';
import {
  cardKey,
  draftFromDeck,
  draftFromGenerated,
  getRemovedCardIds,
  isDraftChanged,
  normalizeDraft,
  planAllCardsSave,
  planDeckSave,
  validateDraft,
  type DeckDraft,
  type PoolCard,
} from './deckDraft.ts';
import type { Deck } from './types.ts';

const deck: Deck = {
  id: 'travel',
  title: 'Путешествия',
  frontLang: 'en',
  backLang: 'ru',
  cards: [
    { id: 'ticket', front: 'ticket', back: 'билет' },
    { id: 'airport', front: 'airport', back: 'аэропорт' },
  ],
};

function sequentialIds() {
  let next = 0;
  return () => `new-${++next}`;
}

describe('draft creation', () => {
  it('gives generated cards their own ids', () => {
    const draft = draftFromGenerated(
      { title: 'Кухня', cards: [{ front: 'fork', back: 'вилка' }] },
      sequentialIds(),
    );

    expect(draft).toEqual({
      title: 'Кухня',
      cards: [{ id: 'new-1', front: 'fork', back: 'вилка' }],
    });
  });

  it('keeps the ids of existing cards', () => {
    expect(draftFromDeck(deck).cards.map((card) => card.id)).toEqual(['ticket', 'airport']);
  });
});

describe('normalizeDraft', () => {
  it('trims the title and sides and drops cards with both sides empty', () => {
    const draft: DeckDraft = {
      title: ' Кухня ',
      cards: [
        { id: 'a', front: ' fork ', back: 'вилка ' },
        { id: 'b', front: ' ', back: '' },
      ],
    };

    expect(normalizeDraft(draft)).toEqual({
      title: 'Кухня',
      cards: [{ id: 'a', front: 'fork', back: 'вилка' }],
    });
  });
});

describe('validateDraft', () => {
  const complete: DeckDraft = {
    title: 'Кухня',
    cards: [{ id: 'a', front: 'fork', back: 'вилка' }],
  };

  it('allows saving a titled draft with complete cards', () => {
    expect(validateDraft(complete, { requireTitle: true }).canSave).toBe(true);
  });

  it('blocks a card with one side filled in and marks it', () => {
    const draft: DeckDraft = {
      ...complete,
      cards: [...complete.cards, { id: 'b', front: 'spoon', back: ' ' }],
    };

    const validation = validateDraft(draft, { requireTitle: true });

    expect(validation.canSave).toBe(false);
    expect([...validation.incompleteCardIds]).toEqual(['b']);
  });

  it('ignores an empty added card', () => {
    const draft: DeckDraft = {
      ...complete,
      cards: [...complete.cards, { id: 'b', front: '', back: '' }],
    };

    expect(validation(draft)).toBe(true);
  });

  it('blocks an empty title when a title is required', () => {
    expect(validateDraft({ ...complete, title: '  ' }, { requireTitle: true }).canSave).toBe(false);
    expect(validateDraft({ ...complete, title: '' }, { requireTitle: false }).canSave).toBe(true);
  });

  it('blocks a draft without cards', () => {
    expect(validation({ ...complete, cards: [] })).toBe(false);
    expect(validation({ ...complete, cards: [{ id: 'a', front: '', back: '' }] })).toBe(false);
  });

  function validation(draft: DeckDraft) {
    return validateDraft(draft, { requireTitle: true }).canSave;
  }
});

describe('isDraftChanged', () => {
  const initial = draftFromDeck(deck);

  it('sees no change in trailing spaces or an untouched new card', () => {
    const draft: DeckDraft = {
      title: 'Путешествия ',
      cards: [...initial.cards, { id: 'new', front: '', back: '' }],
    };

    expect(isDraftChanged(draft, initial)).toBe(false);
  });

  it('sees an edited translation', () => {
    const draft: DeckDraft = {
      ...initial,
      cards: [{ id: 'ticket', front: 'ticket', back: 'билетик' }, initial.cards[1]],
    };

    expect(isDraftChanged(draft, initial)).toBe(true);
  });
});

describe('getRemovedCardIds', () => {
  it('lists initial cards left out of the draft, including emptied ones', () => {
    const initial = draftFromDeck(deck);
    const draft: DeckDraft = {
      ...initial,
      cards: [
        { id: 'ticket', front: '', back: '' },
        { id: 'new', front: 'fork', back: 'вилка' },
      ],
    };

    expect(getRemovedCardIds(draft, initial)).toEqual(['ticket', 'airport']);
  });
});

describe('cardKey', () => {
  it('ignores case and edge spaces', () => {
    expect(cardKey(' Airport', 'Аэропорт ')).toBe(cardKey('airport', 'аэропорт'));
    expect(cardKey('guide', 'руководство')).not.toBe(cardKey('guide', 'экскурсовод'));
  });
});

describe('planDeckSave', () => {
  const pool: PoolCard[] = [
    { id: 'ticket', front: 'ticket', back: 'билет', deckIds: ['travel'] },
    { id: 'airport', front: 'airport', back: 'аэропорт', deckIds: ['travel'] },
    { id: 'guide', front: 'guide', back: 'экскурсовод', deckIds: ['travel'] },
    { id: 'fork', front: 'fork', back: 'вилка', deckIds: [] },
  ];

  it('creates new cards in the deck', () => {
    const plan = planDeckSave(
      'kitchen',
      { title: 'Кухня', cards: [{ id: 'n1', front: 'spoon', back: 'ложка' }] },
      pool,
    );

    expect(plan).toEqual({
      put: [],
      add: [{ id: 'n1', front: 'spoon', back: 'ложка', deckIds: ['kitchen'] }],
    });
  });

  it('joins a matching card from another deck instead of creating it', () => {
    const plan = planDeckSave(
      'buildings',
      { title: 'Здания', cards: [{ id: 'n1', front: 'Airport ', back: 'аэропорт' }] },
      pool,
    );

    expect(plan.add).toEqual([]);
    expect(plan.put).toEqual([
      { id: 'airport', front: 'airport', back: 'аэропорт', deckIds: ['travel', 'buildings'] },
    ]);
  });

  it('keeps a card with the same word but another translation apart', () => {
    const plan = planDeckSave(
      'books',
      { title: 'Книги', cards: [{ id: 'n1', front: 'guide', back: 'руководство' }] },
      pool,
    );

    expect(plan.add).toEqual([
      { id: 'n1', front: 'guide', back: 'руководство', deckIds: ['books'] },
    ]);
    expect(plan.put).toEqual([]);
  });

  it('turns equal new cards in one draft into one card', () => {
    const plan = planDeckSave(
      'kitchen',
      {
        title: 'Кухня',
        cards: [
          { id: 'n1', front: 'spoon', back: 'ложка' },
          { id: 'n2', front: 'Spoon', back: 'ложка' },
        ],
      },
      pool,
    );

    expect(plan.add.map((card) => card.id)).toEqual(['n1']);
  });

  it('brings a card without a deck back into the new deck', () => {
    const plan = planDeckSave(
      'kitchen',
      { title: 'Кухня', cards: [{ id: 'n1', front: 'fork', back: 'вилка' }] },
      pool,
    );

    expect(plan.add).toEqual([]);
    expect(plan.put).toEqual([{ id: 'fork', front: 'fork', back: 'вилка', deckIds: ['kitchen'] }]);
  });

  it('updates edited text and takes a left-out card out of this deck only', () => {
    const shared: PoolCard[] = pool.map((card) =>
      card.id === 'guide' ? { ...card, deckIds: ['travel', 'books'] } : card,
    );
    const draft: DeckDraft = {
      title: 'Путешествия',
      cards: [
        { id: 'ticket', front: 'ticket', back: 'билетик' },
        { id: 'airport', front: 'airport', back: 'аэропорт' },
      ],
    };

    const plan = planDeckSave('travel', draft, shared);

    expect(plan.add).toEqual([]);
    expect(plan.put).toEqual([
      { id: 'ticket', front: 'ticket', back: 'билетик', deckIds: ['travel'] },
      { id: 'guide', front: 'guide', back: 'экскурсовод', deckIds: ['books'] },
    ]);
  });
});

describe('planAllCardsSave', () => {
  const pool: PoolCard[] = [
    { id: 'ticket', front: 'ticket', back: 'билет', deckIds: ['travel'] },
    { id: 'airport', front: 'airport', back: 'аэропорт', deckIds: ['travel', 'buildings'] },
  ];

  it('deletes left-out cards, updates edited ones and adds new ones without a deck', () => {
    const draft: DeckDraft = {
      title: '',
      cards: [
        { id: 'ticket', front: 'ticket', back: 'билетик' },
        { id: 'n1', front: 'spoon', back: 'ложка' },
      ],
    };

    expect(planAllCardsSave(draft, pool)).toEqual({
      put: [{ id: 'ticket', front: 'ticket', back: 'билетик', deckIds: ['travel'] }],
      add: [{ id: 'n1', front: 'spoon', back: 'ложка', deckIds: [] }],
      deleteIds: ['airport'],
    });
  });

  it('does not add a new card that matches a card that stays', () => {
    const draft: DeckDraft = {
      title: '',
      cards: [
        ...pool.map(({ id, front, back }) => ({ id, front, back })),
        { id: 'n1', front: 'TICKET', back: 'билет' },
      ],
    };

    expect(planAllCardsSave(draft, pool)).toEqual({ put: [], add: [], deleteIds: [] });
  });
});
