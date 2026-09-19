/**
 * Verifica end-to-end (jsdom, senza browser) del mini-game "Caccia ai Tesori":
 * countdown 20s, reveal unico, combo gastronomiche, medaglie, voucher Zero-Loss,
 * riscatto sullo store, copy WhatsApp, share card, scarsità e rigioca.
 */
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://preview.example/app/?caccia=1',
  pretendToBeVisual: true,
});

globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
});

import React from 'react';
import { createRoot } from 'react-dom/client';
import { useTreasureHunt } from '../src/game/useTreasureHunt.ts';
import {
  DANTE_STORE_URL,
  HUNT_DURATION_MS,
  TREASURES,
  VOUCHER_VALIDITY_HOURS,
  getTier,
} from '../src/game/treasureCatalog.ts';
import { HuntHud } from '../src/components/HuntHud.tsx';
import { TreasureResultModal } from '../src/components/TreasureResultModal.tsx';
import { TreasureStartModal } from '../src/components/TreasureStartModal.tsx';
import { ScarcityBanner } from '../src/components/ScarcityBanner.tsx';

const h = React.createElement;
const apiRef = { current: null };

function Harness() {
  const hunt = useTreasureHunt();
  apiRef.current = hunt;
  return h(
    'div',
    null,
    h(HuntHud, {
      phase: hunt.phase,
      score: hunt.score,
      foundCount: hunt.foundCount,
      totalCount: hunt.totalCount,
      deadline: hunt.deadline,
      result: hunt.result,
      record: hunt.record,
      muted: hunt.muted,
      feed: hunt.feed,
      comboEvent: hunt.comboEvent,
      comboBonus: hunt.comboBonus,
      onOpenStart: () => {},
      onReplay: hunt.replay,
      onAbandon: hunt.abandon,
      onToggleMute: hunt.toggleMute,
      onOpenResult: () => {},
    }),
    h(TreasureStartModal, {
      isOpen: false,
      items: hunt.items,
      record: hunt.record,
      onStart: hunt.start,
      onClose: () => {},
    }),
    h(ScarcityBanner, { remaining: hunt.passesLeft, onOpenSheet: () => {} }),
    h(TreasureResultModal, {
      isOpen: hunt.phase === 'completed' && Boolean(hunt.result),
      result: hunt.result,
      items: hunt.items,
      onReplay: hunt.replay,
      onClose: () => {},
    })
  );
}

const container = document.getElementById('root');
const root = createRoot(container);
const act = async fn => {
  await React.act(async () => {
    await fn();
  });
};

await act(async () => {
  root.render(h(Harness));
});

const text = () => container.textContent ?? '';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// ---------------------------------------------------------------- 1. Stato iniziale
assert.equal(apiRef.current.phase, 'idle');
assert.equal(apiRef.current.items.length, 9);
assert.ok(text().includes('Caccia ai Tesori'), 'HUD idle presente');
assert.ok(text().includes('Inizia la caccia'), 'CTA di avvio presente');
assert.ok(
  apiRef.current.items.every(i => i.points >= 5 && i.points <= 10 && Number.isInteger(i.points)),
  'punti 5-10 (Math.floor(Math.random()*6)+5) per figurina'
);
assert.deepEqual(
  apiRef.current.items.map(i => i.label),
  ['caffè', 'scarpe', 'vino', 'pizza', 'insalata', 'lasagne', 'pollo', 'patate', 'bistecca']
);
assert.ok(text().includes('Solo 20 pass Dante Festival disponibili oggi'), 'banner scarsità presente');
const referralId = apiRef.current.referralId;
assert.match(referralId, /^REF-[A-Z2-9]{5}$/, 'codice invito personale generato');
assert.ok(
  apiRef.current.referralLink().includes(`ref=${referralId}`),
  'link di invito con referral id'
);

// ------------------------------------------------- 2. Avvio: il timer parte e corre
await act(async () => {
  apiRef.current.start();
});
assert.equal(apiRef.current.phase, 'active');
assert.ok(apiRef.current.deadline > performance.now(), 'deadline impostata');
assert.ok(
  Math.abs(apiRef.current.deadline - performance.now() - HUNT_DURATION_MS) < 100,
  'countdown esattamente 20 secondi'
);
assert.ok(text().includes('00:20'), 'countdown MM:SS visibile a schermo');
await act(async () => {
  await sleep(1300);
});
assert.ok(/00:1[0-9]/.test(text()), `timer che decresce (trovato: ${text().match(/00:\d\d/)?.[0]})`);

// ------------------------------------------------------- 3. Reveal: una sola volta
const pointsById = Object.fromEntries(apiRef.current.items.map(i => [i.id, i.points]));
const firstId = apiRef.current.items[0].id;
await act(async () => {
  apiRef.current.reveal(firstId);
});
assert.equal(apiRef.current.score, pointsById[firstId], 'score aggiornato con i punti della figurina');
assert.equal(apiRef.current.foundCount, 1);
assert.equal(apiRef.current.feed.at(-1)?.points, pointsById[firstId], 'feedback "+X pt" in HUD');
await act(async () => {
  apiRef.current.reveal(firstId); // secondo tap: deve essere ignorato
});
assert.equal(apiRef.current.foundCount, 1, 'una figurina vale un solo tap per sessione');
assert.equal(apiRef.current.isRevealed(firstId), true);

