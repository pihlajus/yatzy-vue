import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getTestEnv } from './_helpers'

describe('rules: highscores (regression)', () => {
  beforeAll(async () => { await getTestEnv() })
  afterAll(async () => { const env = await getTestEnv(); await env.cleanup() })
  beforeEach(async () => { const env = await getTestEnv(); await env.clearFirestore() })

  it('luonti onnistuu validilla datalla', async () => {
    const env = await getTestEnv()
    const db = env.unauthenticatedContext().firestore()
    await assertSucceeds(addDoc(collection(db, 'highscores'), {
      playerName: 'Pekka', score: 200, createdAt: serverTimestamp(),
    }))
  })

  it('luonti epäonnistuu jos score > 374', async () => {
    const env = await getTestEnv()
    const db = env.unauthenticatedContext().firestore()
    await assertFails(addDoc(collection(db, 'highscores'), {
      playerName: 'Pekka', score: 999, createdAt: serverTimestamp(),
    }))
  })
})
