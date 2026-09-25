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
    HAVING invites>0 OR l.id IS NOT NULL
    ORDER BY invites DESC, rp.code
    LIMIT 15
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

  const day = new Date().toISOString().slice(0, 10);
  const dailyCap = Number(process.env.DAILY_PASS_ALLOWANCE || 20);
  db.prepare('INSERT OR IGNORE INTO inventory(day, remaining) VALUES (?, ?)').run(day, dailyCap);
  const inventoryRemaining = number(db.prepare('SELECT remaining FROM inventory WHERE day = ?').get(day)?.remaining ?? dailyCap);

  const passesIssued = number(db.prepare("SELECT COUNT(*) AS value FROM vouchers WHERE kind IN ('pass', 'pass_vip')").get().value);
  const passesActive = number(db.prepare("SELECT COUNT(*) AS value FROM vouchers WHERE kind IN ('pass', 'pass_vip') AND status='active' AND expires_at>?").get(Date.now()).value);
  const passesRedeemed = number(db.prepare("SELECT COUNT(*) AS value FROM vouchers WHERE kind IN ('pass', 'pass_vip') AND status='redeemed'").get().value);

  const aperitivoActive = number(db.prepare("SELECT COUNT(*) AS value FROM vouchers WHERE kind='aperitivo' AND status='active' AND expires_at>?").get(Date.now()).value);
  const aperitivoRedeemed = number(db.prepare("SELECT COUNT(*) AS value FROM vouchers WHERE kind='aperitivo' AND status='redeemed'").get().value);

  const recentLeads = db.prepare(`
    SELECT l.id, l.contact, l.contact_type AS contactType, l.marketing_opt_in AS marketingOptIn,
      l.whatsapp_opt_in AS whatsappOptIn, l.source, l.created_at AS createdAt,
      rp.code AS personalReferralCode,
      h.incoming_referral AS referredByCode,
      inviter_lead.contact AS referredByContact
    FROM leads l
    LEFT JOIN referral_profiles rp ON rp.lead_id=l.id
    LEFT JOIN (
      SELECT lead_id, incoming_referral, MAX(started_at)
      FROM hunts
      WHERE lead_id IS NOT NULL
      GROUP BY lead_id
    ) h ON h.lead_id=l.id
    LEFT JOIN referral_profiles inviter_rp ON inviter_rp.code=h.incoming_referral
    LEFT JOIN leads inviter_lead ON inviter_lead.id=inviter_rp.lead_id
    ORDER BY l.created_at DESC LIMIT 100
  `).all();

  const recentVouchers = db.prepare(`
    SELECT v.code, v.kind, v.tier, v.status, v.expires_at AS expiresAt,
      v.redeemed_at AS redeemedAt, v.created_at AS createdAt, l.contact, l.contact_type AS contactType
    FROM vouchers v JOIN leads l ON l.id=v.lead_id
    ORDER BY v.created_at DESC LIMIT 200
  `).all();

  const voucherStatus = db.prepare(`SELECT status, COUNT(*) AS value FROM vouchers GROUP BY status`).all();

  // Tabella di supporto per il rilancio degli account nella Community
  db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty_community (
      lead_id TEXT PRIMARY KEY,
      community_relaunched INTEGER NOT NULL DEFAULT 0,
      community_notes TEXT,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(lead_id) REFERENCES leads(id)
    );
  `);

  const rawLoyalty = db.prepare(`
    SELECT
      l.id AS leadId,
      l.contact,
      l.contact_type AS contactType,
      rp.code AS referralCode,
      (SELECT COUNT(*) FROM hunts h WHERE h.lead_id = l.id) AS huntsCount,
      (SELECT COALESCE(SUM(h.base_score + h.combo_bonus), 0) FROM hunts h WHERE h.lead_id = l.id) AS pointsFromHunts,
      (SELECT COUNT(DISTINCT h.lead_id) FROM hunts h WHERE h.incoming_referral = rp.code AND h.lead_id IS NOT NULL) AS invitedLeads,
      (SELECT COUNT(DISTINCT h.lead_id) FROM hunts h JOIN vouchers v ON v.hunt_id = h.id WHERE h.incoming_referral = rp.code AND v.status = 'redeemed') AS convertedReferrals,
      COALESCE(lc.community_relaunched, 0) AS communityRelaunched
    FROM leads l
    LEFT JOIN referral_profiles rp ON rp.lead_id = l.id
    LEFT JOIN loyalty_community lc ON lc.lead_id = l.id
    ORDER BY l.created_at DESC
  `).all();

  const accounts = rawLoyalty.map(row => {
    const huntsPts = number(row.pointsFromHunts);
    const referralPts = number(row.invitedLeads) * 50;
    const totalPts = huntsPts + referralPts;
    const conv = number(row.convertedReferrals);
    const tokens = Math.floor(conv / 3) * 30; // 30 Token ogni 3 referral convertiti
    const cleanCode = (row.referralCode || 'REF-GUEST').replace('REF-', '');
    return {
      leadId: row.leadId,
      contact: row.contact,
      contactType: row.contactType,
      referralCode: row.referralCode || null,
      huntsCount: number(row.huntsCount),
      pointsFromHunts: huntsPts,
      referralPoints: referralPts,
      totalPoints: totalPts,
      badge500Unlocked: totalPts >= 500,
      badge1000Unlocked: totalPts >= 1000,
      communityRelaunched: Boolean(row.communityRelaunched),
      convertedReferrals: conv,
      impactTokensEarned: tokens,
      impactEuroValue: tokens, // 1 Token = 1 €
      cashbackCode: tokens > 0 ? `IMPACT-30-${cleanCode}` : null,
    };
  });

  const totalPointsDistributed = accounts.reduce((acc, a) => acc + a.totalPoints, 0);
  const totalImpactTokens = accounts.reduce((acc, a) => acc + a.impactTokensEarned, 0);
  const badge500Count = accounts.filter(a => a.badge500Unlocked).length;
  const badge1000Count = accounts.filter(a => a.badge1000Unlocked).length;
  const communityRelaunchedCount = accounts.filter(a => a.communityRelaunched).length;

  const loyalty = {
    totalPointsDistributed,
    totalImpactTokens,
    totalEuroImpact: totalImpactTokens,
    badge500Count,
    badge1000Count,
    communityRelaunchedCount,
    accounts,
  };

  return {
    generatedAt: Date.now(),
    kpis: {
      invited, contacts, leadsFromInvites: leads, activeVouchers, redeemed,
      marketingOptIns, leadConversion: percentage(leads, invited), redemptionRate: percentage(redeemed, claimed),
      inventoryRemaining, dailyCap, passesIssued, passesActive, passesRedeemed, aperitivoActive, aperitivoRedeemed,
      totalPointsDistributed, totalImpactTokens, totalEuroImpact: totalImpactTokens,
    },
    inventory: {
      remaining: inventoryRemaining,
      dailyCap,
      passesIssued,
      passesActive,
      passesRedeemed,
      aperitivoActive,
      aperitivoRedeemed,
    },
    funnel: [
      { label: 'Invitati', value: invited },
      { label: 'Partite concluse', value: completed },
      { label: 'Contatti acquisiti', value: leads },
      { label: 'Voucher emessi', value: claimed },
      { label: 'Voucher riscattati', value: redeemed },
    ],
    referrals, abTests, trend, recentLeads, recentVouchers, voucherStatus, loyalty,
  };
}
