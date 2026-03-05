import { ref } from 'vue'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export interface HighScore {
  id: string
  playerName: string
  score: number
}

export function useHighScores() {
  const scores = ref<HighScore[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function loadTopScores() {
    isLoading.value = true
    error.value = null
    try {
      const q = query(collection(db, 'highscores'), orderBy('score', 'desc'), limit(10))
      const snapshot = await getDocs(q)
      scores.value = snapshot.docs.map((doc) => {
        const data = doc.data()
        return { id: doc.id, playerName: data.playerName as string, score: data.score as number }
      })
    } catch (e) {
      error.value = 'Tulosten lataus epäonnistui'
      console.error('High scores load failed:', e)
    } finally {
      isLoading.value = false
    }
  }

  function hasId(docId: string): boolean {
    return scores.value.some((s) => s.id === docId)
  }

  function isNumberOne(docId: string): boolean {
    const first = scores.value[0]
    return !!first && first.id === docId
  }

  return { scores, isLoading, error, loadTopScores, hasId, isNumberOne }
}
