<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { useSound } from '../composables/useSound'
import { useSettings } from '../composables/useSettings'
import { calcProbabilities } from '../probability'
import {
  Category,
  CATEGORY_NAMES,
  UPPER_CATEGORIES,
  LOWER_CATEGORIES,
  type Player,
} from '../types/game'

const game = useGameStore()
const { playClick } = useSound()
const { probabilitiesEnabled } = useSettings()

const bonusGlow = ref(false)

watch(() => game.lastBonus, (bonus) => {
  if (bonus) {
    bonusGlow.value = true
    setTimeout(() => { bonusGlow.value = false }, 2000)
  }
})

const probabilities = computed(() => {
  if (!probabilitiesEnabled.value || !game.hasRolled || game.rollsLeft === 0) {
    return new Map<Category, number>()
  }
  const locked = game.dice.filter((d) => d.locked).map((d) => d.value)
  const free = game.dice.filter((d) => !d.locked).map((d) => d.value)
  return calcProbabilities(free, locked, game.rollsLeft)
})

function probDisplay(cat: Category, player: Player): string {
  if (!isActive(player) || player.scores.has(cat)) return ''
  const p = probabilities.value.get(cat)
  if (p === undefined) return ''
  return `${Math.round(p * 100)}%`
}

function isActive(player: Player): boolean {
  return player === game.currentPlayer
}

function isSelectable(cat: Category, player: Player): boolean {
  return isActive(player) && game.hasRolled && !player.scores.has(cat) && !game.isGameOver
}

function displayScore(cat: Category, player: Player): string {
  if (player.scores.has(cat)) {
    return String(player.scores.get(cat))
  }
  if (isActive(player) && game.hasRolled && game.potentialScores.has(cat)) {
    return String(game.potentialScores.get(cat))
  }
  return ''
}

function select(cat: Category) {
  if (!game.currentPlayer || !isSelectable(cat, game.currentPlayer)) return
  playClick()
  game.selectCategory(cat)
}

function scoreClass(cat: Category, player: Player): string {
  if (player.scores.has(cat)) return 'font-semibold'
  if (isActive(player) && game.hasRolled && !player.scores.has(cat)) return 'text-slate-400 italic'
  return ''
}
</script>

