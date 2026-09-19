import * as THREE from 'three';
import { TREASURES, TreasureDefinition, TreasureId } from '../../game/treasureCatalog';
import { sampleTerrainHeight } from './IslandBuilder';
import { PlacementObstacle } from './VillageBuilder';

export interface TreasureInstanceHandle {
  id: TreasureId;
  definition: TreasureDefinition;
  /** Nodo radice posizionato nel borgo. */
  object: THREE.Group;
  /** Altezza da terra calcolata in fase di posizionamento. */
  groundY: number;
  isCollected: () => boolean;
  setHovered: (hovered: boolean) => void;
  collect: () => void;
  reset: () => void;
}

export interface TreasureBuildResult {
  group: THREE.Group;
  handles: TreasureInstanceHandle[];
  /** Collisori invisibili: il tap resta preciso anche su oggetti minuscoli. */
  pickTargets: THREE.Object3D[];
  update: (delta: number) => void;
  reset: () => void;
}

export interface TreasurePlacementContext {
  /** Ingombri del borgo (case, mulino, ponte, molo). */
  obstacles: PlacementObstacle[];
  /** Ingombri della vegetazione (tronchi, cespugli, fiori). */
  natureColliders: { x: number; z: number; radius: number }[];
  /**
   * Altezza reale del suolo ricavata dal mesh dell'isola (raycast verso il basso).
   * Restituisce null quando il punto non è sul prato calpestabile.
   */
  sampleGround?: (x: number, z: number) => number | null;
  /**
   * Quante direzioni di vista (0-4) hanno la figurina libera da ostacoli.
   * Serve a mimetizzarla nel borgo senza renderla irreperibile.
   */
  countClearApproaches?: (x: number, y: number, z: number) => number;
}

// ---------------------------------------------------------------- palette
const C = {
  ceramic: 0xf3efe4,
  terracotta: 0xa9512f,
  wood: 0x7a5334,
  wicker: 0xb08348,
  dough: 0xe3bb74,
  sauce: 0xbb3a2c,
  cheese: 0xf2d79b,
  meat: 0x8e3b2f,
  meatDark: 0x6d2b22,
  bone: 0xf0e7d5,
  potato: 0xc08a4c,
  potatoDark: 0x9a6a36,
  chicken: 0xd7a044,
  chickenDark: 0xb87c2c,
  leather: 0x6b4b32,
  leatherDark: 0x4a3222,
  wine: 0x2f5d3a,
  leaf: 0x4c9a3a,
  leafDark: 0x357026,
  metal: 0xbcc4cb,
  metalDark: 0x2c3034,
  tomato: 0xc0392b,
  cork: 0x9c7c4a,
} as const;

