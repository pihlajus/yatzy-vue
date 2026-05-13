# Online-moninpeli – design

**Päiväys:** 2026-05-13
**Tila:** hyväksytty brainstorm, odottaa toteutussuunnitelman tekoa
**Scope:** Online-moninpeli 2–4 pelaajalle Firebase Firestoren päällä. Nykyinen hot-seat-tila säilyy ennallaan.

## 1. Yhteenveto

Lisätään peliin online-tila, jossa 2–4 pelaajaa voi pelata samaa Yatzy-peliä netin yli. Isäntä luo pelin, jakaa joko 4-merkkisen koodin tai linkin (URL-parametri `?room=`), muut liittyvät. Kaikki pelaajat näkevät reaaliajassa kaverin nopanheitot, lukot ja kategoriavalinnat. Vuorologiikka on sama kuin lokaalissa Yatzyssä.

Hot-seat-tila ei muutu. Käyttäjälle näytetään aloitusruudussa valinta "Pelaa samalla laitteella" / "Pelaa netissä".

## 2. Päätökset ja perustelut

| # | Päätös | Perustelu |
|---|---|---|
| 1 | Liittyminen sekä 4-merkkisellä koodilla että jaettavalla linkillä | Koodi toimii kasvotusten, linkki on luonnollinen mobiilissa (WhatsApp). Molemmat ilmaiseksi samasta datasta. |
| 2 | Firebase Anonymous Auth + nimi tallennettuna localStorageen ja `users/{uid}` -dokumenttiin | Pysyvä uid mahdollistaa reconnectin ja sen, että Firestore-säännöt voivat estää toisen pelaajan vuorolla pelaamisen. Nimi muistuu seuraavaan peliin. Ei rekisteröitymistä. |
| 3 | Live-synkronointi: jokainen heitto, lukko ja kategorian valinta päivittyy reaaliajassa kaikille | Vastaa pöytä-Yatzyn tunnelmaa. Kirjoituksia max ~1000 per peli, alle Firestoren ilmaiskiintiön. |
| 4 | Yksi `games/{gameId}`-dokumentti per peli, kaikki tila siellä | YAGNI: alikokoelmat (presence, chat, leaderboardit) voi lisätä myöhemmin jos tarvitaan. Yksi `onSnapshot`-kuuntelija, yksinkertaisin datamalli. |
| 5 | Disconnect-käsittely: reconnect uid:n perusteella + isäntä voi merkitä pelaajan luovuttaneeksi | Reconnect tulee ilmaiseksi pysyvällä uid:llä. Ei ajastimia tai monimutkaisia presence-järjestelmiä. Isännän manuaali­merkintä riittää jämähtämisten korjaamiseen. |
| 6 | Hot-seat säilyy rinnakkain online-tilan kanssa | Hot-seat on PWA + offline. Online-tila on selvästi eri käyttötapaus. `game.ts`-storeen ei kosketa. |
| 7 | Lobby: isäntä aloittaa, pelaajajärjestys arvotaan satunnaisesti | Selkeä omistajuus, ei vahinkoaloituksia. Satunnainen järjestys on Yatzyssä reilu. |
| 8 | Undo ei ole online-tilassa käytettävissä | Kategorian peruutus toisen pelaajan jo katsottua tilannetta on hämmentävää. Hot-seatissa undo säilyy. |
| 9 | Vain isäntä kirjoittaa high-scoret pelin loputtua | Estää duplikaatit luonnostaan. `highScoresWritten`-bitti pelidokumentissa. Nykyistä high-score-skeemaa ei muuteta. |
| 10 | Pelilogiikka clientissä, Firestore-säännöt valvovat vuoron omistajuutta | Cloud Functions on overkill kotipelille. Hyväksytty huijausmalli: pelaajat voivat huijata pisteitään devtoolsista, mutta eivät voi pelata toistensa puolesta. Sama luottamustaso kuin kynäpaperi-pöydässä. |

## 3. Arkkitehtuuri

### 3.1 Stack-lisäykset

