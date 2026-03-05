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
const shakePermissionNeeded = ref(false)

watch(() => game.lastYatzy, (isYatzy) => {
  if (isYatzy) {
    exploding.value = true
    playBoom()
    setTimeout(() => { exploding.value = false }, 1500)
  }
})

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

    <div v-if="exploding" class="yatzy-explosion" aria-hidden="true">
      <div class="shockwave" />
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
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.shockwave {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 4px solid #ef4444;
  animation: shockwave-expand 1.5s ease-out forwards;
}

@keyframes shockwave-expand {
  0% {
    width: 20px;
    height: 20px;
    opacity: 1;
    border-width: 4px;
    border-color: #ef4444;
  }
  50% {
    border-color: #f97316;
  }
  100% {
    width: 300px;
    height: 300px;
    opacity: 0;
    border-width: 1px;
    border-color: #fbbf24;
  }
}

.yatzy-bounce {
  animation: dice-bounce 0.6s ease-out;
}

@keyframes dice-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-20px) scale(1.1); }
  60% { transform: translateY(5px) scale(0.95); }
}
</style>
