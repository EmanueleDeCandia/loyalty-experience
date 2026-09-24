import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';
import { getDashboardData, seedDashboardDemo } from './admin-dashboard.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try { loadEnvFile(resolve(ROOT, '.env')); } catch { /* configurazione via ambiente */ }
const PORT = Number(process.env.API_PORT || 8787);
const HOST = process.env.API_HOST || '0.0.0.0';
const DB_PATH = resolve(ROOT, process.env.DATABASE_PATH || 'data/loyalty.sqlite');
const DAILY_PASSES = Number(process.env.DAILY_PASS_ALLOWANCE || 20);
const STORE_URL = process.env.DANTE_STORE_URL || 'https://store.dantefestival.it/checkout';
const FESTIVAL_START_AT = process.env.FESTIVAL_START_AT || process.env.VITE_FESTIVAL_START_AT || null;
const CASHIER_KEY = process.env.CASHIER_API_KEY || '';
const APPLE_WALLET_BASE_URL = process.env.APPLE_WALLET_BASE_URL || '';
const GOOGLE_WALLET_BASE_URL = process.env.GOOGLE_WALLET_BASE_URL || '';
const ADMIN_DEMO_EMAIL = process.env.ADMIN_DEMO_EMAIL || 'admin@dantefestival.it';
const ADMIN_DEMO_PASSWORD = process.env.ADMIN_DEMO_PASSWORD || 'demo2026';
const ADMIN_TOKEN = process.env.ADMIN_DEMO_TOKEN || randomBytes(24).toString('hex');
const VOUCHER_HOURS = 48;
const IDS = ['caffe', 'scarpe', 'vino', 'pizza', 'insalata', 'lasagne', 'pollo', 'patate', 'bistecca'];
const COMBOS = new Map([
  ['pizza|vino', 3], ['bistecca|patate', 3], ['lasagne|vino', 3],
  ['patate|pollo', 3], ['bistecca|insalata', 3], ['caffe|lasagne', 3],
]);

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS hunts (
    id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, deadline_at INTEGER NOT NULL,
    duration_ms INTEGER NOT NULL, variant TEXT NOT NULL, points_json TEXT NOT NULL,
    collected_json TEXT NOT NULL DEFAULT '[]', last_treasure TEXT,
    base_score INTEGER NOT NULL DEFAULT 0, combo_bonus INTEGER NOT NULL DEFAULT 0,
    combo_count INTEGER NOT NULL DEFAULT 0, completed_at INTEGER, lead_id TEXT,
    referral_id TEXT, incoming_referral TEXT, claimed_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY, contact_type TEXT NOT NULL, contact TEXT NOT NULL,
    marketing_opt_in INTEGER NOT NULL DEFAULT 0, whatsapp_opt_in INTEGER NOT NULL DEFAULT 0,
    privacy_accepted_at INTEGER NOT NULL, source TEXT NOT NULL, created_at INTEGER NOT NULL,
    UNIQUE(contact_type, contact)
  );
  CREATE TABLE IF NOT EXISTS referral_profiles (
    code TEXT PRIMARY KEY,
    lead_id TEXT,
    created_at INTEGER NOT NULL,
    activated_at INTEGER,
    last_seen_at INTEGER NOT NULL,
    FOREIGN KEY(lead_id) REFERENCES leads(id)
  );
  CREATE TABLE IF NOT EXISTS vouchers (
    id TEXT PRIMARY KEY, code TEXT UNIQUE NOT NULL, hunt_id TEXT NOT NULL, lead_id TEXT NOT NULL,
    kind TEXT NOT NULL, tier TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
    expires_at INTEGER NOT NULL, redeemed_at INTEGER, created_at INTEGER NOT NULL,
    FOREIGN KEY(hunt_id) REFERENCES hunts(id), FOREIGN KEY(lead_id) REFERENCES leads(id)
  );
  CREATE TABLE IF NOT EXISTS inventory (
    day TEXT PRIMARY KEY, remaining INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT, event TEXT NOT NULL, session_id TEXT,
    variant TEXT, payload_json TEXT NOT NULL, created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
  CREATE INDEX IF NOT EXISTS idx_referral_profiles_lead ON referral_profiles(lead_id);
  CREATE INDEX IF NOT EXISTS idx_hunts_referral ON hunts(referral_id);
  CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics(event, created_at);
`);
// Migrazione compatibile con database creati dalle versioni precedenti.
if (!db.prepare("PRAGMA table_info(hunts)").all().some(column => column.name === 'incoming_referral')) {
  db.exec('ALTER TABLE hunts ADD COLUMN incoming_referral TEXT');
}
db.exec('CREATE INDEX IF NOT EXISTS idx_hunts_incoming_referral ON hunts(incoming_referral)');

// Backfill non distruttivo dei codici già apparsi nelle sessioni storiche.
db.exec(`
  INSERT OR IGNORE INTO referral_profiles(code, created_at, last_seen_at)
    SELECT referral_id, MIN(started_at), MAX(started_at)
    FROM hunts WHERE referral_id IS NOT NULL GROUP BY referral_id;
  INSERT OR IGNORE INTO referral_profiles(code, created_at, last_seen_at)
    SELECT incoming_referral, MIN(started_at), MAX(started_at)
    FROM hunts WHERE incoming_referral IS NOT NULL GROUP BY incoming_referral;
`);
const bindHistoricalProfile = db.prepare(`
  UPDATE referral_profiles
  SET lead_id=COALESCE(lead_id, ?), activated_at=COALESCE(activated_at, ?)
  WHERE code=?
`);
for (const row of db.prepare(`
  SELECT referral_id, lead_id, MIN(claimed_at) AS activated_at
  FROM hunts
  WHERE referral_id IS NOT NULL AND lead_id IS NOT NULL
  GROUP BY referral_id, lead_id
`).all()) {
  bindHistoricalProfile.run(row.lead_id, row.activated_at, row.referral_id);
}

const json = (res, status, body, extra = {}) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra });
  res.end(JSON.stringify(body));
};
const readBody = async req => {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw Object.assign(new Error('Payload troppo grande'), { status: 413 });
  }
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw Object.assign(new Error('JSON non valido'), { status: 400 }); }
};
const dayKey = () => new Date().toISOString().slice(0, 10);
const inventory = () => {
  const day = dayKey();
  db.prepare('INSERT OR IGNORE INTO inventory(day, remaining) VALUES (?, ?)').run(day, DAILY_PASSES);
  return db.prepare('SELECT remaining FROM inventory WHERE day = ?').get(day).remaining;
};
const tierFor = score => score >= 50 ? 'diamond' : score >= 40 ? 'platinum' : score >= 30 ? 'gold' : score >= 20 ? 'silver' : 'none';
const pairKey = (a, b) => [a, b].sort().join('|');
const REFERRAL_PATTERN = /^REF-[A-Z2-9]{5}$/;
const registerReferralProfile = (code, now = Date.now()) => {
  if (!REFERRAL_PATTERN.test(String(code || ''))) return null;
  db.prepare(`
    INSERT INTO referral_profiles(code, created_at, last_seen_at)
    VALUES (?, ?, ?)
    ON CONFLICT(code) DO UPDATE SET last_seen_at=excluded.last_seen_at
  `).run(code, now, now);
  return code;
};
const code = kind => `DANTE-${kind === 'aperitivo' ? 'APERI' : kind === 'pass' ? 'PASS2' : 'VIP2'}-${randomBytes(5).toString('base64url').toUpperCase().replace(/[-_01OI]/g, 'X').slice(0, 7)}`;
const walletLinks = voucherCode => ({
  ...(APPLE_WALLET_BASE_URL ? { apple: `${APPLE_WALLET_BASE_URL.replace(/\/$/, '')}/${encodeURIComponent(voucherCode)}` } : {}),
  ...(GOOGLE_WALLET_BASE_URL ? { google: `${GOOGLE_WALLET_BASE_URL}${GOOGLE_WALLET_BASE_URL.includes('?') ? '&' : '?'}code=${encodeURIComponent(voucherCode)}` } : {}),
});
const publicVoucher = row => {
  const hunt = db.prepare('SELECT referral_id FROM hunts WHERE id=?').get(row.hunt_id);
  const query = new URLSearchParams({ voucher: row.code, tier: row.tier.toUpperCase(), ...(hunt?.referral_id ? { ref: hunt.referral_id } : {}) });
  const redeemUrl = `${STORE_URL}?${query}`;
  const labels = {
    aperitivo: ['Voucher 10€ Aperitivo Cena Dante Festival', 'Valido presentandosi in 2 persone', '10€'],
    pass: ['Pass x2 Dante Festival (Standard)', '2 biglietti nominativi da riscattare sullo store', 'Standard'],
    pass_vip: ['Pass x2 Dante Festival VIP + Backstage', '2 pass nominativi VIP con backstage', 'VIP + Backstage'],
  };
  const [label, rule, value] = labels[row.kind];
  return { kind: row.kind, code: row.code, label, rule, value, expiresAt: row.expires_at, redeemUrl, qrPayload: redeemUrl, walletLinks: walletLinks(row.code) };
};
const track = (event, sessionId, variant, payload = {}) => {
  db.prepare('INSERT INTO analytics(event, session_id, variant, payload_json, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(event, sessionId || null, variant || null, JSON.stringify(payload), Date.now());
};

async function route(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'OPTIONS') return json(res, 204, {}, { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type,authorization,x-cashier-key', 'access-control-allow-methods': 'GET,POST,OPTIONS' });
  if (url.pathname === '/api/health') return json(res, 200, { ok: true, database: 'sqlite', now: new Date().toISOString() });

  if (req.method === 'POST' && url.pathname === '/api/admin/demo-login') {
    const body = await readBody(req);
    if (String(body.email || '').trim().toLowerCase() !== ADMIN_DEMO_EMAIL || body.password !== ADMIN_DEMO_PASSWORD) {
      return json(res, 401, { error: 'Credenziali demo non valide' });
    }
    seedDashboardDemo(db);
    return json(res, 200, { token: ADMIN_TOKEN, user: { name: 'Amministratore Demo', email: ADMIN_DEMO_EMAIL, role: 'admin' } });
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/dashboard') {
    if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return json(res, 401, { error: 'Sessione amministratore non valida' });
    seedDashboardDemo(db);
    return json(res, 200, getDashboardData(db));
  }

  if (req.method === 'GET' && url.pathname === '/api/campaign') {
    return json(res, 200, { serverNow: Date.now(), festivalStartAt: FESTIVAL_START_AT, passesRemaining: inventory(), voucherValidityHours: VOUCHER_HOURS });
  }

  if (req.method === 'POST' && url.pathname === '/api/hunts/start') {
    const body = await readBody(req);
    const id = randomUUID();
    const startedAt = Date.now();
    const variant = Math.random() < 0.5 ? 'timer_20' : 'timer_30';
    const durationMs = variant === 'timer_20' ? 20_000 : 30_000;
    const points = Object.fromEntries(IDS.map(item => [item, 5 + Math.floor(Math.random() * 6)]));
    // Il codice personale crea/aggiorna il profilo anonimo. Un referrer in ingresso
    // è attribuito soltanto se esiste già: un codice inventato non genera credito.
    const referralId = registerReferralProfile(String(body.referralId || ''), startedAt);
    const candidateReferrer = REFERRAL_PATTERN.test(String(body.incomingReferral || '')) ? body.incomingReferral : null;
    const knownReferrer = candidateReferrer
      ? db.prepare('SELECT code FROM referral_profiles WHERE code=?').get(candidateReferrer)
      : null;
    const incomingReferral = knownReferrer && candidateReferrer !== referralId ? candidateReferrer : null;
    if (incomingReferral) {
      db.prepare('UPDATE referral_profiles SET last_seen_at=? WHERE code=?').run(startedAt, incomingReferral);
    }
    db.prepare(`INSERT INTO hunts(id, started_at, deadline_at, duration_ms, variant, points_json, collected_json, referral_id, incoming_referral)
      VALUES (?, ?, ?, ?, ?, ?, '[]', ?, ?)`).run(id, startedAt, startedAt + durationMs, durationMs, variant, JSON.stringify(points), referralId, incomingReferral);
    track('hunt_started', id, variant, { referrer: incomingReferral });
    return json(res, 201, { id, startedAt, deadlineAt: startedAt + durationMs, durationMs, variant, points });
  }

  const collectMatch = url.pathname.match(/^\/api\/hunts\/([^/]+)\/collect$/);
  if (req.method === 'POST' && collectMatch) {
    const body = await readBody(req);
    const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(collectMatch[1]);
    if (!hunt) return json(res, 404, { error: 'Sessione non trovata' });
    if (hunt.completed_at || Date.now() > hunt.deadline_at + 700) return json(res, 409, { error: 'La caccia è terminata' });
    if (!IDS.includes(body.treasureId)) return json(res, 400, { error: 'Figurina non valida' });
    const collected = JSON.parse(hunt.collected_json);
    if (collected.includes(body.treasureId)) return json(res, 409, { error: 'Figurina già raccolta' });
    const points = JSON.parse(hunt.points_json)[body.treasureId];
    const bonus = hunt.last_treasure ? (COMBOS.get(pairKey(hunt.last_treasure, body.treasureId)) || 0) : 0;
    collected.push(body.treasureId);
    db.prepare(`UPDATE hunts SET collected_json=?, last_treasure=?, base_score=base_score+?, combo_bonus=combo_bonus+?, combo_count=combo_count+? WHERE id=?`)
      .run(JSON.stringify(collected), body.treasureId, points, bonus, bonus ? 1 : 0, hunt.id);
    track('treasure_collected', hunt.id, hunt.variant, { treasureId: body.treasureId, points, bonus });
    return json(res, 200, { treasureId: body.treasureId, points, bonus, score: hunt.base_score + points + hunt.combo_bonus + bonus, foundCount: collected.length });
  }

  const completeMatch = url.pathname.match(/^\/api\/hunts\/([^/]+)\/complete$/);
  if (req.method === 'POST' && completeMatch) {
    const hunt = db.prepare('SELECT * FROM hunts WHERE id = ?').get(completeMatch[1]);
    if (!hunt) return json(res, 404, { error: 'Sessione non trovata' });
    const completedAt = hunt.completed_at || Date.now();
    if (!hunt.completed_at) db.prepare('UPDATE hunts SET completed_at=? WHERE id=?').run(completedAt, hunt.id);
    const score = hunt.base_score + hunt.combo_bonus;
    const tier = tierFor(score);
    track('hunt_completed', hunt.id, hunt.variant, { score, tier, foundCount: JSON.parse(hunt.collected_json).length });
    return json(res, 200, { id: hunt.id, score, baseScore: hunt.base_score, comboBonus: hunt.combo_bonus, comboCount: hunt.combo_count, foundCount: JSON.parse(hunt.collected_json).length, tier, durationMs: hunt.duration_ms, variant: hunt.variant, needsLead: !hunt.claimed_at });
  }

  const claimMatch = url.pathname.match(/^\/api\/hunts\/([^/]+)\/claim$/);
  if (req.method === 'POST' && claimMatch) {
    const body = await readBody(req);
    const hunt = db.prepare('SELECT * FROM hunts WHERE id=?').get(claimMatch[1]);
    if (!hunt?.completed_at) return json(res, 409, { error: 'Completa la caccia prima di richiedere il premio' });
    const contactType = body.contactType === 'phone' ? 'phone' : 'email';
    const contact = String(body.contact || '').trim().toLowerCase();
    const valid = contactType === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) : /^\+?[0-9 ()-]{8,20}$/.test(contact);
    if (!valid) return json(res, 400, { error: contactType === 'email' ? 'Inserisci un’email valida' : 'Inserisci un numero valido' });
    if (body.privacyAccepted !== true) return json(res, 400, { error: 'È necessario accettare l’informativa privacy' });

    let lead = db.prepare('SELECT * FROM leads WHERE contact_type=? AND contact=?').get(contactType, contact);
    const consentAt = Date.now();
    const marketingOptIn = body.marketingOptIn ? 1 : 0;
    const whatsappOptIn = contactType === 'phone' && body.whatsappOptIn ? 1 : 0;
    if (!lead) {
      const leadId = randomUUID();
      db.prepare(`INSERT INTO leads(id, contact_type, contact, marketing_opt_in, whatsapp_opt_in, privacy_accepted_at, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(leadId, contactType, contact, marketingOptIn, whatsappOptIn, consentAt, 'treasure_hunt', consentAt);
      lead = db.prepare('SELECT * FROM leads WHERE id=?').get(leadId);
    } else {
      // Una nuova compilazione aggiorna anche eventuali revoche dei consensi opzionali.
      db.prepare(`UPDATE leads SET marketing_opt_in=?, whatsapp_opt_in=?, privacy_accepted_at=? WHERE id=?`)
        .run(marketingOptIn, whatsappOptIn, consentAt, lead.id);
      lead = db.prepare('SELECT * FROM leads WHERE id=?').get(lead.id);
    }

    // Il profilo nasce anonimo all'avvio e viene attivato al primo lead valido.
    // COALESCE rende il proprietario immutabile dopo la prima associazione.
    if (hunt.referral_id) {
      db.prepare(`
        UPDATE referral_profiles
        SET lead_id=COALESCE(lead_id, ?),
            activated_at=COALESCE(activated_at, ?),
            last_seen_at=?
        WHERE code=?
      `).run(lead.id, consentAt, consentAt, hunt.referral_id);
    }

    const existing = db.prepare('SELECT * FROM vouchers WHERE hunt_id=? ORDER BY created_at').all(hunt.id);
    if (existing.length) return json(res, 200, { vouchers: existing.map(publicVoucher), passesRemaining: inventory() });

    const score = hunt.base_score + hunt.combo_bonus;
    const tier = tierFor(score);
    const expiresAt = Date.now() + VOUCHER_HOURS * 3_600_000;
    const issued = [];
    const issue = kind => {
      const row = { id: randomUUID(), code: code(kind), hunt_id: hunt.id, lead_id: lead.id, kind, tier, expires_at: expiresAt, created_at: Date.now() };
      db.prepare(`INSERT INTO vouchers(id, code, hunt_id, lead_id, kind, tier, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(row.id, row.code, row.hunt_id, row.lead_id, row.kind, row.tier, row.expires_at, row.created_at);
      issued.push({ ...row, status: 'active' });
    };
    db.exec('BEGIN IMMEDIATE');
    try {
      issue('aperitivo');
      if (tier === 'platinum' || tier === 'diamond') {
        const remaining = inventory();
        if (remaining >= 2) {
          db.prepare('UPDATE inventory SET remaining=remaining-2 WHERE day=?').run(dayKey());
          issue(tier === 'diamond' ? 'pass_vip' : 'pass');
        }
      }
      db.prepare('UPDATE hunts SET lead_id=?, claimed_at=? WHERE id=?').run(lead.id, Date.now(), hunt.id);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    track('voucher_claimed', hunt.id, hunt.variant, { tier, contactType, marketingOptIn: Boolean(body.marketingOptIn), count: issued.length });
    return json(res, 201, { vouchers: issued.map(publicVoucher), passesRemaining: inventory() });
  }

  const voucherMatch = url.pathname.match(/^\/api\/vouchers\/([^/]+)(?:\/(redeem))?$/);
  if (voucherMatch && req.method === 'GET' && !voucherMatch[2]) {
    const row = db.prepare('SELECT * FROM vouchers WHERE code=?').get(voucherMatch[1].toUpperCase());
    if (!row) return json(res, 404, { valid: false, error: 'Voucher non trovato' });
    const expired = row.expires_at <= Date.now();
    return json(res, 200, { valid: row.status === 'active' && !expired, code: row.code, kind: row.kind, status: expired ? 'expired' : row.status, expiresAt: row.expires_at });
  }
  if (voucherMatch && voucherMatch[2] && req.method === 'POST') {
    if (CASHIER_KEY && req.headers['x-cashier-key'] !== CASHIER_KEY) return json(res, 401, { error: 'Credenziale cassa non valida' });
    const row = db.prepare('SELECT * FROM vouchers WHERE code=?').get(voucherMatch[1].toUpperCase());
    if (!row || row.status !== 'active' || row.expires_at <= Date.now()) return json(res, 409, { valid: false, error: 'Voucher non valido, scaduto o già usato' });
    db.prepare("UPDATE vouchers SET status='redeemed', redeemed_at=? WHERE id=? AND status='active'").run(Date.now(), row.id);
    track('voucher_redeemed', row.hunt_id, null, { kind: row.kind });
    return json(res, 200, { valid: true, code: row.code, status: 'redeemed', redeemedAt: Date.now() });
  }

  if (req.method === 'POST' && url.pathname === '/api/analytics') {
    const body = await readBody(req);
    const allowed = ['app_loaded', 'start_modal_opened', 'hunt_started', 'hunt_completed', 'lead_viewed', 'lead_submitted', 'voucher_viewed', 'store_clicked', 'share_clicked'];
    if (!allowed.includes(body.event)) return json(res, 400, { error: 'Evento non consentito' });
    track(body.event, String(body.sessionId || '').slice(0, 80), String(body.variant || '').slice(0, 40), body.properties && typeof body.properties === 'object' ? body.properties : {});
    return json(res, 202, { accepted: true });
  }

  // In produzione lo stesso processo può servire la build Vite e le API.
  if (req.method === 'GET' && !url.pathname.startsWith('/api/') && process.env.SERVE_STATIC !== '0') {
    const dist = resolve(ROOT, 'dist');
    const requested = resolve(dist, `.${decodeURIComponent(url.pathname)}`);
    let file = requested.startsWith(dist) && existsSync(requested) && statSync(requested).isFile()
      ? requested : resolve(dist, 'index.html');
    if (existsSync(file)) {
      const extension = file.split('.').pop();
      const types = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml' };
      res.writeHead(200, { 'content-type': types[extension] || 'application/octet-stream', 'cache-control': extension === 'html' ? 'no-cache' : 'public, max-age=86400' });
      return res.end(readFileSync(file));
    }
  }
  return json(res, 404, { error: 'Endpoint non trovato' });
}

const server = createServer((req, res) => route(req, res).catch(error => {
  console.error(error);
  json(res, error.status || 500, { error: error.status ? error.message : 'Errore interno' });
}));
server.listen(PORT, HOST, () => console.log(`Dante Festival API on http://${HOST}:${PORT} · SQLite ${DB_PATH}`));
