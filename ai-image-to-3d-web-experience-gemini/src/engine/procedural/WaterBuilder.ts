import * as THREE from 'three';

export interface WaterBuildResult {
  group: THREE.Group;
  update: (delta: number) => void;
  setFlowSpeed: (speed: number) => void;
}

export function buildWater(
  getRiverPoint: (t: number) => THREE.Vector3,
  customColor?: string
): WaterBuildResult {
  const group = new THREE.Group();
  group.name = 'WaterGroup';

  let flowSpeed = 1.0;
  const waterColor = customColor ? new THREE.Color(customColor) : new THREE.Color(0x3ab3db);
  const foamColor = new THREE.Color(0xffffff);

  // 1. River Surface Mesh (Extruded ribbon following river spline)
  const splineSteps = 40;
  const riverWidth = 0.85;

  const riverPositions: number[] = [];
  const riverUvs: number[] = [];
  const riverIndices: number[] = [];

  for (let i = 0; i <= splineSteps; i++) {
    const t = i / splineSteps;
    const center = getRiverPoint(t);
    // Approximate tangent
    const nextCenter = getRiverPoint(Math.min(1, t + 0.02));
    const tangent = nextCenter.clone().sub(center).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Variable river width (starts narrower at spring, widens near waterfall)
    const currentWidth = riverWidth * (0.65 + t * 0.7);

    const left = center.clone().addScaledVector(normal, -currentWidth * 0.5);
    const right = center.clone().addScaledVector(normal, currentWidth * 0.5);

    riverPositions.push(left.x, left.y, left.z);
    riverPositions.push(right.x, right.y, right.z);

    riverUvs.push(0, t * 8);
    riverUvs.push(1, t * 8);

    if (i < splineSteps) {
      const base = i * 2;
      riverIndices.push(base, base + 1, base + 2);
      riverIndices.push(base + 1, base + 3, base + 2);
    }
  }

  const riverGeo = new THREE.BufferGeometry();
  riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(riverPositions, 3));
  riverGeo.setAttribute('uv', new THREE.Float32BufferAttribute(riverUvs, 2));
  riverGeo.setIndex(riverIndices);
  riverGeo.computeVertexNormals();

  const riverMat = new THREE.MeshStandardMaterial({
    color: waterColor,
    roughness: 0.1,
    metalness: 0.15,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });

  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  group.add(riverMesh);

  // 2. Dramatic Waterfall Curtain cascading off the cliffside into the void
  // Starts at river end: (-4.2, 0.28, 2.0)
  const fallStart = getRiverPoint(1.0);
  const fallHeight = 6.2;
  const fallWidth = 1.35;
  const fallSegmentsY = 32;
  const fallSegmentsX = 12;

  const fallGeo = new THREE.PlaneGeometry(fallWidth, fallHeight, fallSegmentsX, fallSegmentsY);
  const fallPos = fallGeo.attributes.position;

  for (let i = 0; i < fallPos.count; i++) {
    const x = fallPos.getX(i);
    let y = fallPos.getY(i); // range -fallHeight/2 to fallHeight/2
    let z = fallPos.getZ(i);

    // Natural curve: water arches outwards over the cliff edge before falling straight down
    const normY = 1.0 - (y + fallHeight / 2) / fallHeight; // 0 at top, 1 at bottom
    z -= Math.sin(normY * Math.PI * 0.4) * 0.75 + (normY * 0.35);

    // Turbulence billows
    z += Math.sin(y * 4.0 + x * 5.0) * 0.08;

    fallPos.setXYZ(i, x, y, z);
  }
  fallGeo.computeVertexNormals();

  const fallMat = new THREE.MeshStandardMaterial({
    color: 0x9be9ff,
    roughness: 0.15,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });

  const fallMesh = new THREE.Mesh(fallGeo, fallMat);
  // Position waterfall at the cliff lip
  fallMesh.position.set(fallStart.x - 0.2, fallStart.y - fallHeight * 0.45, fallStart.z);
  fallMesh.rotation.y = THREE.MathUtils.degToRad(-60);
  fallMesh.castShadow = true;
  group.add(fallMesh);

  // Waterfall foam crest at the edge
  const crestGeo = new THREE.TorusGeometry(0.65, 0.12, 8, 16, Math.PI);
  crestGeo.rotateX(Math.PI / 2);
  const crestMat = new THREE.MeshStandardMaterial({
    color: foamColor,
    roughness: 0.4,
    transparent: true,
    opacity: 0.95,
  });
  const crestMesh = new THREE.Mesh(crestGeo, crestMat);
  crestMesh.position.set(fallStart.x, fallStart.y + 0.02, fallStart.z);
  crestMesh.rotation.y = THREE.MathUtils.degToRad(30);
  group.add(crestMesh);

  // 3. Dynamic Water Spray & Falling Mist Particle System
  const particleCount = 140;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleVelocities: { x: number; y: number; z: number; life: number; maxLife: number }[] = [];

  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = fallStart.x + (Math.random() - 0.5) * 1.2;
    particlePositions[i * 3 + 1] = fallStart.y - Math.random() * fallHeight;
    particlePositions[i * 3 + 2] = fallStart.z + (Math.random() - 0.5) * 1.2;

    particleVelocities.push({
      x: (Math.random() - 0.5) * 0.3 - 0.2,
      y: -(0.8 + Math.random() * 1.4),
      z: (Math.random() - 0.5) * 0.3 + 0.15,
      life: Math.random(),
      maxLife: 1.0 + Math.random() * 0.8,
    });
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  // Circular soft particle texture
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const radGrad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  radGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
  radGrad.addColorStop(0.4, 'rgba(210, 245, 255, 0.6)');
  radGrad.addColorStop(1, 'rgba(210, 245, 255, 0)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, 64, 64);
  const sprayTexture = new THREE.CanvasTexture(canvas);

  const particleMat = new THREE.PointsMaterial({
    map: sprayTexture,
    size: 0.35,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const particleSystem = new THREE.Points(particleGeo, particleMat);
  group.add(particleSystem);

  // 4. Mist cloud ring below waterfall terminus
  const mistGroup = new THREE.Group();
  mistGroup.position.set(fallStart.x - 0.8, fallStart.y - fallHeight - 0.5, fallStart.z + 0.5);

  const mistPuffCount = 6;
  const mistMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
    roughness: 1.0,
    flatShading: true,
  });

  const mistPuffs: THREE.Mesh[] = [];
  for (let i = 0; i < mistPuffCount; i++) {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + Math.random() * 0.35, 1), mistMat);
    puff.position.set((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 1.4);
    mistGroup.add(puff);
    mistPuffs.push(puff);
  }
  group.add(mistGroup);

  // Animation Update
  let time = 0;
  const update = (delta: number) => {
    time += delta * flowSpeed;

    // Shift river UVs to simulate water flow
    const uvAttr = riverGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uvAttr.count; i++) {
      let v = uvAttr.getY(i);
      v -= delta * 0.8 * flowSpeed;
      if (v < -10) v += 10;
      uvAttr.setY(i, v);
    }
    uvAttr.needsUpdate = true;

    // Subtle water surface shimmer
    riverMesh.rotation.y = Math.sin(time * 0.5) * 0.002;

    // Update particles
    const positions = particleGeo.attributes.position.array as Float32Array;
    for (let i = 0; i < particleCount; i++) {
      const vel = particleVelocities[i];
      vel.life += delta;

      if (vel.life > vel.maxLife) {
        // Reset particle to top of waterfall
        vel.life = 0;
        positions[i * 3] = fallStart.x + (Math.random() - 0.5) * 0.8;
        positions[i * 3 + 1] = fallStart.y + (Math.random() - 0.5) * 0.2;
        positions[i * 3 + 2] = fallStart.z + (Math.random() - 0.5) * 0.8;
      } else {
        positions[i * 3] += vel.x * delta * flowSpeed;
        positions[i * 3 + 1] += vel.y * delta * flowSpeed;
        positions[i * 3 + 2] += vel.z * delta * flowSpeed;
      }
    }
    particleGeo.attributes.position.needsUpdate = true;

    // Mist puffs pulsing
    mistPuffs.forEach((puff, idx) => {
      puff.rotation.y += delta * 0.2 * (idx % 2 === 0 ? 1 : -1);
      const scale = 1.0 + Math.sin(time * 2 + idx) * 0.15;
      puff.scale.set(scale, scale, scale);
    });
  };

  const setFlowSpeed = (speed: number) => {
    flowSpeed = speed;
  };

  return {
    group,
    update,
    setFlowSpeed,
  };
}
