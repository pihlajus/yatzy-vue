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
