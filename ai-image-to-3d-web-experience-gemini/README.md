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
- **Figurine mimetizzate nel borgo** — ogni tesoro è un piccolo **modello 3D di cibo** costruito in
  `src/engine/procedural/TreasureBuilder.ts` (caffettiera moka, paio di scarpe, bottiglia, pizza su
  tagliere, ciotola d'insalata, teglia di lasagne, pollo arrosto, cesta di patate, bistecca con osso).
  Niente icone, etichette o numeri sopra la scena: la ricerca è la parte sfidante del gioco.
- **Posizionamento automatico** — le figurine vengono appoggiate al suolo reale dell'isola (raycast
  sul manto erboso) accanto a case, alberi, cespugli, moli e ponti, con un algoritmo che evita gli
  ingombri e sceglie lo spiazzo visibile dal maggior numero di angolazioni: nascoste ma trovabili.
- **Interazione pura in 3D** — tap e hover con raycast direttamente sugli oggetti; una figurina è
  raccoglibile solo se è davvero in vista (nessun muro, tetto o tronco fra camera e oggetto). Al
  tocco: salto, giro, scintille dorate e dissolvenza verso l'aspetto "già trovato".
- **Bussola del borgo** — durante la caccia un indizio suggerisce l'area in cui cercare una figurina
  ancora da trovare, così la difficoltà resta alta ma non frustrante.
- **Feedback** — avviso "+X pt · nome" nell'HUD, micro-vibrazioni (`navigator.vibrate`) ed effetti
  sonori sintetizzati via WebAudio (`src/game/huntAudio.ts`, senza asset).
- **Scheda dell'Esploratore** — interfaccia in stile fantasy del borgo (pergamena, cornici dorate,
  fregi, sigilli di cera, stemma araldico): regole, figurine da trovare, scala delle medaglie e
  taccuino con rango, record e voucher vinti.
- **Resoconto finale** — medaglia SVG animata per tier, punteggio, figurine raccolte, tempo impiegato,
  badge premio con sigillo di cera e codice voucher (copiabile), pulsante **Condividi su WhatsApp**.
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
      TreasureBuilder.ts          # modelli 3D delle 9 figurine + posizionamento nel borgo
      IslandBuilder|VillageBuilder|FoliageBuilder|WaterBuilder|AtmosphereBuilder.ts
  game/
    treasureCatalog.ts            # catalogo figurine, punti, tier, voucher, messaggi WhatsApp
    useTreasureHunt.ts            # stato sessione (idle|active|completed), timer, punteggio, record
    huntAudio.ts                  # SFX WebAudio + vibrazioni
  components/
    HuntHud.tsx                   # HUD pergamena: clessidra, punteggio, feedback, bussola, mute
    TreasureStartModal.tsx        # "Scheda dell'Esploratore": regole, figurine, medaglie, taccuino
    TreasureResultModal.tsx       # resoconto finale: medaglia, voucher, condivisione WhatsApp
    MedalBadge.tsx                # badge SVG delle medaglie (argento/oro/platino/diamante)
    fantasy/Ornaments.tsx         # cornici, fregi, sigilli di cera e stemma del borgo
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
