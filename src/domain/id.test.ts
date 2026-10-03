import { describe, expect, it } from 'vitest';
import { createId } from './id.ts';

describe('createId', () => {
  it('returns 32 hex characters', () => {
    expect(createId()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('returns a different id on every call', () => {
    expect(createId()).not.toBe(createId());
  });
});
