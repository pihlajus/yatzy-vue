<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/game'
import { useSound } from '../composables/useSound'
import Die from './Die.vue'

const game = useGameStore()
const { playRoll } = useSound()
const rolling = ref(false)

function roll() {
  game.roll()
  playRoll()
  rolling.value = true
  setTimeout(() => { rolling.value = false }, 900)
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