const MAT = {
  ceramic: new THREE.MeshStandardMaterial({ color: C.ceramic, roughness: 0.55 }),
  terracotta: new THREE.MeshStandardMaterial({ color: C.terracotta, roughness: 0.85, flatShading: true }),
  wood: new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.85, flatShading: true }),
  wicker: new THREE.MeshStandardMaterial({ color: C.wicker, roughness: 0.9, flatShading: true }),
  dough: new THREE.MeshStandardMaterial({ color: C.dough, roughness: 0.8, flatShading: true }),
  sauce: new THREE.MeshStandardMaterial({ color: C.sauce, roughness: 0.7 }),
  cheese: new THREE.MeshStandardMaterial({ color: C.cheese, roughness: 0.75 }),
  meat: new THREE.MeshStandardMaterial({ color: C.meat, roughness: 0.7 }),
  meatDark: new THREE.MeshStandardMaterial({ color: C.meatDark, roughness: 0.75 }),
  bone: new THREE.MeshStandardMaterial({ color: C.bone, roughness: 0.6 }),
  potato: new THREE.MeshStandardMaterial({ color: C.potato, roughness: 0.9, flatShading: true }),
  potatoDark: new THREE.MeshStandardMaterial({ color: C.potatoDark, roughness: 0.9, flatShading: true }),
  chicken: new THREE.MeshStandardMaterial({ color: C.chicken, roughness: 0.65 }),
  chickenDark: new THREE.MeshStandardMaterial({ color: C.chickenDark, roughness: 0.7 }),
  leather: new THREE.MeshStandardMaterial({ color: C.leather, roughness: 0.8, flatShading: true }),
  leatherDark: new THREE.MeshStandardMaterial({ color: C.leatherDark, roughness: 0.85, flatShading: true }),
  glass: new THREE.MeshStandardMaterial({ color: C.wine, roughness: 0.22, metalness: 0.15 }),
  cork: new THREE.MeshStandardMaterial({ color: C.cork, roughness: 0.95, flatShading: true }),
  leaf: new THREE.MeshStandardMaterial({ color: C.leaf, roughness: 0.8, flatShading: true }),
  leafDark: new THREE.MeshStandardMaterial({ color: C.leafDark, roughness: 0.85, flatShading: true }),
  metal: new THREE.MeshStandardMaterial({ color: C.metal, roughness: 0.35, metalness: 0.65 }),
  metalDark: new THREE.MeshStandardMaterial({ color: C.metalDark, roughness: 0.5, metalness: 0.35 }),
  tomato: new THREE.MeshStandardMaterial({ color: C.tomato, roughness: 0.6 }),
};

function shadowed<T extends THREE.Mesh>(mesh: T): T {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ------------------------------------------------- modelli 3D delle figurine
/** Caffettiera moka in metallo. */
function buildCaffe(): THREE.Group {
  const g = new THREE.Group();
  const body = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.11, 8), MAT.metal));
  body.position.y = 0.055;
  g.add(body);

  const top = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.068, 0.045, 8), MAT.metal));
  top.position.y = 0.132;
  g.add(top);

  const knob = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), MAT.metalDark));
  knob.position.y = 0.163;
  g.add(knob);

  const spout = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.05, 6), MAT.metal));
  spout.position.set(0.072, 0.13, 0);
  spout.rotation.z = -1.05;
  g.add(spout);

  const handle = shadowed(
    new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 5, 10, Math.PI * 1.15), MAT.metalDark)
  );
  handle.position.set(-0.072, 0.095, 0);
  handle.rotation.set(Math.PI / 2, 0, -0.5);
  g.add(handle);

  return g;
}

/** Paio di scarpe in cuoio. */
function buildScarpe(): THREE.Group {
  const g = new THREE.Group();
  const soleGeo = new THREE.BoxGeometry(0.085, 0.022, 0.19);
  const upperGeo = new THREE.SphereGeometry(0.06, 8, 6);

  [-0.055, 0.055].forEach((offsetX, index) => {
    const shoe = new THREE.Group();

    const sole = shadowed(new THREE.Mesh(soleGeo, MAT.leatherDark));
    sole.position.y = 0.011;
    shoe.add(sole);

    const upper = shadowed(new THREE.Mesh(upperGeo, MAT.leather));
    upper.scale.set(0.72, 0.55, 1.45);
    upper.position.set(0, 0.036, -0.012);
    shoe.add(upper);

    const heel = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.03, 0.045), MAT.leatherDark));
    heel.position.set(0, 0.032, -0.072);
    shoe.add(heel);

    shoe.position.x = offsetX;
    shoe.rotation.y = index === 0 ? 0.16 : -0.12;
    g.add(shoe);
  });

  return g;
}

/** Bottiglia di vino con etichetta. */
function buildVino(): THREE.Group {
  const g = new THREE.Group();

  const body = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.05, 0.17, 10), MAT.glass));
  body.position.y = 0.085;
  g.add(body);

  const shoulder = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.052, 0.05, 10), MAT.glass));
  shoulder.position.y = 0.195;
  g.add(shoulder);

  const neck = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.06, 8), MAT.glass));
  neck.position.y = 0.245;
  g.add(neck);

  const cork = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.022, 8), MAT.cork));
  cork.position.y = 0.283;
  g.add(cork);

  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.053, 0.055, 10, 1, true), MAT.ceramic);
  label.position.y = 0.085;
  g.add(label);

  return g;
}

