<script setup lang="ts">
defineProps<{
  value: number
  locked: boolean
  canToggle: boolean
}>()

defineEmits<{
  toggle: []
}>()

const dots: Record<number, number[][]> = {
  1: [[1, 1]],
  2: [[0, 2], [2, 0]],
  3: [[0, 2], [1, 1], [2, 0]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
}
</script>

<template>
  <button
    class="w-16 h-16 sm:w-20 sm:h-20 transition-transform"
    :class="{
      'hover:scale-110': canToggle,
      'scale-95': locked,
    }"
    :disabled="!canToggle"
    @click="$emit('toggle')"
  >
    <svg viewBox="0 0 100 100" class="w-full h-full">
      <rect
        x="2" y="2" width="96" height="96" rx="16"
        :class="locked ? 'fill-amber-100 stroke-amber-500' : 'fill-white stroke-slate-300'"
        stroke-width="3"
      />
      <circle
        v-for="(pos, i) in (dots[value] ?? [])"
        :key="i"
        :cx="20 + (pos[1] ?? 0) * 30"
        :cy="20 + (pos[0] ?? 0) * 30"
        r="9"
        :class="locked ? 'fill-amber-700' : 'fill-slate-700'"
      />
    </svg>
  </button>
</template>

