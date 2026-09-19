import React from 'react';

/**
 * Ornamenti riutilizzabili dello stile "fantasy del borgo sospeso":
 * cornici incise, fregi, sigilli di cera e stemma araldico.
 * Solo SVG inline: nessuna dipendenza esterna, resa nitida a ogni scala.
 */

interface CornerProps {
  className?: string;
  size?: number;
}

/** Fregio d'angolo dorato per le cornici. */
export const CornerFleuron: React.FC<CornerProps> = ({ className = '', size = 34 }) => (
  <svg
    viewBox="0 0 40 40"
    width={size}
    height={size}
    className={className}
    aria-hidden
    focusable="false"
  >
    <path
      d="M1 39 C1 22 8 9 20 5 C14 15 12 22 12 39"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M39 1 C22 1 9 8 5 20 C15 14 22 12 39 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <circle cx="7.5" cy="7.5" r="2.4" fill="currentColor" />
    <path
      d="M7.5 1.6 L9 6 L13.4 7.5 L9 9 L7.5 13.4 L6 9 L1.6 7.5 L6 6 Z"
      fill="currentColor"
      opacity="0.85"
    />
  </svg>
);

/** Fregio decorativo con rombo centrale, usato come separatore di sezione. */
export const FlourishDivider: React.FC<{ className?: string; label?: string }> = ({
  className = '',
  label,
}) => (
  <div className={`flex items-center gap-3 ${className}`} aria-hidden={label ? undefined : true}>
    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#b8862f]/50 to-[#b8862f]/70" />
    <svg viewBox="0 0 60 16" width="60" height="16" aria-hidden>
      <path
        d="M2 8 C14 8 18 2 30 2 C42 2 46 8 58 8 C46 8 42 14 30 14 C18 14 14 8 2 8 Z"
        fill="none"
        stroke="#b8862f"
        strokeWidth="1.1"
        opacity="0.9"
      />
      <circle cx="30" cy="8" r="3.2" fill="#b8862f" opacity="0.9" />
      <circle cx="30" cy="8" r="1.2" fill="#fdf6e6" />
    </svg>
    {label && (
      <span className="fantasy-label whitespace-nowrap text-[10px] font-bold text-[#7a5416]/80">
        {label}
      </span>
    )}
    <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#b8862f]/50 to-[#b8862f]/70" />
  </div>
);

interface WaxSealProps {
  lines: string[];
  className?: string;
  tone?: 'gold' | 'crimson' | 'emerald';
}

const SEAL_TONES: Record<NonNullable<WaxSealProps['tone']>, { face: string; edge: string; ink: string }> = {
  gold: { face: '#c9a227', edge: '#8a6a12', ink: '#fdf6e6' },
  crimson: { face: '#9b2c1f', edge: '#6d1c12', ink: '#fbe9dc' },
  emerald: { face: '#2f7d5c', edge: '#1d5540', ink: '#e6f7ee' },
};

/** Sigillo di cera con il codice voucher / claim. */
export const WaxSeal: React.FC<WaxSealProps> = ({ lines, className = '', tone = 'gold' }) => {
  const palette = SEAL_TONES[tone];
  return (
    <div className={`relative grid place-items-center ${className}`}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <radialGradient id={`seal-face-${tone}`} cx="36%" cy="30%" r="76%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="45%" stopColor={palette.face} />
            <stop offset="100%" stopColor={palette.edge} />
          </radialGradient>
        </defs>
        <path
          d="M50 3 C62 3 66 12 76 16 C86 20 97 28 97 42 C97 56 88 60 84 70 C80 80 76 96 60 96 C48 96 44 88 34 86 C22 84 4 78 4 60 C4 42 16 38 22 28 C28 18 34 3 50 3 Z"
          fill={`url(#seal-face-${tone})`}
          stroke={palette.edge}
          strokeWidth="2"
        />
        <circle cx="50" cy="52" r="30" fill="none" stroke={palette.ink} strokeOpacity="0.35" strokeWidth="1.6" />
      </svg>
      <div className="relative px-3 py-4 text-center leading-tight">
        {lines.map((line, index) => (
          <div
            key={index}
            className={
              index === 0
                ? 'fantasy-label text-[9px] font-bold tracking-[0.18em] uppercase'
                : 'font-mono text-[13px] font-extrabold'
            }
            style={{ color: palette.ink }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Stemma del borgo sospeso: scudo con torre e cielo. */
export const VillageCrest: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 44,
}) => (
  <svg viewBox="0 0 48 56" width={size} height={(size * 56) / 48} className={className} aria-hidden>
    <defs>
      <linearGradient id="crest-shield" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stopColor="#a9d5ee" />
        <stop offset="58%" stopColor="#7fb2d6" />
        <stop offset="100%" stopColor="#5a8fb5" />
      </linearGradient>
      <linearGradient id="crest-gold" x1="0" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stopColor="#f4e0a4" />
        <stop offset="52%" stopColor="#cfa436" />
        <stop offset="100%" stopColor="#8a6a12" />
      </linearGradient>
    </defs>
    <path
      d="M24 1 L46 8 V28 C46 41 36 51 24 55 C12 51 2 41 2 28 V8 Z"
      fill="url(#crest-shield)"
      stroke="url(#crest-gold)"
      strokeWidth="2.4"
    />
    <path d="M6 26 H42" stroke="#fdf6e6" strokeOpacity="0.45" strokeWidth="1" />
    <path
      d="M15 34 V21 L24 15 L33 21 V34 Z"
      fill="#f7edd6"
      stroke="#8a6a12"
      strokeWidth="1.3"
    />
    <path d="M19 34 V26 H29 V34 Z" fill="#a9512f" />
    <path d="M24 15 V10" stroke="#8a6a12" strokeWidth="1.6" />
    <path d="M24 10 L30 12 L24 14 Z" fill="#cfa436" />
    <circle cx="34" cy="14" r="3.4" fill="#f4e0a4" stroke="#8a6a12" strokeWidth="1" />
  </svg>
);
