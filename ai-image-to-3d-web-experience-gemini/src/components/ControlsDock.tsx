import React, { useState } from 'react';
import {
  Compass,
  Sun,
  Moon,
  CloudSun,
  Sunset,
  Focus,
  Wind,
  Droplets,
  RotateCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { CameraBookmark, LightingMode } from '../types/world';

interface ControlsDockProps {
  currentBookmark: CameraBookmark;
  onSelectBookmark: (bookmark: CameraBookmark) => void;
  lightingMode: LightingMode;
  onSelectLighting: (mode: LightingMode) => void;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  tiltShiftEnabled: boolean;
  onToggleTiltShift: () => void;
  tiltShiftFocus: number;
  onChangeTiltShiftFocus: (val: number) => void;
  tiltShiftBlur: number;
  onChangeTiltShiftBlur: (val: number) => void;
  exposure: number;
  onChangeExposure: (val: number) => void;
  cloudSpeed: number;
  onChangeCloudSpeed: (val: number) => void;
  waterSpeed: number;
  onChangeWaterSpeed: (val: number) => void;
}

export const ControlsDock: React.FC<ControlsDockProps> = ({
  currentBookmark,
  onSelectBookmark,
  lightingMode,
  onSelectLighting,
  autoRotate,
  onToggleAutoRotate,
  tiltShiftEnabled,
  onToggleTiltShift,
  tiltShiftFocus,
  onChangeTiltShiftFocus,
  tiltShiftBlur,
  onChangeTiltShiftBlur,
  exposure,
  onChangeExposure,
  cloudSpeed,
  onChangeCloudSpeed,
  waterSpeed,
  onChangeWaterSpeed,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'light' | 'optics'>('camera');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const bookmarks: { id: CameraBookmark; label: string; desc: string }[] = [
    { id: 'isometric', label: 'Reference POV', desc: 'Default (10, 8, 10)' },
    { id: 'village', label: 'Village Center', desc: 'Cobblestone Square' },
    { id: 'waterfall', label: 'Waterfall Lip', desc: 'Cascading Abyss' },
    { id: 'windmill', label: 'Windmill Crest', desc: 'Eastern Highland' },
    { id: 'cliffs', label: 'Cliff Roots', desc: 'Stalactite & Void' },
    { id: 'topdown', label: 'Top-Down Plan', desc: 'Orthographic Map' },
  ];

  const lightingPresets: { id: LightingMode; label: string; icon: React.ReactNode }[] = [
    { id: 'day', label: 'Noon Sun', icon: <Sun className="w-4 h-4 text-amber-400" /> },
    { id: 'golden', label: 'Golden Hour', icon: <Sunset className="w-4 h-4 text-orange-400" /> },
    { id: 'night', label: 'Bioluminescent', icon: <Moon className="w-4 h-4 text-indigo-400" /> },
    { id: 'overcast', label: 'Misty Highland', icon: <CloudSun className="w-4 h-4 text-sky-400" /> },
  ];

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-2xl pointer-events-none">
      <div className="pointer-events-auto bg-slate-900/85 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-3 sm:p-4 shadow-2xl shadow-black/40 text-slate-200 transition-all">
        {/* Header Tabs & Collapse */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => { setActiveTab('camera'); setIsCollapsed(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'camera' && !isCollapsed
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Camera & Views</span>
            </button>

            <button
              onClick={() => { setActiveTab('light'); setIsCollapsed(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'light' && !isCollapsed
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Atmosphere</span>
            </button>

            <button
              onClick={() => { setActiveTab('optics'); setIsCollapsed(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'optics' && !isCollapsed
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Focus className="w-3.5 h-3.5" />
              <span>Diorama Optics</span>
            </button>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand dock' : 'Collapse dock'}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Tab Body */}
        {!isCollapsed && (
          <div className="pt-3">
            {/* CAMERA TAB */}
            {activeTab === 'camera' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                    Camera Bookmarks (Orbit & Zoom Active)
                  </span>
                  <button
                    onClick={onToggleAutoRotate}
                    className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium transition-all ${
                      autoRotate
                        ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-400/40'
                        : 'text-slate-400 hover:text-white bg-slate-800/80'
                    }`}
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
                    <span>Cinematic Orbit</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {bookmarks.map(b => (
                    <button
                      key={b.id}
                      onClick={() => onSelectBookmark(b.id)}
                      className={`text-left p-2 rounded-xl border transition-all ${
                        currentBookmark === b.id
                          ? 'border-blue-500 bg-blue-500/15 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold">{b.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{b.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ATMOSPHERE TAB */}
            {activeTab === 'light' && (
              <div className="space-y-3">
                <div>
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                    Lighting Rig & Dynamic Shading
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {lightingPresets.map(lp => (
                      <button
                        key={lp.id}
                        onClick={() => onSelectLighting(lp.id)}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                          lightingMode === lp.id
                            ? 'border-amber-500/70 bg-amber-500/15 text-white font-semibold'
                            : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {lp.icon}
                        <span>{lp.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/60">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Wind className="w-3.5 h-3.5 text-sky-400" />
                        <span>Cloud Drift Speed</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-300">{cloudSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="0.1"
                      value={cloudSpeed}
                      onChange={e => onChangeCloudSpeed(parseFloat(e.target.value))}
                      className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                        <span>River & Waterfall Speed</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-300">{waterSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={waterSpeed}
                      onChange={e => onChangeWaterSpeed(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DIORAMA OPTICS & POST-PROCESSING TAB */}
            {activeTab === 'optics' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white">Tilt-Shift Depth of Field (Miniature Look)</span>
                  </div>
                  <button
                    onClick={onToggleTiltShift}
                    className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                      tiltShiftEnabled
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tiltShiftEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Focus Plane (Village)</span>
                      <span className="font-mono text-[11px] text-slate-300">
                        {Math.round(tiltShiftFocus * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="0.8"
                      step="0.01"
                      value={tiltShiftFocus}
                      onChange={e => onChangeTiltShiftFocus(parseFloat(e.target.value))}
                      disabled={!tiltShiftEnabled}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Tilt-Shift Blur Intensity</span>
                      <span className="font-mono text-[11px] text-slate-300">
                        {(tiltShiftBlur * 1000).toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.001"
                      max="0.008"
                      step="0.0005"
                      value={tiltShiftBlur}
                      onChange={e => onChangeTiltShiftBlur(parseFloat(e.target.value))}
                      disabled={!tiltShiftEnabled}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer disabled:opacity-40"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">ACES Filmic Exposure</span>
                      <span className="font-mono text-[11px] text-slate-300">{exposure.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.7"
                      step="0.05"
                      value={exposure}
                      onChange={e => onChangeExposure(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  * Blur is focused around the central village diorama while blurring extreme foreground cliffs and background clouds. Saturated ACES Filmic mapping guarantees vibrant cartoon shades.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
