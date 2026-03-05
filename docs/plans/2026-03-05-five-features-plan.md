# Five Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add undo, probability display, sound effects, shake-to-roll, and yatzy explosion to the Yatzy game.

**Architecture:** Shared settings composable (localStorage-persisted) controls toggles for sound and probabilities. Each feature is a self-contained composable or store extension. Yatzy explosion is an event emitted from the game store, consumed by the UI.

**Tech Stack:** Vue 3 composition API, Pinia, Web Audio API, DeviceMotionEvent API, CSS animations, Vitest

---

## Task 1: useSettings composable

Shared toggle state for sound and probabilities, persisted to localStorage.

**Files:**
- Create: `src/composables/useSettings.ts`
- Create: `src/__tests__/settings.test.ts`

**Step 1: Write tests**

```ts
// src/__tests__/settings.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useSettings } from '../composables/useSettings'

beforeEach(() => {
  localStorage.clear()
})

describe('useSettings', () => {
  it('defaults sound to false', () => {
    const { soundEnabled } = useSettings()
    expect(soundEnabled.value).toBe(false)
  })

  it('defaults probabilities to false', () => {
    const { probabilitiesEnabled } = useSettings()
    expect(probabilitiesEnabled.value).toBe(false)
  })

  it('persists sound toggle to localStorage', () => {
    const { soundEnabled, toggleSound } = useSettings()
    toggleSound()
    expect(soundEnabled.value).toBe(true)
    expect(localStorage.getItem('yatzy-sound')).toBe('true')
  })

  it('persists probabilities toggle to localStorage', () => {
    const { probabilitiesEnabled, toggleProbabilities } = useSettings()
    toggleProbabilities()
    expect(probabilitiesEnabled.value).toBe(true)
    expect(localStorage.getItem('yatzy-probabilities')).toBe('true')
  })

  it('reads saved state from localStorage', () => {
    localStorage.setItem('yatzy-sound', 'true')
    localStorage.setItem('yatzy-probabilities', 'true')
    const { soundEnabled, probabilitiesEnabled } = useSettings()
    expect(soundEnabled.value).toBe(true)
    expect(probabilitiesEnabled.value).toBe(true)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/settings.test.ts`
Expected: FAIL - module not found

**Step 3: Write implementation**

```ts
// src/composables/useSettings.ts
import { ref, watch } from 'vue'

function loadBool(key: string, fallback: boolean): boolean {
  const val = localStorage.getItem(key)
  return val !== null ? val === 'true' : fallback
}

const soundEnabled = ref(loadBool('yatzy-sound', false))
const probabilitiesEnabled = ref(loadBool('yatzy-probabilities', false))

watch(soundEnabled, (v) => localStorage.setItem('yatzy-sound', String(v)))
watch(probabilitiesEnabled, (v) => localStorage.setItem('yatzy-probabilities', String(v)))

export function useSettings() {
  function toggleSound() {
    soundEnabled.value = !soundEnabled.value
  }

  function toggleProbabilities() {
    probabilitiesEnabled.value = !probabilitiesEnabled.value
  }

  return { soundEnabled, probabilitiesEnabled, toggleSound, toggleProbabilities }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/settings.test.ts`
Expected: PASS

**Step 5: Add settings toggle icons to App.vue header**

Modify `src/App.vue` header to add two SVG toggle buttons (speaker, percentage sign). Import `useSettings`. Toggle classes between active/inactive states.

```html
<!-- Inside <header> after the h1 -->
<div class="flex justify-center gap-2 mt-1">
  <button
    class="p-1.5 rounded-full transition-colors"
    :class="soundEnabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'"
    :title="soundEnabled ? 'Äänet päällä' : 'Äänet pois'"
    @click="toggleSound"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path v-if="soundEnabled" d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <line v-if="!soundEnabled" x1="23" y1="9" x2="17" y2="15" />
      <line v-if="!soundEnabled" x1="17" y1="9" x2="23" y2="15" />
    </svg>
  </button>
  <button
    class="p-1.5 rounded-full transition-colors text-xs font-bold w-8 h-8"
    :class="probabilitiesEnabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'"
    :title="probabilitiesEnabled ? 'Todennäköisyydet päällä' : 'Todennäköisyydet pois'"
    @click="toggleProbabilities"
  >%</button>
</div>
```

