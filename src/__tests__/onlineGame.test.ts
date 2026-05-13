// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../firebase', () => ({
  db: {},
  ensureSignedIn: vi.fn().mockResolvedValue({ uid: 'mock-uid' }),
}))

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore')
  return { ...actual,
    doc: vi.fn(() => ({})),
    onSnapshot: vi.fn(() => () => {}),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    setDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(() => 'TIMESTAMP_MARKER'),
  }
})

import { useOnlineGameStore } from '../stores/onlineGame'
import { Category } from '../types/game'

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
