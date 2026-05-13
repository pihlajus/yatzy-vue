import { describe, it, expect } from 'vitest'
import { upperSum, upperBonus, lowerSum, totalScore, findWinner } from '../scoreHelpers'
import { Category } from '../types/game'

function p(name: string, scores: Array<[Category, number]>) {
  return { name, scores: new Map(scores) }
}

describe('scoreHelpers', () => {
  it('upperSum laskee yläosan kategoriat yhteen', () => {
    const player = p('A', [[Category.Ones, 3], [Category.Twos, 6], [Category.Threes, 9]])
    expect(upperSum(player)).toBe(18)
  })

  it('upperBonus = 50 jos ylä-summa on >= 63, muuten 0', () => {
    expect(upperBonus(p('A', [[Category.Ones, 3], [Category.Sixes, 60]]))).toBe(50)
    expect(upperBonus(p('B', [[Category.Ones, 3]]))).toBe(0)
  })

  it('lowerSum laskee alaosan kategoriat yhteen', () => {
    const player = p('A', [[Category.Pair, 10], [Category.Yatzy, 50], [Category.Ones, 5]])
    expect(lowerSum(player)).toBe(60)
  })

  it('totalScore = ylä + bonus + ala', () => {
    const player = p('A', [[Category.Ones, 3], [Category.Sixes, 60], [Category.Yatzy, 50]])
    expect(totalScore(player)).toBe(3 + 60 + 50 + 50)
  })

  it('findWinner palauttaa korkeimmat pisteet saavan pelaajan', () => {
    const a = p('A', [[Category.Yatzy, 50]])
    const b = p('B', [[Category.Yatzy, 50], [Category.Chance, 20]])
    expect(findWinner([a, b])).toBe(b)
  })
})