**Step 6: Commit**

```bash
git add src/composables/useSettings.ts src/__tests__/settings.test.ts src/App.vue
git commit -m "feat: add useSettings composable with sound/probability toggles"
```

---

## Task 2: Undo Last Category

**Files:**
- Modify: `src/stores/game.ts`
- Modify: `src/__tests__/game.test.ts`
- Modify: `src/App.vue` (undo button in playing phase)

**Step 1: Write tests**

Add to `src/__tests__/game.test.ts`:

```ts
describe('undo', () => {
  it('undoes last category selection', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    game.roll()
    const diceBeforeSelect = game.diceValues.slice()
    game.selectCategory(Category.Chance)
    expect(game.players[0]!.scores.has(Category.Chance)).toBe(true)

    game.undoLastCategory()
    expect(game.players[0]!.scores.has(Category.Chance)).toBe(false)
    expect(game.diceValues).toEqual(diceBeforeSelect)
    expect(game.rollsLeft).toBe(0) // was 0 after 3rd roll before select
  })

  it('cannot undo if nothing to undo', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    expect(game.canUndo).toBe(false)
    game.undoLastCategory() // should be no-op
    expect(game.turnsPlayed).toBe(0)
  })

  it('cannot undo after next player has rolled', () => {
    const game = useGameStore()
    game.startGame(['Jussi', 'Akseli'])
    game.roll()
    game.selectCategory(Category.Ones)
    expect(game.canUndo).toBe(true)
    game.roll() // Akseli rolls
    expect(game.canUndo).toBe(false)
  })

  it('undo restores correct player turn in multiplayer', () => {
    const game = useGameStore()
    game.startGame(['Jussi', 'Akseli'])
    game.roll()
    game.selectCategory(Category.Ones)
    expect(game.currentPlayer!.name).toBe('Akseli')
    game.undoLastCategory()
    expect(game.currentPlayer!.name).toBe('Jussi')
  })

  it('clears undo after roll', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    game.roll()
    game.selectCategory(Category.Ones)
    expect(game.canUndo).toBe(true)
    game.roll()
    expect(game.canUndo).toBe(false)
  })

  it('undo clears undo state (cannot undo twice)', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    game.roll()
    game.selectCategory(Category.Ones)
    game.undoLastCategory()
    expect(game.canUndo).toBe(false)
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/game.test.ts`
Expected: FAIL - canUndo/undoLastCategory not defined

**Step 3: Implement undo in game store**

Add to `src/stores/game.ts`:

```ts
// After turnsPlayed ref, add:
interface UndoSnapshot {
  playerIndex: number
  category: Category
  score: number
  diceValues: number[]
  diceLocks: boolean[]
  rollsLeft: number
}

const undoSnapshot = ref<UndoSnapshot | null>(null)

const canUndo = computed(() => undoSnapshot.value !== null && !hasRolled.value)
```

In `selectCategory`, before mutating state, save snapshot:

```ts
// At start of selectCategory, after validation:
undoSnapshot.value = {
  playerIndex: currentPlayerIndex.value,
  category,
  score,
  diceValues: dice.value.map((d) => d.value),
  diceLocks: dice.value.map((d) => d.locked),
  rollsLeft: rollsLeft.value,
}
```

Add `undoLastCategory` action:

```ts
function undoLastCategory() {
  const snap = undoSnapshot.value
  if (!snap || hasRolled.value) return

  const player = players.value[snap.playerIndex]
  if (!player) return

  player.scores.delete(snap.category)
  turnsPlayed.value--
  currentPlayerIndex.value = snap.playerIndex
  rollsLeft.value = snap.rollsLeft

  for (let i = 0; i < dice.value.length; i++) {
    dice.value[i]!.value = snap.diceValues[i]!
    dice.value[i]!.locked = snap.diceLocks[i]!
  }

  if (phase.value === 'finished') {
    phase.value = 'playing'
  }

  undoSnapshot.value = null
}
```

In `roll()`, clear undo: add `undoSnapshot.value = null` at start.

In `newGame()` and `restartGame()`, clear undo: add `undoSnapshot.value = null`.

