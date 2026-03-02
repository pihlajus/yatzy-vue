# Yatzy

Scandinavian Yatzy dice game with hot-seat multiplayer (1-4 players). Built as a Vue 3 learning project.

**[Play online](https://atkpihlainen.fi/yatzy/)**

## Tech

Vue 3 (Composition API), TypeScript, Pinia, Tailwind CSS 4, Vite

## Dev

```sh
npm install
npm run dev
```

## Project Structure

```
src/
  components/
    App.vue              # Root component, phase-based routing
    PlayerSetup.vue      # Player name entry (1-4 players)
    DiceArea.vue         # Dice display + roll button
    Die.vue              # Single die (SVG rendering)
    Scorecard.vue        # Score table with all categories
  stores/
    game.ts              # Pinia store (all game state + actions)
  types/
    game.ts              # TypeScript types and constants
  scoring.ts             # Pure scoring logic
  main.ts                # App bootstrap
```

## Game Flow

```
setup --> playing --> finished
  ^                      |
  +--- newGame() --------+
```

1. **Setup**: Players enter their names
2. **Playing**: Take turns rolling dice (max 3 rolls per turn), lock dice between rolls, then pick a score category
3. **Finished**: Winner announced, option to restart

15 rounds per game (one per scoring category).

## Vue 3 Concepts (Compared to React)

### Component Structure

React uses function components returning JSX. Vue uses **Single File Components** (.vue) with separate `<script>`, `<template>`, and optional `<style>` blocks.

```vue
<script setup lang="ts">
defineProps<{ value: number; locked: boolean }>()
defineEmits<{ toggle: [] }>()
</script>

<template>
  <button @click="$emit('toggle')">...</button>
</template>
```

`<script setup>` makes the entire script block a setup function. All top-level variables are automatically available in the template. `defineProps` and `defineEmits` are compile-time macros (no import needed) that define the component's typed interface.

### Reactivity

| React | Vue | Notes |
|-------|-----|-------|
| `useState` | `ref()` | Vue needs `.value` in script, not in template |
| `useMemo` | `computed()` | Vue tracks dependencies automatically, no deps array |
| `useEffect` | `watch` / `watchEffect` | Vue doesn't need cleanup in the same way |
| Immutable state | Mutable state | Vue: `count.value++` works directly |

The key difference: **Vue's reactivity is proxy-based**. When you mutate `ref.value`, Vue automatically knows what depends on it and updates accordingly. In React, every state change re-runs the component function and you manage dependency arrays manually.

From the game store (`src/stores/game.ts`):

```ts
// Vue's computed automatically tracks dice.value
const diceValues = computed(() => dice.value.map((d) => d.value))

// When diceValues changes, potentialScores updates automatically
const potentialScores = computed(() => {
  if (!hasRolled.value || !currentPlayer.value) return new Map()
  const result = new Map<Category, number>()
  for (const cat of ALL_CATEGORIES) {
    if (!currentPlayer.value.scores.has(cat)) {
      result.set(cat, calcScore(diceValues.value, cat))
    }
  }
  return result
})
```

In React this would require `useMemo` with correct deps arrays or Zustand selectors.

### Props and Events

React passes callback functions as props. Vue separates **props** (data down) from **emits** (events up):

```vue
<!-- Parent -->
<Die :value="d.value" :locked="d.locked" @toggle="toggleLock(i)" />

<!-- Child emits event instead of calling a callback -->
<button @click="$emit('toggle')">...</button>
```

### Template Syntax vs JSX

| React (JSX) | Vue (template) |
|-------------|----------------|
| `{condition && <X/>}` | `<X v-if="condition" />` |
| `{items.map(x => <X key={x.id}/>)}` | `<X v-for="x in items" :key="x.id" />` |
| `className={...}` | `:class="{...}"` |
| `onClick={fn}` | `@click="fn"` |
| `value={x}` | `:value="x"` or `v-model="x"` |

`:` is shorthand for `v-bind` (dynamic value), `@` is shorthand for `v-on` (event).

`v-model` is two-way binding. React has no equivalent -- you need `value` + `onChange`.

### State Management: Pinia vs Zustand

Pinia is Vue's official state management. Closest React equivalent is **Zustand**.

```ts
// Pinia (Vue) - uses the same ref/computed reactivity as components
export const useGameStore = defineStore('game', () => {
  const dice = ref<Die[]>(createDice())
  function roll() {
    for (const die of dice.value) {
      if (!die.locked) die.value = rollDie()
    }
  }
  return { dice, roll }
})
```

Differences from Zustand/Redux:
- Uses the same `ref`/`computed` reactivity as components
- No selectors needed -- Vue tracks dependencies automatically
- No immutable updates needed (`dice.value[i].locked = true` works)
- `storeToRefs()` destructures store into reactive refs (like Zustand selectors)

### App Bootstrap

```ts
// Vue
const app = createApp(App)
app.use(createPinia())   // Register plugin (like React's <Provider>)
app.mount('#app')

// React equivalent
createRoot(document.getElementById('app')!).render(
  <Provider store={store}><App /></Provider>
)
```

`app.use()` is Vue's plugin system. React uses Provider components instead.

## Key Differences Summary

| | React | Vue |
|-|-------|-----|
| Reactivity | Explicit (useState, deps arrays) | Automatic (proxy-based tracking) |
| Mutation | Forbidden (immutable) | Allowed (direct mutation of ref.value) |
| Rendering | Entire function re-runs | Only changed parts update |
| Template | JSX (JavaScript) | HTML-based template (or JSX) |
| Component | Function | Single File Component (.vue) |
| State mgmt | Choose your own (Redux, Zustand, Jotai...) | Pinia (official, integrated) |
| Dep tracking | Manual (useEffect deps) | Automatic (computed/watch) |

**Biggest mindset shift**: In Vue you don't think about dependency arrays. `computed()` and `watch()` automatically track which reactive values are read and update only when needed. This eliminates an entire category of bugs (missing/wrong deps in useEffect).

**Second biggest**: Mutation is normal in Vue. `player.scores.set(cat, score)` updates state and UI. In React this would require creating new objects or using Immer.

## Scoring

**Upper section** (categories 0-5): Ones through Sixes -- sum of matching die faces. Bonus +50 if upper total >= 63.

**Lower section** (categories 6-14): Pair, Two Pairs, Three of a Kind, Four of a Kind, Small Straight (1-5, 15pts), Large Straight (2-6, 20pts), Full House (sum of all), Chance (sum of all), Yatzy (five of a kind, 50pts).
