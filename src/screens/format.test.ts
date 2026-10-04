import { describe, expect, it } from 'vitest';
import { formatCardCount, formatCardCountAccusative } from './format.ts';

describe('formatCardCount', () => {
  it('agrees the noun with the number', () => {
    expect([1, 2, 5, 11, 21, 24, 25].map(formatCardCount)).toEqual([
      '1 карточка',
      '2 карточки',
      '5 карточек',
      '11 карточек',
      '21 карточка',
      '24 карточки',
      '25 карточек',
    ]);
  });
});

describe('formatCardCountAccusative', () => {
  it('uses «карточку» where the nominative has «карточка»', () => {
    expect([1, 2, 5, 11, 21].map(formatCardCountAccusative)).toEqual([
      '1 карточку',
      '2 карточки',
      '5 карточек',
      '11 карточек',
      '21 карточку',
    ]);
  });
});