Export `canUndo` and `undoLastCategory` in the return object.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/game.test.ts`
Expected: PASS

**Step 5: Add undo button to App.vue**

In the playing phase template, after the `<Scorecard />` section, add:

```html
<button
  v-if="game.canUndo"
  class="mt-3 px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm
         hover:bg-slate-300 transition-colors"
  @click="game.undoLastCategory()"
>
  Kumoa viimeinen valinta
</button>
```

**Step 6: Commit**

```bash
git add src/stores/game.ts src/__tests__/game.test.ts src/App.vue
git commit -m "feat: add undo for last category selection"
```

---

## Task 3: Sound Effects

**Files:**
- Create: `src/composables/useSound.ts`
- Modify: `src/components/DiceArea.vue` (play roll sound)
- Modify: `src/components/Scorecard.vue` (play click on select)

No unit test for Web Audio API (browser-only). Manual testing.

**Step 1: Create useSound composable**

```ts
// src/composables/useSound.ts
import { useSettings } from './useSettings'

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

function playRoll() {
  const { soundEnabled } = useSettings()
  if (!soundEnabled.value) return
  const ctx = getCtx()
  const bufferSize = ctx.sampleRate * 0.3
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
  }
  const source = ctx.createBufferSource()
  source.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = 800
  filter.Q.value = 1
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.3, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
  source.connect(filter).connect(gain).connect(ctx.destination)
  source.start()
}

function playClick() {
  const { soundEnabled } = useSettings()
  if (!soundEnabled.value) return
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  osc.type = 'sine'
  osc.frequency.value = 600
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.2, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.1)
}

function playBoom() {
  const { soundEnabled } = useSettings()
  if (!soundEnabled.value) return
  const ctx = getCtx()
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(150, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5)
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.4, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5)
  osc.connect(gain).connect(ctx.destination)
  osc.start()
  osc.stop(ctx.currentTime + 0.5)
}

export function useSound() {
  return { playRoll, playClick, playBoom }
}
```

**Step 2: Integrate roll sound in DiceArea.vue**

In `DiceArea.vue`, import `useSound`, call `playRoll()` in `roll()` function:

```ts
import { useSound } from '../composables/useSound'
const { playRoll } = useSound()

function roll() {
  game.roll()
  playRoll()
  rolling.value = true
  setTimeout(() => { rolling.value = false }, 900)
}
```

**Step 3: Integrate click sound in Scorecard.vue**

In `Scorecard.vue`, import `useSound`, add wrapper for category selection:

```ts
import { useSound } from '../composables/useSound'
const { playClick } = useSound()

function select(cat: Category) {
  if (!isSelectable(cat, game.currentPlayer!)) return
  playClick()
  game.selectCategory(cat)
}
```

Update `@click` handlers in template to use `select(cat)` instead of `game.selectCategory(cat)`.

**Step 4: Test manually**

Run: `npm run dev`
Toggle sound on, roll dice, select category. Verify sounds play.

**Step 5: Commit**

```bash
git add src/composables/useSound.ts src/components/DiceArea.vue src/components/Scorecard.vue
git commit -m "feat: add synthesized sound effects for dice roll and category select"
```

---

## Task 4: Shake-to-Roll

**Files:**
- Create: `src/composables/useShake.ts`
- Modify: `src/components/DiceArea.vue`

No unit test (DeviceMotionEvent is browser-only). Manual testing on mobile.

**Step 1: Create useShake composable**

```ts
// src/composables/useShake.ts
import { onUnmounted } from 'vue'

const THRESHOLD = 15
const COOLDOWN_MS = 1000

