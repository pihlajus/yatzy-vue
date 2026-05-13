import { useAppModeStore } from '../stores/appMode'
import { useGameStore } from '../stores/game'
import { useOnlineGameStore } from '../stores/onlineGame'

export function useActiveGame() {
  const appMode = useAppModeStore()
  if (appMode.mode === 'online') return useOnlineGameStore()
  return useGameStore()
}