- `firebase/auth` – `signInAnonymously`
- `firebase/firestore` – jo käytössä, laajennetaan pelidokumenteille
- `@firebase/rules-unit-testing` (dev) – sääntö-testit emulaattorin päällä
- Firebase CLI – Firestore Emulator paikallisille sääntö-testeille
- Ei Cloud Functionseja, ei Realtime Databasea

### 3.2 Tiedostojen kartta

```
src/
  firebase.ts                # Lisätään: auth-instance + ensureSignedIn()
  stores/
    game.ts                  # Nykyinen hot-seat-store, ei muutoksia
    onlineGame.ts            # UUSI: peilaa game.ts:n tilan, onSnapshot-kuuntelija
    profile.ts               # UUSI: uid + tallennettu nimi
  composables/
    useOnlineGame.ts         # UUSI: huoneen luonti, liittyminen, toiminnot
  components/
    App.vue                  # MUOKKAUS: routing (?room= → online, muuten ModeSelect)
    ModeSelect.vue           # UUSI: kahden tilan valinta
    OnlineSetup.vue          # UUSI: "luo peli" / "liity peliin" -valinta
    OnlineJoin.vue           # UUSI: koodi+nimi
    OnlineLobby.vue          # UUSI: pelaajalista, koodi, linkki, aloita-nappi
    PlayerList.vue           # UUSI: aktiivinen pelaaja, pisteet, host-toiminnot
    DiceArea.vue             # MUOKKAUS: disabled-tila kun ei oma vuoro
    Scorecard.vue            # MUOKKAUS: disabled-tila kun ei oma vuoro
  types/
    game.ts                  # Lisätään: GameDoc, OnlinePlayer
  scoring.ts                 # Ei muutoksia
  __tests__/
    onlineGame.test.ts       # UUSI
    codeGenerator.test.ts    # UUSI
    gameDocSerialization.test.ts  # UUSI
    rules/
      games.rules.test.ts    # UUSI
      users.rules.test.ts    # UUSI
      highscores.rules.test.ts  # UUSI (regressio)

firestore.rules              # Laajennetaan
firestore.indexes.json       # Uusi indeksi (code, phase)
firebase.json                # Uusi: emulaattorin konfiguraatio sääntö-testeille
```

### 3.3 Datavirta

```
Client A (vuorossa)         Firestore games/{id}          Clientit B/C/D
       |                            |                            |
       |--- roll() local            |                            |
       |--- updateDoc(dice,...) --->|                            |
       |                            |---onSnapshot---->----------|
       |<-----onSnapshot (echo)     |                            |---UI päivittyy
       |--- toggleLock local        |                            |
       |--- updateDoc(dice) ------->|                            |
       |                            |---onSnapshot---->----------|
       |--- selectCategory local    |                            |
       |--- updateDoc(scores,       |                            |
       |    currentPlayerIndex,     |                            |
       |    dice reset) ----------->|                            |
       |                            |---onSnapshot---->----------|
```

Echo-väläystä ei käsitellä koodissa: Firestoren paikallinen välimuisti tekee `updateDoc`-kutsun jälkeen lokaalin optimistic-päivityksen heti, ja server-vahvistus saapuu millisekunneissa.

### 3.4 Reititys

`App.vue` lukee `URLSearchParams` mountissa:
- `?room=XXXX` → siirrytään suoraan online-pelin liittymisvaiheeseen (nimi syötetään jos puuttuu).
- Muuten → `ModeSelect`.

`onlineGame.phase` ohjaa lopullisen näkymän valinnan: `idle` | `creating` | `lobby` | `playing` | `finished`. App.vue:n template haarautuu tämän ja `game.phase`:n välillä mode-flagin perusteella.

## 4. Tietomalli

### 4.1 `games/{gameId}`

