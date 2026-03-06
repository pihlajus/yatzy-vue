// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}))

import { getPendingScores, queueScores, clearPendingScores } from '../firebase'

describe('score queue', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns empty array when no pending scores', () => {
    expect(getPendingScores()).toEqual([])
  })

  it('queues scores to localStorage', () => {
    queueScores([{ name: 'Testi', score: 200 }])
    const pending = getPendingScores()
    expect(pending).toHaveLength(1)
    expect(pending[0].players).toEqual([{ name: 'Testi', score: 200 }])
  })

  it('queues multiple batches', () => {
    queueScores([{ name: 'A', score: 100 }])
    queueScores([{ name: 'B', score: 150 }])
    expect(getPendingScores()).toHaveLength(2)
  })

  it('clears pending scores', () => {
    queueScores([{ name: 'A', score: 100 }])
    clearPendingScores()
    expect(getPendingScores()).toEqual([])
  })
})
