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
const darkMode = ref(false)

function applyDarkMode(enabled: boolean) {
  document.documentElement.classList.toggle('dark', enabled)
}

export function useSettings() {
  soundEnabled.value = loadBool('yatzy-sound', false)
  probabilitiesEnabled.value = loadBool('yatzy-probabilities', false)
  darkMode.value = loadBool('yatzy-dark', false)
  applyDarkMode(darkMode.value)

  function toggleSound() {
    soundEnabled.value = !soundEnabled.value
    saveBool('yatzy-sound', soundEnabled.value)
  }

  function toggleProbabilities() {
    probabilitiesEnabled.value = !probabilitiesEnabled.value
    saveBool('yatzy-probabilities', probabilitiesEnabled.value)
  }

  function toggleDarkMode() {
    darkMode.value = !darkMode.value
    saveBool('yatzy-dark', darkMode.value)
    applyDarkMode(darkMode.value)
  }

  return { soundEnabled, probabilitiesEnabled, darkMode, toggleSound, toggleProbabilities, toggleDarkMode }
}
