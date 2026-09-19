import React, { useEffect, useRef, useState } from 'react';
import { Award, Play, RotateCcw, Trophy, Volume2, VolumeX, X, Eye } from 'lucide-react';
import { HUNT_DURATION_MS } from '../game/treasureCatalog';
import { HuntPhase, HuntResult, StoredProgress } from '../game/useTreasureHunt';
import { playHuntTick } from '../game/huntAudio';
import { cn } from '../utils/cn';

interface HuntHudProps {
  phase: HuntPhase;
  score: number;
  foundCount: number;
  totalCount: number;
  deadline: number | null;
  result: HuntResult | null;
  record: StoredProgress;
  muted: boolean;
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

const RING_RADIUS = 20;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface HuntTimerProps {
  deadline: number;
  durationMs: number;
}

/** Timer circolare fluido: aggiorna anello e cifre senza re-render per frame. */
const HuntTimer: React.FC<HuntTimerProps> = ({ deadline, durationMs }) => {
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
        ringRef.current.style.stroke = urgent ? '#f43f5e' : '#0284c7';
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
      <div className="relative flex items-center justify-center" aria-label="Tempo rimanente">
        <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
          <circle cx="24" cy="24" r={RING_RADIUS} fill="none" stroke="rgba(148,163,184,0.35)" strokeWidth="4" />
          <circle
            ref={ringRef}
            cx="24"
            cy="24"
            r={RING_RADIUS}
            fill="none"
            stroke="#0284c7"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            style={{ transition: 'stroke 240ms linear' }}
          />
        </svg>
        <span className="absolute text-[11px] font-mono font-bold text-slate-500">⏱</span>
      </div>

      <div className="flex flex-col leading-none">
        <span
          ref={textRef}
          className={cn(
            'font-mono text-xl font-extrabold tabular-nums transition-colors',
            urgent ? 'text-rose-500' : 'text-slate-800'
          )}
        >
          00:20
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Countdown
        </span>
      </div>

      {urgent && secondsLeft > 0 && (
        <div className="pointer-events-none fixed inset-x-0 top-1/2 -translate-y-1/2 z-40 flex justify-center">
          <span
            key={secondsLeft}
            className="hunt-urgency text-6xl sm:text-7xl font-black text-rose-500/85 drop-shadow-[0_4px_16px_rgba(255,255,255,0.85)]"
          >
            {secondsLeft}
          </span>
        </div>
      )}
    </>
  );
};

export const HuntHud: React.FC<HuntHudProps> = ({
  phase,
  score,
  foundCount,
  totalCount,
  deadline,
  result,
  record,
  muted,
  onOpenStart,
  onReplay,
  onAbandon,
  onToggleMute,
  onOpenResult,
}) => {
  const progressRatio = Math.min(1, Math.max(0, foundCount / totalCount));

  return (
    <div className="pointer-events-auto flex items-center gap-3 bg-white/85 backdrop-blur-md border border-stone-300/80 rounded-2xl px-3.5 py-2 shadow-xl shadow-slate-900/10 text-slate-800">
      {phase === 'idle' && (
        <>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/30">
            <Trophy className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold tracking-tight text-slate-900">
                Caccia ai Tesori
              </span>
              <span className="text-[10px] font-mono uppercase bg-sky-100 text-sky-700 border border-sky-300/70 px-1.5 py-0.5 rounded-full">
                20s
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              9 figurine nascoste nel borgo sospeso
            </p>
            {record.bestScore > 0 && (
              <p className="text-[10px] font-semibold text-amber-600 mt-0.5">
                Record: {record.bestScore} pt · {record.bestTier || 'in corso'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenStart}
            className="ml-1 flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-amber-400 to-orange-500 px-3 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/30 hover:brightness-105 active:scale-[0.98] transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Inizia la caccia</span>
          </button>
        </>
      )}

      {phase === 'active' && deadline !== null && (
        <>
          <HuntTimer deadline={deadline} durationMs={HUNT_DURATION_MS} />

          <div className="flex flex-col leading-none pl-1 pr-2 border-l border-stone-300/80">
            <span className="font-mono text-xl font-extrabold text-slate-900 tabular-nums">
              {score}
              <span className="text-xs font-bold text-slate-400 ml-0.5">pt</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Punteggio
            </span>
          </div>

          <div className="flex flex-col leading-none pr-2">
            <span className="font-mono text-xl font-extrabold text-slate-900 tabular-nums">
              {foundCount}
              <span className="text-xs font-bold text-slate-400">/{totalCount}</span>
            </span>
            <div className="mt-1 h-1.5 w-16 rounded-full bg-stone-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressRatio * 100}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            title={muted ? 'Riattiva i suoni' : 'Disattiva i suoni'}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-stone-200/70 transition"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onAbandon}
            title="Abbandona la caccia"
            className="flex items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-bold text-slate-500 hover:text-slate-900 hover:bg-stone-200/70 transition"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </>
      )}

      {phase === 'completed' && (
        <>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-300 via-emerald-400 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
            <Award className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="leading-tight">
            <span className="text-sm font-extrabold text-slate-900">
              {result ? `${result.score} pt · ${result.tier.title}` : 'Caccia conclusa'}
            </span>
            <p className="text-[11px] text-slate-500 font-medium">
              {result
                ? `${result.foundCount}/${result.totalCount} figurine trovate`
                : 'Riepilogo della sessione'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenResult}
            className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-stone-100 transition"
          >
            <Eye className="w-3.5 h-3.5 text-sky-600" />
            <span>Risultato</span>
          </button>
          <button
            type="button"
            onClick={onReplay}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-sky-500 to-sky-700 px-3 py-2 text-xs font-bold text-white shadow-md shadow-sky-600/30 hover:brightness-105 active:scale-[0.98] transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Rigioca</span>
          </button>
        </>
      )}
    </div>
  );
};
