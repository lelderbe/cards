import { describe, expect, it } from 'vitest';
import { GenerationError } from './generator.ts';
import { createMockGenerator } from './mockGenerator.ts';

const generate = createMockGenerator({ delayMs: 0 });

function signal() {
  return new AbortController().signal;
}

describe('createMockGenerator', () => {
  it('answers with 20–30 cards titled after the topic', async () => {
    const deck = await generate(' кухня ', signal());

    expect(deck.title).toBe('Кухня');
    expect(deck.cards.length).toBeGreaterThanOrEqual(20);
    expect(deck.cards.length).toBeLessThanOrEqual(30);
    for (const card of deck.cards) {
      expect(card.front.trim()).not.toBe('');
      expect(card.back.trim()).not.toBe('');
    }
  });

  it('fails when the topic has «ошибка»', async () => {
    await expect(generate('Проверка ОШИБКА', signal())).rejects.toMatchObject({
      name: 'GenerationError',
      kind: 'failed',
    });
  });

  it('fails as if offline when the topic has «сеть»', async () => {
    const error = await generate('Сеть', signal()).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(GenerationError);
    expect((error as GenerationError).kind).toBe('network');
  });

  it('rejects with an AbortError when aborted while waiting', async () => {
    const slowGenerate = createMockGenerator({ delayMs: 10_000 });
    const controller = new AbortController();

    const result = slowGenerate('кухня', controller.signal);
    controller.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
