import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Flame, Ticket } from 'lucide-react';
import { buildScarcityMessage } from '../game/treasureCatalog';

interface ScarcityBannerProps { remaining: number; festivalStartAt?: string | null; onOpenSheet: () => void; }

function countdown(target: string | null | undefined, now: number) {
  if (!target) return null;
  const delta = new Date(target).getTime() - now;
  if (!Number.isFinite(delta) || delta <= 0) return 'Il Festival è iniziato';
  const days = Math.floor(delta / 86_400_000);
  const hours = Math.floor((delta % 86_400_000) / 3_600_000);
  const minutes = Math.floor((delta % 3_600_000) / 60_000);
  return days > 0 ? `Mancano ${days}g ${hours}h` : `Mancano ${hours}h ${minutes}m`;
}

/** Inventario e countdown provengono dall'API, non dal localStorage. */
export const ScarcityBanner: React.FC<ScarcityBannerProps> = ({ remaining, festivalStartAt, onOpenSheet }) => {
  const loading = remaining < 0;
  const exhausted = remaining === 0;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);
  const eventCountdown = useMemo(() => countdown(festivalStartAt, now), [festivalStartAt, now]);
  return (
    <button type="button" onClick={onOpenSheet} className={`fantasy-panel pointer-events-auto flex items-center gap-2 rounded-2xl py-2 pl-2 pr-3 text-left shadow-lg shadow-[#2b1c06]/25 transition hover:brightness-[1.03] ${exhausted ? 'opacity-80' : ''}`} title="Pass Dante Festival in palio oggi">
      <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-[#f4e0a4] to-[#cfa436]">
        <Ticket className="h-4 w-4 text-[#4a3405]" aria-hidden />
        {!exhausted && <span className="absolute inset-0 animate-ping rounded-xl border border-[#cfa436]/70" />}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[11px] font-extrabold leading-tight text-[#3a2c1c]"><Flame className="h-3 w-3 text-[#a9512f]" />{loading ? 'Verifico i pass disponibili…' : buildScarcityMessage(remaining)}</span>
        <span className="mt-0.5 flex items-center gap-1 text-[9.5px] font-semibold leading-tight text-[#6b5940]">
          {eventCountdown ? <><CalendarClock className="h-3 w-3 text-[#2f7d5c]" />{eventCountdown}</> : exhausted ? 'I nuovi bonus ripartono domani' : 'Data Festival in arrivo · vinci con Platino e Diamante'}
        </span>
      </span>
    </button>
  );
};