```ts
interface GameDoc {
  code: string                    // 4-merkkinen, [A-Z2-9] ilman O/0/I/1
  hostUid: string
  createdAt: Timestamp
  updatedAt: Timestamp            // serverTimestamp jokaisen updaten yhteydessä
  phase: 'lobby' | 'playing' | 'finished'
  players: OnlinePlayer[]         // max 4, järjestys = peli-järjestys playing-vaiheessa
  dice: { value: number; locked: boolean }[]  // 5 noppaa
  rollsLeft: number               // 0–3
  currentPlayerIndex: number
  turnsPlayed: number
  lastYatzy: boolean
  lastBonus: boolean
  winnerUid: string | null
  highScoresWritten: boolean
}

interface OnlinePlayer {
  uid: string
  name: string                    // kopioidaan liittymisen hetkellä
  scores: Record<string, number>  // "0".."14" → score (Map ei sarjaannu Firestoreen)
  conceded: boolean
}
```

Pinia-storessa `scores` käsitellään `Map<Category, number>`-rakenteena, muunnos Recordiksi tehdään ainoastaan kirjoituksen yhteydessä (`gameDocSerialization.ts`).

### 4.2 `users/{uid}`

```ts
interface UserDoc {
  name: string                    // viimeksi käytetty nimi
  updatedAt: Timestamp
}
```

### 4.3 `highscores/{doc}`

Ei muutoksia. Olemassa oleva skeema säilyy.

### 4.4 Indeksit

`firestore.indexes.json`:
- Composite-indeksi `games`-kokoelmaan: `(code ASC, phase ASC)` jotta `where('code','==',X).where('phase','in',['lobby','playing'])` toimii ilman virhettä.

### 4.5 Koodin generointi

- Aakkosto: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 merkkiä, O/0/I/1 jätetty pois sekaannusten välttämiseksi).
- Pituus: 4 → 32^4 ≈ 1 048 576 kombinaatiota.
- Törmäyksen sattuessa luonnissa generoidaan uusi koodi (max 5 yritystä, sitten virhe).
- Liittyessä koodi normalisoidaan uppercase-muotoon ja siitä poistetaan välilyönnit.

### 4.6 Vanhojen pelien siivous

Ei automaattista siivousta tässä versiossa. Jos myöhemmin tarvitaan, lisätään erillinen skripti tai Cloud Function.

## 5. Firestore-säännöt

### 5.1 Tavoitteet

Mitä säännöt estävät:
1. Toinen pelaaja kirjoittaa noppia tai vaihtaa vuoron.
2. Toinen pelaaja kirjoittaa toisen pisteet.
3. Vieras (ei pelin osallistuja) muuttaa pelidokumenttia.
4. Joku muu kuin isäntä aloittaa pelin tai merkitsee pelaajan luovuttaneeksi.
5. Olemassa olevien pelaajien tai immutaabeleiden kenttien (code, hostUid, createdAt) muuttaminen.
6. Liittyminen lobbyyn kun pelaajia on jo 4 tai phase on muu kuin `lobby`.
7. `highScoresWritten`-bitin asettaminen muulloin kuin pelin loputtua hostin toimesta.

Mitä säännöt **eivät** estä (hyväksytty riski):
- Nopan arvojen huijaaminen devtoolsista. Random-validointi ei ole säännöillä tehtävissä.
- Väärän pistemäärän kirjoittaminen omaan kategoriaan. Tekninen­ tehtävissä rules-kielellä, mutta vaatisi ~200 rivin sääntöjä; jätetään pois.

### 5.2 Tekniikka

Sääntöjen valvonta perustuu `request.resource.data.diff(resource.data).affectedKeys()` -tarkistukseen. Action-tyypit erottuvat siitä, mitä kenttiä päivitys koskee:

| Action | Muuttuvat kentät |
|---|---|
| `joinLobby` | `players` (append), `updatedAt` |
| `startGame` | `phase`, `players` (järjestys vaihtuu), `currentPlayerIndex`, `dice`, `rollsLeft`, `turnsPlayed`, `updatedAt` |
| `roll` | `dice`, `rollsLeft`, `lastYatzy`, `lastBonus`, `updatedAt` |
| `toggleLock` | `dice`, `updatedAt` |
| `selectCategory` | `players` (yksi pelaaja, vain `scores`), `currentPlayerIndex`, `turnsPlayed`, `dice`, `rollsLeft`, `lastBonus`, `lastYatzy`, `phase`, `winnerUid`, `updatedAt` |
| `concede` (host) | `players` (yksi pelaaja, `conceded` ja `scores`), mahdollisesti `currentPlayerIndex`, `phase`, `winnerUid`, `updatedAt` |
| `markHighScores` (host) | `highScoresWritten`, `updatedAt` |

