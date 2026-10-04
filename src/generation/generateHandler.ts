// Runs on Vercel, which compiles each .ts file to .js but keeps import paths as written: modules
// the server loads (this one, openaiDeck, validateDeck, generator) import each other with .js and
// nothing outside src/generation/.
import { ACCESS_CODE_HEADER, type AccessCodeProblem } from './generator.js';
import { DEFAULT_MODEL, generateWithOpenAI } from './openaiDeck.js';
import { isRecord, validateTopic } from './validateDeck.js';

export type GenerateEnv = {
  OPENAI_API_KEY?: string;
  ACCESS_CODE?: string;
  OPENAI_MODEL?: string;
};

/**
 * Serves POST /api/generate: checks the access code and the topic, asks OpenAI for a deck.
 * Answers 200 with the deck, 400 for a bad topic, 401 with an AccessCodeProblem, 502 for an
 * unusable AI answer, 504 when the AI is too slow, 500 when the server is not configured.
 */
export async function handleGenerate(
  request: Request,
  env: GenerateEnv,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  if (!env.OPENAI_API_KEY || !env.ACCESS_CODE) {
    console.error('OPENAI_API_KEY or ACCESS_CODE is not set');
    return errorResponse(500, 'not_configured');
  }

  const accessCode = request.headers.get(ACCESS_CODE_HEADER);
  if (!accessCode) return accessCodeResponse('missing_code');
  if (!(await isSameText(accessCode, env.ACCESS_CODE))) return accessCodeResponse('wrong_code');

  const body: unknown = await request.json().catch(() => null);
  const topic = validateTopic(isRecord(body) ? body.topic : undefined);
  if (!topic) return errorResponse(400, 'bad_topic');

  const result = await generateWithOpenAI({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL || DEFAULT_MODEL,
    topic,
    signal: request.signal,
    fetch: fetchFn,
  });
  if (result.ok) return Response.json(result.deck);
  if (result.reason === 'timeout') return errorResponse(504, 'timeout');
  return errorResponse(502, result.reason);
}

function accessCodeResponse(problem: AccessCodeProblem) {
  return errorResponse(401, problem);
}

function errorResponse(status: number, error: string) {
  return Response.json({ error }, { status });
}

/** Compares hashes byte by byte so the time taken does not hint at how much of the code matched. */
async function isSameText(a: string, b: string): Promise<boolean> {
  const [hashA, hashB] = await Promise.all([sha256(a), sha256(b)]);
  let difference = 0;
  for (let index = 0; index < hashA.length; index++) {
    difference |= hashA[index] ^ hashB[index];
  }
  return difference === 0;
}

async function sha256(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}