/** Pizza su tagliere di legno. */
function buildPizza(): THREE.Group {
  const g = new THREE.Group();

  const board = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.014, 14), MAT.wood));
  board.position.y = 0.007;
  g.add(board);

  const base = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.132, 0.016, 16), MAT.dough));
  base.position.y = 0.022;
  g.add(base);

  const crust = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.126, 0.019, 6, 18), MAT.dough));
  crust.position.y = 0.03;
  crust.rotation.x = Math.PI / 2;
  g.add(crust);

  const sauce = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.098, 0.006, 14), MAT.sauce));
  sauce.position.y = 0.034;
  g.add(sauce);

  const pepperoniGeo = new THREE.CylinderGeometry(0.021, 0.021, 0.008, 8);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.4;
    const radius = i === 4 ? 0 : 0.052;
    const piece = shadowed(new THREE.Mesh(pepperoniGeo, MAT.tomato));
    piece.position.set(Math.cos(angle) * radius, 0.04, Math.sin(angle) * radius);
    g.add(piece);
  }

  const basilGeo = new THREE.DodecahedronGeometry(0.019, 0);
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + 1.1;
    const leaf = shadowed(new THREE.Mesh(basilGeo, MAT.leaf));
    leaf.scale.set(1, 0.45, 1.4);
    leaf.position.set(Math.cos(angle) * 0.078, 0.045, Math.sin(angle) * 0.078);
    leaf.rotation.y = angle;
    g.add(leaf);
  }

  return g;
}

/** Ciotola di insalata mista. */
function buildInsalata(): THREE.Group {
  const g = new THREE.Group();

  const bowlGeo = new THREE.SphereGeometry(0.115, 14, 8, 0, Math.PI * 2, Math.PI * 0.48, Math.PI * 0.52);
  const bowl = shadowed(new THREE.Mesh(bowlGeo, MAT.ceramic));
  bowl.position.y = 0.1;
  g.add(bowl);

  const rim = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.114, 0.008, 6, 18), MAT.ceramic));
  rim.position.y = 0.098;
  rim.rotation.x = Math.PI / 2;
  g.add(rim);

  const leafGeo = new THREE.DodecahedronGeometry(0.038, 0);
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2 + 0.3;
    const radius = 0.03 + (i % 3) * 0.022;
    const leaf = shadowed(new THREE.Mesh(leafGeo, i % 2 === 0 ? MAT.leaf : MAT.leafDark));
    leaf.scale.set(1.1, 0.7, 1.1);
    leaf.position.set(Math.cos(angle) * radius, 0.125 + (i % 2) * 0.02, Math.sin(angle) * radius);
    leaf.rotation.set(angle, angle * 0.7, 0);
    g.add(leaf);
  }

  const tomatoGeo = new THREE.SphereGeometry(0.024, 8, 6);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + 1.7;
    const tomato = shadowed(new THREE.Mesh(tomatoGeo, MAT.tomato));
    tomato.position.set(Math.cos(angle) * 0.055, 0.132, Math.sin(angle) * 0.055);
    g.add(tomato);
  }

  return g;
}