Jokaiselle action-tyypille on oma `is<Action>(...)`-funktio rules-tiedostossa, joka:
- Tarkistaa `affectedKeys()`-joukon.
- Tarkistaa `request.auth.uid`:n suhteen oikeisiin pelaaja-indekseihin.
- Validoi pelilogiikan invariantit (esim. `rollsLeft` pienenee yhdellä, `currentPlayerIndex` ei karkaa range:n yli, ei voi muuttaa jo täytettyä `scores`-kategoriaa).

### 5.3 Sääntöjen testaus

`@firebase/rules-unit-testing` + Firebase Emulator Suite. Skripti:

```json
"test:rules": "firebase emulators:exec --only firestore 'vitest run src/__tests__/rules'"
```

Testit ajetaan ennen mergeä. CI:hin voidaan lisätä myöhemmin.

## 6. Käyttäjäkokemus

### 6.1 Tilakaaviot

```
Etusivu (?room ei URL:ssä)            URL ?room=XXXX
  ModeSelect                            OnlineJoin (koodi esitäytetty)
   |                                       |
   +-- "Samalla laitteella" → game-flow    +- syötä nimi
   |   (PlayerSetup → Playing → Finished)  +- liity → Lobby
   |
   +-- "Netissä" → OnlineSetup
        |
        +-- "Luo peli" → Lobby (host)
        |
        +-- "Liity peliin" → OnlineJoin (koodi tyhjä)
             |
             +-- syötä koodi + nimi → Lobby
```

```
Lobby → (host painaa "Aloita peli", ≥2 pelaajaa) → Playing → Finished → Takaisin etusivulle
```

### 6.2 Näkymät

**ModeSelect.vue** – kaksi nappia ja olemassa oleva tulostaulu alalaidassa.

**OnlineSetup.vue** – "Luo peli" / "Liity peliin" -valinta. Molemmat reitit kysyvät nimen jos sitä ei ole tallennettuna.

**OnlineJoin.vue** – 4-merkin koodikenttä (uppercase-input, valid-merkit-filtteri) + nimi. URL-`?room=`-parametrin tapauksessa koodikenttä on esitäytetty ja read-only.

**OnlineLobby.vue** – Näyttää pelin koodin isona, "Kopioi linkki" -napin (`navigator.clipboard`), pelaajalistan reaaliajassa. Hostille "Aloita peli" -nappi (disabled jos <2 pelaajaa). Muut näkevät "Odotetaan että isäntä aloittaa pelin…".

**PlayerList.vue** – Pelaajalista pelin aikana: aktiivinen korostettu, kokonaispisteet jokaiselle, "luovuttanut"-merkintä, hostille pieni menu jokaisen muun pelaajan kohdalla → "Merkitse luovuttaneeksi" (vahvistusdialogi).

**DiceArea.vue & Scorecard.vue** – Saavat lisäpropin `disabled` (tai lukevat `isMyTurn` storesta). Disabled-tilassa:
- Heittonappi ei klikattavissa.
- Lukot ei vaihdettavissa.
- Kategoriat näkyvissä mutta ei klikattavissa.
- Kevyt opacity-vähennys + teksti "[Pekan] vuoro".

**Pelin loppu** – Sama olemassa oleva loppuruutu (winner-näkymä), kaikkien pelaajien pisteet, "Takaisin etusivulle" -nappi. Ei automaattista uutta peliä – jos halutaan pelata uudestaan, isäntä luo uuden pelin etusivun kautta.

### 6.3 Presence

Ei eksplisiittistä presence-näkymää. Pelaajat näkevät epäsuorasti kuka on paikalla siitä, että vuorot edistyvät. Reconnect toimii silti (avaa sivu → kuuntelija käynnistyy → tila latautuu). Jos peli jää jumiin, isäntä merkitsee pelaajan luovuttaneeksi.

