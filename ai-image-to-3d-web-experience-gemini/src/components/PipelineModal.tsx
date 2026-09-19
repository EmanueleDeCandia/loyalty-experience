import React from 'react';
import { X, Cpu, Layers, CheckCircle2, Box, Eye, Palette } from 'lucide-react';
import { ImageAnalysisResult } from '../types/world';

interface PipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ImageAnalysisResult | null;
  referenceImageUrl: string;
}

export const PipelineModal: React.FC<PipelineModalProps> = ({
  isOpen,
  onClose,
  analysis,
  referenceImageUrl,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-black/60 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Zero-Shot Image-to-3D Pipeline</span>
                <span className="text-xs font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                  AI Reconstruction
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Spatial reasoning, depth estimation, and 360° diorama geometry synthesis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reconstruction Pipeline Steps */}
        <div className="mt-6 space-y-6">
          {/* Step 1 & 2: Image Ingestion & Depth Map */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Image */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>Input Reference Image</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  2D Art Ingested
                </span>
              </div>
              <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-700/60 bg-black">
                <img
                  src={referenceImageUrl}
                  alt="Reference Input"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Extracted Depth / Elevation Map */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>Monocular Depth & Elevation</span>
                </span>
                <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                  Estimated Field
                </span>
              </div>
              <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-700/60 bg-black flex items-center justify-center">
                {analysis?.depthMapUrl ? (
                  <img
                    src={analysis.depthMapUrl}
                    alt="Depth Estimation Map"
                    className="w-full h-full object-cover filter contrast-125"
                  />
                ) : (
                  <div className="text-xs text-slate-500">Generating depth projection...</div>
                )}
              </div>
            </div>
          </div>

          {/* Extracted Palette & Semantics */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-amber-400" />
                <span>Extracted Color Palette & Material Bindings</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Luminance: {analysis?.brightness || 74}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {analysis?.dominantColors ? (
                <>
                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-2.5 flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg shadow-sm border border-white/20"
                      style={{ backgroundColor: analysis.dominantColors.grass }}
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Lush Grass</div>
                      <div className="text-[10px] font-mono text-slate-400">Plateau</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-2.5 flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg shadow-sm border border-white/20"
                      style={{ backgroundColor: analysis.dominantColors.roof }}
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Terracotta</div>
                      <div className="text-[10px] font-mono text-slate-400">Roofs</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-2.5 flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg shadow-sm border border-white/20"
                      style={{ backgroundColor: analysis.dominantColors.water }}
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Aqua Cyan</div>
                      <div className="text-[10px] font-mono text-slate-400">River & Falls</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-2.5 flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg shadow-sm border border-white/20"
                      style={{ backgroundColor: analysis.dominantColors.rock }}
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Cliff Rock</div>
                      <div className="text-[10px] font-mono text-slate-400">Vertical Strata</div>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-2.5 flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-lg shadow-sm border border-white/20"
                      style={{ backgroundColor: analysis.dominantColors.sky }}
                    />
                    <div>
                      <div className="text-xs font-bold text-white">Sky Gradient</div>
                      <div className="text-[10px] font-mono text-slate-400">Atmosphere</div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 col-span-5">Extracting dominant colors...</div>
              )}
            </div>
          </div>

          {/* Reconstruction Features Matrix */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Box className="w-4 h-4 text-emerald-400" />
              <span>Pipeline Specifications & Constraints Met</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">The Core Island:</span>
                  <p className="text-slate-400 text-[11px]">
                    Spherical chunk with vertical rocky cliffs, stalactite underside, and dangling roots.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">Water Feature:</span>
                  <p className="text-slate-400 text-[11px]">
                    Winding river flowing through village, culminating in plunging waterfall with spray particles.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">High Density Village:</span>
                  <p className="text-slate-400 text-[11px]">
                    30+ terracotta cottages, animated hilltop windmill, bridges, lanterns, and chimney smoke.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">Seamless 360° Backside:</span>
                  <p className="text-slate-400 text-[11px]">
                    Infilled cliffside trails, back cottages, and conifer crags to prevent flat untextured geometry.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">Tilt-Shift & Tone Mapping:</span>
                  <p className="text-slate-400 text-[11px]">
                    Miniature diorama DoF blur + THREE.ACESFilmicToneMapping (exposure: 1.1).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-200">Performance & Controls:</span>
                  <p className="text-slate-400 text-[11px]">
                    Isometric POV (10, 8, 10), minDistance=5, maxDistance=25, 60 FPS budget.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
          >
            Return to 3D Exploration
          </button>
        </div>
      </div>
    </div>
  );
};
