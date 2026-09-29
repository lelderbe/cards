export type Card = {
  id: string
  front: string
  back: string
}

export type Deck = {
  id: string
  title: string
  frontLang: 'en'
  backLang: 'ru'
  cards: Card[]
}

export type Direction = 'front-to-back' | 'back-to-front'
