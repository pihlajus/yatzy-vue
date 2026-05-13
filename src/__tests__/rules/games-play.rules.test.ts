import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getTestEnv } from './_helpers'

const dice5 = () => Array.from({ length: 5 }, () => ({ value: 1, locked: false }))

async function seed(state: Record<string, unknown>) {
  const env = await getTestEnv()
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'games', 'g1'), {
      code: 'K7M2',
      hostUid: 'alice',
      phase: 'lobby',
      players: [
        { uid: 'alice', name: 'Alice', scores: {}, conceded: false },
        { uid: 'bob', name: 'Bob', scores: {}, conceded: false },
      ],
      dice: [], rollsLeft: 0, currentPlayerIndex: 0, turnsPlayed: 0,
      lastYatzy: false, lastBonus: false, winnerUid: null, highScoresWritten: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      ...state,
    })
  })
}

describe('rules: games play', () => {
  beforeAll(async () => { await getTestEnv() })
  afterAll(async () => { const env = await getTestEnv(); await env.cleanup() })
  beforeEach(async () => { const env = await getTestEnv(); await env.clearFirestore() })

  it('host voi aloittaa pelin', async () => {
    await seed({})
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(db, 'games', 'g1'), {
      phase: 'playing',
      dice: dice5(),
      rollsLeft: 3,
      currentPlayerIndex: 0,
      turnsPlayed: 0,
      updatedAt: serverTimestamp(),
    }))
  })

  it('ei-host ei voi aloittaa peliä', async () => {
    await seed({})
    const env = await getTestEnv()
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(db, 'games', 'g1'), {
      phase: 'playing', dice: dice5(), rollsLeft: 3,
      currentPlayerIndex: 0, turnsPlayed: 0, updatedAt: serverTimestamp(),
    }))
  })

  it('currentPlayer voi heittää nopat', async () => {
    await seed({ phase: 'playing', dice: dice5(), rollsLeft: 3, currentPlayerIndex: 0 })
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(db, 'games', 'g1'), {
      dice: dice5().map(d => ({ value: 6, locked: false })),
      rollsLeft: 2,
      lastYatzy: false,
      lastBonus: false,
      updatedAt: serverTimestamp(),
    }))
  })

  it('toinen pelaaja ei voi heittää nopat', async () => {
    await seed({ phase: 'playing', dice: dice5(), rollsLeft: 3, currentPlayerIndex: 0 })
    const env = await getTestEnv()
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(db, 'games', 'g1'), {
      dice: dice5().map(d => ({ value: 6, locked: false })),
      rollsLeft: 2,
      lastYatzy: false,
      lastBonus: false,
      updatedAt: serverTimestamp(),
    }))
  })

  it('host voi merkitä pelaajan luovuttaneeksi', async () => {
    await seed({ phase: 'playing', dice: dice5(), rollsLeft: 3, currentPlayerIndex: 1 })
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(db, 'games', 'g1'), {
      players: [
        { uid: 'alice', name: 'Alice', scores: {}, conceded: false },
        { uid: 'bob', name: 'Bob', scores: { '0':0,'1':0,'2':0,'3':0,'4':0,'5':0,'6':0,'7':0,'8':0,'9':0,'10':0,'11':0,'12':0,'13':0,'14':0 }, conceded: true },
      ],
      currentPlayerIndex: 0,
      updatedAt: serverTimestamp(),
    }))
  })

  it('ei-host ei voi merkitä toista luovuttaneeksi', async () => {
    await seed({ phase: 'playing', dice: dice5(), rollsLeft: 3, currentPlayerIndex: 1 })
    const env = await getTestEnv()
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(db, 'games', 'g1'), {
      players: [
        { uid: 'alice', name: 'Alice', scores: { '0':0 }, conceded: true },
        { uid: 'bob', name: 'Bob', scores: {}, conceded: false },
      ],
      currentPlayerIndex: 0,
      updatedAt: serverTimestamp(),
    }))
  })

  it('high-score-bitin voi asettaa vain host pelin loputtua', async () => {
    await seed({ phase: 'finished', highScoresWritten: false })
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(db, 'games', 'g1'), {
      highScoresWritten: true,
      updatedAt: serverTimestamp(),
    }))
  })
})
