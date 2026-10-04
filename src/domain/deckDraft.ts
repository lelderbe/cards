import { createId } from './id.ts';
import type { Card, Deck } from './types.ts';

/** A card being edited; existing cards keep their id, new cards get one right away. */
export type DraftCard = Card;

export type DeckDraft = {
  title: string;
  cards: DraftCard[];
};

/** A card as the deck pool knows it: stored once, possibly in several decks or none. */
export type PoolCard = Card & {
  deckIds: string[];
};

export type DraftValidation = {
  canSave: boolean;
  /** Cards with only one side filled in. */
  incompleteCardIds: Set<string>;
};

/** What saving a draft writes: changed existing cards and new ones. */
export type SavePlan = {
  put: PoolCard[];
  add: PoolCard[];
};

export type AllCardsSavePlan = SavePlan & {
  deleteIds: string[];
};

export function draftFromGenerated(
  generated: { title: string; cards: Array<{ front: string; back: string }> },
  createCardId: () => string = createId,
): DeckDraft {
  return {
    title: generated.title,
    cards: generated.cards.map(({ front, back }) => ({ id: createCardId(), front, back })),
  };
}

export function draftFromDeck(deck: Deck): DeckDraft {
  return {
    title: deck.title,
    cards: deck.cards.map(({ id, front, back }) => ({ id, front, back })),
  };
}

export function createEmptyCard(createCardId: () => string = createId): DraftCard {
  return { id: createCardId(), front: '', back: '' };
}

/** Trims the title and sides and drops cards with both sides empty — what gets saved. */
export function normalizeDraft(draft: DeckDraft): DeckDraft {
  return {
    title: draft.title.trim(),
    cards: draft.cards
      .map((card) => ({ id: card.id, front: card.front.trim(), back: card.back.trim() }))
      .filter((card) => card.front !== '' || card.back !== ''),
  };
}

export function validateDraft(
  draft: DeckDraft,
  { requireTitle }: { requireTitle: boolean },
): DraftValidation {
  const { title, cards } = normalizeDraft(draft);
  const incompleteCardIds = new Set(
    cards.filter((card) => card.front === '' || card.back === '').map((card) => card.id),
  );

  const hasTitle = !requireTitle || title !== '';
  const hasCompleteCard = cards.length > incompleteCardIds.size;

  return {
    canSave: hasTitle && hasCompleteCard && incompleteCardIds.size === 0,
    incompleteCardIds,
  };
}

/** Compares what would be saved, so trailing spaces or an untouched new card are no change. */
export function isDraftChanged(draft: DeckDraft, initial: DeckDraft): boolean {
  return JSON.stringify(normalizeDraft(draft)) !== JSON.stringify(normalizeDraft(initial));
}

/** Ids of the initial cards that saving the draft would drop. */
export function getRemovedCardIds(draft: DeckDraft, initial: DeckDraft): string[] {
  const keptIds = new Set(normalizeDraft(draft).cards.map((card) => card.id));
  return initial.cards.filter((card) => !keptIds.has(card.id)).map((card) => card.id);
}

/** Cards with this key are the same card: same word and translation, ignoring case and edges. */
export function cardKey(front: string, back: string): string {
  return `${front.trim().toLowerCase()}\n${back.trim().toLowerCase()}`;
}

/**
 * Plans saving a deck draft into the pool. Edited cards keep their id; a new card that matches an
 * existing card joins the deck as that card instead of being created; cards left out of the draft
 * leave this deck only.
 */
export function planDeckSave(deckId: string, draft: DeckDraft, pool: PoolCard[]): SavePlan {
  const { cards } = normalizeDraft(draft);
  const poolById = new Map(pool.map((card) => [card.id, card]));
  const poolByKey = new Map<string, PoolCard>();
  for (const card of pool) {
    const key = cardKey(card.front, card.back);
    if (!poolByKey.has(key)) poolByKey.set(key, card);
  }

  const changed = new Map<string, PoolCard>();
  const added = new Map<string, PoolCard>();
  const keptIds = new Set<string>();

  function current(card: PoolCard) {
    return changed.get(card.id) ?? card;
  }

  function joinDeck(card: PoolCard) {
    keptIds.add(card.id);
    const latest = current(card);
    if (latest.deckIds.includes(deckId)) return;
    changed.set(card.id, { ...latest, deckIds: [...latest.deckIds, deckId] });
  }

  for (const draftCard of cards) {
    const existing = poolById.get(draftCard.id);
    if (existing) {
      if (existing.front !== draftCard.front || existing.back !== draftCard.back) {
        changed.set(existing.id, { ...current(existing), ...draftCard });
      }
      joinDeck(existing);
      continue;
    }

    const key = cardKey(draftCard.front, draftCard.back);
    const match = poolByKey.get(key);
    if (match) {
      joinDeck(match);
      continue;
    }
    if (added.has(key)) continue;

    added.set(key, { ...draftCard, deckIds: [deckId] });
  }

  for (const card of pool) {
    if (keptIds.has(card.id) || !card.deckIds.includes(deckId)) continue;
    const latest = current(card);
    changed.set(card.id, { ...latest, deckIds: latest.deckIds.filter((id) => id !== deckId) });
  }

  return { put: [...changed.values()], add: [...added.values()] };
}

/**
 * Plans saving the all-cards draft: edited cards are updated, cards left out are deleted for good,
 * new cards belong to no deck — unless they match a card that stays.
 */
export function planAllCardsSave(draft: DeckDraft, pool: PoolCard[]): AllCardsSavePlan {
  const { cards } = normalizeDraft(draft);
  const draftIds = new Set(cards.map((card) => card.id));
  const poolById = new Map(pool.map((card) => [card.id, card]));
  const keptKeys = new Set(
    pool.filter((card) => draftIds.has(card.id)).map((card) => cardKey(card.front, card.back)),
  );

  const put: PoolCard[] = [];
  const added = new Map<string, PoolCard>();

  for (const draftCard of cards) {
    const existing = poolById.get(draftCard.id);
    if (existing) {
      if (existing.front !== draftCard.front || existing.back !== draftCard.back) {
        put.push({ ...existing, ...draftCard });
      }
      continue;
    }

    const key = cardKey(draftCard.front, draftCard.back);
    if (keptKeys.has(key) || added.has(key)) continue;
    added.set(key, { ...draftCard, deckIds: [] });
  }

  const deleteIds = pool.filter((card) => !draftIds.has(card.id)).map((card) => card.id);

  return { put, add: [...added.values()], deleteIds };
}