/** Teglia di lasagne. */
function buildLasagne(): THREE.Group {
  const g = new THREE.Group();

  const tray = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.055, 0.17), MAT.terracotta));
  tray.position.y = 0.028;
  g.add(tray);

  const pastaGeo = new THREE.BoxGeometry(0.205, 0.012, 0.148);
  const fillingGeo = new THREE.BoxGeometry(0.2, 0.01, 0.142);

  for (let layer = 0; layer < 3; layer++) {
    const filling = shadowed(new THREE.Mesh(fillingGeo, layer % 2 === 0 ? MAT.sauce : MAT.cheese));
    filling.position.y = 0.048 + layer * 0.028;
    g.add(filling);

    const pasta = shadowed(new THREE.Mesh(pastaGeo, MAT.cheese));
    pasta.position.y = 0.056 + layer * 0.028;
    g.add(pasta);
  }

  const top = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.145), MAT.cheese));
  top.position.y = 0.14;
  g.add(top);

  const basilGeo = new THREE.DodecahedronGeometry(0.016, 0);
  for (let i = 0; i < 3; i++) {
    const leaf = shadowed(new THREE.Mesh(basilGeo, MAT.leafDark));
    leaf.scale.set(1, 0.5, 1.3);
    leaf.position.set(-0.06 + i * 0.06, 0.15, 0.01 - (i % 2) * 0.03);
    g.add(leaf);
  }

  return g;
}

/** Pollo arrosto con cosce. */
function buildPollo(): THREE.Group {
  const g = new THREE.Group();

  const body = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 9), MAT.chicken));
  body.scale.set(1.25, 0.88, 1);
  body.position.y = 0.088;
  g.add(body);

  const breast = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), MAT.chicken));
  breast.scale.set(1.1, 0.8, 1.35);
  breast.position.set(0.015, 0.135, 0.02);
  g.add(breast);

  const drumstickGeo = new THREE.CylinderGeometry(0.019, 0.026, 0.1, 7);
  const drumEndGeo = new THREE.SphereGeometry(0.026, 7, 6);

  [-1, 1].forEach(side => {
    const drum = shadowed(new THREE.Mesh(drumstickGeo, MAT.chickenDark));
    drum.position.set(side * 0.055, 0.058, -0.085);
    drum.rotation.set(0.7, 0, side * 0.35);
    g.add(drum);

    const end = shadowed(new THREE.Mesh(drumEndGeo, MAT.chickenDark));
    end.position.set(side * 0.075, 0.036, -0.125);
    g.add(end);
  });

  const wingGeo = new THREE.SphereGeometry(0.036, 8, 6);
  [-1, 1].forEach(side => {
    const wing = shadowed(new THREE.Mesh(wingGeo, MAT.chicken));
    wing.scale.set(1.2, 0.5, 0.9);
    wing.position.set(side * 0.11, 0.1, 0.01);
    wing.rotation.z = side * 0.3;
    g.add(wing);
  });

  return g;
}

/** Cesta di vimini con patate. */
function buildPatate(): THREE.Group {
  const g = new THREE.Group();

  const basket = shadowed(
    new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.092, 0.1, 12, 1, true), MAT.wicker)
  );
  basket.position.y = 0.05;
  g.add(basket);

  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.012, 12), MAT.wood);
  bottom.position.y = 0.006;
  g.add(bottom);

  const rim = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.011, 6, 16), MAT.wicker));
  rim.position.y = 0.1;
  rim.rotation.x = Math.PI / 2;
  g.add(rim);

  const potatoGeo = new THREE.SphereGeometry(0.042, 8, 6);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.6;
    const radius = i === 4 ? 0 : 0.045;
    const potato = shadowed(new THREE.Mesh(potatoGeo, i % 2 === 0 ? MAT.potato : MAT.potatoDark));
    potato.scale.set(1, 0.78, 1.25);
    potato.position.set(Math.cos(angle) * radius, 0.108 + (i % 2) * 0.02, Math.sin(angle) * radius);
    potato.rotation.set(angle, angle, 0);
    g.add(potato);
  }

  return g;
}

