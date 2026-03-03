import { ref } from 'vue'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

interface HighScore {
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
        return { playerName: data.playerName as string, score: data.score as number }
      })
    } catch (e) {
      error.value = 'Tulosten lataus epäonnistui'
      console.error('High scores load failed:', e)
    } finally {
      isLoading.value = false
    }
  }

  return { scores, isLoading, error, loadTopScores }
}
