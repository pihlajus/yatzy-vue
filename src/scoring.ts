import { Category } from './types/game'

function countValues(dice: number[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const d of dice) {
    counts.set(d, (counts.get(d) ?? 0) + 1)
  }
  return counts
}

export function calcScore(dice: number[], category: Category): number {
  const counts = countValues(dice)

  // Upper section: ones through sixes
  if (category <= Category.Sixes) {
    const face = category + 1
    return (counts.get(face) ?? 0) * face
  }

  if (category === Category.Pair) {
    const pairs = [...counts.entries()]
      .filter(([, c]) => c >= 2)
      .map(([v]) => v)
    return pairs.length > 0 ? Math.max(...pairs) * 2 : 0
  }

  if (category === Category.TwoPairs) {
    const pairs = [...counts.entries()]
      .filter(([, c]) => c >= 2)
      .map(([v]) => v)
      .sort((a, b) => b - a)
    return pairs.length >= 2 ? (pairs[0]! + pairs[1]!) * 2 : 0
  }

  if (category === Category.ThreeOfAKind) {
    const trips = [...counts.entries()]
      .filter(([, c]) => c >= 3)
      .map(([v]) => v)
    return trips.length > 0 ? Math.max(...trips) * 3 : 0
  }

  if (category === Category.FourOfAKind) {
    const quads = [...counts.entries()]
      .filter(([, c]) => c >= 4)
      .map(([v]) => v)
    return quads.length > 0 ? Math.max(...quads) * 4 : 0
  }

  if (category === Category.SmallStraight) {
    const sorted = [...dice].sort((a, b) => a - b)
    return sorted.join('') === '12345' ? 15 : 0
  }

  if (category === Category.LargeStraight) {
    const sorted = [...dice].sort((a, b) => a - b)
    return sorted.join('') === '23456' ? 20 : 0
  }

  if (category === Category.FullHouse) {
    const vals = [...counts.values()].sort((a, b) => a - b)
    return vals.length === 2 && vals[0] === 2 && vals[1] === 3
      ? dice.reduce((a, b) => a + b, 0)
      : 0
  }

  if (category === Category.Chance) {
    return dice.reduce((a, b) => a + b, 0)
  }

  if (category === Category.Yatzy) {
    return counts.size === 1 ? 50 : 0
  }

  return 0
}
