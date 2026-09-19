export type LightingMode = 'day' | 'golden' | 'night' | 'overcast';

export type CameraBookmark = 'isometric' | 'village' | 'waterfall' | 'windmill' | 'cliffs' | 'topdown';

export interface WorldOptions {
  onProgress?: (stage: string, percent: number) => void;
  lightingMode?: LightingMode;
  enableTiltShift?: boolean;
  tiltShiftFocus?: number;
  tiltShiftBlur?: number;
  autoRotate?: boolean;
  onObjectSelect?: (objectInfo: SelectedObjectInfo | null) => void;
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
}
