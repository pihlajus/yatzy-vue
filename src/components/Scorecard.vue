<script setup lang="ts">
import { computed } from 'vue'
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
  <div class="w-full overflow-x-auto">
    <table class="w-full text-sm">
      <!-- Upper section header -->
      <thead>
        <tr class="border-b-2 border-slate-300">
          <th class="text-left py-1 font-semibold text-slate-600">Yläosa</th>
          <th
            v-for="player in game.players"
            :key="player.name"
            class="text-right py-1 w-16 font-semibold text-xs truncate max-w-[4rem]"
            :class="isActive(player)
              ? 'text-blue-600 bg-blue-50'
              : 'text-slate-600'"
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
          class="border-b border-slate-100"
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
              isActive(player) ? 'bg-blue-50' : '',
              isSelectable(cat, player) ? 'cursor-pointer hover:bg-blue-100' : '',
            ]"
            @click="isSelectable(cat, player) && select(cat)"
          >
            {{ displayScore(cat, player) }}
          </td>
        </tr>

        <!-- Upper sum -->
        <tr class="border-b-2 border-slate-300 bg-slate-100 font-semibold">
          <td class="py-1.5 pl-2">Välisumma</td>
          <td
            v-for="player in game.players"
            :key="player.name"
            class="py-1.5 pr-2 text-right font-mono"
            :class="isActive(player) ? 'bg-blue-50' : ''"
          >
            {{ game.upperSum(player) }}
          </td>
        </tr>

        <!-- Bonus -->
        <tr class="border-b-2 border-slate-300 bg-slate-100 font-semibold">
          <td class="py-1.5 pl-2">
            Bonus
            <template v-if="game.players.length === 1 && game.upperBonus(game.players[0]!) === 0">
              (tavoite 63)
            </template>
          </td>
          <td
            v-for="player in game.players"
            :key="player.name"
            class="py-1.5 pr-2 text-right font-mono"
            :class="isActive(player) ? 'bg-blue-50' : ''"
          >
            {{ game.upperBonus(player) }}
          </td>
        </tr>
      </tbody>

      <!-- Lower section header -->
      <thead>
        <tr class="border-b-2 border-slate-300">
          <th class="text-left py-1 pt-3 font-semibold text-slate-600">Alaosa</th>
          <th
            v-for="player in game.players"
            :key="player.name"
            class="text-right py-1 pt-3 w-16 font-semibold text-xs"
            :class="isActive(player)
              ? 'text-blue-600 bg-blue-50'
              : 'text-slate-600'"
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
          class="border-b border-slate-100"
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
              isActive(player) ? 'bg-blue-50' : '',
              isSelectable(cat, player) ? 'cursor-pointer hover:bg-blue-100' : '',
            ]"
            @click="isSelectable(cat, player) && select(cat)"
          >
            {{ displayScore(cat, player) }}
          </td>
        </tr>
      </tbody>

      <!-- Total -->
      <tfoot>
        <tr class="border-t-2 border-slate-400 bg-slate-200 font-bold text-lg">
          <td class="py-2 pl-2">Yhteensä</td>
          <td
            v-for="player in game.players"
            :key="player.name"
            class="py-2 pr-2 text-right font-mono"
            :class="isActive(player) ? 'bg-blue-100' : ''"
          >
            {{ game.totalScore(player) }}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
