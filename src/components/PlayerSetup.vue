<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{
  start: [names: string[]]
}>()

const playerCount = ref(1)
const names = ref(['', '', '', ''])

const defaultNames = ['Pelaaja 1', 'Pelaaja 2', 'Pelaaja 3', 'Pelaaja 4']

const resolvedNames = computed(() =>
  names.value
    .slice(0, playerCount.value)
    .map((n, i) => n.trim() || defaultNames[i]!),
)

function start() {
  emit('start', resolvedNames.value)
}
</script>

<template>
  <div class="max-w-sm mx-auto">
    <h2 class="text-xl font-bold text-slate-800 mb-4 text-center">Uusi peli</h2>

    <div class="mb-6">
      <label class="block text-sm font-semibold text-slate-600 mb-2">Pelaajien määrä</label>
      <div class="flex gap-2">
        <button
          v-for="n in 4"
          :key="n"
          class="w-12 h-12 rounded-lg font-bold text-lg transition-colors"
          :class="playerCount === n
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
          @click="playerCount = n"
        >
          {{ n }}
        </button>
      </div>
    </div>

    <div class="space-y-3 mb-6">
      <div v-for="i in playerCount" :key="i">
        <input
          v-model="names[i - 1]"
          type="text"
          :placeholder="defaultNames[i - 1]"
          class="w-full px-3 py-2 border border-slate-300 rounded-lg
                 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          maxlength="20"
          @keydown.enter="start"
        />
      </div>
    </div>

    <button
      class="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg text-lg
             hover:bg-blue-700 transition-colors"
      @click="start"
    >
      Aloita peli
    </button>
  </div>
</template>
