import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, ensureSignedIn } from '../firebase'

const STORAGE_KEY = 'yatzy_player_name'

export const useProfileStore = defineStore('profile', () => {
  const uid = ref<string | null>(null)
  const displayName = ref<string | null>(null)
  const initError = ref<string | null>(null)
  let initPromise: Promise<void> | null = null

  const isReady = computed(() => uid.value !== null)

  async function init(): Promise<void> {
    if (initPromise) return initPromise
    initPromise = (async () => {
      try {
        const user = await ensureSignedIn()
        uid.value = user.uid
        const local = localStorage.getItem(STORAGE_KEY)
        if (local) {
          displayName.value = local
        } else {
          try {
            const snap = await getDoc(doc(db, 'users', user.uid))
            if (snap.exists()) {
              const data = snap.data() as { name?: string }
              if (data.name) {
                displayName.value = data.name
                localStorage.setItem(STORAGE_KEY, data.name)
              }
            }
          } catch {
            // localStorage is authoritative; Firestore fallback is best-effort
          }
        }
      } catch (err) {
        initError.value = err instanceof Error ? err.message : 'Tuntematon virhe'
        throw err
      }
    })()
    return initPromise
  }

  async function setDisplayName(name: string): Promise<void> {
    const trimmed = name.trim().slice(0, 20)
    if (!trimmed) throw new Error('Nimi ei voi olla tyhjä')
    if (!uid.value) throw new Error('Ei sisäänkirjautunut')
    displayName.value = trimmed
    localStorage.setItem(STORAGE_KEY, trimmed)
    try {
      await setDoc(doc(db, 'users', uid.value), {
        name: trimmed,
        updatedAt: serverTimestamp(),
      })
    } catch {
      // localStorage is authoritative; Firestore write is best-effort
    }
  }

  return { uid, displayName, isReady, initError, init, setDisplayName }
})
