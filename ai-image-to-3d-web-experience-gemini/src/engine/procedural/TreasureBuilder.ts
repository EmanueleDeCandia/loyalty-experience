import * as THREE from 'three';
import { TREASURES, TreasureDefinition } from '../../game/treasureCatalog';

export interface TreasureMarkerHandle {
  id: string;
  definition: TreasureDefinition;
  /** Nodo usato per proiettare la figurina nelle coordinate dello schermo. */
  anchor: THREE.Object3D;
  setCollected: (collected: boolean) => void;
  setHovered: (hovered: boolean) => void;
}

export interface TreasureBuildResult {
  group: THREE.Group;
  markers: TreasureMarkerHandle[];
  /** Mesh invisibili usate dal raycaster per il tap diretto in 3D. */
  pickTargets: THREE.Object3D[];
  update: (delta: number, elapsed: number) => void;
  getMarkerAnchor: (id: string) => THREE.Object3D | undefined;
  setCollected: (id: string, collected: boolean) => void;
  setHovered: (id: string | null) => void;
  reset: () => void;
}

interface MarkerAnimationState {
  bob: THREE.Group;
  root: THREE.Group;
  ring: THREE.Mesh;
  index: number;
  isCollected: () => boolean;
  isHovered: () => boolean;
  getHoverAmount: () => number;
  setHoverAmount: (value: number) => void;
}

const GOLD = 0xffc94d;
const COLLECTED = 0x5fd7a1;
const GOLD_SOFT = 0xfff0b8;
const COLLECTED_SOFT = 0xd8fff0;

/** Texture radiale usata come alone luminoso attorno ad ogni figurina. */
function createGlowTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,224,150,0.75)');
  gradient.addColorStop(1, 'rgba(255,196,80,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Converte una emoji in una texture sprite (figurina fluttuante del borgo). */
function createEmojiTexture(emoji: string): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.font =
    '92px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Android Emoji",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + 4);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Costruisce le 9 figurine collezionabili del mini-game "Caccia ai Tesori".
 * Ogni figurina è un piccolo trofeo sospeso: emoji + anello metallico + alone,
 * con un pick-target invisibile per il tap diretto nella scena 3D.
 */
export function buildTreasureHunt(): TreasureBuildResult {
  const group = new THREE.Group();
  group.name = 'TreasureHuntGroup';

  const glowTexture = createGlowTexture();
  const pickGeometry = new THREE.SphereGeometry(0.32, 8, 8);
  const pickMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const ringGeometry = new THREE.TorusGeometry(0.2, 0.018, 6, 22);
  const pedestalGeometry = new THREE.SphereGeometry(0.045, 8, 5);

  const idleRingMat = new THREE.MeshStandardMaterial({
    color: GOLD_SOFT,
    emissive: GOLD,
    emissiveIntensity: 1.15,
    roughness: 0.35,
    metalness: 0.4,
  });
  const collectedRingMat = new THREE.MeshStandardMaterial({
    color: COLLECTED_SOFT,
    emissive: COLLECTED,
    emissiveIntensity: 0.6,
    roughness: 0.45,
    metalness: 0.25,
  });
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0xd9cdb4,
    roughness: 0.85,
    flatShading: true,
  });

  const markers: TreasureMarkerHandle[] = [];
  const pickTargets: THREE.Object3D[] = [];
  const animation: MarkerAnimationState[] = [];

  TREASURES.forEach((definition, index) => {
    const root = new THREE.Group();
    root.position.set(definition.spot[0], definition.spot[1], definition.spot[2]);
    root.name = `treasure_${definition.id}`;

    // Nodo interno animato (bobbing / hover) — è anche l'anchor di proiezione.
    const bob = new THREE.Group();
    root.add(bob);

    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: GOLD,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.setScalar(1.05);
    bob.add(glow);

    const emojiMaterial = new THREE.SpriteMaterial({
      map: createEmojiTexture(definition.emoji),
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const emojiSprite = new THREE.Sprite(emojiMaterial);
    emojiSprite.scale.setScalar(0.4);
    bob.add(emojiSprite);

    const ring = new THREE.Mesh(ringGeometry, idleRingMat);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = Math.PI / 4;
    bob.add(ring);

    const pedestal = new THREE.Mesh(pedestalGeometry, pedestalMat);
    pedestal.position.y = -0.21;
    bob.add(pedestal);

    // Pick target invisibile: permette il tap direttamente sulla figurina 3D.
    const pickTarget = new THREE.Mesh(pickGeometry, pickMaterial);
    pickTarget.userData = {
      treasureId: definition.id,
      type: 'treasure',
      title: `Tesoro: ${definition.label}`,
      description: `Figurina "${definition.label}" nascosta presso ${definition.area}.`,
      position: definition.spot,
    };
    bob.add(pickTarget);
    pickTargets.push(pickTarget);

    let collected = false;
    let hovered = false;
    let hoverAmount = 0;

    const handle: TreasureMarkerHandle = {
      id: definition.id,
      definition,
      anchor: bob,
      setCollected: (value: boolean) => {
        collected = value;
        emojiMaterial.opacity = collected ? 0.42 : 1;
        emojiMaterial.color.set(collected ? 0x9fb6c9 : 0xffffff);
        glowMaterial.color.set(collected ? COLLECTED : GOLD);
        glowMaterial.opacity = collected ? 0.24 : 0.55;
        ring.material = collected ? collectedRingMat : idleRingMat;
      },
      setHovered: (value: boolean) => {
        hovered = value;
      },
    };

    animation.push({
      root,
      bob,
      ring,
      index,
      isCollected: () => collected,
      isHovered: () => hovered,
      getHoverAmount: () => hoverAmount,
      setHoverAmount: value => {
        hoverAmount = value;
      },
    });

    markers.push(handle);
    group.add(root);
  });

  const update = (delta: number, elapsed: number) => {
    animation.forEach(state => {
      // Bobbing dolce della figurina
      const bobSpeed = state.isCollected() ? 1.1 : 1.7;
      state.bob.position.y = Math.sin(elapsed * bobSpeed + state.index * 0.9) * 0.055;
      state.root.rotation.y += delta * (state.isCollected() ? 0.25 : 0.6);

      // Anello rotante e leggermente pulsante
      state.ring.rotation.z += delta * 1.2;
      const pulse = 1 + Math.sin(elapsed * 3.2 + state.index) * 0.045;
      state.ring.scale.setScalar(pulse);

      // Hover (pointer sopra il chip DOM corrispondente) -> ingrandimento fluido
      const target = state.isHovered() ? 1 : 0;
      const current = state.getHoverAmount();
      if (Math.abs(target - current) > 0.001) {
        state.setHoverAmount(current + (target - current) * Math.min(1, delta * 8));
      }

      const collectedScale = state.isCollected() ? 0.86 : 1;
      state.bob.scale.setScalar(collectedScale * (1 + state.getHoverAmount() * 0.22));
    });
  };

  return {
    group,
    markers,
    pickTargets,
    update,
    getMarkerAnchor: (id: string) => markers.find(m => m.id === id)?.anchor,
    setCollected: (id: string, collected: boolean) => {
      markers.find(m => m.id === id)?.setCollected(collected);
    },
    setHovered: (id: string | null) => {
      markers.forEach(m => m.setHovered(m.id === id));
    },
    reset: () => {
      markers.forEach(m => {
        m.setCollected(false);
        m.setHovered(false);
      });
    },
  };
}
