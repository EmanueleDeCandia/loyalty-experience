import React, { useEffect, useState } from 'react';
import { Check, Copy, QrCode, ShoppingBag, TimerReset } from 'lucide-react';
import { VOUCHER_VALIDITY_HOURS, VoucherIssue } from '../game/treasureCatalog';
import { createQrDataUrl } from '../game/qrCode';

interface QrCodeImageProps {
  payload: string;
  size?: number;
  /** Testo mostrato quando il QR non è disegnabile (es. ambiente headless). */
  fallbackLabel: string;
  className?: string;
}

/** QR generato a runtime con fallback testuale (codice + link store). */
export const QrCodeImage: React.FC<QrCodeImageProps> = ({
  payload,
  size = 148,
  fallbackLabel,
  className = '',
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    createQrDataUrl(payload, { size: size * 2 }).then(url => {
      if (alive && url) setDataUrl(url);
    });
    return () => {
      alive = false;
    };
  }, [payload, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`fantasy-inset grid shrink-0 place-items-center rounded-xl px-2 text-center ${className}`}
      >
        <div>
          <QrCode className="mx-auto mb-1 h-4 w-4 text-[#8a6a12]" aria-hidden />
          <div className="font-mono text-[9px] font-bold leading-tight text-[#3a2c1c] break-all">
            {fallbackLabel}
          </div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      alt="QR code del voucher da mostrare alla biglietteria o scansionare per il riscatto"
      className={`shrink-0 rounded-xl border border-[#b8862f]/45 bg-[#fdf6e6] p-1 ${className}`}
    />
  );
};

/** Conto alla rovescia del claim: 48 ore dal momento dell'emissione. */
function useClaimCountdown(expiresAt: number) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const remaining = Math.max(0, expiresAt - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const expired = remaining <= 0;
  const ratio = Math.min(1, remaining / (VOUCHER_VALIDITY_HOURS * 3_600_000));

  return { hours, minutes, seconds, expired, ratio };
}

interface VoucherTicketProps {
  issue: VoucherIssue;
  /** Etichetta della medaglia/nastro, mostrata in alto a destra. */
  tierLabel: string;
  /** Il pass Dante Festival è il premio principale della schermata finale. */
  highlight?: boolean;
}

/**
 * Biglietto voucher con QR di riscatto, scadenza dinamica e call-to-action
 * verso lo store e-commerce ufficiale (codice promozionale auto-applicato).
 */
export const VoucherTicket: React.FC<VoucherTicketProps> = ({ issue, tierLabel, highlight }) => {
  const [copied, setCopied] = useState(false);
  const { hours, minutes, seconds, expired, ratio } = useClaimCountdown(issue.expiresAt);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(issue.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border-2 border-dashed px-4 py-4 ${
        highlight
          ? 'border-[#2f7d5c]/70 bg-gradient-to-br from-[#f2fbf5]/95 via-[#fffdf6]/95 to-[#dcefe2]/90'
          : 'border-[#b8862f]/60 bg-[#fffdf6]/85'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="fantasy-label flex items-center gap-1 text-[9.5px] font-bold text-[#2f7d5c]">
            <ShoppingBag className="h-3 w-3" aria-hidden />
            Riscatto sullo store ufficiale
          </div>
          <h3 className="fantasy-heading text-[15px] font-bold leading-snug text-[#3a2c1c]">
            {issue.label}
          </h3>
          <p className="mt-0.5 text-[11px] font-semibold text-[#6b5940]">{issue.rule}</p>
        </div>
        <span className="fantasy-ribbon shrink-0 rounded-full px-2 py-1 text-[9.5px] font-bold">
          {tierLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <QrCodeImage payload={issue.qrPayload} fallbackLabel={issue.code} size={132} />

        <div className="min-w-0 flex-1">
          <div className="fantasy-label text-[9px] font-bold text-[#8a6a12]">
            Codice promozionale (auto-applicato al carrello)
          </div>
          <div className="flex items-center gap-2">
            <span className="truncate font-mono text-[15px] font-extrabold text-[#3a2c1c]">
              {issue.code}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="fantasy-cta fantasy-cta--quiet flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-extrabold"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-[#2f7d5c]" aria-hidden />
                  Copiato
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" aria-hidden />
                  Copia
                </>
              )}
            </button>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <TimerReset className="h-3.5 w-3.5 shrink-0 text-[#a9512f]" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-[10.5px] font-bold text-[#3a2c1c]">
                {expired
                  ? 'Claim scaduto: torna a giocare per un nuovo voucher'
                  : `Claim entro ${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`}
              </div>
              <div className="fantasy-inset mt-1 h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#a9512f] to-[#cfa436] transition-all duration-1000"
                  style={{ width: `${Math.max(2, ratio * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <p className="mt-2 text-[10.5px] text-[#6b5940]">
            Valore {issue.value} · scadenza {VOUCHER_VALIDITY_HOURS} ore dalla vincita.
          </p>
        </div>
      </div>

      <a
        href={issue.redeemUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-3 flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-[13px] font-extrabold ${
          highlight ? 'fantasy-cta fantasy-cta--sky' : 'fantasy-cta'
        }`}
      >
        <ShoppingBag className="h-4 w-4" aria-hidden />
        Riscatta sullo Store Ufficiale
      </a>
    </div>
  );
};
