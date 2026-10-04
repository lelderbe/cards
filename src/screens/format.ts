import type { Deck, Direction } from '../domain/types.ts';

export function formatCardCount(count: number) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return `${count} карточек`;
  if (lastDigit === 1) return `${count} карточка`;
  if (lastDigit >= 2 && lastDigit <= 4) return `${count} карточки`;
  return `${count} карточек`;
}

export function formatDirection(deck: Deck, direction: Direction) {
  const frontLabel = deck.frontLang.toUpperCase();
  const backLabel = deck.backLang.toUpperCase();
  return direction === 'front-to-back'
    ? `${frontLabel} → ${backLabel}`
    : `${backLabel} → ${frontLabel}`;
}

/** «Удалить 1 карточку / 3 карточки / 5 карточек» — the accusative form after a verb. */
export function formatCardCountAccusative(count: number) {
  const lastTwoDigits = count % 100;
  if (count % 10 === 1 && lastTwoDigits !== 11) return `${count} карточку`;
  return formatCardCount(count);
}
