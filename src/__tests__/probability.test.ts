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

  it('upper section uses 3x threshold (ones with 2 ones = 0, with 3 ones = 1)', () => {
    // [1,1,3,4,5] has only 2 ones -> below threshold (3)
    const probs1 = calcProbabilities([], [1, 1, 3, 4, 5], 0)
    expect(probs1.get(Category.Ones)).toBe(0)

    // [1,1,1,4,5] has 3 ones -> meets threshold (3)
    const probs2 = calcProbabilities([], [1, 1, 1, 4, 5], 0)
    expect(probs2.get(Category.Ones)).toBe(1)
  })

  it('upper section sixes threshold is 18 (3x6)', () => {
    // [6,6,1,2,3] = 12 < 18 -> 0
    const probs1 = calcProbabilities([], [6, 6, 1, 2, 3], 0)
    expect(probs1.get(Category.Sixes)).toBe(0)

    // [6,6,6,1,2] = 18 >= 18 -> 1
    const probs2 = calcProbabilities([], [6, 6, 6, 1, 2], 0)
    expect(probs2.get(Category.Sixes)).toBe(1)
  })
})
