import { useCallback, useEffect, useRef, useState } from 'react';
import { initExplorableWorld } from './engine/initExplorableWorld';
import {
  WorldInstance,
  LightingMode,
  CameraBookmark,
  ImageAnalysisResult,
} from './types/world';
import { Header } from './components/Header';
import { ControlsDock } from './components/ControlsDock';
import { ComparisonSlider } from './components/ComparisonSlider';
import { PipelineModal } from './components/PipelineModal';
import { HuntHud } from './components/HuntHud';
import { TreasureStartModal } from './components/TreasureStartModal';
import { TreasureResultModal } from './components/TreasureResultModal';
import { LoyaltyProgramModal } from './components/LoyaltyProgramModal';
import { captureIncomingReferral } from './game/treasureCatalog';
import { TreasureId } from './game/treasureCatalog';
import { useTreasureHunt } from './game/useTreasureHunt';
import { trackEvent } from './game/api';
import { AdminDashboard } from './admin/AdminDashboard';
import { BarChart3, Sparkles, Info, TicketCheck, Coins } from 'lucide-react';

const PRESETS = {
  village: {
    id: 'village',
    title: 'Stylized Floating Island (Original Reference)',
    url: '/images/floating_island_reference.jpg',
    defaultLighting: 'day' as LightingMode,
  },
  autumn: {
    id: 'autumn',
    title: 'Autumn Highland Isle (Golden Reference)',
    url: '/images/autumn_island_reference.jpg',
    defaultLighting: 'golden' as LightingMode,
  },
};

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<WorldInstance | null>(null);

  // Mini-game "Caccia ai Tesori del Borgo"
  const hunt = useTreasureHunt();
  const [isStartModalOpen, setIsStartModalOpen] = useState<boolean>(false);
  const [isResultModalOpen, setIsResultModalOpen] = useState<boolean>(false);
  const [huntHint, setHuntHint] = useState<string | null>(null);
  const revealRef = useRef<(id: TreasureId) => void>(() => {});
  revealRef.current = hunt.reveal;
  const lastActivityRef = useRef<number>(0);
  const markActivity = useCallback(() => {
    lastActivityRef.current = performance.now();
  }, []);

  // App State
  const [activePreset, setActivePreset] = useState<'village' | 'autumn' | 'custom'>('village');
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(PRESETS.village.url);
  const [loadingStage, setLoadingStage] = useState<string>('Synthesizing 3D Diorama...');
  const [loadingPercent, setLoadingPercent] = useState<number>(10);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Camera & Lighting Controls
  const [currentBookmark, setCurrentBookmark] = useState<CameraBookmark>('isometric');
  const [lightingMode, setLightingMode] = useState<LightingMode>('day');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Diorama Optics Post-Processing
  const [tiltShiftEnabled, setTiltShiftEnabled] = useState<boolean>(true);
  const [tiltShiftFocus, setTiltShiftFocus] = useState<number>(0.52);
  const [tiltShiftBlur, setTiltShiftBlur] = useState<number>(0.0035);
  const [exposure, setExposure] = useState<number>(1.1);

  // Dynamics
  const [cloudSpeed, setCloudSpeed] = useState<number>(1.0);
  const [waterSpeed, setWaterSpeed] = useState<number>(1.0);

  // Interactive Tools
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [isPipelineOpen, setIsPipelineOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [adminInitialTab, setAdminInitialTab] = useState<'overview' | 'botteghino'>('overview');
  const [isLoyaltyOpen, setIsLoyaltyOpen] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    if (hunt.error) showToast(hunt.error);
  }, [hunt.error]);

  // Initialize Explorable 3D World
  useEffect(() => {
    if (!canvasRef.current) return;

    setIsLoading(true);
    setLoadingPercent(20);
    setLoadingStage('Initializing WebGL renderer & ACES Tone Mapping...');

    const world = initExplorableWorld(canvasRef.current, currentImageUrl, {
      onProgress: (stage, percent) => {
        setLoadingStage(stage);
        setLoadingPercent(percent);
        if (percent >= 100) {
          setTimeout(() => setIsLoading(false), 300);
        }
      },
      lightingMode: PRESETS.village.defaultLighting,
      enableTiltShift: tiltShiftEnabled,
      tiltShiftFocus,
      tiltShiftBlur,
      autoRotate,
      onTreasureHit: id => {
        markActivity();
        revealRef.current(id as TreasureId);
      },
      onPointerActivity: markActivity,
    });

    worldRef.current = world;

    // Recupera l'analisi quando la ricostruzione è pronta.
    const analysisInterval = setInterval(() => {
      if (worldRef.current) {
        const analysis = worldRef.current.getImageAnalysis();
        if (analysis && !analysisResult) setAnalysisResult(analysis);
      }
    }, 1000);

    return () => {
      clearInterval(analysisInterval);
      world.dispose();
      worldRef.current = null;
    };
  }, []);

  // Sincronizza le figurine 3D con la sessione, applicando solo le differenze:
  // così ogni raccolta mantiene la propria animazione senza ripeterla sulle altre.
  const syncedSessionRef = useRef<number>(-1);
  const collectedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;

    if (syncedSessionRef.current !== hunt.sessionId) {
      syncedSessionRef.current = hunt.sessionId;
      collectedRef.current.clear();
      world.resetTreasures();
    }

    hunt.items.forEach(item => {
      const known = collectedRef.current.has(item.id);
      if (item.revealed && !known) {
        collectedRef.current.add(item.id);
        world.setTreasureCollected(item.id, true);
      } else if (!item.revealed && known) {
        collectedRef.current.delete(item.id);
        world.setTreasureCollected(item.id, false);
      }
    });
  }, [hunt.sessionId, hunt.items]);

  // Durante la caccia l'auto-rotazione è sospesa per non spostare le figurine.
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    if (hunt.phase === 'active') {
      world.setCinematicAutoRotate(false);
      return;
    }
    world.setCinematicAutoRotate(autoRotate);
  }, [hunt.phase, autoRotate]);

  // Auto-rotazione "gentile": riprende solo dopo qualche secondo di inattività.
  useEffect(() => {
    if (!autoRotate || hunt.phase === 'active') return;
    const interval = window.setInterval(() => {
      const idle = performance.now() - lastActivityRef.current > 2600;
      worldRef.current?.setCinematicAutoRotate(idle);
    }, 500);
    return () => window.clearInterval(interval);
  }, [autoRotate, hunt.phase]);

  // Bussola del borgo: suggerisce l'area di una figurina ancora da trovare.
  useEffect(() => {
    if (hunt.phase !== 'active') {
      setHuntHint(null);
      return;
    }

    const refreshHint = () => {
      const remaining = hunt.items.filter(item => !item.revealed);
      if (remaining.length === 0) {
        setHuntHint(null);
        return;
      }
      setHuntHint(remaining[Math.floor(Math.random() * remaining.length)].area);
    };

    refreshHint();
    const interval = window.setInterval(refreshHint, 6000);
    return () => window.clearInterval(interval);
  }, [hunt.phase, hunt.items]);

  // Apre automaticamente la modale risultati a fine sessione.
  useEffect(() => {
    if (hunt.phase === 'completed' && hunt.result) {
      setIsResultModalOpen(true);
    }
  }, [hunt.phase, hunt.result]);

  // Viral loop: il link condiviso (?caccia=1&ref=REF-XXXXX) atterra sul mini-game
  // e viene attribuito a chi lo ha condiviso.
  const [pendingDeepLink, setPendingDeepLink] = useState<boolean>(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    captureIncomingReferral(params.get('ref'));
    if (params.get('caccia') !== '1') return;
    setPendingDeepLink(true);
    params.delete('caccia');
    params.delete('ref');
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    );
  }, []);

  // Mostra la schermata di avvio del mini-game solo a diorama pronto.
  useEffect(() => {
    if (pendingDeepLink && !isLoading) {
      setIsStartModalOpen(true);
      setPendingDeepLink(false);
    }
  }, [pendingDeepLink, isLoading]);

  const handleOpenStartModal = useCallback(() => {
    markActivity();
    trackEvent('start_modal_opened');
    setIsComparing(false);
    setIsPipelineOpen(false);
    setIsStartModalOpen(true);
  }, [markActivity]);

  const handleStartHunt = useCallback(() => {
    setIsStartModalOpen(false);
    setIsResultModalOpen(false);
    setIsComparing(false);
    setIsPipelineOpen(false);
    hunt.start();
  }, [hunt.start]);

  const handleReplayHunt = useCallback(() => {
    setIsResultModalOpen(false);
    worldRef.current?.resetTreasures();
    worldRef.current?.resetCamera();
    hunt.replay();
    setIsStartModalOpen(true);
  }, [hunt.replay]);

  const handleAbandonHunt = useCallback(() => {
    setIsResultModalOpen(false);
    worldRef.current?.resetTreasures();
    hunt.abandon();
  }, [hunt.abandon]);

  // Preset switching
  const handleSelectPreset = async (presetId: string) => {
    if (presetId === 'village' || presetId === 'autumn') {
      setActivePreset(presetId);
      const preset = PRESETS[presetId];
      setCurrentImageUrl(preset.url);
      setLightingMode(preset.defaultLighting);

      if (worldRef.current) {
        worldRef.current.setLightingMode(preset.defaultLighting);
        setIsLoading(true);
        setLoadingStage(`Reconstructing from ${preset.title}...`);
        setLoadingPercent(30);

        try {
          const analysis = await worldRef.current.setReferenceImage(preset.url);
          setAnalysisResult(analysis);
          setLoadingPercent(100);
          setTimeout(() => setIsLoading(false), 200);
          showToast(`Reconstructed from "${preset.title}"`);
        } catch (e) {
          console.error(e);
          setIsLoading(false);
        }
      }
    }
  };

  // Custom User Image Upload
  const handleUploadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = async e => {
      const dataUrl = e.target?.result as string;
      if (dataUrl && worldRef.current) {
        setActivePreset('custom');
        setCurrentImageUrl(dataUrl);
        setIsLoading(true);
        setLoadingStage('Zero-Shot Ingesting Custom Reference Image...');
        setLoadingPercent(25);

        try {
          const analysis = await worldRef.current.setReferenceImage(dataUrl);
          setAnalysisResult(analysis);
          setLoadingPercent(100);
          setTimeout(() => setIsLoading(false), 300);
          showToast('Custom Reference Image Reconstructed Zero-Shot!');
        } catch (err) {
          console.error(err);
          setIsLoading(false);
          showToast('Failed to analyze image');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // Camera Bookmark selection
  const handleSelectBookmark = (bookmark: CameraBookmark) => {
    setCurrentBookmark(bookmark);
    worldRef.current?.setCameraBookmark(bookmark);
  };

  const handleResetPOV = () => {
    setCurrentBookmark('isometric');
    worldRef.current?.resetCamera();
    showToast('Camera locked to Reference Isometric Angle (10, 8, 10)');
  };

  // Lighting selection
  const handleSelectLighting = (mode: LightingMode) => {
    setLightingMode(mode);
    worldRef.current?.setLightingMode(mode);
  };

  // Auto-rotate toggle
  const handleToggleAutoRotate = () => {
    const nextVal = !autoRotate;
    setAutoRotate(nextVal);
    worldRef.current?.setCinematicAutoRotate(nextVal);
  };

  // Tilt-Shift DoF Controls
  const handleToggleTiltShift = () => {
    const nextVal = !tiltShiftEnabled;
    setTiltShiftEnabled(nextVal);
    worldRef.current?.setPostProcessingEnabled(nextVal);
    showToast(nextVal ? 'Tilt-Shift Diorama DoF Enabled' : 'Tilt-Shift DoF Disabled');
  };

  const handleChangeTiltShiftFocus = (val: number) => {
    setTiltShiftFocus(val);
    worldRef.current?.setTiltShiftParams({ focus: val });
  };

  const handleChangeTiltShiftBlur = (val: number) => {
    setTiltShiftBlur(val);
    worldRef.current?.setTiltShiftParams({ maxBlur: val });
  };

  const handleChangeExposure = (val: number) => {
    setExposure(val);
    worldRef.current?.setExposure(val);
  };

  // Speed controls
  const handleChangeCloudSpeed = (val: number) => {
    setCloudSpeed(val);
    worldRef.current?.setCloudSpeed(val);
  };

  const handleChangeWaterSpeed = (val: number) => {
    setWaterSpeed(val);
    worldRef.current?.setWaterFlowSpeed(val);
  };

  // Screenshot / Snapshot
  const handleTakeSnapshot = () => {
    if (!worldRef.current) return;
    const dataUrl = worldRef.current.takeScreenshot();
    const link = document.createElement('a');
    link.download = `aetheria-diorama-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    showToast('High-Res Diorama Snapshot downloaded!');
  };

  // Export 3D GLTF
  const handleExportGLTF = async () => {
    if (!worldRef.current) return;
    showToast('Preparing 3D diorama mesh package...');
    try {
      const blob = await worldRef.current.exportGLTF();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `aetheria-floating-island.gltf`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showToast('3D Diorama GLTF exported successfully!');
    } catch (err) {
      console.error(err);
      showToast('GLTF export error');
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-['Plus_Jakarta_Sans',sans-serif] select-none">
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing outline-none"
      />

      {/* Strumenti immagine: separati dal gioco e nascosti durante il confronto. */}
      {!isComparing && (
        <Header
          activePreset={activePreset}
          onSelectPreset={handleSelectPreset}
          onUploadImage={handleUploadImage}
          onToggleCompare={() => setIsComparing(true)}
          isComparing={isComparing}
          onOpenPipeline={() => setIsPipelineOpen(true)}
          onTakeSnapshot={handleTakeSnapshot}
          onExportGLTF={handleExportGLTF}
          onResetPOV={handleResetPOV}
        />
      )}

      {/* Accesso amministratore e botteghino: sempre separato dai controlli dell'esperienza. */}
      {!isComparing && (
        <div className="absolute right-3 top-3 z-40 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLoyaltyOpen(true)}
            className="flex items-center gap-1.5 rounded-2xl border border-amber-400/50 bg-amber-950/90 px-3 py-2 text-xs font-black text-amber-300 shadow-xl shadow-black/25 backdrop-blur-xl transition hover:bg-amber-900 active:scale-95"
            title="Visualizza saldo punti loyalty, traguardi community e token di impatto"
          >
            <Coins className="h-4 w-4 text-amber-400" />
            <span className="hidden sm:inline">Loyalty & Token</span>
            <span className="sm:hidden">Loyalty</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAdminInitialTab('botteghino');
              setIsAdminOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-2xl border border-emerald-400/40 bg-emerald-950/90 px-3 py-2 text-xs font-black text-emerald-300 shadow-xl shadow-black/25 backdrop-blur-xl transition hover:bg-emerald-900"
            title="Postazione rapida controllo pass botteghino"
          >
            <TicketCheck className="h-4 w-4 text-emerald-400" />
            <span>Botteghino</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAdminInitialTab('overview');
              setIsAdminOpen(true);
            }}
            className="flex items-center gap-2 rounded-2xl border border-emerald-300/30 bg-slate-950/90 p-2 text-xs font-extrabold text-white shadow-xl shadow-black/25 backdrop-blur-xl transition hover:bg-emerald-900 sm:px-3"
            title="Apri la dashboard amministratore"
          >
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
        </div>
      )}

      {/* Comandi di gioco: pannello laterale indipendente dagli strumenti 3D. */}
      {!isComparing && (
        <aside className="pointer-events-none absolute right-3 top-[4.5rem] z-30 max-w-[calc(100vw-1.5rem)] lg:max-w-[24rem]">
          <HuntHud
            phase={hunt.phase}
            score={hunt.score}
            foundCount={hunt.foundCount}
            totalCount={hunt.totalCount}
            deadline={hunt.deadline}
            durationMs={hunt.durationMs}
            result={hunt.result}
            record={hunt.record}
            muted={hunt.muted}
            feed={hunt.feed}
            hint={huntHint}
            comboEvent={hunt.comboEvent}
            comboBonus={hunt.comboBonus}
            onOpenStart={handleOpenStartModal}
            onReplay={handleReplayHunt}
            onAbandon={handleAbandonHunt}
            onToggleMute={hunt.toggleMute}
            onOpenResult={() => setIsResultModalOpen(true)}
          />
        </aside>
      )}

      {/* Comparison Split Slider Overlay */}
      {isComparing && (
        <ComparisonSlider
          referenceImageUrl={currentImageUrl}
          onClose={() => setIsComparing(false)}
          onAlignCamera={handleResetPOV}
        />
      )}

      {/* Bottom Controls Dock: solo manipolazione della scena. */}
      {!isComparing && <ControlsDock
        currentBookmark={currentBookmark}
        onSelectBookmark={handleSelectBookmark}
        lightingMode={lightingMode}
        onSelectLighting={handleSelectLighting}
        autoRotate={autoRotate}
        onToggleAutoRotate={handleToggleAutoRotate}
        tiltShiftEnabled={tiltShiftEnabled}
        onToggleTiltShift={handleToggleTiltShift}
        tiltShiftFocus={tiltShiftFocus}
        onChangeTiltShiftFocus={handleChangeTiltShiftFocus}
        tiltShiftBlur={tiltShiftBlur}
        onChangeTiltShiftBlur={handleChangeTiltShiftBlur}
        exposure={exposure}
        onChangeExposure={handleChangeExposure}
        cloudSpeed={cloudSpeed}
        onChangeCloudSpeed={handleChangeCloudSpeed}
        waterSpeed={waterSpeed}
        onChangeWaterSpeed={handleChangeWaterSpeed}
      />}

      {/* Zero-Shot Pipeline Modal */}
      <PipelineModal
        isOpen={isPipelineOpen}
        onClose={() => setIsPipelineOpen(false)}
        analysis={analysisResult}
        referenceImageUrl={currentImageUrl}
      />

      {/* Mini-game: modale di avvio e schermata finale */}
      <TreasureStartModal
        isOpen={isStartModalOpen && hunt.phase !== 'completed'}
        items={hunt.items}
        record={hunt.record}
        onStart={handleStartHunt}
        onClose={() => setIsStartModalOpen(false)}
      />

      <TreasureResultModal
        isOpen={isResultModalOpen && hunt.phase === 'completed'}
        result={hunt.result}
        items={hunt.items}
        onReplay={handleReplayHunt}
        onClose={() => setIsResultModalOpen(false)}
        onClaim={hunt.claimVouchers}
        onOpenLoyalty={() => setIsLoyaltyOpen(true)}
      />

      <LoyaltyProgramModal
        isOpen={isLoyaltyOpen}
        onClose={() => setIsLoyaltyOpen(false)}
        referralId={hunt.result?.referralId}
      />

      {isAdminOpen && <AdminDashboard onClose={() => setIsAdminOpen(false)} initialTab={adminInitialTab} />}

      {/* Loading Overlay */}
      {isLoading && !isAdminOpen && (
        <div className="absolute inset-0 z-40 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/30 animate-pulse">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="absolute -inset-1 rounded-2xl border border-cyan-400/30 animate-ping pointer-events-none" />
          </div>

          <h3 className="text-xl font-bold text-white mb-2">Reconstructing 3D Diorama</h3>
          <p className="text-xs text-slate-400 mb-5 font-mono max-w-sm">{loadingStage}</p>

          <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
              style={{ width: `${loadingPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-slate-900/95 border border-cyan-500/50 backdrop-blur-md rounded-2xl px-4 py-2 text-xs font-semibold text-white shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

export default App;
