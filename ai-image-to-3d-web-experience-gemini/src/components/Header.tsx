import React from 'react';
import { Camera, Download, Eye, Image as ImageIcon, Layers, Sliders } from 'lucide-react';

interface HeaderProps {
  activePreset: string;
  onSelectPreset: (presetId: string) => void;
  onUploadImage: (file: File) => void;
  onToggleCompare: () => void;
  isComparing: boolean;
  onOpenPipeline: () => void;
  onTakeSnapshot: () => void;
  onExportGLTF: () => void;
  onResetPOV: () => void;
}

/** Barra compatta dedicata esclusivamente agli strumenti immagine/3D. */
export const Header: React.FC<HeaderProps> = ({
  activePreset,
  onSelectPreset,
  onUploadImage,
  onToggleCompare,
  isComparing,
  onOpenPipeline,
  onTakeSnapshot,
  onExportGLTF,
  onResetPOV,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onUploadImage(file);
  };

  return (
    <header className="pointer-events-none absolute left-3 top-3 z-30 max-w-[calc(100vw-4.75rem)] lg:max-w-[calc(100vw-26rem)]">
      <div className="pointer-events-auto flex max-w-full items-center gap-2 overflow-x-auto rounded-2xl border border-slate-700/60 bg-slate-900/85 p-1.5 text-xs shadow-xl shadow-black/25 backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex shrink-0 items-center rounded-xl bg-slate-950/45 p-0.5">
          <button onClick={() => onSelectPreset('village')} className={`rounded-lg px-3 py-1.5 font-semibold transition ${activePreset === 'village' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>Isola #1</button>
          <button onClick={() => onSelectPreset('autumn')} className={`rounded-lg px-3 py-1.5 font-semibold transition ${activePreset === 'autumn' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>Isola #2</button>
          <button onClick={() => fileInputRef.current?.click()} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition ${activePreset === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
            <ImageIcon className="h-3.5 w-3.5" /><span>Carica</span>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>

        <span className="h-6 w-px shrink-0 bg-slate-700" />

        <div className="flex shrink-0 items-center gap-0.5">
          <button onClick={onResetPOV} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white" title="Allinea la camera alla reference"><Eye className="h-3.5 w-3.5 text-cyan-400" /><span>POV</span></button>
          <button onClick={onToggleCompare} className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold transition ${isComparing ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`} title="Confronta reference 2D e ricostruzione 3D"><Layers className="h-3.5 w-3.5" /><span>2D / 3D</span></button>
          <button onClick={onOpenPipeline} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white" title="Apri la pipeline"><Sliders className="h-3.5 w-3.5 text-blue-400" /><span>Pipeline</span></button>
          <button onClick={onTakeSnapshot} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-800 hover:text-white" title="Scarica uno screenshot"><Camera className="h-4 w-4 text-emerald-400" /></button>
          <button onClick={onExportGLTF} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-slate-800 hover:text-white" title="Esporta il modello 3D"><Download className="h-4 w-4 text-purple-400" /></button>
        </div>
      </div>
    </header>
  );
};
