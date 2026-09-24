# Funzionalità marketing — flussi e registrazione dati

_Verifica tecnica aggiornata al 24 settembre 2026._

## 1. Referral e condivisione

1. Al primo accesso il browser genera un identificativo personale nel formato `REF-XXXXX` e lo conserva in `localStorage`.
2. All'avvio della prima partita l'API crea un profilo anonimo in `referral_profiles`, usando il codice come **primary key**.
3. I link condivisi usano `?caccia=1&ref=REF-XXXXX` e aprono direttamente la caccia.
4. All'arrivo, l'app valida il formato del referral e conserva l'attribuzione nel browser per un massimo di 30 giorni.
5. All'avvio della partita il server accetta il referrer soltanto se esiste già in `referral_profiles`; codici inventati e auto-referral vengono ignorati.
6. La sessione registra il proprietario in `hunts.referral_id` e l'invitante in `hunts.incoming_referral`.
7. Quando il proprietario completa il lead gate, il suo profilo anonimo viene attivato e associato in modo immutabile a `leads.id`.
8. Il risultato prepara il copy WhatsApp e la share card con link personale.

**Stato verificato:** generazione, profilo anonimo, deep link, finestra di attribuzione, protezione da codici inesistenti/auto-referral, associazione al lead e condivisione funzionanti. Il calcolo di eventuali premi per il referrer resta una regola commerciale successiva; i dati necessari sono ora strutturati.

## 2. Lead capture e consensi

Il QR e il codice voucher non vengono mostrati prima della compilazione del lead gate.

- Canali accettati: email oppure telefono.
- La privacy necessaria alla gestione del premio è obbligatoria.
- Il consenso marketing è separato e facoltativo.
- L'opt-in WhatsApp è separato, facoltativo e registrabile solo per contatti telefonici.
- Email e telefono vengono validati anche dal server; la sola validazione HTML non è considerata sufficiente.
- La coppia `contact_type + contact` è univoca: una nuova compilazione aggiorna i consensi, comprese eventuali revoche, senza duplicare il contatto.
- Vengono registrati timestamp del consenso, origine (`treasure_hunt`) e data di creazione.

**Stato verificato:** blocco senza privacy, rifiuto contatti non validi, creazione lead, deduplicazione e aggiornamento/revoca consensi funzionanti.

## 3. Voucher e inventario

- I codici non sono generati dal frontend: l'emissione avviene esclusivamente nell'API dopo una partita completata e un lead valido.
- Il punteggio usato per determinare il premio è quello calcolato dal server.
- Ogni partita può emettere una sola serie di voucher; richieste ripetute restituiscono gli stessi codici.
- Il voucher Aperitivo da 10 € viene sempre emesso.
- Platino e Diamante possono emettere anche il Pass x2, se l'inventario server-side è disponibile.
- L'inventario è decrementato in una transazione SQLite e non in `localStorage`.
- La scadenza è fissata a 48 ore dall'emissione.
- Gli stati sono `active`, `redeemed` ed `expired`; un secondo riscatto viene rifiutato.
- QR e CTA puntano al checkout proprietario configurato con `DANTE_STORE_URL`, passando voucher, tier e referral.

**Stato verificato:** emissione, idempotenza, scadenza, consumo stock, validazione e blocco del doppio utilizzo funzionanti.

### Collegamento con lo Store proprietario

L'app è pronta a portare l'utente al checkout. Quando verrà realizzato lo Store, il suo backend dovrà interrogare l'API voucher server-to-server e confermare il consumo soltanto dopo il pagamento. Per una gestione completa dei checkout interrotti è previsto come step successivo il contratto `reserve / confirm / release`; l'attuale endpoint `redeem` copre già il consumo atomico ma non la prenotazione temporanea.

## 4. Dati registrati

SQLite opera in modalità WAL e contiene:

| Tabella | Contenuto |
| --- | --- |
| `referral_profiles` | codice referral primary key, lead proprietario opzionale, creazione, attivazione e ultimo utilizzo |
| `hunts` | sessione, variante A/B, durata, punti, raccolte, combo, risultato, referral personale e referrer in ingresso |
| `leads` | contatto, tipo, consensi separati, timestamp privacy e origine |
| `vouchers` | codice, tipo, tier, lead e partita collegati, stato, scadenza e data riscatto |
| `inventory` | disponibilità giornaliera dei pass |
| `analytics` | eventi funnel, sessione, variante e proprietà allowlisted |

Nel browser rimangono soltanto record personale, referral e una copia UX dei premi. Il server resta la fonte autorevole per validità, disponibilità e utilizzo dei voucher.

### Relazioni del referral

```text
referral_profiles.code (PK)
  ├── hunts.referral_id          proprietario della sessione
  ├── hunts.incoming_referral    invitante attribuito
  └── referral_profiles.lead_id → leads.id

hunts.id
  ├── analytics.session_id
  └── vouchers.hunt_id
```

Il codice è la primary key del **profilo referral**, mentre UUID distinti restano correttamente le primary key di sessioni, lead e voucher. Le installazioni esistenti vengono migrate senza perdita: i codici già presenti nelle sessioni sono inseriti in `referral_profiles` e, quando possibile, collegati ai lead storici.

Esempio di report per referrer:

```sql
SELECT
  rp.code,
  COUNT(DISTINCT h.id) AS sessioni_invitate,
  COUNT(DISTINCT h.lead_id) AS lead_generati,
  COUNT(DISTINCT v.id) AS voucher_emessi,
  COUNT(DISTINCT CASE WHEN v.status = 'redeemed' THEN v.id END) AS voucher_riscattati
FROM referral_profiles rp
LEFT JOIN hunts h ON h.incoming_referral = rp.code
LEFT JOIN vouchers v ON v.hunt_id = h.id
GROUP BY rp.code;
```

## 5. Funnel e test A/B

Sono registrabili gli eventi:

- `app_loaded`;
- `start_modal_opened`;
- `hunt_started`;
- raccolta delle figurine;
- `hunt_completed`;
- `lead_viewed` e `lead_submitted`;
- `voucher_claimed` e `voucher_redeemed`;
- `store_clicked` e `share_clicked`.

A ogni nuova partita il server assegna casualmente la variante `timer_20` oppure `timer_30`. La variante è salvata con sessione ed eventi, rendendo confrontabili completamento, lead e riscatto.

## 6. Requisiti prima della produzione

- HTTPS e segreti gestiti dall'hosting;
- autenticazione server-to-server dello Store;
- politica di retention/cancellazione lead e procedura per i diritti GDPR;
- backup cifrati del database oppure migrazione a PostgreSQL gestito;
- informativa privacy definitiva e riferimenti del titolare;
- rate limiting e monitoraggio operativo;
- implementazione `reserve / confirm / release` nel checkout proprietario;
- provider firmato per Apple Wallet e issuer Google Wallet, se attivati.

## Verifica automatica

Il comando seguente prova sessione, attribuzione referral, punteggio server-side, lead e consensi, emissione/idempotenza voucher, stock, scadenza e rifiuto del doppio riscatto:

```bash
npm run verify:hunt
```
