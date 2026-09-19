import * as THREE from 'three';

export interface FoliageBuildResult {
  group: THREE.Group;
  update: (delta: number) => void;
  interactiveObjects: THREE.Object3D[];
  /** Ingombri al suolo (tronchi, cespugli, fiori) per il posizionamento dei tesori. */
  getPlacementColliders: () => { x: number; z: number; radius: number }[];
}

export function buildFoliage(customColors?: { foliage?: string }): FoliageBuildResult {
  const group = new THREE.Group();
  group.name = 'FoliageGroup';

  const interactiveObjects: THREE.Object3D[] = [];
  const placementColliders: { x: number; z: number; radius: number }[] = [];

  // Trunk materials
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5a412b,
    roughness: 0.9,
    flatShading: true,
  });

  // Stylized foliage materials
  const baseFoliageColor = customColors?.foliage ? new THREE.Color(customColors.foliage) : new THREE.Color(0x429938);
  const foliageMats = [
    new THREE.MeshStandardMaterial({ color: baseFoliageColor, roughness: 0.8, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: baseFoliageColor.clone().offsetHSL(0.04, 0.1, 0.08), roughness: 0.8, flatShading: true }),
    new THREE.MeshStandardMaterial({ color: baseFoliageColor.clone().offsetHSL(-0.06, -0.05, -0.08), roughness: 0.8, flatShading: true }),
    // Cherry blossom / flowering tree
    new THREE.MeshStandardMaterial({ color: 0xffa4ba, roughness: 0.75, flatShading: true }),
    // Golden autumn tint
    new THREE.MeshStandardMaterial({ color: 0xe89728, roughness: 0.8, flatShading: true }),
  ];

  const pineMat = new THREE.MeshStandardMaterial({
    color: 0x225528,
    roughness: 0.85,
    flatShading: true,
  });

  const bushMat = new THREE.MeshStandardMaterial({
    color: 0x3d8c2e,
    roughness: 0.85,
    flatShading: true,
  });

  const flowerMats = [
    new THREE.MeshStandardMaterial({ color: 0xff5c5c, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ color: 0xffdd44, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ color: 0xbd6bf5, roughness: 0.7 }),
  ];

  // Helper to create a stylized puffy deciduous tree
  const createPuffyTree = (pos: THREE.Vector3, scale: number = 1.0, matIdx: number = 0) => {
    const treeGroup = new THREE.Group();
    treeGroup.position.copy(pos);
    treeGroup.scale.set(scale, scale, scale);

    // Trunk
    const trunkH = 0.8 + Math.random() * 0.3;
    const trunkGeo = new THREE.CylinderGeometry(0.08, 0.14, trunkH, 6);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH * 0.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    treeGroup.add(trunk);

    // Volumetric crown: 3-5 overlapping dodecahedrons forming a cartoon cloud canopy
    const mat = foliageMats[matIdx % foliageMats.length];
    const puffOffsets = [
      new THREE.Vector3(0, trunkH + 0.5, 0),
      new THREE.Vector3(0.25, trunkH + 0.35, 0.2),
      new THREE.Vector3(-0.25, trunkH + 0.4, -0.15),
      new THREE.Vector3(0.1, trunkH + 0.75, -0.1),
    ];

    puffOffsets.forEach((offset, idx) => {
      const puffGeo = new THREE.DodecahedronGeometry(0.45 - idx * 0.05, 1);
      const puff = new THREE.Mesh(puffGeo, mat);
      puff.position.copy(offset);
      puff.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
      puff.castShadow = true;
      puff.receiveShadow = true;
      treeGroup.add(puff);
    });

    treeGroup.userData = {
      type: 'tree',
      title: matIdx === 3 ? 'Blossom Cherry' : 'Ancient Hill Oak',
      description: 'Dense stylized foliage lending vibrant natural life to the miniature diorama.',
      position: [pos.x, pos.y, pos.z],
    };
    interactiveObjects.push(treeGroup);
    placementColliders.push({ x: pos.x, z: pos.z, radius: 0.22 * scale });

    group.add(treeGroup);
  };

  // Helper to create a stylized pine / conifer tree
  const createPineTree = (pos: THREE.Vector3, scale: number = 1.0) => {
    const pineGroup = new THREE.Group();
    pineGroup.position.copy(pos);
    pineGroup.scale.set(scale, scale, scale);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.7, 5), trunkMat);
    trunk.position.y = 0.35;
    trunk.castShadow = true;
    pineGroup.add(trunk);

    // 3 tiered cones
    for (let t = 0; t < 3; t++) {
      const coneGeo = new THREE.ConeGeometry(0.55 - t * 0.12, 0.7, 6);
      const cone = new THREE.Mesh(coneGeo, pineMat);
      cone.position.y = 0.6 + t * 0.45;
      cone.castShadow = true;
      pineGroup.add(cone);
    }

    pineGroup.userData = {
      type: 'tree',
      title: 'Highland Pine',
      description: 'Sturdy evergreen rooted deep in the rocky crags of the floating island.',
      position: [pos.x, pos.y, pos.z],
    };
    interactiveObjects.push(pineGroup);
    placementColliders.push({ x: pos.x, z: pos.z, radius: 0.2 * scale });

    group.add(pineGroup);
  };

  // Dense placement across the island (60+ trees)
  const treePlacements = [
    // Surrounding the village perimeter
    { pos: new THREE.Vector3(0.1, 0.38, 0.0), scale: 0.9, type: 'puffy', mat: 0 },
    { pos: new THREE.Vector3(0.5, 0.40, -0.4), scale: 0.85, type: 'puffy', mat: 1 },
    { pos: new THREE.Vector3(1.5, 0.42, 0.0), scale: 0.95, type: 'puffy', mat: 3 }, // Blossom
    { pos: new THREE.Vector3(2.0, 0.45, -0.1), scale: 0.8, type: 'puffy', mat: 0 },
    { pos: new THREE.Vector3(2.8, 0.50, 0.4), scale: 1.05, type: 'puffy', mat: 1 },
    { pos: new THREE.Vector3(0.2, 0.38, 1.2), scale: 0.9, type: 'puffy', mat: 2 },
    { pos: new THREE.Vector3(0.8, 0.41, 1.3), scale: 0.85, type: 'puffy', mat: 0 },
    { pos: new THREE.Vector3(1.6, 0.43, 2.0), scale: 0.9, type: 'puffy', mat: 3 }, // Blossom
    { pos: new THREE.Vector3(2.5, 0.46, 2.8), scale: 1.0, type: 'puffy', mat: 1 },
    { pos: new THREE.Vector3(3.3, 0.52, 1.8), scale: 0.85, type: 'puffy', mat: 2 },

    // Near the waterfall and river mouth
    { pos: new THREE.Vector3(-0.9, 0.36, 0.4), scale: 0.9, type: 'puffy', mat: 0 },
    { pos: new THREE.Vector3(-1.6, 0.34, 0.9), scale: 1.1, type: 'puffy', mat: 1 },
    { pos: new THREE.Vector3(-2.0, 0.32, 1.4), scale: 0.85, type: 'puffy', mat: 2 },
    { pos: new THREE.Vector3(-3.0, 0.30, 1.2), scale: 0.75, type: 'puffy', mat: 0 },
    { pos: new THREE.Vector3(-2.8, 0.31, 2.1), scale: 0.8, type: 'pine', mat: 0 },
    { pos: new THREE.Vector3(-3.5, 0.28, 2.3), scale: 0.7, type: 'pine', mat: 0 },

    // Northern Ridge & Windmill Hill
    { pos: new THREE.Vector3(2.9, 0.56, -1.2), scale: 1.15, type: 'puffy', mat: 4 }, // Autumn gold
    { pos: new THREE.Vector3(3.8, 0.58, -1.0), scale: 0.9, type: 'pine', mat: 0 },
    { pos: new THREE.Vector3(4.1, 0.56, -1.9), scale: 0.95, type: 'pine', mat: 0 },
    { pos: new THREE.Vector3(3.9, 0.55, -2.9), scale: 0.85, type: 'pine', mat: 0 },
    { pos: new THREE.Vector3(3.1, 0.53, -2.8), scale: 1.0, type: 'puffy', mat: 1 },
    { pos: new THREE.Vector3(2.2, 0.49, -3.2), scale: 0.9, type: 'puffy', mat: 0 },
    { pos: new THREE.Vector3(1.3, 0.45, -2.8), scale: 0.85, type: 'puffy', mat: 2 },
    { pos: new THREE.Vector3(0.5, 0.42, -2.9), scale: 0.9, type: 'puffy', mat: 3 }, // Blossom
    { pos: new THREE.Vector3(-0.4, 0.38, -2.4), scale: 0.95, type: 'pine', mat: 0 },
    { pos: new THREE.Vector3(-1.4, 0.35, -2.2), scale: 0.85, type: 'pine', mat: 0 },

    // Backside & Southern rim (dense coverage for seamless 360° orbiting!)
    { pos: new THREE.Vector3(-2.5, 0.30, -2.0), scale: 0.9, type: 'pine', mat: 0 },
    { pos: new THREE.Vector3(-3.2, 0.28, -1.4), scale: 0.8, type: 'puffy', mat: 2 },
    { pos: new THREE.Vector3(-3.6, 0.26, -0.6), scale: 0.85, type: 'puffy', mat: 0 },
    { pos: new THREE.Vector3(-3.8, 0.25, 0.3), scale: 0.75, type: 'pine', mat: 0 },
    { pos: new THREE.Vector3(-0.2, 0.36, -3.9), scale: 0.9, type: 'pine', mat: 0 },
    { pos: new THREE.Vector3(0.8, 0.40, -4.1), scale: 0.85, type: 'puffy', mat: 1 },
    { pos: new THREE.Vector3(1.9, 0.45, -4.0), scale: 0.9, type: 'puffy', mat: 0 },
    { pos: new THREE.Vector3(-1.2, 0.34, 3.6), scale: 0.85, type: 'puffy', mat: 3 }, // Blossom
    { pos: new THREE.Vector3(-0.1, 0.37, 3.8), scale: 0.95, type: 'puffy', mat: 0 },
    { pos: new THREE.Vector3(1.1, 0.41, 3.7), scale: 0.9, type: 'puffy', mat: 1 },
    { pos: new THREE.Vector3(2.2, 0.45, 3.4), scale: 0.85, type: 'puffy', mat: 2 },
    { pos: new THREE.Vector3(3.2, 0.50, 2.7), scale: 0.95, type: 'puffy', mat: 4 },
  ];

  treePlacements.forEach(tp => {
    if (tp.type === 'pine') {
      createPineTree(tp.pos, tp.scale);
    } else {
      createPuffyTree(tp.pos, tp.scale, tp.mat);
    }
  });

  // Low-poly bushes & flower clusters along paths and houses
  const bushGeo = new THREE.DodecahedronGeometry(0.2, 0);
  const flowerGeo = new THREE.DodecahedronGeometry(0.08, 0);

  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 1.0 + Math.random() * 3.2;
    const bx = Math.cos(angle) * r;
    const bz = Math.sin(angle) * r;
    const by = 0.38 + Math.sin(bx * 0.5 + 1.0) * 0.15;

    const bush = new THREE.Mesh(bushGeo, bushMat);
    bush.position.set(bx, by, bz);
    bush.scale.set(0.8 + Math.random() * 0.6, 0.6 + Math.random() * 0.4, 0.8 + Math.random() * 0.6);
    bush.castShadow = true;
    bush.receiveShadow = true;
    group.add(bush);
    placementColliders.push({ x: bx, z: bz, radius: 0.2 * Math.max(bush.scale.x, bush.scale.z) });

    // Occasional flower blossom on bush
    if (Math.random() > 0.4) {
      const flMat = flowerMats[Math.floor(Math.random() * flowerMats.length)];
      const flower = new THREE.Mesh(flowerGeo, flMat);
      flower.position.set(bx + (Math.random() - 0.5) * 0.15, by + 0.18, bz + (Math.random() - 0.5) * 0.15);
      group.add(flower);
    }
  }

  // Drifting Blossom / Leaf Particles in the breeze
  const petalCount = 70;
  const petalGeo = new THREE.BufferGeometry();
  const petalPositions = new Float32Array(petalCount * 3);
  const petalData: { speed: number; rotSpeed: number; radius: number; angle: number; baseY: number }[] = [];

  for (let i = 0; i < petalCount; i++) {
    const radius = 1.5 + Math.random() * 4.0;
    const angle = Math.random() * Math.PI * 2;
    const baseY = 0.5 + Math.random() * 2.5;

    petalPositions[i * 3] = Math.cos(angle) * radius;
    petalPositions[i * 3 + 1] = baseY;
    petalPositions[i * 3 + 2] = Math.sin(angle) * radius;

    petalData.push({
      speed: 0.3 + Math.random() * 0.4,
      rotSpeed: 0.5 + Math.random() * 1.0,
      radius,
      angle,
      baseY,
    });
  }

  petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPositions, 3));

  const petalMat = new THREE.PointsMaterial({
    color: 0xffadc2,
    size: 0.12,
    transparent: true,
    opacity: 0.8,
  });

  const petalPoints = new THREE.Points(petalGeo, petalMat);
  group.add(petalPoints);

  // Animation loop
  let time = 0;
  const update = (delta: number) => {
    time += delta;

    // Gentle tree sway in the breeze
    group.children.forEach((child, idx) => {
      if (child.userData?.type === 'tree') {
        child.rotation.z = Math.sin(time * 1.5 + idx * 0.3) * 0.025;
        child.rotation.x = Math.cos(time * 1.2 + idx * 0.2) * 0.02;
      }
    });

    // Swirling petals
    const positions = petalGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < petalCount; i++) {
      const p = petalData[i];
      p.angle += delta * p.speed * 0.4;
      p.baseY -= delta * 0.15;
      if (p.baseY < 0.2) p.baseY = 2.8;

      positions[i * 3] = Math.cos(p.angle) * p.radius;
      positions[i * 3 + 1] = p.baseY + Math.sin(time * 2 + i) * 0.1;
      positions[i * 3 + 2] = Math.sin(p.angle) * p.radius;
    }
    petalGeo.attributes.position.needsUpdate = true;
  };

  return {
    group,
    update,
    interactiveObjects,
    getPlacementColliders: () => placementColliders,
  };
}
