// Vercel compiles each .ts file to .js but keeps import paths as written, so the server code
// imports with .js: see src/generation/generateHandler.ts.
import { handleGenerate } from '../src/generation/generateHandler.js';

/** Vercel Function: makes a deck draft on a topic with OpenAI. */
export function POST(request: Request): Promise<Response> {
  return handleGenerate(request, process.env);
}
