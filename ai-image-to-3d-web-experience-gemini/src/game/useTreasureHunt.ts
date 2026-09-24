import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  HUNT_DURATION_MS,
  TREASURES,
  TierDefinition,
  TreasureId,
  VoucherIssue,
  buildReferralLink,
  buildShareMessage,
  buildWhatsAppShareUrl,
  ensureReferralId,
  getIncomingReferral,
  getTier,
  rollTreasurePoints,
} from './treasureCatalog';
import { LeadClaim, RemoteHunt, campaignApi, trackEvent } from './api';
import { playCombo, playHuntComplete, playHuntStart, playTreasureReveal, setHuntMuted, vibrate } from './huntAudio';

export type HuntPhase = 'idle' | 'active' | 'completed';
export interface HuntItem { id: TreasureId; label: string; emoji: string; area: string; points: number; revealed: boolean; }
export interface HuntComboEvent { key: number; label: string; bonus: number; items: [TreasureId, TreasureId]; }
export interface HuntResult {
  sessionId: string;
  score: number;
  baseScore: number;
  comboBonus: number;
  comboCount: number;
  foundCount: number;
  totalCount: number;
  tier: TierDefinition;
  vouchers: VoucherIssue[];
  redeemUrl: string;
  referralId: string;
  isNewRecord: boolean;
  elapsedMs: number;
  variant: string;
  claimed: boolean;
}
export interface StoredProgress {
  bestScore: number; bestTier: string; bestTierId: string;
  vouchers: { code: string; label: string; tier: string; expiresAt: number; date: string }[];
  referralId: string;
}
export interface HuntFeedEntry { key: number; label: string; emoji: string; points: number; total: number; }
export interface TreasureHuntApi {
  phase: HuntPhase; items: HuntItem[]; score: number; baseScore: number; comboBonus: number;
  comboCount: number; foundCount: number; totalCount: number; deadline: number | null;
  durationMs: number; result: HuntResult | null; record: StoredProgress; muted: boolean;
  sessionId: number; feed: HuntFeedEntry[]; comboEvent: HuntComboEvent | null;
  passesLeft: number; festivalStartAt: string | null; referralId: string; isStarting: boolean; error: string | null;
  start: () => void; reveal: (id: TreasureId) => void; replay: () => void; abandon: () => void;
  toggleMute: () => void; isRevealed: (id: TreasureId) => boolean;
  claimVouchers: (lead: LeadClaim) => Promise<void>;
  shareMessage: () => string; shareUrl: () => string; referralLink: () => string;
}

const STORAGE_KEY = 'borgo-sospeso:caccia-tesori:v3';
const EMPTY_PROGRESS: StoredProgress = { bestScore: 0, bestTier: '', bestTierId: 'none', vouchers: [], referralId: '' };
function loadProgress(): StoredProgress {
  if (typeof window === 'undefined') return EMPTY_PROGRESS;
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); return { ...EMPTY_PROGRESS, ...value, vouchers: Array.isArray(value.vouchers) ? value.vouchers : [] }; }
  catch { return EMPTY_PROGRESS; }
}
function saveProgress(progress: StoredProgress) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* private mode */ } }
export function createSessionItems(points?: Partial<Record<TreasureId, number>>): HuntItem[] {
  return TREASURES.map(t => ({ ...t, points: points?.[t.id] ?? rollTreasurePoints(), revealed: false }));
}
interface SessionState {
  phase: HuntPhase; items: HuntItem[]; deadline: number | null; startedAt: number | null;
  comboCount: number; comboBonus: number; remote: RemoteHunt | null;
}
const initialState = (): SessionState => ({ phase: 'idle', items: createSessionItems(), deadline: null, startedAt: null, comboCount: 0, comboBonus: 0, remote: null });

