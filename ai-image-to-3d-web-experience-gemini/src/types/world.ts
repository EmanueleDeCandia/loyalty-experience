export type LightingMode = 'day' | 'golden' | 'night' | 'overcast';

export type CameraBookmark = 'isometric' | 'village' | 'waterfall' | 'windmill' | 'cliffs' | 'topdown';

export interface WorldOptions {
  onProgress?: (stage: string, percent: number) => void;
  lightingMode?: LightingMode;
  enableTiltShift?: boolean;
  tiltShiftFocus?: number;
  tiltShiftBlur?: number;
  autoRotate?: boolean;
  autoRotateSpeed?: number;
  onObjectSelect?: (objectInfo: SelectedObjectInfo | null) => void;
  /** Tap diretto su una figurina del mini-game "Caccia ai Tesori". */
  onTreasureHit?: (treasureId: string) => void;
  /** Qualsiasi interazione utente sul canvas (usata per sospendere l'auto-rotazione). */
  onPointerActivity?: () => void;
}

/** Proiezione a schermo di un hotspot/figurina del mini-game. */
export interface HotspotProjection {
  id: string;
  /** Coordinate in pixel CSS relative al canvas. */
  x: number;
  y: number;
  /** Distanza dalla camera in unità mondo. */
  depth: number;
  /** True se il punto è davanti alla camera e dentro il viewport (con margine). */
  visible: boolean;
  /** True se la figurina è coperta da terreno, muri o alberi del borgo. */
  occluded: boolean;
  /** Fattore di scala prospettico suggerito per il marker DOM. */
  scale: number;
}

export interface SelectedObjectInfo {
  type: 'house' | 'windmill' | 'waterfall' | 'bridge' | 'tree' | 'cliff' | 'airship' | 'boat';
  title: string;
  description: string;
  position: [number, number, number];
}

export interface ImageAnalysisResult {
  dominantColors: {
    sky: string;
    grass: string;
    roof: string;
    rock: string;
    water: string;
  };
  brightness: number;
  contrast: number;
  estimatedComplexity: number;
  depthMapUrl?: string;
  segmentationZones: {
    vegetation: number;
    water: number;
    buildings: number;
    rock: number;
    sky: number;
  };
}

export interface WorldInstance {
  dispose: () => void;
  resetCamera: () => void;
  setCameraBookmark: (bookmark: CameraBookmark) => void;
  setLightingMode: (mode: LightingMode) => void;
  setPostProcessingEnabled: (enabled: boolean) => void;
  setTiltShiftParams: (params: { focus?: number; maxBlur?: number }) => void;
  setExposure: (exposure: number) => void;
  setCloudSpeed: (speed: number) => void;
  setWaterFlowSpeed: (speed: number) => void;
  setCinematicAutoRotate: (enabled: boolean) => void;
  takeScreenshot: () => string;
  exportGLTF: () => Promise<Blob>;
  getStats: () => { fps: number; drawCalls: number; triangles: number };
  setReferenceImage: (imagePathOrDataUrl: string) => Promise<ImageAnalysisResult>;
  getImageAnalysis: () => ImageAnalysisResult | null;
  /** Proietta a schermo gli hotspot richiesti (usato dal layer dei tesori). */
  getHotspotProjection: (ids: string[]) => HotspotProjection[];
  /** Dimensioni in pixel CSS del canvas di rendering. */
  getViewport: () => { width: number; height: number };
  setTreasureCollected: (id: string, collected: boolean) => void;
  setTreasureHovered: (id: string | null) => void;
  resetTreasures: () => void;
}
