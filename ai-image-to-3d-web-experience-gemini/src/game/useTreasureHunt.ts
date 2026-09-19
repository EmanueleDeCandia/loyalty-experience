import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  HUNT_DURATION_MS,
  TREASURES,
  TierDefinition,
  TreasureId,
  VoucherIssue,
  buildReferralLink,
  buildShareMessage,
  buildVoucherIssues,
  buildWhatsAppShareUrl,
  consumeDailyPasses,
  ensureReferralId,
  findCombo,
  getDailyPassesLeft,
  getTier,
  rollTreasurePoints,
} from './treasureCatalog';
import {
  playCombo,
  playHuntComplete,
  playHuntStart,
  playTreasureReveal,
  setHuntMuted,
  vibrate,
} from './huntAudio';

export type HuntPhase = 'idle' | 'active' | 'completed';

export interface HuntItem {
  id: TreasureId;
  label: string;
  emoji: string;
  area: string;
  /** Punti assegnati in modo univoco all'avvio della sessione (5-10). */
  points: number;
  revealed: boolean;
}

/** Combo gastronomica attivata da due tap consecutivi coerenti. */
export interface HuntComboEvent {
  key: number;
  label: string;
  bonus: number;
  items: [TreasureId, TreasureId];
}

export interface HuntResult {
  /** Punteggio totale: somma delle figurine + bonus combo. */
  score: number;
  /** Somma dei soli valori delle figurine. */
  baseScore: number;
  comboBonus: number;
  comboCount: number;
  foundCount: number;
  totalCount: number;
  tier: TierDefinition;
  /** Voucher emessi: Aperitivo Cena sempre, pass/VIP per Platino e Diamante. */
  vouchers: VoucherIssue[];
  /** URL di riscatto principale sullo store e-commerce. */
  redeemUrl: string;
  referralId: string;
  isNewRecord: boolean;
  elapsedMs: number;
}

export interface StoredProgress {
  bestScore: number;
  bestTier: string;
  bestTierId: string;
  vouchers: { code: string; label: string; tier: string; expiresAt: number; date: string }[];
  referralId: string;
}

/** Evento di raccolta mostrato come feedback nell'HUD. */
export interface HuntFeedEntry {
  key: number;
  label: string;
  emoji: string;
  points: number;
  total: number;
}

export interface TreasureHuntApi {
  phase: HuntPhase;
  items: HuntItem[];
  score: number;
  baseScore: number;
  comboBonus: number;
  comboCount: number;
  foundCount: number;
  totalCount: number;
  deadline: number | null;
  result: HuntResult | null;
  record: StoredProgress;
  muted: boolean;
  /** Contatore che identifica la sessione corrente (utile per resettare la scena 3D). */
  sessionId: number;
  /** Ultime figurine raccolte, per il feedback "+X pt" nell'HUD. */
  feed: HuntFeedEntry[];
  /** Ultima combo attivata, per il feedback particellare "Combo Tipica!". */
  comboEvent: HuntComboEvent | null;
  /** Pass Dante Festival ancora disponibili oggi (banner scarsità). */
  passesLeft: number;
  referralId: string;
  start: () => void;
  reveal: (id: TreasureId) => void;
  /** Rigioca: azzera timer, punti e figurine riportando la sessione a "idle". */
  replay: () => void;
  /** Abbandona la caccia in corso e torna all'esplorazione libera. */
  abandon: () => void;
  toggleMute: () => void;
  /** True quando il tap è stato rifiutato perché la figurina è già rivelata. */
  isRevealed: (id: TreasureId) => boolean;
  shareMessage: () => string;
  shareUrl: () => string;
  referralLink: () => string;
}

const STORAGE_KEY = 'borgo-sospeso:caccia-tesori:v2';

const EMPTY_PROGRESS: StoredProgress = {
  bestScore: 0,
  bestTier: '',
  bestTierId: 'none',
  vouchers: [],
  referralId: '',
};

function loadProgress(): StoredProgress {
  if (typeof window === 'undefined') return EMPTY_PROGRESS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<StoredProgress>;
    return {
      bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
      bestTier: parsed.bestTier ?? '',
      bestTierId: parsed.bestTierId ?? 'none',
      vouchers: Array.isArray(parsed.vouchers) ? parsed.vouchers : [],
      referralId: parsed.referralId ?? '',
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function saveProgress(progress: StoredProgress): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* storage non disponibile: la sessione resta comunque valida */
  }
}

/**
 * Crea le figurine della sessione: 9 item, ognuno con un valore casuale 5-10
 * assegnato una sola volta all'avvio.
 */
export function createSessionItems(): HuntItem[] {
  return TREASURES.map(treasure => ({
    id: treasure.id,
    label: treasure.label,
    emoji: treasure.emoji,
    area: treasure.area,
    points: rollTreasurePoints(),
    revealed: false,
  }));
}

