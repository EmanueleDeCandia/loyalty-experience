/**
 * Verifica end-to-end (jsdom, senza browser) del mini-game "Caccia ai Tesori":
 * avvio timer, reveal, chiusura sessione, tier/premio, condivisione WhatsApp, rigioca.
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
import { getTier, TREASURES } from '../src/game/treasureCatalog.ts';
import { HuntHud } from '../src/components/HuntHud.tsx';
import { TreasureResultModal } from '../src/components/TreasureResultModal.tsx';
import { TreasureStartModal } from '../src/components/TreasureStartModal.tsx';

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
const initialPoints = apiRef.current.items.map(i => i.points);
assert.ok(initialPoints.every(p => p >= 5 && p <= 10), 'punti 5-10 per figurina');
assert.deepEqual(
  apiRef.current.items.map(i => i.label),
  ['caffè', 'scarpe', 'vino', 'pizza', 'insalata', 'lasagne', 'pollo', 'patate', 'bistecca']
);

// ------------------------------------------------- 2. Avvio: il timer parte e corre
await act(async () => {
  apiRef.current.start();
});
assert.equal(apiRef.current.phase, 'active');
assert.ok(apiRef.current.deadline > performance.now(), 'deadline impostata');
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
await act(async () => {
  apiRef.current.reveal(firstId); // secondo tap: deve essere ignorato
});
assert.equal(apiRef.current.foundCount, 1, 'una figurina vale un solo tap per sessione');
assert.equal(apiRef.current.isRevealed(firstId), true);

// ------------------------------------- 4. Reveal multipli fino a medaglia Oro range
let score = apiRef.current.score;
for (const item of apiRef.current.items) {
  if (item.id === firstId) continue;
  if (score >= 30) break;
  await act(async () => {
    apiRef.current.reveal(item.id);
  });
  score = apiRef.current.score;
}
assert.ok(score >= 30 && score <= 39, `score parziale in fascia Oro (${score})`);
assert.equal(getTier(score).id, 'gold');

// ------------------------------------------- 5. Scadenza timer: blocco + risultati
await act(async () => {
  await sleep(19400);
});
assert.equal(apiRef.current.phase, 'completed', 'sessione chiusa allo scadere dei 20s');
const result = apiRef.current.result;
assert.ok(result, 'risultato disponibile');
assert.equal(result.score, score);
assert.equal(result.tier.id, 'gold');
assert.equal(result.voucherCode, null, 'nessun voucher per Oro');
assert.equal(result.totalCount, 9);

const revealAfterEnd = (() => {
  const before = apiRef.current.foundCount;
  apiRef.current.reveal(TREASURES[8].id);
  return { before, after: apiRef.current.foundCount };
})();
assert.equal(revealAfterEnd.after, revealAfterEnd.before, 'tap bloccati dopo la fine');

await act(async () => {
  await sleep(50);
});
assert.ok(text().includes("Medaglia d'Oro"), 'schermata finale con medaglia');
assert.ok(text().includes('Condividi su WhatsApp'), 'pulsante WhatsApp presente');
assert.ok(text().includes('Rigioca'), 'pulsante Rigioca presente');

// --------------------------------------------- 6. Payload WhatsApp secondo specifica
const shareMessage = apiRef.current.shareMessage();
assert.match(
  shareMessage,
  new RegExp(`^Ho sbloccato la Medaglia di Oro con ${score} pt esplorando il borgo sospeso! Riuscirai a vincere il pass per il Dante Festival\\? Gioca qui: `),
  `messaggio Oro conforme: ${shareMessage}`
);
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

// ------------------------------------ 7. Rigioca: reset di timer, punti e figurine
await act(async () => {
  apiRef.current.replay();
});
assert.equal(apiRef.current.phase, 'idle');
assert.equal(apiRef.current.score, 0);
assert.equal(apiRef.current.foundCount, 0);
assert.equal(apiRef.current.result, null);
assert.ok(apiRef.current.deadline === null, 'timer azzerato');
assert.ok(apiRef.current.items.every(i => !i.revealed), 'figurine resettate');

// ----------------------- 8. Sessione completa: 9/9, premio Dante Festival, record
const record = apiRef.current.record;
assert.equal(record.bestScore, score, 'record personale salvato');
assert.ok(record.bestTier.includes('Oro'));

await act(async () => {
  apiRef.current.start();
});
for (const item of apiRef.current.items) {
  await act(async () => {
    apiRef.current.reveal(item.id);
  });
}
await act(async () => {
  await sleep(800); // chiusura anticipata dopo il flip dell'ultima figurina
});
assert.equal(apiRef.current.phase, 'completed');
const full = apiRef.current.result;
assert.equal(full.foundCount, 9);
assert.ok(full.score >= 45 && full.score <= 90, `punteggio pieno ${full.score}`);
assert.equal(full.tier.id, full.score >= 50 ? 'diamond' : 'platinum');
assert.ok(full.voucherCode && full.voucherCode.startsWith('DF-'), 'codice voucher generato');
assert.ok(text().includes('Pass per 2 persone con biglietto pagato per il Dante Festival'));
assert.ok(text().includes(full.voucherCode), 'voucher mostrato nella schermata finale');
assert.match(
  apiRef.current.shareMessage(),
  new RegExp(`^Ho conquistato la Medaglia di ${full.tier.medalName} \\(${full.score} pt\\) e vinto 2 biglietti per il Dante Festival nel borgo sospeso! Prova a battermi: `)
);
assert.ok(
  apiRef.current.record.vouchers.some(v => v.code === full.voucherCode),
  'voucher persistito nei progressi'
);

// ---------------------------------------------------- 9. Uscita verso il borgo
await act(async () => {
  apiRef.current.abandon();
});
assert.equal(apiRef.current.phase, 'idle');

await act(async () => {
  root.unmount();
});
dom.window.close();

console.log('✅ Test DOM del mini-game superati (timer, reveal, tier, voucher, share, rigioca)');
process.exit(0);
