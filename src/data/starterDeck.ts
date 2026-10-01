import type { Deck } from '../domain/types.ts';

const words: Array<[string, string]> = [
  ['airport', 'аэропорт'],
  ['ticket', 'билет'],
  ['passport', 'паспорт'],
  ['luggage', 'багаж'],
  ['suitcase', 'чемодан'],
  ['flight', 'рейс'],
  ['departure', 'отправление'],
  ['arrival', 'прибытие'],
  ['boarding pass', 'посадочный талон'],
  ['delay', 'задержка'],
  ['train station', 'вокзал'],
  ['platform', 'платформа'],
  ['hotel', 'гостиница'],
  ['reservation', 'бронирование'],
  ['receipt', 'чек'],
  ['map', 'карта'],
  ['sightseeing', 'осмотр достопримечательностей'],
  ['guide', 'экскурсовод'],
  ['border', 'граница'],
  ['customs', 'таможня'],
  ['currency', 'валюта'],
  ['souvenir', 'сувенир'],
  ['journey', 'поездка'],
  ['destination', 'пункт назначения'],
  ['backpack', 'рюкзак'],
];

export const starterDeck: Deck = {
  id: 'starter-travel',
  title: 'Путешествия',
  frontLang: 'en',
  backLang: 'ru',
  cards: words.map(([front, back], index) => ({
    id: `travel-${index + 1}`,
    front,
    back,
  })),
};
