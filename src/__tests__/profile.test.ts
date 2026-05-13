// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../firebase', () => ({
  ensureSignedIn: vi.fn().mockResolvedValue({ uid: 'mock-uid' }),
  db: {},
}))

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore')
  return {
    ...actual,
    doc: vi.fn(() => ({})),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
    setDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(() => ({})),
  }
})

import { useProfileStore } from '../stores/profile'

describe('profile store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('init kirjautuu sisään ja asettaa uid:n', async () => {
    const p = useProfileStore()
    await p.init()
    expect(p.uid).toBe('mock-uid')
    expect(p.isReady).toBe(true)
  })

  it('setDisplayName tallentaa nimen localStorageen', async () => {
    const p = useProfileStore()
    await p.init()
    await p.setDisplayName('Pekka')
    expect(p.displayName).toBe('Pekka')
    expect(localStorage.getItem('yatzy_player_name')).toBe('Pekka')
  })

  it('init lukee nimen localStoragesta jos siellä on', async () => {
    localStorage.setItem('yatzy_player_name', 'Liisa')
    const p = useProfileStore()
    await p.init()
    expect(p.displayName).toBe('Liisa')
  })
})
