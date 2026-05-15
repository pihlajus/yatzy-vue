<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useActiveGame } from '../composables/useActiveGame'
import { useSound } from '../composables/useSound'
import { useSettings } from '../composables/useSettings'
import { useShake } from '../composables/useShake'
import Die from './Die.vue'

const game = useActiveGame()
const { playRoll } = useSound()
const { soundEnabled } = useSettings()
const rolling = ref(false)
const exploding = ref(false)
const explosionVideo = ref<HTMLVideoElement | null>(null)
const BASE = import.meta.env.BASE_URL
const explosionWebm = `${BASE}videos/explosion.webm`
const explosionMp4 = `${BASE}videos/explosion.mp4`

watch(() => game.lastYatzy, (isYatzy) => {
  if (isYatzy) {
    // Wait for dice animation (900ms) to finish before exploding
    setTimeout(() => {
      exploding.value = true
      const vid = explosionVideo.value
      if (vid) {
        vid.currentTime = 0
        vid.muted = !soundEnabled.value
        vid.play().catch(() => {})
      }
      setTimeout(() => { exploding.value = false }, 2500)
    }, 1000)
  }
})
const shakePermissionNeeded = ref(false)

const canRoll = computed(() => game.rollsLeft > 0 && !game.isGameOver && game.canInteract)

async function roll() {
  if (rolling.value) return
  if (!game.canInteract) return
  playRoll()
  // Await so the online roll's Firestore write applies and the store's dice
  // values update before rolling=true triggers Die to snapshot props.value.
  // Hot-seat's roll() is sync; awaiting a non-Promise resolves immediately.
  await game.roll()
  rolling.value = true
  setTimeout(() => { rolling.value = false }, 1100)
}

const {
  supported: shakeSupported,
  permissionGranted: shakeGranted,
  requestPermission: requestShakePermission,
} = useShake(() => {
  if (canRoll.value && !rolling.value) roll()
})

onMounted(() => {
  if (shakeSupported) {
    if (shakeGranted.value) {
      // Already granted from a previous mount — just re-attach listener
      requestShakePermission()
    } else {
      const DME = DeviceMotionEvent as unknown as {
        requestPermission?: () => Promise<string>
      }
      if (DME.requestPermission) {
        shakePermissionNeeded.value = true
      } else {
        requestShakePermission()
      }
    }
  }
})

async function grantShake() {
  const ok = await requestShakePermission()
  if (ok) shakePermissionNeeded.value = false
}
</script>

<template>
  <div class="relative flex flex-col items-center gap-4">
    <!-- Yatzy explosion video -->
    <video
      ref="explosionVideo"
      class="explosion-video"
      :class="{ 'explosion-visible': exploding }"
      playsinline
      preload="auto"
      aria-hidden="true"
      @ended="exploding = false"
    >
      <source :src="explosionWebm" type="video/webm">
      <source :src="explosionMp4" type="video/mp4">
    </video>

    <div class="flex gap-3" :class="{ 'yatzy-bounce': exploding }">
      <Die
        v-for="(die, i) in game.dice"
        :key="i"
        :value="die.value"
        :locked="die.locked"
        :rolling="rolling"
        :drop-index="i"
        :can-toggle="game.canInteract && game.hasRolled && game.rollsLeft > 0"
        @toggle="game.toggleLock(i)"
      />
    </div>

    <div class="flex items-center gap-4">
      <button
        class="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg text-lg
               hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed
               transition-colors"
        :disabled="!canRoll || rolling"
        @click="roll()"
      >
        Heitä {{ game.hasRolled ? `(${game.rollsLeft})` : '' }}
      </button>
    </div>

    <button
      v-if="shakePermissionNeeded"
      class="text-xs text-blue-500 underline"
      @click="grantShake"
    >
      Salli ravistus
    </button>

    <p v-if="game.hasRolled && game.rollsLeft > 0" class="text-sm text-slate-500 dark:text-slate-400">
      Klikkaa noppaa lukitaksesi
    </p>
    <p v-if="game.hasRolled && game.rollsLeft === 0" class="text-sm text-slate-500 dark:text-slate-400">
      Valitse kategoria tuloskortista
    </p>
    <p
      v-if="game.players.length > 1 && game.currentPlayer"
      class="text-xs text-slate-400 dark:text-slate-500 mt-1"
    >
      {{ game.currentPlayer.name }}
    </p>
  </div>
</template>

<style scoped>
.explosion-video {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 350px;
  height: 350px;
  object-fit: cover;
  pointer-events: none;
  z-index: 10;
  opacity: 0;
}

.explosion-visible {
  opacity: 1;
}

.yatzy-bounce {
  animation: bounce 0.6s ease-out;
}

@keyframes bounce {
  0% { transform: scale(1); }
  20% { transform: scale(1.2); }
  40% { transform: scale(0.92); }
  60% { transform: scale(1.08); }
  80% { transform: scale(0.97); }
  100% { transform: scale(1); }
}
</style>

