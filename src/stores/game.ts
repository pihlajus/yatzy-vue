import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  type Die,
  type Player,
  type GamePhase,
  Category,
  ALL_CATEGORIES,
  UPPER_BONUS_LIMIT,
  MAX_ROLLS,
  NUM_ROUNDS,
} from '../types/game'
import { calcScore } from '../scoring'
import {
  upperSum as calcUpperSum,
  upperBonus as calcUpperBonus,
  lowerSum as calcLowerSum,
  totalScore as calcTotalScore,
  findWinner,
  type ScorablePlayer,
} from '../scoreHelpers'

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1
}

function createDice(): Die[] {
  return Array.from({ length: 5 }, () => ({ value: 1, locked: false }))
}

function createPlayer(name: string): Player {
  return { name, scores: new Map() }
}

export const useGameStore = defineStore('game', () => {
  // State
  const dice = ref<Die[]>(createDice())
  const rollsLeft = ref(MAX_ROLLS)
  const players = ref<Player[]>([])
  const currentPlayerIndex = ref(0)
  const phase = ref<GamePhase>('setup')
  const turnsPlayed = ref(0)
  const lastYatzy = ref(false)
  const lastBonus = ref(false)

  interface UndoSnapshot {
    playerIndex: number
    category: Category
    score: number
    diceValues: number[]
    diceLocks: boolean[]
    rollsLeft: number
  }

  const undoSnapshot = ref<UndoSnapshot | null>(null)

  // Getters
  const diceValues = computed(() => dice.value.map((d) => d.value))

  const hasRolled = computed(() => rollsLeft.value < MAX_ROLLS)

  const canUndo = computed(() => undoSnapshot.value !== null && !hasRolled.value)

  const canInteract = computed(() => true)

  const currentPlayer = computed(() => players.value[currentPlayerIndex.value])

  const currentRound = computed(() =>
    players.value.length > 0
      ? Math.floor(turnsPlayed.value / players.value.length) + 1
      : 1,
  )

  const potentialScores = computed(() => {
    if (!hasRolled.value || !currentPlayer.value) return new Map<Category, number>()
    const result = new Map<Category, number>()
    for (const cat of ALL_CATEGORIES) {
      if (!currentPlayer.value.scores.has(cat)) {
        result.set(cat, calcScore(diceValues.value, cat))
      }
    }
    return result
  })

  const isGameOver = computed(() =>
    players.value.length > 0 &&
    players.value.every((p) => p.scores.size >= NUM_ROUNDS),
  )

  function upperSum(player: ScorablePlayer): number { return calcUpperSum(player) }
  function upperBonus(player: ScorablePlayer): number { return calcUpperBonus(player) }
  function lowerSum(player: ScorablePlayer): number { return calcLowerSum(player) }
  function totalScore(player: ScorablePlayer): number { return calcTotalScore(player) }

  const winner = computed(() => {
    if (!isGameOver.value || players.value.length === 0) return null
    return findWinner(players.value)
  })

  // Actions
  function startGame(names: string[]) {
    players.value = names.map(createPlayer)
    currentPlayerIndex.value = 0
    turnsPlayed.value = 0
    dice.value = createDice()
    rollsLeft.value = MAX_ROLLS
    phase.value = 'playing'
  }

  function roll() {
    if (rollsLeft.value <= 0 || isGameOver.value) return
    lastYatzy.value = false
    lastBonus.value = false
    undoSnapshot.value = null

    for (const die of dice.value) {
      if (!die.locked) {
        die.value = rollDie()
      }
    }
    rollsLeft.value--

    // Detect yatzy in dice immediately after roll
    const values = dice.value.map((d) => d.value)
    const allSame = values.every((v) => v === values[0])
    const yatzyNotScored = !currentPlayer.value?.scores.has(Category.Yatzy)
    if (allSame && yatzyNotScored) {
      lastYatzy.value = true
    }
  }

  function toggleLock(index: number) {
    if (!hasRolled.value || rollsLeft.value <= 0) return
    const die = dice.value[index]
    if (die) die.locked = !die.locked
  }

  function selectCategory(category: Category) {
    const player = currentPlayer.value
    if (!hasRolled.value || !player || player.scores.has(category) || isGameOver.value) return

    const score = calcScore(diceValues.value, category)

    undoSnapshot.value = {
      playerIndex: currentPlayerIndex.value,
      category,
      score,
      diceValues: dice.value.map((d) => d.value),
      diceLocks: dice.value.map((d) => d.locked),
      rollsLeft: rollsLeft.value,
    }

    const hadBonus = upperSum(player) >= UPPER_BONUS_LIMIT
    player.scores.set(category, score)
    lastBonus.value = !hadBonus && upperSum(player) >= UPPER_BONUS_LIMIT
    turnsPlayed.value++

    // Reset dice for next turn
    for (const die of dice.value) {
      die.locked = false
    }
    rollsLeft.value = MAX_ROLLS

    // Advance to next player or end game
    if (isGameOver.value) {
      phase.value = 'finished'
    } else {
      currentPlayerIndex.value = (currentPlayerIndex.value + 1) % players.value.length
    }
  }

  function undoLastCategory() {
    const snap = undoSnapshot.value
    if (!snap || hasRolled.value) return

    const player = players.value[snap.playerIndex]
    if (!player) return

    player.scores.delete(snap.category)
    turnsPlayed.value--
    currentPlayerIndex.value = snap.playerIndex
    rollsLeft.value = snap.rollsLeft

    for (let i = 0; i < dice.value.length; i++) {
      dice.value[i]!.value = snap.diceValues[i]!
      dice.value[i]!.locked = snap.diceLocks[i]!
    }

    if (phase.value === 'finished') {
      phase.value = 'playing'
    }

    undoSnapshot.value = null
  }

  function restartGame() {
    for (const player of players.value) {
      player.scores = new Map()
    }
    currentPlayerIndex.value = 0
    turnsPlayed.value = 0
    dice.value = createDice()
    rollsLeft.value = MAX_ROLLS
    lastYatzy.value = false
    lastBonus.value = false
    undoSnapshot.value = null
    phase.value = 'playing'
  }

  function newGame() {
    phase.value = 'setup'
    players.value = []
    currentPlayerIndex.value = 0
    turnsPlayed.value = 0
    dice.value = createDice()
    rollsLeft.value = MAX_ROLLS
    lastYatzy.value = false
    lastBonus.value = false
    undoSnapshot.value = null
  }

  return {
    dice,
    rollsLeft,
    players,
    currentPlayerIndex,
    phase,
    turnsPlayed,
    diceValues,
    hasRolled,
    currentPlayer,
    currentRound,
    potentialScores,
    isGameOver,
    winner,
    upperSum,
    upperBonus,
    lowerSum,
    totalScore,
    startGame,
    restartGame,
    roll,
    toggleLock,
    selectCategory,
    newGame,
    lastYatzy,
    lastBonus,
    canUndo,
    canInteract,
    undoLastCategory,
  }
})
