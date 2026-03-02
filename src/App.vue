<script setup lang="ts">
import { useGameStore } from './stores/game'
import DiceArea from './components/DiceArea.vue'
import Scorecard from './components/Scorecard.vue'

const game = useGameStore()
</script>

<template>
  <div class="min-h-screen bg-slate-50 py-6 px-4">
    <div class="max-w-lg mx-auto">
      <header class="text-center mb-6">
        <h1 class="text-3xl font-bold text-slate-800">Yatzy</h1>
        <p class="text-slate-500 text-sm mt-1">
          Vuoro {{ Math.min(game.currentRound, 15) }} / 15
        </p>
      </header>

      <!-- Game over -->
      <div
        v-if="game.isGameOver"
        class="text-center mb-6 p-4 bg-green-50 border border-green-200 rounded-lg"
      >
        <p class="text-xl font-bold text-green-800">
          Peli ohi! Pisteet: {{ game.totalScore }}
        </p>
        <button
          class="mt-3 px-5 py-2 bg-green-600 text-white font-semibold rounded-lg
                 hover:bg-green-700 transition-colors"
          @click="game.newGame()"
        >
          Uusi peli
        </button>
      </div>

      <!-- Dice -->
      <section class="mb-8">
        <DiceArea />
      </section>

      <!-- Scorecard -->
      <section class="flex justify-center">
        <Scorecard />
      </section>
    </div>
  </div>
</template>