<template>
  <div class="w-full overflow-x-auto text-slate-800 dark:text-slate-200">
    <table class="w-full text-sm">
      <!-- Upper section header -->
      <thead>
        <tr class="border-b-2 border-slate-300 dark:border-slate-600">
          <th class="text-left py-1 font-semibold text-slate-600 dark:text-slate-300">Yläosa</th>
          <th
            v-for="player in game.players"
            :key="player.name"
            class="text-right py-1 w-16 font-semibold text-xs truncate max-w-[4rem]"
            :class="isActive(player)
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
              : 'text-slate-600 dark:text-slate-300'"
          >
            {{ player.name }}
          </th>
        </tr>
      </thead>

      <!-- Upper section rows -->
      <tbody>
        <tr
          v-for="cat in UPPER_CATEGORIES"
          :key="cat"
          class="border-b border-slate-100 dark:border-slate-700"
        >
          <td class="py-1.5 pl-2">
            {{ CATEGORY_NAMES[cat] }}
            <span v-if="game.currentPlayer && probDisplay(cat, game.currentPlayer)" class="text-xs text-slate-400 ml-1">
              {{ probDisplay(cat, game.currentPlayer) }}
            </span>
          </td>
          <td
            v-for="player in game.players"
            :key="player.name"
            class="py-1.5 pr-2 text-right font-mono"
            :class="[
              scoreClass(cat, player),
              isActive(player) ? 'bg-blue-50 dark:bg-blue-900/30' : '',
              isSelectable(cat, player) ? 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50' : '',
            ]"
            @click="isSelectable(cat, player) && select(cat)"
          >
            {{ displayScore(cat, player) }}
          </td>
        </tr>

        <!-- Upper sum -->
        <tr class="border-b-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 font-semibold">
          <td class="py-1.5 pl-2">Välisumma</td>
          <td
            v-for="player in game.players"
            :key="player.name"
            class="py-1.5 pr-2 text-right font-mono"
            :class="isActive(player) ? 'bg-blue-50 dark:bg-blue-900/30' : ''"
          >
            {{ game.upperSum(player) }}
          </td>
        </tr>

        <!-- Bonus -->
        <tr class="border-b-2 border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 font-semibold" :class="{ 'bonus-glow': bonusGlow }">
          <td class="py-1.5 pl-2" :class="{ 'bonus-text': bonusGlow }">
            Bonus
            <span v-if="bonusGlow" class="bonus-badge">+50!</span>
            <template v-else-if="game.players.length === 1 && game.upperBonus(game.players[0]!) === 0">
              (tavoite 63)
            </template>
          </td>
          <td
            v-for="player in game.players"
            :key="player.name"
            class="py-1.5 pr-2 text-right font-mono"
            :class="[
              isActive(player) ? 'bg-blue-50 dark:bg-blue-900/30' : '',
              bonusGlow ? 'bonus-text' : '',
            ]"
          >
            {{ game.upperBonus(player) }}
          </td>
        </tr>
      </tbody>

      <!-- Lower section header -->
      <thead>
        <tr class="border-b-2 border-slate-300 dark:border-slate-600">
          <th class="text-left py-1 pt-3 font-semibold text-slate-600 dark:text-slate-300">Alaosa</th>
          <th
            v-for="player in game.players"
            :key="player.name"
            class="text-right py-1 pt-3 w-16 font-semibold text-xs"
            :class="isActive(player)
              ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
              : 'text-slate-600 dark:text-slate-300'"
          >
            {{ player.name }}
          </th>
        </tr>
      </thead>

      <!-- Lower section rows -->
      <tbody>
        <tr
          v-for="cat in LOWER_CATEGORIES"
          :key="cat"
          class="border-b border-slate-100 dark:border-slate-700"
        >
          <td class="py-1.5 pl-2">
            {{ CATEGORY_NAMES[cat] }}
            <span v-if="game.currentPlayer && probDisplay(cat, game.currentPlayer)" class="text-xs text-slate-400 ml-1">
              {{ probDisplay(cat, game.currentPlayer) }}
            </span>
          </td>
          <td
            v-for="player in game.players"
            :key="player.name"
            class="py-1.5 pr-2 text-right font-mono"
            :class="[
              scoreClass(cat, player),
              isActive(player) ? 'bg-blue-50 dark:bg-blue-900/30' : '',
              isSelectable(cat, player) ? 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50' : '',
            ]"
            @click="isSelectable(cat, player) && select(cat)"
          >
            {{ displayScore(cat, player) }}
          </td>
        </tr>
      </tbody>

      <!-- Total -->
      <tfoot>
        <tr class="border-t-2 border-slate-400 dark:border-slate-500 bg-slate-200 dark:bg-slate-700 font-bold text-lg">
          <td class="py-2 pl-2">Yhteensä</td>
          <td
            v-for="player in game.players"
            :key="player.name"
            class="py-2 pr-2 text-right font-mono"
            :class="isActive(player) ? 'bg-blue-100 dark:bg-blue-900/40' : ''"
          >
            {{ game.totalScore(player) }}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<style scoped>
.bonus-glow {
  animation: bonus-flash 0.6s ease-in-out 4;
  background-color: #fbbf24 !important;
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
}

@keyframes bonus-flash {
  0%, 100% {
    background-color: #fbbf24;
    box-shadow: 0 0 8px rgba(251, 191, 36, 0.4);
  }
  50% {
    background-color: #f59e0b;
    box-shadow: 0 0 30px rgba(245, 158, 11, 0.8), 0 0 60px rgba(251, 191, 36, 0.3);
  }
}

.bonus-text {
  color: #78350f !important;
  font-weight: 800 !important;
}

:is(.dark) .bonus-glow {
  background-color: #d97706 !important;
}

:is(.dark) .bonus-text {
  color: #fef3c7 !important;
}

@keyframes bonus-badge-pop {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); opacity: 1; }
}

.bonus-badge {
  display: inline-block;
  margin-left: 0.25rem;
  font-weight: 900;
  color: #d97706;
  animation: bonus-badge-pop 0.4s ease-out forwards, bonus-flash-text 0.6s ease-in-out 4;
}

:is(.dark) .bonus-badge {
  color: #fcd34d;
}

@keyframes bonus-flash-text {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
