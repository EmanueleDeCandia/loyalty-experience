import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Crown,
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
import { CornerFleuron, FlourishDivider, WaxSeal } from './fantasy/Ornaments';

interface TreasureResultModalProps {
  isOpen: boolean;
  result: HuntResult | null;
  items: HuntItem[];
  onReplay: () => void;
  onClose: () => void;
}

const CONFETTI_COLORS = ['#cfa436', '#7fb2d6', '#2f7d5c', '#a9512f', '#fdf6e6'];

/** Resoconto finale in stile pergamena: medaglia, premio e condivisione. */
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
        aria-label="Chiudi il resoconto"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#1b1206]/70 backdrop-blur-sm"
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

      <div className="fantasy-panel relative max-h-[93vh] w-full max-w-lg overflow-y-auto rounded-[26px] animate-in fade-in zoom-in-95 duration-200">
        <CornerFleuron className="pointer-events-none absolute left-1.5 top-1.5 text-[#b8862f]/70" />
        <CornerFleuron className="pointer-events-none absolute right-1.5 top-1.5 rotate-90 text-[#b8862f]/70" />
        <CornerFleuron className="pointer-events-none absolute bottom-1.5 right-1.5 rotate-180 text-[#b8862f]/70" />
        <CornerFleuron className="pointer-events-none absolute bottom-1.5 left-1.5 -rotate-90 text-[#b8862f]/70" />

        <div className="absolute right-3 top-3 z-10">
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="rounded-xl p-1.5 text-[#8a6a12] transition hover:bg-[#b8862f]/15 hover:text-[#3a2c1c]"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="px-5 pb-5 pt-6 text-center sm:px-7">
          <div className="fantasy-label flex items-center justify-center gap-2 text-[10px] font-bold text-[#8a6a12]">
            <Trophy className="h-3.5 w-3.5" aria-hidden />
            Resoconto della caccia
          </div>

          <div className="mt-3 flex justify-center">
            <MedalBadge tier={tier} size={146} className="hunt-medal-pop" />
          </div>

          <h2 className="fantasy-heading mt-2 text-2xl font-bold leading-tight text-[#3a2c1c]">
            {tier.title}
          </h2>

          <p className="fantasy-script mt-1 text-[13px] text-[#6b5940]">
            {tier.id === 'none'
              ? 'La clessidra è stata più veloce di te: servono almeno 20 punti per una medaglia.'
              : tier.givesFestivalPass
                ? 'Le tue tracce hanno svelato il premio più ambito del Dante Festival!'
                : 'Il borgo ricorda il tuo nome, esploratore.'}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="fantasy-plaque rounded-2xl px-2 py-2.5">
              <div className="font-mono text-xl font-extrabold tabular-nums text-[#3a2c1c]">{score}</div>
              <div className="fantasy-label text-[9px] font-bold text-[#8a6a12]">Punti</div>
            </div>
            <div className="fantasy-plaque rounded-2xl px-2 py-2.5">
              <div className="font-mono text-xl font-extrabold tabular-nums text-[#3a2c1c]">
                {foundCount}
                <span className="text-sm text-[#8b8172]">/{totalCount}</span>
              </div>
              <div className="fantasy-label text-[9px] font-bold text-[#8a6a12]">Figurine</div>
            </div>
            <div className="fantasy-plaque rounded-2xl px-2 py-2.5">
              <div className="font-mono text-xl font-extrabold tabular-nums text-[#3a2c1c]">
                {(Math.min(elapsedMs, 20000) / 1000).toFixed(1)}
                <span className="text-sm text-[#8b8172]">s</span>
              </div>
              <div className="fantasy-label text-[9px] font-bold text-[#8a6a12]">Tempo</div>
            </div>
          </div>

          {isNewRecord && (
            <div className="fantasy-ribbon mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Nuovo record personale!
            </div>
          )}
        </div>

        {/* Premio Dante Festival */}
        {celebrated && voucherCode && (
          <div className="mx-5 mb-4 sm:mx-7">
            <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-[#b8862f]/60 bg-[#fffdf6]/80 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-[#8ad0ad] to-[#2f7d5c] shadow-md shadow-[#1d5540]/40">
                  <Ticket className="h-5 w-5 text-[#f2fbf5]" aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="fantasy-label flex items-center gap-1 text-[9.5px] font-bold text-[#2f7d5c]">
                    <Crown className="h-3 w-3" aria-hidden />
                    Premio sbloccato
                  </div>
                  <div className="fantasy-heading text-[14px] font-bold leading-snug text-[#3a2c1c]">
                    Pass per 2 persone con biglietto pagato per il Dante Festival
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#b8862f]/35 bg-gradient-to-b from-[#fffdf6] to-[#f2e6c9] px-3 py-2.5">
                <WaxSeal lines={['Voucher', voucherCode]} className="h-[66px] w-[66px] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="fantasy-label text-[9px] font-bold text-[#8a6a12]">
                    Codice voucher / claim
                  </div>
                  <div className="truncate font-mono text-[15px] font-extrabold text-[#3a2c1c]">
                    {voucherCode}
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-[#6b5940]">
                    Mostralo alla biglietteria del Dante Festival per riscattare i due pass.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="fantasy-cta flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#2f7d5c]" aria-hidden />
                      Copiato
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                      Copia
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Figurine ritrovate */}
        <div className="mx-5 mb-4 sm:mx-7">
          <FlourishDivider label={`Figurine ritrovate ${foundCount}/${totalCount}`} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {foundItems.length === 0 && (
              <span className="fantasy-script text-[11.5px] text-[#6b5940]">
                Nessuna figurina ritrovata in questa caccia.
              </span>
            )}
            {foundItems.map(item => (
              <span
                key={item.id}
                className="fantasy-chip fantasy-chip--found inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-[#3a2c1c]"
              >
                <span aria-hidden>{item.emoji}</span>
                <span className="capitalize">{item.label}</span>
                <span className="font-mono text-[#2f7d5c]">+{item.points}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Messaggio pronto per WhatsApp */}
        <div className="mx-5 mb-4 rounded-2xl border border-[#5d94bb]/40 bg-gradient-to-b from-[#f2f9ff]/85 to-[#dcecf7]/70 px-3.5 py-3 sm:mx-7">
          <div className="fantasy-label flex items-center gap-1.5 text-[9.5px] font-bold text-[#35617f]">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            Messaggio pronto per la condivisione
          </div>
          <p className="mt-1.5 break-words text-[11.5px] leading-relaxed text-[#4a3a26]">
            {shareMessage}
          </p>
        </div>

        <div className="sticky bottom-0 flex flex-col gap-2 rounded-b-[26px] border-t border-[#b8862f]/35 bg-[#f7edd6]/92 px-5 py-4 backdrop-blur-md sm:px-7">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#128c47]/35 transition hover:brightness-105 active:scale-[0.99]"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Condividi su WhatsApp
          </a>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onReplay}
              className="fantasy-cta fantasy-cta--sky flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Rigioca
            </button>
            <button
              type="button"
              onClick={onClose}
              className="fantasy-cta fantasy-cta--quiet flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold"
            >
              Torna al borgo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
