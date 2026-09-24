import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Compass, Flame, Play, RotateCcw, Scroll, Volume2, VolumeX, X, Eye, Coins, Gem } from 'lucide-react';
import { HUNT_DURATION_MS } from '../game/treasureCatalog';
import {
  HuntComboEvent,
  HuntFeedEntry,
  HuntPhase,
  HuntResult,
  StoredProgress,
} from '../game/useTreasureHunt';
import { playHuntTick } from '../game/huntAudio';
import { cn } from '../utils/cn';
import { VillageCrest } from './fantasy/Ornaments';

interface HuntHudProps {
  phase: HuntPhase;
  score: number;
  foundCount: number;
  totalCount: number;
  deadline: number | null;
  durationMs?: number;
  result: HuntResult | null;
  record: StoredProgress;
  muted: boolean;
  /** Ultime figurine raccolte: mostrate come feedback "+X pt". */
  feed?: HuntFeedEntry[];
  /** Indizio sull'area in cui cercare (bussola del borgo). */
  hint?: string | null;
  /** Ultima combo gastronomica attivata: feedback "Combo Tipica!". */
  comboEvent?: HuntComboEvent | null;
  /** Bonus combo accumulato nella sessione. */
  comboBonus?: number;
  onOpenStart: () => void;
  onReplay: () => void;
  onAbandon: () => void;
  onToggleMute: () => void;
  onOpenResult: () => void;
}

/** Formatta i millisecondi residui come MM:SS. */
function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const RING_RADIUS = 19;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** Clessidra circolare: aggiorna anello e cifre senza re-render per frame. */
const HuntTimer: React.FC<{ deadline: number; durationMs: number }> = ({ deadline, durationMs }) => {
  const ringRef = useRef<SVGCircleElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const lastSecondRef = useRef<number>(Math.ceil((deadline - performance.now()) / 1000));
  const [secondsLeft, setSecondsLeft] = useState<number>(lastSecondRef.current);

  useEffect(() => {
    let frameId = 0;

    const loop = () => {
      frameId = window.requestAnimationFrame(loop);
      const remaining = Math.max(0, deadline - performance.now());
      const ratio = Math.max(0, Math.min(1, remaining / durationMs));
      const urgent = remaining <= 5000;

      if (ringRef.current) {
        ringRef.current.style.strokeDashoffset = `${RING_CIRCUMFERENCE * (1 - ratio)}`;
        ringRef.current.style.stroke = urgent ? '#9b2c1f' : '#b8862f';
      }
      if (textRef.current) {
        textRef.current.textContent = formatClock(remaining);
      }

      const seconds = Math.ceil(remaining / 1000);
      if (seconds !== lastSecondRef.current) {
        lastSecondRef.current = seconds;
        setSecondsLeft(seconds);
        if (seconds > 0 && seconds <= 5) playHuntTick(seconds);
      }
    };

    loop();
    return () => window.cancelAnimationFrame(frameId);
  }, [deadline, durationMs]);

  const urgent = secondsLeft <= 5;

  return (
    <>
      <div className="relative flex items-center justify-center shrink-0" aria-label="Tempo rimanente">
        <svg viewBox="0 0 46 46" className="w-11 h-11 -rotate-90">
          <circle
            cx="23"
            cy="23"
            r={RING_RADIUS}
            fill="none"
            stroke="rgba(122,84,22,0.22)"
            strokeWidth="3.5"
          />
          <circle
            ref={ringRef}
            cx="23"
            cy="23"
            r={RING_RADIUS}
            fill="none"
            stroke="#b8862f"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            style={{ transition: 'stroke 260ms linear' }}
          />
        </svg>
        <svg viewBox="0 0 24 24" className="absolute w-4 h-4" aria-hidden>
          <path
            d="M5 3h14M5 21h14M7 3c0 4 4 5 5 8 1-3 5-4 5-8M7 21c0-4 4-5 5-8 1 3 5 4 5 8"
            fill="none"
            stroke="#7a5416"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="flex flex-col leading-none">
        <span
          ref={textRef}
          className={cn(
            'font-mono text-xl font-extrabold tabular-nums',
            urgent ? 'text-[#9b2c1f]' : 'text-[#3a2c1c]'
          )}
        >
          00:20
        </span>
        <span className="fantasy-label text-[9px] font-bold text-[#7a5416]/80">Clessidra</span>
      </div>

      {urgent && secondsLeft > 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-1/2 z-40 -translate-y-1/2 flex justify-center">
          <span
            key={secondsLeft}
            className="hunt-urgency fantasy-heading text-7xl font-black text-[#9b2c1f]/85 drop-shadow-[0_6px_18px_rgba(253,246,230,0.9)]"
          >
            {secondsLeft}
          </span>
        </div>
      )}
    </>
  );
};

