<script setup lang="ts">
import { onMounted } from 'vue'
import { useHighScores } from '../composables/useHighScores'

const { scores, isLoading, error, loadTopScores } = useHighScores()

onMounted(loadTopScores)
</script>

<template>
  <div class="bg-white border border-slate-200 rounded-lg p-4">
    <h2 class="text-lg font-bold text-slate-800 mb-3">Top 10</h2>

    <p v-if="isLoading" class="text-slate-500 text-sm">Ladataan tuloksia...</p>

    <p v-else-if="error" class="text-red-600 text-sm">{{ error }}</p>

    <p v-else-if="scores.length === 0" class="text-slate-400 text-sm">Ei tuloksia vielä</p>

    <ol v-else class="space-y-1">
      <li
        v-for="(entry, i) in scores"
        :key="i"
        class="flex justify-between text-sm px-2 py-1 rounded"
        :class="i < 3 ? 'bg-amber-50 font-semibold text-amber-900' : 'text-slate-700'"
      >
        <span>{{ i + 1 }}. {{ entry.playerName }}</span>
        <span>{{ entry.score }}</span>
      </li>
    </ol>
  </div>
</template>
