import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getTestEnv } from './_helpers'

async function seedLobby(playerUids: string[]) {
  const env = await getTestEnv()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const adminDb = ctx.firestore()
    await setDoc(doc(adminDb, 'games', 'g1'), {
      code: 'K7M2',
      hostUid: playerUids[0],
      phase: 'lobby',
      players: playerUids.map(uid => ({ uid, name: uid, scores: {}, conceded: false })),
      dice: [], rollsLeft: 0, currentPlayerIndex: 0, turnsPlayed: 0,
      lastYatzy: false, lastBonus: false, winnerUid: null, highScoresWritten: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
  })
}

describe('rules: games join lobby', () => {
  beforeAll(async () => { await getTestEnv() })
  afterAll(async () => { const env = await getTestEnv(); await env.cleanup() })
  beforeEach(async () => { const env = await getTestEnv(); await env.clearFirestore() })

  it('uusi pelaaja voi liittyä lobbyyn', async () => {
    await seedLobby(['alice'])
    const env = await getTestEnv()
    const db = env.authenticatedContext('bob').firestore()
    await assertSucceeds(updateDoc(doc(db, 'games', 'g1'), {
      players: [
        { uid: 'alice', name: 'alice', scores: {}, conceded: false },
        { uid: 'bob', name: 'Bob', scores: {}, conceded: false },
      ],
      updatedAt: serverTimestamp(),
    }))
  })

  it('liittyminen ei saa muuttaa olemassa olevia pelaajia', async () => {
    await seedLobby(['alice'])
    const env = await getTestEnv()
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(db, 'games', 'g1'), {
      players: [
        { uid: 'alice', name: 'EVIL', scores: {}, conceded: false },
        { uid: 'bob', name: 'Bob', scores: {}, conceded: false },
      ],
      updatedAt: serverTimestamp(),
    }))
  })

  it('viides pelaaja ei voi liittyä', async () => {
    await seedLobby(['u1','u2','u3','u4'])
    const env = await getTestEnv()
    const db = env.authenticatedContext('u5').firestore()
    await assertFails(updateDoc(doc(db, 'games', 'g1'), {
      players: [
        { uid: 'u1', name: 'u1', scores: {}, conceded: false },
        { uid: 'u2', name: 'u2', scores: {}, conceded: false },
        { uid: 'u3', name: 'u3', scores: {}, conceded: false },
        { uid: 'u4', name: 'u4', scores: {}, conceded: false },
        { uid: 'u5', name: 'u5', scores: {}, conceded: false },
      ],
      updatedAt: serverTimestamp(),
    }))
  })

  it('uuden pelaajan uid pitää täsmätä authin uid:hen', async () => {
    await seedLobby(['alice'])
    const env = await getTestEnv()
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(db, 'games', 'g1'), {
      players: [
        { uid: 'alice', name: 'alice', scores: {}, conceded: false },
        { uid: 'mallory', name: 'Mallory', scores: {}, conceded: false },
      ],
      updatedAt: serverTimestamp(),
    }))
  })
})
