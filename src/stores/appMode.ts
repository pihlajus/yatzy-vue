import { defineStore } from 'pinia'
import { ref } from 'vue'

export type AppMode = 'hotseat' | 'online'

export const useAppModeStore = defineStore('appMode', () => {
  const mode = ref<AppMode>('hotseat')
  function setMode(m: AppMode) { mode.value = m }
  return { mode, setMode }
})
