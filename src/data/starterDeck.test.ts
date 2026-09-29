import { describe, expect, it } from 'vitest'
import { starterDeck } from './starterDeck.ts'

describe('starterDeck', () => {
  it('contains 20–30 cards', () => {
    expect(starterDeck.cards.length).toBeGreaterThanOrEqual(20)
    expect(starterDeck.cards.length).toBeLessThanOrEqual(30)
  })

  it('has unique card ids', () => {
    const ids = new Set(starterDeck.cards.map((card) => card.id))
    expect(ids.size).toBe(starterDeck.cards.length)
  })

  it('has non-empty front and back on every card', () => {
    for (const card of starterDeck.cards) {
      expect(card.front.trim()).not.toBe('')
      expect(card.back.trim()).not.toBe('')
    }
  })
})
