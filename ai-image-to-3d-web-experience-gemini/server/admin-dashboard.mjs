const DAY = 86_400_000;
const DEMO_OWNER_CODES = ['REF-DM2A3', 'REF-DM4B5'];

const tierFor = score => score >= 50 ? 'diamond' : score >= 40 ? 'platinum' : score >= 30 ? 'gold' : score >= 20 ? 'silver' : 'none';
const dayLabel = timestamp => new Date(timestamp).toISOString().slice(0, 10);

/** Popola una sola volta un dataset realistico, riconoscibile dal prefisso demo-. */
export function seedDashboardDemo(db) {
  if (db.prepare("SELECT 1 FROM hunts WHERE id='demo-hunt-01'").get()) return false;
  const now = Date.now();
  const ownerLeads = [
    { id: 'demo-owner-lucia', contact: 'lucia.rossi@example.it', marketing: 1, whatsapp: 0, code: DEMO_OWNER_CODES[0], age: 35 },
    { id: 'demo-owner-marco', contact: '+39 333 555 0188', marketing: 1, whatsapp: 1, code: DEMO_OWNER_CODES[1], age: 28 },
  ];

  const insertLead = db.prepare(`INSERT OR IGNORE INTO leads
    (id, contact_type, contact, marketing_opt_in, whatsapp_opt_in, privacy_accepted_at, source, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'demo_dashboard', ?)`);
  const insertProfile = db.prepare(`INSERT OR IGNORE INTO referral_profiles
    (code, lead_id, created_at, activated_at, last_seen_at) VALUES (?, ?, ?, ?, ?)`);
  const insertHunt = db.prepare(`INSERT OR IGNORE INTO hunts
    (id, started_at, deadline_at, duration_ms, variant, points_json, collected_json, base_score,
     combo_bonus, combo_count, completed_at, lead_id, referral_id, incoming_referral, claimed_at)
    VALUES (?, ?, ?, ?, ?, '{}', ?, ?, ?, ?, ?, ?, NULL, ?, ?)`);
  const insertVoucher = db.prepare(`INSERT OR IGNORE INTO vouchers
    (id, code, hunt_id, lead_id, kind, tier, status, expires_at, redeemed_at, created_at)
    VALUES (?, ?, ?, ?, 'aperitivo', ?, ?, ?, ?, ?)`);
  const insertEvent = db.prepare(`INSERT INTO analytics
    (event, session_id, variant, payload_json, created_at) VALUES (?, ?, ?, ?, ?)`);

  db.exec('BEGIN IMMEDIATE');
  try {
    for (const owner of ownerLeads) {
      const createdAt = now - owner.age * DAY;
      insertLead.run(owner.id, owner.contact.startsWith('+') ? 'phone' : 'email', owner.contact, owner.marketing, owner.whatsapp, createdAt, createdAt);
      insertProfile.run(owner.code, owner.id, createdAt, createdAt, now - DAY);
    }

    for (let index = 0; index < 25; index++) {
      const number = String(index + 1).padStart(2, '0');
      const huntId = `demo-hunt-${number}`;
      const inviter = index < 14 ? ownerLeads[0] : ownerLeads[1];
      const startedAt = now - (11 - (index % 12)) * DAY - (index % 5) * 3_600_000;
      const variant = index % 2 === 0 ? 'timer_20' : 'timer_30';
      const duration = variant === 'timer_20' ? 20_000 : 30_000;
      const converted = index % 4 !== 0; // 18 lead su 25 invitati
      const score = 14 + ((index * 7) % 46);
      const combo = index % 3 === 0 ? 3 : 0;
      const baseScore = score - combo;
      const found = Math.min(9, Math.max(2, Math.floor(score / 7)));
      const collected = JSON.stringify(['caffe', 'scarpe', 'vino', 'pizza', 'insalata', 'lasagne', 'pollo', 'patate', 'bistecca'].slice(0, found));
      const leadId = converted ? `demo-invite-lead-${number}` : null;
      const claimedAt = converted ? startedAt + duration + 75_000 : null;

      if (converted) {
        const phone = index % 3 === 0;
        const contact = phone ? `+39 320 700 ${String(1100 + index)}` : `invitato${number}@example.it`;
        insertLead.run(leadId, phone ? 'phone' : 'email', contact, index % 2, phone && index % 2 ? 1 : 0, claimedAt, claimedAt);
      }

      insertHunt.run(huntId, startedAt, startedAt + duration, duration, variant, collected, baseScore, combo, combo ? 1 : 0, startedAt + duration, leadId, inviter.code, claimedAt);
      insertEvent.run('hunt_started', huntId, variant, JSON.stringify({ referrer: inviter.code, demo: true }), startedAt);
      insertEvent.run('hunt_completed', huntId, variant, JSON.stringify({ score, tier: tierFor(score), foundCount: found, demo: true }), startedAt + duration);

      if (converted) {
        const voucherId = `demo-voucher-${number}`;
        const voucherCode = `DANTE-APERI-DEMO${number}`;
        const redeemed = index % 2 === 1;
        const redeemedAt = redeemed ? claimedAt + 3_600_000 + index * 60_000 : null;
        const expiresAt = redeemed ? claimedAt + 48 * 3_600_000 : now + (24 + index) * 3_600_000;
        insertVoucher.run(voucherId, voucherCode, huntId, leadId, tierFor(score), redeemed ? 'redeemed' : 'active', expiresAt, redeemedAt, claimedAt);
        insertEvent.run('lead_submitted', huntId, variant, JSON.stringify({ demo: true }), claimedAt - 2_000);
        insertEvent.run('voucher_claimed', huntId, variant, JSON.stringify({ tier: tierFor(score), count: 1, demo: true }), claimedAt);
        if (redeemed) insertEvent.run('voucher_redeemed', huntId, variant, JSON.stringify({ kind: 'aperitivo', demo: true }), redeemedAt);
      }
    }
    db.exec('COMMIT');
    return true;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

const number = value => Number(value || 0);
const percentage = (value, total) => total ? Math.round((value / total) * 1000) / 10 : 0;

export function getDashboardData(db) {
  const invited = number(db.prepare('SELECT COUNT(*) AS value FROM hunts WHERE incoming_referral IS NOT NULL').get().value);
  const completed = number(db.prepare('SELECT COUNT(*) AS value FROM hunts WHERE incoming_referral IS NOT NULL AND completed_at IS NOT NULL').get().value);
  const leads = number(db.prepare('SELECT COUNT(DISTINCT lead_id) AS value FROM hunts WHERE incoming_referral IS NOT NULL AND lead_id IS NOT NULL').get().value);
  const claimed = number(db.prepare('SELECT COUNT(DISTINCT hunt_id) AS value FROM vouchers').get().value);
  const redeemed = number(db.prepare("SELECT COUNT(DISTINCT hunt_id) AS value FROM vouchers WHERE status='redeemed'").get().value);
  const activeVouchers = number(db.prepare("SELECT COUNT(*) AS value FROM vouchers WHERE status='active' AND expires_at>?").get(Date.now()).value);
  const marketingOptIns = number(db.prepare('SELECT COUNT(*) AS value FROM leads WHERE marketing_opt_in=1').get().value);
  const contacts = number(db.prepare('SELECT COUNT(*) AS value FROM leads').get().value);

  const referrals = db.prepare(`
    SELECT rp.code, l.contact, l.contact_type,
      COUNT(DISTINCT h.id) AS invites,
      COUNT(DISTINCT h.lead_id) AS leads,
      COUNT(DISTINCT v.id) AS vouchers,
      COUNT(DISTINCT CASE WHEN v.status='redeemed' THEN v.id END) AS redeemed
    FROM referral_profiles rp
    LEFT JOIN leads l ON l.id=rp.lead_id
    LEFT JOIN hunts h ON h.incoming_referral=rp.code
    LEFT JOIN vouchers v ON v.hunt_id=h.id
    GROUP BY rp.code
    HAVING invites>0
    ORDER BY invites DESC, rp.code
    LIMIT 10
  `).all().map(row => ({ ...row, conversion: percentage(number(row.leads), number(row.invites)) }));

  const abTests = db.prepare(`
    SELECT variant,
      COUNT(*) AS sessions,
      SUM(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN lead_id IS NOT NULL THEN 1 ELSE 0 END) AS leads,
      ROUND(AVG(base_score + combo_bonus), 1) AS averageScore
    FROM hunts
    GROUP BY variant
    ORDER BY variant
  `).all().map(row => ({ ...row, conversion: percentage(number(row.leads), number(row.sessions)) }));

  const rawTrend = db.prepare(`
    SELECT date(started_at / 1000, 'unixepoch') AS day,
      COUNT(*) AS sessions,
      SUM(CASE WHEN lead_id IS NOT NULL THEN 1 ELSE 0 END) AS leads
    FROM hunts
    WHERE started_at >= ?
    GROUP BY day ORDER BY day
  `).all(Date.now() - 12 * DAY);
  const trendByDay = new Map(rawTrend.map(row => [row.day, row]));
  const trend = Array.from({ length: 12 }, (_, index) => {
    const timestamp = Date.now() - (11 - index) * DAY;
    const day = dayLabel(timestamp);
    const row = trendByDay.get(day);
    return { day, label: new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short' }).format(timestamp), sessions: number(row?.sessions), leads: number(row?.leads) };
  });

  const recentLeads = db.prepare(`
    SELECT l.id, l.contact, l.contact_type AS contactType, l.marketing_opt_in AS marketingOptIn,
      l.whatsapp_opt_in AS whatsappOptIn, l.source, l.created_at AS createdAt,
      rp.code AS referralCode
    FROM leads l LEFT JOIN referral_profiles rp ON rp.lead_id=l.id
    ORDER BY l.created_at DESC LIMIT 12
  `).all();

  const recentVouchers = db.prepare(`
    SELECT v.code, v.kind, v.tier, v.status, v.expires_at AS expiresAt,
      v.redeemed_at AS redeemedAt, v.created_at AS createdAt, l.contact
    FROM vouchers v JOIN leads l ON l.id=v.lead_id
    ORDER BY v.created_at DESC LIMIT 12
  `).all();

  const voucherStatus = db.prepare(`SELECT status, COUNT(*) AS value FROM vouchers GROUP BY status`).all();
  return {
    generatedAt: Date.now(),
    kpis: { invited, contacts, leadsFromInvites: leads, activeVouchers, redeemed, marketingOptIns, leadConversion: percentage(leads, invited), redemptionRate: percentage(redeemed, claimed) },
    funnel: [
      { label: 'Invitati', value: invited },
      { label: 'Partite concluse', value: completed },
      { label: 'Contatti acquisiti', value: leads },
      { label: 'Voucher emessi', value: claimed },
      { label: 'Voucher riscattati', value: redeemed },
    ],
    referrals, abTests, trend, recentLeads, recentVouchers, voucherStatus,
  };
}
