/**
 * Regole di gioco del mini-game "Caccia ai Tesori del Borgo" e pipeline
 * marketing verso l'e-commerce del Dante Festival.
 *
 * Questo modulo è la singola fonte di verità per:
 *  - le 9 figurine (id, etichetta, emoji, luogo in cui si nascondono);
 *  - durata della sessione, range punti e combo gastronomiche;
 *  - tier, medaglie e premi (Zero-Loss: tutti ricevono il voucher Aperitivo Cena);
 *  - voucher, scadenze, QR di riscatto, referral e copy di condivisione.
 */

export const TREASURE_IDS = [
  'caffe',
  'scarpe',
  'vino',
  'pizza',
  'insalata',
  'lasagne',
  'pollo',
  'patate',
  'bistecca',
] as const;

export type TreasureId = (typeof TREASURE_IDS)[number];

export interface TreasureDefinition {
  id: TreasureId;
  /** Etichetta mostrata nelle schede di gioco (come da specifica). */
  label: string;
  /** Emoji usata solo nelle schede/riepiloghi, mai sovrapposta alla scena 3D. */
  emoji: string;
  /** Luogo del borgo in cui nascondere la figurina. */
  area: string;
  /**
   * Ancora (x, z) del luogo del borgo attorno a cui viene nascosta la figurina.
   * L'altezza è ricavata dal terreno; attorno all'ancora il posizionamento
   * automatico cerca uno spiazzo libero tra case, alberi e muri.
   */
  anchor: [number, number];
  /** Altezza fissa quando la figurina poggia su una struttura (ponte, molo). */
  surfaceY?: number;
}

export const TREASURES: TreasureDefinition[] = [
  {
    id: 'caffe',
    label: 'caffè',
    emoji: '☕',
    area: 'Piazza del Borgo',
    anchor: [0.35, 0.35],
  },
  {
    id: 'scarpe',
    label: 'scarpe',
    emoji: '👟',
    area: 'Vicolo del Ciabattino',
    anchor: [-0.85, -1.85],
  },
  {
    id: 'vino',
    label: 'vino',
    emoji: '🍷',
    area: 'Terrazze del Vigneto',
    anchor: [2.35, -2.85],
  },
  {
    id: 'pizza',
    label: 'pizza',
    emoji: '🍕',
    area: 'Ponte di Legno',
    anchor: [-0.2, -0.3],
    surfaceY: 0.5,
  },
  {
    id: 'insalata',
    label: 'insalata',
    emoji: '🥗',
    area: 'Giardini Fioriti',
    anchor: [1.05, 2.5],
  },
  {
    id: 'lasagne',
    label: 'lasagne',
    emoji: '🍝',
    area: 'Granai del Fiume',
    anchor: [0.7, -2.45],
  },
  {
    id: 'pollo',
    label: 'pollo',
    emoji: '🍗',
    area: 'Frutteto Sud',
    anchor: [2.35, 2.6],
  },
  {
    id: 'patate',
    label: 'patate',
    emoji: '🥔',
    area: 'Molo dei Pescatori',
    anchor: [1.4, 0.15],
    surfaceY: 0.46,
  },
  {
    id: 'bistecca',
    label: 'bistecca',
    emoji: '🥩',
    area: 'Fucina della Valle',
    anchor: [3.5, 1.15],
  },
];

/** Durata della sessione di caccia (ms). */
export const HUNT_DURATION_MS = 20_000;

/** Range punti assegnato casualmente ad ogni figurina. */
export const POINTS_MIN = 5;
export const POINTS_MAX = 10;

/** Valore intero casuale nel range [5, 10]: Math.floor(Math.random() * 6) + 5. */
export function rollTreasurePoints(): number {
  return Math.floor(Math.random() * 6) + 5;
}

// ------------------------------------------------------- combo gastronomiche

export interface ComboRule {
  /** Coppia di figurine che attiva la combo (ordine indifferente). */
  pair: [TreasureId, TreasureId];
  label: string;
  /** Bonus immediato in punti. */
  bonus: number;
}

/**
 * Combo "tipiche": due tap consecutivi e coerenti valgono un bonus immediato,
 * premiando l'osservazione attiva del borgo.
 */
export const COMBO_RULES: ComboRule[] = [
  { pair: ['pizza', 'vino'], label: 'Combo Tipica!', bonus: 3 },
  { pair: ['bistecca', 'patate'], label: 'Combo Tipica!', bonus: 3 },
  { pair: ['lasagne', 'vino'], label: 'Pranzo della Domenica', bonus: 3 },
  { pair: ['pollo', 'patate'], label: 'Arrosto del Borgo', bonus: 3 },
  { pair: ['insalata', 'bistecca'], label: 'Equilibrio Perfetto', bonus: 3 },
  { pair: ['caffe', 'lasagne'], label: 'Pausa del Viandante', bonus: 3 },
];

