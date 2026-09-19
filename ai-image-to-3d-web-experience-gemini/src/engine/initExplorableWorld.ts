import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

import { WorldInstance, WorldOptions, LightingMode, CameraBookmark, ImageAnalysisResult, SelectedObjectInfo, HotspotProjection } from '../types/world';
import { TiltShiftShader } from './shaders/TiltShiftShader';
import { buildIsland } from './procedural/IslandBuilder';
import { buildWater } from './procedural/WaterBuilder';
import { buildVillage } from './procedural/VillageBuilder';
import { buildFoliage } from './procedural/FoliageBuilder';
import { buildAtmosphere } from './procedural/AtmosphereBuilder';
import { buildTreasureHunt } from './procedural/TreasureBuilder';
import { analyzeReferenceImage } from './analysis/imageProcessor';

export function initExplorableWorld(
  canvasElement: HTMLCanvasElement,
  imageInputPath: string,
  options: WorldOptions = {}
): WorldInstance {
  // 1. Renderer Setup
  const renderer = new THREE.WebGLRenderer({
    canvas: canvasElement,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });

  const width = canvasElement.parentElement?.clientWidth || window.innerWidth;
  const height = canvasElement.parentElement?.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Required Tone Mapping: ACESFilmicToneMapping with exposure = 1.1
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // Shadow Maps
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 2. Scene & Camera Setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xb5e7ff);

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  // Required initial camera position: isometric angle (10, 8, 10) looking down at the center
  camera.position.set(10, 8, 10);
  camera.lookAt(0, 0.2, 0);

  // 3. OrbitControls with strict constraints
  const controls = new OrbitControls(camera, canvasElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  // Required constraints: minDistance = 5, maxDistance = 25
  controls.minDistance = 5;
  controls.maxDistance = 25;
  controls.target.set(0, 0.2, 0);
  controls.maxPolarAngle = Math.PI / 2 + 0.25; // Prevent camera from getting lost under the abyss

  const autoRotateSpeed = options.autoRotateSpeed ?? 0.8;

  if (options.autoRotate) {
    controls.autoRotate = true;
    controls.autoRotateSpeed = autoRotateSpeed;
  }

  // 4. Lighting Rig
  // Strong directional light mimicking the sun from upper right (12, 16, 10)
  const dirLight = new THREE.DirectionalLight(0xfff6e6, 2.2);
  dirLight.position.set(12, 16, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 40;
  dirLight.shadow.camera.left = -9;
  dirLight.shadow.camera.right = 9;
  dirLight.shadow.camera.top = 9;
  dirLight.shadow.camera.bottom = -9;
  dirLight.shadow.bias = -0.0004;
  dirLight.shadow.radius = 2.5; // Soft shadow filter
  scene.add(dirLight);

  // Bright hemisphere light (Sky: soft light blue, Ground: soft green reflection)
  const hemiLight = new THREE.HemisphereLight(0xbde7ff, 0x5a8a42, 1.25);
  hemiLight.position.set(0, 20, 0);
  scene.add(hemiLight);

  // Ambient fill
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(ambientLight);

  // 5. Post-Processing Setup (Tilt-Shift DoF Diorama effect)
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const tiltShiftPass = new ShaderPass(TiltShiftShader);
  tiltShiftPass.uniforms.focusPos.value = options.tiltShiftFocus ?? 0.52;
  tiltShiftPass.uniforms.blurStrength.value = options.tiltShiftBlur ?? 0.0035;
  tiltShiftPass.uniforms.resolution.value.set(width, height);
  tiltShiftPass.uniforms.enabled.value = (options.enableTiltShift !== false) ? 1.0 : 0.0;
  composer.addPass(tiltShiftPass);

  // 6. World Assembly
  const island = buildIsland();
  const water = buildWater(island.getRiverPathPoint);
  const village = buildVillage();
  const foliage = buildFoliage();
  const atmosphere = buildAtmosphere();
  const treasure = buildTreasureHunt();

  scene.add(island.group);
  scene.add(water.group);
  scene.add(village.group);
  scene.add(foliage.group);
  scene.add(atmosphere.group);
  scene.add(treasure.group);

  // Insiemi di mesh "solide" usate per capire se una figurina è coperta dal borgo.
  const occluders: THREE.Object3D[] = [];
  const collectOccluders = (root: THREE.Object3D) => {
    root.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      // Fumo, petali, vetri trasparenti non devono nascondere i tesori.
      if (materials.length === 0) return;
      if (materials.some(m => !m || m.transparent || m.visible === false)) return;
      occluders.push(mesh);
    });
  };
  collectOccluders(island.group);
  collectOccluders(village.group);
  collectOccluders(foliage.group);

  let latestAnalysis: ImageAnalysisResult | null = null;

  // Process reference image zero-shot
  options.onProgress?.('Parsing reference image & depth features...', 25);
  analyzeReferenceImage(imageInputPath)
    .then(analysis => {
      latestAnalysis = analysis;
      options.onProgress?.('Extracting palette & semantics...', 65);

      // Re-tint materials dynamically based on the input image
      if (analysis.dominantColors) {
        island.materials.grass.color.set(analysis.dominantColors.grass);
        island.materials.cliff.color.set(analysis.dominantColors.rock);
      }
      options.onProgress?.('Interactive 3D Diorama Ready', 100);
    })
    .catch(err => {
      console.warn('Reference image analysis notice:', err);
      options.onProgress?.('Interactive 3D Diorama Ready', 100);
    });

  // Collect interactive objects for raycasting click selection
  const getClickableObjects = (): THREE.Object3D[] => {
    return [
      ...village.interactiveObjects,
      ...foliage.interactiveObjects,
      ...atmosphere.interactiveObjects,
    ];
  };

  // Raycaster for user inspection
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  const onPointerDown = (event: MouseEvent) => {
    // Only handle primary left click without dragging
    if (event.button !== 0) return;
    const rect = canvasElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    // Tap diretto su una figurina del mini-game (priorità massima)
    const treasureHits = raycaster.intersectObjects(treasure.pickTargets, false);
    if (treasureHits.length > 0) {
      const treasureId = treasureHits[0].object.userData?.treasureId as string | undefined;
      if (treasureId) {
        options.onTreasureHit?.(treasureId);
        return;
      }
    }

    const intersects = raycaster.intersectObjects(getClickableObjects(), true);

    if (intersects.length > 0) {
      // Find top parent with userData
      let target: THREE.Object3D | null = intersects[0].object;
      while (target && (!target.userData || !target.userData.title)) {
        target = target.parent;
      }

      if (target && target.userData && target.userData.title) {
        const info: SelectedObjectInfo = {
          type: target.userData.type || 'house',
          title: target.userData.title,
          description: target.userData.description,
          position: target.userData.position || [0, 0, 0],
        };
        options.onObjectSelect?.(info);
        return;
      }
    }

    options.onObjectSelect?.(null);
  };

  canvasElement.addEventListener('click', onPointerDown);

  // Notifica attività utente (usata per sospendere l'auto-rotazione durante la caccia).
  // In fase di capture: l'OrbitControls ferma la propagazione degli eventi pointer.
  const onPointerActivity = () => {
    options.onPointerActivity?.();
  };
  canvasElement.addEventListener('pointerdown', onPointerActivity, { capture: true });
  canvasElement.addEventListener('wheel', onPointerActivity, { capture: true, passive: true });

  // Resize handler
  const onResize = () => {
    const parent = canvasElement.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    tiltShiftPass.uniforms.resolution.value.set(w, h);
  };

  window.addEventListener('resize', onResize);

  // --- Mini-game hotspots: proiezione a schermo + occlusion test -------------
  const hotspotRaycaster = new THREE.Raycaster();
  const projected = new THREE.Vector3();
  const worldPosition = new THREE.Vector3();
  const rayDirection = new THREE.Vector3();

  // L'occlusione è costosa (9 raggi contro ~580 mesh): calcolata a frame alterni
  // e riusata per il frame successivo, senza differenze percebibili.
  const occlusionCache = new Map<string, boolean>();
  let projectionTick = 0;

  const getHotspotProjection = (ids: string[]): HotspotProjection[] => {
    const parent = canvasElement.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    const margin = 90;
    const runOcclusion = projectionTick % 2 === 0;
    projectionTick += 1;

    return ids.map(id => {
      const anchor = treasure.getMarkerAnchor(id);
      if (!anchor) {
        return { id, x: 0, y: 0, depth: 0, visible: false, occluded: true, scale: 1 };
      }

      anchor.getWorldPosition(worldPosition);
      const depth = camera.position.distanceTo(worldPosition);

      projected.copy(worldPosition).project(camera);
      const inFront = projected.z < 1;
      const x = (projected.x * 0.5 + 0.5) * w;
      const y = (-projected.y * 0.5 + 0.5) * h;
      const onScreen = x > -margin && x < w + margin && y > -margin && y < h + margin;

      let occluded = occlusionCache.get(id) ?? false;
      if (inFront && runOcclusion) {
        hotspotRaycaster.near = 0.1;
        hotspotRaycaster.far = Math.max(0.2, depth - 0.35);
        hotspotRaycaster.set(
          camera.position,
          rayDirection.copy(worldPosition).sub(camera.position).normalize()
        );
        occluded = hotspotRaycaster.intersectObjects(occluders, false).length > 0;
        occlusionCache.set(id, occluded);
      }

      // Scala prospettica: le figurine vicine risultano più grandi.
      const scale = THREE.MathUtils.clamp(1.14 - (depth - 9.5) * 0.022, 0.78, 1.16);

      return {
        id,
        x,
        y,
        depth,
        visible: inFront && onScreen,
        occluded: occluded || !inFront || !onScreen,
        scale,
      };
    });
  };

  // Stats calculation
  let fps = 60;
  let frameCount = 0;
  let lastStatsTime = performance.now();
  let triangleCount = 0;

  // Count initial scene triangles
  scene.traverse(obj => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      triangleCount += obj.geometry.index
        ? obj.geometry.index.count / 3
        : (obj.geometry.attributes.position ? obj.geometry.attributes.position.count / 3 : 0);
    }
  });

  // Render loop
  const clock = new THREE.Clock();
  let animationFrameId: number;
  let isDisposed = false;

  const animate = () => {
    if (isDisposed) return;
    animationFrameId = requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.1);

    // Update animations
    controls.update();
    water.update(delta);
    village.update(delta);
    foliage.update(delta);
    atmosphere.update(delta);
    treasure.update(delta, clock.elapsedTime);

    // Render with post-processing (or standard renderer if composer disabled)
    if (tiltShiftPass.uniforms.enabled.value > 0.5) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }

    // FPS calculation
    frameCount++;
    const now = performance.now();
    if (now - lastStatsTime >= 1000) {
      fps = Math.round((frameCount * 1000) / (now - lastStatsTime));
      frameCount = 0;
      lastStatsTime = now;
    }
  };

  animate();

  // Camera Bookmark Transitions
  const targetCamPos = new THREE.Vector3().copy(camera.position);
  const targetCamLook = new THREE.Vector3().copy(controls.target);
  let isTransitioning = false;
  let transitionProgress = 0;
  const startCamPos = new THREE.Vector3();
  const startCamLook = new THREE.Vector3();

  const bookmarkPositions: Record<CameraBookmark, { pos: THREE.Vector3; target: THREE.Vector3 }> = {
    isometric: {
      pos: new THREE.Vector3(10, 8, 10),
      target: new THREE.Vector3(0, 0.2, 0),
    },
    village: {
      pos: new THREE.Vector3(3.5, 2.2, 3.8),
      target: new THREE.Vector3(1.2, 0.5, 0.8),
    },
    waterfall: {
      pos: new THREE.Vector3(-6.2, 1.8, 3.5),
      target: new THREE.Vector3(-3.2, 0.2, 1.6),
    },
    windmill: {
      pos: new THREE.Vector3(5.2, 3.6, -1.0),
      target: new THREE.Vector3(3.2, 1.2, -2.0),
    },
    cliffs: {
      pos: new THREE.Vector3(-1.5, -4.5, 7.5),
      target: new THREE.Vector3(0, -1.5, 0),
    },
    topdown: {
      pos: new THREE.Vector3(0.01, 14.0, 0.01),
      target: new THREE.Vector3(0, 0, 0),
    },
  };

  const smoothCameraTransition = (toPos: THREE.Vector3, toTarget: THREE.Vector3) => {
    startCamPos.copy(camera.position);
    startCamLook.copy(controls.target);
    targetCamPos.copy(toPos);
    targetCamLook.copy(toTarget);
    isTransitioning = true;
    transitionProgress = 0;

    const transitionStep = () => {
      if (!isTransitioning || isDisposed) return;
      transitionProgress += 0.04;
      const ease = 0.5 - Math.cos(Math.min(1, transitionProgress) * Math.PI) / 2;

      camera.position.lerpVectors(startCamPos, targetCamPos, ease);
      controls.target.lerpVectors(startCamLook, targetCamLook, ease);

      if (transitionProgress < 1.0) {
        requestAnimationFrame(transitionStep);
      } else {
        isTransitioning = false;
      }
    };
    transitionStep();
  };

  // Lighting Mode Configurations
  const setLightingMode = (mode: LightingMode) => {
    switch (mode) {
      case 'day':
        dirLight.position.set(12, 16, 10);
        dirLight.color.set(0xfff6e6);
        dirLight.intensity = 2.2;
        hemiLight.color.set(0xbde7ff);
        hemiLight.groundColor.set(0x5a8a42);
        hemiLight.intensity = 1.25;
        scene.background = new THREE.Color(0xb5e7ff);
        atmosphere.setSkyColors(new THREE.Color(0x76b6fe), new THREE.Color(0xd7f1ff));
        village.setNightMode(false);
        break;

      case 'golden':
        dirLight.position.set(14, 8, 8);
        dirLight.color.set(0xffa14a);
        dirLight.intensity = 2.8;
        hemiLight.color.set(0xffd5a5);
        hemiLight.groundColor.set(0x6b4528);
        hemiLight.intensity = 1.1;
        scene.background = new THREE.Color(0xffca9e);
        atmosphere.setSkyColors(new THREE.Color(0xf5794a), new THREE.Color(0xffd79e));
        village.setNightMode(false);
        break;

      case 'night':
        dirLight.position.set(-6, 12, -8);
        dirLight.color.set(0x799aff);
        dirLight.intensity = 0.6;
        hemiLight.color.set(0x19284d);
        hemiLight.groundColor.set(0x0e1b12);
        hemiLight.intensity = 0.7;
        scene.background = new THREE.Color(0x0d1527);
        atmosphere.setSkyColors(new THREE.Color(0x0a1020), new THREE.Color(0x1a2a4d));
        village.setNightMode(true);
        break;

      case 'overcast':
        dirLight.position.set(5, 15, 5);
        dirLight.color.set(0xdde3ea);
        dirLight.intensity = 1.4;
        hemiLight.color.set(0xccd6e0);
        hemiLight.groundColor.set(0x4a5d40);
        hemiLight.intensity = 1.2;
        scene.background = new THREE.Color(0xcad4df);
        atmosphere.setSkyColors(new THREE.Color(0x9faec0), new THREE.Color(0xdde5ed));
        village.setNightMode(false);
        break;
    }
  };

  if (options.lightingMode) {
    setLightingMode(options.lightingMode);
  }

  // Public World Instance API
  return {
    dispose: () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', onResize);
      canvasElement.removeEventListener('click', onPointerDown);
      canvasElement.removeEventListener('pointerdown', onPointerActivity, { capture: true });
      canvasElement.removeEventListener('wheel', onPointerActivity, { capture: true });
      controls.dispose();
      renderer.dispose();
      composer.dispose();
    },

    resetCamera: () => {
      smoothCameraTransition(new THREE.Vector3(10, 8, 10), new THREE.Vector3(0, 0.2, 0));
    },

    setCameraBookmark: (bookmark: CameraBookmark) => {
      const targetConfig = bookmarkPositions[bookmark];
      if (targetConfig) {
        smoothCameraTransition(targetConfig.pos, targetConfig.target);
      }
    },

    setLightingMode,

    setPostProcessingEnabled: (enabled: boolean) => {
      tiltShiftPass.uniforms.enabled.value = enabled ? 1.0 : 0.0;
    },

    setTiltShiftParams: (params: { focus?: number; maxBlur?: number }) => {
      if (params.focus !== undefined) {
        tiltShiftPass.uniforms.focusPos.value = params.focus;
      }
      if (params.maxBlur !== undefined) {
        tiltShiftPass.uniforms.blurStrength.value = params.maxBlur;
      }
    },

    setExposure: (exposure: number) => {
      renderer.toneMappingExposure = exposure;
    },

    setCloudSpeed: (speed: number) => {
      atmosphere.setCloudSpeed(speed);
    },

    setWaterFlowSpeed: (speed: number) => {
      water.setFlowSpeed(speed);
    },

    setCinematicAutoRotate: (enabled: boolean) => {
      controls.autoRotate = enabled;
      controls.autoRotateSpeed = autoRotateSpeed;
    },

    takeScreenshot: () => {
      if (tiltShiftPass.uniforms.enabled.value > 0.5) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
      return canvasElement.toDataURL('image/png');
    },

    exportGLTF: async (): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        const exporter = new GLTFExporter();
        const exportScene = new THREE.Scene();

        // Clone relevant island structures
        exportScene.add(island.group.clone());
        exportScene.add(water.group.clone());
        exportScene.add(village.group.clone());
        exportScene.add(foliage.group.clone());

        exporter.parse(
          exportScene,
          (gltf) => {
            const blob = new Blob([JSON.stringify(gltf, null, 2)], { type: 'application/json' });
            resolve(blob);
          },
          (err) => reject(err),
          { binary: false }
        );
      });
    },

    getStats: () => {
      return {
        fps,
        drawCalls: renderer.info.render.calls,
        triangles: triangleCount,
      };
    },

    setReferenceImage: async (imagePathOrDataUrl: string) => {
      const analysis = await analyzeReferenceImage(imagePathOrDataUrl);
      latestAnalysis = analysis;
      if (analysis.dominantColors) {
        island.materials.grass.color.set(analysis.dominantColors.grass);
        island.materials.cliff.color.set(analysis.dominantColors.rock);
      }
      return analysis;
    },

    getImageAnalysis: () => latestAnalysis,

    getHotspotProjection,

    getViewport: () => ({
      width: canvasElement.parentElement?.clientWidth || window.innerWidth,
      height: canvasElement.parentElement?.clientHeight || window.innerHeight,
    }),

    setTreasureCollected: (id: string, collected: boolean) => {
      treasure.setCollected(id, collected);
    },

    setTreasureHovered: (id: string | null) => {
      treasure.setHovered(id);
    },

    resetTreasures: () => {
      treasure.reset();
    },
  };
}
