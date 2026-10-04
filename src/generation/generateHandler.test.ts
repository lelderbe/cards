import { describe, expect, it, vi } from 'vitest';
import { handleGenerate } from './generateHandler.ts';

const env = { OPENAI_API_KEY: 'sk-test', ACCESS_CODE: 'secret-code' };
const kitchen = { title: 'Кухня', cards: [{ front: 'fork', back: 'вилка' }] };

function generateRequest(topic: unknown, accessCode?: string) {
  return new Request('http://localhost/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessCode === undefined ? {} : { 'X-Access-Code': accessCode }),
    },
    body: JSON.stringify({ topic }),
  });
}

function openAIFetch() {
  return vi.fn<typeof fetch>(async () =>
    Response.json({
      status: 'completed',
      output: [
        { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(kitchen) }] },
      ],
    }),
  );
}

async function errorOf(response: Response) {
  return { status: response.status, body: await response.json() };
}

describe('handleGenerate', () => {
  it('answers with the deck for the right code and topic', async () => {
    const fetch = openAIFetch();

    const response = await handleGenerate(generateRequest('кухня', 'secret-code'), env, fetch);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(kitchen);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('refuses without a code or with a wrong one, before asking OpenAI', async () => {
    const fetch = openAIFetch();

    expect(await errorOf(await handleGenerate(generateRequest('кухня'), env, fetch))).toEqual({
      status: 401,
      body: { error: 'missing_code' },
    });
    expect(
      await errorOf(await handleGenerate(generateRequest('кухня', 'guess'), env, fetch)),
    ).toEqual({ status: 401, body: { error: 'wrong_code' } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a too long topic without asking OpenAI', async () => {
    const fetch = openAIFetch();

    const response = await handleGenerate(
      generateRequest('a'.repeat(101), 'secret-code'),
      env,
      fetch,
    );

    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('answers 504 when OpenAI is too slow', async () => {
    const slowFetch = vi.fn<typeof fetch>(async () => {
      throw new DOMException('Timed out', 'TimeoutError');
    });
    vi.spyOn(AbortSignal, 'timeout').mockReturnValueOnce(AbortSignal.abort());

    const response = await handleGenerate(generateRequest('кухня', 'secret-code'), env, slowFetch);

    expect(response.status).toBe(504);
  });

  it('answers 500 when the server has no OpenAI key', async () => {
    const response = await handleGenerate(
      generateRequest('кухня', 'secret-code'),
      { ACCESS_CODE: 'secret-code' },
      openAIFetch(),
    );

    expect(response.status).toBe(500);
  });
});
