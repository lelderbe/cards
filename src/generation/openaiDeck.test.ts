import { describe, expect, it, vi } from 'vitest';
import { buildDeckRequest, generateWithOpenAI, parseDeckResponse } from './openaiDeck.ts';

function openAIAnswer(content: unknown[], status = 'completed') {
  return { status, output: [{ type: 'reasoning' }, { type: 'message', content }] };
}

function deckAnswer(deck: unknown) {
  return openAIAnswer([{ type: 'output_text', text: JSON.stringify(deck) }]);
}

const kitchen = { title: 'Кухня', cards: [{ front: 'fork', back: 'вилка' }] };

function fakeFetch(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () => Response.json(body, { status }));
}

describe('buildDeckRequest', () => {
  it('sends the topic as the user message, apart from the instructions', () => {
    const request = buildDeckRequest('50 слов про путешествия', 'gpt-test');

    expect(request.model).toBe('gpt-test');
    expect(request.input).toEqual([{ role: 'user', content: '50 слов про путешествия' }]);
    expect(request.instructions).not.toContain('путешествия');
    expect(request.instructions).toContain('at most 100');
    expect(request.instructions).toContain('make 25');
    expect(request.text.format).toMatchObject({ type: 'json_schema', strict: true });
  });
});

describe('parseDeckResponse', () => {
  it('reads the deck from the message text', () => {
    expect(parseDeckResponse(deckAnswer(kitchen))).toEqual(kitchen);
  });

  it('rejects a refusal, a cut-off answer, broken JSON and a deck without cards', () => {
    expect(parseDeckResponse(openAIAnswer([{ type: 'refusal', refusal: 'No' }]))).toBeNull();
    expect(
      parseDeckResponse(openAIAnswer([{ type: 'output_text', text: '{"title":' }], 'incomplete')),
    ).toBeNull();
    expect(
      parseDeckResponse(openAIAnswer([{ type: 'output_text', text: '{"title":' }])),
    ).toBeNull();
    expect(parseDeckResponse(deckAnswer({ title: 'Кухня', cards: [] }))).toBeNull();
    expect(parseDeckResponse(null)).toBeNull();
  });
});

describe('generateWithOpenAI', () => {
  const options = { apiKey: 'sk-test', model: 'gpt-test', topic: 'кухня' };

  it('returns the deck and sends the key', async () => {
    const fetch = fakeFetch(200, deckAnswer(kitchen));

    const result = await generateWithOpenAI({ ...options, fetch });

    expect(result).toEqual({ ok: true, deck: kitchen });
    const [, init] = fetch.mock.calls[0];
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer sk-test');
  });

  it('reports an unusable answer as bad_response', async () => {
    const fetch = fakeFetch(200, deckAnswer({ title: 'Кухня', cards: [] }));

    expect(await generateWithOpenAI({ ...options, fetch })).toEqual({
      ok: false,
      reason: 'bad_response',
    });
  });

  it('reports an OpenAI error or an unreachable OpenAI as upstream', async () => {
    const failing = fakeFetch(500, { error: { message: 'boom' } });
    const unreachable = vi.fn<typeof fetch>(async () => {
      throw new TypeError('fetch failed');
    });

    expect(await generateWithOpenAI({ ...options, fetch: failing })).toEqual({
      ok: false,
      reason: 'upstream',
    });
    expect(await generateWithOpenAI({ ...options, fetch: unreachable })).toEqual({
      ok: false,
      reason: 'upstream',
    });
  });

  it('gives up after the timeout', async () => {
    const hanging = vi.fn<typeof fetch>(
      (_, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );

    expect(await generateWithOpenAI({ ...options, fetch: hanging, timeoutMs: 10 })).toEqual({
      ok: false,
      reason: 'timeout',
    });
  });
});
