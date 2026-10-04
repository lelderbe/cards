import { handleGenerate } from '../src/generation/generateHandler.ts';

/** Vercel Function: makes a deck draft on a topic with OpenAI. */
export function POST(request: Request): Promise<Response> {
  return handleGenerate(request, process.env);
}
