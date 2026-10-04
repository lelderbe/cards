import {
  ACCESS_CODE_HEADER,
  GenerationError,
  type AccessCodeProblem,
  type DeckGenerator,
} from './generator.ts';
import { isRecord, validateGeneratedDeck } from './validateDeck.ts';

type ApiGeneratorOptions = {
  fetch?: typeof fetch;
  getAccessCode: () => string | null;
  url?: string;
};

/** Asks the server function /api/generate for a deck, sending the access code kept on the device. */
export function createApiGenerator({
  fetch: fetchFn = (...args) => fetch(...args),
  getAccessCode,
  url = '/api/generate',
}: ApiGeneratorOptions): DeckGenerator {
  return async (topic, signal) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const accessCode = getAccessCode();
    if (accessCode) headers[ACCESS_CODE_HEADER] = accessCode;

    let response: Response;
    try {
      response = await fetchFn(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ topic }),
        signal,
      });
    } catch (error) {
      if (signal.aborted) throw error;
      throw new GenerationError('network', `Request failed: ${String(error)}`);
    }

    const body: unknown = await response.json().catch(() => null);
    if (signal.aborted) throw new DOMException('Generation aborted', 'AbortError');

    if (response.status === 401) {
      const problem: AccessCodeProblem =
        isRecord(body) && body.error === 'wrong_code' ? 'wrong_code' : 'missing_code';
      throw new GenerationError('unauthorized', 'Access code refused', problem);
    }
    if (!response.ok) {
      throw new GenerationError('failed', `Server answered ${response.status}`);
    }

    const deck = validateGeneratedDeck(body);
    if (!deck) throw new GenerationError('failed', 'Server answered with an unusable deck');
    return deck;
  };
}