// --------------------------------- 4. Combo gastronomica: due tap coerenti di fila
assert.equal(apiRef.current.comboBonus, 0, 'nessuna combo prima del secondo tap');
const beforeCombo = apiRef.current.score;
await act(async () => {
  apiRef.current.reveal('vino');
});
await act(async () => {
  apiRef.current.reveal('pizza'); // vino + pizza = "Combo Tipica!"
});
const combo = apiRef.current.comboEvent;
assert.ok(combo, 'evento combo generato');
assert.equal(combo.label, 'Combo Tipica!');
assert.equal(combo.bonus, 3);
assert.equal(
  apiRef.current.score,
  beforeCombo + pointsById.vino + pointsById.pizza + 3,
  'bonus combo +3 applicato immediatamente'
);
assert.equal(apiRef.current.comboBonus, 3);
assert.equal(apiRef.current.comboCount, 1);
assert.ok(text().includes('Combo Tipica!'), 'feedback particellare "Combo Tipica!" a schermo');
assert.ok(text().includes('+3'), 'bonus combo mostrato nella HUD');
await act(async () => {
  apiRef.current.reveal('scarpe'); // coppia non coerente: nessun bonus
});
assert.equal(apiRef.current.comboBonus, 3, 'nessun bonus per coppie non correlate');

// ------------------------------------- 5. Altri reveal fino alla fascia Oro (30-39)
let score = apiRef.current.score;
for (const item of apiRef.current.items) {
  if (apiRef.current.isRevealed(item.id)) continue;
  if (score >= 30) break;
  await act(async () => {
    apiRef.current.reveal(item.id);
  });
  score = apiRef.current.score;
}
assert.ok(score >= 30 && score <= 39, `score parziale in fascia Oro (${score})`);
assert.equal(getTier(score).id, 'gold');

// ------------------------------------------- 6. Scadenza timer: blocco + risultati
await act(async () => {
  await sleep(HUNT_DURATION_MS + 400 - 1300 - 0);
});
assert.equal(apiRef.current.phase, 'completed', 'sessione chiusa allo scadere dei 20s');
const result = apiRef.current.result;
assert.ok(result, 'risultato disponibile');
assert.equal(result.score, score);
assert.equal(result.tier.id, 'gold');
assert.equal(result.baseScore + result.comboBonus, result.score, 'punteggio = base + bonus combo');
assert.equal(result.totalCount, 9);
assert.equal(result.vouchers.length, 1, 'solo il voucher Aperitivo per Oro');
const aperitivo = result.vouchers[0];
assert.equal(aperitivo.kind, 'aperitivo');
assert.equal(aperitivo.label, 'Voucher 10€ Aperitivo Cena Dante Festival');
assert.equal(aperitivo.rule, 'Valido presentandosi in 2 persone');
assert.ok(aperitivo.code.startsWith('DANTE-APERI-'), 'codice voucher univoco');
assert.equal(
  Math.round((aperitivo.expiresAt - Date.now()) / 3_600_000),
  VOUCHER_VALIDITY_HOURS,
  'claim valido 48 ore'
);
assert.equal(aperitivo.redeemUrl, result.redeemUrl, 'CTA principale punta al voucher');
assert.ok(result.redeemUrl.startsWith(`${DANTE_STORE_URL}?voucher=`), 'redirect store ufficiale');
const redeem = new URL(result.redeemUrl);
assert.equal(redeem.searchParams.get('voucher'), aperitivo.code);
assert.equal(redeem.searchParams.get('tier'), 'GOLD');
assert.equal(redeem.searchParams.get('ref'), referralId);
assert.equal(aperitivo.qrPayload, result.redeemUrl, 'QR = URL store con codice pre-applicato');

const revealAfterEnd = (() => {
  const before = apiRef.current.foundCount;
  apiRef.current.reveal(TREASURES[8].id);
  return { before, after: apiRef.current.foundCount };
})();
assert.equal(revealAfterEnd.after, revealAfterEnd.before, 'tap bloccati dopo la fine');

await act(async () => {
  await sleep(60);
});
assert.ok(text().includes("Medaglia d'Oro"), 'schermata finale con medaglia');
assert.ok(text().includes('Voucher 10€ Aperitivo Cena Dante Festival'), 'claim sempre presente');
assert.ok(text().includes('Riscatta sullo Store Ufficiale'), 'CTA primaria presente');
assert.ok(text().includes('Condividi su WhatsApp'), 'CTA secondaria presente');
assert.ok(text().includes('Rigioca'), 'pulsante Rigioca presente');
const primaryHref = container.querySelector(`a[href="${result.redeemUrl}"]`);
assert.ok(primaryHref, 'CTA primaria collegata allo store con voucher e tier');

