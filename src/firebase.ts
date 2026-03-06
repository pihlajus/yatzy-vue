import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
})

export const db = getFirestore(app)

const QUEUE_KEY = 'yatzy_score_queue'

interface QueuedScore {
  players: { name: string; score: number }[]
}

export function getPendingScores(): QueuedScore[] {
  const raw = localStorage.getItem(QUEUE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as QueuedScore[]
  } catch {
    return []
  }
}

export function queueScores(players: { name: string; score: number }[]) {
  const pending = getPendingScores()
  pending.push({ players })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(pending))
}

export function clearPendingScores() {
  localStorage.removeItem(QUEUE_KEY)
}

export async function savePlayerScores(players: { name: string; score: number }[]): Promise<string[]> {
  try {
    const col = collection(db, 'highscores')
    const refs = await Promise.all(
      players.map((p) =>
        addDoc(col, {
          playerName: p.name,
          score: p.score,
          createdAt: serverTimestamp(),
        }),
      ),
    )
    return refs.map((r) => r.id)
  } catch {
    queueScores(players)
    return []
  }
}

export async function flushScoreQueue(): Promise<void> {
  const pending = getPendingScores()
  if (pending.length === 0) return

  const failed: QueuedScore[] = []
  for (const entry of pending) {
    try {
      const col = collection(db, 'highscores')
      await Promise.all(
        entry.players.map((p) =>
          addDoc(col, {
            playerName: p.name,
            score: p.score,
            createdAt: serverTimestamp(),
          }),
        ),
      )
    } catch {
      failed.push(entry)
    }
  }

  if (failed.length > 0) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(failed))
  } else {
    clearPendingScores()
  }
}
