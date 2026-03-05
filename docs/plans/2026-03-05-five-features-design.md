# Design: 5 New Features for Yatzy

## 1. Undo Last Category Selection

Single undo level. Store snapshot before `selectCategory`: player index, category, score, dice values, lock states. `game.undoLastCategory()` restores snapshot and decrements `turnsPlayed`.

Constraints:
- Blocked if next player has already rolled
- Cleared on new turn start (roll)
- Button below Scorecard, visible only when undo is available

State addition to game store:
```ts
interface UndoSnapshot {
  playerIndex: number
  category: Category
  score: number
  diceValues: number[]
  diceLocks: boolean[]
}
```

## 2. Probability Display (Toggleable)

Monte Carlo simulation per free category. Takes locked dice and remaining rolls into account.

- 10,000 iterations per category
- Run in `requestIdleCallback` or chunked to avoid blocking UI
- Display: small percentage next to category name in Scorecard
- Only shown when player has rolls remaining and has already rolled at least once
- `calcProbabilities(lockedDice: number[], rollsLeft: number): Map<Category, number>`

New file: `src/probability.ts`

Toggle: settings icon in header, state in localStorage.

## 3. Sound Effects (Toggleable)

Web Audio API, synthesized sounds, no external files.

Sounds:
- **Dice roll**: White noise burst with bandpass filter, ~300ms (rattle)
- **Category select**: Short sine blip, ~100ms (click)
- **Yatzy boom**: Low frequency oscillator with decay, ~500ms

New file: `src/composables/useSound.ts`

Toggle: speaker icon in header, state in localStorage.

## 4. Shake-to-Roll

`DeviceMotionEvent` API with acceleration threshold ~15 m/s^2.

- iOS requires `DeviceMotionEvent.requestPermission()` - show one-time permission button
- 1s cooldown between shake-triggered rolls
- Only active when rolls remaining and game phase is 'playing'
- Desktop: API absent, no UI impact

New file: `src/composables/useShake.ts`

Integrated in `DiceArea.vue`.

## 5. Yatzy Explosion Effect

Triggers when player selects Yatzy category and scores 50 points (not at game end).

Visual:
- Shockwave ring expanding from dice center
- Dice bounce animation (scale up/down)
- Screen shake (CSS transform on game container)
- Color: red/orange (distinct from top 10 green/gold celebrations)
- Duration: ~1.5s

Audio: boom sound from useSound composable.

Triggered from `DiceArea.vue` or `App.vue` watching for yatzy score event.

## Shared Infrastructure

### useSettings composable
```ts
// src/composables/useSettings.ts
interface Settings {
  soundEnabled: boolean
  probabilitiesEnabled: boolean
}
```
Persisted to localStorage. Reactive refs.

### Header icons
Two toggle icons in App.vue header: speaker (sound), percentage (probabilities).
