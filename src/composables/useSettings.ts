import { ref } from 'vue'

function loadBool(key: string, fallback: boolean): boolean {
  const val = localStorage.getItem(key)
  return val !== null ? val === 'true' : fallback
}

function saveBool(key: string, value: boolean): void {
  localStorage.setItem(key, String(value))
}

const soundEnabled = ref(false)
const probabilitiesEnabled = ref(false)

export function useSettings() {
  soundEnabled.value = loadBool('yatzy-sound', false)
  probabilitiesEnabled.value = loadBool('yatzy-probabilities', false)

  function toggleSound() {
    soundEnabled.value = !soundEnabled.value
    saveBool('yatzy-sound', soundEnabled.value)
  }

  function toggleProbabilities() {
    probabilitiesEnabled.value = !probabilitiesEnabled.value
    saveBool('yatzy-probabilities', probabilitiesEnabled.value)
  }

  return { soundEnabled, probabilitiesEnabled, toggleSound, toggleProbabilities }
}
