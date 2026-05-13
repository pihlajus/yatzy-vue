import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import {
  Category,
  MAX_ROLLS,
  type GameDoc,
  type Die,
} from '../types/game'
import {
  toLocalPlayer,
  type LocalOnlinePlayer,
} from '../gameDocSerialization'
import {
  upperSum as calcUpperSum,
  upperBonus as calcUpperBonus,
  lowerSum as calcLowerSum,
  totalScore as calcTotalScore,
  findWinner,
} from '../scoreHelpers'
import { useProfileStore } from './profile'

export const useOnlineGameStore = defineStore('onlineGame', () => {
  // Local UI state (not in Firestore)
  const gameId = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null
  const connectionState = ref<'idle' | 'loading' | 'connected' | 'error'>('idle')
  const errorMessage = ref<string | null>(null)

  // Mirror of GameDoc fields
  const code = ref('')
  const hostUid = ref('')
  const phase = ref<'lobby' | 'playing' | 'finished'>('lobby')
  const players = ref<LocalOnlinePlayer[]>([])
  const dice = ref<Die[]>([])
  const rollsLeft = ref(MAX_ROLLS)
  const currentPlayerIndex = ref(0)
  const turnsPlayed = ref(0)
  const lastYatzy = ref(false)
  const lastBonus = ref(false)
  const winnerUid = ref<string | null>(null)
  const highScoresWritten = ref(false)

  const profile = useProfileStore()
  const myUid = computed(() => profile.uid ?? '')
  const isHost = computed(() => myUid.value !== '' && myUid.value === hostUid.value)
  const currentPlayer = computed(() => players.value[currentPlayerIndex.value])
  const isMyTurn = computed(() =>
    phase.value === 'playing' &&
    currentPlayer.value?.uid === myUid.value
  )
  const canInteract = computed(() => isMyTurn.value)
  const hasRolled = computed(() => rollsLeft.value < MAX_ROLLS)
  const canUndo = computed(() => false)
  const isGameOver = computed(() => phase.value === 'finished')
  const winner = computed(() => {
    if (phase.value !== 'finished') return null
    return findWinner(players.value)
  })

  function upperSum(p: LocalOnlinePlayer) { return calcUpperSum(p) }
  function upperBonus(p: LocalOnlinePlayer) { return calcUpperBonus(p) }
  function lowerSum(p: LocalOnlinePlayer) { return calcLowerSum(p) }
  function totalScore(p: LocalOnlinePlayer) { return calcTotalScore(p) }

  // potentialScores placeholder — filled in by D5
  const potentialScores = computed(() => new Map<Category, number>())

  function _applyDocToState(d: GameDoc) {
    code.value = d.code
    hostUid.value = d.hostUid
    phase.value = d.phase
    players.value = d.players.map(toLocalPlayer)
    dice.value = d.dice.map(x => ({ value: x.value, locked: x.locked }))
    rollsLeft.value = d.rollsLeft
    currentPlayerIndex.value = d.currentPlayerIndex
    turnsPlayed.value = d.turnsPlayed
    lastYatzy.value = d.lastYatzy
    lastBonus.value = d.lastBonus
    winnerUid.value = d.winnerUid
    highScoresWritten.value = d.highScoresWritten
  }

  function subscribe(id: string) {
    unsubscribeAll()
    gameId.value = id
    connectionState.value = 'loading'
    errorMessage.value = null
    unsubscribe = onSnapshot(
      doc(db, 'games', id),
      (snap) => {
        if (!snap.exists()) {
          errorMessage.value = 'Peli on poistettu tai sitä ei löytynyt.'
          connectionState.value = 'error'
          return
        }
        _applyDocToState(snap.data() as GameDoc)
        connectionState.value = 'connected'
      },
      (err) => {
        errorMessage.value = err.message
        connectionState.value = 'error'
      },
    )
  }

  function unsubscribeAll() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    gameId.value = null
    connectionState.value = 'idle'
  }

  return {
    // state
    gameId, connectionState, errorMessage,
    code, hostUid, phase, players, dice, rollsLeft,
    currentPlayerIndex, turnsPlayed, lastYatzy, lastBonus, winnerUid, highScoresWritten,
    // computed
    myUid, isHost, currentPlayer, isMyTurn, canInteract, hasRolled, canUndo, isGameOver, winner, potentialScores,
    // methods
    upperSum, upperBonus, lowerSum, totalScore,
    subscribe, unsubscribeAll, _applyDocToState,
  }
})
