import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  HUNT_DURATION_MS,
  TREASURES,
  TierDefinition,
  TreasureId,
  buildShareMessage,
  buildWhatsAppShareUrl,
  generateVoucherCode,
  getTier,
  rollTreasurePoints,
} from './treasureCatalog';
import {
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

export interface HuntResult {
  score: number;
  foundCount: number;
  totalCount: number;
  tier: TierDefinition;
  voucherCode: string | null;
  isNewRecord: boolean;
  /** Millisecondi effettivamente impiegati per chiudere la sessione. */
  elapsedMs: number;
}

export interface StoredProgress {
  bestScore: number;
  bestTier: string;
  bestTierId: string;
  vouchers: { code: string; tier: string; date: string }[];
}

const STORAGE_KEY = 'borgo-sospeso:caccia-tesori:v1';

const EMPTY_PROGRESS: StoredProgress = { bestScore: 0, bestTier: '', bestTierId: 'none', vouchers: [] };

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
}

function createInitialState(): SessionState {
  return { phase: 'idle', items: createSessionItems(), deadline: null, startedAt: null };
}

export interface TreasureHuntApi {
  phase: HuntPhase;
  items: HuntItem[];
  score: number;
  foundCount: number;
  totalCount: number;
  deadline: number | null;
  result: HuntResult | null;
  record: StoredProgress;
  muted: boolean;
  /** Contatore che identifica la sessione corrente (utile per resettare la scena 3D). */
  sessionId: number;
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
}

export function useTreasureHunt(): TreasureHuntApi {
  const stateRef = useRef<SessionState>(createInitialState());
  const [sessionId, setSessionId] = useState(0);
  const [, forceRender] = useReducer((counter: number) => counter + 1, 0);
  const [result, setResult] = useState<HuntResult | null>(null);
  const [record, setRecord] = useState<StoredProgress>(() => loadProgress());
  const [muted, setMuted] = useState<boolean>(false);

  const timeoutRef = useRef<number | null>(null);
  const revealCounterRef = useRef(0);

  useEffect(() => {
    setHuntMuted(muted);
  }, [muted]);

  const clearSessionTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearSessionTimeout, [clearSessionTimeout]);

  /** Chiude la sessione, calcola medaglia/premio e mostra la schermata finale. */
  const completeSession = useCallback(() => {
    const session = stateRef.current;
    if (session.phase !== 'active') return;

    clearSessionTimeout();

    const score = session.items.reduce((sum, item) => (item.revealed ? sum + item.points : sum), 0);
    const foundCount = session.items.filter(item => item.revealed).length;
    const tier = getTier(score);
    const voucherCode = tier.givesFestivalPass ? generateVoucherCode(tier) : null;
    const elapsedMs = session.startedAt ? Math.min(HUNT_DURATION_MS, performance.now() - session.startedAt) : HUNT_DURATION_MS;

    const previous = loadProgress();
    const isNewRecord = score > previous.bestScore;
    const nextProgress: StoredProgress = {
      bestScore: isNewRecord ? score : previous.bestScore,
      bestTier: isNewRecord ? tier.title : previous.bestTier,
      bestTierId: isNewRecord ? tier.id : previous.bestTierId,
      vouchers: voucherCode
        ? [...previous.vouchers, { code: voucherCode, tier: tier.title, date: new Date().toISOString() }].slice(-6)
        : previous.vouchers,
    };
    saveProgress(nextProgress);
    setRecord(nextProgress);

    stateRef.current = { ...session, phase: 'completed', deadline: null };
    setResult({
      score,
      foundCount,
      totalCount: session.items.length,
      tier,
      voucherCode,
      isNewRecord,
      elapsedMs,
    });

    forceRender();
    playHuntComplete(tier.id, isNewRecord);
  }, [clearSessionTimeout]);

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
    };
    revealCounterRef.current = 0;
    setResult(null);
    setSessionId(id => id + 1);
    forceRender();

    playHuntStart();
    vibrate([14, 30, 14]);
    timeoutRef.current = window.setTimeout(completeSession, HUNT_DURATION_MS);
  }, [clearSessionTimeout, completeSession]);

  /** Rivela una figurina: avvia il timer se necessario e aggiorna lo score. */
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
      const items = session.items.map((item, i) =>
        i === index ? { ...item, revealed: true } : item
      );
      stateRef.current = { ...session, items };

      const revealIndex = revealCounterRef.current;
      revealCounterRef.current += 1;
      playTreasureReveal(revealIndex, points);
      vibrate(points >= 9 ? [14, 34, 14] : 14);
      forceRender();

      // Tutte le figurine trovate: chiusura anticipata dopo l'animazione di flip.
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
    setSessionId(id => id + 1);
    forceRender();
  }, [clearSessionTimeout]);

  const replay = useCallback(() => resetSession(), [resetSession]);
  const abandon = useCallback(() => resetSession(), [resetSession]);

  const toggleMute = useCallback(() => {
    setMuted(previous => !previous);
  }, []);

  const state = stateRef.current;
  const score = state.items.reduce((sum, item) => (item.revealed ? sum + item.points : sum), 0);
  const foundCount = state.items.filter(item => item.revealed).length;

  const shareMessage = useCallback(() => {
    if (!result) return '';
    return buildShareMessage(result.tier, result.score);
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
      foundCount,
      totalCount: state.items.length,
      deadline: state.deadline,
      result,
      record,
      muted,
      sessionId,
      start,
      reveal,
      replay,
      abandon,
      toggleMute,
      isRevealed,
      shareMessage,
      shareUrl,
    }),
    [
      state.phase,
      state.items,
      state.deadline,
      score,
      foundCount,
      result,
      record,
      muted,
      sessionId,
      start,
      reveal,
      replay,
      abandon,
      toggleMute,
      isRevealed,
      shareMessage,
      shareUrl,
    ]
  );
}