export function useShake(onShake: () => void) {
  let lastShake = 0
  let permissionGranted = false
  const supported = typeof DeviceMotionEvent !== 'undefined'

  function handleMotion(e: DeviceMotionEvent) {
    const acc = e.accelerationIncludingGravity
    if (!acc) return
    const total = Math.sqrt(
      (acc.x ?? 0) ** 2 + (acc.y ?? 0) ** 2 + (acc.z ?? 0) ** 2,
    )
    // Subtract gravity (~9.8) to get shake force
    if (total - 9.8 > THRESHOLD && Date.now() - lastShake > COOLDOWN_MS) {
      lastShake = Date.now()
      onShake()
    }
  }

  function startListening() {
    if (!supported) return
    permissionGranted = true
    window.addEventListener('devicemotion', handleMotion)
  }

  async function requestPermission(): Promise<boolean> {
    if (!supported) return false
    // iOS 13+ requires explicit permission
    const DME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }
    if (DME.requestPermission) {
      try {
        const result = await DME.requestPermission()
        if (result === 'granted') {
          startListening()
          return true
        }
        return false
      } catch {
        return false
      }
    }
    // Android / other - no permission needed
    startListening()
    return true
  }

  onUnmounted(() => {
    window.removeEventListener('devicemotion', handleMotion)
  })

  return {
    supported,
    get permissionGranted() { return permissionGranted },
    requestPermission,
    startListening,
  }
}
```

**Step 2: Integrate in DiceArea.vue**

Import `useShake`, pass the `roll` function. Add a one-time permission button for iOS.

```ts
import { useShake } from '../composables/useShake'

const canRoll = computed(() => game.rollsLeft > 0 && !game.isGameOver && game.phase === 'playing')
const shakePermissionNeeded = ref(false)

const { supported: shakeSupported, requestPermission: requestShakePermission } = useShake(() => {
  if (canRoll.value && !rolling.value) roll()
})

// Check if we need to show permission button (iOS)
if (shakeSupported) {
  const DME = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }
  if (DME.requestPermission) {
    shakePermissionNeeded.value = true
  } else {
    // Android - start immediately
    requestShakePermission()
  }
}

async function grantShake() {
  const ok = await requestShakePermission()
  if (ok) shakePermissionNeeded.value = false
}
```

Add button in template (only shows once on iOS):

```html
<button
  v-if="shakePermissionNeeded"
  class="text-xs text-blue-500 underline"
  @click="grantShake"
>
  Salli ravistus
</button>
```

**Step 3: Test manually**

On mobile device or Chrome DevTools device simulation with sensors.

**Step 4: Commit**

```bash
git add src/composables/useShake.ts src/components/DiceArea.vue
git commit -m "feat: add shake-to-roll with device motion API"
```

---

## Task 5: Probability Display

**Files:**
- Create: `src/probability.ts`
- Create: `src/__tests__/probability.test.ts`
- Modify: `src/components/Scorecard.vue`

**Step 1: Write tests**

```ts
// src/__tests__/probability.test.ts
import { describe, it, expect } from 'vitest'
import { calcProbabilities } from '../probability'
import { Category } from '../types/game'

