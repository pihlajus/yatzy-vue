import {
  Category,
  UPPER_CATEGORIES,
  ALL_CATEGORIES,
  UPPER_BONUS_LIMIT,
  UPPER_BONUS_POINTS,
} from './types/game'

export interface ScorablePlayer {
  scores: Map<Category, number>
}

export function upperSum(player: ScorablePlayer): number {
  let sum = 0
  for (const cat of UPPER_CATEGORIES) sum += player.scores.get(cat) ?? 0
  return sum
}

export function upperBonus(player: ScorablePlayer): number {
  return upperSum(player) >= UPPER_BONUS_LIMIT ? UPPER_BONUS_POINTS : 0
}

export function lowerSum(player: ScorablePlayer): number {
  let sum = 0
  for (const cat of ALL_CATEGORIES) {
    if (!UPPER_CATEGORIES.includes(cat)) sum += player.scores.get(cat) ?? 0
  }
  return sum
}

export function totalScore(player: ScorablePlayer): number {
  return upperSum(player) + upperBonus(player) + lowerSum(player)
}

export function findWinner<T extends ScorablePlayer>(players: T[]): T | null {
  if (players.length === 0) return null
  return players.reduce((best, p) => (totalScore(p) > totalScore(best) ? p : best))
}