export function useTreasureHunt(): TreasureHuntApi {
  const stateRef = useRef<SessionState>(initialState());
  const [, render] = useReducer((n: number) => n + 1, 0);
  const [result, setResult] = useState<HuntResult | null>(null);
  const [record, setRecord] = useState(loadProgress);
  const [muted, setMuted] = useState(false);
  const [feed, setFeed] = useState<HuntFeedEntry[]>([]);
  const [comboEvent, setComboEvent] = useState<HuntComboEvent | null>(null);
  const [passesLeft, setPassesLeft] = useState(-1);
  const [festivalStartAt, setFestivalStartAt] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const referralId = useMemo(() => ensureReferralId(), []);
  const timeoutRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<number | null>(null);
  const revealCounter = useRef(0);
  const collecting = useRef(new Set<TreasureId>());
  const completing = useRef(false);
  const starting = useRef<Promise<RemoteHunt> | null>(null);

  useEffect(() => { setHuntMuted(muted); }, [muted]);
  useEffect(() => { campaignApi.get().then(c => { setPassesLeft(c.passesRemaining); setFestivalStartAt(c.festivalStartAt); }).catch(() => setError('Collegamento al servizio premi non disponibile.')); trackEvent('app_loaded'); }, []);
  const clearTimers = useCallback(() => {
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    if (comboTimeoutRef.current !== null) clearTimeout(comboTimeoutRef.current);
    timeoutRef.current = comboTimeoutRef.current = null;
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  const completeSession = useCallback(async () => {
    const state = stateRef.current;
    if (state.phase !== 'active' || !state.remote || completing.current) return;
    completing.current = true;
    clearTimers();
    try {
      const remoteResult = await campaignApi.complete(state.remote.id);
      const tier = getTier(remoteResult.score);
      const previous = loadProgress();
      const isNewRecord = remoteResult.score > previous.bestScore;
      const next = { ...previous, referralId, bestScore: isNewRecord ? remoteResult.score : previous.bestScore, bestTier: isNewRecord ? tier.title : previous.bestTier, bestTierId: isNewRecord ? tier.id : previous.bestTierId };
      saveProgress(next); setRecord(next);
      stateRef.current = { ...stateRef.current, phase: 'completed', deadline: null, comboBonus: remoteResult.comboBonus, comboCount: remoteResult.comboCount };
      setResult({ sessionId: remoteResult.id, score: remoteResult.score, baseScore: remoteResult.baseScore, comboBonus: remoteResult.comboBonus, comboCount: remoteResult.comboCount, foundCount: remoteResult.foundCount, totalCount: TREASURES.length, tier, vouchers: [], redeemUrl: '', referralId, isNewRecord, elapsedMs: remoteResult.durationMs, variant: remoteResult.variant, claimed: false });
      trackEvent('hunt_completed', { sessionId: remoteResult.id, variant: remoteResult.variant, properties: { score: remoteResult.score, tier: tier.id } });
      playHuntComplete(tier.id, isNewRecord); render();
    } catch (e) { setError(e instanceof Error ? e.message : 'Impossibile chiudere la caccia'); }
    finally { completing.current = false; }
  }, [clearTimers, referralId]);

  const begin = useCallback(async (): Promise<RemoteHunt> => {
    if (stateRef.current.remote && stateRef.current.phase === 'active') return stateRef.current.remote;
    if (starting.current) return starting.current;
    setIsStarting(true); setError(null);
    const promise = campaignApi.startHunt(referralId, getIncomingReferral());
    starting.current = promise;
    try {
      const remote = await promise;
      const remaining = Math.max(0, remote.deadlineAt - Date.now());
      stateRef.current = { phase: 'active', items: createSessionItems(remote.points), deadline: performance.now() + remaining, startedAt: performance.now(), comboCount: 0, comboBonus: 0, remote };
      revealCounter.current = 0; collecting.current.clear(); setResult(null); setFeed([]); setComboEvent(null); setSessionId(n => n + 1); render();
      playHuntStart(); vibrate([14, 30, 14]);
      timeoutRef.current = window.setTimeout(() => void completeSession(), remaining);
      return remote;
    } catch (e) { const message = e instanceof Error ? e.message : 'Servizio premi non disponibile'; setError(message); throw e; }
    finally { starting.current = null; setIsStarting(false); }
  }, [completeSession, referralId]);
  const start = useCallback(() => { void begin(); }, [begin]);

  const reveal = useCallback(async (id: TreasureId) => {
    try {
      if (stateRef.current.phase === 'completed' || collecting.current.has(id)) return;
      const remote = stateRef.current.phase === 'idle' ? await begin() : stateRef.current.remote;
      if (!remote || stateRef.current.items.some(i => i.id === id && i.revealed)) return;
      collecting.current.add(id);
      const collected = await campaignApi.collect(remote.id, id);
      const state = stateRef.current;
      const index = state.items.findIndex(i => i.id === id);
      if (index < 0 || state.items[index].revealed) return;
      const items = state.items.map((item, i) => i === index ? { ...item, points: collected.points, revealed: true } : item);
      stateRef.current = { ...state, items, comboBonus: state.comboBonus + collected.bonus, comboCount: state.comboCount + (collected.bonus ? 1 : 0) };
      const key = revealCounter.current++;
      setFeed(old => [...old, { key, label: items[index].label, emoji: items[index].emoji, points: collected.points, total: collected.score }].slice(-3));
      if (collected.bonus) {
        setComboEvent({ key, label: 'Combo Tipica!', bonus: collected.bonus, items: [id, id] });
        playCombo(); vibrate([12, 26, 12, 26]);
        comboTimeoutRef.current = window.setTimeout(() => setComboEvent(null), 1800);
      }
      playTreasureReveal(key, collected.points); vibrate(collected.points >= 9 ? [14, 34, 14] : 14); render();
      if (collected.foundCount === TREASURES.length) window.setTimeout(() => void completeSession(), 620);
    } catch (e) { setError(e instanceof Error ? e.message : 'Figurina non registrata'); }
    finally { collecting.current.delete(id); }
  }, [begin, completeSession]);

  const claimVouchers = useCallback(async (lead: LeadClaim) => {
    const current = result;
    if (!current) throw new Error('Risultato non disponibile');
    const response = await campaignApi.claim(current.sessionId, lead);
    const primary = response.vouchers.find(v => v.kind !== 'aperitivo') ?? response.vouchers[0];
    const nextResult = { ...current, vouchers: response.vouchers, redeemUrl: primary?.redeemUrl || '', claimed: true };
    setResult(nextResult); setPassesLeft(response.passesRemaining);
    const previous = loadProgress();
    const next = { ...previous, vouchers: [...previous.vouchers, ...response.vouchers.map(v => ({ code: v.code, label: v.label, tier: current.tier.title, expiresAt: v.expiresAt, date: new Date().toISOString() }))].slice(-8) };
    saveProgress(next); setRecord(next);
    trackEvent('lead_submitted', { sessionId: current.sessionId, variant: current.variant, properties: { contactType: lead.contactType, marketingOptIn: lead.marketingOptIn } });
  }, [result]);

  const reset = useCallback(() => { clearTimers(); stateRef.current = initialState(); collecting.current.clear(); completing.current = false; setResult(null); setFeed([]); setComboEvent(null); setError(null); setSessionId(n => n + 1); render(); }, [clearTimers]);
  const state = stateRef.current;
  const baseScore = state.items.reduce((sum, item) => sum + (item.revealed ? item.points : 0), 0);
  const score = baseScore + state.comboBonus;
  const referralLink = useCallback(() => buildReferralLink(referralId), [referralId]);
  const shareMessage = useCallback(() => result ? buildShareMessage(result.tier, result.score, buildReferralLink(result.referralId)) : '', [result]);
  return useMemo(() => ({
    phase: state.phase, items: state.items, score, baseScore, comboBonus: state.comboBonus, comboCount: state.comboCount,
    foundCount: state.items.filter(i => i.revealed).length, totalCount: state.items.length, deadline: state.deadline,
    durationMs: state.remote?.durationMs ?? HUNT_DURATION_MS, result, record, muted, sessionId, feed, comboEvent,
    passesLeft, festivalStartAt, referralId, isStarting, error, start, reveal: (id: TreasureId) => { void reveal(id); }, replay: reset, abandon: reset,
    toggleMute: () => setMuted(v => !v), isRevealed: (id: TreasureId) => stateRef.current.items.some(i => i.id === id && i.revealed),
    claimVouchers, shareMessage, shareUrl: () => buildWhatsAppShareUrl(shareMessage()), referralLink,
  }), [state.phase, state.items, state.comboBonus, state.comboCount, state.deadline, state.remote, score, baseScore, result, record, muted, sessionId, feed, comboEvent, passesLeft, festivalStartAt, referralId, isStarting, error, start, reveal, reset, claimVouchers, shareMessage, referralLink]);
}
