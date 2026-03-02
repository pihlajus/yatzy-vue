<script setup lang="ts">
import { useGameStore } from '../stores/game'
import {
  Category,
  CATEGORY_NAMES,
  UPPER_CATEGORIES,
  LOWER_CATEGORIES,
} from '../types/game'

const game = useGameStore()

function isSelectable(cat: Category): boolean {
  return game.hasRolled && !game.scores.has(cat) && !game.isGameOver
}

function displayScore(cat: Category): string {
  if (game.scores.has(cat)) {
    return String(game.scores.get(cat))
  }
  if (game.hasRolled && game.potentialScores.has(cat)) {
    return String(game.potentialScores.get(cat))
  }
  return ''
}
</script>

<template>
  <div class="w-full max-w-sm">
    <table class="w-full text-sm">
      <!-- Upper section -->
      <thead>
        <tr class="border-b-2 border-slate-300">
          <th class="text-left py-1 font-semibold text-slate-600">Ylaosa</th>
          <th class="text-right py-1 w-16 font-semibold text-slate-600">Pisteet</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="cat in UPPER_CATEGORIES"
          :key="cat"
          class="border-b border-slate-100"
          :class="{
            'cursor-pointer hover:bg-blue-50': isSelectable(cat),
            'bg-slate-50': game.scores.has(cat),
          }"
          @click="isSelectable(cat) && game.selectCategory(cat)"
        >
          <td class="py-1.5 pl-2">{{ CATEGORY_NAMES[cat] }}</td>
          <td
            class="py-1.5 pr-2 text-right font-mono"
            :class="{
              'text-slate-400 italic': !game.scores.has(cat) && game.hasRolled,
              'font-semibold': game.scores.has(cat),
            }"
          >
            {{ displayScore(cat) }}
          </td>
        </tr>
        <tr class="border-b-2 border-slate-300 bg-slate-100 font-semibold">
          <td class="py-1.5 pl-2">Valisumma</td>
          <td class="py-1.5 pr-2 text-right font-mono">{{ game.upperSum }}</td>
        </tr>
        <tr class="border-b-2 border-slate-300 bg-slate-100 font-semibold">
          <td class="py-1.5 pl-2">Bonus {{ game.upperBonus === 0 ? `(tavoite 63)` : '' }}</td>
          <td class="py-1.5 pr-2 text-right font-mono">{{ game.upperBonus }}</td>
        </tr>
      </tbody>

      <!-- Lower section -->
      <thead>
        <tr class="border-b-2 border-slate-300">
          <th class="text-left py-1 pt-3 font-semibold text-slate-600">Alaosa</th>
          <th class="text-right py-1 pt-3 w-16 font-semibold text-slate-600">Pisteet</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="cat in LOWER_CATEGORIES"
          :key="cat"
          class="border-b border-slate-100"
          :class="{
            'cursor-pointer hover:bg-blue-50': isSelectable(cat),
            'bg-slate-50': game.scores.has(cat),
          }"
          @click="isSelectable(cat) && game.selectCategory(cat)"
        >
          <td class="py-1.5 pl-2">{{ CATEGORY_NAMES[cat] }}</td>
          <td
            class="py-1.5 pr-2 text-right font-mono"
            :class="{
              'text-slate-400 italic': !game.scores.has(cat) && game.hasRolled,
              'font-semibold': game.scores.has(cat),
            }"
          >
            {{ displayScore(cat) }}
          </td>
        </tr>
      </tbody>

      <!-- Total -->
      <tfoot>
        <tr class="border-t-2 border-slate-400 bg-slate-200 font-bold text-lg">
          <td class="py-2 pl-2">Yhteensa</td>
          <td class="py-2 pr-2 text-right font-mono">{{ game.totalScore }}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
