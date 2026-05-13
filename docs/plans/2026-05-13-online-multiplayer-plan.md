# Online-moninpeli – toteutussuunnitelma

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lisää Yatzyyn online-moninpeli 2–4 pelaajalle siten, että hot-seat-tila säilyy ennallaan.

**Architecture:** Firebase Anonymous Auth + yksi Firestore-dokumentti per peli (`games/{gameId}`). Pelilogiikka clientissä, säännöt valvovat vuoron omistajuutta `affectedKeys()`-pohjaisesti. Hot-seat-store ja online-store viedään ulos identtisen rajapinnan kautta, `useActiveGame()`-composable valitsee aktiivisen storen sovellustilan perusteella, joten `DiceArea` ja `Scorecard` muuttuvat minimaalisesti.

**Tech Stack:** Vue 3 + Pinia, Firebase Auth + Firestore, Firebase Emulator + `@firebase/rules-unit-testing` sääntö-testeille, Vitest yksikkötesteille.

**Refrence spec:** `docs/plans/2026-05-13-online-multiplayer-design.md`

**Total tasks:** 26, grouped in 7 phases.

---

## Phase A – Foundations

### Task A1: Lisää dev-deps, emulator-konfiguraatio ja skriptit

**Files:**
- Create: `firebase.json`
- Create: `firestore.indexes.json`
- Create: `.firebaserc`
- Modify: `package.json`
- Modify: `.gitignore`

- [ ] **Step 1: Asenna dev-dependencyt**

```bash
npm install --save-dev @firebase/rules-unit-testing
npm install --save-dev firebase-tools
```

Tarkista että `package.json` sisältää nyt `firebase-tools` ja `@firebase/rules-unit-testing` `devDependencies`:ssä.

- [ ] **Step 2: Luo `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "firestore": { "port": 8080 },
    "auth": { "port": 9099 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

- [ ] **Step 3: Luo `firestore.indexes.json`**

```json
{
  "indexes": [
    {
      "collectionGroup": "games",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "code", "order": "ASCENDING" },
        { "fieldPath": "phase", "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 4: Luo `.firebaserc`**

Lue olemassa olevasta `.env.local`:sta `VITE_FIREBASE_PROJECT_ID` ja käytä sitä alla:

```json
{
  "projects": {
    "default": "<projektin-id-tähän>"
  }
}
```

- [ ] **Step 5: Lisää `package.json`-skripti**

Lisää `scripts`-objektiin:
```json
"test:rules": "firebase emulators:exec --only firestore,auth 'vitest run src/__tests__/rules'"
```

- [ ] **Step 6: Päivitä `.gitignore`**

Lisää rivit:
```
firebase-debug.log
firestore-debug.log
.firebase/
```

- [ ] **Step 7: Commit**

```bash
git add firebase.json firestore.indexes.json .firebaserc package.json package-lock.json .gitignore
git commit -m "chore: add firebase emulator config and rules-testing dep"
```

---

### Task A2: Firebase Auth + `ensureSignedIn()`

**Files:**
- Modify: `src/firebase.ts`

- [ ] **Step 1: Päivitä firebase.ts**

Avaa `src/firebase.ts` ja korvaa tiedoston yläosa (rivit 1–11) tällä:

```ts
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
})

export const db = getFirestore(app)
export const auth = getAuth(app)

let signInPromise: Promise<User> | null = null

export function ensureSignedIn(): Promise<User> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser)
  if (signInPromise) return signInPromise
  signInPromise = new Promise<User>((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsub()
        resolve(user)
      }
    })
    signInAnonymously(auth).catch((err) => {
      unsub()
      signInPromise = null
      reject(err)
    })
  })
  return signInPromise
}
```

Olemassa olevat queue-/savePlayerScores-funktiot pidetään ennallaan.

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```
Odotettu: ei virheitä.

- [ ] **Step 3: Commit**

```bash
git add src/firebase.ts
git commit -m "feat: add firebase anonymous auth setup"
```

---

### Task A3: Tyypit pelidokumentille

**Files:**
- Modify: `src/types/game.ts`

- [ ] **Step 1: Lisää tyypit tiedoston loppuun**

```ts
export interface OnlinePlayer {
  uid: string
  name: string
  scores: Record<string, number>
  conceded: boolean
}

export interface GameDoc {
  code: string
  hostUid: string
  createdAt: import('firebase/firestore').Timestamp
  updatedAt: import('firebase/firestore').Timestamp
  phase: 'lobby' | 'playing' | 'finished'
  players: OnlinePlayer[]
  dice: { value: number; locked: boolean }[]
  rollsLeft: number
  currentPlayerIndex: number
  turnsPlayed: number
  lastYatzy: boolean
  lastBonus: boolean
  winnerUid: string | null
  highScoresWritten: boolean
}

export const MAX_PLAYERS = 4
export const MIN_PLAYERS_TO_START = 2
```

- [ ] **Step 2: Type-check ja commit**

```bash
npm run type-check
git add src/types/game.ts
git commit -m "feat: add GameDoc and OnlinePlayer types"
```

---

### Task A4: Pisteenlasku-helperit erilliseen moduuliin

**Files:**
- Create: `src/scoreHelpers.ts`
- Modify: `src/stores/game.ts`
- Create: `src/__tests__/scoreHelpers.test.ts`

Vie `upperSum`, `upperBonus`, `lowerSum`, `totalScore` ja `findWinner` erilliseen moduuliin, jotta sekä `game.ts` että tuleva `onlineGame.ts` voivat käyttää niitä. Helperit toimivat geneerisesti pelaaja-objektille jolla on `scores`-kenttä `Map<Category, number>` -muodossa.

- [ ] **Step 1: Kirjoita epäonnistuva testi**

`src/__tests__/scoreHelpers.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { upperSum, upperBonus, lowerSum, totalScore, findWinner } from '../scoreHelpers'
import { Category } from '../types/game'

function p(name: string, scores: Array<[Category, number]>) {
  return { name, scores: new Map(scores) }
}

describe('scoreHelpers', () => {
  it('upperSum laskee yläosan kategoriat yhteen', () => {
    const player = p('A', [[Category.Ones, 3], [Category.Twos, 6], [Category.Threes, 9]])
    expect(upperSum(player)).toBe(18)
  })

  it('upperBonus = 50 jos ylä-summa on >= 63, muuten 0', () => {
    expect(upperBonus(p('A', [[Category.Ones, 3], [Category.Sixes, 60]]))).toBe(50)
    expect(upperBonus(p('B', [[Category.Ones, 3]]))).toBe(0)
  })

  it('lowerSum laskee alaosan kategoriat yhteen', () => {
    const player = p('A', [[Category.Pair, 10], [Category.Yatzy, 50], [Category.Ones, 5]])
    expect(lowerSum(player)).toBe(60) // Ones on ylä-osa, ei kuulu lowerSummaan
  })

  it('totalScore = ylä + bonus + ala', () => {
    const player = p('A', [[Category.Ones, 3], [Category.Sixes, 60], [Category.Yatzy, 50]])
    expect(totalScore(player)).toBe(3 + 60 + 50 + 50)
  })

  it('findWinner palauttaa korkeimmat pisteet saavan pelaajan', () => {
    const a = p('A', [[Category.Yatzy, 50]])
    const b = p('B', [[Category.Yatzy, 50], [Category.Chance, 20]])
    expect(findWinner([a, b])).toBe(b)
  })
})
```

- [ ] **Step 2: Aja testit ja varmista että ne epäonnistuvat**

```bash
npx vitest run src/__tests__/scoreHelpers.test.ts
```
Odotettu: FAIL (`scoreHelpers` ei löydy).

- [ ] **Step 3: Toteuta `src/scoreHelpers.ts`**

```ts
import {
  Category,
  UPPER_CATEGORIES,
  ALL_CATEGORIES,
  UPPER_BONUS_LIMIT,
  UPPER_BONUS_POINTS,
} from './types/game'

export interface ScorablePlayer {
  scores: Map<Category, number>
}

export function upperSum(player: ScorablePlayer): number {
  let sum = 0
  for (const cat of UPPER_CATEGORIES) sum += player.scores.get(cat) ?? 0
  return sum
}

export function upperBonus(player: ScorablePlayer): number {
  return upperSum(player) >= UPPER_BONUS_LIMIT ? UPPER_BONUS_POINTS : 0
}

export function lowerSum(player: ScorablePlayer): number {
  let sum = 0
  for (const cat of ALL_CATEGORIES) {
    if (!UPPER_CATEGORIES.includes(cat)) sum += player.scores.get(cat) ?? 0
  }
  return sum
}

export function totalScore(player: ScorablePlayer): number {
  return upperSum(player) + upperBonus(player) + lowerSum(player)
}

export function findWinner<T extends ScorablePlayer>(players: T[]): T | null {
  if (players.length === 0) return null
  return players.reduce((best, p) => (totalScore(p) > totalScore(best) ? p : best))
}
```

- [ ] **Step 4: Refaktoroi `src/stores/game.ts` käyttämään näitä**

Poista funktiot `upperSum`, `upperBonus`, `lowerSum`, `totalScore` (rivit 82–106) ja korvaa importeilla:

```ts
import {
  upperSum as calcUpperSum,
  upperBonus as calcUpperBonus,
  lowerSum as calcLowerSum,
  totalScore as calcTotalScore,
  findWinner,
} from '../scoreHelpers'
```

Korvaa funktioviittaukset:
- `upperSum` → `calcUpperSum`
- `upperBonus` → `calcUpperBonus`
- `lowerSum` → `calcLowerSum`
- `totalScore` → `calcTotalScore`

Päivitä myös tiedoston `winner`-computed käyttämään `findWinner`-funktiota (rivit 108–113):

```ts
const winner = computed(() => {
  if (!isGameOver.value || players.value.length === 0) return null
  return findWinner(players.value)
})
```

Storen palautusobjektin (rivit 237–266) kentät `upperSum`, `upperBonus`, `lowerSum`, `totalScore` säilyvät: ne viittaavat nyt `calcUpperSum` jne. -aliaksiin tai vaihtoehtoisesti määritä storen sisällä wrapper-funktiot jotka kutsuvat niitä:

```ts
function upperSum(player: Player): number { return calcUpperSum(player) }
function upperBonus(player: Player): number { return calcUpperBonus(player) }
function lowerSum(player: Player): number { return calcLowerSum(player) }
function totalScore(player: Player): number { return calcTotalScore(player) }
```

- [ ] **Step 5: Aja kaikki testit**

```bash
npm run test
```
Odotettu: kaikki testit menee läpi (uusi scoreHelpers + nykyiset).

- [ ] **Step 6: Commit**

```bash
git add src/scoreHelpers.ts src/__tests__/scoreHelpers.test.ts src/stores/game.ts
git commit -m "refactor: extract score helpers for reuse in online store"
```

---

### Task A5: Profiili-store (uid + tallennettu nimi)

**Files:**
- Create: `src/stores/profile.ts`
- Create: `src/__tests__/profile.test.ts`

- [ ] **Step 1: Kirjoita testit**

`src/__tests__/profile.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../firebase', () => ({
  ensureSignedIn: vi.fn().mockResolvedValue({ uid: 'mock-uid' }),
  db: {},
}))

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore')
  return {
    ...actual,
    doc: vi.fn(() => ({})),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
    setDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(() => ({})),
  }
})

import { useProfileStore } from '../stores/profile'

describe('profile store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('init kirjautuu sisään ja asettaa uid:n', async () => {
    const p = useProfileStore()
    await p.init()
    expect(p.uid).toBe('mock-uid')
    expect(p.isReady).toBe(true)
  })

  it('setDisplayName tallentaa nimen localStorageen', async () => {
    const p = useProfileStore()
    await p.init()
    await p.setDisplayName('Pekka')
    expect(p.displayName).toBe('Pekka')
    expect(localStorage.getItem('yatzy_player_name')).toBe('Pekka')
  })

  it('init lukee nimen localStoragesta jos siellä on', async () => {
    localStorage.setItem('yatzy_player_name', 'Liisa')
    const p = useProfileStore()
    await p.init()
    expect(p.displayName).toBe('Liisa')
  })
})
```

- [ ] **Step 2: Aja testit (epäonnistuvat)**

```bash
npx vitest run src/__tests__/profile.test.ts
```
Odotettu: FAIL.

- [ ] **Step 3: Toteuta store**

`src/stores/profile.ts`:
```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db, ensureSignedIn } from '../firebase'

