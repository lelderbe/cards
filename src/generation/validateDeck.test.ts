import { describe, expect, it } from 'vitest';
import { MAX_CARDS, validateGeneratedDeck, validateTopic } from './validateDeck.ts';

describe('validateTopic', () => {
  it('trims the topic', () => {
    expect(validateTopic(' кухня ')).toBe('кухня');
  });

  it('rejects an empty, blank or too long topic', () => {
    expect(validateTopic('')).toBeNull();
    expect(validateTopic('   ')).toBeNull();
    expect(validateTopic('a'.repeat(101))).toBeNull();
    expect(validateTopic(42)).toBeNull();
  });

  it('accepts a topic of exactly 100 characters', () => {
    expect(validateTopic('a'.repeat(100))).toBe('a'.repeat(100));
  });
});

describe('validateGeneratedDeck', () => {
  it('trims, drops cards with an empty side and repeats, keeps at most 100', () => {
    const cards = [
      { front: ' Fork ', back: 'вилка' },
      { front: 'fork', back: 'Вилка ' },
      { front: 'spoon', back: '  ' },
      ...Array.from({ length: 102 }, (_, index) => ({
        front: `word ${index}`,
        back: `слово ${index}`,
      })),
    ];

    const deck = validateGeneratedDeck({ title: ' Кухня ', cards });

    expect(deck?.title).toBe('Кухня');
    expect(deck?.cards).toHaveLength(MAX_CARDS);
    expect(deck?.cards[0]).toEqual({ front: 'Fork', back: 'вилка' });
    expect(deck?.cards.filter((card) => card.front.toLowerCase() === 'fork')).toHaveLength(1);
    expect(deck?.cards.some((card) => card.front === 'spoon')).toBe(false);
  });

  it('keeps the same word with another translation', () => {
    const deck = validateGeneratedDeck({
      title: 'Путешествия',
      cards: [
        { front: 'guide', back: 'экскурсовод' },
        { front: 'guide', back: 'путеводитель' },
      ],
    });

    expect(deck?.cards).toHaveLength(2);
  });

  it('rejects a wrong shape', () => {
    expect(validateGeneratedDeck('deck')).toBeNull();
    expect(validateGeneratedDeck(null)).toBeNull();
    expect(validateGeneratedDeck({ title: 'Кухня' })).toBeNull();
    expect(
      validateGeneratedDeck({ title: 'Кухня', cards: [{ front: 'fork', back: 1 }] }),
    ).toBeNull();
    expect(
      validateGeneratedDeck({ title: ' ', cards: [{ front: 'fork', back: 'вилка' }] }),
    ).toBeNull();
  });

  it('rejects a deck without usable cards', () => {
    expect(validateGeneratedDeck({ title: 'Кухня', cards: [] })).toBeNull();
    expect(
      validateGeneratedDeck({ title: 'Кухня', cards: [{ front: 'fork', back: '' }] }),
    ).toBeNull();
  });
});
