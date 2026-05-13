<script setup lang="ts">
import { ref } from 'vue'
import { useOnlineGameStore } from '../stores/onlineGame'
import { useProfileStore } from '../stores/profile'

const profile = useProfileStore()
const onlineGame = useOnlineGameStore()
const view = ref<'choose' | 'create' | 'join'>('choose')
const name = ref(profile.displayName ?? '')
const code = ref('')
const errorMessage = ref<string | null>(null)
const busy = ref(false)

async function createGame() {
  if (!name.value.trim()) { errorMessage.value = 'Anna nimi'; return }
  busy.value = true; errorMessage.value = null
  try {
    await onlineGame.createGame(name.value.trim())
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Pelin luonti epäonnistui'
  } finally {
    busy.value = false
  }
}

async function joinGame() {
  if (!name.value.trim()) { errorMessage.value = 'Anna nimi'; return }
  if (!code.value.trim()) { errorMessage.value = 'Anna koodi'; return }
  busy.value = true; errorMessage.value = null
  try {
    await onlineGame.joinGame(code.value, name.value.trim())
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Liittyminen epäonnistui'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="max-w-md mx-auto">
    <template v-if="view === 'choose'">
      <button
        class="block w-full mb-3 px-6 py-4 bg-blue-600 text-white font-bold rounded-lg text-lg hover:bg-blue-700"
        @click="view = 'create'"
      >Luo uusi peli</button>
      <button
        class="block w-full px-6 py-4 bg-slate-600 text-white font-bold rounded-lg text-lg hover:bg-slate-700"
        @click="view = 'join'"
      >Liity peliin koodilla</button>
    </template>

    <template v-else>
      <h2 class="text-xl font-bold mb-3 text-center text-slate-800 dark:text-slate-100">
        {{ view === 'create' ? 'Luo peli' : 'Liity peliin' }}
      </h2>

      <label class="block mb-3">
        <span class="text-sm text-slate-600 dark:text-slate-300">Nimesi</span>
        <input
          v-model="name"
          maxlength="20"
          class="block w-full px-3 py-2 mt-1 border rounded bg-white dark:bg-slate-800 dark:text-slate-100"
          placeholder="Esim. Pekka"
        >
      </label>

      <label v-if="view === 'join'" class="block mb-3">
        <span class="text-sm text-slate-600 dark:text-slate-300">Pelin koodi</span>
        <input
          v-model="code"
          maxlength="4"
          class="block w-full px-3 py-2 mt-1 border rounded text-2xl uppercase tracking-widest text-center font-mono bg-white dark:bg-slate-800 dark:text-slate-100"
          placeholder="K7M2"
        >
      </label>

      <p v-if="errorMessage" class="text-red-600 dark:text-red-400 text-sm mb-3 text-center">
        {{ errorMessage }}
      </p>

      <div class="flex gap-2">
        <button
          class="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50"
          :disabled="busy"
          @click="view === 'create' ? createGame() : joinGame()"
        >
          {{ view === 'create' ? 'Luo peli' : 'Liity peliin' }}
        </button>
        <button
          class="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg"
          :disabled="busy"
          @click="view = 'choose'"
        >Takaisin</button>
      </div>
    </template>
  </div>
</template>
