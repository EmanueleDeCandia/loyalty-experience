import * as THREE from 'three';

export interface IslandBuildResult {
  group: THREE.Group;
  materials: {
    grass: THREE.MeshStandardMaterial;
    cliff: THREE.MeshStandardMaterial;
    cliffDark: THREE.MeshStandardMaterial;
    earth: THREE.MeshStandardMaterial;
    path: THREE.MeshStandardMaterial;
  };
  getRiverPathPoint: (t: number) => THREE.Vector3;
}

/**
 * Altezza approssimata del manto erboso del diorama.
 * Riproduce la formula usata per deformare il plateau (hillocks + bordo riva),
 * così gli oggetti appoggiati al suolo non restano sospesi o affondati.
 */
export function sampleTerrainHeight(x: number, z: number): number {
  return 0.38 + Math.sin(x * 0.5 + 1.0) * 0.175 + Math.cos(z * 0.5) * 0.125;
}

export function buildIsland(customColors?: { grass?: string; rock?: string }): IslandBuildResult {
  const group = new THREE.Group();
  group.name = 'IslandCoreGroup';

  // Materials
  const grassColor = customColors?.grass ? new THREE.Color(customColors.grass) : new THREE.Color(0x56a638);
  const rockColor = customColors?.rock ? new THREE.Color(customColors.rock) : new THREE.Color(0x6b615b);

  const grassMat = new THREE.MeshStandardMaterial({
    color: grassColor,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });

  const cliffMat = new THREE.MeshStandardMaterial({
    color: rockColor,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: true,
  });

  const cliffDarkMat = new THREE.MeshStandardMaterial({
    color: rockColor.clone().multiplyScalar(0.7),
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const earthMat = new THREE.MeshStandardMaterial({
    color: 0x4a3728,
    roughness: 0.9,
    flatShading: true,
  });

  const pathMat = new THREE.MeshStandardMaterial({
    color: 0xd8caa8,
    roughness: 0.8,
    flatShading: true,
  });

  // 1. Lush Grass Top Plateau
  // We construct a custom shaped cylinder / disc with organic displacement
  const topRadius = 4.8;
  const segments = 48;
  const topGeo = new THREE.CylinderGeometry(topRadius, topRadius * 1.05, 0.7, segments, 8);
  const posAttr = topGeo.attributes.position;
  
  // Organic deformation of the plateau rim and gentle slope
  for (let i = 0; i < posAttr.count; i++) {
    let x = posAttr.getX(i);
    let y = posAttr.getY(i);
    let z = posAttr.getZ(i);

    const dist = Math.sqrt(x * x + z * z);
    const angle = Math.atan2(z, x);

    // Rim irregularities
    const noise = Math.sin(angle * 4) * 0.25 + Math.cos(angle * 7) * 0.15 + Math.sin(angle * 2) * 0.3;
    if (dist > 1.5) {
      x += (x / dist) * noise;
      z += (z / dist) * noise;
    }

    // Top surface gentle hillocks
    if (y > 0.1) {
      // Gentle slope: higher on north-east (x > 0, z < 0) for the windmill hill, lower at waterfall cliff edge (x < -2, z > 1)
      const hill = Math.sin(x * 0.5 + 1.0) * 0.35 + Math.cos(z * 0.5) * 0.25;
      // River trench depression
      const riverDist = Math.abs(z - Math.sin(x * 0.8) * 1.5);
      if (riverDist < 1.0 && x > -4.5 && x < 4.0) {
        y -= (1.0 - riverDist) * 0.25;
      }
      y += hill * 0.5;
    }

    posAttr.setXYZ(i, x, y, z);
  }
  topGeo.computeVertexNormals();

  const topMesh = new THREE.Mesh(topGeo, grassMat);
  topMesh.position.y = 0;
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // 2. Vertical Stratified Rocky Cliffs & Underbelly Stalactite
  // Inverted cone tapering down into the abyss
  const cliffGeo = new THREE.CylinderGeometry(topRadius * 1.04, 0.4, 6.0, 32, 16);
  const cliffPos = cliffGeo.attributes.position;

  for (let i = 0; i < cliffPos.count; i++) {
    let x = cliffPos.getX(i);
    let y = cliffPos.getY(i);
    let z = cliffPos.getZ(i);

    const hFactor = (y + 3.0) / 6.0; // 0 at bottom, 1 at top
    const angle = Math.atan2(z, x);
    const dist = Math.sqrt(x * x + z * z);

    // Strata and craggy cliff cracks
    const crag = Math.sin(angle * 6 + y * 2.0) * 0.45 * hFactor +
                 Math.cos(angle * 11 + y * 4.0) * 0.2 * hFactor +
                 Math.sin(y * 8.0) * 0.15;

    // Waterfall notch on the cliff where water plunges
    const isWaterfallSide = (x < -2.2 && z > 0.8 && z < 2.8);
    if (isWaterfallSide && y > -1.5) {
      x *= 0.85;
      z *= 0.85;
    }

    if (dist > 0.1) {
      x += (x / dist) * crag;
      z += (z / dist) * crag;
    }

    // Slightly bend bottom tail
    if (y < -1.5) {
      x += (y + 1.5) * 0.15;
      z -= (y + 1.5) * 0.1;
    }

    cliffPos.setXYZ(i, x, y, z);
  }
  cliffGeo.computeVertexNormals();

  const cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
  cliffMesh.position.y = -3.2;
  cliffMesh.castShadow = true;
  cliffMesh.receiveShadow = true;
  group.add(cliffMesh);

  // Rocky shelf layers / protruding crags
  const shelfCount = 18;
  for (let i = 0; i < shelfCount; i++) {
    const angle = (i / shelfCount) * Math.PI * 2 + Math.sin(i * 3) * 0.3;
    const r = topRadius * (0.8 + Math.random() * 0.3);
    const y = -0.5 - Math.random() * 3.5;
    const sx = 0.8 + Math.random() * 1.2;
    const sy = 0.4 + Math.random() * 0.6;
    const sz = 0.8 + Math.random() * 1.0;

    const cragGeo = new THREE.DodecahedronGeometry(1.0, 0);
    const cragMesh = new THREE.Mesh(cragGeo, (i % 3 === 0) ? cliffDarkMat : cliffMat);
    cragMesh.position.set(Math.cos(angle) * r * 0.9, y, Math.sin(angle) * r * 0.9);
    cragMesh.scale.set(sx, sy, sz);
    cragMesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    cragMesh.castShadow = true;
    cragMesh.receiveShadow = true;
    group.add(cragMesh);
  }

  // 3. Dangling Vine Tendrils & Roots hanging into the void
  const vineCount = 14;
  const vineMat = new THREE.MeshStandardMaterial({
    color: 0x3d5c28,
    roughness: 0.9,
    flatShading: true,
  });

  for (let i = 0; i < vineCount; i++) {
    const angle = (i / vineCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const startR = topRadius * (0.85 + Math.random() * 0.2);
    const length = 2.5 + Math.random() * 3.5;
    const curvePoints: THREE.Vector3[] = [];

    let currentX = Math.cos(angle) * startR;
    let currentZ = Math.sin(angle) * startR;
    let currentY = -0.5;

    for (let p = 0; p <= 6; p++) {
      const t = p / 6;
      curvePoints.push(new THREE.Vector3(
        currentX + Math.sin(t * 5 + i) * 0.3 * t,
        currentY - length * t,
        currentZ + Math.cos(t * 4 + i) * 0.25 * t
      ));
    }

    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.045 + Math.random() * 0.03, 5, false);
    const vineMesh = new THREE.Mesh(tubeGeo, vineMat);
    vineMesh.castShadow = true;
    group.add(vineMesh);
  }

  // 4. Satellite Floating Micro-Islets
  const satelliteCoords = [
    { pos: new THREE.Vector3(5.8, -1.2, 3.2), scale: 0.65 },
    { pos: new THREE.Vector3(-5.5, -2.5, -3.8), scale: 0.8 },
    { pos: new THREE.Vector3(4.2, -3.2, -5.2), scale: 0.55 },
    { pos: new THREE.Vector3(-4.8, -4.5, 4.0), scale: 0.45 },
  ];

  satelliteCoords.forEach((sat, idx) => {
    const isletGroup = new THREE.Group();
    isletGroup.position.copy(sat.pos);

    // Islet rock base
    const baseGeo = new THREE.ConeGeometry(1.2 * sat.scale, 2.4 * sat.scale, 6);
    baseGeo.rotateX(Math.PI);
    const baseMesh = new THREE.Mesh(baseGeo, cliffMat);
    baseMesh.position.y = -1.0 * sat.scale;
    baseMesh.castShadow = true;
    isletGroup.add(baseMesh);

    // Islet grass cap
    const capGeo = new THREE.CylinderGeometry(1.25 * sat.scale, 1.1 * sat.scale, 0.3 * sat.scale, 7);
    const capMesh = new THREE.Mesh(capGeo, grassMat);
    capMesh.position.y = 0.1 * sat.scale;
    capMesh.castShadow = true;
    isletGroup.add(capMesh);

    // Tiny tree or crystal on top
    if (idx % 2 === 0) {
      const treeTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08 * sat.scale, 0.12 * sat.scale, 0.8 * sat.scale, 5),
        earthMat
      );
      treeTrunk.position.y = 0.5 * sat.scale;
      isletGroup.add(treeTrunk);

      const treeFoliage = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.45 * sat.scale, 1),
        new THREE.MeshStandardMaterial({ color: 0x4aa63a, flatShading: true })
      );
      treeFoliage.position.y = 0.9 * sat.scale;
      treeFoliage.castShadow = true;
      isletGroup.add(treeFoliage);
    } else {
      // Glow crystal
      const crystalGeo = new THREE.OctahedronGeometry(0.35 * sat.scale, 0);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x64e0ff,
        emissive: 0x2288aa,
        roughness: 0.2,
      });
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.y = 0.4 * sat.scale;
      isletGroup.add(crystal);
    }

    group.add(isletGroup);
  });

  // 5. Village Pathways (Cobblestone network connecting houses and bridge)
  // Cobblestone stepping slabs along main village street
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0xb5aa96,
    roughness: 0.8,
    flatShading: true,
  });

  const pathStonesGroup = new THREE.Group();
  for (let i = 0; i < 45; i++) {
    const t = i / 45;
    // Main street curves along village center
    const px = THREE.MathUtils.lerp(-3.0, 3.2, t);
    const pz = Math.sin(t * 3.14 * 2) * 1.2 + (Math.random() - 0.5) * 0.35;
    const py = 0.38 + Math.sin(px * 0.5 + 1.0) * 0.15;

    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2 + Math.random() * 0.1, 0.25 + Math.random() * 0.1, 0.08, 6),
      stoneMat
    );
    stone.position.set(px, py, pz);
    stone.rotation.y = Math.random() * Math.PI;
    stone.receiveShadow = true;
    pathStonesGroup.add(stone);
  }
  group.add(pathStonesGroup);

  // River spline helper
  const riverSpline = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.8, 0.52, -2.5),  // Source spring near upper hills
    new THREE.Vector3(2.5, 0.44, -1.2),
    new THREE.Vector3(1.0, 0.38, 0.1),   // Passes near village square
    new THREE.Vector3(-0.5, 0.35, -0.4), // Gentle curve under bridge
    new THREE.Vector3(-1.8, 0.32, 0.8),
    new THREE.Vector3(-3.2, 0.30, 1.8),  // Approaches cliff rim
    new THREE.Vector3(-4.2, 0.28, 2.0),  // Waterfall plunge edge
  ]);

  const getRiverPathPoint = (t: number) => riverSpline.getPoint(Math.max(0, Math.min(1, t)));

  return {
    group,
    materials: {
      grass: grassMat,
      cliff: cliffMat,
      cliffDark: cliffDarkMat,
      earth: earthMat,
      path: pathMat,
    },
    getRiverPathPoint,
  };
}
