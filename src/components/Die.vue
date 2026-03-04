<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps<{
  value: number
  locked: boolean
  canToggle: boolean
  rolling: boolean
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

// Base rotation to show each face
const faceRotation: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 0, y: -90 },
  3: { x: -90, y: 0 },
  4: { x: 90, y: 0 },
  5: { x: 0, y: 90 },
  6: { x: 0, y: 180 },
}

const currentX = ref(0)
const currentY = ref(0)
const duration = ref(0)
const hasRolled = ref(false)

const cubeStyle = computed(() => ({
  transform: `rotateX(${currentX.value}deg) rotateY(${currentY.value}deg)`,
  transition: hasRolled.value ? `transform ${duration.value}s cubic-bezier(0.22, 1, 0.36, 1)` : 'none',
}))

function setRotationForValue(val: number, animate: boolean) {
  const target = faceRotation[val] ?? { x: 0, y: 0 }

  if (!animate) {
    currentX.value = target.x
    currentY.value = target.y
    return
  }

  // Add 2-4 full rotations with random direction per axis
  const extraRotationsX = (2 + Math.floor(Math.random() * 3)) * 360
  const extraRotationsY = (2 + Math.floor(Math.random() * 3)) * 360
  const dirX = Math.random() > 0.5 ? 1 : -1
  const dirY = Math.random() > 0.5 ? 1 : -1

  currentX.value = target.x + extraRotationsX * dirX
  currentY.value = target.y + extraRotationsY * dirY

  // Random duration 0.5-0.8s
  duration.value = 0.5 + Math.random() * 0.3
}

// Set initial position without animation
onMounted(() => {
  setRotationForValue(props.value, false)
})

watch(() => props.rolling, (isRolling) => {
  if (isRolling && !props.locked) {
    hasRolled.value = true
    setRotationForValue(props.value, true)
  }
})

watch(() => props.value, (newVal) => {
  if (!props.rolling && !hasRolled.value) {
    setRotationForValue(newVal, false)
  }
})
</script>

<template>
  <button
    class="die-container w-16 h-16 sm:w-20 sm:h-20"
    :class="{
      'hover:scale-110 transition-transform': canToggle,
      'scale-95': locked,
    }"
    :disabled="!canToggle"
    @click="$emit('toggle')"
  >
    <div class="die-cube" :style="cubeStyle">
      <div
        v-for="face in 6"
        :key="face"
        class="face"
        :class="`face-${face}`"
      >
        <svg viewBox="0 0 100 100" class="w-full h-full">
          <rect
            x="2" y="2" width="96" height="96" rx="16"
            :class="locked ? 'fill-amber-100 stroke-amber-500' : 'fill-white stroke-slate-400'"
            stroke-width="3"
          />
          <circle
            v-for="(pos, i) in (dots[face] ?? [])"
            :key="i"
            :cx="20 + (pos[1] ?? 0) * 30"
            :cy="20 + (pos[0] ?? 0) * 30"
            r="9"
            :class="locked ? 'fill-amber-700' : 'fill-slate-900'"
          />
        </svg>
      </div>
    </div>
  </button>
</template>

<style scoped>
.die-container {
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  appearance: none;
  outline: none;
}

.die-cube {
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
}

.face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
}

/* --half = half the die size for translateZ */
.face-1 { transform: translateZ(var(--half)); }
.face-6 { transform: rotateY(180deg) translateZ(var(--half)); }
.face-2 { transform: rotateY(90deg) translateZ(var(--half)); }
.face-5 { transform: rotateY(-90deg) translateZ(var(--half)); }
.face-3 { transform: rotateX(90deg) translateZ(var(--half)); }
.face-4 { transform: rotateX(-90deg) translateZ(var(--half)); }

/* Responsive --half: 32px for mobile (w-16=64px), 40px for sm+ (w-20=80px) */
.die-container {
  --half: 32px;
}

@media (min-width: 640px) {
  .die-container {
    --half: 40px;
  }
}
</style>