### 6.4 Lokalisaatio

Kaikki uudet tekstit suomeksi, kuten muu sovellus.

## 7. Pinia-store: `onlineGame.ts`

### 7.1 Tila

```ts
// Lokaali UI-tila (ei Firestoressa)
gameId: string | null
unsubscribe: (() => void) | null
connectionState: 'idle' | 'loading' | 'connected' | 'error'
errorMessage: string | null

// Peilaa GameDoc-kentät
code, hostUid, phase, players, dice, rollsLeft,
currentPlayerIndex, turnsPlayed, lastYatzy, lastBonus, highScoresWritten
```

### 7.2 Computed

`myUid`, `isMyTurn`, `isHost`, `currentPlayer`, `hasRolled`, `potentialScores`, `isGameOver`, `winner`, `upperSum`, `upperBonus`, `lowerSum`, `totalScore`.

`upperSum`/`upperBonus`/`lowerSum`/`totalScore` ja `potentialScores` on tarkoituksenmukaista jakaa erilliseksi `scoreHelpers.ts`-moduuliksi, jota molemmat (game.ts ja onlineGame.ts) käyttävät. Yhden lähteen periaate (DRY).

### 7.3 Actions

```ts
async createGame(name: string): Promise<string>          // palauttaa gameId
async joinGame(code: string, name: string): Promise<void>
async leaveGame(): Promise<void>
async startGame(): Promise<void>                          // vain host
async rollDice(): Promise<void>
async toggleLock(index: number): Promise<void>
async selectCategory(category: Category): Promise<void>
async concedePlayer(uid: string): Promise<void>           // vain host
async writeHighScoresAndMark(): Promise<void>             // vain host, kutsutaan pelin loputtua

subscribe(id: string): void                               // käynnistää onSnapshotin
unsubscribeAll(): void
```

### 7.4 Operaatiokohtaiset päivitykset

Jokainen action kirjoittaa Firestoreen vain ne kentät, jotka muuttuvat. Tämä on välttämätöntä sääntöjen `affectedKeys()`-validoinnille. Esimerkki `selectCategory`:sta:

```ts
async function selectCategory(category: Category) {
  if (!isMyTurn.value || !hasRolled.value) return
  const score = calcScore(dice.value.map(d => d.value), category)
  const newPlayers = clonePlayers(players.value)
  newPlayers[currentPlayerIndex.value].scores[String(category)] = score
  const allDone = newPlayers.every(p =>
    Object.keys(p.scores).length >= NUM_ROUNDS || p.conceded)
  const nextIndex = findNextActivePlayer(newPlayers, currentPlayerIndex.value)
  const hadBonus = upperSumOf(players.value[currentPlayerIndex.value]) >= UPPER_BONUS_LIMIT
  const hasBonus = upperSumOf(newPlayers[currentPlayerIndex.value]) >= UPPER_BONUS_LIMIT
  await updateDoc(gameRef(), {
    players: newPlayers,
    currentPlayerIndex: allDone ? currentPlayerIndex.value : nextIndex,
    turnsPlayed: turnsPlayed.value + 1,
    dice: createDice(),
    rollsLeft: MAX_ROLLS,
    lastBonus: !hadBonus && hasBonus,
    lastYatzy: false,
    phase: allDone ? 'finished' : 'playing',
    winnerUid: allDone ? findWinner(newPlayers).uid : null,
    updatedAt: serverTimestamp(),
  })
  if (allDone && isHost.value && !highScoresWritten.value) {
    await writeHighScoresAndMark()
  }
}
```

### 7.5 Elinkaaren hallinta

- `subscribe` käynnistetään kun pelaaja saapuu lobbyyn/peliin.
- `unsubscribeAll` kutsutaan kun pelaaja palaa etusivulle, sulkee selaimen (`window.beforeunload`), tai vaihtaa peliin.
- App.vue:n `onUnmounted`-callbackit hoitavat tämän.

### 7.6 Defensiivinen client-tarkistus

Jokainen action tarkistaa client-puolella ettei operaatio ole ilmiselvästi väärä (esim. `isMyTurn`, `rollsLeft > 0`). Tämä on UX, ei security. Firestore-säännöt ovat varsinainen turva.

