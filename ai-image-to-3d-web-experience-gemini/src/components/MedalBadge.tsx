import React, { useId } from 'react';
import { TierDefinition, TierId } from '../game/treasureCatalog';

interface MedalPalette {
  light: string;
  mid: string;
  dark: string;
  ring: string;
  ribbonLight: string;
  ribbonDark: string;
  glyph: 'star' | 'gem' | 'none';
}

const PALETTES: Record<TierId, MedalPalette> = {
  none: {
    light: '#f8fafc',
    mid: '#cbd5e1',
    dark: '#94a3b8',
    ring: '#64748b',
    ribbonLight: '#cbd5e1',
    ribbonDark: '#64748b',
    glyph: 'none',
  },
  silver: {
    light: '#ffffff',
    mid: '#dbe4ee',
    dark: '#8fa3b8',
    ring: '#5b6b80',
    ribbonLight: '#bfdbfe',
    ribbonDark: '#1d4ed8',
    glyph: 'star',
  },
  gold: {
    light: '#fffaea',
    mid: '#ffd873',
    dark: '#d98f14',
    ring: '#b45309',
    ribbonLight: '#fde68a',
    ribbonDark: '#b45309',
    glyph: 'star',
  },
  platinum: {
    light: '#ffffff',
    mid: '#e6eef8',
    dark: '#a3b4cd',
    ring: '#7c8aa5',
    ribbonLight: '#a5f3fc',
    ribbonDark: '#0e7490',
    glyph: 'star',
  },
  diamond: {
    light: '#ffffff',
    mid: '#dcf7ff',
    dark: '#7cc9f0',
    ring: '#0891b2',
    ribbonLight: '#c7d2fe',
    ribbonDark: '#4f46e5',
    glyph: 'gem',
  },
};

function starPath(outer = 1, inner = 0.42, points = 5): string {
  const coordinates: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    coordinates.push(`${(Math.cos(angle) * radius).toFixed(3)},${(Math.sin(angle) * radius).toFixed(3)}`);
  }
  return `M${coordinates.join(' L')} Z`;
}

interface MedalBadgeProps {
  tier: TierDefinition;
  size?: number;
  className?: string;
}

/** Badge grafico della medaglia conquistata (argento, oro, platino, diamante). */
export const MedalBadge: React.FC<MedalBadgeProps> = ({ tier, size = 132, className }) => {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9]/g, '');
  const palette = PALETTES[tier.id];
  const faceId = `face-${uid}`;
  const ribbonId = `ribbon-${uid}`;
  const glowId = `glow-${uid}`;

  return (
    <svg
      viewBox="0 0 100 112"
      width={size}
      height={(size * 112) / 100}
      className={className}
      role="img"
      aria-label={tier.title}
    >
      <defs>
        <linearGradient id={ribbonId} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor={palette.ribbonLight} />
          <stop offset="100%" stopColor={palette.ribbonDark} />
        </linearGradient>
        <radialGradient id={faceId} cx="34%" cy="26%" r="82%">
          <stop offset="0%" stopColor={palette.light} />
          <stop offset="52%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.dark} />
        </radialGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="52%" stopColor={palette.mid} stopOpacity="0.6" />
          <stop offset="100%" stopColor={palette.mid} stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="64" r="48" fill={`url(#${glowId})`} className="hunt-medal-glow" />

      {/* Nastro */}
      <path d="M29 2 L71 2 L64 34 L36 34 Z" fill={`url(#${ribbonId})`} />
      <path
        d="M29 2 L71 2 L64 34 L36 34 Z"
        fill="none"
        stroke="rgba(15,23,42,0.14)"
        strokeWidth="1.1"
      />

      {/* Disco medaglia */}
      <circle cx="50" cy="66" r="33" fill={`url(#${faceId})`} stroke={palette.ring} strokeWidth="2.6" />
      <circle cx="50" cy="66" r="27.5" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.6" />

      {palette.glyph === 'star' && (
        <>
          <path
            d={starPath(1, 0.42)}
            transform="translate(50 67) scale(17.5)"
            fill={palette.ring}
            opacity="0.92"
          />
          <path
            d={starPath(1, 0.42)}
            transform="translate(50 66.4) scale(12.5)"
            fill="rgba(255,255,255,0.72)"
          />
        </>
      )}

      {palette.glyph === 'gem' && (
        <>
          <path
            d="M0,-0.95 L0.66,-0.32 L0,0.92 L-0.66,-0.32 Z"
            transform="translate(50 67) scale(19)"
            fill={palette.ring}
            opacity="0.9"
          />
          <path
            d="M0,-0.95 L0.66,-0.32 L0,0.92 L-0.66,-0.32 Z"
            transform="translate(50 66.2) scale(14)"
            fill="rgba(255,255,255,0.78)"
          />
          <path
            d="M-0.66,-0.32 L0.66,-0.32 M0,-0.95 L0,0.92"
            transform="translate(50 66.2) scale(14)"
            stroke={palette.ring}
            strokeWidth="0.08"
            fill="none"
          />
        </>
      )}

      {palette.glyph === 'none' && (
        <>
          <circle
            cx="50"
            cy="66"
            r="19"
            fill="none"
            stroke={palette.ring}
            strokeWidth="2"
            strokeDasharray="5 5"
            opacity="0.85"
          />
          <text
            x="50"
            y="77"
            textAnchor="middle"
            fontSize="30"
            fontWeight="800"
            fill={palette.ring}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            ?
          </text>
        </>
      )}

      {(tier.id === 'diamond' || tier.id === 'platinum') && (
        <g className="hunt-medal-sparkles" fill="#ffffff" opacity="0.95">
          <path d={starPath(1, 0.35)} transform="translate(16 34) scale(5)" />
          <path d={starPath(1, 0.35)} transform="translate(86 46) scale(4)" />
          <path d={starPath(1, 0.35)} transform="translate(78 12) scale(3.4)" />
        </g>
      )}
    </svg>
  );
};
