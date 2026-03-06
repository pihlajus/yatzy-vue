<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useGameStore } from './stores/game'
import PlayerSetup from './components/PlayerSetup.vue'
import DiceArea from './components/DiceArea.vue'
import Scorecard from './components/Scorecard.vue'
import HighScores from './components/HighScores.vue'
import { savePlayerScores } from './firebase'
import { useHighScores } from './composables/useHighScores'
import { useSettings } from './composables/useSettings'

const game = useGameStore()
const scoresSaved = ref(false)
const scoreQueued = ref(false)
const celebrating = ref(false)
const isTop1 = ref(false)
const savedDocIds = ref<string[]>([])
const { loadTopScores, hasId, isNumberOne } = useHighScores()
const { soundEnabled, probabilitiesEnabled, darkMode, toggleSound, toggleProbabilities, toggleDarkMode } = useSettings()

const screenShake = ref(false)
const confirmAction = ref<'restart' | 'newGame' | 'quit' | null>(null)

function confirmAndRun(action: 'restart' | 'newGame' | 'quit') {
  if (confirmAction.value === action) {
    confirmAction.value = null
    if (action === 'restart') game.restartGame()
    else game.newGame()
  } else {
    confirmAction.value = action
  }
}

function cancelConfirm() {
  confirmAction.value = null
}

function onScoresFlushed() {
  loadTopScores()
  scoreQueued.value = false
}
onMounted(() => window.addEventListener('scores-flushed', onScoresFlushed))
onUnmounted(() => window.removeEventListener('scores-flushed', onScoresFlushed))

watch(() => game.lastYatzy, (isYatzy) => {
  if (isYatzy) {
    setTimeout(() => {
      screenShake.value = true
      setTimeout(() => { screenShake.value = false }, 500)
    }, 1000)
  }
})

