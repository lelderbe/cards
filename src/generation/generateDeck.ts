import type { DeckGenerator } from './generator.ts';
import { createMockGenerator } from './mockGenerator.ts';

/** The generator the app uses. A mock until the AI generator arrives (stage 6). */
export const generateDeck: DeckGenerator = createMockGenerator({ delayMs: 1500 });
