import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore'
import { generateRoomCode, normalizeRoomCode, isValidRoomCode } from '../codeGenerator'
import { db } from '../firebase'
import {
  Category,
  MAX_ROLLS,
  MAX_PLAYERS,
  MIN_PLAYERS_TO_START,
  type GameDoc,
  type Die,
} from '../types/game'
import {
  toLocalPlayer,
  toFirestorePlayer,
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

  function gameRef() {
    if (!gameId.value) throw new Error('Ei aktiivista peliä')
    return doc(db, 'games', gameId.value)
  }

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j]!, a[i]!]
    }
    return a
  }

  function createEmptyDice() {
    return Array.from({ length: 5 }, () => ({ value: 1, locked: false }))
  }

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

  async function createGame(name: string): Promise<string> {
    await profile.init()
    const uid = profile.uid
    if (!uid) throw new Error('Sisäänkirjautuminen ei valmis')

    const ref = doc(collection(db, 'games'))
    const code = generateRoomCode()
    await setDoc(ref, {
      code,
      hostUid: uid,
      phase: 'lobby',
      players: [{ uid, name, scores: {}, conceded: false }],
      dice: [],
      rollsLeft: 0,
      currentPlayerIndex: 0,
      turnsPlayed: 0,
      lastYatzy: false,
      lastBonus: false,
      winnerUid: null,
      highScoresWritten: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await profile.setDisplayName(name)
    subscribe(ref.id)
    return ref.id
  }

  async function leaveGame() {
    unsubscribeAll()
  }

  async function joinGame(rawCode: string, name: string): Promise<void> {
    await profile.init()
    const uid = profile.uid
    if (!uid) throw new Error('Sisäänkirjautuminen ei valmis')

    const code = normalizeRoomCode(rawCode)
    if (!isValidRoomCode(code)) throw new Error('Koodi on virheellinen.')

    await profile.setDisplayName(name)

    const q = query(
      collection(db, 'games'),
      where('code', '==', code),
      where('phase', 'in', ['lobby', 'playing']),
    )
    const snap = await getDocs(q)
    if (snap.empty) throw new Error(`Koodia ${code} ei löytynyt.`)
    const docSnap = snap.docs[0]!
    const data = docSnap.data() as GameDoc

    if (data.players.some(p => p.uid === uid)) {
      subscribe(docSnap.id)
      return
    }

    if (data.phase !== 'lobby') throw new Error('Peli on jo alkanut.')
    if (data.players.length >= 4) throw new Error('Peli on täynnä.')

    const newPlayers = [
      ...data.players,
      { uid, name, scores: {}, conceded: false },
    ]
    await updateDoc(docSnap.ref, {
      players: newPlayers,
      updatedAt: serverTimestamp(),
    })
    subscribe(docSnap.id)
  }

  async function startGame(): Promise<void> {
    if (!isHost.value) throw new Error('Vain isäntä voi aloittaa pelin')
    if (players.value.length < MIN_PLAYERS_TO_START) throw new Error('Tarvitaan vähintään 2 pelaajaa')
    const shuffled = shuffle(players.value).map(toFirestorePlayer)
    await updateDoc(gameRef(), {
      phase: 'playing',
      players: shuffled,
      dice: createEmptyDice(),
      rollsLeft: MAX_ROLLS,
      currentPlayerIndex: 0,
      turnsPlayed: 0,
      updatedAt: serverTimestamp(),
    })
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
    createGame, leaveGame, joinGame, startGame,
  }
})
