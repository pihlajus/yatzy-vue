import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getTestEnv } from './_helpers'

const validNewGame = (hostUid: string) => ({
  code: 'K7M2',
  hostUid,
  phase: 'lobby',
  players: [{ uid: hostUid, name: 'Alice', scores: {}, conceded: false }],
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

describe('rules: games create', () => {
  beforeAll(async () => { await getTestEnv() })
  afterAll(async () => { const env = await getTestEnv(); await env.cleanup() })
  beforeEach(async () => { const env = await getTestEnv(); await env.clearFirestore() })

  it('host voi luoda pelin omalla uid:llä', async () => {
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(db, 'games', 'g1'), validNewGame('alice')))
  })

  it('hostUid ei saa olla muu kuin authin uid', async () => {
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(db, 'games', 'g1'), validNewGame('bob')))
  })

  it('phase pitää olla lobby uudessa pelissä', async () => {
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    const game = { ...validNewGame('alice'), phase: 'playing' }
    await assertFails(setDoc(doc(db, 'games', 'g1'), game))
  })

  it('uuden pelin players pitää olla [host]', async () => {
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    const game = { ...validNewGame('alice'), players: [] }
    await assertFails(setDoc(doc(db, 'games', 'g1'), game))
  })
})
