<script setup lang="ts">
import { ref } from 'vue'
import { useOnlineGameStore } from '../stores/onlineGame'

const onlineGame = useOnlineGameStore()
const confirmingFor = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

async function confirmConcede(uid: string) {
  if (confirmingFor.value !== uid) {
    confirmingFor.value = uid
    return
  }
  errorMessage.value = null
  try {
    await onlineGame.concedePlayer(uid)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Toiminto epäonnistui'
  } finally {
    confirmingFor.value = null
  }
}
</script>

<template>
  <div class="mb-4">
    <ul class="flex flex-wrap gap-2 justify-center">
      <li
        v-for="(p, i) in onlineGame.players"
        :key="p.uid"
        class="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2"
        :class="[
          i === onlineGame.currentPlayerIndex && onlineGame.phase === 'playing'
            ? 'bg-blue-600 text-white font-semibold'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
          p.conceded ? 'opacity-50 line-through' : '',
        ]"
      >
        <span>{{ p.name }}</span>
        <span class="font-mono text-xs">{{ onlineGame.totalScore(p) }}</span>
        <button
          v-if="onlineGame.isHost && p.uid !== onlineGame.myUid && onlineGame.phase === 'playing' && !p.conceded"
          class="ml-1 text-xs px-1.5 py-0.5 rounded bg-red-500 text-white"
          @click="confirmConcede(p.uid)"
        >
          {{ confirmingFor === p.uid ? 'Varma?' : 'Potkaise' }}
        </button>
      </li>
    </ul>
    <p v-if="errorMessage" class="text-red-600 dark:text-red-400 text-xs text-center mt-2">
      {{ errorMessage }}
    </p>
  </div>
</template>
