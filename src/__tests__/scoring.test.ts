import { describe, it, expect } from 'vitest'
import { calcScore } from '../scoring'
import { Category } from '../types/game'

describe('calcScore', () => {
  describe('upper section', () => {
    it('counts ones', () => {
      expect(calcScore([1, 1, 3, 4, 5], Category.Ones)).toBe(2)
    })

    it('counts twos', () => {
      expect(calcScore([2, 2, 2, 4, 5], Category.Twos)).toBe(6)
    })

    it('counts threes', () => {
      expect(calcScore([3, 3, 3, 3, 5], Category.Threes)).toBe(12)
    })

    it('counts fours', () => {
      expect(calcScore([4, 4, 1, 2, 3], Category.Fours)).toBe(8)
    })

    it('counts fives', () => {
      expect(calcScore([5, 5, 5, 5, 5], Category.Fives)).toBe(25)
    })

    it('counts sixes', () => {
      expect(calcScore([6, 1, 2, 3, 4], Category.Sixes)).toBe(6)
    })

    it('returns 0 when no matching face', () => {
      expect(calcScore([2, 3, 4, 5, 6], Category.Ones)).toBe(0)
    })
  })

  describe('pair', () => {
    it('scores highest pair', () => {
      expect(calcScore([3, 3, 5, 5, 1], Category.Pair)).toBe(10)
    })

    it('returns 0 with no pair', () => {
      expect(calcScore([1, 2, 3, 4, 5], Category.Pair)).toBe(0)
    })
  })

  describe('two pairs', () => {
    it('scores two pairs', () => {
      expect(calcScore([2, 2, 5, 5, 1], Category.TwoPairs)).toBe(14)
    })

    it('returns 0 with only one pair', () => {
      expect(calcScore([2, 2, 3, 4, 5], Category.TwoPairs)).toBe(0)
    })
  })

  describe('three of a kind', () => {
    it('scores three of a kind', () => {
      expect(calcScore([4, 4, 4, 2, 1], Category.ThreeOfAKind)).toBe(12)
    })

    it('returns 0 without three of a kind', () => {
      expect(calcScore([4, 4, 3, 2, 1], Category.ThreeOfAKind)).toBe(0)
    })
  })

  describe('four of a kind', () => {
    it('scores four of a kind', () => {
      expect(calcScore([3, 3, 3, 3, 1], Category.FourOfAKind)).toBe(12)
    })

    it('returns 0 without four of a kind', () => {
      expect(calcScore([3, 3, 3, 2, 1], Category.FourOfAKind)).toBe(0)
    })
  })

  describe('small straight', () => {
    it('scores 15 for 1-2-3-4-5', () => {
      expect(calcScore([3, 1, 5, 2, 4], Category.SmallStraight)).toBe(15)
    })

    it('returns 0 for non-straight', () => {
      expect(calcScore([2, 3, 4, 5, 6], Category.SmallStraight)).toBe(0)
    })
  })

  describe('large straight', () => {
    it('scores 20 for 2-3-4-5-6', () => {
      expect(calcScore([6, 2, 3, 4, 5], Category.LargeStraight)).toBe(20)
    })

    it('returns 0 for non-straight', () => {
      expect(calcScore([1, 2, 3, 4, 5], Category.LargeStraight)).toBe(0)
    })
  })

  describe('full house', () => {
    it('scores sum for full house', () => {
      expect(calcScore([3, 3, 3, 5, 5], Category.FullHouse)).toBe(19)
    })

    it('returns 0 without full house', () => {
      expect(calcScore([3, 3, 3, 5, 1], Category.FullHouse)).toBe(0)
    })

    it('returns 0 for five of a kind (not a full house)', () => {
      expect(calcScore([3, 3, 3, 3, 3], Category.FullHouse)).toBe(0)
    })
  })

  describe('chance', () => {
    it('sums all dice', () => {
      expect(calcScore([1, 2, 3, 4, 5], Category.Chance)).toBe(15)
    })
  })

  describe('yatzy', () => {
    it('scores 50 for five of a kind', () => {
      expect(calcScore([6, 6, 6, 6, 6], Category.Yatzy)).toBe(50)
    })

    it('returns 0 without five of a kind', () => {
      expect(calcScore([6, 6, 6, 6, 5], Category.Yatzy)).toBe(0)
    })
  })
})
