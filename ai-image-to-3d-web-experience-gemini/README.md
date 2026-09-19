# Borgo Sospeso — Diorama 3D + Mini-game "Caccia ai Tesori"

Web experience in React + Vite + Three.js che esplora un micro borgo sospeso nel cielo,
con un mini-game di caccia ai tesori integrato nella scena 3D.

## Mini-game "Caccia ai Tesori del Borgo"

| Regola | Valore |
| --- | --- |
| Durata sessione | 20 secondi (countdown `MM:SS` + barra/anello + countdown gigante negli ultimi 5s) |
| Figurine | 9: `caffè`, `scarpe`, `vino`, `pizza`, `insalata`, `lasagne`, `pollo`, `patate`, `bistecca` |
| Punti | valore intero casuale 5–10, assegnato una sola volta all'avvio della sessione |
| Tap | ogni figurina è cliccabile **una sola volta** per sessione (poi resta visibile in stato disabilitato) |
| `< 20 pt` | Nessun premio (messaggio di riprova) |
| `20–29 pt` | Medaglia d'Argento |
| `30–39 pt` | Medaglia d'Oro |
| `40–49 pt` | Medaglia di Platino + **Pass x2 "Dante Festival"** con codice voucher |
| `≥ 50 pt` | Medaglia di Diamante + **Pass x2 "Dante Festival"** con codice voucher |

### Come funziona

- **Trigger di avvio** — il countdown parte al primo tocco su una figurina **oppure** premendo
  "Inizia la caccia" nella modale di benvenuto.
- **Figurine nel 3D** — ogni tesoro è un trofeo sospeso (emoji + anello dorato + alone) costruito in
  `src/engine/procedural/TreasureBuilder.ts` e posizionato sopra un luogo del borgo.
- **Hotspot DOM ancorati al 3D** — `src/components/HuntHotspotLayer.tsx` proietta a schermo le
  figurine con un unico `requestAnimationFrame`, aggiornando posizione, scala prospettica,
  profondità e stato di occlusione. Le figurine coperte da case, terreno o alberi appaiono
  offuscate e diventano cliccabili solo quando le si inquadra (ruotando/zoomando il diorama).
- **Feedback** — flip 3D della figurina con `+X pt`, punteggio flottante, micro-vibrazioni
  (`navigator.vibrate`) ed effetti sonori sintetizzati via WebAudio (`src/game/huntAudio.ts`, senza asset).
- **Schermata finale** — medaglia SVG per tier, punteggio, figurine raccolte, tempo impiegato,
  badge premio con codice voucher (copiabile) e pulsante **Condividi su WhatsApp**.
- **Viral loop** — il messaggio condiviso è pre-compilato con `encodeURIComponent` e link
  `https://api.whatsapp.com/send?text=…`; il link dell'app include `?caccia=1`, così chi lo apre
  atterra direttamente sulla schermata di avvio della caccia.
- **Persistenza locale** — record personale e codici voucher vinti sono salvati in `localStorage`.

### Messaggi di condivisione (da specifica)

- Platino/Diamante:
  `Ho conquistato la Medaglia di {TIER} ({PUNTI} pt) e vinto 2 biglietti per il Dante Festival nel borgo sospeso! Prova a battermi: {APP_LINK}`
- Argento/Oro:
  `Ho sbloccato la Medaglia di {TIER} con {PUNTI} pt esplorando il borgo sospeso! Riuscirai a vincere il pass per il Dante Festival? Gioca qui: {APP_LINK}`

## Struttura

```
src/
  engine/
    initExplorableWorld.ts        # renderer, camera, luci, post-processing, raycast, hotspot API
    procedural/
      TreasureBuilder.ts          # le 9 figurine 3D del mini-game
      IslandBuilder|VillageBuilder|FoliageBuilder|WaterBuilder|AtmosphereBuilder.ts
  game/
    treasureCatalog.ts            # catalogo figurine, punti, tier, voucher, messaggi WhatsApp
    useTreasureHunt.ts            # stato sessione (idle|active|completed), timer, punteggio, record
    huntAudio.ts                  # SFX WebAudio + vibrazioni
  components/
    HuntHotspotLayer.tsx          # chip cliccabili ancorati alle figurine 3D
    HuntHud.tsx                   # HUD: CTA, timer circolare, punteggio, mute, esci/rigioca
    TreasureStartModal.tsx        # modale di avvio con regole e scala premi
    TreasureResultModal.tsx       # schermata finale: medaglia, voucher, condivisione WhatsApp
    MedalBadge.tsx                # badge SVG delle medaglie (argento/oro/platino/diamante)
```

## Comandi

```bash
npm install
npm run dev          # dev server (host 0.0.0.0, porta 5173)
npm run build        # build single-file in dist/index.html
npm run preview      # anteprima della build
npm run typecheck    # tsc --noEmit
npm run verify:hunt  # test headless (jsdom) del flusso di gioco
```

`npm run verify:hunt` esegue l'intera partita senza browser: avvio timer, reveal singolo,
chiusura sessione, soglie medaglia, voucher Dante Festival, payload WhatsApp e "Rigioca".
