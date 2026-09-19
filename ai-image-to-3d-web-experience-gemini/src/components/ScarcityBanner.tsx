import React from 'react';
import { Flame, Ticket } from 'lucide-react';
import { buildScarcityMessage } from '../game/treasureCatalog';

interface ScarcityBannerProps {
  remaining: number;
  /** Apre la scheda dell'esploratore: da lì si parte con la caccia. */
  onOpenSheet: () => void;
}

/**
 * Banner dinamico di scarsità (FOMO): ricorda quanti pass Dante Festival
 * restano per la giornata e porta al flusso di gioco/riscatto.
 */
export const ScarcityBanner: React.FC<ScarcityBannerProps> = ({ remaining, onOpenSheet }) => {
  const exhausted = remaining <= 0;

  return (
    <button
      type="button"
      onClick={onOpenSheet}
      className={`fantasy-panel pointer-events-auto flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3 text-left shadow-lg shadow-[#2b1c06]/25 transition hover:brightness-[1.03] ${
        exhausted ? 'opacity-80' : ''
      }`}
      title="Pass Dante Festival in palio oggi"
    >
      <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#f4e0a4] to-[#cfa436]">
        <Ticket className="h-3.5 w-3.5 text-[#4a3405]" aria-hidden />
        {!exhausted && (
          <span className="absolute inset-0 animate-ping rounded-full border border-[#cfa436]/70" />
        )}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[11px] font-extrabold leading-tight text-[#3a2c1c]">
          <Flame className="h-3 w-3 text-[#a9512f]" aria-hidden />
          {buildScarcityMessage(remaining)}
        </span>
        <span className="block text-[9.5px] font-semibold leading-tight text-[#6b5940]">
          {exhausted ? 'I nuovi bonus ripartono domani' : 'Vinci con Platino e Diamante · ne restano pochi'}
        </span>
      </span>
    </button>
  );
};
