<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOnlineGameStore } from '../stores/onlineGame'

const onlineGame = useOnlineGameStore()
const copied = ref(false)
const starting = ref(false)
const startError = ref<string | null>(null)

const shareUrl = computed(() => {
  const u = new URL(window.location.href)
  u.searchParams.set('room', onlineGame.code)
  return u.toString()
})

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch {
    // clipboard unsupported — user can copy from address bar
  }
}

async function start() {
  starting.value = true; startError.value = null
  try {
    await onlineGame.startGame()
  } catch (e) {
    startError.value = e instanceof Error ? e.message : 'Aloittaminen epäonnistui'
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto text-center">
    <h2 class="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">Pelin koodi</h2>
    <p class="font-mono text-5xl tracking-widest text-blue-600 dark:text-blue-400 mb-3">
      {{ onlineGame.code }}
    </p>
    <button
      class="mb-4 px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm"
      @click="copyLink"
    >
      {{ copied ? 'Kopioitu!' : 'Kopioi jaettava linkki' }}
    </button>

    <h3 class="text-lg font-semibold mt-4 mb-2 text-slate-800 dark:text-slate-100">Pelaajat</h3>
    <ul class="space-y-1 mb-4">
      <li
        v-for="(p, i) in onlineGame.players"
        :key="p.uid"
        class="text-slate-700 dark:text-slate-200"
      >
        {{ p.name }}
        <span v-if="i === 0" class="text-xs text-slate-500"> (isäntä)</span>
        <span v-if="p.uid === onlineGame.myUid" class="text-xs text-blue-500"> – sinä</span>
      </li>
    </ul>

    <p v-if="startError" class="text-red-600 dark:text-red-400 text-sm mb-2">{{ startError }}</p>

    <button
      v-if="onlineGame.isHost"
      :disabled="onlineGame.players.length < 2 || starting"
      class="px-6 py-3 bg-green-600 text-white font-bold rounded-lg disabled:opacity-50"
      @click="start"
    >
      Aloita peli
    </button>
    <p v-else class="text-slate-500 dark:text-slate-400 text-sm">
      Odotetaan että isäntä aloittaa pelin...
    </p>
  </div>
</template>