const STORAGE_KEY = 'yatzy_player_name'

export const useProfileStore = defineStore('profile', () => {
  const uid = ref<string | null>(null)
  const displayName = ref<string | null>(null)
  const initError = ref<string | null>(null)
  let initPromise: Promise<void> | null = null

  const isReady = computed(() => uid.value !== null)

  async function init(): Promise<void> {
    if (initPromise) return initPromise
    initPromise = (async () => {
      try {
        const user = await ensureSignedIn()
        uid.value = user.uid
        const local = localStorage.getItem(STORAGE_KEY)
        if (local) {
          displayName.value = local
        } else {
          // Yritä Firestoresta
          try {
            const snap = await getDoc(doc(db, 'users', user.uid))
            if (snap.exists()) {
              const data = snap.data() as { name?: string }
              if (data.name) {
                displayName.value = data.name
                localStorage.setItem(STORAGE_KEY, data.name)
              }
            }
          } catch {
            // ohitetaan, ei ole olennainen alustusvirhe
          }
        }
      } catch (err) {
        initError.value = err instanceof Error ? err.message : 'Tuntematon virhe'
        throw err
      }
    })()
    return initPromise
  }

  async function setDisplayName(name: string): Promise<void> {
    const trimmed = name.trim().slice(0, 20)
    if (!trimmed) throw new Error('Nimi ei voi olla tyhjä')
    if (!uid.value) throw new Error('Ei sisäänkirjautunut')
    displayName.value = trimmed
    localStorage.setItem(STORAGE_KEY, trimmed)
    try {
      await setDoc(doc(db, 'users', uid.value), {
        name: trimmed,
        updatedAt: serverTimestamp(),
      })
    } catch {
      // localStorage on autoritatiivinen, palvelin-tallennus on best-effort
    }
  }

  return { uid, displayName, isReady, initError, init, setDisplayName }
})
```

- [ ] **Step 4: Aja testit ja varmista että ne menee läpi**

```bash
npx vitest run src/__tests__/profile.test.ts
```
Odotettu: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/stores/profile.ts src/__tests__/profile.test.ts
git commit -m "feat: add profile store for uid + stored display name"
```

---

## Phase B – Utilities

### Task B1: Huonekoodin generaattori ja validaattori

**Files:**
- Create: `src/codeGenerator.ts`
- Create: `src/__tests__/codeGenerator.test.ts`

- [ ] **Step 1: Testit**

`src/__tests__/codeGenerator.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { generateRoomCode, normalizeRoomCode, isValidRoomCode } from '../codeGenerator'

describe('codeGenerator', () => {
  it('generateRoomCode tuottaa 4-merkkisen merkkijonon', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode()
      expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}$/)
    }
  })

  it('normalizeRoomCode pakottaa uppercase ja poistaa välilyönnit', () => {
    expect(normalizeRoomCode(' k7m2 ')).toBe('K7M2')
    expect(normalizeRoomCode('k-7-m-2')).toBe('K7M2')
  })

  it('isValidRoomCode hyväksyy validi muoto', () => {
    expect(isValidRoomCode('K7M2')).toBe(true)
    expect(isValidRoomCode('K7M')).toBe(false)
    expect(isValidRoomCode('K7M2X')).toBe(false)
    expect(isValidRoomCode('K0M2')).toBe(false) // 0 on kielletty
    expect(isValidRoomCode('KIM2')).toBe(false) // I on kielletty
  })
})
```

- [ ] **Step 2: Aja testit (FAIL)**

```bash
npx vitest run src/__tests__/codeGenerator.test.ts
```

- [ ] **Step 3: Toteuta**

`src/codeGenerator.ts`:
```ts
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // ilman I, O, 0, 1
const LENGTH = 4

export function generateRoomCode(): string {
  let code = ''
  const arr = new Uint32Array(LENGTH)
  crypto.getRandomValues(arr)
  for (let i = 0; i < LENGTH; i++) {
    code += ALPHABET[arr[i]! % ALPHABET.length]
  }
  return code
}

export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== LENGTH) return false
  for (const ch of code) {
    if (!ALPHABET.includes(ch)) return false
  }
  return true
}
```

- [ ] **Step 4: PASS + commit**

```bash
npx vitest run src/__tests__/codeGenerator.test.ts
git add src/codeGenerator.ts src/__tests__/codeGenerator.test.ts
git commit -m "feat: add room code generator and validator"
```

---

### Task B2: GameDoc ↔ Pinia-tila -muunnos

**Files:**
- Create: `src/gameDocSerialization.ts`
- Create: `src/__tests__/gameDocSerialization.test.ts`

`OnlinePlayer.scores` on `Record<string, number>` Firestoressa mutta Pinia-storessa pidetään `Map<Category, number>`. Tämä moduuli tekee muunnoksen molempiin suuntiin.

- [ ] **Step 1: Testit**

`src/__tests__/gameDocSerialization.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
  scoresRecordToMap,
  scoresMapToRecord,
  toLocalPlayer,
  toFirestorePlayer,
} from '../gameDocSerialization'
import { Category } from '../types/game'

describe('gameDocSerialization', () => {
  it('scoresRecordToMap muuntaa string-avaimet Category-avaimiksi', () => {
    const m = scoresRecordToMap({ '0': 3, '14': 50 })
    expect(m.get(Category.Ones)).toBe(3)
    expect(m.get(Category.Yatzy)).toBe(50)
  })

  it('scoresMapToRecord muuntaa takaisin Recordiin', () => {
    const m = new Map<Category, number>([[Category.Twos, 4]])
    expect(scoresMapToRecord(m)).toEqual({ '1': 4 })
  })

  it('toLocalPlayer / toFirestorePlayer ovat käänteisiä', () => {
    const local = toLocalPlayer({
      uid: 'u', name: 'A', scores: { '0': 3 }, conceded: false,
    })
    expect(local.scores).toBeInstanceOf(Map)
    const back = toFirestorePlayer(local)
    expect(back.scores).toEqual({ '0': 3 })
  })
})
```

- [ ] **Step 2: Aja testit (FAIL)**

- [ ] **Step 3: Toteuta**

`src/gameDocSerialization.ts`:
```ts
import { Category, type OnlinePlayer } from './types/game'

export interface LocalOnlinePlayer {
  uid: string
  name: string
  scores: Map<Category, number>
  conceded: boolean
}

export function scoresRecordToMap(record: Record<string, number>): Map<Category, number> {
  const m = new Map<Category, number>()
  for (const [key, value] of Object.entries(record)) {
    m.set(Number(key) as Category, value)
  }
  return m
}

export function scoresMapToRecord(map: Map<Category, number>): Record<string, number> {
  const r: Record<string, number> = {}
  for (const [key, value] of map.entries()) {
    r[String(key)] = value
  }
  return r
}

export function toLocalPlayer(p: OnlinePlayer): LocalOnlinePlayer {
  return {
    uid: p.uid,
    name: p.name,
    conceded: p.conceded,
    scores: scoresRecordToMap(p.scores),
  }
}

export function toFirestorePlayer(p: LocalOnlinePlayer): OnlinePlayer {
  return {
    uid: p.uid,
    name: p.name,
    conceded: p.conceded,
    scores: scoresMapToRecord(p.scores),
  }
}
```

- [ ] **Step 4: PASS + commit**

```bash
npx vitest run src/__tests__/gameDocSerialization.test.ts
git add src/gameDocSerialization.ts src/__tests__/gameDocSerialization.test.ts
git commit -m "feat: add gameDoc ↔ pinia state serialization helpers"
```

---

## Phase C – Firestore-säännöt

### Task C1: Säännöt: users + highscores (regressio)

**Files:**
- Modify: `firestore.rules`
- Create: `src/__tests__/rules/highscores.rules.test.ts`
- Create: `src/__tests__/rules/users.rules.test.ts`
- Create: `src/__tests__/rules/_helpers.ts`

- [ ] **Step 1: Luo testiapurit**

`src/__tests__/rules/_helpers.ts`:
```ts
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import fs from 'node:fs'
import path from 'node:path'

let env: RulesTestEnvironment | null = null

export async function getTestEnv(): Promise<RulesTestEnvironment> {
  if (env) return env
  env = await initializeTestEnvironment({
    projectId: 'yatzy-rules-test',
    firestore: {
      rules: fs.readFileSync(path.resolve('firestore.rules'), 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  })
  return env
}
```

- [ ] **Step 2: highscores-regressiotestit**

`src/__tests__/rules/highscores.rules.test.ts`:
```ts
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getTestEnv } from './_helpers'

describe('rules: highscores (regression)', () => {
  beforeAll(async () => { await getTestEnv() })
  afterAll(async () => { const env = await getTestEnv(); await env.cleanup() })
  beforeEach(async () => { const env = await getTestEnv(); await env.clearFirestore() })

  it('luonti onnistuu validilla datalla', async () => {
    const env = await getTestEnv()
    const db = env.unauthenticatedContext().firestore()
    await assertSucceeds(addDoc(collection(db, 'highscores'), {
      playerName: 'Pekka', score: 200, createdAt: serverTimestamp(),
    }))
  })

  it('luonti epäonnistuu jos score > 374', async () => {
    const env = await getTestEnv()
    const db = env.unauthenticatedContext().firestore()
    await assertFails(addDoc(collection(db, 'highscores'), {
      playerName: 'Pekka', score: 999, createdAt: serverTimestamp(),
    }))
  })
})
```

- [ ] **Step 3: users-testit**

`src/__tests__/rules/users.rules.test.ts`:
```ts
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getTestEnv } from './_helpers'

describe('rules: users', () => {
  beforeAll(async () => { await getTestEnv() })
  afterAll(async () => { const env = await getTestEnv(); await env.cleanup() })
  beforeEach(async () => { const env = await getTestEnv(); await env.clearFirestore() })

  it('käyttäjä voi kirjoittaa oman profiilinsa', async () => {
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(db, 'users', 'alice'), {
      name: 'Alice', updatedAt: serverTimestamp(),
    }))
  })

  it('käyttäjä ei voi kirjoittaa toisen profiilia', async () => {
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(db, 'users', 'bob'), {
      name: 'Bob', updatedAt: serverTimestamp(),
    }))
  })

  it('liian pitkä nimi torjutaan', async () => {
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(db, 'users', 'alice'), {
      name: 'X'.repeat(21), updatedAt: serverTimestamp(),
    }))
  })
})
```

- [ ] **Step 4: Päivitä `firestore.rules`**

Korvaa koko tiedosto:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --- High-scoret (säilyy ennallaan) ---
    match /highscores/{doc} {
      allow read: if true;
      allow create: if
        request.resource.data.keys().hasOnly(['playerName', 'score', 'createdAt'])
        && request.resource.data.playerName is string
        && request.resource.data.playerName.size() > 0
        && request.resource.data.playerName.size() <= 20
        && request.resource.data.score is int
        && request.resource.data.score >= 0
        && request.resource.data.score <= 374
        && request.resource.data.createdAt == request.time;
      allow update, delete: if false;
    }

    // --- Käyttäjäprofiilit ---
    match /users/{uid} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['name', 'updatedAt'])
        && request.resource.data.name is string
        && request.resource.data.name.size() > 0
        && request.resource.data.name.size() <= 20
        && request.resource.data.updatedAt == request.time;
    }

    // --- Pelit (täydennetään Task C2 ja C3 myöhemmin) ---
    match /games/{gameId} {
      allow read: if true;
      allow create, update: if false;
      allow delete: if false;
    }
  }
}
```

- [ ] **Step 5: Aja sääntö-testit**

```bash
npm run test:rules
```

Vaatii että Firebase CLI on PATHissa. Jos virhe: `npx firebase emulators:exec --only firestore,auth 'vitest run src/__tests__/rules'`.
Odotettu: PASS (highscores + users).

- [ ] **Step 6: Commit**

```bash
git add firestore.rules src/__tests__/rules/
git commit -m "feat: add users rules and rules-test harness"
```

---

### Task C2: Säännöt: games-dokumentin luonti ja lobby-liittyminen

**Files:**
- Modify: `firestore.rules`
- Create: `src/__tests__/rules/games-create.rules.test.ts`
- Create: `src/__tests__/rules/games-join.rules.test.ts`

- [ ] **Step 1: Testit pelin luonnille**

`src/__tests__/rules/games-create.rules.test.ts`:
```ts
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getTestEnv } from './_helpers'

