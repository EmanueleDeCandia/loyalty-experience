import React, { useState, useRef, useEffect } from 'react';
import { X, SplitSquareVertical, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';

interface ComparisonSliderProps {
  referenceImageUrl: string;
  onClose: () => void;
  onAlignCamera: () => void;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  referenceImageUrl,
  onClose,
  onAlignCamera,
}) => {
  const [sliderPos, setSliderPos] = useState(50); // percentage
  const [viewMode, setViewMode] = useState<'split' | 'overlay'>('split');
  const [overlayOpacity, setOverlayOpacity] = useState(0.5);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-align camera to isometric reference POV when opening compare
  useEffect(() => {
    onAlignCamera();
  }, [onAlignCamera]);

  const handlePointerDown = () => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(pct);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handlePointerMove);
      window.addEventListener('mouseup', handlePointerUp);
      window.addEventListener('touchmove', handlePointerMove);
      window.addEventListener('touchend', handlePointerUp);
    }

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-15 pointer-events-none select-none overflow-hidden"
    >
      {/* Top Banner Toolbar */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 rounded-full px-4 py-1.5 shadow-xl text-xs text-white">
        <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
          <SplitSquareVertical className="w-4 h-4" />
          <span>2D Reference vs 3D Diorama</span>
        </span>

        <div className="w-px h-3.5 bg-slate-700 mx-1" />

        <div className="flex items-center gap-1 bg-slate-800 rounded-full p-0.5">
          <button
            onClick={() => setViewMode('split')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              viewMode === 'split' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Split Curtain
          </button>
          <button
            onClick={() => setViewMode('overlay')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
              viewMode === 'overlay' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Ghost Overlay
          </button>
        </div>

        {viewMode === 'overlay' && (
          <div className="flex items-center gap-1.5 pl-2">
            <span className="text-[10px] text-slate-400">Opacity:</span>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.05"
              value={overlayOpacity}
              onChange={e => setOverlayOpacity(parseFloat(e.target.value))}
              className="w-16 accent-cyan-400 h-1 bg-slate-700 rounded cursor-pointer"
            />
          </div>
        )}

        <button
          onClick={onAlignCamera}
          className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-full transition-all ml-1"
        >
          Align POV
        </button>

        <button
          onClick={onClose}
          className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
          title="Exit comparison mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode A: Split Curtain */}
      {viewMode === 'split' && (
        <>
          {/* Reference Image Clamped to Left Slice */}
          <div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{ width: `${sliderPos}%` }}
          >
            <div className="w-screen h-screen relative">
              <img
                src={referenceImageUrl}
                alt="Source Reference Artwork"
                className="w-full h-full object-cover object-center filter saturate-105"
              />
              <div className="absolute inset-0 bg-blue-900/10 pointer-events-none" />
              <div className="absolute top-24 left-6 bg-slate-900/80 border border-slate-700/80 backdrop-blur-md rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-lg flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>2D Source Reference Art</span>
              </div>
            </div>
          </div>

          {/* Right Side Indicator */}
          <div className="absolute top-24 right-6 pointer-events-none bg-slate-900/80 border border-slate-700/80 backdrop-blur-md rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-lg flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>3D Interactive Reconstruction</span>
          </div>

          {/* Draggable Divider Handle */}
          <div
            className="absolute top-0 bottom-0 pointer-events-auto cursor-ew-resize z-20 flex items-center justify-center -translate-x-1/2"
            style={{ left: `${sliderPos}%` }}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
          >
            <div className="w-0.5 h-full bg-gradient-to-b from-cyan-400 via-white to-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
            <div className="absolute w-8 h-8 rounded-full bg-slate-900 border-2 border-cyan-400 shadow-xl flex items-center justify-center text-cyan-300">
              <SlidersHorizontal className="w-4 h-4 rotate-90" />
            </div>
          </div>
        </>
      )}

      {/* Mode B: Ghost Overlay */}
      {viewMode === 'overlay' && (
        <div
          className="absolute inset-0 pointer-events-none transition-opacity"
          style={{ opacity: overlayOpacity }}
        >
          <img
            src={referenceImageUrl}
            alt="Source Reference Artwork"
            className="w-full h-full object-cover object-center"
          />
        </div>
      )}
    </div>
  );
};
