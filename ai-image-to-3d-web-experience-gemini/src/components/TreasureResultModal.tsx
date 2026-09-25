import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Download,
  Flame,
  MessageCircle,
  RotateCcw,
  Share2,
  Smartphone,
  Sparkles,
  Square,
  Trophy,
  Upload,
  X,
  Coins,
} from 'lucide-react';
import { buildShareMessage, buildWhatsAppShareUrl } from '../game/treasureCatalog';
import { HuntItem, HuntResult } from '../game/useTreasureHunt';
import { LeadClaim, trackEvent } from '../game/api';
import {
  AVAILABLE_SPONSORS,
  ShareCardData,
  SocialFormat,
  SponsorOption,
  renderShareCard,
} from '../game/shareCard';
import { LeadCapture } from './LeadCapture';
import { MedalBadge } from './MedalBadge';
import { QrCodeImage, VoucherTicket } from './VoucherTicket';
import { CornerFleuron, FlourishDivider } from './fantasy/Ornaments';

interface TreasureResultModalProps {
  isOpen: boolean;
  result: HuntResult | null;
  items: HuntItem[];
  onReplay: () => void;
  onClose: () => void;
  onClaim: (lead: LeadClaim) => Promise<void>;
  onOpenLoyalty?: () => void;
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
  onOpenLoyalty,
}) => {
  const [copied, setCopied] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<SocialFormat>('story');
  const [selectedSponsorId, setSelectedSponsorId] = useState<string>(AVAILABLE_SPONSORS[0].id);
  const [customSponsor, setCustomSponsor] = useState<SponsorOption | null>(null);
  const [shareCardUrl, setShareCardUrl] = useState<string | null>(null);
  const [isBuildingCard, setIsBuildingCard] = useState(false);
  const [cardError, setCardError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSponsor = useMemo(() => {
    if (selectedSponsorId === 'custom' && customSponsor) {
      return customSponsor;
    }
    return AVAILABLE_SPONSORS.find(s => s.id === selectedSponsorId) || AVAILABLE_SPONSORS[0];
  }, [selectedSponsorId, customSponsor]);

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

  const buildCard = async (formatOverride?: SocialFormat, sponsorOverride?: SponsorOption) => {
    if (!result) return;
    const aperitivoVoucher = result.vouchers.find(voucher => voucher.kind === 'aperitivo');
    if (!aperitivoVoucher) return;
    const formatToUse = formatOverride || selectedFormat;
    const sponsorToUse = sponsorOverride || activeSponsor;
    setIsBuildingCard(true);
    setCardError(false);

    const data: ShareCardData = {
      tier: result.tier,
      score: result.score,
      userTitle: result.tier.userTitle,
      foundCount: result.foundCount,
      totalCount: result.totalCount,
      comboCount: result.comboCount,
      voucherLabel: aperitivoVoucher.label,
      voucherRule: aperitivoVoucher.rule,
      referralLink: buildReferralLinkSafe(result.referralId),
      referralId: result.referralId,
      format: formatToUse,
      sponsor: sponsorToUse,
    };
    try {
      const url = await renderShareCard(data);
      if (url) {
        setShareCardUrl(url);
      } else {
        setCardError(true);
      }
    } catch (err) {
      console.error('Errore generazione card condivisibile:', err);
      setCardError(true);
    } finally {
      setIsBuildingCard(false);
    }
  };

  // Rigenera automaticamente la card quando cambiano formato o sponsor e il lead è riscattato
  useEffect(() => {
    if (isOpen && result?.claimed) {
      buildCard(selectedFormat, activeSponsor);
    }
  }, [isOpen, result?.claimed, result?.sessionId, selectedFormat, activeSponsor]);

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const custom: SponsorOption = {
          id: 'custom',
          name: file.name.replace(/\.[^/.]+$/, '').slice(0, 18),
          tagline: 'Sponsor Personalizzato',
          logoUrl: dataUrl,
          badgeText: 'Partner Speciale',
        };
        setCustomSponsor(custom);
        setSelectedSponsorId('custom');
      }
    };
    reader.readAsDataURL(file);
  };

  const shareCardFile = async () => {
    if (!shareCardUrl || !result) return;
    const formatSuffix = selectedFormat === 'story' ? 'storia-tiktok-9x16' : 'feed-post-1x1';
    const filename = `caccia-tesori-${formatSuffix}-${result.referralId}.png`;
    try {
      const blob = await (await fetch(shareCardUrl)).blob();
      const file = new File([blob], filename, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          text: `Ho completato la Caccia ai Tesori con ${result.score} pt! Inquadra il QR della card o usa il mio link per sfidarmi: ${buildReferralLinkSafe(result.referralId)}`,
          title: 'Caccia ai Tesori del Borgo',
        });
        trackEvent('share_clicked', { sessionId: result.sessionId, variant: result.variant, properties: { channel: 'social_card_native', format: selectedFormat } });
        return;
      }
    } catch {
      /* fallback: download */
    }
    const link = document.createElement('a');
    link.href = shareCardUrl;
    link.download = filename;
    link.click();
    trackEvent('share_clicked', { sessionId: result.sessionId, variant: result.variant, properties: { channel: 'social_card_download', format: selectedFormat } });
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

  if (!isOpen || !result) return null;

  const { tier, score, baseScore, comboBonus, comboCount, foundCount, totalCount, vouchers } = result;
  const celebratory = tier.givesFestivalPass;
  const foundItems = items.filter(item => item.revealed);
  const aperitivo = vouchers.find(voucher => voucher.kind === 'aperitivo');
  const passVoucher = vouchers.find(voucher => voucher.kind !== 'aperitivo');

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

        {/* Premio principale: pass Dante Festival per 2 persone con riscatto in presenza */}
        {celebratory && passVoucher && (
          <div className="mx-5 mb-4 sm:mx-7">
            <FlourishDivider label="Premio Dante Festival — Pass Spettacolo" />
            <div className="mt-3 overflow-hidden rounded-3xl border-2 border-dashed border-[#2f7d5c]/80 bg-gradient-to-br from-[#f2fbf5]/95 via-[#fffdf6]/95 to-[#dcefe2]/90 p-4 shadow-md shadow-[#1d5540]/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-b from-[#8ad0ad] to-[#2f7d5c] text-white shadow-md shadow-[#1d5540]/30">
                    <Crown className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <div className="fantasy-label text-[9.5px] font-extrabold uppercase tracking-wider text-[#2f7d5c]">
                      {tier.isVip ? 'Pass VIP + Backstage' : 'Pass Standard'} · 2 Ingressi Pagati
                    </div>
                    <div className="fantasy-heading text-[15px] font-extrabold text-[#3a2c1c]">
                      Pass per 2 persone agli spettacoli del Festival
                    </div>
                  </div>
                </div>
                <span className="fantasy-ribbon shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold">
                  {tier.medalName}
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-[#2f7d5c]/25 bg-white/70 p-3 sm:flex-row sm:items-center">
                <div className="flex shrink-0 justify-center">
                  <QrCodeImage payload={passVoucher.code} fallbackLabel={passVoucher.code} size={118} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#2f7d5c]">
                    Codice da mostrare al botteghino dello spettacolo
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-base font-black tracking-wide text-[#1d5540]">
                      {passVoucher.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyCode(passVoucher.code)}
                      className="fantasy-cta fantasy-cta--quiet flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-extrabold"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-[#2f7d5c]" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copiato' : 'Copia'}
                    </button>
                  </div>
                  <div className="mt-2 rounded-xl bg-[#2f7d5c]/10 px-2.5 py-2 text-[11px] leading-relaxed text-[#235841]">
                    <strong>📍 Riscatto in presenza:</strong> Presenta questo QR o comunica il codice al personale all'ingresso del festival. L'addetto convaliderà l'autenticità e consegnerà i <strong>2 biglietti omaggio</strong>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Voucher Aperitivo Cena: sempre assegnato per tutti */}
        {aperitivo && (
          <div className="mx-5 mb-4 sm:mx-7">
            <FlourishDivider label="Voucher per tutti i giocatori" />
            <div className="mt-3">
              <VoucherTicket issue={aperitivo} tierLabel={tier.id === 'none' ? 'Zero-Loss' : tier.medalName} highlight={celebratory} />
            </div>
            <p className="mt-2 text-[11px] text-[#6b5940]">
              Il voucher è valido <strong>presentandosi in 2 persone</strong>: mostra il QR code al
              locale convenzionato oppure usalo sullo store con il codice auto-applicato al carrello.
            </p>
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

        {/* Banner Loyalty & Token di Impatto */}
        {result.claimed && onOpenLoyalty && (
          <div className="mx-5 mb-4 sm:mx-7">
            <button
              type="button"
              onClick={onOpenLoyalty}
              className="w-full flex items-center justify-between rounded-2xl border border-amber-400/60 bg-gradient-to-r from-amber-100/90 via-[#fff8eb] to-amber-50/90 p-3 sm:p-3.5 shadow-sm transition hover:shadow-md hover:border-amber-500 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white shadow-md">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-[#2b1c06] flex items-center gap-1.5">
                    <span>Programma Loyalty & Token di Impatto</span>
                    <span className="rounded-full bg-amber-500/20 text-[#8a6a12] px-1.5 py-0.5 text-[9px] font-extrabold uppercase">Nuovo</span>
                  </div>
                  <div className="text-[11px] text-[#6b5437]">
                    Sblocca i Badge Community (500/1000 pt) e ricevi <strong>30 Token di Impatto (30€)</strong> ogni 3 referral convertiti!
                  </div>
                </div>
              </div>
              <div className="shrink-0 ml-2 text-xs font-extrabold text-[#8a6a12] flex items-center gap-1">
                <span className="hidden sm:inline">Vedi Saldo</span>
                <span>→</span>
              </div>
            </button>
          </div>
        )}

        {/* Share card personalizzabile per i Social con Sponsor */}
        {result.claimed && (
          <div className="mx-5 mb-4 sm:mx-7">
            <FlourishDivider label="Card Condivisibile per i Social" />

            <div className="mt-3 rounded-2xl border border-[#b8862f]/35 bg-[#fffdf6]/90 p-4 shadow-sm">
              {/* Formato Social Selector */}
              <div className="flex items-center justify-between text-[11.5px] font-bold text-[#3a2c1c]">
                <span>1. Formato Social</span>
                <span className="text-[10px] font-normal text-[#786043]">Alta Definizione 1080px</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('story')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition border ${
                    selectedFormat === 'story'
                      ? 'border-[#b8862f] bg-gradient-to-r from-[#d4af37]/25 to-[#f7edd6] text-[#3a2c1c] shadow-xs'
                      : 'border-[#b8862f]/25 bg-white/70 text-[#6b5940] hover:bg-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-[#b8862f]" />
                  <span>Storie & TikTok (9:16)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormat('feed')}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold transition border ${
                    selectedFormat === 'feed'
                      ? 'border-[#b8862f] bg-gradient-to-r from-[#d4af37]/25 to-[#f7edd6] text-[#3a2c1c] shadow-xs'
                      : 'border-[#b8862f]/25 bg-white/70 text-[#6b5940] hover:bg-white'
                  }`}
                >
                  <Square className="w-3.5 h-3.5 text-[#b8862f]" />
                  <span>Post Feed (1:1)</span>
                </button>
              </div>

              {/* Sponsor Selector */}
              <div className="mt-3.5 flex items-center justify-between text-[11.5px] font-bold text-[#3a2c1c]">
                <span>2. Sponsor o Partner associato</span>
                <span className="text-[10px] font-medium text-[#8a6a12]">Visibile sulla card</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {AVAILABLE_SPONSORS.map(sp => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => setSelectedSponsorId(sp.id)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition ${
                      selectedSponsorId === sp.id
                        ? 'border-[#b8862f] bg-[#b8862f] text-white shadow-xs font-semibold'
                        : 'border-[#b8862f]/30 bg-white/80 text-[#543f25] hover:bg-white'
                    }`}
                  >
                    {sp.name}
                  </button>
                ))}
                {customSponsor && (
                  <button
                    type="button"
                    onClick={() => setSelectedSponsorId('custom')}
                    className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition ${
                      selectedSponsorId === 'custom'
                        ? 'border-[#2f7d5c] bg-[#2f7d5c] text-white shadow-xs font-semibold'
                        : 'border-[#2f7d5c]/40 bg-[#f0faf4] text-[#1f5c42] hover:bg-white'
                    }`}
                  >
                    {customSponsor.name}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-dashed border-[#8a6a12]/60 bg-[#fffdf6] text-[#7a5c12] hover:bg-[#faeed3] flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  <span>+ Carica Logo</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleCustomLogoUpload}
                  className="hidden"
                />
              </div>

              {/* Informazione chiara sul QR e sul Referral */}
              <div className="mt-3 rounded-xl bg-[#eef7ff] border border-[#bcdbf5] p-2.5 text-[11px] text-[#2c5370] leading-snug">
                <strong>Inquadrando il QR sulla Card:</strong> Chi vede il tuo post o la tua storia aprirà direttamente la Caccia ai Tesori col tuo codice invito (<span className="font-mono font-bold text-[#1a3a53]">{result.referralId}</span>), facendoti guadagnare punti referral!
              </div>

              {/* Anteprima Card e Bottoni */}
              {isBuildingCard ? (
                <div className="mt-3 flex items-center justify-center py-10 bg-white/50 rounded-xl border border-[#b8862f]/20">
                  <div className="flex flex-col items-center gap-2 text-xs font-semibold text-[#8a6a12]">
                    <div className="w-6 h-6 border-2 border-[#b8862f] border-t-transparent rounded-full animate-spin" />
                    Generazione card in corso…
                  </div>
                </div>
              ) : shareCardUrl ? (
                <div className="mt-3 space-y-2.5">
                  <div className="flex justify-center bg-[#1b1206]/5 rounded-xl p-2 border border-[#b8862f]/20">
                    <img
                      src={shareCardUrl}
                      alt="Anteprima card social con QR di invito"
                      className={`rounded-xl border border-[#b8862f]/40 shadow-md ${
                        selectedFormat === 'story'
                          ? 'max-h-[340px] w-auto aspect-[9/16] object-contain'
                          : 'max-h-[300px] w-auto aspect-square object-contain'
                      }`}
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={shareCardFile}
                      className="fantasy-cta flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[12.5px] font-extrabold"
                    >
                      <Share2 className="h-4 w-4" aria-hidden />
                      Condividi nei Social
                    </button>
                    <a
                      href={shareCardUrl}
                      download={`caccia-tesori-${selectedFormat === 'story' ? 'storia-tiktok' : 'feed-post'}-${result.referralId}.png`}
                      className="fantasy-cta fantasy-cta--quiet flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[12.5px] font-extrabold"
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      Scarica PNG ({selectedFormat === 'story' ? '9:16' : '1:1'})
                    </a>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-2 rounded-xl bg-white/70 p-3 border border-[#b8862f]/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#5c4a36]">Card pronta da generare:</span>
                    <button
                      type="button"
                      onClick={() => buildCard()}
                      className="fantasy-cta fantasy-cta--sky text-xs font-bold px-3 py-1.5 rounded-xl"
                    >
                      Genera Card
                    </button>
                  </div>
                  {cardError && (
                    <p className="text-[11px] font-semibold text-[#a9512f]">
                      Impossibile generare la card grafica su questo dispositivo: puoi comunque usare la condivisione testuale del link.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

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