watch(() => game.phase, async (phase) => {
  if (phase === 'finished') {
    scoresSaved.value = false
    scoreQueued.value = false
    celebrating.value = false
    isTop1.value = false
    savedDocIds.value = []

    savedDocIds.value = await savePlayerScores(
      game.players.map((p) => ({ name: p.name, score: game.totalScore(p) })),
    )

    if (savedDocIds.value.length === 0) {
      scoreQueued.value = true
      scoresSaved.value = true
      return
    }

    await loadTopScores()
    scoresSaved.value = true

    const top10Ids = savedDocIds.value.filter(hasId)
    if (top10Ids.length > 0) {
      celebrating.value = true
      isTop1.value = top10Ids.some(isNumberOne)
    }
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 py-6 px-4 transition-colors" :class="{ 'screen-shake': screenShake }">
    <div class="max-w-lg mx-auto" :class="{ 'max-w-2xl': game.players.length > 2 }">
      <header class="text-center mb-6">
        <h1 class="text-3xl font-bold text-slate-800 dark:text-slate-100">Yatzy</h1>
        <div class="flex justify-center gap-2 mt-1">
          <button
            class="p-1.5 rounded-full transition-colors"
            :class="soundEnabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'"
            :title="soundEnabled ? 'Äänet päällä' : 'Äänet pois'"
            @click="toggleSound"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path v-if="soundEnabled" d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <line v-if="!soundEnabled" x1="23" y1="9" x2="17" y2="15" />
              <line v-if="!soundEnabled" x1="17" y1="9" x2="23" y2="15" />
            </svg>
          </button>
          <button
            class="p-1.5 rounded-full transition-colors text-xs font-bold w-8 h-8 flex items-center justify-center"
            :class="probabilitiesEnabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'"
            :title="probabilitiesEnabled ? 'Todennäköisyydet päällä' : 'Todennäköisyydet pois'"
            @click="toggleProbabilities"
          >%</button>
          <button
            class="p-1.5 rounded-full transition-colors"
            :class="darkMode ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'"
            :title="darkMode ? 'Tumma teema' : 'Vaalea teema'"
            @click="toggleDarkMode"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path v-if="darkMode" d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z" />
              <circle v-else cx="12" cy="12" r="5" />
              <line v-if="!darkMode" x1="12" y1="1" x2="12" y2="3" />
              <line v-if="!darkMode" x1="12" y1="21" x2="12" y2="23" />
              <line v-if="!darkMode" x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line v-if="!darkMode" x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line v-if="!darkMode" x1="1" y1="12" x2="3" y2="12" />
              <line v-if="!darkMode" x1="21" y1="12" x2="23" y2="12" />
              <line v-if="!darkMode" x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line v-if="!darkMode" x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </button>
        </div>
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
        <p class="text-center text-slate-500 dark:text-slate-400 text-sm mb-1">
          Kierros {{ Math.min(game.currentRound, 15) }} / 15
        </p>
        <p
          v-if="game.players.length > 1"
          class="text-center text-blue-600 dark:text-blue-400 font-semibold mb-4"
        >
          {{ game.currentPlayer?.name }}n vuoro
        </p>

        <section class="mb-8">
          <DiceArea />
        </section>

        <section class="flex justify-center">
          <Scorecard />
        </section>

        <div class="flex gap-2 mt-3">
          <button
            v-if="game.canUndo"
            class="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm
                   hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            @click="game.undoLastCategory()"
          >
            Kumoa viimeinen valinta
          </button>
          <button
            class="px-4 py-2 rounded-lg text-sm transition-colors"
            :class="confirmAction === 'quit'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'"
            @click="confirmAndRun('quit')"
            @blur="cancelConfirm"
          >
            {{ confirmAction === 'quit' ? 'Oletko varma?' : 'Lopeta peli' }}
          </button>
        </div>
      </template>

      <!-- Finished phase -->
      <div v-if="game.phase === 'finished'" class="text-center relative">
        <!-- Confetti overlay -->
        <div v-if="celebrating" class="confetti-container" aria-hidden="true">
          <div v-for="i in (isTop1 ? 80 : 50)" :key="i" class="confetti" :style="{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${2 + Math.random() * 3}s`,
            backgroundColor: isTop1
              ? ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fef3c7', '#ffffff'][i % 6]
              : ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'][i % 6],
          }" />
        </div>

        <!-- Star burst for #1 -->
        <div v-if="isTop1" class="star-burst" aria-hidden="true">
          <div v-for="i in 12" :key="i" class="star-ray" :style="{
            transform: `rotate(${i * 30}deg)`,
          }" />
        </div>

        <div class="mb-6 p-4 rounded-lg" :class="isTop1
          ? 'bg-amber-50 border-2 border-amber-400 shadow-lg shadow-amber-200/50 top1-glow'
          : 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700'"
        >
          <p v-if="isTop1" class="text-3xl font-black mb-2 top1-text">
            UUSI ENNÄTYS!
          </p>
          <p v-else-if="celebrating" class="text-2xl font-bold text-amber-600 mb-2 celebrate-text">
            TOP 10!
          </p>
          <p v-if="game.players.length === 1" class="text-xl font-bold text-green-800 dark:text-green-300">
            Peli ohi! Pisteet: {{ game.totalScore(game.players[0]!) }}
          </p>
          <template v-else>
            <p class="text-xl font-bold text-green-800 dark:text-green-300 mb-3">
              {{ game.winner?.name }} voittaa pistein {{ game.totalScore(game.winner!) }}!
            </p>
            <div class="space-y-1 text-sm text-slate-600 dark:text-slate-300">
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
          <p v-if="!scoresSaved" class="text-slate-500 dark:text-slate-400 text-sm">Tallennetaan...</p>
          <p v-else-if="scoreQueued" class="text-amber-600 dark:text-amber-400 text-sm">
            Ei verkkoyhteyttä -- pisteet lähetetään kun yhteys palaa
          </p>
          <HighScores v-if="scoresSaved && !scoreQueued" :highlight-ids="savedDocIds" />
        </div>

        <div class="flex gap-3 justify-center">
          <button
            class="px-6 py-3 font-bold rounded-lg text-lg transition-colors"
            :class="confirmAction === 'restart'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600'"
            @click="confirmAndRun('restart')"
            @blur="cancelConfirm"
          >
            {{ confirmAction === 'restart' ? 'Oletko varma?' : 'Pelaa uudelleen' }}
          </button>
          <button
            class="px-6 py-3 font-bold rounded-lg text-lg transition-colors"
            :class="confirmAction === 'newGame'
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'"
            @click="confirmAndRun('newGame')"
            @blur="cancelConfirm"
          >
            {{ confirmAction === 'newGame' ? 'Oletko varma?' : 'Vaihda pelaajia' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confetti-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 50;
  overflow: hidden;
}

.confetti {
  position: absolute;
  top: -10px;
  width: 10px;
  height: 10px;
  opacity: 0;
  animation: confetti-fall linear forwards;
}

.confetti:nth-child(odd) {
  border-radius: 50%;
}

.confetti:nth-child(3n) {
  width: 8px;
  height: 14px;
}

@keyframes confetti-fall {
  0% {
    transform: translateY(0) rotate(0deg) scale(1);
    opacity: 1;
  }
  75% {
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg) scale(0.5);
    opacity: 0;
  }
}

.celebrate-text {
  animation: celebrate-pulse 1s ease-in-out 3;
}

@keyframes celebrate-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

/* #1 special celebration */
.top1-text {
  background: linear-gradient(135deg, #d97706, #fbbf24, #f59e0b, #fcd34d, #d97706);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: top1-shimmer 2s ease-in-out infinite, celebrate-pulse 1s ease-in-out 3;
}

@keyframes top1-shimmer {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.top1-glow {
  animation: glow-pulse 2s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% {
    box-shadow: 0 0 15px rgba(251, 191, 36, 0.3), 0 0 30px rgba(251, 191, 36, 0.1);
  }
  50% {
    box-shadow: 0 0 25px rgba(251, 191, 36, 0.5), 0 0 50px rgba(251, 191, 36, 0.2);
  }
}

.star-burst {
  position: absolute;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  z-index: 0;
  animation: star-spin 8s linear infinite;
}

.star-ray {
  position: absolute;
  top: -120px;
  left: -2px;
  width: 4px;
  height: 240px;
  background: linear-gradient(
    to bottom,
    transparent,
    rgba(251, 191, 36, 0.15),
    rgba(251, 191, 36, 0.3),
    rgba(251, 191, 36, 0.15),
    transparent
  );
  transform-origin: center center;
}

@keyframes star-spin {
  from { transform: translateX(-50%) rotate(0deg); }
  to { transform: translateX(-50%) rotate(360deg); }
}

.screen-shake {
  animation: shake 0.5s ease-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10% { transform: translateX(-4px) rotate(-0.5deg); }
  30% { transform: translateX(4px) rotate(0.5deg); }
  50% { transform: translateX(-3px); }
  70% { transform: translateX(3px); }
  90% { transform: translateX(-1px); }
}
</style>
