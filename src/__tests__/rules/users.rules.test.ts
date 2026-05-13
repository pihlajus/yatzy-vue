import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getTestEnv } from './_helpers'

describe('rules: users', () => {
  beforeAll(async () => { await getTestEnv() })
  afterAll(async () => { const env = await getTestEnv(); await env.cleanup() })
  beforeEach(async () => { const env = await getTestEnv(); await env.clearFirestore() })

  it('käyttäjä voi kirjoittaa oman profiilinsa', async () => {
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(db, 'users', 'alice'), {
      name: 'Alice', updatedAt: serverTimestamp(),
    }))
  })

  it('käyttäjä ei voi kirjoittaa toisen profiilia', async () => {
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(db, 'users', 'bob'), {
      name: 'Bob', updatedAt: serverTimestamp(),
    }))
  })

  it('liian pitkä nimi torjutaan', async () => {
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(db, 'users', 'alice'), {
      name: 'X'.repeat(21), updatedAt: serverTimestamp(),
    }))
  })
})