/** Restituisce la combo attivata dalla sequenza di due tap, se esiste. */
export function findCombo(previous: TreasureId | null, current: TreasureId): ComboRule | null {
  if (!previous || previous === current) return null;
  return (
    COMBO_RULES.find(
      rule =>
        (rule.pair[0] === previous && rule.pair[1] === current) ||
        (rule.pair[1] === previous && rule.pair[0] === current)
    ) ?? null
  );
}

// ------------------------------------------------------------------- tier

export type TierId = 'none' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface TierDefinition {
  id: TierId;
  /** Nome breve della medaglia usato nei messaggi di condivisione. */
  medalName: string;
  /** Titolo esteso mostrato nella schermata finale. */
  title: string;
  /** Soglia minima di punti. */
  min: number;
  /** Soglia massima (inclusa) oppure null per l'ultimo tier. */
  max: number | null;
  /** Premio principale (oltre al voucher Aperitivo Cena valido per tutti). */
  prize: string;
  /** True se il tier assegna un pass x2 per il Dante Festival. */
  givesFestivalPass: boolean;
  /** True per il tier con accesso VIP + backstage. */
  isVip: boolean;
  /** Titolo utente mostrato nella share card. */
  userTitle: string;
}

export const TIERS: TierDefinition[] = [
  {
    id: 'none',
    medalName: 'Nessuna',
    title: 'Nessuna medaglia',
    min: 0,
    max: 19,
    prize: 'Voucher 10€ Aperitivo Cena Dante Festival',
    givesFestivalPass: false,
    isVip: false,
    userTitle: 'Novizio del Cielo',
  },
  {
    id: 'silver',
    medalName: 'Argento',
    title: "Medaglia d'Argento",
    min: 20,
    max: 29,
    prize: 'Medaglia Digitale + Voucher 10€ Aperitivo Cena',
    givesFestivalPass: false,
    isVip: false,
    userTitle: 'Cercatore di Tesori',
  },
  {
    id: 'gold',
    medalName: 'Oro',
    title: "Medaglia d'Oro",
    min: 30,
    max: 39,
    prize: 'Medaglia Digitale + Voucher 10€ Aperitivo Cena',
    givesFestivalPass: false,
    isVip: false,
    userTitle: 'Esploratore Esperto',
  },
  {
    id: 'platinum',
    medalName: 'Platino',
    title: 'Medaglia di Platino',
    min: 40,
    max: 49,
    prize: 'Pass x2 Dante Festival (Standard)',
    givesFestivalPass: true,
    isVip: false,
    userTitle: 'Custode del Borgo',
  },
  {
    id: 'diamond',
    medalName: 'Diamante',
    title: 'Medaglia di Diamante',
    min: 50,
    max: null,
    prize: 'Pass x2 Dante Festival VIP + Backstage',
    givesFestivalPass: true,
    isVip: true,
    userTitle: 'Maestro dei Tesori',
  },
];

/** Tier per "nessuna medaglia". */
export const NO_TIER = TIERS[0];

export function getTier(score: number): TierDefinition {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (score >= TIERS[i].min) return TIERS[i];
  }
  return NO_TIER;
}

export function getTierShortLabel(tier: TierDefinition): string {
  return tier.id === 'none' ? 'Nessuna medaglia' : `Medaglia di ${tier.medalName}`;
}

// --------------------------------------------------------- voucher & store

/**
 * Base URL dello store e-commerce del Dante Festival.
 * Sovrascrivibile con VITE_DANTE_STORE_URL per staging / ambiente di test.
 */
export const DANTE_STORE_URL: string =
  (import.meta.env?.VITE_DANTE_STORE_URL as string | undefined) ??
  'https://store.dantefestival.it/checkout';

/** Validità del voucher e del claim sullo store (ore). */
export const VOUCHER_VALIDITY_HOURS = 48;

export type VoucherKind = 'aperitivo' | 'pass' | 'pass_vip';

