import { describe, expect, it } from 'vitest';
import { shuffle } from './shuffle.ts';

function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    return state / 2 ** 31;
  };
}

describe('shuffle', () => {
  const items = Array.from({ length: 25 }, (_, index) => index);

  it('keeps every element exactly once', () => {
    const result = shuffle(items);
    expect(result).toHaveLength(items.length);
    expect([...result].sort((a, b) => a - b)).toEqual(items);
  });

  it('does not mutate the input', () => {
    const input = [1, 2, 3];
    shuffle(input);
    expect(input).toEqual([1, 2, 3]);
  });

  it('is deterministic for a fixed random', () => {
    const first = shuffle(items, createSeededRandom(42));
    const second = shuffle(items, createSeededRandom(42));
    expect(first).toEqual(second);
    expect(first).not.toEqual(items);
  });

  it('handles empty and single-element arrays', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(['a'])).toEqual(['a']);
  });
});
