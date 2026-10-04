import { describe, expect, it, vi } from 'vitest';
import { createApiGenerator } from './apiGenerator.ts';
import { GenerationError } from './generator.ts';

const kitchen = { title: 'Кухня', cards: [{ front: 'fork', back: 'вилка' }] };

function serverFetch(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () => Response.json(body, { status }));
}

function signal() {
  return new AbortController().signal;
}

async function failureOf(promise: Promise<unknown>) {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(GenerationError);
  const { kind, accessCodeProblem } = error as GenerationError;
  return { kind, accessCodeProblem };
}

describe('createApiGenerator', () => {
  it('sends the topic with the access code and returns the deck', async () => {
    const fetch = serverFetch(200, kitchen);
    const generate = createApiGenerator({ fetch, getAccessCode: () => 'secret-code' });

    expect(await generate('кухня', signal())).toEqual(kitchen);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/generate');
    expect(JSON.parse(String(init?.body))).toEqual({ topic: 'кухня' });
    expect(new Headers(init?.headers).get('X-Access-Code')).toBe('secret-code');
  });

  it('sends no access code header when the device has none', async () => {
    const fetch = serverFetch(200, kitchen);
    const generate = createApiGenerator({ fetch, getAccessCode: () => null });

    await generate('кухня', signal());

    expect(new Headers(fetch.mock.calls[0][1]?.headers).has('X-Access-Code')).toBe(false);
  });

  it('fails as offline when the request cannot be sent', async () => {
    const offlineFetch = vi.fn<typeof fetch>(async () => {
      throw new TypeError('Load failed');
    });
    const generate = createApiGenerator({ fetch: offlineFetch, getAccessCode: () => null });

    expect(await failureOf(generate('кухня', signal()))).toEqual({
      kind: 'network',
      accessCodeProblem: undefined,
    });
  });

  it('tells a missing code from a wrong one', async () => {
    const missing = createApiGenerator({
      fetch: serverFetch(401, { error: 'missing_code' }),
      getAccessCode: () => null,
    });
    const wrong = createApiGenerator({
      fetch: serverFetch(401, { error: 'wrong_code' }),
      getAccessCode: () => 'guess',
    });

    expect(await failureOf(missing('кухня', signal()))).toEqual({
      kind: 'unauthorized',
      accessCodeProblem: 'missing_code',
    });
    expect(await failureOf(wrong('кухня', signal()))).toEqual({
      kind: 'unauthorized',
      accessCodeProblem: 'wrong_code',
    });
  });

  it('fails on server errors and on an unusable deck', async () => {
    for (const [status, body] of [
      [502, { error: 'bad_response' }],
      [504, { error: 'timeout' }],
      [200, { title: 'Кухня', cards: [] }],
      [200, 'not a deck'],
    ] as const) {
      const generate = createApiGenerator({
        fetch: serverFetch(status, body),
        getAccessCode: () => 'secret-code',
      });

      expect((await failureOf(generate('кухня', signal()))).kind).toBe('failed');
    }
  });

  it('rejects with an AbortError when cancelled', async () => {
    const hangingFetch = vi.fn<typeof fetch>(
      (_, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const generate = createApiGenerator({ fetch: hangingFetch, getAccessCode: () => null });
    const controller = new AbortController();

    const result = generate('кухня', controller.signal);
    controller.abort();

    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
