import { ref, onUnmounted } from 'vue'

const THRESHOLD = 12
const COOLDOWN_MS = 1000

// Persist iOS motion permission across component remounts so users don't
// have to re-grant on every navigation.
let globalPermissionGranted = false

export function useShake(onShake: () => void) {
  let lastShake = 0
  const supported = typeof DeviceMotionEvent !== 'undefined'
  const permissionGranted = ref(globalPermissionGranted)

  function handleMotion(e: DeviceMotionEvent) {
    // Prefer acceleration (without gravity) if available
    const acc = e.acceleration?.x != null ? e.acceleration : e.accelerationIncludingGravity
    if (!acc) return
    const x = acc.x ?? 0
    const y = acc.y ?? 0
    const z = acc.z ?? 0
    const total = Math.sqrt(x * x + y * y + z * z)
    // If using accelerationIncludingGravity, subtract gravity baseline
    const effective = e.acceleration?.x != null ? total : Math.abs(total - 9.8)
    if (effective > THRESHOLD && Date.now() - lastShake > COOLDOWN_MS) {
      lastShake = Date.now()
      onShake()
    }
  }

  function startListening() {
    globalPermissionGranted = true
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
