import { getAccessCode } from './accessCode.ts';
import { createApiGenerator } from './apiGenerator.ts';
import type { DeckGenerator } from './generator.ts';
import { createMockGenerator } from './mockGenerator.ts';

/**
 * The generator the app uses: the AI through /api/generate, or the mock when the dev server runs
 * with VITE_GENERATOR=mock. The variable is read at build time, so builds never ship the mock.
 */
export const generateDeck: DeckGenerator =
  import.meta.env.VITE_GENERATOR === 'mock'
    ? createMockGenerator({ delayMs: 1500 })
    : createApiGenerator({ getAccessCode });