const validNewGame = (hostUid: string) => ({
  code: 'K7M2',
  hostUid,
  phase: 'lobby',
  players: [{ uid: hostUid, name: 'Alice', scores: {}, conceded: false }],
  dice: [],
  rollsLeft: 0,
  currentPlayerIndex: 0,
  turnsPlayed: 0,
  lastYatzy: false,
  lastBonus: false,
  winnerUid: null,
  highScoresWritten: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
})

describe('rules: games create', () => {
  beforeAll(async () => { await getTestEnv() })
  afterAll(async () => { const env = await getTestEnv(); await env.cleanup() })
  beforeEach(async () => { const env = await getTestEnv(); await env.clearFirestore() })

  it('host voi luoda pelin omalla uid:llä', async () => {
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(db, 'games', 'g1'), validNewGame('alice')))
  })

  it('hostUid ei saa olla muu kuin authin uid', async () => {
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(setDoc(doc(db, 'games', 'g1'), validNewGame('bob')))
  })

  it('phase pitää olla lobby uudessa pelissä', async () => {
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    const game = { ...validNewGame('alice'), phase: 'playing' }
    await assertFails(setDoc(doc(db, 'games', 'g1'), game))
  })

  it('uuden pelin players pitää olla [host]', async () => {
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    const game = { ...validNewGame('alice'), players: [] }
    await assertFails(setDoc(doc(db, 'games', 'g1'), game))
  })
})
```

- [ ] **Step 2: Testit lobbyyn liittymiselle**

`src/__tests__/rules/games-join.rules.test.ts`:
```ts
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getTestEnv } from './_helpers'

async function seedLobby(playerUids: string[]) {
  const env = await getTestEnv()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const adminDb = ctx.firestore()
    await setDoc(doc(adminDb, 'games', 'g1'), {
      code: 'K7M2',
      hostUid: playerUids[0],
      phase: 'lobby',
      players: playerUids.map(uid => ({ uid, name: uid, scores: {}, conceded: false })),
      dice: [], rollsLeft: 0, currentPlayerIndex: 0, turnsPlayed: 0,
      lastYatzy: false, lastBonus: false, winnerUid: null, highScoresWritten: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
  })
}

describe('rules: games join lobby', () => {
  beforeAll(async () => { await getTestEnv() })
  afterAll(async () => { const env = await getTestEnv(); await env.cleanup() })
  beforeEach(async () => { const env = await getTestEnv(); await env.clearFirestore() })

  it('uusi pelaaja voi liittyä lobbyyn', async () => {
    await seedLobby(['alice'])
    const env = await getTestEnv()
    const db = env.authenticatedContext('bob').firestore()
    await assertSucceeds(updateDoc(doc(db, 'games', 'g1'), {
      players: [
        { uid: 'alice', name: 'alice', scores: {}, conceded: false },
        { uid: 'bob', name: 'Bob', scores: {}, conceded: false },
      ],
      updatedAt: serverTimestamp(),
    }))
  })

  it('liittyminen ei saa muuttaa olemassa olevia pelaajia', async () => {
    await seedLobby(['alice'])
    const env = await getTestEnv()
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(db, 'games', 'g1'), {
      players: [
        { uid: 'alice', name: 'EVIL', scores: {}, conceded: false },
        { uid: 'bob', name: 'Bob', scores: {}, conceded: false },
      ],
      updatedAt: serverTimestamp(),
    }))
  })

  it('viides pelaaja ei voi liittyä', async () => {
    await seedLobby(['u1','u2','u3','u4'])
    const env = await getTestEnv()
    const db = env.authenticatedContext('u5').firestore()
    await assertFails(updateDoc(doc(db, 'games', 'g1'), {
      players: [
        { uid: 'u1', name: 'u1', scores: {}, conceded: false },
        { uid: 'u2', name: 'u2', scores: {}, conceded: false },
        { uid: 'u3', name: 'u3', scores: {}, conceded: false },
        { uid: 'u4', name: 'u4', scores: {}, conceded: false },
        { uid: 'u5', name: 'u5', scores: {}, conceded: false },
      ],
      updatedAt: serverTimestamp(),
    }))
  })

  it('uuden pelaajan uid pitää täsmätä authin uid:hen', async () => {
    await seedLobby(['alice'])
    const env = await getTestEnv()
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(db, 'games', 'g1'), {
      players: [
        { uid: 'alice', name: 'alice', scores: {}, conceded: false },
        { uid: 'mallory', name: 'Mallory', scores: {}, conceded: false },
      ],
      updatedAt: serverTimestamp(),
    }))
  })
})
```

- [ ] **Step 3: Päivitä `firestore.rules`**

Korvaa `match /games/{gameId}` -lohko:

```javascript
    match /games/{gameId} {
      allow read: if true;

      allow create: if request.auth != null && isValidNewGame();

      allow update: if request.auth != null
        && immutables()
        && (isJoinLobby() || isStartGame() || isTurnUpdate() || isConcedeAction() || isHighScoreMark());

      allow delete: if false;
    }
  }
}

function isValidNewGame() {
  let d = request.resource.data;
  return d.hostUid == request.auth.uid
    && d.phase == 'lobby'
    && d.code is string && d.code.size() == 4
    && d.players.size() == 1
    && d.players[0].uid == request.auth.uid
    && d.players[0].conceded == false
    && d.highScoresWritten == false
    && d.winnerUid == null
    && d.turnsPlayed == 0
    && d.rollsLeft == 0
    && d.createdAt == request.time
    && d.updatedAt == request.time;
}

function immutables() {
  let b = resource.data;
  let a = request.resource.data;
  return a.code == b.code
    && a.hostUid == b.hostUid
    && a.createdAt == b.createdAt
    && a.updatedAt == request.time;
}

function affected() {
  return request.resource.data.diff(resource.data).affectedKeys();
}

function isJoinLobby() {
  let b = resource.data;
  let a = request.resource.data;
  let uid = request.auth.uid;
  let newSize = a.players.size();
  let oldSize = b.players.size();
  return b.phase == 'lobby'
    && a.phase == 'lobby'
    && newSize == oldSize + 1
    && newSize <= 4
    && a.players[newSize - 1].uid == uid
    && a.players[newSize - 1].conceded == false
    && a.players[newSize - 1].scores.size() == 0
    // varmistetaan että prefix on koskemattomasti sama: tarkista jokainen alkuosa-indeksi
    && (oldSize == 0 || a.players[0] == b.players[0])
    && (oldSize <= 1 || a.players[1] == b.players[1])
    && (oldSize <= 2 || a.players[2] == b.players[2])
    && (oldSize <= 3 || a.players[3] == b.players[3])
    && affected().hasOnly(['players', 'updatedAt']);
}

// Placeholderit Task C3:lle, jotka palauttavat alustavasti false
function isStartGame() { return false; }
function isTurnUpdate() { return false; }
function isConcedeAction() { return false; }
function isHighScoreMark() { return false; }
```

- [ ] **Step 4: Aja sääntö-testit**

```bash
npm run test:rules
```
Odotettu: PASS.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules src/__tests__/rules/games-create.rules.test.ts src/__tests__/rules/games-join.rules.test.ts
git commit -m "feat: add firestore rules for game create and lobby join"
```

---

### Task C3: Säännöt: pelin aloitus, vuoron toiminnot, luovutus, high-score-merkintä

**Files:**
- Modify: `firestore.rules`
- Create: `src/__tests__/rules/games-play.rules.test.ts`

- [ ] **Step 1: Testit**

`src/__tests__/rules/games-play.rules.test.ts`:
```ts
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { getTestEnv } from './_helpers'

const dice5 = () => Array.from({ length: 5 }, () => ({ value: 1, locked: false }))

async function seed(state: Record<string, unknown>) {
  const env = await getTestEnv()
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'games', 'g1'), {
      code: 'K7M2',
      hostUid: 'alice',
      phase: 'lobby',
      players: [
        { uid: 'alice', name: 'Alice', scores: {}, conceded: false },
        { uid: 'bob', name: 'Bob', scores: {}, conceded: false },
      ],
      dice: [], rollsLeft: 0, currentPlayerIndex: 0, turnsPlayed: 0,
      lastYatzy: false, lastBonus: false, winnerUid: null, highScoresWritten: false,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      ...state,
    })
  })
}

describe('rules: games play', () => {
  beforeAll(async () => { await getTestEnv() })
  afterAll(async () => { const env = await getTestEnv(); await env.cleanup() })
  beforeEach(async () => { const env = await getTestEnv(); await env.clearFirestore() })

  it('host voi aloittaa pelin', async () => {
    await seed({})
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(db, 'games', 'g1'), {
      phase: 'playing',
      dice: dice5(),
      rollsLeft: 3,
      currentPlayerIndex: 0,
      turnsPlayed: 0,
      updatedAt: serverTimestamp(),
    }))
  })

  it('ei-host ei voi aloittaa peliä', async () => {
    await seed({})
    const env = await getTestEnv()
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(db, 'games', 'g1'), {
      phase: 'playing', dice: dice5(), rollsLeft: 3,
      currentPlayerIndex: 0, turnsPlayed: 0, updatedAt: serverTimestamp(),
    }))
  })

  it('currentPlayer voi heittää nopat', async () => {
    await seed({ phase: 'playing', dice: dice5(), rollsLeft: 3, currentPlayerIndex: 0 })
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(db, 'games', 'g1'), {
      dice: dice5().map(d => ({ value: 6, locked: false })),
      rollsLeft: 2,
      lastYatzy: false,
      lastBonus: false,
      updatedAt: serverTimestamp(),
    }))
  })

  it('toinen pelaaja ei voi heittää nopat', async () => {
    await seed({ phase: 'playing', dice: dice5(), rollsLeft: 3, currentPlayerIndex: 0 })
    const env = await getTestEnv()
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(db, 'games', 'g1'), {
      dice: dice5().map(d => ({ value: 6, locked: false })),
      rollsLeft: 2,
      lastYatzy: false,
      lastBonus: false,
      updatedAt: serverTimestamp(),
    }))
  })

  it('host voi merkitä pelaajan luovuttaneeksi', async () => {
    await seed({ phase: 'playing', dice: dice5(), rollsLeft: 3, currentPlayerIndex: 1 })
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(db, 'games', 'g1'), {
      players: [
        { uid: 'alice', name: 'Alice', scores: {}, conceded: false },
        { uid: 'bob', name: 'Bob', scores: { '0':0,'1':0,'2':0,'3':0,'4':0,'5':0,'6':0,'7':0,'8':0,'9':0,'10':0,'11':0,'12':0,'13':0,'14':0 }, conceded: true },
      ],
      currentPlayerIndex: 0,
      updatedAt: serverTimestamp(),
    }))
  })

  it('ei-host ei voi merkitä toista luovuttaneeksi', async () => {
    await seed({ phase: 'playing', dice: dice5(), rollsLeft: 3, currentPlayerIndex: 1 })
    const env = await getTestEnv()
    const db = env.authenticatedContext('bob').firestore()
    await assertFails(updateDoc(doc(db, 'games', 'g1'), {
      players: [
        { uid: 'alice', name: 'Alice', scores: { '0':0 }, conceded: true },
        { uid: 'bob', name: 'Bob', scores: {}, conceded: false },
      ],
      currentPlayerIndex: 0,
      updatedAt: serverTimestamp(),
    }))
  })

  it('high-score-bitin voi asettaa vain host pelin loputtua', async () => {
    await seed({ phase: 'finished', highScoresWritten: false })
    const env = await getTestEnv()
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(updateDoc(doc(db, 'games', 'g1'), {
      highScoresWritten: true,
      updatedAt: serverTimestamp(),
    }))
  })
})
```

