<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGameStore } from './stores/game'
import PlayerSetup from './components/PlayerSetup.vue'
import DiceArea from './components/DiceArea.vue'
import Scorecard from './components/Scorecard.vue'
import HighScores from './components/HighScores.vue'
import { savePlayerScores } from './firebase'

const game = useGameStore()
const scoresSaved = ref(false)

watch(() => game.phase, async (phase) => {
  if (phase === 'finished') {
    scoresSaved.value = false
    try {
      await savePlayerScores(
        game.players.map((p) => ({ name: p.name, score: game.totalScore(p) })),
      )
    } catch (e) {
      console.error('Failed to save scores:', e)
    }
    scoresSaved.value = true
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 py-6 px-4">
    <div class="max-w-lg mx-auto" :class="{ 'max-w-2xl': game.players.length > 2 }">
      <header class="text-center mb-6">
        <h1 class="text-3xl font-bold text-slate-800">Yatzy</h1>
      </header>

      <!-- Setup phase -->
      <template v-if="game.phase === 'setup'">
        <PlayerSetup @start="game.startGame($event)" />
        <div class="mt-6">
          <HighScores />
        </div>
      </template>

      <!-- Playing phase -->
      <template v-if="game.phase === 'playing'">
        <p class="text-center text-slate-500 text-sm mb-1">
          Kierros {{ Math.min(game.currentRound, 15) }} / 15
        </p>
        <p
          v-if="game.players.length > 1"
          class="text-center text-blue-600 font-semibold mb-4"
        >
          {{ game.currentPlayer?.name }}n vuoro
        </p>

        <section class="mb-8">
          <DiceArea />
        </section>

        <section class="flex justify-center">
          <Scorecard />
        </section>
      </template>

      <!-- Finished phase -->
      <div v-if="game.phase === 'finished'" class="text-center">
        <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p v-if="game.players.length === 1" class="text-xl font-bold text-green-800">
            Peli ohi! Pisteet: {{ game.totalScore(game.players[0]!) }}
          </p>
          <template v-else>
            <p class="text-xl font-bold text-green-800 mb-3">
              {{ game.winner?.name }} voittaa pistein {{ game.totalScore(game.winner!) }}!
            </p>
            <div class="space-y-1 text-sm text-slate-600">
              <p v-for="player in game.players" :key="player.name">
                {{ player.name }}: {{ game.totalScore(player) }}
              </p>
            </div>
          </template>
        </div>

        <!-- Show final scorecard -->
        <section class="flex justify-center mb-6">
          <Scorecard />
        </section>

        <div class="mb-6">
          <p v-if="!scoresSaved" class="text-slate-500 text-sm">Tallennetaan...</p>
          <HighScores v-if="scoresSaved" />
        </div>

        <button
          class="px-6 py-3 bg-green-600 text-white font-bold rounded-lg text-lg
                 hover:bg-green-700 transition-colors"
          @click="game.newGame()"
        >
          Uusi peli
        </button>
      </div>
    </div>
  </div>
</template>
