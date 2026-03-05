import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
})

export const db = getFirestore(app)

export async function savePlayerScores(players: { name: string; score: number }[]): Promise<string[]> {
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
}