- [ ] **Step 2: Päivitä rules-funktiot**

Korvaa Task C2:n placeholder-funktiot (`isStartGame`, `isTurnUpdate`, `isConcedeAction`, `isHighScoreMark`) `firestore.rules`-tiedostossa:

```javascript
function isStartGame() {
  let b = resource.data;
  let a = request.resource.data;
  return request.auth.uid == b.hostUid
    && b.phase == 'lobby'
    && a.phase == 'playing'
    && a.players.size() >= 2
    && a.players.size() == b.players.size()  // pelaajat eivät vaihdu lukumäärältään (vain järjestys saa vaihtua)
    && a.currentPlayerIndex >= 0
    && a.currentPlayerIndex < a.players.size()
    && a.rollsLeft == 3
    && a.turnsPlayed == 0
    && a.dice.size() == 5
    && affected().hasOnly(['phase', 'players', 'dice', 'rollsLeft', 'currentPlayerIndex', 'turnsPlayed', 'updatedAt']);
}

function isTurnUpdate() {
  let b = resource.data;
  let a = request.resource.data;
  let uid = request.auth.uid;
  return b.phase == 'playing'
    && b.players[b.currentPlayerIndex].uid == uid
    && a.players.size() == b.players.size()
    // vain currentPlayer-pelaajan tila saa muuttua players-taulussa (vain scores)
    // muut pelaajat pysyvät identtisinä
    && (b.currentPlayerIndex == 0 || a.players[0] == b.players[0])
    && (b.currentPlayerIndex == 1 || a.players[1] == b.players[1])
    && (b.currentPlayerIndex == 2 || a.players[2] == b.players[2])
    && (b.currentPlayerIndex == 3 || a.players[3] == b.players[3])
    // jos currentPlayer muuttuu, vain scores muuttuu (ei uid/name/conceded)
    && a.players[b.currentPlayerIndex].uid == b.players[b.currentPlayerIndex].uid
    && a.players[b.currentPlayerIndex].name == b.players[b.currentPlayerIndex].name
    && a.players[b.currentPlayerIndex].conceded == b.players[b.currentPlayerIndex].conceded
    // affectedKeys voi sisältää vain pelitilakentät
    && affected().hasOnly([
      'dice', 'rollsLeft', 'lastYatzy', 'lastBonus',
      'players', 'currentPlayerIndex', 'turnsPlayed',
      'phase', 'winnerUid', 'updatedAt'
    ])
    // phase voi muuttua vain finishediksi
    && (a.phase == 'playing' || a.phase == 'finished');
}

function isConcedeAction() {
  let b = resource.data;
  let a = request.resource.data;
  return request.auth.uid == b.hostUid
    && b.phase == 'playing'
    && (a.phase == 'playing' || a.phase == 'finished')
    && a.players.size() == b.players.size()
    && affected().hasOnly(['players', 'currentPlayerIndex', 'phase', 'winnerUid', 'updatedAt']);
}

function isHighScoreMark() {
  let b = resource.data;
  let a = request.resource.data;
  return request.auth.uid == b.hostUid
    && b.phase == 'finished'
    && a.phase == 'finished'
    && b.highScoresWritten == false
    && a.highScoresWritten == true
    && affected().hasOnly(['highScoresWritten', 'updatedAt']);
}
```

- [ ] **Step 3: Aja sääntö-testit**

```bash
npm run test:rules
```
Odotettu: PASS kaikki.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules src/__tests__/rules/games-play.rules.test.ts
git commit -m "feat: complete firestore rules for game lifecycle"
```

---

## Phase D – Online-game-store

### Task D1: onlineGame.ts skeleton + subscribe + applyDocToState

**Files:**
- Create: `src/stores/onlineGame.ts`
- Create: `src/__tests__/onlineGame.test.ts`

- [ ] **Step 1: Testit**

`src/__tests__/onlineGame.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../firebase', () => ({
  db: {},
  ensureSignedIn: vi.fn().mockResolvedValue({ uid: 'mock-uid' }),
}))

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore')
  return { ...actual,
    doc: vi.fn(() => ({})),
    onSnapshot: vi.fn(() => () => {}),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    setDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(() => 'TIMESTAMP_MARKER'),
  }
})

import { useOnlineGameStore } from '../stores/onlineGame'
import { Category } from '../types/game'

describe('onlineGame store: applyDocToState', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('peilaa GameDoc-kentät Pinia-tilaan', () => {
    const s = useOnlineGameStore()
    s._applyDocToState({
      code: 'K7M2',
      hostUid: 'alice',
      phase: 'playing',
      players: [
        { uid: 'alice', name: 'A', scores: { '0': 3 }, conceded: false },
        { uid: 'bob', name: 'B', scores: {}, conceded: false },
      ],
      dice: [{ value: 6, locked: true }, { value: 1, locked: false }, { value: 2, locked: false }, { value: 3, locked: false }, { value: 4, locked: false }],
      rollsLeft: 2,
      currentPlayerIndex: 1,
      turnsPlayed: 5,
      lastYatzy: false,
      lastBonus: false,
      winnerUid: null,
      highScoresWritten: false,
    } as any)
    expect(s.code).toBe('K7M2')
    expect(s.phase).toBe('playing')
    expect(s.players[0].scores.get(Category.Ones)).toBe(3)
    expect(s.dice[0].locked).toBe(true)
    expect(s.currentPlayerIndex).toBe(1)
  })
})
```

- [ ] **Step 2: Toteuta skeleton**

`src/stores/onlineGame.ts`:
```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import {
  Category,
  MAX_ROLLS,
  type GameDoc,
  type Die,
} from '../types/game'
import {
  toLocalPlayer,
  type LocalOnlinePlayer,
} from '../gameDocSerialization'
import {
  upperSum as calcUpperSum,
  upperBonus as calcUpperBonus,
  lowerSum as calcLowerSum,
  totalScore as calcTotalScore,
  findWinner,
} from '../scoreHelpers'
import { useProfileStore } from './profile'

export const useOnlineGameStore = defineStore('onlineGame', () => {
  // --- Lokaali UI-tila ---
  const gameId = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null
  const connectionState = ref<'idle' | 'loading' | 'connected' | 'error'>('idle')
  const errorMessage = ref<string | null>(null)

  // --- GameDoc-peilaus ---
  const code = ref('')
  const hostUid = ref('')
  const phase = ref<'lobby' | 'playing' | 'finished'>('lobby')
  const players = ref<LocalOnlinePlayer[]>([])
  const dice = ref<Die[]>([])
  const rollsLeft = ref(MAX_ROLLS)
  const currentPlayerIndex = ref(0)
  const turnsPlayed = ref(0)
  const lastYatzy = ref(false)
  const lastBonus = ref(false)
  const winnerUid = ref<string | null>(null)
  const highScoresWritten = ref(false)

  // --- Computed ---
  const profile = useProfileStore()
  const myUid = computed(() => profile.uid ?? '')
  const isHost = computed(() => myUid.value !== '' && myUid.value === hostUid.value)
  const currentPlayer = computed(() => players.value[currentPlayerIndex.value])
  const isMyTurn = computed(() =>
    phase.value === 'playing' &&
    currentPlayer.value?.uid === myUid.value
  )
  const canInteract = computed(() => isMyTurn.value)
  const hasRolled = computed(() => rollsLeft.value < MAX_ROLLS)
  const canUndo = computed(() => false)
  const isGameOver = computed(() => phase.value === 'finished')
  const winner = computed(() => {
    if (phase.value !== 'finished') return null
    return findWinner(players.value)
  })

  function upperSum(p: LocalOnlinePlayer) { return calcUpperSum(p) }
  function upperBonus(p: LocalOnlinePlayer) { return calcUpperBonus(p) }
  function lowerSum(p: LocalOnlinePlayer) { return calcLowerSum(p) }
  function totalScore(p: LocalOnlinePlayer) { return calcTotalScore(p) }

  const potentialScores = computed(() => new Map<Category, number>()) // täydennetään D5:ssä

  function _applyDocToState(d: GameDoc) {
    code.value = d.code
    hostUid.value = d.hostUid
    phase.value = d.phase
    players.value = d.players.map(toLocalPlayer)
    dice.value = d.dice.map(x => ({ value: x.value, locked: x.locked }))
    rollsLeft.value = d.rollsLeft
    currentPlayerIndex.value = d.currentPlayerIndex
    turnsPlayed.value = d.turnsPlayed
    lastYatzy.value = d.lastYatzy
    lastBonus.value = d.lastBonus
    winnerUid.value = d.winnerUid
    highScoresWritten.value = d.highScoresWritten
  }

  function subscribe(id: string) {
    unsubscribeAll()
    gameId.value = id
    connectionState.value = 'loading'
    errorMessage.value = null
    unsubscribe = onSnapshot(
      doc(db, 'games', id),
      (snap) => {
        if (!snap.exists()) {
          errorMessage.value = 'Peli on poistettu tai sitä ei löytynyt.'
          connectionState.value = 'error'
          return
        }
        _applyDocToState(snap.data() as GameDoc)
        connectionState.value = 'connected'
      },
      (err) => {
        errorMessage.value = err.message
        connectionState.value = 'error'
      },
    )
  }

  function unsubscribeAll() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    gameId.value = null
    connectionState.value = 'idle'
  }

  return {
    // state
    gameId, connectionState, errorMessage,
    code, hostUid, phase, players, dice, rollsLeft,
    currentPlayerIndex, turnsPlayed, lastYatzy, lastBonus, winnerUid, highScoresWritten,
    // computed
    myUid, isHost, currentPlayer, isMyTurn, canInteract, hasRolled, canUndo, isGameOver, winner, potentialScores,
    // methods
    upperSum, upperBonus, lowerSum, totalScore,
    subscribe, unsubscribeAll, _applyDocToState,
  }
})
```

- [ ] **Step 3: Aja testit + commit**

```bash
npx vitest run src/__tests__/onlineGame.test.ts
git add src/stores/onlineGame.ts src/__tests__/onlineGame.test.ts
git commit -m "feat: scaffold online game store with snapshot mirroring"
```

---

### Task D2: createGame + leaveGame + lobby-toiminnot

**Files:**
- Modify: `src/stores/onlineGame.ts`
- Modify: `src/__tests__/onlineGame.test.ts`

- [ ] **Step 1: Lisää testit**

Lisää `src/__tests__/onlineGame.test.ts`:n loppuun:
```ts
import * as firestore from 'firebase/firestore'

