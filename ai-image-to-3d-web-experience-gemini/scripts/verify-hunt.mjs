import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const port = 8798;
const dbPath = 'data/verify.sqlite';
mkdirSync('data', { recursive: true });
rmSync(dbPath, { force: true }); rmSync(`${dbPath}-shm`, { force: true }); rmSync(`${dbPath}-wal`, { force: true });
// Simula lo schema della release precedente per verificare anche la migrazione in-place.
const legacyDb = new DatabaseSync(dbPath);
legacyDb.exec(`CREATE TABLE hunts (
  id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, deadline_at INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL, variant TEXT NOT NULL, points_json TEXT NOT NULL,
  collected_json TEXT NOT NULL DEFAULT '[]', last_treasure TEXT,
  base_score INTEGER NOT NULL DEFAULT 0, combo_bonus INTEGER NOT NULL DEFAULT 0,
  combo_count INTEGER NOT NULL DEFAULT 0, completed_at INTEGER, lead_id TEXT,
  referral_id TEXT, claimed_at INTEGER
)`);
legacyDb.close();
const api = spawn(process.execPath, ['server/api-server.mjs'], { env: { ...process.env, API_PORT: String(port), DATABASE_PATH: dbPath, DAILY_PASS_ALLOWANCE: '20', FESTIVAL_START_AT: '2026-10-10T18:00:00+02:00' }, stdio: ['ignore', 'pipe', 'inherit'] });
const base = `http://127.0.0.1:${port}`;
const waitForApi = new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('API startup timeout')), 5000); api.stdout.on('data', chunk => { if (String(chunk).includes('Dante Festival API')) { clearTimeout(timer); resolve(); } }); api.on('exit', code => reject(new Error(`API exited: ${code}`))); });
const request = async (path, options) => { const response = await fetch(base + path, { ...options, headers: { 'content-type': 'application/json', ...(options?.headers || {}) } }); const body = await response.json(); return { response, body }; };