describe('calcProbabilities', () => {
  it('returns probabilities between 0 and 1', () => {
    const probs = calcProbabilities([1, 2, 3, 4, 5], [], 2)
    for (const [, p] of probs) {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })

  it('Chance is always 100% (any dice score)', () => {
    const probs = calcProbabilities([1, 2, 3, 4, 5], [], 2)
    expect(probs.get(Category.Chance)).toBe(1)
  })

  it('Yatzy with 4 matching dice and 1 roll left has ~16.7% chance', () => {
    // 4 sixes locked, 1 die free, 1 roll left -> 1/6 chance
    const probs = calcProbabilities([6], [6, 6, 6, 6], 1)
    const p = probs.get(Category.Yatzy)!
    expect(p).toBeGreaterThan(0.1)
    expect(p).toBeLessThan(0.25)
  })

  it('Yatzy with 5 matching dice is 100%', () => {
    const probs = calcProbabilities([], [6, 6, 6, 6, 6], 0)
    expect(probs.get(Category.Yatzy)).toBe(1)
  })

  it('returns all 15 categories', () => {
    const probs = calcProbabilities([1, 2, 3, 4, 5], [], 2)
    expect(probs.size).toBe(15)
  })

  it('with 0 rolls left, probability is 1 if current dice score > 0, else 0', () => {
    // [1,2,3,4,5] with 0 rolls = deterministic
    const probs = calcProbabilities([], [1, 2, 3, 4, 5], 0)
    expect(probs.get(Category.SmallStraight)).toBe(1) // scores 15
    expect(probs.get(Category.Yatzy)).toBe(0) // scores 0
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/probability.test.ts`
Expected: FAIL

**Step 3: Implement probability calculator**

```ts
// src/probability.ts
import { Category, ALL_CATEGORIES } from './types/game'
import { calcScore } from './scoring'

const ITERATIONS = 10000

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1
}

function simulateRolls(freeDice: number[], lockedDice: number[], rollsLeft: number): number[] {
  let current = [...freeDice]
  for (let r = 0; r < rollsLeft; r++) {
    current = current.map(() => rollDie())
  }
  return [...lockedDice, ...current]
}

export function calcProbabilities(
  freeDice: number[],
  lockedDice: number[],
  rollsLeft: number,
): Map<Category, number> {
  const result = new Map<Category, number>()

  if (rollsLeft === 0) {
    const allDice = [...lockedDice, ...freeDice]
    for (const cat of ALL_CATEGORIES) {
      result.set(cat, calcScore(allDice, cat) > 0 ? 1 : 0)
    }
    return result
  }

  const hits = new Map<Category, number>()
  for (const cat of ALL_CATEGORIES) {
    hits.set(cat, 0)
  }

  for (let i = 0; i < ITERATIONS; i++) {
    const dice = simulateRolls(freeDice, lockedDice, rollsLeft)
    for (const cat of ALL_CATEGORIES) {
      if (calcScore(dice, cat) > 0) {
        hits.set(cat, hits.get(cat)! + 1)
      }
    }
  }

  for (const cat of ALL_CATEGORIES) {
    result.set(cat, hits.get(cat)! / ITERATIONS)
  }

  return result
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/probability.test.ts`
Expected: PASS

**Step 5: Display probabilities in Scorecard.vue**

Import `useSettings` and `calcProbabilities`. Add a computed that calculates probabilities for free categories when the setting is enabled and the player has rolled.

```ts
import { useSettings } from '../composables/useSettings'
import { calcProbabilities } from '../probability'

const { probabilitiesEnabled } = useSettings()

const probabilities = computed(() => {
  if (!probabilitiesEnabled.value || !game.hasRolled || game.rollsLeft === 0) {
    return new Map<Category, number>()
  }
  const locked = game.dice.filter((d) => d.locked).map((d) => d.value)
  const free = game.dice.filter((d) => !d.locked).map((d) => d.value)
  return calcProbabilities(free, locked, game.rollsLeft)
})

function probDisplay(cat: Category): string {
  const p = probabilities.value.get(cat)
  if (p === undefined) return ''
  return `${Math.round(p * 100)}%`
}
```

In the template, for each category row, add a small span after the category name showing probability:

```html
<td class="py-1.5 pl-2">
  {{ CATEGORY_NAMES[cat] }}
  <span
    v-if="probDisplay(cat)"
    class="text-xs text-slate-400 ml-1"
  >{{ probDisplay(cat) }}</span>
</td>
```

**Step 6: Commit**

```bash
git add src/probability.ts src/__tests__/probability.test.ts src/components/Scorecard.vue
git commit -m "feat: add Monte Carlo probability display for each category"
```

---

## Task 6: Yatzy Explosion Effect

**Files:**
- Modify: `src/stores/game.ts` (emit yatzy event)
- Modify: `src/components/DiceArea.vue` (explosion animation + boom sound)
- Modify: `src/App.vue` (screen shake)

**Step 1: Add yatzy event to game store**

Add a reactive ref `lastYatzy` to game store:

```ts
const lastYatzy = ref(false)
```

In `selectCategory`, after setting the score, check if it was a Yatzy:

```ts
if (category === Category.Yatzy && score === 50) {
  lastYatzy.value = true
}
```

In `roll()`, clear it: `lastYatzy.value = false`
In `newGame()` and `restartGame()`, clear it: `lastYatzy.value = false`

Export `lastYatzy`.

**Step 2: Add tests for yatzy event**

Add to `src/__tests__/game.test.ts`:

```ts
describe('yatzy event', () => {
  it('sets lastYatzy when scoring yatzy 50', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    // Force all dice to same value
    for (const die of game.dice) die.value = 6
    game.rollsLeft = 2 // simulate having rolled
    game.selectCategory(Category.Yatzy)
    expect(game.lastYatzy).toBe(true)
  })

  it('does not set lastYatzy when yatzy scores 0', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    game.dice[0]!.value = 1
    game.dice[1]!.value = 2
    game.dice[2]!.value = 3
    game.dice[3]!.value = 4
    game.dice[4]!.value = 5
    game.rollsLeft = 2
    game.selectCategory(Category.Yatzy)
    expect(game.lastYatzy).toBe(false)
  })

  it('clears lastYatzy on next roll', () => {
    const game = useGameStore()
    game.startGame(['Jussi'])
    for (const die of game.dice) die.value = 6
    game.rollsLeft = 2
    game.selectCategory(Category.Yatzy)
    expect(game.lastYatzy).toBe(true)
    game.roll()
    expect(game.lastYatzy).toBe(false)
  })
})
```

**Step 3: Run tests**

Run: `npx vitest run src/__tests__/game.test.ts`
Expected: PASS

**Step 4: Add explosion visuals to DiceArea.vue**

Watch `game.lastYatzy`, trigger animation and sound:

```ts
import { useSound } from '../composables/useSound'

const { playRoll, playBoom } = useSound()
const exploding = ref(false)

watch(() => game.lastYatzy, (isYatzy) => {
  if (isYatzy) {
    exploding.value = true
    playBoom()
    setTimeout(() => { exploding.value = false }, 1500)
  }
})
```

Add to template, after the dice flex container:

```html
<!-- Yatzy explosion -->
<div v-if="exploding" class="yatzy-explosion" aria-hidden="true">
  <div class="shockwave" />
</div>
```

Add CSS:

```css
.yatzy-explosion {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 10;
}

.shockwave {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 4px solid #ef4444;
  animation: shockwave-expand 1.5s ease-out forwards;
}

@keyframes shockwave-expand {
  0% {
    width: 20px;
    height: 20px;
    opacity: 1;
    border-width: 4px;
    border-color: #ef4444;
  }
  50% {
    border-color: #f97316;
  }
  100% {
    width: 300px;
    height: 300px;
    opacity: 0;
    border-width: 1px;
    border-color: #fbbf24;
  }
}
```

Add `position: relative` to the parent container in DiceArea.vue.

Add dice bounce class when exploding:

```html
<div class="flex gap-3" :class="{ 'yatzy-bounce': exploding }">
```

```css
.yatzy-bounce {
  animation: dice-bounce 0.6s ease-out;
}

@keyframes dice-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-20px) scale(1.1); }
  60% { transform: translateY(5px) scale(0.95); }
}
```

**Step 5: Add screen shake to App.vue**

Watch `game.lastYatzy` in App.vue, toggle a CSS class on the game container:

```ts
const screenShake = ref(false)