describe('onlineGame store: createGame', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('createGame asettaa hostUid:n, koodin ja yhden pelaajan', async () => {
    const s = useOnlineGameStore()
    const setDocMock = vi.mocked(firestore.setDoc)
    setDocMock.mockResolvedValueOnce(undefined)

    const id = await s.createGame('Alice')

    expect(typeof id).toBe('string')
    expect(setDocMock).toHaveBeenCalled()
    const [, data] = setDocMock.mock.calls[0]!
    expect((data as any).hostUid).toBe('mock-uid')
    expect((data as any).phase).toBe('lobby')
    expect((data as any).players).toHaveLength(1)
    expect((data as any).players[0].uid).toBe('mock-uid')
    expect((data as any).players[0].name).toBe('Alice')
    expect((data as any).code).toMatch(/^[A-HJKMNP-Z2-9]{4}$/)
  })
})
```

- [ ] **Step 2: Toteuta createGame ja leaveGame**

Lisää `src/stores/onlineGame.ts`:n storen toiminnot:
```ts
import { setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore'
import { generateRoomCode } from '../codeGenerator'

// ... olemassa olevat importit/state ...

async function createGame(name: string): Promise<string> {
  await profile.init()
  const uid = profile.uid
  if (!uid) throw new Error('Sisäänkirjautuminen ei valmis')
  await profile.setDisplayName(name)

  const ref = doc(collection(db, 'games'))
  const code = generateRoomCode()
  await setDoc(ref, {
    code,
    hostUid: uid,
    phase: 'lobby',
    players: [{ uid, name, scores: {}, conceded: false }],
    dice: [],
    rollsLeft: 0,
    currentPlayerIndex: 0,
    turnsPlayed: 0,
    lastYatzy: false,
    lastBonus: false,
    winnerUid: null,
    highScoresWritten: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  subscribe(ref.id)
  return ref.id
}

async function leaveGame() {
  // Yksinkertaisin malli: vain lopetetaan kuuntelu omalla puolella.
  // Pelin lobby jää muille; jos olen ainoa pelaaja, peli jää orvoksi mutta phase-säännöt estävät
  // sen uudelleenkäytön (uid täytyy täsmätä).
  unsubscribeAll()
}
```

Lisää palautusobjektiin: `createGame, leaveGame`.

- [ ] **Step 3: PASS + commit**

```bash
npx vitest run src/__tests__/onlineGame.test.ts
git add src/stores/onlineGame.ts src/__tests__/onlineGame.test.ts
git commit -m "feat: add createGame and leaveGame to online store"
```

---

### Task D3: joinGame koodilla

**Files:**
- Modify: `src/stores/onlineGame.ts`
- Modify: `src/__tests__/onlineGame.test.ts`

- [ ] **Step 1: Testit**

```ts
describe('onlineGame store: joinGame', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('joinGame normalisoi koodin uppercaseksi ennen kyselyä', async () => {
    const s = useOnlineGameStore()
    const getDocsMock = vi.mocked(firestore.getDocs)
    getDocsMock.mockResolvedValueOnce({
      empty: false, docs: [{
        id: 'g1',
        data: () => ({
          code: 'K7M2', phase: 'lobby',
          players: [{ uid: 'alice', name: 'A', scores: {}, conceded: false }],
        }),
      }],
    } as any)
    const updateDocMock = vi.mocked(firestore.updateDoc)
    updateDocMock.mockResolvedValueOnce(undefined)
    await s.joinGame(' k7m2 ', 'Bob')
    const [, data] = updateDocMock.mock.calls[0]!
    expect((data as any).players).toHaveLength(2)
    expect((data as any).players[1].uid).toBe('mock-uid')
    expect((data as any).players[1].name).toBe('Bob')
  })

  it('joinGame heittää virheen jos koodia ei löydy', async () => {
    const s = useOnlineGameStore()
    vi.mocked(firestore.getDocs).mockResolvedValueOnce({ empty: true, docs: [] } as any)
    await expect(s.joinGame('XXXX', 'Bob')).rejects.toThrow(/ei löytynyt/i)
  })
})
```

Lisää myös `getDocs` ja `query` mockaukseen `firebase/firestore`-mockissa tiedoston alussa:
```ts
getDocs: vi.fn(),
query: vi.fn((..._args) => ({})),
where: vi.fn((..._args) => ({})),
```

- [ ] **Step 2: Toteuta joinGame**

```ts
import { query, where, getDocs } from 'firebase/firestore'
import { normalizeRoomCode, isValidRoomCode } from '../codeGenerator'
import { toFirestorePlayer } from '../gameDocSerialization'

async function joinGame(rawCode: string, name: string): Promise<void> {
  await profile.init()
  const uid = profile.uid
  if (!uid) throw new Error('Sisäänkirjautuminen ei valmis')

  const code = normalizeRoomCode(rawCode)
  if (!isValidRoomCode(code)) throw new Error('Koodi on virheellinen.')

  await profile.setDisplayName(name)

  const q = query(
    collection(db, 'games'),
    where('code', '==', code),
    where('phase', 'in', ['lobby', 'playing']),
  )
  const snap = await getDocs(q)
  if (snap.empty) throw new Error(`Koodia ${code} ei löytynyt.`)
  const docSnap = snap.docs[0]!
  const data = docSnap.data() as GameDoc

  // Jos olen jo pelissä → vain liity (subscribe)
  if (data.players.some(p => p.uid === uid)) {
    subscribe(docSnap.id)
    return
  }

  if (data.phase !== 'lobby') throw new Error('Peli on jo alkanut.')
  if (data.players.length >= 4) throw new Error('Peli on täynnä.')

  const newPlayers = [
    ...data.players,
    { uid, name, scores: {}, conceded: false },
  ]
  await updateDoc(docSnap.ref, {
    players: newPlayers,
    updatedAt: serverTimestamp(),
  })
  subscribe(docSnap.id)
}
```

Lisää `joinGame` palautusobjektiin.

- [ ] **Step 3: PASS + commit**

```bash
npx vitest run src/__tests__/onlineGame.test.ts
git add src/stores/onlineGame.ts src/__tests__/onlineGame.test.ts
git commit -m "feat: add joinGame by code"
```

---

### Task D4: startGame (host shufflaa pelaajat)

**Files:**
- Modify: `src/stores/onlineGame.ts`
- Modify: `src/__tests__/onlineGame.test.ts`

- [ ] **Step 1: Testit**

```ts
describe('onlineGame store: startGame', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('startGame shufflaa pelaajat ja asettaa phase = playing', async () => {
    const s = useOnlineGameStore()
    s.gameId = 'g1' as any
    ;(s as any).hostUid = 'mock-uid'
    s.players = [
      { uid: 'mock-uid', name: 'A', scores: new Map(), conceded: false },
      { uid: 'bob', name: 'B', scores: new Map(), conceded: false },
    ]
    s.phase = 'lobby' as any
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined)
    await s.startGame()
    const [, data] = vi.mocked(firestore.updateDoc).mock.calls[0]!
    expect((data as any).phase).toBe('playing')
    expect((data as any).rollsLeft).toBe(3)
    expect((data as any).dice).toHaveLength(5)
    expect((data as any).players).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Toteuta**

```ts
function gameRef() {
  if (!gameId.value) throw new Error('Ei aktiivista peliä')
  return doc(db, 'games', gameId.value)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

function createEmptyDice() {
  return Array.from({ length: 5 }, () => ({ value: 1, locked: false }))
}

async function startGame(): Promise<void> {
  if (!isHost.value) throw new Error('Vain isäntä voi aloittaa pelin')
  if (players.value.length < 2) throw new Error('Tarvitaan vähintään 2 pelaajaa')
  const shuffled = shuffle(players.value).map(toFirestorePlayer)
  await updateDoc(gameRef(), {
    phase: 'playing',
    players: shuffled,
    dice: createEmptyDice(),
    rollsLeft: MAX_ROLLS,
    currentPlayerIndex: 0,
    turnsPlayed: 0,
    updatedAt: serverTimestamp(),
  })
}
```

Lisää `startGame` palautusobjektiin.

- [ ] **Step 3: PASS + commit**

```bash
npx vitest run src/__tests__/onlineGame.test.ts
git add src/stores/onlineGame.ts src/__tests__/onlineGame.test.ts
git commit -m "feat: add startGame with random player order"
```

---

### Task D5: rollDice + toggleLock + potentialScores

**Files:**
- Modify: `src/stores/onlineGame.ts`
- Modify: `src/__tests__/onlineGame.test.ts`

- [ ] **Step 1: Testit**

```ts
describe('onlineGame store: rollDice & toggleLock', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  function setupActive(s: ReturnType<typeof useOnlineGameStore>) {
    s.gameId = 'g1' as any
    ;(s as any).hostUid = 'mock-uid'
    s.players = [{ uid: 'mock-uid', name: 'A', scores: new Map(), conceded: false }]
    s.phase = 'playing' as any
    s.dice = Array.from({ length: 5 }, () => ({ value: 1, locked: false }))
    s.rollsLeft = 3
    s.currentPlayerIndex = 0
  }

  it('rollDice ei tee mitään jos ei ole oma vuoro', async () => {
    const s = useOnlineGameStore()
    setupActive(s)
    s.players = [{ uid: 'someone-else', name: 'X', scores: new Map(), conceded: false }]
    s.currentPlayerIndex = 0
    await s.rollDice()
    expect(vi.mocked(firestore.updateDoc)).not.toHaveBeenCalled()
  })

  it('rollDice arpoo lukitsemattomat nopat ja vähentää rollsLeft', async () => {
    const s = useOnlineGameStore()
    setupActive(s)
    s.dice[0]!.locked = true
    s.dice[0]!.value = 6
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined)
    await s.rollDice()
    const [, data] = vi.mocked(firestore.updateDoc).mock.calls[0]!
    expect((data as any).rollsLeft).toBe(2)
    expect((data as any).dice[0]).toEqual({ value: 6, locked: true })
    for (const d of (data as any).dice) {
      expect(d.value).toBeGreaterThanOrEqual(1)
      expect(d.value).toBeLessThanOrEqual(6)
    }
  })

  it('toggleLock ei toimi ennen ensimmäistä heittoa', async () => {
    const s = useOnlineGameStore()
    setupActive(s)
    s.rollsLeft = 3 // ei ole heittänyt
    await s.toggleLock(0)
    expect(vi.mocked(firestore.updateDoc)).not.toHaveBeenCalled()
  })

  it('toggleLock vaihtaa lukon tilan', async () => {
    const s = useOnlineGameStore()
    setupActive(s)
    s.rollsLeft = 2
    s.dice[2]!.locked = false
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined)
    await s.toggleLock(2)
    const [, data] = vi.mocked(firestore.updateDoc).mock.calls[0]!
    expect((data as any).dice[2].locked).toBe(true)
  })
})
```

- [ ] **Step 2: Toteuta**

Lisää `src/stores/onlineGame.ts`:
```ts
import { ALL_CATEGORIES } from '../types/game'
import { calcScore } from '../scoring'

function rollD6() { return Math.floor(Math.random() * 6) + 1 }

async function rollDice(): Promise<void> {
  if (!isMyTurn.value || rollsLeft.value <= 0) return
  const newDice = dice.value.map(d => d.locked ? { ...d } : { value: rollD6(), locked: false })
  const allSame = newDice.every(d => d.value === newDice[0]!.value)
  const yatzyAlreadyScored = currentPlayer.value?.scores.has(Category.Yatzy) ?? false
  await updateDoc(gameRef(), {
    dice: newDice,
    rollsLeft: rollsLeft.value - 1,
    lastYatzy: allSame && !yatzyAlreadyScored,
    lastBonus: false,
    updatedAt: serverTimestamp(),
  })
}

async function toggleLock(index: number): Promise<void> {
  if (!isMyTurn.value || !hasRolled.value || rollsLeft.value <= 0) return
  const newDice = dice.value.map((d, i) =>
    i === index ? { ...d, locked: !d.locked } : { ...d },
  )
  await updateDoc(gameRef(), {
    dice: newDice,
    updatedAt: serverTimestamp(),
  })
}
```

Korvaa potentialScores-määrittely:
```ts
const potentialScores = computed(() => {
  if (!hasRolled.value || !currentPlayer.value) return new Map<Category, number>()
  const result = new Map<Category, number>()
  const values = dice.value.map(d => d.value)
  for (const cat of ALL_CATEGORIES) {
    if (!currentPlayer.value.scores.has(cat)) {
      result.set(cat, calcScore(values, cat))
    }
  }
  return result
})
```

Lisää `rollDice, toggleLock` palautusobjektiin.

- [ ] **Step 3: PASS + commit**

```bash
npx vitest run src/__tests__/onlineGame.test.ts
git add src/stores/onlineGame.ts src/__tests__/onlineGame.test.ts
git commit -m "feat: add rollDice, toggleLock, potentialScores to online store"
```

---

### Task D6: selectCategory + auto-finished + high-score-kirjoitus

**Files:**
- Modify: `src/stores/onlineGame.ts`
- Modify: `src/__tests__/onlineGame.test.ts`
- Modify: `src/firebase.ts` (lisätään `savePlayerScores` käyttöön)

- [ ] **Step 1: Testit**

```ts
import { NUM_ROUNDS } from '../types/game'

describe('onlineGame store: selectCategory', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('selectCategory tallentaa pisteet, vaihtaa vuoron, resetoi nopat', async () => {
    const s = useOnlineGameStore()
    s.gameId = 'g1' as any
    ;(s as any).hostUid = 'mock-uid'
    s.players = [
      { uid: 'mock-uid', name: 'A', scores: new Map(), conceded: false },
      { uid: 'bob', name: 'B', scores: new Map(), conceded: false },
    ]
    s.phase = 'playing' as any
    s.dice = Array.from({ length: 5 }, () => ({ value: 3, locked: false }))
    s.rollsLeft = 1
    s.currentPlayerIndex = 0
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined)
    await s.selectCategory(Category.Threes)
    const [, data] = vi.mocked(firestore.updateDoc).mock.calls[0]!
    expect((data as any).players[0].scores['2']).toBe(15) // viisi kolmosta
    expect((data as any).currentPlayerIndex).toBe(1)
    expect((data as any).rollsLeft).toBe(3)
    expect((data as any).turnsPlayed).toBe(1)
    expect((data as any).phase).toBe('playing')
  })

  it('viimeinen scorecategoria päättää pelin', async () => {
    const s = useOnlineGameStore()
    s.gameId = 'g1' as any
    ;(s as any).hostUid = 'mock-uid'
    const fullScores = new Map<Category, number>()
    for (let i = 0; i < NUM_ROUNDS - 1; i++) fullScores.set(i as Category, 0)
    s.players = [{ uid: 'mock-uid', name: 'A', scores: fullScores, conceded: false }]
    s.phase = 'playing' as any
    s.dice = Array.from({ length: 5 }, () => ({ value: 6, locked: false }))
    s.rollsLeft = 1
    s.currentPlayerIndex = 0
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined)
    await s.selectCategory(Category.Yatzy)
    const [, data] = vi.mocked(firestore.updateDoc).mock.calls[0]!
    expect((data as any).phase).toBe('finished')
    expect((data as any).winnerUid).toBe('mock-uid')
  })
})
```

- [ ] **Step 2: Toteuta selectCategory + writeHighScoresAndMark**

```ts
import { UPPER_BONUS_LIMIT, NUM_ROUNDS } from '../types/game'
import { savePlayerScores } from '../firebase'

function findNextActivePlayer(ps: LocalOnlinePlayer[], fromIndex: number): number {
  const n = ps.length
  for (let step = 1; step <= n; step++) {
    const i = (fromIndex + step) % n
    const p = ps[i]!
    if (p.conceded) continue
    if (p.scores.size >= NUM_ROUNDS) continue
    return i
  }
  return fromIndex
}

async function selectCategory(category: Category): Promise<void> {
  if (!isMyTurn.value || !hasRolled.value) return
  const player = currentPlayer.value
  if (!player || player.scores.has(category)) return

  const values = dice.value.map(d => d.value)
  const score = calcScore(values, category)
  const newPlayers: LocalOnlinePlayer[] = players.value.map(p => ({
    ...p,
    scores: new Map(p.scores),
  }))
  newPlayers[currentPlayerIndex.value]!.scores.set(category, score)

  const hadBonus = calcUpperSum(player) >= UPPER_BONUS_LIMIT
  const hasBonus = calcUpperSum(newPlayers[currentPlayerIndex.value]!) >= UPPER_BONUS_LIMIT
  const allDone = newPlayers.every(p => p.scores.size >= NUM_ROUNDS || p.conceded)
  const nextIndex = allDone ? currentPlayerIndex.value : findNextActivePlayer(newPlayers, currentPlayerIndex.value)
  const newPhase: 'playing' | 'finished' = allDone ? 'finished' : 'playing'
  const w = allDone ? findWinner(newPlayers) : null

  await updateDoc(gameRef(), {
    players: newPlayers.map(toFirestorePlayer),
    currentPlayerIndex: nextIndex,
    turnsPlayed: turnsPlayed.value + 1,
    dice: createEmptyDice(),
    rollsLeft: MAX_ROLLS,
    lastBonus: !hadBonus && hasBonus,
    lastYatzy: false,
    phase: newPhase,
    winnerUid: w?.uid ?? null,
    updatedAt: serverTimestamp(),
  })
}

async function writeHighScoresAndMark(): Promise<void> {
  if (!isHost.value) return
  if (phase.value !== 'finished') return
  if (highScoresWritten.value) return
  await savePlayerScores(
    players.value.map(p => ({ name: p.name, score: calcTotalScore(p) })),
  )
  await updateDoc(gameRef(), {
    highScoresWritten: true,
    updatedAt: serverTimestamp(),
  })
}
```

Päivitä subscribe-callbackia: kun phase muuttuu finishediksi ja olen host, kutsu writeHighScoresAndMark.

Korvaa `subscribe`-funktion onSnapshot-callback:
```ts
unsubscribe = onSnapshot(
  doc(db, 'games', id),
  (snap) => {
    if (!snap.exists()) {
      errorMessage.value = 'Peli on poistettu tai sitä ei löytynyt.'
      connectionState.value = 'error'
      return
    }
    const before = phase.value
    _applyDocToState(snap.data() as GameDoc)
    connectionState.value = 'connected'
    if (before !== 'finished' && phase.value === 'finished' && isHost.value && !highScoresWritten.value) {
      void writeHighScoresAndMark()
    }
  },
  (err) => {
    errorMessage.value = err.message
    connectionState.value = 'error'
  },
)
```

Lisää `selectCategory, writeHighScoresAndMark` palautusobjektiin.

- [ ] **Step 3: PASS + commit**

```bash
npx vitest run src/__tests__/onlineGame.test.ts
git add src/stores/onlineGame.ts src/__tests__/onlineGame.test.ts
git commit -m "feat: add selectCategory and host-side high-score write"
```

---

### Task D7: concedePlayer

**Files:**
- Modify: `src/stores/onlineGame.ts`
- Modify: `src/__tests__/onlineGame.test.ts`

- [ ] **Step 1: Testit**

```ts
describe('onlineGame store: concedePlayer', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('concedePlayer asettaa täyttämättömät kategoriat nolliksi ja conceded=true', async () => {
    const s = useOnlineGameStore()
    s.gameId = 'g1' as any
    ;(s as any).hostUid = 'mock-uid'
    s.players = [
      { uid: 'mock-uid', name: 'A', scores: new Map(), conceded: false },
      { uid: 'bob', name: 'B', scores: new Map([[Category.Ones, 3]]), conceded: false },
    ]
    s.phase = 'playing' as any
    s.currentPlayerIndex = 1
    vi.mocked(firestore.updateDoc).mockResolvedValueOnce(undefined)

    await s.concedePlayer('bob')

    const [, data] = vi.mocked(firestore.updateDoc).mock.calls[0]!
    const bobScores = (data as any).players[1].scores
    expect(bobScores['0']).toBe(3) // ei nollata jo täytettyä
    expect(bobScores['14']).toBe(0)
    expect((data as any).players[1].conceded).toBe(true)
    expect((data as any).currentPlayerIndex).toBe(0)
  })
})
```

- [ ] **Step 2: Toteuta**

```ts
async function concedePlayer(uid: string): Promise<void> {
  if (!isHost.value) return
  if (phase.value !== 'playing') return
  const idx = players.value.findIndex(p => p.uid === uid)
  if (idx === -1) return

  const newPlayers = players.value.map(p => ({ ...p, scores: new Map(p.scores) }))
  const target = newPlayers[idx]!
  for (const cat of ALL_CATEGORIES) {
    if (!target.scores.has(cat)) target.scores.set(cat, 0)
  }
  target.conceded = true

  const allDone = newPlayers.every(p => p.scores.size >= NUM_ROUNDS || p.conceded)
  const newPhase: 'playing' | 'finished' = allDone ? 'finished' : 'playing'
  const w = allDone ? findWinner(newPlayers) : null

  // Jos luovuttaja oli vuorossa, vaihda vuoro
  let nextIndex = currentPlayerIndex.value
  if (currentPlayerIndex.value === idx && !allDone) {
    nextIndex = findNextActivePlayer(newPlayers, idx)
  }

  await updateDoc(gameRef(), {
    players: newPlayers.map(toFirestorePlayer),
    currentPlayerIndex: nextIndex,
    phase: newPhase,
    winnerUid: w?.uid ?? null,
    updatedAt: serverTimestamp(),
  })
}
```

Lisää `concedePlayer` palautusobjektiin.

- [ ] **Step 3: PASS + commit**

```bash
npx vitest run src/__tests__/onlineGame.test.ts
git add src/stores/onlineGame.ts src/__tests__/onlineGame.test.ts
git commit -m "feat: add concedePlayer (host marks player as resigned)"
```

---

## Phase E – UI-komponentit

### Task E1: ModeSelect ja useActiveGame-composable

**Files:**
- Create: `src/components/ModeSelect.vue`
- Create: `src/composables/useActiveGame.ts`
- Create: `src/stores/appMode.ts`

`useActiveGame` palauttaa joko hot-seat-storen tai online-storen riippuen `appMode`-storen tilasta. App.vue asettaa moden.

- [ ] **Step 1: appMode-store**

`src/stores/appMode.ts`:
```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type AppMode = 'hotseat' | 'online'

export const useAppModeStore = defineStore('appMode', () => {
  const mode = ref<AppMode>('hotseat')
  function setMode(m: AppMode) { mode.value = m }
  return { mode, setMode }
})
```

- [ ] **Step 2: useActiveGame**

`src/composables/useActiveGame.ts`:
```ts
import { useAppModeStore } from '../stores/appMode'
import { useGameStore } from '../stores/game'
import { useOnlineGameStore } from '../stores/onlineGame'

export function useActiveGame() {
  const appMode = useAppModeStore()
  if (appMode.mode === 'online') return useOnlineGameStore()
  return useGameStore()
}
```

Huom: Pinia-tyypeillä molemmat storet eivät palauta täysin samaa rakennetta. `useActiveGame()`:n paluuarvolla on yhteinen aliotsikko (TypeScriptin structural typing): kentät joita kumpikin tarjoaa, ovat aliotsikolla `dice`, `players`, `currentPlayer`, `rollsLeft`, `hasRolled`, `isGameOver`, `phase`, `roll/rollDice`, `toggleLock`, `selectCategory`, `potentialScores`, `lastYatzy`, `lastBonus`, `currentRound?`. Mismatch nimissä: hot-seat-storessa metodi on `roll`, online-storessa `rollDice`. Tämä yhdenmukaistetaan E5:ssä lisäämällä `roll()`-alias online-storeen. Tee se nyt jotta `useActiveGame` voi luvata yhteisen API:n.

Lisää `src/stores/onlineGame.ts`:n palautusobjektiin:
```ts
roll: rollDice,
```

Ja lisää `currentRound`-computed:
```ts
const currentRound = computed(() =>
  players.value.length > 0
    ? Math.floor(turnsPlayed.value / players.value.length) + 1
    : 1,
)
```
+ lisää palautusobjektiin `currentRound`.

- [ ] **Step 3: ModeSelect-komponentti**

`src/components/ModeSelect.vue`:
```vue
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
```

- [ ] **Step 4: Type-check + commit**

```bash
npm run type-check
git add src/components/ModeSelect.vue src/composables/useActiveGame.ts src/stores/appMode.ts src/stores/onlineGame.ts
git commit -m "feat: add ModeSelect, useActiveGame composable, appMode store"
```

---

### Task E2: OnlineSetup + OnlineJoin

**Files:**
- Create: `src/components/OnlineSetup.vue`
- Create: `src/components/OnlineJoin.vue`

OnlineSetup näyttää kaksi vaihtoehtoa: "Luo peli" / "Liity peliin koodilla". Molemmat reitit kysyvät nimen jos puuttuu.

- [ ] **Step 1: OnlineSetup.vue**

```vue
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
```

- [ ] **Step 2: OnlineJoin.vue (auto-join URL-parametristä)**

```vue
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
  // Jos nimi on tallennettu localStorageen, liity automaattisesti
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
```

- [ ] **Step 3: Type-check + commit**

```bash
npm run type-check
git add src/components/OnlineSetup.vue src/components/OnlineJoin.vue
git commit -m "feat: add OnlineSetup and OnlineJoin components"
```

---

### Task E3: OnlineLobby

**Files:**
- Create: `src/components/OnlineLobby.vue`

```vue
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
    // klipboard ei tuettu — käyttäjä voi kopioida käsin
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
```

- [ ] **Commit**

```bash
git add src/components/OnlineLobby.vue
git commit -m "feat: add OnlineLobby component"
```

---

### Task E4: PlayerList ja host-toiminnot

**Files:**
- Create: `src/components/PlayerList.vue`

```vue
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
          {{ confirmingFor === p.uid ? 'Varma?' : 'Luovuta' }}
        </button>
      </li>
    </ul>
    <p v-if="errorMessage" class="text-red-600 dark:text-red-400 text-xs text-center mt-2">
      {{ errorMessage }}
    </p>
  </div>
</template>
```

- [ ] **Commit**

```bash
git add src/components/PlayerList.vue
git commit -m "feat: add PlayerList with host concede action"
```

---

### Task E5: DiceArea + Scorecard käyttävät useActiveGame:a + canInteract-gating

**Files:**
- Modify: `src/components/DiceArea.vue`
- Modify: `src/components/Scorecard.vue`
- Modify: `src/stores/game.ts`

Lisätään `canInteract`-getter myös hot-seat-storeen (aina true). Sitten DiceArea ja Scorecard käyttävät `useActiveGame`-composablea ja gateavat klikkaukset `canInteract`-arvon perusteella.

- [ ] **Step 1: Lisää canInteract hot-seat-storeen**

Avaa `src/stores/game.ts` ja lisää storen sisälle:

```ts
const canInteract = computed(() => true)
```
sekä palautusobjektiin: `canInteract`.

- [ ] **Step 2: Päivitä DiceArea.vue**

Korvaa rivi 3:
```ts
import { useGameStore } from '../stores/game'
```
muotoon:
```ts
import { useActiveGame } from '../composables/useActiveGame'
```

Korvaa rivi 9:
```ts
const game = useGameStore()
```
muotoon:
```ts
const game = useActiveGame()
```

Muuta `roll`-funktion ensimmäinen tarkistus (rivi 36) sisältämään canInteract:
```ts
function roll() {
  if (rolling.value) return
  if (!game.canInteract) return
  game.roll()
  ...
}
```

Päivitä `canRoll`-computed:
```ts
const canRoll = computed(() => game.rollsLeft > 0 && !game.isGameOver && game.canInteract)
```

Muuta heittonappi disable-ehto (rivi 109):
```vue
:disabled="!canRoll || rolling"
```

Päivitä Die-elementin `can-toggle`-propi (rivi 99):
```vue
:can-toggle="game.canInteract && game.hasRolled && game.rollsLeft > 0"
```

- [ ] **Step 3: Päivitä Scorecard.vue**

Korvaa rivi 3:
```ts
import { useGameStore } from '../stores/game'
```
muotoon:
```ts
import { useActiveGame } from '../composables/useActiveGame'
```

Korvaa rivi 15:
```ts
const game = useGameStore()
```
muotoon:
```ts
const game = useActiveGame()
```

Päivitä `isSelectable`-funktio (rivi 48):
```ts
function isSelectable(cat: Category, player: Player): boolean {
  return game.canInteract && isActive(player) && game.hasRolled && !player.scores.has(cat) && !game.isGameOver
}
```

Tyypitykset: `Player` viittaa hot-seat-tyyppiin, mutta online-store palauttaa `LocalOnlinePlayer`. Molemmat täsmäävät rakenteessa `{ name, scores }`. Vaihda tyypin tarkkuus:
- Tuoja `Player`-tyypin import jää (rivi 12) – käytetään duck-tyypitettynä, mutta saadaksemme molemmat toimimaan vaihda allekirjoitus löysempään:

Korvaa rivit 36–66 nämä funktiot:
```ts
type AnyPlayer = { name: string; scores: Map<Category, number> }

function probDisplay(cat: Category, player: AnyPlayer): string {
  if (!isActive(player) || player.scores.has(cat)) return ''
  const p = probabilities.value.get(cat)
  if (p === undefined) return ''
  return `${Math.round(p * 100)}%`
}
function isActive(player: AnyPlayer): boolean { return player === game.currentPlayer }
function isSelectable(cat: Category, player: AnyPlayer): boolean {
  return game.canInteract && isActive(player) && game.hasRolled && !player.scores.has(cat) && !game.isGameOver
}
function displayScore(cat: Category, player: AnyPlayer): string {
  if (player.scores.has(cat)) return String(player.scores.get(cat))
  if (isActive(player) && game.hasRolled && game.potentialScores.has(cat)) return String(game.potentialScores.get(cat))
  return ''
}
function select(cat: Category) {
  if (!game.currentPlayer || !isSelectable(cat, game.currentPlayer)) return
  playClick()
  game.selectCategory(cat)
}
function scoreClass(cat: Category, player: AnyPlayer): string {
  if (player.scores.has(cat)) return 'font-semibold'
  if (isActive(player) && game.hasRolled && !player.scores.has(cat)) return 'text-slate-400 italic'
  return ''
}
```

Poista `Player`-import-rivi (12) ja sen mukana käyttö, koska `AnyPlayer` korvaa sen.

- [ ] **Step 4: Type-check, yksikkötestit, commit**

```bash
npm run type-check
npm run test
git add src/components/DiceArea.vue src/components/Scorecard.vue src/stores/game.ts
git commit -m "refactor: DiceArea & Scorecard use useActiveGame + canInteract gating"
```

---

## Phase F – App.vue-integraatio

### Task F1: App.vue routing (mode + ?room=)

**Files:**
- Modify: `src/App.vue`

- [ ] **Step 1: Tuo uudet komponentit ja storet**

Lisää script-osion alkuun (rivit 1–10) importit:
```ts
import ModeSelect from './components/ModeSelect.vue'
import OnlineSetup from './components/OnlineSetup.vue'
import OnlineJoin from './components/OnlineJoin.vue'
import OnlineLobby from './components/OnlineLobby.vue'
import PlayerList from './components/PlayerList.vue'
import { useOnlineGameStore } from './stores/onlineGame'
import { useProfileStore } from './stores/profile'
import { useAppModeStore } from './stores/appMode'
import { normalizeRoomCode, isValidRoomCode } from './codeGenerator'
```

- [ ] **Step 2: Lue ?room= URL-parametri ja alusta moodi**

Lisää `<script setup>`-blokin alkuun (heti game-storen jälkeen, rivin 12):
```ts
const onlineGame = useOnlineGameStore()
const profile = useProfileStore()
const appMode = useAppModeStore()

const url = new URL(window.location.href)
const roomFromUrl = url.searchParams.get('room')
const initialRoomCode = roomFromUrl ? normalizeRoomCode(roomFromUrl) : null
const showModeSelect = ref(!initialRoomCode)
const showOnlineJoin = ref(!!initialRoomCode && isValidRoomCode(initialRoomCode ?? ''))

if (initialRoomCode) {
  appMode.setMode('online')
}

onMounted(async () => {
  // Käynnistä auth heti taustalla — sekä hot-seatille (kun pelaaja joutuu kirjautumaan online-flow:n kautta) että online-flowlle.
  await profile.init().catch(() => {})
})
onUnmounted(() => onlineGame.unsubscribeAll())

function selectMode(mode: 'hotseat' | 'online') {
  appMode.setMode(mode)
  showModeSelect.value = false
}
```

- [ ] **Step 3: Päivitä `<template>` haarautumaan online vs. hot-seat tilaan**

Korvaa `<!-- Setup phase -->`-template-osa (rivit 136–142):

```vue
<!-- Aloituslogiikka: mode-valinta -->
<template v-if="appMode.mode === 'hotseat' && game.phase === 'setup' && showModeSelect">
  <ModeSelect @select="selectMode" />
  <div class="mt-6">
    <HighScores :player-names="[]" />
  </div>
</template>

<!-- Hot-seat setup -->
<template v-else-if="appMode.mode === 'hotseat' && game.phase === 'setup'">
  <PlayerSetup ref="playerSetupRef" @start="game.startGame($event)" />
  <div class="mt-6">
    <HighScores :player-names="playerSetupRef?.resolvedNames ?? []" />
  </div>
  <button class="mt-4 mx-auto block text-sm text-slate-500 underline" @click="showModeSelect = true">
    Vaihda pelitilaa
  </button>
</template>

<!-- Online join (URL-koodista) -->
<template v-else-if="appMode.mode === 'online' && showOnlineJoin && onlineGame.connectionState === 'idle'">
  <OnlineJoin :initial-code="initialRoomCode!" />
</template>

<!-- Online setup -->
<template v-else-if="appMode.mode === 'online' && onlineGame.connectionState === 'idle'">
  <OnlineSetup />
</template>

<!-- Online lobby -->
<template v-else-if="appMode.mode === 'online' && onlineGame.phase === 'lobby'">
  <OnlineLobby />
</template>
```

Muuta myös `<!-- Playing phase -->` ja `<!-- Finished phase -->` käyttämään dynaamista storea. Korvaa rivi 145 alkaen:

```vue
<!-- Playing phase (jaettu) -->
<template v-if="(appMode.mode === 'hotseat' && game.phase === 'playing')
  || (appMode.mode === 'online' && onlineGame.phase === 'playing')">
  <PlayerList v-if="appMode.mode === 'online'" />
  <p v-else class="text-center text-slate-500 dark:text-slate-400 text-sm mb-1">
    Kierros {{ Math.min(game.currentRound, 15) }} / 15
  </p>
  <p
    v-if="appMode.mode === 'hotseat' && game.players.length > 1"
    class="text-center text-blue-600 dark:text-blue-400 font-semibold mb-4"
  >
    {{ game.currentPlayer?.name }}n vuoro
  </p>

  <section class="mb-8">
    <DiceArea />
  </section>

  <section class="flex justify-center">
    <Scorecard />
  </section>

  <div class="flex gap-2 mt-3">
    <button
      v-if="appMode.mode === 'hotseat' && game.canUndo"
      class="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm"
      @click="game.undoLastCategory()"
    >Kumoa viimeinen valinta</button>
    <button
      class="px-4 py-2 rounded-lg text-sm transition-colors"
      :class="confirmAction === 'quit'
        ? 'bg-red-600 text-white hover:bg-red-700'
        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'"
      @click="confirmAndRun('quit')"
      @blur="cancelConfirm"
    >
      {{ confirmAction === 'quit' ? 'Oletko varma?' : 'Lopeta peli' }}
    </button>
  </div>
</template>
```

Päivitä `confirmAndRun`-funktion `quit`-haaraa: jos online, kutsu `onlineGame.leaveGame()` ja resetoi UI:
```ts
function confirmAndRun(action: 'restart' | 'newGame' | 'quit') {
  if (confirmAction.value === action) {
    confirmAction.value = null
    if (action === 'restart') game.restartGame()
    else if (action === 'newGame') {
      game.newGame()
      appMode.setMode('hotseat')
      showModeSelect.value = true
    } else if (action === 'quit') {
      if (appMode.mode === 'online') {
        onlineGame.leaveGame()
        appMode.setMode('hotseat')
        showModeSelect.value = true
        // Poista room URL-parametri
        const u = new URL(window.location.href)
        u.searchParams.delete('room')
        window.history.replaceState({}, '', u.toString())
      } else {
        game.newGame()
        showModeSelect.value = true
      }
    }
  } else {
    confirmAction.value = action
  }
}
```

- [ ] **Step 4: Type-check + manuaalinen sanity-check**

```bash
npm run type-check
npm run dev
```

Avaa selain ja testaa että hot-seat-flow toimii edelleen. Klikkaa "Pelaa netissä" → näkyy OnlineSetup. Klikkaa "Takaisin" → palaat ModeSelectiin. (Online-flow:n kunnollinen päästä päähän -testaus tulee Phase G:ssä.)

- [ ] **Step 5: Commit**

```bash
git add src/App.vue
git commit -m "feat: integrate online flow into App routing"
```

---

### Task F2: Finished-vaihe online-pelille

**Files:**
- Modify: `src/App.vue`

`game.phase === 'finished'` -haaran nykyinen koodi tallentaa high-scoret hot-seat-tilassa watcher-callbackin kautta. Online-tilassa scoret tallentaa onlineGame-store hostin puolesta. Lisätään online-tilalle oma loppunäkymä.

- [ ] **Step 1: Muokkaa `watch(() => game.phase, ...)` ja lisää erillinen online-watcher**

Olemassa oleva `watch(() => game.phase, async (phase) => { ... })` säilyy ennallaan hot-seatille.

Lisää sen jälkeen:
```ts
watch(() => onlineGame.phase, async (phase) => {
  if (phase !== 'finished') return
  // High-scoret kirjoittaa host automaattisesti subscribe-callbackin kautta.
  // Tässä päivitetään vain UI:n tulostaulu.
  await loadTopScores(onlineGame.players.map(p => p.name))
})
```

- [ ] **Step 2: Päivitä finished-template käyttämään aktiivista storea**

Korvaa rivi 187 alkaen koko `<div v-if="game.phase === 'finished'" ...>` -lohko siten, että se käyttää dynaamista storea:

```vue
<!-- Finished phase -->
<div
  v-if="(appMode.mode === 'hotseat' && game.phase === 'finished')
    || (appMode.mode === 'online' && onlineGame.phase === 'finished')"
  class="text-center relative"
>
  <!-- olemassa oleva confetti/star-burst säilyy hot-seatille -->
  <div v-if="appMode.mode === 'hotseat' && celebrating" class="confetti-container" aria-hidden="true">
    <div v-for="i in (isTop1 ? 80 : 50)" :key="i" class="confetti" :style="{
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${2 + Math.random() * 3}s`,
      backgroundColor: isTop1
        ? ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#fef3c7', '#ffffff'][i % 6]
        : ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'][i % 6],
    }" />
  </div>

  <div class="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700">
    <template v-if="appMode.mode === 'online'">
      <p class="text-xl font-bold text-green-800 dark:text-green-300 mb-3">
        {{ onlineGame.winner?.name }} voittaa pistein {{ onlineGame.winner ? onlineGame.totalScore(onlineGame.winner) : 0 }}!
      </p>
      <div class="space-y-1 text-sm text-slate-600 dark:text-slate-300">
        <p v-for="player in onlineGame.players" :key="player.uid">
          {{ player.name }}: {{ onlineGame.totalScore(player) }}{{ player.conceded ? ' (luovuttanut)' : '' }}
        </p>
      </div>
    </template>
    <template v-else-if="game.players.length === 1">
      <p class="text-xl font-bold text-green-800 dark:text-green-300">
        Peli ohi! Pisteet: {{ game.totalScore(game.players[0]!) }}
      </p>
    </template>
    <template v-else>
      <p class="text-xl font-bold text-green-800 dark:text-green-300 mb-3">
        {{ game.winner?.name }} voittaa pistein {{ game.totalScore(game.winner!) }}!
      </p>
      <div class="space-y-1 text-sm text-slate-600 dark:text-slate-300">
        <p v-for="player in game.players" :key="player.name">
          {{ player.name }}: {{ game.totalScore(player) }}
        </p>
      </div>
    </template>
  </div>

  <section class="flex justify-center mb-6">
    <Scorecard />
  </section>

  <div class="mb-6">
    <HighScores
      v-if="appMode.mode === 'online' || scoresSaved"
      :highlight-ids="appMode.mode === 'online' ? [] : savedDocIds"
      :player-names="appMode.mode === 'online' ? onlineGame.players.map(p => p.name) : playerNames()"
    />
  </div>

  <div class="flex gap-3 justify-center">
    <button
      v-if="appMode.mode === 'hotseat'"
      class="px-6 py-3 bg-green-600 dark:bg-green-700 text-white font-bold rounded-lg text-lg"
      @click="game.restartGame()"
    >
      Pelaa uudelleen
    </button>
    <button
      class="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-lg"
      @click="appMode.mode === 'online' ? (onlineGame.leaveGame(), appMode.setMode('hotseat'), showModeSelect = true) : game.newGame()"
    >
      Takaisin etusivulle
    </button>
  </div>
</div>
```

- [ ] **Step 3: Type-check + dev server + commit**

```bash
npm run type-check
npm run dev
```

Manuaalinen sanity check: hot-seat finished-näkymä toimii edelleen. (Online finished -testaus Phase G:ssä.)

```bash
git add src/App.vue
git commit -m "feat: integrate online finished phase into App"
```

---

## Phase G – Polish ja testaus

### Task G1: Manuaalinen testidoc + lopullinen smoke-testi

**Files:**
- Create: `docs/plans/2026-05-13-online-multiplayer-manual-tests.md`

- [ ] **Step 1: Kirjoita manuaalisen testin dokumentaatio**

`docs/plans/2026-05-13-online-multiplayer-manual-tests.md`:
```markdown
# Online-moninpeli – manuaalinen testilista

Käydään läpi ennen mergeä. Avaa kaksi selainikkunaa (mielellään eri profiilissa/incognito) tai kaksi eri laitetta.

## Setup
- [ ] `npm run dev` käynnissä
- [ ] Firebase-projekti `.env.local`:ssä toimii (sama kuin tuotannossa tai erillinen dev-projekti)

## Hot-seat regressio (ei pidä rikkoutua)
- [ ] Etusivulla näkyy "Pelaa samalla laitteella" / "Pelaa netissä"
- [ ] "Pelaa samalla laitteella" → nykyinen PlayerSetup näkyy
- [ ] 1 pelaaja, peli toimii loppuun asti, high-score tallentuu
- [ ] 2 pelaajaa, vuorot vaihtuvat oikein, undo toimii
- [ ] Tumma teema vaihtuu
- [ ] PWA toimii offline (Service Worker)

## Online: pelin luonti ja lobby
- [ ] Klikkaa "Pelaa netissä" → "Luo uusi peli"
- [ ] Syötä nimi, klikkaa "Luo peli"
- [ ] Lobby näyttää 4-merkin koodin isona
- [ ] "Kopioi jaettava linkki" toimii, klippari sisältää URL:n `?room=<KOODI>`
- [ ] Pelaajalista näyttää vain sinut, merkintä "(isäntä)"

## Online: liittyminen koodilla
- [ ] Avaa toinen selain, klikkaa "Pelaa netissä" → "Liity peliin koodilla"
- [ ] Syötä nimi ja koodi, "Liity peliin"
- [ ] Molemmat selaimet näkevät kaksi pelaajaa lobbyssä reaaliajassa

## Online: liittyminen linkillä
- [ ] Avaa kolmas selain, liitä kopioitu URL osoitepalkkiin
- [ ] OnlineJoin-näkymä näkyy, koodi esitäytetty
- [ ] Jos nimi on jo localStoragessa, liittyy automaattisesti
- [ ] Lobbyssä näkyy kolme pelaajaa kaikilla laitteilla

## Online: pelin pelaaminen
- [ ] Host klikkaa "Aloita peli" — peli aloittaa, järjestys voi olla satunnainen
- [ ] Aktiivinen pelaaja näkyy korostettuna PlayerList:ssä jokaisella laitteella
- [ ] Host: heittää nopat — muut näkevät noppien arvot reaaliajassa
- [ ] Host: lukitsee nopan — muut näkevät lukon
- [ ] Vuoro siirtyy, host ei voi enää klikata (DiceArea/Scorecard disabled)
- [ ] Toinen pelaaja heittää, valitsee kategorian, pisteet ilmestyvät jokaisella laitteella
- [ ] Sulje yksi välilehti kesken pelin, avaa sama URL uudestaan → pelaaja palaa peliin oikealla tilalla

## Online: luovutus
- [ ] Host klikkaa "Luovuta" jonkun toisen pelaajan kohdalla, klikkaa uudestaan vahvistukseksi
- [ ] Pelaajan kaikki täyttämättömät kategoriat = 0, hän on yliviivattu PlayerList:ssä
- [ ] Vuoro siirtyy seuraavalle aktiiviselle pelaajalle

## Online: pelin loppu
- [ ] Pelaa pelin loppuun
- [ ] Voittaja näkyy oikein kaikilla laitteilla
- [ ] HighScores-listalla näkyy jokaisen pelaajan tulos kerran (ei duplikaatteja)
- [ ] Akseli-nimi laukaisee top 30 -näkymän high-scoressa
- [ ] "Takaisin etusivulle" → ModeSelect

## Online: virhetilanteet
- [ ] Yritä liittyä väärällä koodilla → "Koodia XXXX ei löytynyt."
- [ ] Yritä liittyä alkaneeseen peliin → "Peli on jo alkanut."
- [ ] Liitä 4 pelaajaa, yritä viidettä → "Peli on täynnä."
- [ ] Verkko pois kesken pelin: nopat eivät vaihdu lokaalisti palvelimelle, palauttamisen jälkeen synkroituu

## iOS-PWA
- [ ] Asenna PWA puhelimeen (Add to Home Screen)
- [ ] Kaksi laitetta, samassa pelissä — sync toimii
```

- [ ] **Step 2: Aja kaikki testit ja sääntö-testit**

```bash
npm run test
npm run test:rules
npm run type-check
npm run lint
```

Odotettu: kaikki PASS.

- [ ] **Step 3: Käy manuaalinen testilista läpi**

Avaa `docs/plans/2026-05-13-online-multiplayer-manual-tests.md` ja merkkaa kohdat suoritetuksi. Jos joku epäonnistuu, korjaa ennen committia.

- [ ] **Step 4: Final commit**

```bash
git add docs/plans/2026-05-13-online-multiplayer-manual-tests.md
git commit -m "docs: add manual test checklist for online multiplayer"
```

---

## Tehtävien yhteenveto

| Vaihe | Tehtävä | Mitä rakentuu |
|---|---|---|
| A1 | Emulator-konfiguraatio | Firebase emulator + dev-deps |
| A2 | Anonymous Auth | `ensureSignedIn()` |
| A3 | Tyypit | `GameDoc`, `OnlinePlayer` |
| A4 | Score-helperit | Jaettu pisteenlasku-moduuli |
| A5 | Profile-store | Uid + tallennettu nimi |
| B1 | Code generator | Huonekoodit |
| B2 | Doc serialization | Map ↔ Record |
| C1 | Rules: users/highscores | Sääntö-testaus-harness |
| C2 | Rules: create+join | Pelin luonti + lobbyyn liittyminen |
| C3 | Rules: play | Vuoron toiminnot, luovutus, high-score |
| D1 | Online-store skeleton | Subscribe, applyDocToState |
| D2 | createGame | Pelin luonti |
| D3 | joinGame | Liittyminen koodilla |
| D4 | startGame | Pelin aloitus (shuffle) |
| D5 | rollDice + toggleLock | Nopanheitto + lukot |
| D6 | selectCategory | Vuoron päättäminen + high-score |
| D7 | concedePlayer | Host-toiminto |
| E1 | ModeSelect | Tilan valinta |
| E2 | OnlineSetup/Join | Pelin luonti/liittymis-UI |
| E3 | OnlineLobby | Lobby |
| E4 | PlayerList | Pelaajalista ja host-toiminnot |
| E5 | Disabled state | DiceArea + Scorecard mukautuvat aktiivista storea |
| F1 | App routing | ?room= + mode-state |
| F2 | Finished phase | Online-finished UI |
| G1 | Manual tests | Lopullinen testaus |

**26 tehtävää, arviolta 2–3 päivän kokonaistyö** kokeneelle Vue-kehittäjälle. Sääntö-testit (C1–C3) vievät suhteellisen paljon aikaa setupin vuoksi mutta säästävät myöhemmin turvallisuusbugeissa.