/** Feedback temporaneo della figurina raccolta. */
const HuntFeed: React.FC<{ feed: HuntFeedEntry[] }> = ({ feed }) => {
  if (feed.length === 0) return null;

  return (
    <div className="pointer-events-none absolute top-[4.5rem] left-1/2 z-30 flex w-56 -translate-x-1/2 flex-col items-center gap-1.5">
      {feed.map(entry => (
        <div
          key={entry.key}
          className="hunt-feed fantasy-plaque flex w-full items-center gap-2 rounded-xl px-3 py-1.5 shadow-lg shadow-[#2b1c06]/25"
        >
          <span className="text-base leading-none" aria-hidden>
            {entry.emoji}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-bold capitalize text-[#3a2c1c]">
            {entry.label} trovato!
          </span>
          <span className="font-mono text-[12px] font-extrabold text-[#2f7d5c]">+{entry.points}</span>
        </div>
      ))}
    </div>
  );
};

const COMBO_SPARKS = [0, 45, 90, 135, 180, 225, 270, 315];

/** Feedback particellare della combo gastronomica. */
const HuntCombo: React.FC<{ event: HuntComboEvent | null }> = ({ event }) => {
  if (!event) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-[36%] z-40 flex justify-center">
      <div className="hunt-combo relative">
        <div className="fantasy-panel flex items-center gap-2 rounded-full px-4 py-2 shadow-xl shadow-[#2b1c06]/30">
          <Flame className="h-4 w-4 text-[#a9512f]" aria-hidden />
          <span className="fantasy-heading text-[15px] font-bold text-[#3a2c1c]">
            {event.label}
          </span>
          <span className="font-mono text-[13px] font-extrabold text-[#2f7d5c]">
            +{event.bonus} pt
          </span>
        </div>
        {COMBO_SPARKS.map(angle => (
          <span
            key={angle}
            className="hunt-spark"
            style={{ transform: `rotate(${angle}deg)` }}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
};

/** Indizio della bussola: dove cercare la prossima figurina. */
const HuntHint: React.FC<{ hint: string }> = ({ hint }) => (
  <div className="fantasy-panel pointer-events-none absolute top-[4.5rem] right-3 z-30 hidden max-w-[13rem] items-center gap-2 rounded-2xl px-3 py-2 sm:flex">
    <Compass className="h-4 w-4 shrink-0 text-[#a9512f]" aria-hidden />
    <div className="leading-tight">
      <div className="fantasy-label text-[9px] font-bold text-[#8a6a12]">Bussola del borgo</div>
      <div className="text-[11.5px] font-bold text-[#3a2c1c]">{hint}</div>
    </div>
  </div>
);

export const HuntHud: React.FC<HuntHudProps> = ({
  phase,
  score,
  foundCount,
  totalCount,
  deadline,
  durationMs = HUNT_DURATION_MS,
  result,
  record,
  muted,
  feed = [],
  hint = null,
  comboEvent = null,
  comboBonus = 0,
  onOpenStart,
  onReplay,
  onAbandon,
  onToggleMute,
  onOpenResult,
}) => {
  const progressRatio = Math.min(1, Math.max(0, foundCount / totalCount));
  const [isCollapsed, setIsCollapsed] = useState(phase !== 'active');

  useEffect(() => {
    setIsCollapsed(phase !== 'active');
  }, [phase]);

  if (isCollapsed) {
    const title = phase === 'completed' && result
      ? `${result.score} pt · ${result.tier.medalName}`
      : 'Caccia ai Tesori';
    const subtitle = phase === 'completed'
      ? `${result?.foundCount ?? foundCount}/${totalCount} figurine · apri il resoconto`
      : record.bestScore > 0
        ? `Record ${record.bestScore} pt · apri per giocare`
        : 'Apri per giocare';

    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        className="fantasy-panel pointer-events-auto flex max-w-[19rem] items-center gap-2 rounded-2xl px-2.5 py-2 text-left shadow-lg transition hover:brightness-[1.03]"
        aria-expanded="false"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#f4e0a4] to-[#cfa436]">
          {phase === 'completed' ? <Scroll className="h-4 w-4 text-[#4a3405]" /> : <VillageCrest size={20} />}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="fantasy-heading block truncate text-[12.5px] font-bold text-[#3a2c1c]">{title}</span>
          <span className="block truncate text-[9.5px] font-semibold text-[#6b5940]">{subtitle}</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#8a6a12]" />
      </button>
    );
  }

  return (
    <>
      <div className="fantasy-panel pointer-events-auto flex max-w-full flex-wrap items-center gap-3 rounded-2xl px-3 py-2 sm:px-4">
        {phase === 'idle' && (
          <>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#a9d5ee] to-[#5a8fb5] shadow-inner shadow-[#1d3c52]/40">
              <VillageCrest size={26} />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <span className="fantasy-heading text-[15px] font-bold text-[#3a2c1c]">
                  Caccia ai Tesori
                </span>
                <span className="fantasy-chip rounded-full px-1.5 py-0.5 text-[9px] font-bold text-[#7a5416]">
                  20/30s
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#6b5940]">
                9 figurine nascoste tra case e alberi
              </p>
              {record.bestScore > 0 && (
                <p className="mt-0.5 text-[10px] font-bold text-[#8a6a12]">
                  Miglior caccia: {record.bestScore} pt · {record.bestTier || 'in corso'}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onOpenStart}
              className="fantasy-cta ml-1 flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold"
            >
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Inizia la caccia</span>
              <span className="sm:hidden">Inizia</span>
            </button>
          </>
        )}

        {phase === 'active' && deadline !== null && (
          <>
            <HuntTimer deadline={deadline} durationMs={durationMs} />

            <div className="flex flex-col border-l border-[#b8862f]/30 pl-3 pr-1 leading-none">
              <span className="flex items-center gap-1 font-mono text-xl font-extrabold tabular-nums text-[#3a2c1c]">
                <Coins className="h-3.5 w-3.5 text-[#8a6a12]" aria-hidden />
                {score}
              </span>
              <span className="fantasy-label mt-0.5 text-[9px] font-bold text-[#7a5416]/80">
                Punti
              </span>
            </div>

            <div className="flex flex-col leading-none pr-1">
              <span className="flex items-center gap-1 font-mono text-xl font-extrabold tabular-nums text-[#3a2c1c]">
                <Gem className="h-3.5 w-3.5 text-[#2f7d5c]" aria-hidden />
                {foundCount}
                <span className="text-sm text-[#8b8172]">/{totalCount}</span>
              </span>
              <div className="fantasy-inset mt-1 h-1.5 w-14 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2f7d5c] to-[#cfa436] transition-all duration-300"
                  style={{ width: `${progressRatio * 100}%` }}
                />
              </div>
            </div>

            {comboBonus > 0 && (
              <div className="hidden items-center gap-1 rounded-full border border-[#2f7d5c]/40 bg-[#f2fbf5] px-2 py-1 sm:flex">
                <Flame className="h-3.5 w-3.5 text-[#a9512f]" aria-hidden />
                <span className="font-mono text-[11px] font-extrabold text-[#2f7d5c]">
                  +{comboBonus}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={onToggleMute}
              title={muted ? 'Riattiva i suoni' : 'Disattiva i suoni'}
              className="rounded-xl p-2 text-[#6b5940] transition hover:bg-[#b8862f]/15 hover:text-[#3a2c1c]"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onAbandon}
              title="Abbandona la caccia"
              className="flex items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold text-[#6b5940] transition hover:bg-[#b8862f]/15 hover:text-[#3a2c1c]"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Esci</span>
            </button>
          </>
        )}

        {phase === 'completed' && (
          <>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#f4e0a4] to-[#cfa436] shadow-inner shadow-[#6b4f08]/40">
              <Scroll className="h-5 w-5 text-[#4a3405]" aria-hidden />
            </div>
            <div className="leading-tight">
              <span className="fantasy-heading text-[15px] font-bold text-[#3a2c1c]">
                {result ? `${result.score} pt · ${result.tier.title}` : 'Caccia conclusa'}
              </span>
              <p className="text-[11px] font-medium text-[#6b5940]">
                {result
                  ? `${result.foundCount}/${result.totalCount} figurine ritrovate`
                  : 'Riepilogo della sessione'}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenResult}
              className="fantasy-cta fantasy-cta--quiet flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold"
            >
              <Eye className="w-3.5 h-3.5 text-[#5d94bb]" />
              <span>Resoconto</span>
            </button>
            <button
              type="button"
              onClick={onReplay}
              className="fantasy-cta fantasy-cta--sky flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rigioca</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="ml-auto rounded-xl p-1.5 text-[#8a6a12] transition hover:bg-[#b8862f]/15 hover:text-[#3a2c1c]"
          title="Riduci la scheda del giocatore"
          aria-label="Riduci la scheda del giocatore"
          aria-expanded="true"
        >
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>

      {phase === 'active' && (
        <>
          <HuntFeed feed={feed} />
          {hint && <HuntHint hint={hint} />}
        </>
      )}

      {phase !== 'idle' && <HuntCombo event={comboEvent} />}
    </>
  );
};
