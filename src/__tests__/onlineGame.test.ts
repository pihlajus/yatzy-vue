// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as firestore from 'firebase/firestore'

vi.mock('../firebase', () => ({
  db: {},
  ensureSignedIn: vi.fn().mockResolvedValue({ uid: 'mock-uid' }),
  savePlayerScores: vi.fn().mockResolvedValue([]),
}))

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore')
  return { ...actual,
    doc: vi.fn(() => ({ id: 'mock-game-id' })),
    onSnapshot: vi.fn(() => () => {}),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    setDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(() => 'TIMESTAMP_MARKER'),
    collection: vi.fn(() => ({})),
    getDocs: vi.fn(),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
  }
})

import { useOnlineGameStore } from '../stores/onlineGame'
import { useProfileStore } from '../stores/profile'
import { Category, NUM_ROUNDS } from '../types/game'

describe('onlineGame store: applyDocToState', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('peilaa GameDoc-kentät Pinia-tilaan', () => {
    const s = useOnlineGameStore()
    s._applyDocToState({
      code: 'K7M2',
      hostUid: 'alice',
      phase: 'playing',
      players: [
        { uid: 'alice', name: 'A', scores: { '0': 3 }, conceded: false },
        { uid: 'bob', name: 'B', scores: {}, conceded: false },
      ],
      dice: [{ value: 6, locked: true }, { value: 1, locked: false }, { value: 2, locked: false }, { value: 3, locked: false }, { value: 4, locked: false }],
      rollsLeft: 2,
      currentPlayerIndex: 1,
      turnsPlayed: 5,
      lastYatzy: false,
      lastBonus: false,
      winnerUid: null,
      highScoresWritten: false,
    } as any)
    expect(s.code).toBe('K7M2')
    expect(s.phase).toBe('playing')
    expect(s.players[0].scores.get(Category.Ones)).toBe(3)
    expect(s.dice[0].locked).toBe(true)
    expect(s.currentPlayerIndex).toBe(1)
  })
})

describe('onlineGame store: createGame', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('createGame asettaa hostUid:n, koodin ja yhden pelaajan', async () => {
    const s = useOnlineGameStore()
    const setDocMock = vi.mocked(firestore.setDoc)
    setDocMock.mockResolvedValueOnce(undefined)

    const id = await s.createGame('Alice')

    expect(typeof id).toBe('string')
    expect(setDocMock).toHaveBeenCalled()
    const callArgs = setDocMock.mock.calls[0]!
    const data = callArgs[1] as any
    expect(data.hostUid).toBe('mock-uid')
    expect(data.phase).toBe('lobby')
    expect(data.players).toHaveLength(1)
    expect(data.players[0].uid).toBe('mock-uid')
    expect(data.players[0].name).toBe('Alice')
    expect(data.code).toMatch(/^[A-HJKMNP-Z2-9]{4}$/)
  })
})

describe('onlineGame store: joinGame', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('joinGame normalisoi koodin uppercaseksi ennen kyselyä', async () => {
    const s = useOnlineGameStore()
    const getDocsMock = vi.mocked(firestore.getDocs)
    getDocsMock.mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: 'g1',
        ref: { id: 'g1' },
        data: () => ({
          code: 'K7M2', phase: 'lobby',
          players: [{ uid: 'alice', name: 'A', scores: {}, conceded: false }],
        }),
      }],
    } as any)
    const updateDocMock = vi.mocked(firestore.updateDoc)
    updateDocMock.mockResolvedValueOnce(undefined)
    await s.joinGame(' k7m2 ', 'Bob')
    expect(updateDocMock).toHaveBeenCalled()
    const callArgs = updateDocMock.mock.calls[0]!
    const data = callArgs[1] as any
    expect(data.players).toHaveLength(2)
    expect(data.players[1].uid).toBe('mock-uid')
    expect(data.players[1].name).toBe('Bob')
  })

  it('joinGame heittää virheen jos koodia ei löydy', async () => {
    const s = useOnlineGameStore()
    vi.mocked(firestore.getDocs).mockResolvedValueOnce({ empty: true, docs: [] } as any)
    await expect(s.joinGame('XXXX', 'Bob')).rejects.toThrow(/ei löytynyt/i)
  })
})

describe('onlineGame store: startGame', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('startGame shufflaa pelaajat ja asettaa phase = playing', async () => {
    const s = useOnlineGameStore()
    const profile = useProfileStore()
    // Seed store state directly (subscribe path is mocked away)
    ;(profile as any).uid = 'mock-uid'
    ;(s as any).gameId = 'g1'
    ;(s as any).hostUid = 'mock-uid'
    s.players = [
      { uid: 'mock-uid', name: 'A', scores: new Map(), conceded: false },
      { uid: 'bob', name: 'B', scores: new Map(), conceded: false },
    ]
    ;(s as any).phase = 'lobby'
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined)
    await s.startGame()
    expect(vi.mocked(firestore.updateDoc)).toHaveBeenCalled()
    const callArgs = vi.mocked(firestore.updateDoc).mock.calls[0]!
    const data = callArgs[1] as any
    expect(data.phase).toBe('playing')
    expect(data.rollsLeft).toBe(3)
    expect(data.dice).toHaveLength(5)
    expect(data.players).toHaveLength(2)
    expect(data.currentPlayerIndex).toBe(0)
    expect(data.turnsPlayed).toBe(0)
  })
})