export interface VoucherIssue {
  kind: VoucherKind;
  /** Codice promozionale da applicare al carrello. */
  code: string;
  /** Etichetta mostrata all'utente. */
  label: string;
  /** Regola d'uso / descrizione breve. */
  rule: string;
  /** Valore commerciale percepito. */
  value: string;
  /** Scadenza del claim (epoch ms). */
  expiresAt: number;
  /** URL dello store con voucher e referral pre-applicati. */
  redeemUrl: string;
  /** Contenuto codificato nel QR code (stesso URL di riscatto). */
  qrPayload: string;
  /** Link generati dal backend quando i provider Wallet sono configurati. */
  walletLinks?: { apple?: string; google?: string };
}

export interface UserProgress {
  bestScore: number;
  bestTier: string;
  bestTierId: TierId;
  vouchers: { code: string; label: string; tier: string; expiresAt: number; date: string }[];
  /** Codice referral personale, usato nella viral loop. */
  referralId: string;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/** Codice voucher leggibile (es. DANTE-APERI-7K4QZ2). */
export function generateVoucherCode(kind: VoucherKind): string {
  const prefix = kind === 'aperitivo' ? 'APERI' : kind === 'pass' ? 'PASS2' : 'VIP2';
  return `DANTE-${prefix}-${randomCode(6)}`;
}

/** ID referral personale, persistito in localStorage. */
export function ensureReferralId(storageKey = 'borgo-sospeso:referral:v1'): string {
  if (typeof window === 'undefined') return 'REF-LOCAL';
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) return existing;
    const created = `REF-${randomCode(5)}`;
    window.localStorage.setItem(storageKey, created);
    return created;
  } catch {
    return `REF-${randomCode(5)}`;
  }
}

/** Link dell'app con referral, da usare nel viral loop WhatsApp. */
export function buildReferralLink(referralId: string): string {
  const fallback = `https://loyalty-experience.app/?caccia=1&ref=${referralId}`;
  if (typeof window === 'undefined' || !window.location) return fallback;
  try {
    const url = new URL(window.location.href);
    url.search = `?caccia=1&ref=${encodeURIComponent(referralId)}`;
    url.hash = '';
    return url.toString();
  } catch {
    return fallback;
  }
}

const INCOMING_REFERRAL_KEY = 'borgo-sospeso:invito-ricevuto:v1';
/** Finestra di attribuzione marketing del referral in ingresso. */
export const REFERRAL_ATTRIBUTION_DAYS = 30;

/**
 * Attribuzione del viral loop: registra il referral di chi ci ha portato qui
 * (arrivo dal link WhatsApp condiviso). Ritorna l'id registrato, se valido.
 */
export function captureIncomingReferral(referralId: string | null): string | null {
  if (!referralId || typeof window === 'undefined') return null;
  const clean = referralId.trim();
  if (!/^REF-[A-Z2-9]{5}$/.test(clean)) return null;
  try {
    window.localStorage.setItem(INCOMING_REFERRAL_KEY, JSON.stringify({ ref: clean, at: Date.now() }));
  } catch {
    /* storage non disponibile */
  }
  return clean;
}

/** Referral di chi ha condiviso la caccia con questo dispositivo (se presente). */
export function getIncomingReferral(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(INCOMING_REFERRAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ref?: string; at?: number };
    const validRef = typeof parsed.ref === 'string' && /^REF-[A-Z2-9]{5}$/.test(parsed.ref);
    const validDate = typeof parsed.at === 'number' && Date.now() - parsed.at <= REFERRAL_ATTRIBUTION_DAYS * 86_400_000;
    if (!validRef || !validDate) {
      window.localStorage.removeItem(INCOMING_REFERRAL_KEY);
      return null;
    }
    return parsed.ref as string;
  } catch {
    return null;
  }
}

/** URL dello store e-commerce con voucher, tier e referral pre-applicati. */
export function buildRedeemUrl(params: {
  code: string;
  tier: TierId;
  referralId: string;
}): string {
  const query = new URLSearchParams({
    voucher: params.code,
    tier: params.tier.toUpperCase(),
    ref: params.referralId,
  });
  return `${DANTE_STORE_URL}?${query.toString()}`;
}

/**
 * Emissione voucher: il voucher 10€ "Aperitivo Cena" (valido per 2 persone)
 * spetta SEMPRE, a qualsiasi punteggio; i pass vengono aggiunti dai tier
 * Platino e Diamante.
 */
