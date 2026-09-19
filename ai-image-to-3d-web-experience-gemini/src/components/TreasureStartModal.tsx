import React from 'react';
import { Clock, Coins, Medal, Sparkles, Trophy, X, Play, Compass, Ticket } from 'lucide-react';
import { HUNT_DURATION_MS, NO_TIER, TIERS } from '../game/treasureCatalog';
import { HuntItem, StoredProgress } from '../game/useTreasureHunt';
import { MedalBadge } from './MedalBadge';

interface TreasureStartModalProps {
  isOpen: boolean;
  items: HuntItem[];
  record: StoredProgress;
  onStart: () => void;
  onClose: () => void;
}

/** Modale di avvio della caccia: regole, figurine e scala premi. */
export const TreasureStartModal: React.FC<TreasureStartModalProps> = ({
  isOpen,
  items,
  record,
  onStart,
  onClose,
}) => {
  if (!isOpen) return null;

  const thresholdRows = [NO_TIER, ...TIERS.slice(1)];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-default"
      />

      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-stone-300/80 bg-gradient-to-b from-sky-50 via-white to-stone-100 shadow-2xl shadow-slate-950/50 animate-in fade-in zoom-in-95 duration-200">
        {/* Intestazione */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-stone-200/80 bg-white/85 px-5 py-4 backdrop-blur-md rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Trophy className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-amber-600 font-bold">
                Mini-game del borgo sospeso
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight">
                Caccia ai Tesori del Borgo
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-stone-200/80 transition"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            Nove figurine sono apparse tra le case del borgo sospeso. Tocca ogni figurina{' '}
            <strong className="text-slate-800">una sola volta</strong> per scoprire il suo valore:
            hai <strong className="text-slate-800">20 secondi</strong> per accumulare più punti
            possibile e conquistare la medaglia.
          </p>

          {/* Parametri di gioco */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 px-3 py-2.5">
              <Clock className="w-4 h-4 text-sky-600 mb-1" />
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Durata
              </div>
              <div className="text-xs font-extrabold text-slate-800">
                {HUNT_DURATION_MS / 1000} secondi
              </div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2.5">
              <Coins className="w-4 h-4 text-amber-600 mb-1" />
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Punti a figurina
              </div>
              <div className="text-xs font-extrabold text-slate-800">5 – 10 pt casuali</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-2.5">
              <Ticket className="w-4 h-4 text-emerald-600 mb-1" />
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Premio top
              </div>
              <div className="text-xs font-extrabold text-slate-800">Pass x2 Dante Festival</div>
            </div>
          </div>

          {/* Figurine da trovare */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Le 9 figurine
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white/80 px-2.5 py-2 shadow-sm"
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {item.emoji}
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 truncate">{item.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-slate-500 italic">
              Le figurine fluttuano sopra il borgo: ruota la visuale per trovarle tutte. Quelle
              coperte da case o terreno si mostrano offuscate finché non le inquadri.
            </p>
          </div>

          {/* Scala premi */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Medal className="w-3.5 h-3.5 text-amber-500" />
              Scala premi
            </h3>
            <div className="space-y-2">
              {thresholdRows.map(tier => (
                <div
                  key={tier.id}
                  className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white/75 px-3 py-2"
                >
                  <MedalBadge tier={tier} size={38} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-extrabold text-slate-800">{tier.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {tier.max === null
                        ? `${tier.min} pt o più`
                        : tier.id === 'none'
                          ? `meno di ${tier.max + 1} pt`
                          : `${tier.min} – ${tier.max} pt`}
                      {tier.prize ? ` · ${tier.prize}` : ''}
                    </div>
                  </div>
                  {tier.givesFestivalPass && (
                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden />
                  )}
                </div>
              ))}
            </div>
          </div>

          {(record.bestScore > 0 || record.vouchers.length > 0) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                I tuoi progressi
              </div>
              {record.bestScore > 0 && (
                <p className="text-xs text-slate-700 mt-1">
                  Record personale: <strong>{record.bestScore} pt</strong>
                  {record.bestTier ? ` · ${record.bestTier}` : ''}
                </p>
              )}
              {record.vouchers.length > 0 && (
                <p className="text-xs text-slate-700 mt-1">
                  Pass Dante Festival vinti:{' '}
                  <span className="font-mono font-bold">{record.vouchers.map(v => v.code).join(', ')}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Azioni */}
        <div className="sticky bottom-0 flex flex-col sm:flex-row gap-2 border-t border-stone-200/80 bg-white/90 px-5 py-4 backdrop-blur-md rounded-b-3xl">
          <button
            type="button"
            onClick={onStart}
            className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-400 to-orange-500 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-orange-500/30 hover:brightness-105 active:scale-[0.99] transition"
          >
            <Play className="w-4 h-4" />
            Inizia la caccia
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-stone-100 transition"
          >
            <Compass className="w-4 h-4 text-sky-600" />
            Esplora il borgo
          </button>
        </div>
      </div>
    </div>
  );
};