describe('onlineGame store: rollDice & toggleLock', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  function setupActive(s: ReturnType<typeof useOnlineGameStore>) {
    ;(s.profile ??= undefined) // ensure profile-store is initialised in this test
    // Seed profile uid via useProfileStore — same pattern as D4 startGame test
    const profile = useProfileStore() as any
    profile.uid = 'mock-uid'
    ;(s as any).gameId = 'g1'
    ;(s as any).hostUid = 'mock-uid'
    s.players = [{ uid: 'mock-uid', name: 'A', scores: new Map(), conceded: false }]
    s.phase = 'playing'
    s.dice = Array.from({ length: 5 }, () => ({ value: 1, locked: false }))
    s.rollsLeft = 3
    s.currentPlayerIndex = 0
  }

  it('rollDice ei tee mitään jos ei ole oma vuoro', async () => {
    const s = useOnlineGameStore()
    setupActive(s)
    s.players = [{ uid: 'someone-else', name: 'X', scores: new Map(), conceded: false }]
    s.currentPlayerIndex = 0
    await s.rollDice()
    expect(vi.mocked(firestore.updateDoc)).not.toHaveBeenCalled()
  })

  it('rollDice arpoo lukitsemattomat nopat ja vähentää rollsLeft', async () => {
    const s = useOnlineGameStore()
    setupActive(s)
    s.dice[0]!.locked = true
    s.dice[0]!.value = 6
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined)
    await s.rollDice()
    const callArgs = vi.mocked(firestore.updateDoc).mock.calls[0]!
    const data = callArgs[1] as any
    expect(data.rollsLeft).toBe(2)
    expect(data.dice[0]).toEqual({ value: 6, locked: true })
    for (const d of data.dice) {
      expect(d.value).toBeGreaterThanOrEqual(1)
      expect(d.value).toBeLessThanOrEqual(6)
    }
  })

  it('toggleLock ei toimi ennen ensimmäistä heittoa', async () => {
    const s = useOnlineGameStore()
    setupActive(s)
    s.rollsLeft = 3 // hasRolled === false
    await s.toggleLock(0)
    expect(vi.mocked(firestore.updateDoc)).not.toHaveBeenCalled()
  })

  it('toggleLock vaihtaa lukon tilan', async () => {
    const s = useOnlineGameStore()
    setupActive(s)
    s.rollsLeft = 2 // already rolled once
    s.dice[2]!.locked = false
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined)
    await s.toggleLock(2)
    const callArgs = vi.mocked(firestore.updateDoc).mock.calls[0]!
    const data = callArgs[1] as any
    expect(data.dice[2].locked).toBe(true)
  })
})

describe('onlineGame store: selectCategory', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  function seedActive(s: ReturnType<typeof useOnlineGameStore>) {
    const profile = useProfileStore() as any
    profile.uid = 'mock-uid'
    ;(s as any).gameId = 'g1'
    ;(s as any).hostUid = 'mock-uid'
  }

  it('selectCategory tallentaa pisteet, vaihtaa vuoron, resetoi nopat', async () => {
    const s = useOnlineGameStore()
    seedActive(s)
    s.players = [
      { uid: 'mock-uid', name: 'A', scores: new Map(), conceded: false },
      { uid: 'bob', name: 'B', scores: new Map(), conceded: false },
    ]
    s.phase = 'playing'
    s.dice = Array.from({ length: 5 }, () => ({ value: 3, locked: false }))
    s.rollsLeft = 1
    s.currentPlayerIndex = 0
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined)
    await s.selectCategory(Category.Threes)
    const callArgs = vi.mocked(firestore.updateDoc).mock.calls[0]!
    const data = callArgs[1] as any
    expect(data.players[0].scores['2']).toBe(15) // five threes
    expect(data.currentPlayerIndex).toBe(1)
    expect(data.rollsLeft).toBe(3)
    expect(data.turnsPlayed).toBe(1)
    expect(data.phase).toBe('playing')
  })

  it('viimeinen scorecategoria päättää pelin', async () => {
    const s = useOnlineGameStore()
    seedActive(s)
    const fullScores = new Map<Category, number>()
    for (let i = 0; i < NUM_ROUNDS - 1; i++) fullScores.set(i as Category, 0)
    s.players = [{ uid: 'mock-uid', name: 'A', scores: fullScores, conceded: false }]
    s.phase = 'playing'
    s.dice = Array.from({ length: 5 }, () => ({ value: 6, locked: false }))
    s.rollsLeft = 1
    s.currentPlayerIndex = 0
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined)
    // Mock savePlayerScores in firebase mock — must add to top-of-file mock
    await s.selectCategory(Category.Yatzy)
    const callArgs = vi.mocked(firestore.updateDoc).mock.calls[0]!
    const data = callArgs[1] as any
    expect(data.phase).toBe('finished')
    expect(data.winnerUid).toBe('mock-uid')
  })
})

describe('onlineGame store: concedePlayer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('concedePlayer asettaa täyttämättömät kategoriat nolliksi ja conceded=true', async () => {
    const s = useOnlineGameStore()
    const profile = useProfileStore() as any
    profile.uid = 'mock-uid'
    ;(s as any).gameId = 'g1'
    ;(s as any).hostUid = 'mock-uid'
    s.players = [
      { uid: 'mock-uid', name: 'A', scores: new Map(), conceded: false },
      { uid: 'bob', name: 'B', scores: new Map([[Category.Ones, 3]]), conceded: false },
    ]
    s.phase = 'playing'
    s.currentPlayerIndex = 1
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined)

    await s.concedePlayer('bob')

    const callArgs = vi.mocked(firestore.updateDoc).mock.calls[0]!
    const data = callArgs[1] as any
    const bobScores = data.players[1].scores
    expect(bobScores['0']).toBe(3) // already-scored category preserved
    expect(bobScores['14']).toBe(0) // Yatzy slot filled with 0
    expect(data.players[1].conceded).toBe(true)
    expect(data.currentPlayerIndex).toBe(0)
  })
})
