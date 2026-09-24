import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Download,
  Flame,
  MessageCircle,
  RotateCcw,
  Share2,
  ShoppingBag,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { buildShareMessage, buildWhatsAppShareUrl } from '../game/treasureCatalog';
import { HuntItem, HuntResult } from '../game/useTreasureHunt';
import { LeadClaim, trackEvent } from '../game/api';
import { ShareCardData, renderShareCard } from '../game/shareCard';
import { LeadCapture } from './LeadCapture';
import { MedalBadge } from './MedalBadge';
import { VoucherTicket } from './VoucherTicket';
import { CornerFleuron, FlourishDivider, WaxSeal } from './fantasy/Ornaments';

interface TreasureResultModalProps {
  isOpen: boolean;
  result: HuntResult | null;
  items: HuntItem[];
  onReplay: () => void;
  onClose: () => void;
  onClaim: (lead: LeadClaim) => Promise<void>;
}

const CONFETTI_COLORS = ['#cfa436', '#7fb2d6', '#2f7d5c', '#a9512f', '#fdf6e6'];

/** Resoconto finale: medaglia, premio Dante Festival, voucher con QR e viral loop. */
export const TreasureResultModal: React.FC<TreasureResultModalProps> = ({
  isOpen,
  result,
  items,
  onReplay,
  onClose,
  onClaim,
}) => {
  const [copied, setCopied] = useState(false);
  const [shareCardUrl, setShareCardUrl] = useState<string | null>(null);
  const [isBuildingCard, setIsBuildingCard] = useState(false);
  const [cardError, setCardError] = useState(false);

  const shareMessage = useMemo(
    () => (result ? buildShareMessage(result.tier, result.score, buildReferralLinkSafe(result.referralId)) : ''),
    [result]
  );
  const shareUrl = useMemo(
    () => (shareMessage ? buildWhatsAppShareUrl(shareMessage) : '#'),
    [shareMessage]
  );

  const confetti = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        left: `${(index * 5.6 + (index % 3) * 3) % 100}%`,
        delay: `${(index % 7) * 0.16}s`,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        size: 6 + (index % 4) * 2,
      })),
    []
  );

  // La card condivisibile viene rigenerata a ogni nuovo risultato.
  useEffect(() => {
    setShareCardUrl(null);
    setCardError(false);
    setIsBuildingCard(false);
  }, [result?.vouchers?.[0]?.code, result?.score]);

  if (!isOpen || !result) return null;

  const { tier, score, baseScore, comboBonus, comboCount, foundCount, totalCount, vouchers } = result;
  const celebratory = tier.givesFestivalPass;
  const foundItems = items.filter(item => item.revealed);
  const aperitivo = vouchers.find(voucher => voucher.kind === 'aperitivo');
  const passVoucher = vouchers.find(voucher => voucher.kind !== 'aperitivo');

  const buildCard = async () => {
    if (!aperitivo) return;
    setIsBuildingCard(true);
    const data: ShareCardData = {
      tier,
      score,
      userTitle: tier.userTitle,
      foundCount,
      totalCount,
      comboCount,
      voucherLabel: aperitivo.label,
      voucherRule: aperitivo.rule,
      referralLink: buildReferralLinkSafe(result.referralId),
      qrPayload: aperitivo.qrPayload,
      referralId: result.referralId,
    };
    const url = await renderShareCard(data);
    setIsBuildingCard(false);
    if (url) setShareCardUrl(url);
    else setCardError(true);
  };

  const shareCardFile = async () => {
    if (!shareCardUrl) return;
    try {
      const blob = await (await fetch(shareCardUrl)).blob();
      const file = new File([blob], 'caccia-ai-tesori-dante-festival.png', { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          text: shareMessage,
          title: 'Caccia ai Tesori del Borgo',
        });
        return;
      }
    } catch {
      /* fallback: download */
    }
    const link = document.createElement('a');
    link.href = shareCardUrl;
    link.download = 'caccia-ai-tesori-dante-festival.png';
    link.click();
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
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

      <div className="fantasy-panel relative max-h-[93vh] w-full max-w-xl overflow-y-auto rounded-[26px] animate-in fade-in zoom-in-95 duration-200">
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
            <MedalBadge tier={tier} size={140} className="hunt-medal-pop" />
          </div>

          <h2 className="fantasy-heading mt-2 text-2xl font-bold leading-tight text-[#3a2c1c]">
            {tier.title}
          </h2>
          <p className="fantasy-script mt-1 text-[13px] text-[#6b5940]">
            {celebratory
              ? tier.isVip
                ? 'Pass VIP con accesso al backstage: il borgo ti ha incoronato.'
                : 'Hai vinto i biglietti per il Dante Festival!'
              : 'Zero-Loss: il tuo voucher Aperitivo Cena è già tuo, qualsiasi punteggio tu abbia fatto.'}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="fantasy-plaque rounded-2xl px-2 py-2.5">
              <div className="font-mono text-xl font-extrabold tabular-nums text-[#3a2c1c]">{score}</div>
              <div className="fantasy-label text-[9px] font-bold text-[#8a6a12]">Punti totali</div>
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
                {comboCount > 0 ? `+${comboBonus}` : '—'}
              </div>
              <div className="fantasy-label text-[9px] font-bold text-[#8a6a12]">
                Combo ({comboCount})
              </div>
            </div>
          </div>

          {(comboCount > 0 || result.isNewRecord) && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {comboCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2f7d5c]/40 bg-[#f2fbf5] px-3 py-1 text-[11px] font-bold text-[#2f7d5c]">
                  <Flame className="h-3.5 w-3.5 text-[#a9512f]" aria-hidden />
                  {comboCount} combo gastronomiche · {baseScore + comboBonus} pt con bonus
                </span>
              )}
              {result.isNewRecord && (
                <span className="fantasy-ribbon inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  Nuovo record personale!
                </span>
              )}
            </div>
          )}
        </div>

        {!result.claimed && (
          <LeadCapture
            sessionId={result.sessionId}
            variant={result.variant}
            isPassWinner={celebratory}
            onClaim={onClaim}
          />
        )}

        {/* Premio principale: pass Dante Festival */}
        {celebratory && passVoucher && (
          <div className="mx-5 mb-4 sm:mx-7">
            <FlourishDivider label="Premio Dante Festival" />
            <div className="mt-3 flex items-start gap-3 rounded-3xl border-2 border-dashed border-[#2f7d5c]/60 bg-gradient-to-br from-[#f2fbf5]/95 to-[#dcefe2]/80 px-4 py-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-[#8ad0ad] to-[#2f7d5c] shadow-md shadow-[#1d5540]/40">
                <Crown className="h-5 w-5 text-[#f2fbf5]" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="fantasy-label text-[9.5px] font-bold text-[#2f7d5c]">
                  {tier.isVip ? 'Pass VIP + Backstage' : 'Pass Standard'}
                </div>
                <div className="fantasy-heading text-[14.5px] font-bold leading-snug text-[#3a2c1c]">
                  Pass per 2 persone con biglietto pagato per il Dante Festival
                  {tier.isVip ? ' con accesso VIP e backstage' : ''}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-[13px] font-extrabold text-[#3a2c1c]">
                    {passVoucher.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyCode(passVoucher.code)}
                    className="fantasy-cta fantasy-cta--quiet flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-extrabold"
                  >
                    {copied ? <Check className="h-3 w-3 text-[#2f7d5c]" /> : <Copy className="h-3 w-3" />}
                    Copia
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Voucher Aperitivo Cena: sempre assegnato */}
        {aperitivo && (
          <div className="mx-5 mb-4 sm:mx-7">
            <FlourishDivider label="Voucher per tutti i giocatori" />
            <div className="mt-3">
              <VoucherTicket issue={aperitivo} tierLabel={tier.id === 'none' ? 'Zero-Loss' : tier.medalName} highlight={celebratory} />
            </div>
            <p className="mt-2 text-[11px] text-[#6b5940]">
              Il voucher è valido <strong>presentandosi in 2 persone</strong>: mostra il QR code al
              locale oppure riscattalo sullo store con il codice auto-applicato al carrello.
            </p>
          </div>
        )}

        {/* Voucher pass/vip riscattabile sullo store */}
        {celebratory && passVoucher && (
          <div className="mx-5 mb-4 sm:mx-7">
            <details className="group">
              <summary className="fantasy-label cursor-pointer list-none text-[10px] font-bold text-[#8a6a12]">
                Mostra il QR del pass Dante Festival
              </summary>
              <div className="mt-2">
                <VoucherTicket issue={passVoucher} tierLabel={tier.medalName} highlight />
              </div>
            </details>
          </div>
        )}

        {/* Figurine ritrovate */}
        <div className="mx-5 mb-4 sm:mx-7">
          <FlourishDivider label={`Figurine ritrovate ${foundCount}/${totalCount}`} />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {foundItems.length === 0 && (
              <span className="fantasy-script text-[11.5px] text-[#6b5940]">
                Nessuna figurina ritrovata in questa caccia: riprova, il borgo nasconde bene i suoi tesori.
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

        {/* Share card generata lato client, disponibile solo dopo il lead gate. */}
        {result.claimed && <div className="mx-5 mb-4 sm:mx-7">
          <FlourishDivider label="Card condivisibile" />
          {shareCardUrl ? (
            <div className="mt-3 space-y-2">
              <img
                src={shareCardUrl}
                alt="Card condivisibile con medaglia, punteggio e QR del voucher"
                className="w-full rounded-2xl border border-[#b8862f]/45 shadow-lg shadow-[#2b1c06]/25"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={shareCardFile}
                  className="fantasy-cta flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[12.5px] font-extrabold"
                >
                  <Share2 className="h-4 w-4" aria-hidden />
                  Condividi / Scarica la card
                </button>
                <a
                  href={shareCardUrl}
                  download="caccia-ai-tesori-dante-festival.png"
                  className="fantasy-cta fantasy-cta--quiet flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[12.5px] font-extrabold"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  PNG
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#b8862f]/35 bg-[#fffdf6]/80 px-3 py-3">
              <WaxSeal lines={['Referral', result.referralId]} className="h-[62px] w-[62px] shrink-0" tone="emerald" />
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] font-bold text-[#3a2c1c]">
                  Crea la card con medaglia, punteggio e QR
                </div>
                <p className="text-[10.5px] text-[#6b5940]">
                  Il tuo codice invito: <strong className="font-mono">{result.referralId}</strong>
                </p>
                {cardError && (
                  <p className="text-[10.5px] font-semibold text-[#a9512f]">
                    Card non disponibile su questo dispositivo: usa la condivisione testuale.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={buildCard}
                disabled={isBuildingCard}
                className="fantasy-cta fantasy-cta--sky flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11.5px] font-extrabold disabled:opacity-70"
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden />
                {isBuildingCard ? 'Creo…' : 'Crea card'}
              </button>
            </div>
          )}
        </div>}

        {/* Anteprima messaggio WhatsApp */}
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
          {result.claimed && (
            <a
              href={result.redeemUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('store_clicked', { sessionId: result.sessionId, variant: result.variant })}
              className="fantasy-cta flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden />
              Riscatta sullo Store Ufficiale
            </a>
          )}

          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('share_clicked', { sessionId: result.sessionId, variant: result.variant, properties: { channel: 'whatsapp' } })}
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

/** Link di invito: costruito sull'URL corrente, con fallback per ambienti headless. */
function buildReferralLinkSafe(referralId: string): string {
  if (typeof window === 'undefined' || !window.location) {
    return `https://loyalty-experience.app/?caccia=1&ref=${referralId}`;
  }
  try {
    const url = new URL(window.location.href);
    url.search = `?caccia=1&ref=${encodeURIComponent(referralId)}`;
    url.hash = '';
    return url.toString();
  } catch {
    return `https://loyalty-experience.app/?caccia=1&ref=${referralId}`;
  }
}
