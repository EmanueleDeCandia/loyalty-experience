import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  MessageCircle,
  RotateCcw,
  Sparkles,
  Ticket,
  Trophy,
  X,
} from 'lucide-react';
import { buildShareMessage, buildWhatsAppShareUrl } from '../game/treasureCatalog';
import { HuntItem, HuntResult } from '../game/useTreasureHunt';
import { MedalBadge } from './MedalBadge';

interface TreasureResultModalProps {
  isOpen: boolean;
  result: HuntResult | null;
  items: HuntItem[];
  onReplay: () => void;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#fbbf24', '#38bdf8', '#34d399', '#f472b6', '#ffffff'];

/** Schermata finale: medaglia, punteggio, voucher e condivisione WhatsApp. */
export const TreasureResultModal: React.FC<TreasureResultModalProps> = ({
  isOpen,
  result,
  items,
  onReplay,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const shareMessage = useMemo(
    () => (result ? buildShareMessage(result.tier, result.score) : ''),
    [result]
  );
  const shareUrl = useMemo(
    () => (shareMessage ? buildWhatsAppShareUrl(shareMessage) : '#'),
    [shareMessage]
  );
  const confetti = useMemo(
    () =>
      Array.from({ length: 16 }, (_, index) => ({
        left: `${(index * 6.4 + (index % 3) * 3) % 100}%`,
        delay: `${(index % 7) * 0.16}s`,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        size: 6 + (index % 4) * 2,
      })),
    []
  );

  if (!isOpen || !result) return null;

  const { tier, score, foundCount, totalCount, voucherCode, isNewRecord, elapsedMs } = result;
  const celebrated = tier.givesFestivalPass;
  const foundItems = items.filter(item => item.revealed);

  const handleCopy = async () => {
    if (!voucherCode) return;
    try {
      await navigator.clipboard.writeText(voucherCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm cursor-default"
      />

      {celebrated && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {confetti.map((piece, index) => (
            <span
              key={index}
              className="hunt-confetti"
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                backgroundColor: piece.color,
                width: piece.size,
                height: piece.size * 1.6,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-stone-300/80 bg-gradient-to-b from-sky-50 via-white to-stone-100 shadow-2xl shadow-slate-950/50 animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute right-3 top-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-stone-200/80 transition"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="px-5 pt-6 pb-5 text-center">
          <div className="flex items-center justify-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-slate-400 font-bold">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Caccia conclusa
          </div>

          <div className="mt-3 flex justify-center">
            <MedalBadge tier={tier} size={148} className="hunt-medal-pop" />
          </div>

          <h2 className="mt-2 text-2xl font-extrabold text-slate-900 leading-tight">{tier.title}</h2>

          <p className="mt-1 text-sm text-slate-500 font-medium">
            {tier.id === 'none'
              ? 'Nessun premio questa volta: ti servono almeno 20 pt per la medaglia.'
              : tier.givesFestivalPass
                ? 'Hai sbloccato il pass per il Dante Festival!'
                : 'Ottimo lavoro esploratore del borgo sospeso!'}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl border border-stone-200 bg-white/80 px-2 py-2.5">
              <div className="font-mono text-xl font-extrabold text-slate-900 tabular-nums">{score}</div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Punti
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white/80 px-2 py-2.5">
              <div className="font-mono text-xl font-extrabold text-slate-900 tabular-nums">
                {foundCount}
                <span className="text-sm text-slate-400">/{totalCount}</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Figurine
              </div>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-white/80 px-2 py-2.5">
              <div className="font-mono text-xl font-extrabold text-slate-900 tabular-nums">
                {(Math.min(elapsedMs, 20000) / 1000).toFixed(1)}
                <span className="text-sm text-slate-400">s</span>
              </div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                Tempo
              </div>
            </div>
          </div>

          {isNewRecord && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
              <Sparkles className="w-3.5 h-3.5" />
              Nuovo record personale!
            </div>
          )}
        </div>

        {/* Premio speciale */}
        {celebrated && voucherCode && (
          <div className="mx-5 mb-4 rounded-3xl border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 via-white to-amber-50 px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30">
                <Ticket className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-[0.16em] font-bold text-emerald-700">
                  Premio sbloccato
                </div>
                <div className="text-sm font-extrabold text-slate-900 leading-snug">
                  Pass per 2 persone con biglietto pagato per il Dante Festival
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-stone-200 bg-white/90 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  Codice voucher / claim
                </div>
                <div className="font-mono text-sm font-extrabold text-slate-900 truncate">
                  {voucherCode}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-stone-100 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copiato
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copia
                  </>
                )}
              </button>
            </div>

            <p className="mt-2 text-[11px] text-slate-500 italic">
              Conserva il codice: mostralo alla biglietteria del Dante Festival per riscattare i
              due pass.
            </p>
          </div>
        )}

        {/* Dettaglio figurine */}
        <div className="mx-5 mb-4">
          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-2">
            Figurine raccolte ({foundCount}/{totalCount})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {foundItems.length === 0 && (
              <span className="text-[11px] text-slate-500 italic">
                Nessuna figurina aperta in questa sessione.
              </span>
            )}
            {foundItems.map(item => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/85 px-2.5 py-1 text-[11px] font-bold text-slate-700"
              >
                <span aria-hidden>{item.emoji}</span>
                <span className="capitalize">{item.label}</span>
                <span className="font-mono text-emerald-600">+{item.points}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Anteprima messaggio condiviso */}
        <div className="mx-5 mb-4 rounded-2xl border border-sky-200 bg-sky-50/80 px-3.5 py-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-sky-700">
            <MessageCircle className="w-3.5 h-3.5" />
            Messaggio pronto per la condivisione
          </div>
          <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed break-words">
            {shareMessage}
          </p>
        </div>

        <div className="sticky bottom-0 flex flex-col gap-2 border-t border-stone-200/80 bg-white/90 px-5 py-4 backdrop-blur-md rounded-b-3xl">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/30 hover:brightness-105 active:scale-[0.99] transition"
          >
            <MessageCircle className="w-4 h-4" />
            Condividi su WhatsApp
          </a>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onReplay}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-sky-500 to-sky-700 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-sky-600/30 hover:brightness-105 active:scale-[0.99] transition"
            >
              <RotateCcw className="w-4 h-4" />
              Rigioca
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-stone-100 transition"
            >
              Torna al borgo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
