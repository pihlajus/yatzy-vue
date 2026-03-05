<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '../stores/game'
import { useSound } from '../composables/useSound'
import { useShake } from '../composables/useShake'
import Die from './Die.vue'

const game = useGameStore()
const { playRoll } = useSound()
const rolling = ref(false)
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
  <div class="flex flex-col items-center gap-4">
    <div class="flex gap-3">
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
