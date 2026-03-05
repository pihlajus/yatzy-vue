<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useGameStore } from '../stores/game'
import { useSound } from '../composables/useSound'
import { useShake } from '../composables/useShake'
import Die from './Die.vue'

const game = useGameStore()
const { playRoll, playBoom } = useSound()
const rolling = ref(false)
const exploding = ref(false)

watch(() => game.lastYatzy, (isYatzy) => {
  if (isYatzy) {
    // Wait for dice animation (900ms) to finish before exploding
    setTimeout(() => {
      exploding.value = true
      playBoom()
      setTimeout(() => { exploding.value = false }, 2000)
    }, 1000)
  }
})
const shakePermissionNeeded = ref(false)

const canRoll = computed(() => game.rollsLeft > 0 && !game.isGameOver)

function roll() {
  game.roll()
  playRoll()
  rolling.value = true
  setTimeout(() => { rolling.value = false }, 900)
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
    const DME = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<string>
    }
    if (DME.requestPermission) {
      shakePermissionNeeded.value = true
    } else {
      requestShakePermission()
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
    <!-- Yatzy explosion -->
    <div v-if="exploding" class="yatzy-explosion" aria-hidden="true">
      <div class="shockwave" />
      <div class="shockwave shockwave-delayed" />
      <div class="flash" />
    </div>

    <div class="flex gap-3" :class="{ 'yatzy-bounce': exploding }">
      <Die
        v-for="(die, i) in game.dice"
        :key="i"
        :value="die.value"
        :locked="die.locked"
        :rolling="rolling"
        :can-toggle="game.hasRolled && game.rollsLeft > 0"
        @toggle="game.toggleLock(i)"
      />
    </div>

    <div class="flex items-center gap-4">
      <button
        class="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg text-lg
               hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed
               transition-colors"
        :disabled="game.rollsLeft <= 0 || game.isGameOver"
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

    <p v-if="game.hasRolled && game.rollsLeft > 0" class="text-sm text-slate-500">
      Klikkaa noppaa lukitaksesi
    </p>
    <p v-if="game.hasRolled && game.rollsLeft === 0" class="text-sm text-slate-500">
      Valitse kategoria tuloskortista
    </p>
    <p
      v-if="game.players.length > 1 && game.currentPlayer"
      class="text-xs text-slate-400 mt-1"
    >
      {{ game.currentPlayer.name }}
    </p>
  </div>
</template>

<style scoped>
.yatzy-explosion {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shockwave {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 4px solid #ef4444;
  animation: shockwave-expand 1.8s ease-out forwards;
}

.shockwave-delayed {
  animation-delay: 0.2s;
  border-color: #f97316;
}

.flash {
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.6), transparent 70%);
  animation: flash-pulse 0.4s ease-out forwards;
}

@keyframes shockwave-expand {
  0% {
    width: 10px;
    height: 10px;
    opacity: 1;
    border-width: 4px;
    border-color: #ef4444;
  }
  40% {
    border-color: #f97316;
  }
  100% {
    width: 280px;
    height: 280px;
    opacity: 0;
    border-width: 1px;
    border-color: #fbbf24;
  }
}

@keyframes flash-pulse {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(3);
    opacity: 0;
  }
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

