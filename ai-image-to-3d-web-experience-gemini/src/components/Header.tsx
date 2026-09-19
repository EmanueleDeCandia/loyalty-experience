import React from 'react';
import { Camera, Layers, Download, Sliders, Sparkles, Image as ImageIcon, Eye } from 'lucide-react';

interface HeaderProps {
  fps: number;
  triangles: number;
  drawCalls: number;
  activePreset: string;
  onSelectPreset: (presetId: string) => void;
  onUploadImage: (file: File) => void;
  onToggleCompare: () => void;
  isComparing: boolean;
  onOpenPipeline: () => void;
  onTakeSnapshot: () => void;
  onExportGLTF: () => void;
  onResetPOV: () => void;
  /** Slot per l'HUD del mini-game "Caccia ai Tesori". */
  huntSlot?: React.ReactNode;
  /** Nasconde il pannello statistiche durante la caccia (schermo più libero). */
  hideStats?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  fps,
  triangles,
  drawCalls,
  activePreset,
  onSelectPreset,
  onUploadImage,
  onToggleCompare,
  isComparing,
  onOpenPipeline,
  onTakeSnapshot,
  onExportGLTF,
  onResetPOV,
  huntSlot,
  hideStats,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadImage(e.target.files[0]);
    }
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
      {/* Brand & Badge */}
      <div className="pointer-events-auto flex items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-2xl px-3.5 py-2 shadow-xl shadow-black/20">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30">
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white tracking-wider text-sm">AETHERIA 3D</span>
            <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full">
              Zero-Shot
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Image-to-3D Diorama World</p>
        </div>
      </div>

      {/* Mini-game HUD (Caccia ai Tesori) */}
      {huntSlot}

      {/* Performance & Scene Stats */}
      <div className={`${hideStats ? 'hidden' : 'hidden lg:flex'} pointer-events-auto items-center gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-2xl px-4 py-2 text-xs font-mono text-slate-300 shadow-xl shadow-black/20`}>
        <div className="flex items-center gap-1.5">
          <span className={`inline-block w-2 h-2 rounded-full ${fps >= 50 ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
          <span className="text-white font-bold">{fps}</span>
          <span className="text-slate-400 text-[11px]">FPS</span>
        </div>
        <div className="w-px h-3.5 bg-slate-700" />
        <div>
          <span className="text-white font-semibold">{(triangles / 1000).toFixed(1)}k</span>{' '}
          <span className="text-slate-400 text-[11px]">Polys</span>
        </div>
        <div className="w-px h-3.5 bg-slate-700" />
        <div>
          <span className="text-white font-semibold">{drawCalls}</span>{' '}
          <span className="text-slate-400 text-[11px]">Calls</span>
        </div>
        <div className="w-px h-3.5 bg-slate-700" />
        <span className="text-emerald-400 font-semibold text-[11px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
          &lt; 8MB
        </span>
      </div>

      {/* Preset Selector & Tools */}
      <div className="pointer-events-auto flex items-center flex-wrap gap-2">
        {/* Preset Selector */}
        <div className="flex items-center bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-1 shadow-xl shadow-black/20 text-xs">
          <button
            onClick={() => onSelectPreset('village')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              activePreset === 'village'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Ref Isle #1
          </button>
          <button
            onClick={() => onSelectPreset('autumn')}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              activePreset === 'autumn'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Ref Isle #2
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all ${
              activePreset === 'custom'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Upload any image to run zero-shot reconstruction"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-700/60 rounded-2xl p-1 shadow-xl shadow-black/20">
          <button
            onClick={onResetPOV}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-1"
            title="Snap camera to exact isometric reference POV (10, 8, 10)"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Ref POV</span>
          </button>

          <button
            onClick={onToggleCompare}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1 ${
              isComparing
                ? 'bg-cyan-500 text-slate-950 font-semibold shadow-md shadow-cyan-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Compare 2D Reference Image with 3D Reconstruction"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2D / 3D Split</span>
          </button>

          <button
            onClick={onOpenPipeline}
            className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-1"
            title="View Zero-Shot Pipeline & Depth Map Analysis"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Pipeline</span>
          </button>

          <button
            onClick={onTakeSnapshot}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Capture High-Res Diorama Snapshot"
          >
            <Camera className="w-4 h-4 text-emerald-400" />
          </button>

          <button
            onClick={onExportGLTF}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            title="Export 3D Model (.gltf)"
          >
            <Download className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
