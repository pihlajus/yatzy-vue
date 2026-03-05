import { ref, onUnmounted } from 'vue'

const THRESHOLD = 15
const COOLDOWN_MS = 1000

export function useShake(onShake: () => void) {
  let lastShake = 0
  const supported = typeof DeviceMotionEvent !== 'undefined'
  const permissionGranted = ref(false)

  function handleMotion(e: DeviceMotionEvent) {
    const acc = e.accelerationIncludingGravity
    if (!acc) return
    const total = Math.sqrt(
      (acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2,
    )
    if (total - 9.8 > THRESHOLD && Date.now() - lastShake > COOLDOWN_MS) {
      lastShake = Date.now()
      onShake()
    }
  }

  function startListening() {
    permissionGranted.value = true
    window.addEventListener('devicemotion', handleMotion)
  }

  async function requestPermission(): Promise<boolean> {
    if (!supported) return false
    const DME = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>
    }
    if (DME.requestPermission) {
      try {
        const result = await DME.requestPermission()
        if (result === 'granted') {
          startListening()
          return true
        }
        return false
      } catch {
        return false
      }
    }
    startListening()
    return true
  }

  onUnmounted(() => {
    window.removeEventListener('devicemotion', handleMotion)
  })

  return { supported, permissionGranted, requestPermission }
}