interface SessionState {
  phase: HuntPhase;
  items: HuntItem[];
  deadline: number | null;
  startedAt: number | null;
  /** Ultimo tap, per riconoscere le combo gastronomiche. */
  lastRevealed: TreasureId | null;
  comboCount: number;
  comboBonus: number;
}

function createInitialState(): SessionState {
  return {
    phase: 'idle',
    items: createSessionItems(),
    deadline: null,
    startedAt: null,
    lastRevealed: null,
    comboCount: 0,
    comboBonus: 0,
  };
}

export function useTreasureHunt(): TreasureHuntApi {
  const stateRef = useRef<SessionState>(createInitialState());
  const [sessionId, setSessionId] = useState(0);
  const [, forceRender] = useReducer((counter: number) => counter + 1, 0);
  const [result, setResult] = useState<HuntResult | null>(null);
  const [record, setRecord] = useState<StoredProgress>(() => loadProgress());
  const [muted, setMuted] = useState<boolean>(false);
  const [feed, setFeed] = useState<HuntFeedEntry[]>([]);
  const [comboEvent, setComboEvent] = useState<HuntComboEvent | null>(null);
  const [passesLeft, setPassesLeft] = useState<number>(() => getDailyPassesLeft());
  const [referralId, setReferralId] = useState<string>(() => {
    const id = ensureReferralId();
    const stored = loadProgress();
    if (stored.referralId !== id) saveProgress({ ...stored, referralId: id });
    return id;
  });

  const timeoutRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<number | null>(null);
  const revealCounterRef = useRef(0);

  useEffect(() => {
    setHuntMuted(muted);
  }, [muted]);

  useEffect(() => {
    setReferralId(current => current || ensureReferralId());
  }, []);

  const clearSessionTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (comboTimeoutRef.current !== null) {
      window.clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearSessionTimeout, [clearSessionTimeout]);

  /** Chiude la sessione: calcola medaglia, emette i voucher e mostra il resoconto. */
  const completeSession = useCallback(() => {
    const session = stateRef.current;
    if (session.phase !== 'active') return;

    clearSessionTimeout();

    const baseScore = session.items.reduce((sum, item) => (item.revealed ? sum + item.points : sum), 0);
    const score = baseScore + session.comboBonus;
    const foundCount = session.items.filter(item => item.revealed).length;
    const tier = getTier(score);
    const vouchers = buildVoucherIssues({ tier, referralId });
    const primary = vouchers.find(voucher => voucher.kind !== 'aperitivo') ?? vouchers[0];

    const elapsedMs = session.startedAt
      ? Math.min(HUNT_DURATION_MS, performance.now() - session.startedAt)
      : HUNT_DURATION_MS;

    const previous = loadProgress();
    const isNewRecord = score > previous.bestScore;
    const nextProgress: StoredProgress = {
      bestScore: isNewRecord ? score : previous.bestScore,
      bestTier: isNewRecord ? tier.title : previous.bestTier,
      bestTierId: isNewRecord ? tier.id : previous.bestTierId,
      referralId,
      vouchers: [
        ...previous.vouchers,
        ...vouchers.map(voucher => ({
          code: voucher.code,
          label: voucher.label,
          tier: tier.title,
          expiresAt: voucher.expiresAt,
          date: new Date().toISOString(),
        })),
      ].slice(-8),
    };
    saveProgress(nextProgress);
    setRecord(nextProgress);

    // Consumo dei pass giornalieri: nello store reale arriva dall'API inventario.
    if (tier.givesFestivalPass) {
      setPassesLeft(consumeDailyPasses(2));
    }

    stateRef.current = { ...session, phase: 'completed', deadline: null };
    setResult({
      score,
      baseScore,
      comboBonus: session.comboBonus,
      comboCount: session.comboCount,
      foundCount,
      totalCount: session.items.length,
      tier,
      vouchers,
      redeemUrl: primary.redeemUrl,
      referralId,
      isNewRecord,
      elapsedMs,
    });

    forceRender();
    playHuntComplete(tier.id, isNewRecord);
  }, [clearSessionTimeout, referralId]);

  /** Avvia il countdown di 20s (o riprende se già attivo, senza resettare). */
  const start = useCallback(() => {
    if (stateRef.current.phase === 'active') return;

    clearSessionTimeout();
    const now = performance.now();
    stateRef.current = {
      phase: 'active',
      items: createSessionItems(),
      deadline: now + HUNT_DURATION_MS,
      startedAt: now,
      lastRevealed: null,
      comboCount: 0,
      comboBonus: 0,
    };
    revealCounterRef.current = 0;
    setResult(null);
    setFeed([]);
    setComboEvent(null);
    setPassesLeft(getDailyPassesLeft());
    setSessionId(id => id + 1);
    forceRender();

    playHuntStart();
    vibrate([14, 30, 14]);
    timeoutRef.current = window.setTimeout(completeSession, HUNT_DURATION_MS);
  }, [clearSessionTimeout, completeSession]);

  /** Rivela una figurina: avvia il timer, calcola i punti e riconosce le combo. */
  const reveal = useCallback(
    (id: TreasureId) => {
      if (stateRef.current.phase === 'completed') return;

      // Primo tocco su una figurina -> il countdown parte da qui.
      if (stateRef.current.phase === 'idle') {
        start();
      }

      const session = stateRef.current;
      const index = session.items.findIndex(item => item.id === id);
      if (index < 0 || session.items[index].revealed) return;

      const points = session.items[index].points;
      const items = session.items.map((item, i) => (i === index ? { ...item, revealed: true } : item));

      // Combo gastronomica: due tap consecutivi coerenti valgono un bonus immediato.
      const combo = findCombo(session.lastRevealed, id);
      const comboBonus = session.comboBonus + (combo?.bonus ?? 0);
      const comboCount = session.comboCount + (combo ? 1 : 0);

      stateRef.current = {
        ...session,
        items,
        lastRevealed: id,
        comboBonus,
        comboCount,
      };

      const revealIndex = revealCounterRef.current;
      revealCounterRef.current += 1;
      const collectedSoFar = items.reduce(
        (sum, item) => (item.revealed ? sum + item.points : sum),
        comboBonus
      );

      setFeed(previous =>
        [
          ...previous,
          {
            key: revealIndex,
            label: items[index].label,
            emoji: items[index].emoji,
            points,
            total: collectedSoFar,
          },
        ].slice(-3)
      );

      if (combo) {
        const event: HuntComboEvent = {
          key: revealIndex,
          label: combo.label,
          bonus: combo.bonus,
          items: [session.lastRevealed as TreasureId, id],
        };
        setComboEvent(event);
        playCombo();
        vibrate([12, 26, 12, 26]);
        if (comboTimeoutRef.current !== null) window.clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = window.setTimeout(() => setComboEvent(null), 1800);
      }

      playTreasureReveal(revealIndex, points);
      vibrate(points >= 9 ? [14, 34, 14] : 14);
      forceRender();

      // Tutte le figurine trovate: chiusura anticipata dopo l'animazione di raccolta.
      if (items.every(item => item.revealed)) {
        window.setTimeout(() => completeSession(), 620);
      }
    },
    [start, completeSession]
  );

  /** Resetta la sessione (timer, punti, figurine) tornando allo stato iniziale. */
  const resetSession = useCallback(() => {
    clearSessionTimeout();
    stateRef.current = createInitialState();
    revealCounterRef.current = 0;
    setResult(null);
    setFeed([]);
    setComboEvent(null);
    setSessionId(id => id + 1);
    forceRender();
  }, [clearSessionTimeout]);

  const replay = useCallback(() => resetSession(), [resetSession]);
  const abandon = useCallback(() => resetSession(), [resetSession]);

  const toggleMute = useCallback(() => {
    setMuted(previous => !previous);
  }, []);

  const state = stateRef.current;
  const baseScore = state.items.reduce((sum, item) => (item.revealed ? sum + item.points : sum), 0);
  const score = baseScore + state.comboBonus;
  const foundCount = state.items.filter(item => item.revealed).length;

  const referralLink = useCallback(() => buildReferralLink(referralId), [referralId]);

  const shareMessage = useCallback(() => {
    if (!result) return '';
    return buildShareMessage(result.tier, result.score, buildReferralLink(result.referralId));
  }, [result]);

  const shareUrl = useCallback(() => buildWhatsAppShareUrl(shareMessage()), [shareMessage]);

  const isRevealed = useCallback((id: TreasureId) => {
    return stateRef.current.items.some(item => item.id === id && item.revealed);
  }, []);

  return useMemo<TreasureHuntApi>(
    () => ({
      phase: state.phase,
      items: state.items,
      score,
      baseScore,
      comboBonus: state.comboBonus,
      comboCount: state.comboCount,
      foundCount,
      totalCount: state.items.length,
      deadline: state.deadline,
      result,
      record,
      muted,
      sessionId,
      feed,
      comboEvent,
      passesLeft,
      referralId,
      start,
      reveal,
      replay,
      abandon,
      toggleMute,
      isRevealed,
      shareMessage,
      shareUrl,
      referralLink,
    }),
    [
      state.phase,
      state.items,
      state.comboBonus,
      state.comboCount,
      state.deadline,
      score,
      foundCount,
      result,
      record,
      muted,
      sessionId,
      feed,
      comboEvent,
      passesLeft,
      referralId,
      start,
      reveal,
      replay,
      abandon,
      toggleMute,
      isRevealed,
      shareMessage,
      shareUrl,
      referralLink,
    ]
  );
}
