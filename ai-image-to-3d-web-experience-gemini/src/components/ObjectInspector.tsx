import React from 'react';
import { X, Home, Compass, MapPin, Eye, Disc3 } from 'lucide-react';
import { SelectedObjectInfo } from '../types/world';

interface ObjectInspectorProps {
  info: SelectedObjectInfo | null;
  onClose: () => void;
  onFocus: (pos: [number, number, number]) => void;
}

export const ObjectInspector: React.FC<ObjectInspectorProps> = ({ info, onClose, onFocus }) => {
  if (!info) return null;

  const getIcon = () => {
    switch (info.type) {
      case 'house':
        return <Home className="w-5 h-5 text-amber-400" />;
      case 'windmill':
        return <Disc3 className="w-5 h-5 text-cyan-400 animate-spin" />;
      case 'airship':
        return <Compass className="w-5 h-5 text-rose-400" />;
      default:
        return <MapPin className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="absolute top-20 right-4 z-20 w-80 max-w-[calc(100vw-2rem)] pointer-events-auto bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-4 shadow-2xl text-slate-200 animate-in fade-in slide-in-from-right-4 duration-200">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center shrink-0">
            {getIcon()}
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider">
              Diorama Feature
            </span>
            <h3 className="text-sm font-bold text-white leading-tight">{info.title}</h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-300 py-3 leading-relaxed">{info.description}</p>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
        <div>
          <span>Pos: </span>
          <span className="text-slate-200">
            [{info.position[0].toFixed(1)}, {info.position[1].toFixed(1)}, {info.position[2].toFixed(1)}]
          </span>
        </div>
        <button
          onClick={() => onFocus(info.position)}
          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Zoom Target</span>
        </button>
      </div>
    </div>
  );
};