try {
  await waitForApi;
  const campaign = await request('/api/campaign');
  assert.equal(campaign.body.passesRemaining, 20);
  assert.equal(campaign.body.festivalStartAt, '2026-10-10T18:00:00+02:00');

  const deniedLogin = await request('/api/admin/demo-login', { method: 'POST', body: JSON.stringify({ email: 'admin@dantefestival.it', password: 'errata' }) });
  assert.equal(deniedLogin.response.status, 401);
  const login = await request('/api/admin/demo-login', { method: 'POST', body: JSON.stringify({ email: 'admin@dantefestival.it', password: 'demo2026' }) });
  assert.equal(login.response.status, 200);
  assert.equal(login.body.dashboard.kpis.invited, 25, 'login restituisce subito i dati evitando transizioni instabili');
  const deniedDashboard = await request('/api/admin/dashboard');
  assert.equal(deniedDashboard.response.status, 401);
  const dashboard = await request('/api/admin/dashboard', { headers: { authorization: `Bearer ${login.body.token}` } });
  assert.equal(dashboard.response.status, 200);
  assert.equal(dashboard.body.kpis.invited, 25, 'dataset demo con 25 invitati');
  assert.equal(dashboard.body.referrals.length, 2, 'dataset demo con 2 ambassador');
  assert.equal(dashboard.body.kpis.leadsFromInvites, 18, '18 lead sintetici attribuiti');
  assert.ok(dashboard.body.trend.length === 12 && dashboard.body.abTests.length === 2, 'grafici dashboard disponibili');

  // Il referrer deve essere un profilo realmente registrato, non un codice inventato.
  const referrer = await request('/api/hunts/start', { method: 'POST', body: JSON.stringify({ referralId: 'REF-ZYXWV' }) });
  assert.equal(referrer.response.status, 201);

  const started = await request('/api/hunts/start', { method: 'POST', body: JSON.stringify({ referralId: 'REF-ABCDE', incomingReferral: 'REF-ZYXWV' }) });
  assert.equal(started.response.status, 201);
  assert.ok([20_000, 30_000].includes(started.body.durationMs));
  assert.equal(Object.keys(started.body.points).length, 9);
  assert.ok(Object.values(started.body.points).every(value => value >= 5 && value <= 10));
  const id = started.body.id;

  let last;
  for (const treasureId of ['caffe', 'scarpe', 'vino', 'pizza', 'insalata', 'lasagne', 'pollo', 'patate', 'bistecca']) {
    last = await request(`/api/hunts/${id}/collect`, { method: 'POST', body: JSON.stringify({ treasureId }) });
    assert.equal(last.response.status, 200);
  }
  assert.equal(last.body.foundCount, 9);
  const duplicate = await request(`/api/hunts/${id}/collect`, { method: 'POST', body: JSON.stringify({ treasureId: 'caffe' }) });
  assert.equal(duplicate.response.status, 409);

  const completed = await request(`/api/hunts/${id}/complete`, { method: 'POST', body: '{}' });
  assert.equal(completed.response.status, 200);
  assert.equal(completed.body.foundCount, 9);
  assert.equal(completed.body.score, completed.body.baseScore + completed.body.comboBonus);
  assert.ok(['platinum', 'diamond'].includes(completed.body.tier));

  const invalidLead = await request(`/api/hunts/${id}/claim`, { method: 'POST', body: JSON.stringify({ contactType: 'email', contact: 'no', privacyAccepted: true }) });
  assert.equal(invalidLead.response.status, 400);
  const claim = await request(`/api/hunts/${id}/claim`, { method: 'POST', body: JSON.stringify({ contactType: 'email', contact: 'test@example.it', privacyAccepted: true, marketingOptIn: true }) });
  assert.equal(claim.response.status, 201);
  assert.equal(claim.body.vouchers.length, 2);
  assert.equal(claim.body.passesRemaining, 18);
  assert.ok(claim.body.vouchers[0].code.startsWith('DANTE-APERI-'));
  assert.ok(claim.body.vouchers[0].expiresAt > Date.now() + 47 * 3_600_000);

  const repeatedClaim = await request(`/api/hunts/${id}/claim`, { method: 'POST', body: JSON.stringify({ contactType: 'email', contact: 'test@example.it', privacyAccepted: true }) });
  assert.equal(repeatedClaim.response.status, 200);
  assert.deepEqual(repeatedClaim.body.vouchers.map(v => v.code), claim.body.vouchers.map(v => v.code));
  assert.equal(repeatedClaim.body.passesRemaining, 18);

  const unknownReferral = await request('/api/hunts/start', { method: 'POST', body: JSON.stringify({ referralId: 'REF-CCCCC', incomingReferral: 'REF-QQQQQ' }) });
  const selfReferral = await request('/api/hunts/start', { method: 'POST', body: JSON.stringify({ referralId: 'REF-DDDDD', incomingReferral: 'REF-DDDDD' }) });

  const verificationDb = new DatabaseSync(dbPath, { readOnly: true });
  assert.equal(verificationDb.prepare('SELECT incoming_referral FROM hunts WHERE id=?').get(unknownReferral.body.id).incoming_referral, null, 'codice referrer inesistente ignorato');
  assert.equal(verificationDb.prepare('SELECT incoming_referral FROM hunts WHERE id=?').get(selfReferral.body.id).incoming_referral, null, 'auto-referral ignorato');
  assert.equal(verificationDb.prepare('SELECT code FROM referral_profiles WHERE code=?').get('REF-QQQQQ'), undefined, 'profilo inventato non creato');
  const storedHunt = verificationDb.prepare('SELECT referral_id, incoming_referral FROM hunts WHERE id=?').get(id);
  assert.equal(storedHunt.referral_id, 'REF-ABCDE', 'codice referral personale registrato');
  assert.equal(storedHunt.incoming_referral, 'REF-ZYXWV', 'referrer in ingresso attribuito alla sessione');
  const storedLead = verificationDb.prepare("SELECT id, contact, marketing_opt_in, whatsapp_opt_in, privacy_accepted_at FROM leads WHERE contact='test@example.it'").get();
  assert.equal(storedLead.marketing_opt_in, 0, 'revoca marketing aggiornata alla seconda compilazione');
  assert.equal(storedLead.whatsapp_opt_in, 0, 'opt-in WhatsApp non applicato alle email');
  assert.ok(storedLead.privacy_accepted_at > 0, 'timestamp consenso privacy registrato');

  const primaryKey = verificationDb.prepare("PRAGMA table_info(referral_profiles)").all().find(column => column.name === 'code');
  assert.equal(primaryKey.pk, 1, 'il codice referral è primary key del profilo');
  const playerProfile = verificationDb.prepare('SELECT * FROM referral_profiles WHERE code=?').get('REF-ABCDE');
  assert.equal(playerProfile.lead_id, storedLead.id, 'profilo anonimo attivato e associato al lead');
  assert.ok(playerProfile.activated_at > 0, 'data di attivazione profilo registrata');
  const inviterProfile = verificationDb.prepare('SELECT * FROM referral_profiles WHERE code=?').get('REF-ZYXWV');
  assert.equal(inviterProfile.lead_id, null, 'il referrer può restare anonimo fino al proprio lead gate');
  verificationDb.close();

  const voucherCode = claim.body.vouchers[0].code;
  const valid = await request(`/api/vouchers/${voucherCode}`);
  assert.equal(valid.body.valid, true);
  const redeemed = await request(`/api/vouchers/${voucherCode}/redeem`, { method: 'POST', body: '{}' });
  assert.equal(redeemed.body.status, 'redeemed');
  const replay = await request(`/api/vouchers/${voucherCode}/redeem`, { method: 'POST', body: '{}' });
  assert.equal(replay.response.status, 409);
  console.log('✓ API caccia, A/B timer, lead gate, inventario e voucher monouso verificati');
} finally {
  api.kill('SIGTERM');
  rmSync(dbPath, { force: true }); rmSync(`${dbPath}-shm`, { force: true }); rmSync(`${dbPath}-wal`, { force: true });
}
