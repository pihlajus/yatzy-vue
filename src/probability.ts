import { Category, ALL_CATEGORIES, UPPER_CATEGORIES } from './types/game'
import { calcScore } from './scoring'

function upperThreshold(cat: Category): number {
  // Face value * 3 = bonus target (e.g. Threes needs 3×3=9)
  return (cat + 1) * 3
}

function meetsThreshold(dice: number[], cat: Category): boolean {
  const score = calcScore(dice, cat)
  if (UPPER_CATEGORIES.includes(cat)) {
    return score >= upperThreshold(cat)
  }
  return score > 0
}

const ITERATIONS = 10000

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1
}

function rollN(n: number): number[] {
  const result: number[] = []
  for (let i = 0; i < n; i++) result.push(rollDie())
  return result
}

/**
 * Given all 5 dice, return the values to keep for a given category.
 * Simulates a reasonable greedy strategy.
 */
function strategyKeep(dice: number[], cat: Category): number[] {
  const counts = new Map<number, number>()
  for (const v of dice) counts.set(v, (counts.get(v) || 0) + 1)

  // Upper section: keep matching face values
  if (UPPER_CATEGORIES.includes(cat)) {
    const face = cat + 1
    return dice.filter(v => v === face)
  }

  switch (cat) {
    case Category.Pair: {
      // Keep the highest value with most occurrences (prefer pairs)
      let best = 0
      for (const [val, count] of counts) {
        if (count >= 2 && val > best) best = val
      }
      if (best === 0) {
        // No pair yet - keep highest single
        best = Math.max(...dice)
      }
      return dice.filter(v => v === best)
    }

    case Category.TwoPairs: {
      // Keep values that appear 2+ times
      const kept: number[] = []
      const pairVals = [...counts.entries()]
        .filter(([, c]) => c >= 2)
        .map(([v]) => v)
        .sort((a, b) => b - a)

      if (pairVals.length >= 2) {
        // Keep top 2 pairs
        for (const v of pairVals.slice(0, 2)) {
          kept.push(v, v)
        }
      } else if (pairVals.length === 1) {
        // Keep the pair, re-roll rest
        kept.push(pairVals[0]!, pairVals[0]!)
      }
      return kept
    }

    case Category.ThreeOfAKind:
    case Category.FourOfAKind:
    case Category.Yatzy: {
      // Keep the most frequent value (prefer higher on tie)
      let bestVal = 0, bestCount = 0
      for (const [val, count] of counts) {
        if (count > bestCount || (count === bestCount && val > bestVal)) {
          bestVal = val
          bestCount = count
        }
      }
      return dice.filter(v => v === bestVal)
    }

    case Category.FullHouse: {
      // Keep groups toward 3+2
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
      const kept: number[] = []
      if (sorted.length >= 2) {
        const [v1, c1] = sorted[0]!
        const [v2, c2] = sorted[1]!
        for (let i = 0; i < Math.min(c1, 3); i++) kept.push(v1)
        for (let i = 0; i < Math.min(c2, 2); i++) kept.push(v2)
      } else if (sorted.length === 1) {
        const [v1, c1] = sorted[0]!
        for (let i = 0; i < Math.min(c1, 5); i++) kept.push(v1)
      }
      return kept
    }

    case Category.SmallStraight: {
      // Keep unique values in 1-5
      const target = new Set([1, 2, 3, 4, 5])
      const kept: number[] = []
      const used = new Set<number>()
      for (const v of dice) {
        if (target.has(v) && !used.has(v)) {
          kept.push(v)
          used.add(v)
        }
      }
      return kept
    }

    case Category.LargeStraight: {
      // Keep unique values in 2-6
      const target = new Set([2, 3, 4, 5, 6])
      const kept: number[] = []
      const used = new Set<number>()
      for (const v of dice) {
        if (target.has(v) && !used.has(v)) {
          kept.push(v)
          used.add(v)
        }
      }
      return kept
    }

    case Category.Chance:
      // Keep all dice
      return [...dice]

    default:
      return [...dice]
  }
}

/**
 * Simulate rolls with strategy: between rolls, keep dice that help the target category.
 */
function simulateWithStrategy(
  freeDice: number[],
  lockedDice: number[],
  rollsLeft: number,
  cat: Category,
): number[] {
  let locked = [...lockedDice]
  let freeCount = freeDice.length

  for (let r = 0; r < rollsLeft; r++) {
    const rolled = rollN(freeCount)
    const allDice = [...locked, ...rolled]

    // Last roll - return final result
    if (r === rollsLeft - 1) {
      return allDice
    }

    // Apply strategy between rolls
    locked = strategyKeep(allDice, cat)
    freeCount = 5 - locked.length
  }

  return locked
}

/**
 * Simple simulation without strategy (for single roll remaining).
 */
function simulateSimple(freeDice: number[], lockedDice: number[]): number[] {
  return [...lockedDice, ...rollN(freeDice.length)]
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
      result.set(cat, meetsThreshold(allDice, cat) ? 1 : 0)
    }
    return result
  }

  if (rollsLeft === 1) {
    // No strategy needed - shared simulation across all categories
    const hits = new Map<Category, number>()
    for (const cat of ALL_CATEGORIES) hits.set(cat, 0)

    for (let i = 0; i < ITERATIONS; i++) {
      const dice = simulateSimple(freeDice, lockedDice)
      for (const cat of ALL_CATEGORIES) {
        if (meetsThreshold(dice, cat)) {
          hits.set(cat, hits.get(cat)! + 1)
        }
      }
    }

    for (const cat of ALL_CATEGORIES) {
      result.set(cat, hits.get(cat)! / ITERATIONS)
    }
    return result
  }

  // Multiple rolls left: per-category strategy simulation
  for (const cat of ALL_CATEGORIES) {
    let hitCount = 0
    for (let i = 0; i < ITERATIONS; i++) {
      const dice = simulateWithStrategy(freeDice, lockedDice, rollsLeft, cat)
      if (meetsThreshold(dice, cat)) {
        hitCount++
      }
    }
    result.set(cat, hitCount / ITERATIONS)
  }

  return result
}