watch(() => game.lastYatzy, (isYatzy) => {
  if (isYatzy) {
    screenShake.value = true
    setTimeout(() => { screenShake.value = false }, 500)
  }
})
```

Add class to outer div:

```html
<div class="min-h-screen bg-slate-50 py-6 px-4" :class="{ 'screen-shake': screenShake }">
```

Add CSS:

```css
.screen-shake {
  animation: shake 0.5s ease-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10% { transform: translateX(-4px) rotate(-0.5deg); }
  30% { transform: translateX(4px) rotate(0.5deg); }
  50% { transform: translateX(-3px); }
  70% { transform: translateX(3px); }
  90% { transform: translateX(-1px); }
}
```

**Step 6: Commit**

```bash
git add src/stores/game.ts src/__tests__/game.test.ts src/components/DiceArea.vue src/App.vue
git commit -m "feat: add yatzy explosion with shockwave, bounce, screen shake and boom"
```

---

## Task 7: Final Integration & Cleanup

**Step 1: Run all tests**

```bash
npm test
```

**Step 2: Type check**

```bash
npx vue-tsc --noEmit
```

**Step 3: Manual testing**

- Toggle sound on, roll dice, verify rattle sound
- Select category, verify click sound
- Score yatzy, verify boom + explosion + screen shake
- Toggle probabilities on, verify percentages appear in scorecard
- Undo a category selection, verify it restores correctly
- On mobile: shake phone to roll

**Step 4: Deploy**

```bash
bash deploy.sh
```

**Step 5: Commit any remaining fixes**

```bash
git add -A
git commit -m "chore: final integration and cleanup for 5 new features"
```
