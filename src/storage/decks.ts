import type { Deck } from '../domain/types.ts';
import { db } from './db.ts';

export function getDeck(deckId: string): Promise<Deck | undefined> {
  return db.decks.get(deckId);
}
