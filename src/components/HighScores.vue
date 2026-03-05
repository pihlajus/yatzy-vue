<script setup lang="ts">
import { onMounted } from 'vue'
import { useHighScores } from '../composables/useHighScores'

const props = withDefaults(defineProps<{
  highlightIds?: string[]
}>(), {
  highlightIds: () => [],
})

const { scores, isLoading, error, loadTopScores } = useHighScores()

function isHighlighted(id: string): boolean {
  return props.highlightIds.includes(id)
}

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
        :key="entry.id"
        class="flex justify-between text-sm px-2 py-1 rounded"
        :class="[
          isHighlighted(entry.id)
            ? 'highlight-row bg-green-100 font-bold text-green-900 ring-2 ring-green-400'
            : i < 3
              ? 'bg-amber-50 font-semibold text-amber-900'
              : 'text-slate-700',
        ]"
      >
        <span>{{ i + 1 }}. {{ entry.playerName }}</span>
        <span>{{ entry.score }}</span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.highlight-row {
  animation: highlight-pop 0.6s ease-out, highlight-glow 1.5s ease-in-out 0.6s infinite;
}

@keyframes highlight-pop {
  0% {
    transform: scale(1);
    opacity: 0;
  }
  50% {
    transform: scale(1.08);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}

@keyframes highlight-glow {
  0%, 100% {
    box-shadow: 0 0 4px rgba(74, 222, 128, 0.3);
  }
  50% {
    box-shadow: 0 0 12px rgba(74, 222, 128, 0.6);
  }
}
</style>