/** Bistecca con osso su tagliere. */
function buildBistecca(): THREE.Group {
  const g = new THREE.Group();

  const board = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.016, 0.2), MAT.wood));
  board.position.y = 0.008;
  g.add(board);

  const meat = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.108, 0.036, 12), MAT.meat));
  meat.scale.set(1, 1, 0.82);
  meat.position.y = 0.036;
  g.add(meat);

  const bone = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.15, 7), MAT.bone));
  bone.rotation.set(Math.PI / 2, 0, Math.PI / 2.6);
  bone.position.set(0.01, 0.048, 0);
  g.add(bone);

  const boneKnob = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.026, 7, 6), MAT.bone));
  boneKnob.position.set(0.075, 0.05, -0.05);
  g.add(boneKnob);

  const fatGeo = new THREE.DodecahedronGeometry(0.026, 0);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + 2.2;
    const fat = shadowed(new THREE.Mesh(fatGeo, MAT.bone));
    fat.scale.set(1.3, 0.5, 0.9);
    fat.position.set(Math.cos(angle) * 0.07, 0.052, Math.sin(angle) * 0.06);
    g.add(fat);
  }

  const rosemaryGeo = new THREE.DodecahedronGeometry(0.017, 0);
  for (let i = 0; i < 2; i++) {
    const sprig = shadowed(new THREE.Mesh(rosemaryGeo, MAT.leafDark));
    sprig.scale.set(0.9, 0.4, 2.4);
    sprig.position.set(-0.05 + i * 0.03, 0.055, 0.06 - i * 0.02);
    sprig.rotation.y = -0.4;
    g.add(sprig);
  }

  return g;
}

const MODEL_BUILDERS: Record<TreasureId, () => THREE.Group> = {
  caffe: buildCaffe,
  scarpe: buildScarpe,
  vino: buildVino,
  pizza: buildPizza,
  insalata: buildInsalata,
  lasagne: buildLasagne,
  pollo: buildPollo,
  patate: buildPatate,
  bistecca: buildBistecca,
};

// ------------------------------------------------------ posizionamento fine
/**
 * Corone di ricerca attorno all'ancora del luogo: si parte dal punto esatto e ci
 * si allarga a cerchi. Per ogni candidato si misura spazio libero e visibilità
 * dalle angolazioni di vista tipiche del diorama.
 */
const PLACEMENT_RINGS: { radius: number; steps: number }[] = [
  { radius: 0, steps: 1 },
  { radius: 0.18, steps: 8 },
  { radius: 0.3, steps: 8 },
  { radius: 0.44, steps: 8 },
  { radius: 0.58, steps: 6 },
  { radius: 0.72, steps: 6 },
  { radius: 0.9, steps: 6 },
];

const TREASURE_CLEARANCE = 0.05;
const MAX_CANDIDATES = 18;

function distanceToObstacles(
  x: number,
  z: number,
  obstacles: PlacementObstacle[],
  nature: { x: number; z: number; radius: number }[]
): number {
  let worst = Number.POSITIVE_INFINITY;

  const check = (items: { x: number; z: number; radius: number }[]) => {
    for (const item of items) {
      const clearance = Math.hypot(x - item.x, z - item.z) - item.radius;
      if (clearance < worst) worst = clearance;
    }
  };

  check(obstacles);
  check(nature);
  return worst;
}

/**
 * Sceglie dove appoggiare la figurina: resta legata al luogo previsto dal
 * catalogo, ma si sposta quel tanto che basta per non finire dentro una casa,
 * un tronco o un cespuglio e per restare visibile da almeno un'angolazione.
 */
