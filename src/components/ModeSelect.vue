<script setup lang="ts">
defineEmits<{
  select: [mode: 'hotseat' | 'online']
}>()
</script>

<template>
  <div class="flex flex-col gap-3 max-w-md mx-auto">
    <button
      class="px-6 py-4 bg-blue-600 text-white font-bold rounded-lg text-lg hover:bg-blue-700 transition-colors"
      @click="$emit('select', 'hotseat')"
    >
      Pelaa samalla laitteella
    </button>
    <button
      class="px-6 py-4 bg-green-600 text-white font-bold rounded-lg text-lg hover:bg-green-700 transition-colors"
      @click="$emit('select', 'online')"
    >
      Pelaa netissä
    </button>
  </div>
</template>
