import { describe, it, expect } from 'vitest'
import { calcProbabilities } from '../probability'
import { Category } from '../types/game'

describe('calcProbabilities', () => {
  it('returns probabilities between 0 and 1', () => {
    const probs = calcProbabilities([1, 2, 3, 4, 5], [], 2)
    for (const [, p] of probs) {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })

  it('Chance is always 100%', () => {
    const probs = calcProbabilities([1, 2, 3, 4, 5], [], 2)
    expect(probs.get(Category.Chance)).toBe(1)
  })

  it('Yatzy with 4 matching and 1 roll has ~16.7% chance', () => {
    const probs = calcProbabilities([6], [6, 6, 6, 6], 1)
    const p = probs.get(Category.Yatzy)!
    expect(p).toBeGreaterThan(0.1)
    expect(p).toBeLessThan(0.25)
  })

  it('Yatzy with 5 matching is 100%', () => {
    const probs = calcProbabilities([], [6, 6, 6, 6, 6], 0)
    expect(probs.get(Category.Yatzy)).toBe(1)
  })

  it('returns all 15 categories', () => {
    const probs = calcProbabilities([1, 2, 3, 4, 5], [], 2)
    expect(probs.size).toBe(15)
  })

  it('with 0 rolls left, probability is deterministic', () => {
    const probs = calcProbabilities([], [1, 2, 3, 4, 5], 0)
    expect(probs.get(Category.SmallStraight)).toBe(1)
    expect(probs.get(Category.Yatzy)).toBe(0)
  })
})