## 8. Pinia-store: `profile.ts`

Vastuussa kirjautumisesta ja nimen hallinnasta.

```ts
ensureSignedIn(): Promise<string>            // signInAnonymously jos ei vielä signed in, palauttaa uid
getDisplayName(): string | null              // localStoragesta
setDisplayName(name: string): Promise<void>  // kirjoittaa localStorageen + users/{uid}
loadFromFirestore(): Promise<void>           // jos localStorage tyhjä, hae users/{uid}:sta
```

Auth-tila on Pinia-storena saadakseen computed-arvon (`isReady`, `uid`).

## 9. Virhetilanteet

| Tilanne | UX |
|---|---|
| Anonyymi sign-in epäonnistuu | Banner: "Online-pelit vaativat verkkoyhteyden. [Yritä uudelleen]" |
| Pelin luonnissa koodin törmäys | Yritä uudelleen automaattisesti, max 5 yritystä |
| Liittyminen: koodia ei löydy | Virhe: "Koodia *XXXX* ei löytynyt. Tarkista koodi." |
| Liittyminen: peli täynnä | Virhe: "Peli on täynnä." |
| Liittyminen: peli alkanut | Virhe: "Peli on jo alkanut. Et voi liittyä." |
| Firestore-permission-denied | Console-log, ei UI-bannerieta (defensiivinen client-tarkistus estää tämän jo) |
| Verkkokatkos kesken pelin | Firestore-SDK queuettaa kirjoitukset, suorittuvat kun verkko palaa. Ei eksplisiittistä bannereita. |
| Pelidokumentti poistettu / ei löydy snapshotissa | Banner: "Peli on poistettu tai sitä ei löytynyt." → "Takaisin etusivulle" |

## 10. Testaus

### 10.1 Yksikkötestit (Vitest)

- `onlineGame.test.ts` – Pinia-store: `applyDocToState`, computed-arvot, action-payloadien oikeellisuus (`updateDoc` mocked).
- `codeGenerator.test.ts` – Koodin pituus, sallitut merkit, yritystenmäärä törmäystilanteessa.
- `gameDocSerialization.test.ts` – `Map<Category,number>` ↔ `Record<string,number>` -muunnos.

Olemassa olevien testien (game.ts, scoring) ei pidä rikkoutua.

### 10.2 Firestore-sääntöjen testit

`@firebase/rules-unit-testing` + Firestore Emulator. Skripti:
```json
"test:rules": "firebase emulators:exec --only firestore 'vitest run src/__tests__/rules'"
```

Testitapauksia kullekin action-tyypille positiivinen + negatiivinen pari:
- Vain currentPlayer voi kirjoittaa `dice`.
- Vain currentPlayer voi muuttaa omaa scoreaan.
- Toinen pelaaja ei voi muuttaa toisen scorea.
- Vain host voi aloittaa pelin (lobby → playing).
- Vain host voi merkitä pelaajan luovuttaneeksi.
- Lobbyyn ei voi liittyä jos pelaajia on 4 tai phase ei ole `lobby`.
- Olemassa olevia pelaajia ei voi muokata join-operaatiossa.
- `code`, `hostUid`, `createdAt` ovat immutaabeleita.
- `highScoresWritten` voi vain `true`:ksi vain hostin toimesta finished-tilassa.

### 10.3 Manuaalinen testilista

Tallennetaan tämän tiedoston viereen erillisenä `2026-05-13-online-multiplayer-manual-tests.md` -dokumenttina. Käydään läpi ennen mergeä.

