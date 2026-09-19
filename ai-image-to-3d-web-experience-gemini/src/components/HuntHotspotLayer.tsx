import React, { memo, useEffect, useRef, useState } from 'react';
import { Search, Check } from 'lucide-react';
import { WorldInstance } from '../types/world';
import { TreasureId } from '../game/treasureCatalog';
import { HuntItem, HuntPhase } from '../game/useTreasureHunt';
import { cn } from '../utils/cn';

interface HuntHotspotLayerProps {
  worldRef: React.RefObject<WorldInstance | null>;
  items: HuntItem[];
  phase: HuntPhase;
  onReveal: (id: TreasureId) => void;
  onHover: (id: TreasureId | null) => void;
}

interface TreasureChipProps {
  item: HuntItem;
  onReveal: (id: TreasureId) => void;
  onHover: (id: TreasureId | null) => void;
}

/**
 * Chip cliccabile ancorato alla figurina 3D.
 * Il flip (fronte/retro) è puramente CSS: il retro mostra i punti ottenuti.
 */
const TreasureChip = memo(function TreasureChip({ item, onReveal, onHover }: TreasureChipProps) {
  const [showFloat, setShowFloat] = useState(false);
  const previouslyRevealed = useRef(item.revealed);

  useEffect(() => {
    if (item.revealed && !previouslyRevealed.current) {
      previouslyRevealed.current = true;
      setShowFloat(true);
      const timer = window.setTimeout(() => setShowFloat(false), 1500);
      return () => window.clearTimeout(timer);
    }
    previouslyRevealed.current = item.revealed;
    return undefined;
  }, [item.revealed]);

  return (
    <button
      type="button"
      disabled={item.revealed}
      onClick={event => {
        event.stopPropagation();
        onReveal(item.id);
      }}
      onPointerEnter={() => onHover(item.id)}
      onPointerLeave={() => onHover(null)}
      aria-label={
        item.revealed
          ? `Figurina ${item.label} già trovata: ${item.points} punti`
          : `Apri la figurina ${item.label}`
      }
      className={cn('treasure-chip', item.revealed && 'is-collected')}
    >
      <span className="treasure-flip">
        <span className="treasure-face treasure-face-front">
          <span className="chip-inner">
            <span className="chip-emoji" aria-hidden>
              {item.emoji}
            </span>
            <span className="chip-label">{item.label}</span>
          </span>
          <span className="chip-search" aria-hidden>
            <Search className="w-3.5 h-3.5" />
            <span>?</span>
          </span>
        </span>

        <span className="treasure-face treasure-face-back">
          <span className="treasure-back-points">+{item.points}</span>
          <span className="treasure-back-label">
            <Check className="w-3 h-3" aria-hidden /> {item.label}
          </span>
        </span>
      </span>

      {showFloat && <span className="treasure-float">+{item.points} pt</span>}
    </button>
  );
});

/**
 * Overlay DOM sincronizzato con le figurine 3D del borgo.
 * Un unico requestAnimationFrame proietta ogni hotspot e aggiorna posizione,
 * scala, profondità e stato di occlusione (figurine dietro case o terreno).
 */
export const HuntHotspotLayer: React.FC<HuntHotspotLayerProps> = ({
  worldRef,
  items,
  phase,
  onReveal,
  onHover,
}) => {
  const wrappers = useRef<Record<string, HTMLDivElement | null>>({});
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (phase === 'idle') return;

    let frameId = 0;
    const loop = () => {
      frameId = window.requestAnimationFrame(loop);
      const world = worldRef.current;
      if (!world) return;

      const currentItems = itemsRef.current;
      const projections = world.getHotspotProjection(currentItems.map(item => item.id));

      projections.forEach(projection => {
        const wrapper = wrappers.current[projection.id];
        if (!wrapper) return;

        const item = currentItems.find(entry => entry.id === projection.id);
        const hidden = projection.occluded && !item?.revealed;
        // Fuori dalla sessione attiva i tap sono bloccati (stato disabilitato).
        const interactive = phase === 'active' && !hidden && projection.visible;

        wrapper.style.transform = `translate3d(${projection.x}px, ${projection.y}px, 0) scale(${projection.scale}) translate(-50%, -50%)`;
        wrapper.style.visibility = projection.visible ? 'visible' : 'hidden';
        wrapper.style.opacity = hidden ? '0.34' : '1';
        wrapper.style.pointerEvents = interactive ? 'auto' : 'none';
        wrapper.style.zIndex = `${1000 - Math.round(projection.depth * 10)}`;

        const button = wrapper.firstElementChild as HTMLElement | null;
        if (button) {
          button.classList.toggle('is-occluded', hidden);
          button.classList.toggle('is-locked', !interactive);
          button.style.filter = hidden ? 'grayscale(0.5)' : 'none';
        }
      });
    };

    loop();
    return () => window.cancelAnimationFrame(frameId);
  }, [phase, worldRef]);

  if (phase === 'idle') return null;

  return (
    <div className="absolute inset-0 z-30 overflow-hidden pointer-events-none">
      {items.map(item => (
        <div
          key={item.id}
          ref={element => {
            wrappers.current[item.id] = element;
          }}
          className="absolute top-0 left-0 will-change-transform"
          style={{ transform: 'translate3d(-9999px, -9999px, 0)', visibility: 'hidden' }}
        >
          <TreasureChip item={item} onReveal={onReveal} onHover={onHover} />
        </div>
      ))}
    </div>
  );
};