function resolvePlacement(
  definition: TreasureDefinition,
  context: TreasurePlacementContext,
  placed: { x: number; z: number }[],
  seed: number
): { x: number; z: number; y: number; slope: number } {
  const [anchorX, anchorZ] = definition.anchor;
  const maxRadius = 4.0;
  const onStructure = definition.surfaceY !== undefined;

  const groundAt = (x: number, z: number) => {
    const sampled = context.sampleGround?.(x, z);
    return sampled ?? sampleTerrainHeight(x, z);
  };

  interface Candidate {
    x: number;
    z: number;
    y: number;
    clearance: number;
    visible: number;
    radius: number;
  }

  const candidates: Candidate[] = [];
  const phase = seed * 0.9;

  for (const ring of PLACEMENT_RINGS) {
    for (let step = 0; step < ring.steps; step++) {
      const angle = phase + (step / ring.steps) * Math.PI * 2;
      const x = anchorX + Math.cos(angle) * ring.radius;
      const z = anchorZ + Math.sin(angle) * ring.radius;
      if (Math.hypot(x, z) > maxRadius) continue;
      if (placed.some(p => Math.hypot(x - p.x, z - p.z) < 0.45)) continue;

      const clearance = distanceToObstacles(x, z, context.obstacles, context.natureColliders);
      // Su un ponte o un molo la figurina poggia sulla struttura: nessun ingombro da evitare.
      if (!onStructure && clearance < TREASURE_CLEARANCE) continue;

      let y: number;
      if (onStructure) {
        y = definition.surfaceY as number;
      } else {
        const sampled = context.sampleGround?.(x, z);
        if (context.sampleGround && sampled === null) continue;
        y = sampled ?? groundAt(x, z);
      }

      const visible = context.countClearApproaches?.(x, y, z) ?? 8;
      const radius = Math.hypot(x - anchorX, z - anchorZ);
      candidates.push({ x, z, y, clearance, visible, radius });

      // Trovato uno spiazzo libero e ben visibile: inutile continuare a cercare.
      if (visible >= 6 && clearance >= 0.1) break;
    }

    if (candidates.some(c => c.visible >= 6 && c.clearance >= 0.1)) break;
    if (candidates.length >= MAX_CANDIDATES) break;
  }

  // Massima visibilità, restando il più possibile vicino al luogo previsto.
  candidates.sort((a, b) => b.visible - a.visible || a.radius - b.radius || b.clearance - a.clearance);
  const best = candidates[0];

  const targetX = best ? best.x : anchorX;
  const targetZ = best ? best.z : anchorZ;
  const targetY = best ? best.y : (definition.surfaceY ?? groundAt(targetX, targetZ));

  // Pendenza locale: serve a inclinare l'oggetto come il terreno.
  const slope = groundAt(targetX + 0.08, targetZ) - groundAt(targetX - 0.08, targetZ);

  return { x: targetX, z: targetZ, y: targetY, slope };
}

/**
 * Costruisce le 9 figurine del mini-game "Caccia ai Tesori".
 *
 * Ogni figurina è un piccolo modello 3D di cibo appoggiato nel borgo, tra case e
 * alberi: nessuna icona, etichetta o numero è sovrapposto alla scena, così la
 * ricerca resta la parte sfidante del gioco. Il tap avviene direttamente in 3D.
 */
// ------------------------------------------------------- istanze di gioco
interface InstanceState {
  phase: 'idle' | 'collecting' | 'collected';
  elapsed: number;
  hoverAmount: number;
  baseYaw: number;
  baseY: number;
  spin: number;
  lift: number;
}

const BURST_COUNT = 16;
const COLLECT_DURATION = 1.1;

/** Opacità di base dei materiali, per poter dissolvere i modelli alla raccolta. */
const baseOpacities = new WeakMap<THREE.Material, number>();

function forEachMaterial(object: THREE.Object3D, callback: (material: THREE.Material) => void) {
  object.traverse(child => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach(material => {
      if (material) callback(material);
    });
  });
}

function makeFadeable(object: THREE.Object3D) {
  forEachMaterial(object, material => {
    material.transparent = true;
    baseOpacities.set(material, material.opacity);
  });
}

function setOpacity(object: THREE.Object3D, value: number) {
  forEachMaterial(object, material => {
    const base = baseOpacities.get(material) ?? 1;
    material.opacity = base * value;
    material.depthWrite = value > 0.65;
  });
}