Ydintestit (avaa kaksi selainikkunaa/laitetta):
1. Luo peli koneella A, kopioi linkki.
2. Avaa linkki koneella B, syötä nimi, liity.
3. A näkee B:n pelaajalistassa reaaliajassa.
4. A aloittaa pelin, B näkee samaan aikaan että peli alkoi.
5. A:n heittäessä noppia, B näkee nopat muuttuvan.
6. B:n lukot eivät ole klikattavissa A:n vuorolla.
7. B valitsee kategorian omalla vuorollaan, A näkee pisteet.
8. B:n vuorolla A ei voi heittää (defensiivinen tarkistus).
9. B sulkee välilehden ja avaa uudestaan saman URL:n → liittyy automaattisesti, näkee oikean tilan.
10. A merkitsee B:n luovuttaneeksi → B:n täyttämättömät kategoriat = 0, vuoro siirtyy seuraavalle.
11. Pelin loputtua high-score-listassa näkyy yksi merkintä per pelaaja (ei duplikaatteja).
12. Akseli-nimi laukaisee top 30 -näkymän kuten ennen.
13. Hot-seat-tila toimii edelleen kuten ennen (regressio).
14. PWA toimii offline hot-seat-tilassa; online-tilassa näkyy verkkovirhe.
15. iOS PWA: kaksi laitetta samassa pelissä toimii.

## 11. Skoopin ulkopuolelle jätetyt asiat

Nämä jätetään myöhempiin iteraatioihin:
- Chat pelin sisällä.
- Pelaajaprofiilit ja per-uid-leaderboardit.
- Presence-indikaattorit (online/offline-pallot).
- Aikalukko pelaajan vuorolle.
- Cloud Functions -pohjainen autoritäärinen palvelin.
- Pisteiden Firestore-sääntö-validointi (kaava: `score == calcExpected(dice, category)`).
- Vanhojen pelidokumenttien automaattinen siivous.
- E2E-testaus Playwrightilla.
- Tilastot online-peleistä (esim. games-per-day).

## 12. Riskit

| Riski | Mitigaatio |
|---|---|
| Pelaaja huijaa nopat devtoolsista | Hyväksytty kotipelin kontekstissa. Linkkiä ei jaeta tuntemattomille. |
| Race condition: kaksi pelaajaa kirjoittaa "samanaikaisesti" | Vuorologiikka rajaa kirjoittajan yhteen pelaajaan (currentPlayer). Säännöt hylkäävät muut. |
| Echo-väläys lokaalille kirjoittajalle | Firestoren paikallinen välimuisti tekee optimistic-päivityksen heti. |
| Host crashaa pelin lopussa ennen high-score-kirjoitusta | `highScoresWritten`-bitti, host yrittää kirjoittaa myös subscribe-päivityksessä jos peli on finished ja bittiä ei ole vielä asetettu. |
| Firestore-säännöistä jää reikä | Sääntö-testit emulaattorilla, positiivinen + negatiivinen jokaista action-tyyppiä kohti. |
| Hot-seat rikkoutuu vahingossa | `game.ts` säilyy koskemattomana, regression-testi manuaalisessa testilistassa. |
| Akseli-erikoiskäsittely high-scoreissa | Säilyy ennallaan, online-pelin loppukirjoitus käyttää samaa `savePlayerScores`-API:a. |

## 13. Avoimet kysymykset

Yksikään ei estä toteutusta, mutta voivat tulla esiin:

1. Pitääkö Firebase Anonymous Auth -tilin uid säilyä jos käyttäjä tyhjentää selaimen tietoja? – Ei, anonyymi auth menetetään. Tämä on hyväksyttävää: pelaaja syöttää nimen uudestaan ja saa uuden uid:n.
2. Pitäisikö online-pelin alusta lähtien sallia myös 1 pelaajan peli yksinpelinä netissä? – Ei. 1 pelaajan tapaukseen on aina hot-seat. Säästää selvyyttä.
3. Mitä jos isäntä lähtee lobbystä? – Lobby jää muille, joku muu (esim. ensimmäinen liittynyt) ei voi aloittaa peliä koska säännöt vaativat host-uid:tä. Lobby jää käyttökelvottomaksi, muut joutuvat luomaan uuden pelin. Hyväksyttävä rajoitus; jos myöhemmin häiritsee, voidaan toteuttaa host-vaihto.

## 14. Hyväksyntä

Tämä design on käyty läpi käyttäjän kanssa kysymys-kerrallaan ja kaikki kohdat hyväksytty. Seuraava vaihe: toteutussuunnitelma (writing-plans-skill).
