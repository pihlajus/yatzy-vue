<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useOnlineGameStore } from '../stores/onlineGame'
import { useProfileStore } from '../stores/profile'

const props = defineProps<{ initialCode: string }>()

const profile = useProfileStore()
const onlineGame = useOnlineGameStore()
const name = ref(profile.displayName ?? '')
const errorMessage = ref<string | null>(null)
const busy = ref(false)

async function join() {
  if (!name.value.trim()) { errorMessage.value = 'Anna nimi'; return }
  busy.value = true; errorMessage.value = null
  try {
    await onlineGame.joinGame(props.initialCode, name.value.trim())
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : 'Liittyminen epäonnistui'
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  if (profile.displayName) {
    await join()
  }
})
</script>

<template>
  <div class="max-w-md mx-auto">
    <h2 class="text-xl font-bold mb-3 text-center text-slate-800 dark:text-slate-100">
      Liity peliin
    </h2>
    <p class="text-center mb-4 text-slate-600 dark:text-slate-300">
      Koodi: <span class="font-mono text-2xl tracking-widest">{{ props.initialCode }}</span>
    </p>
    <label class="block mb-3">
      <span class="text-sm text-slate-600 dark:text-slate-300">Nimesi</span>
      <input
        v-model="name"
        maxlength="20"
        class="block w-full px-3 py-2 mt-1 border rounded bg-white dark:bg-slate-800 dark:text-slate-100"
      >
    </label>
    <p v-if="errorMessage" class="text-red-600 dark:text-red-400 text-sm mb-3 text-center">
      {{ errorMessage }}
    </p>
    <button
      class="w-full px-4 py-3 bg-blue-600 text-white font-bold rounded-lg disabled:opacity-50"
      :disabled="busy"
      @click="join"
    >Liity</button>
  </div>
</template>
