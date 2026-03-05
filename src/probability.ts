import { Category, ALL_CATEGORIES } from './types/game'
import { calcScore } from './scoring'

const ITERATIONS = 10000

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1
}

function simulateRolls(freeDice: number[], lockedDice: number[], rollsLeft: number): number[] {
  let current = [...freeDice]
  for (let r = 0; r < rollsLeft; r++) {
    current = current.map(() => rollDie())
  }
  return [...lockedDice, ...current]
}

export function calcProbabilities(
  freeDice: number[],
  lockedDice: number[],
  rollsLeft: number,
): Map<Category, number> {
  const result = new Map<Category, number>()

  if (rollsLeft === 0) {
    const allDice = [...lockedDice, ...freeDice]
    for (const cat of ALL_CATEGORIES) {
      result.set(cat, calcScore(allDice, cat) > 0 ? 1 : 0)
    }
    return result
  }

  const hits = new Map<Category, number>()
  for (const cat of ALL_CATEGORIES) {
    hits.set(cat, 0)
  }

  for (let i = 0; i < ITERATIONS; i++) {
    const dice = simulateRolls(freeDice, lockedDice, rollsLeft)
    for (const cat of ALL_CATEGORIES) {
      if (calcScore(dice, cat) > 0) {
        hits.set(cat, hits.get(cat)! + 1)
      }
    }
  }

  for (const cat of ALL_CATEGORIES) {
    result.set(cat, hits.get(cat)! / ITERATIONS)
  }

  return result
}