export function buildVoucherIssues(params: {
  tier: TierDefinition;
  referralId: string;
  now?: number;
}): VoucherIssue[] {
  const now = params.now ?? Date.now();
  const expiresAt = now + VOUCHER_VALIDITY_HOURS * 60 * 60 * 1000;
  const issues: VoucherIssue[] = [];

  const aperitivoCode = generateVoucherCode('aperitivo');
  issues.push({
    kind: 'aperitivo',
    code: aperitivoCode,
    label: 'Voucher 10€ Aperitivo Cena Dante Festival',
    rule: 'Valido presentandosi in 2 persone',
    value: '10€',
    expiresAt,
    redeemUrl: buildRedeemUrl({ code: aperitivoCode, tier: params.tier.id, referralId: params.referralId }),
    qrPayload: buildRedeemUrl({
      code: aperitivoCode,
      tier: params.tier.id,
      referralId: params.referralId,
    }),
  });

  if (params.tier.givesFestivalPass) {
    const kind: VoucherKind = params.tier.isVip ? 'pass_vip' : 'pass';
    const passCode = generateVoucherCode(kind);
    issues.push({
      kind,
      code: passCode,
      label: params.tier.isVip
        ? 'Pass x2 Dante Festival VIP + Backstage'
        : 'Pass x2 Dante Festival (Standard)',
      rule: '2 biglietti pagati, nominativi da inserire sullo store',
      value: params.tier.isVip ? 'VIP + Backstage' : 'Standard',
      expiresAt,
      redeemUrl: buildRedeemUrl({ code: passCode, tier: params.tier.id, referralId: params.referralId }),
      qrPayload: buildRedeemUrl({
        code: passCode,
        tier: params.tier.id,
        referralId: params.referralId,
      }),
    });
  }

  return issues;
}

/** Messaggio WhatsApp ottimizzato (specifica marketing). */
export function buildShareMessage(
  tier: TierDefinition,
  points: number,
  referralLink: string
): string {
  if (tier.id === 'none') {
    return `Ho appena esplorato il borgo sospeso e portato a casa ${points} pt! 🎭 Ho sbloccato un Voucher di 10€ per l'Aperitivo Cena del Dante Festival valido per due persone (e se fai Platino o Diamante vinci pure i biglietti!). Sfida il borgo qui: ${referralLink}`;
  }
  return `Ho appena esplorato il borgo sospeso e conquistato la Medaglia di ${tier.medalName}! 🎭 Ho sbloccato un Voucher di 10€ per l'Aperitivo Cena del Dante Festival valido per due persone (e se fai Platino o Diamante vinci pure i biglietti!). Sfida il borgo qui: ${referralLink}`;
}

/** URL schema WhatsApp con messaggio pre-compilato codificato. */
export function buildWhatsAppShareUrl(message: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/** Riepilogo testuale del tier, usato nelle card condivisibili. */
export function buildShareCardHeadline(tier: TierDefinition, points: number): string {
  return tier.id === 'none'
    ? `${points} pt tra i vicoli del borgo`
    : `${tier.title} · ${points} pt`;
}

// ------------------------------------------------------ scarsità (FOMO)

const SCARCITY_KEY = 'borgo-sospeso:pass-disponibili:v1';
/** Pass Dante Festival messi a disposizione ogni giorno (simulazione client-side). */
export const DAILY_PASS_ALLOWANCE = 20;

interface ScarcityState {
  day: string;
  remaining: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function readScarcity(): ScarcityState {
  const fallback: ScarcityState = { day: todayKey(), remaining: DAILY_PASS_ALLOWANCE };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(SCARCITY_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as ScarcityState;
    if (parsed.day !== todayKey()) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function writeScarcity(state: ScarcityState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SCARCITY_KEY, JSON.stringify(state));
  } catch {
    /* storage non disponibile */
  }
}

/**
 * Pass ancora disponibili oggi per il Dante Festival.
 * Il numero è deterministico nella giornata e cala quando qualcuno vince un
 * pass: nello store reale questo valore arriverà dall'API inventario.
 */
export function getDailyPassesLeft(): number {
  const key = todayKey();
  const state = readScarcity();
  if (state.day !== key) return DAILY_PASS_ALLOWANCE;
  return Math.max(0, state.remaining);
}

/** Registra il consumo di pass vinti nella sessione. */
export function consumeDailyPasses(count: number): number {
  const state = readScarcity();
  const next: ScarcityState = {
    day: todayKey(),
    remaining: Math.max(0, state.remaining - Math.max(0, count)),
  };
  writeScarcity(next);
  return next.remaining;
}

/** Messaggio del banner scarsità, con il numero del giorno. */
export function buildScarcityMessage(remaining: number): string {
  if (remaining <= 0) return 'Pass Dante Festival esauriti per oggi: torna domani per i nuovi bonus';
  return `Solo ${remaining} pass Dante Festival disponibili oggi`;
}
