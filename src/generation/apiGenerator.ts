import {
  ACCESS_CODE_HEADER,
  GenerationError,
  type AccessCodeProblem,
  type DeckGenerator,
} from './generator.ts';
import { isRecord, validateGeneratedDeck } from './validateDeck.ts';

/** A bit longer than the server function may run, so a lost answer does not hang the screen. */
export const API_TIMEOUT_MS = 70_000;

type ApiGeneratorOptions = {
  fetch?: typeof fetch;
  getAccessCode: () => string | null;
  url?: string;
  timeoutMs?: number;
  /** False when the device knows it is offline, e.g. in airplane mode. */
  isOnline?: () => boolean;
  /** Fires 'offline' when the connection drops while the request is under way. */
  connectionEvents?: EventTarget;
};

/** Asks the server function /api/generate for a deck, sending the access code kept on the device. */
export function createApiGenerator({
  fetch: fetchFn = (...args) => fetch(...args),
  getAccessCode,
  url = '/api/generate',
  timeoutMs = API_TIMEOUT_MS,
  isOnline = () => navigator.onLine,
  connectionEvents = typeof window === 'undefined' ? undefined : window,
}: ApiGeneratorOptions): DeckGenerator {
  return async (topic, signal) => {
    // Safari on iPhone waits for the connection to come back instead of failing an offline request.
    if (!isOnline()) throw new GenerationError('network', 'The device is offline');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const accessCode = getAccessCode();
    if (accessCode) headers[ACCESS_CODE_HEADER] = accessCode;

    const timeout = AbortSignal.timeout(timeoutMs);
    const offline = new AbortController();
    const handleOffline = () => offline.abort();
    connectionEvents?.addEventListener('offline', handleOffline);

    let response: Response;
    let body: unknown;
    try {
      response = await fetchFn(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ topic }),
        signal: AbortSignal.any([signal, timeout, offline.signal]),
      });
      body = await response.json().catch((error: unknown) => {
        if (timeout.aborted || offline.signal.aborted || signal.aborted) throw error;
        return null;
      });
    } catch (error) {
      if (signal.aborted) throw new DOMException('Generation aborted', 'AbortError');
      if (timeout.aborted) throw new GenerationError('failed', 'The server took too long');
      throw new GenerationError('network', `Request failed: ${String(error)}`);
    } finally {
      connectionEvents?.removeEventListener('offline', handleOffline);
    }

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
