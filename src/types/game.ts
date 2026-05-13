export enum Category {
  Ones,
  Twos,
  Threes,
  Fours,
  Fives,
  Sixes,
  Pair,
  TwoPairs,
  ThreeOfAKind,
  FourOfAKind,
  SmallStraight,
  LargeStraight,
  FullHouse,
  Chance,
  Yatzy,
}

export const CATEGORY_NAMES: Record<Category, string> = {
  [Category.Ones]: 'Ykköset',
  [Category.Twos]: 'Kakkoset',
  [Category.Threes]: 'Kolmoset',
  [Category.Fours]: 'Neloset',
  [Category.Fives]: 'Viitoset',
  [Category.Sixes]: 'Kuutoset',
  [Category.Pair]: 'Pari',
  [Category.TwoPairs]: 'Kaksi paria',
  [Category.ThreeOfAKind]: 'Kolme samaa',
  [Category.FourOfAKind]: 'Neljä samaa',
  [Category.SmallStraight]: 'Pikku suora',
  [Category.LargeStraight]: 'Iso suora',
  [Category.FullHouse]: 'Täyskäsi',
  [Category.Chance]: 'Sattuma',
  [Category.Yatzy]: 'Yatzy',
}

export const UPPER_CATEGORIES = [
  Category.Ones,
  Category.Twos,
  Category.Threes,
  Category.Fours,
  Category.Fives,
  Category.Sixes,
]

export const LOWER_CATEGORIES = [
  Category.Pair,
  Category.TwoPairs,
  Category.ThreeOfAKind,
  Category.FourOfAKind,
  Category.SmallStraight,
  Category.LargeStraight,
  Category.FullHouse,
  Category.Chance,
  Category.Yatzy,
]

export const ALL_CATEGORIES = [...UPPER_CATEGORIES, ...LOWER_CATEGORIES]

export const UPPER_BONUS_LIMIT = 63
export const UPPER_BONUS_POINTS = 50
export const NUM_ROUNDS = 15
export const MAX_ROLLS = 3

export interface Die {
  value: number
  locked: boolean
}

export interface Player {
  name: string
  scores: Map<Category, number>
}

export type GamePhase = 'setup' | 'playing' | 'finished'

export interface OnlinePlayer {
  uid: string
  name: string
  scores: Record<string, number>
  conceded: boolean
}

export interface GameDoc {
  code: string
  hostUid: string
  createdAt: import('firebase/firestore').Timestamp
  updatedAt: import('firebase/firestore').Timestamp
  phase: 'lobby' | 'playing' | 'finished'
  players: OnlinePlayer[]
  dice: { value: number; locked: boolean }[]
  rollsLeft: number
  currentPlayerIndex: number
  turnsPlayed: number
  lastYatzy: boolean
  lastBonus: boolean
  winnerUid: string | null
  highScoresWritten: boolean
}

export const MAX_PLAYERS = 4
export const MIN_PLAYERS_TO_START = 2
