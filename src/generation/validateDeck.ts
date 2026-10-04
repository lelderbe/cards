import { cardKey } from '../domain/deckDraft.ts';
import type { GeneratedDeck } from './generator.ts';

export const MAX_TOPIC_LENGTH = 100;
export const MAX_CARDS = 100;

/** The trimmed topic, or null when it is empty or too long. */
export function validateTopic(topic: unknown): string | null {
  if (typeof topic !== 'string') return null;

  const trimmed = topic.trim();
  if (trimmed === '' || trimmed.length > MAX_TOPIC_LENGTH) return null;
  return trimmed;
}

/**
 * Checks a deck that came from the AI and cleans it up: trims the text, drops cards with an empty
 * side and repeats (ignoring case), keeps at most MAX_CARDS. Null when the shape is wrong or no
 * cards are left.
 */
export function validateGeneratedDeck(value: unknown): GeneratedDeck | null {
  if (!isRecord(value)) return null;
  if (typeof value.title !== 'string' || !Array.isArray(value.cards)) return null;

  const title = value.title.trim();
  if (title === '') return null;

  const cards: GeneratedDeck['cards'] = [];
  const seenKeys = new Set<string>();
  for (const card of value.cards) {
    if (!isRecord(card) || typeof card.front !== 'string' || typeof card.back !== 'string') {
      return null;
    }

    const front = card.front.trim();
    const back = card.back.trim();
    const key = cardKey(front, back);
    if (front === '' || back === '' || seenKeys.has(key)) continue;

    seenKeys.add(key);
    cards.push({ front, back });
    if (cards.length === MAX_CARDS) break;
  }

  if (cards.length === 0) return null;
  return { title, cards };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