export function buildTreasureHunt(context: TreasurePlacementContext): TreasureBuildResult {
  const group = new THREE.Group();
  group.name = 'TreasureHuntGroup';

  const handles: TreasureInstanceHandle[] = [];
  const pickTargets: THREE.Object3D[] = [];
  const states: InstanceState[] = [];
  const bursts: { points: THREE.Points; velocities: Float32Array; life: number }[] = [];
  const placed: { x: number; z: number }[] = [];

  const pickGeometry = new THREE.SphereGeometry(0.3, 8, 6);
  const pickMaterial = new THREE.MeshBasicMaterial({ visible: false });

  TREASURES.forEach((definition, index) => {
    const placement = resolvePlacement(definition, context, placed, index);
    placed.push({ x: placement.x, z: placement.z });

    const root = new THREE.Group();
    root.name = `treasure_${definition.id}`;
    // Leggermente affondato nel terreno: nessun effetto "sospeso".
    root.position.set(placement.x, placement.y - 0.015, placement.z);

    const yaw = (index * 2.399) % (Math.PI * 2);
    root.rotation.y = yaw;
    // Inclinazione che segue la pendenza del prato.
    root.rotation.z = THREE.MathUtils.clamp(-placement.slope * 1.4, -0.16, 0.16);

    const model = MODEL_BUILDERS[definition.id]();
    // Materiali clonati per istanza: l'invecchiamento di una figurina non tocca le altre.
    model.traverse(child => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(material => material.clone())
        : mesh.material.clone();
    });
    makeFadeable(model);
    root.add(model);

    // Collisore invisibile: rende il tap preciso anche su dettagli minuscoli.
    const pickTarget = new THREE.Mesh(pickGeometry, pickMaterial);
    pickTarget.position.y = 0.09;
    pickTarget.userData = {
      treasureId: definition.id,
      type: 'treasure',
      title: `Figurina: ${definition.label}`,
      description: `Figurina "${definition.label}" nascosta presso ${definition.area}.`,
      position: [placement.x, placement.y, placement.z],
    };
    root.add(pickTarget);
    pickTargets.push(pickTarget);

    // Scintille dorate preparate per il momento della raccolta.
    const burstGeometry = new THREE.BufferGeometry();
    const burstPositions = new Float32Array(BURST_COUNT * 3);
    const velocities = new Float32Array(BURST_COUNT * 3);
    for (let i = 0; i < BURST_COUNT; i++) {
      const angle = (i / BURST_COUNT) * Math.PI * 2 + Math.random() * 0.6;
      const speed = 0.5 + Math.random() * 0.8;
      velocities[i * 3] = Math.cos(angle) * speed * 0.55;
      velocities[i * 3 + 1] = 0.8 + Math.random() * 1.1;
      velocities[i * 3 + 2] = Math.sin(angle) * speed * 0.55;
    }
    burstGeometry.setAttribute('position', new THREE.BufferAttribute(burstPositions, 3));
    const burstMaterial = new THREE.PointsMaterial({
      color: 0xffe3a3,
      size: 0.055,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const burstPoints = new THREE.Points(burstGeometry, burstMaterial);
    burstPoints.visible = false;
    root.add(burstPoints);

    const state: InstanceState = {
      phase: 'idle',
      elapsed: 0,
      hoverAmount: 0,
      baseYaw: yaw,
      baseY: root.position.y,
      spin: 0,
      lift: 0,
    };

    const handle: TreasureInstanceHandle = {
      id: definition.id,
      definition,
      object: root,
      groundY: placement.y,
      isCollected: () => state.phase !== 'idle',
      setHovered: (hovered: boolean) => {
        if (state.phase !== 'idle') return;
        state.hoverAmount = hovered ? 1 : 0;
      },
      collect: () => {
        if (state.phase !== 'idle') return;
        state.phase = 'collecting';
        state.elapsed = 0;
        state.hoverAmount = 0;
        burstPoints.visible = true;
        burstMaterial.opacity = 0.95;
        bursts.push({ points: burstPoints, velocities, life: 0 });
      },
      reset: () => {
        state.phase = 'idle';
        state.elapsed = 0;
        state.hoverAmount = 0;
        state.spin = 0;
        state.lift = 0;
        root.position.y = state.baseY;
        root.rotation.y = state.baseYaw;
        root.scale.setScalar(1);
        setOpacity(model, 1);
        burstPoints.visible = false;
        burstMaterial.opacity = 0;
        const attr = burstGeometry.getAttribute('position') as THREE.BufferAttribute;
        attr.array.fill(0);
        attr.needsUpdate = true;
      },
    };

    handles.push(handle);
    states.push(state);
    group.add(root);
  });

  const update = (delta: number) => {
    handles.forEach((handle, index) => {
      const state = states[index];
      const model = handle.object.children[0];

      if (state.phase === 'idle') {
        // Vita minima: un respiro lentissimo e una lieve oscillazione.
        const breathe = 1 + Math.sin(state.elapsed * 1.6 + index) * 0.012;
        handle.object.scale.setScalar(breathe * (1 + state.hoverAmount * 0.09));
        handle.object.rotation.y =
          state.baseYaw + Math.sin(state.elapsed * 0.55 + index * 1.7) * 0.09;
        state.elapsed += delta;
        return;
      }

      if (state.phase === 'collecting') {
        state.elapsed += delta;
        const progress = Math.min(1, state.elapsed / COLLECT_DURATION);
        const eased = 1 - Math.pow(1 - progress, 3);

        // Salto, giro e dissolvenza verso l'aspetto "già trovato".
        state.lift = Math.sin(Math.min(1, progress * 1.6) * Math.PI) * 0.16;
        state.spin = eased * Math.PI * 2.2;
        handle.object.position.y = state.baseY + state.lift;
        handle.object.rotation.y = state.baseYaw + state.spin;
        handle.object.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.18);
        setOpacity(model, 1 - eased * 0.62);

        if (progress >= 1) {
          state.phase = 'collected';
          state.elapsed = 0;
          handle.object.position.y = state.baseY;
          handle.object.rotation.y = state.baseYaw + 0.5;
          handle.object.scale.setScalar(0.94);
          setOpacity(model, 0.38);
        }
        return;
      }

      // collected: presenza discreta e dorata dell'oggetto già raccolto
      state.elapsed += delta;
      handle.object.position.y = state.baseY + Math.sin(state.elapsed * 1.4 + index) * 0.012;
      handle.object.rotation.y = state.baseYaw + 0.5 + Math.sin(state.elapsed * 0.4) * 0.05;
      handle.object.scale.setScalar(0.94);
    });

    // Scintille della raccolta
    for (let b = bursts.length - 1; b >= 0; b--) {
      const burst = bursts[b];
      burst.life += delta;
      const attr = burst.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const array = attr.array as Float32Array;

      for (let i = 0; i < BURST_COUNT; i++) {
        array[i * 3] += burst.velocities[i * 3] * delta;
        array[i * 3 + 1] += burst.velocities[i * 3 + 1] * delta;
        array[i * 3 + 2] += burst.velocities[i * 3 + 2] * delta;
        burst.velocities[i * 3 + 1] -= 2.6 * delta;
      }
      attr.needsUpdate = true;

      const material = burst.points.material as THREE.PointsMaterial;
      material.opacity = Math.max(0, 0.95 - burst.life / 1.1);
      material.size = 0.055 + burst.life * 0.02;

      if (burst.life > 1.1) {
        burst.points.visible = false;
        material.opacity = 0;
        array.fill(0);
        attr.needsUpdate = true;
        bursts.splice(b, 1);
      }
    }
  };

  return {
    group,
    handles,
    pickTargets,
    update,
    reset: () => {
      handles.forEach(handle => handle.reset());
      bursts.length = 0;
    },
  };
}
