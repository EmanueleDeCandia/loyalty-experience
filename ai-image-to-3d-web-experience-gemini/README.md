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
| Combo | due figurine coerenti toccate di fila (pizza+vino, bistecca+patate, …) → **+3 pt** immediati con feedback particellare "Combo Tipica!" |
| Voucher Zero-Loss | **sempre** un `Voucher 10€ Aperitivo Cena Dante Festival` con QR univoco, valido in 2 persone, claim 48 h |
| `< 20 pt` | Nessuna medaglia — resta il voucher Aperitivo Cena |
| `20–29 pt` | Medaglia d'Argento + Medaglia Digitale e Voucher Aperitivo Cena |
| `30–39 pt` | Medaglia d'Oro + Medaglia Digitale e Voucher Aperitivo Cena |
| `40–49 pt` | Medaglia di Platino + **Pass x2 Dante Festival (Standard)** |
| `≥ 50 pt` | Medaglia di Diamante + **Pass x2 Dante Festival VIP + Backstage** |

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
- **Feedback** — avviso "+X pt · nome" nell'HUD, badge combo con bonus accumulato, particelle
  dorate "Combo Tipica!", micro-vibrazioni (`navigator.vibrate`) ed effetti sonori sintetizzati via
  WebAudio (`src/game/huntAudio.ts`, senza asset).
- **Scheda dell'Esploratore** — interfaccia in stile fantasy del borgo (pergamena, cornici dorate,
  fregi, sigilli di cera, stemma araldico): regole, figurine da trovare, scala delle medaglie e
  taccuino con rango, record e voucher vinti.
- **Resoconto finale** — medaglia SVG animata per tier, punteggio (base + bonus combo), figurine
  raccolte, badge premio con sigillo di cera, **biglietti voucher** con QR di riscatto, scadenza
  dinamica e codice copiabile.
- **Riscatto sullo store** — ogni voucher è un **QR generato a runtime** (`qrcode`) che codifica l'URL
  dell'e-commerce ufficiale con querystring pre-applicata
  (`https://store.dantefestival.it/checkout?voucher=DANTE-…&tier=…&ref=…`): il codice promozionale
  arriva già applicato al carrello. Override dell'endpoint con `VITE_DANTE_STORE_URL`.
- **Viral loop** — messaggio WhatsApp pre-compilato (`https://api.whatsapp.com/send?text=…`) con
  medaglia, voucher Aperitivo Cena per 2 persone e link `?caccia=1&ref=REF-XXXXX`; chi apre il link
  atterra direttamente sulla caccia e l'attribuzione del referral viene salvata in locale.
  La **share card** (badge, punteggio, titolo utente, QR/referral) è disegnata lato client su canvas
  e condivisa come immagine (Web Share API) o scaricata in PNG.
- **Scarsità dinamica (FOMO)** — banner sempre visibile con i pass Dante Festival ancora disponibili
  nella giornata (`DAILY_PASS_ALLOWANCE = 20`, consumati in doppia copia da Platino/Diamante).
- **Persistenza locale** — record personale, codici voucher vinti, referral id e pass residui sono
  salvati in `localStorage`.

### Messaggi di condivisione (da specifica)

```
Ho appena esplorato il borgo sospeso e conquistato la Medaglia di {TIER}! 🎭
Ho sbloccato un Voucher di 10€ per l'Aperitivo Cena del Dante Festival valido per due persone
(e se fai Platino o Diamante vinci pure i biglietti!). Sfida il borgo qui: {APP_REFERRAL_LINK}
```

Per i punteggi senza medaglia il catalogo usa la variante `… e portato a casa {PUNTI} pt!`. Il
messaggio è codificato con `encodeURIComponent` nell'URL `https://api.whatsapp.com/send?text=…`.

## Struttura

```
src/
  engine/
    initExplorableWorld.ts        # renderer, camera, luci, post-processing, raycast, hotspot API
    procedural/
      TreasureBuilder.ts          # modelli 3D delle 9 figurine + posizionamento nel borgo
      IslandBuilder|VillageBuilder|FoliageBuilder|WaterBuilder|AtmosphereBuilder.ts
  game/
    treasureCatalog.ts            # fonte unica: figurine, punti, combo, tier, voucher, store, referral, condivisione, scarsità
    useTreasureHunt.ts            # stato sessione (idle|active|completed), timer, combo, punteggio, voucher, record
    huntAudio.ts                  # SFX WebAudio + vibrazioni
    qrCode.ts                     # wrapper runtime del generatore QR (fallback sicuro)
    shareCard.ts                  # share card canvas (medaglia, punteggio, titolo, QR referral)
  components/
    HuntHud.tsx                   # HUD pergamena: clessidra, punteggio, feedback, combo, bussola, mute
    TreasureStartModal.tsx        # "Scheda dell'Esploratore": Zero-Loss, regole, combo, medaglie, taccuino
    TreasureResultModal.tsx       # resoconto finale: medaglia, voucher con QR, share card, CTA store + WhatsApp
    VoucherTicket.tsx             # biglietto voucher: QR, codice copiabile, countdown 48 h, CTA store
    ScarcityBanner.tsx            # banner FOMO dei pass Dante Festival disponibili oggi
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

`npm run verify:hunt` esegue l'intera partita senza browser: countdown 20 s, reveal singolo, combo
gastronomiche con bonus, soglie medaglia, voucher Zero-Loss con QR e scadenza 48 h, URL di riscatto
sullo store, copy WhatsApp, consumo dei pass giornalieri e "Rigioca".