// --------------------------------------------- 7. Payload WhatsApp secondo specifica
const shareMessage = apiRef.current.shareMessage();
assert.match(shareMessage, /^Ho appena esplorato il borgo sospeso e conquistato la Medaglia di Oro!/);
assert.ok(shareMessage.includes("Voucher di 10€ per l'Aperitivo Cena del Dante Festival"));
assert.ok(shareMessage.includes('valido per due persone'));
assert.ok(shareMessage.includes('se fai Platino o Diamante vinci pure i biglietti!'));
assert.ok(shareMessage.includes(`Sfida il borgo qui: ${apiRef.current.referralLink()}`));
const shareUrl = apiRef.current.shareUrl();
assert.ok(shareUrl.startsWith('https://api.whatsapp.com/send?text='), 'URL schema WhatsApp');
assert.equal(
  decodeURIComponent(shareUrl.replace(/\+/g, ' ').replace('https://api.whatsapp.com/send?text=', '')),
  shareMessage,
  'round-trip encodeURIComponent'
);
const href = container.querySelector('a[href^="https://api.whatsapp.com/send"]');
assert.ok(href, 'link WhatsApp nella modale risultati');
assert.ok(href.getAttribute('target') === '_blank');

// ---------------------------------- 8. Share card: fallback senza canvas in jsdom
assert.ok(text().includes('Crea card'), 'generatore share card disponibile');
assert.ok(text().includes(referralId), 'referral id mostrato sulla card');

// --------------------------------- 9. Rigioca: reset di timer, punti e figurine
await act(async () => {
  apiRef.current.replay();
});
assert.equal(apiRef.current.phase, 'idle');
assert.equal(apiRef.current.score, 0);
assert.equal(apiRef.current.comboBonus, 0);
assert.equal(apiRef.current.foundCount, 0);
assert.equal(apiRef.current.result, null);
assert.ok(apiRef.current.deadline === null, 'timer azzerato');
assert.ok(apiRef.current.items.every(i => !i.revealed), 'figurine resettate');

// ----------------------- 10. Sessione completa: 9/9, pass Dante Festival, record
const record = apiRef.current.record;
assert.equal(record.bestScore, score, 'record personale salvato');
assert.ok(record.bestTier.includes('Oro'));
assert.ok(
  record.vouchers.some(v => v.code === aperitivo.code),
  'voucher persistito nel taccuino'
);
assert.equal(record.referralId, referralId, 'referral persistito');

await act(async () => {
  apiRef.current.start();
});
const passesBefore = apiRef.current.passesLeft;
for (const item of apiRef.current.items) {
  await act(async () => {
    apiRef.current.reveal(item.id);
  });
}
await act(async () => {
  await sleep(900); // chiusura anticipata dopo l'animazione dell'ultima figurina
});
assert.equal(apiRef.current.phase, 'completed');
const full = apiRef.current.result;
assert.equal(full.foundCount, 9);
// Ordine di catalogo: vino->pizza, pollo->patate e patate->bistecca sono combo.
assert.equal(full.comboCount, 3, 'combo riconosciute nell\'ordine di catalogo');
assert.ok(full.comboBonus === 9, `bonus combo totale +9 (trovato ${full.comboBonus})`);
assert.equal(full.baseScore + full.comboBonus, full.score);
assert.ok(full.score >= 54 && full.score <= 99, `punteggio pieno ${full.score}`);
assert.equal(full.tier.id, full.score >= 50 ? 'diamond' : 'platinum');
const passIssue = full.vouchers.find(v => v.kind !== 'aperitivo');
assert.ok(passIssue, 'voucher pass x2 emesso per Platino/Diamante');
assert.equal(passIssue.kind, full.score >= 50 ? 'pass_vip' : 'pass');
assert.ok(passIssue.code.startsWith('DANTE-VIP2-') || passIssue.code.startsWith('DANTE-PASS2-'));
assert.ok(passIssue.label.includes('Dante Festival'));
assert.equal(passIssue.redeemUrl, full.redeemUrl, 'la CTA principale riscatta il premio migliore');
assert.ok(text().includes('Pass per 2 persone con biglietto pagato per il Dante Festival'));
assert.ok(text().includes(passIssue.code), 'codice pass mostrato nella schermata finale');
assert.equal(apiRef.current.passesLeft, passesBefore - 2, 'pass giornalieri consumati dal vincitore');
assert.match(
  apiRef.current.shareMessage(),
  new RegExp(`Medaglia di ${full.tier.medalName}`)
);
assert.ok(
  apiRef.current.record.vouchers.some(v => v.code === passIssue.code),
  'pass persistito nei progressi'
);

// ---------------------------------------------------- 11. Uscita verso il borgo
await act(async () => {
  apiRef.current.abandon();
});
assert.equal(apiRef.current.phase, 'idle');

await act(async () => {
  root.unmount();
});
dom.window.close();

console.log(
  '✅ Test DOM del mini-game superati (timer 20s, combo, voucher Zero-Loss, store, share, rigioca)'
);
process.exit(0);
