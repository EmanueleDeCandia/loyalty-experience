/**
 * Catalogo dei tesori del borgo sospeso + regole di punteggio / premi.
 *
 * Questo modulo è la singola fonte di verità per:
 *  - l'elenco delle 9 figurine (id, etichetta, emoji, posizione 3D nel diorama);
 *  - la durata della sessione ed il range di punti casuali;
 *  - le soglie delle medaglie ed il testo di condivisione WhatsApp.
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

/** Valore intero casuale nel range [5, 10] come da specifica. */
export function rollTreasurePoints(): number {
  return Math.floor(Math.random() * (POINTS_MAX - POINTS_MIN + 1)) + POINTS_MIN;
}

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
  /** Premio speciale, se previsto dal tier. */
  prize: string | null;
  /** True se il tier assegna il pass x2 per il Dante Festival. */
  givesFestivalPass: boolean;
}

export const TIERS: TierDefinition[] = [
  {
    id: 'none',
    medalName: 'Nessuna',
    title: 'Nessun premio',
    min: 0,
    max: 19,
    prize: null,
    givesFestivalPass: false,
  },
  {
    id: 'silver',
    medalName: 'Argento',
    title: "Medaglia d'Argento",
    min: 20,
    max: 29,
    prize: null,
    givesFestivalPass: false,
  },
  {
    id: 'gold',
    medalName: 'Oro',
    title: "Medaglia d'Oro",
    min: 30,
    max: 39,
    prize: null,
    givesFestivalPass: false,
  },
  {
    id: 'platinum',
    medalName: 'Platino',
    title: 'Medaglia di Platino',
    min: 40,
    max: 49,
    prize: 'Pass per 2 persone con biglietto pagato per il Dante Festival',
    givesFestivalPass: true,
  },
  {
    id: 'diamond',
    medalName: 'Diamante',
    title: 'Medaglia di Diamante',
    min: 50,
    max: null,
    prize: 'Pass per 2 persone con biglietto pagato per il Dante Festival',
    givesFestivalPass: true,
  },
];

/** Tier per "nessuna medaglia" (punteggio insufficiente). */
export const NO_TIER = TIERS[0];

export function getTier(score: number): TierDefinition {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (score >= TIERS[i].min) return TIERS[i];
  }
  return NO_TIER;
}

/** Etichetta compatta usata in HUD e card riepilogative. */
export function getTierShortLabel(tier: TierDefinition): string {
  return tier.id === 'none' ? 'Nessuna medaglia' : `Medaglia di ${tier.medalName}`;
}

/**
 * Link dell'app da inserire nei messaggi condivisi.
 * Usa l'URL corrente (funziona anche su preview/staging) marcandolo con `?caccia=1`
 * così chi riceve il messaggio atterra direttamente nel mini-game.
 */
export function getAppShareLink(): string {
  if (typeof window === 'undefined' || !window.location) {
    return 'https://loyalty-experience.app/?caccia=1';
  }
  try {
    const url = new URL(window.location.href);
    url.search = '?caccia=1';
    url.hash = '';
    return url.toString();
  } catch {
    return 'https://loyalty-experience.app/?caccia=1';
  }
}

/** Messaggio dinamico condiviso via WhatsApp, differenziato per tier. */
export function buildShareMessage(tier: TierDefinition, points: number): string {
  const appLink = getAppShareLink();

  if (tier.id === 'platinum' || tier.id === 'diamond') {
    return `Ho conquistato la Medaglia di ${tier.medalName} (${points} pt) e vinto 2 biglietti per il Dante Festival nel borgo sospeso! Prova a battermi: ${appLink}`;
  }

  if (tier.id === 'none') {
    return `Ho totalizzato ${points} pt nella Caccia ai Tesori del borgo sospeso! Riuscirai a vincere il pass per il Dante Festival? Gioca qui: ${appLink}`;
  }

  return `Ho sbloccato la Medaglia di ${tier.medalName} con ${points} pt esplorando il borgo sospeso! Riuscirai a vincere il pass per il Dante Festival? Gioca qui: ${appLink}`;
}

/** URL schema WhatsApp con messaggio pre-compilato codificato. */
export function buildWhatsAppShareUrl(message: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/** Codice voucher/claim per il premio Dante Festival. */
export function generateVoucherCode(tier: TierDefinition): string {
  const tierCode = tier.id.slice(0, 2).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `DF-${tierCode}-${random}`;
}
