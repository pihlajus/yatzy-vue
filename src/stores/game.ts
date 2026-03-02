import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  type Die,
  Category,
  ALL_CATEGORIES,
  UPPER_CATEGORIES,
  UPPER_BONUS_LIMIT,
  UPPER_BONUS_POINTS,
  MAX_ROLLS,
  NUM_ROUNDS,
} from '../types/game'
import { calcScore } from '../scoring'

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1
}

function createDice(): Die[] {
  return Array.from({ length: 5 }, () => ({ value: 1, locked: false }))
}

export const useGameStore = defineStore('game', () => {
  // State
  const dice = ref<Die[]>(createDice())
  const rollsLeft = ref(MAX_ROLLS)
  const scores = ref<Map<Category, number>>(new Map())
  const currentRound = ref(1)

  // Getters
  const diceValues = computed(() => dice.value.map((d) => d.value))

  const hasRolled = computed(() => rollsLeft.value < MAX_ROLLS)

  const potentialScores = computed(() => {
    if (!hasRolled.value) return new Map<Category, number>()
    const result = new Map<Category, number>()
    for (const cat of ALL_CATEGORIES) {
      if (!scores.value.has(cat)) {
        result.set(cat, calcScore(diceValues.value, cat))
      }
    }
    return result
  })

  const upperSum = computed(() => {
    let sum = 0
    for (const cat of UPPER_CATEGORIES) {
      sum += scores.value.get(cat) ?? 0
    }
    return sum
  })

  const upperBonus = computed(() =>
    upperSum.value >= UPPER_BONUS_LIMIT ? UPPER_BONUS_POINTS : 0,
  )

  const lowerSum = computed(() => {
    let sum = 0
    for (const cat of ALL_CATEGORIES) {
      if (!UPPER_CATEGORIES.includes(cat)) {
        sum += scores.value.get(cat) ?? 0
      }
    }
    return sum
  })

  const totalScore = computed(() => upperSum.value + upperBonus.value + lowerSum.value)

  const isGameOver = computed(() => currentRound.value > NUM_ROUNDS)

  // Actions
  function roll() {
    if (rollsLeft.value <= 0 || isGameOver.value) return

    for (const die of dice.value) {
      if (!die.locked) {
        die.value = rollDie()
      }
    }
    rollsLeft.value--
  }

  function toggleLock(index: number) {
    if (!hasRolled.value || rollsLeft.value <= 0) return
    const die = dice.value[index]
    if (die) die.locked = !die.locked
  }

  function selectCategory(category: Category) {
    if (!hasRolled.value || scores.value.has(category) || isGameOver.value) return

    const score = calcScore(diceValues.value, category)
    scores.value.set(category, score)
    currentRound.value++

    // Reset for next round
    for (const die of dice.value) {
      die.locked = false
    }
    rollsLeft.value = MAX_ROLLS
  }

  function newGame() {
    dice.value = createDice()
    rollsLeft.value = MAX_ROLLS
    scores.value = new Map()
    currentRound.value = 1
  }

  return {
    dice,
    rollsLeft,
    scores,
    currentRound,
    diceValues,
    hasRolled,
    potentialScores,
    upperSum,
    upperBonus,
    lowerSum,
    totalScore,
    isGameOver,
    roll,
    toggleLock,
    selectCategory,
    newGame,
  }
})
