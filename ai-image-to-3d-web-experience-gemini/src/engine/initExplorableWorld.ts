import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

import { WorldInstance, WorldOptions, LightingMode, CameraBookmark, ImageAnalysisResult, SelectedObjectInfo } from '../types/world';
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
  // Il posizionamento dei tesori ha bisogno di matrici aggiornate e del suolo reale.
  island.group.updateMatrixWorld(true);
  village.group.updateMatrixWorld(true);
  foliage.group.updateMatrixWorld(true);

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


  const groundMeshes: THREE.Object3D[] = [];
  island.group.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.material === island.materials.grass) groundMeshes.push(mesh);
  });

  const groundRaycaster = new THREE.Raycaster();
  const downDirection = new THREE.Vector3(0, -1, 0);

  /** Altezza del prato sotto (x, z) letta dal mesh dell'isola. */
  const sampleGround = (x: number, z: number): number | null => {
    groundRaycaster.set(new THREE.Vector3(x, 6, z), downDirection);
    groundRaycaster.near = 0;
    groundRaycaster.far = 12;
    const hit = groundRaycaster.intersectObjects(groundMeshes, false)[0];
    return hit ? hit.point.y : null;
  };

  // Angolazioni di vista tipiche attorno al borgo (la prima è la POV isometrica
  // di riferimento): una figurina è "trovabile" se è libera da ostacoli da alcune
  // di queste direzioni — mimetizzata sì, ma non irreperibile.
  const approachEyes: THREE.Vector3[] = [45, 0, 90, 180, 270, 135, 225, 315].map(degrees => {
    const radians = THREE.MathUtils.degToRad(degrees);
    return new THREE.Vector3(Math.cos(radians) * 10.6, 8.2, Math.sin(radians) * 10.6);
  });

  const approachRaycaster = new THREE.Raycaster();
  const approachDirection = new THREE.Vector3();

  const countClearApproaches = (x: number, y: number, z: number): number => {
    const point = new THREE.Vector3(x, y + 0.12, z);
    let clear = 0;
    for (const eye of approachEyes) {
      const distance = eye.distanceTo(point);
      approachRaycaster.near = 0.1;
      approachRaycaster.far = Math.max(0.2, distance - 0.05);
      approachRaycaster.set(eye, approachDirection.copy(point).sub(eye).normalize());
      if (approachRaycaster.intersectObjects(occluders, false).length === 0) clear += 1;
    }
    return clear;
  };

  const treasure = buildTreasureHunt({
    obstacles: village.getPlacementObstacles(),
    natureColliders: foliage.getPlacementColliders(),
    sampleGround,
    countClearApproaches,
  });

  scene.add(island.group);
  scene.add(water.group);
  scene.add(village.group);
  scene.add(foliage.group);
  scene.add(atmosphere.group);
  scene.add(treasure.group);

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

  /**
   * True se la figurina è effettivamente in vista: nessun muro, tetto, tronco o
   * cespuglio fra la camera e l'oggetto. Evita di "raccogliere" tesori nascosti
   * toccando alla cieca dove si trova l'oggetto coperto.
   */
  const treasureCenter = new THREE.Vector3();

  const isClearLine = (point: THREE.Vector3, margin: number): boolean => {
    const distance = camera.position.distanceTo(point);
    if (distance < 0.6) return true;
    hotspotRaycaster.near = 0.1;
    hotspotRaycaster.far = Math.max(0.2, distance - margin);
    hotspotRaycaster.set(camera.position, rayDirection.copy(point).sub(camera.position).normalize());
    return hotspotRaycaster.intersectObjects(occluders, false).length === 0;
  };

  /**
   * La figurina è raccoglibile solo se è davvero in vista. Si accetta anche la
   * linea di vista verso il centro dell'oggetto: se il dito sfiora una foglia
   * vicino al bordo, il tocco resta valido.
   */
  const isTreasureVisible = (target: THREE.Intersection): boolean => {
    if (target.distance < 0.6) return true;
    if (isClearLine(target.point, 0.04)) return true;
    target.object.getWorldPosition(treasureCenter);
    return isClearLine(treasureCenter, 0.04);
  };

  const pickTreasure = (): string | null => {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(treasure.pickTargets, false);
    for (const hit of hits) {
      const treasureId = hit.object.userData?.treasureId as string | undefined;
      if (!treasureId) continue;
      if (isTreasureVisible(hit)) return treasureId;
    }
    return null;
  };

  const onPointerDown = (event: MouseEvent) => {
    // Only handle primary left click without dragging
    if (event.button !== 0) return;
    // Ignora i click generati da un trascinamento della camera
    if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 6) return;

    const rect = canvasElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Tap diretto su una figurina del mini-game (priorità massima)
    const treasureId = pickTreasure();
    if (treasureId) {
      options.onTreasureHit?.(treasureId);
      return;
    }

    raycaster.setFromCamera(mouse, camera);
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
  const pointerStart = { x: -999, y: -999 };
  let hoverDirty = false;
  let hoveredTreasure: string | null = null;

  const onPointerDownActivity = (event: PointerEvent) => {
    pointerStart.x = event.clientX;
    pointerStart.y = event.clientY;
    options.onPointerActivity?.();
  };

  const onWheelActivity = () => {
    options.onPointerActivity?.();
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = canvasElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    hoverDirty = true;
    options.onPointerActivity?.();
  };

  const onPointerLeave = () => {
    hoverDirty = false;
    if (hoveredTreasure !== null) {
      hoveredTreasure = null;
      treasure.handles.forEach(handle => handle.setHovered(false));
      canvasElement.style.cursor = '';
    }
  };

  canvasElement.addEventListener('pointerdown', onPointerDownActivity, { capture: true });
  canvasElement.addEventListener('pointermove', onPointerMove, { capture: true });
  canvasElement.addEventListener('pointerleave', onPointerLeave);
  canvasElement.addEventListener('wheel', onWheelActivity, { capture: true, passive: true });

  /** Evidenzia solo la figurina realmente visibile sotto il puntatore. */
  const updateHover = () => {
    const id = pickTreasure();
    if (id === hoveredTreasure) return;
    hoveredTreasure = id;
    treasure.handles.forEach(handle => handle.setHovered(handle.id === id));
    canvasElement.style.cursor = id ? 'pointer' : '';
  };

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

  // --- Mini-game: raggi per il tap/hover in 3D e test di visibilità ----------
  const hotspotRaycaster = new THREE.Raycaster();
  const rayDirection = new THREE.Vector3();

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
    if (hoverDirty) {
      hoverDirty = false;
      updateHover();
    }
    treasure.update(delta);
    water.update(delta);
    village.update(delta);
    foliage.update(delta);
    atmosphere.update(delta);

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
      canvasElement.removeEventListener('pointerdown', onPointerDownActivity, { capture: true });
      canvasElement.removeEventListener('pointermove', onPointerMove, { capture: true });
      canvasElement.removeEventListener('pointerleave', onPointerLeave);
      canvasElement.removeEventListener('wheel', onWheelActivity, { capture: true });
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

    setTreasureCollected: (id: string, collected: boolean) => {
      const handle = treasure.handles.find(entry => entry.id === id);
      if (!handle) return;
      if (collected) handle.collect();
      else handle.reset();
    },

    setTreasureHovered: (id: string | null) => {
      treasure.handles.forEach(handle => handle.setHovered(handle.id === id));
    },

    resetTreasures: () => {
      treasure.reset();
    },
  };
}
