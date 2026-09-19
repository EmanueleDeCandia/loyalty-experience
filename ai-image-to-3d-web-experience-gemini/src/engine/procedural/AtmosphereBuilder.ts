import * as THREE from 'three';

export interface AtmosphereBuildResult {
  group: THREE.Group;
  update: (delta: number) => void;
  setCloudSpeed: (speed: number) => void;
  setSkyColors: (topColor: THREE.Color, bottomColor: THREE.Color) => void;
  interactiveObjects: THREE.Object3D[];
}

export function buildAtmosphere(): AtmosphereBuildResult {
  const group = new THREE.Group();
  group.name = 'AtmosphereGroup';

  const interactiveObjects: THREE.Object3D[] = [];
  let cloudSpeedMultiplier = 1.0;

  // 1. Stylized Volumetric Clouds
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
    flatShading: true,
  });

  const cloudMatTranslucent = new THREE.MeshStandardMaterial({
    color: 0xf2f8ff,
    roughness: 0.9,
    transparent: true,
    opacity: 0.92,
    flatShading: true,
  });

  interface CloudInstance {
    group: THREE.Group;
    orbitRadius: number;
    orbitAngle: number;
    orbitSpeed: number;
    baseY: number;
    bobSpeed: number;
  }

  const clouds: CloudInstance[] = [];

  // Function to build a puffy volumetric cloud cluster
  const createVolumetricCloud = (puffCount: number = 7, scale: number = 1.0) => {
    const cloudCluster = new THREE.Group();
    const puffGeo = new THREE.DodecahedronGeometry(0.8, 1);

    for (let i = 0; i < puffCount; i++) {
      const puff = new THREE.Mesh(puffGeo, (i % 2 === 0) ? cloudMat : cloudMatTranslucent);
      const px = (i === 0) ? 0 : (Math.random() - 0.5) * 2.2 * scale;
      const py = (i === 0) ? 0 : (Math.random() - 0.5) * 0.7 * scale;
      const pz = (i === 0) ? 0 : (Math.random() - 0.5) * 1.5 * scale;
      const ps = (1.0 - Math.random() * 0.4) * scale;

      puff.position.set(px, py, pz);
      puff.scale.set(ps, ps * 0.85, ps);
      puff.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      puff.castShadow = true;
      cloudCluster.add(puff);
    }

    return cloudCluster;
  };

  // Generate 8 floating cloud formations around the diorama
  const cloudConfigs = [
    { radius: 8.5, angle: 0.2, y: 1.5, scale: 0.85, speed: 0.08 },
    { radius: 10.0, angle: 1.8, y: 3.2, scale: 1.1, speed: 0.05 },
    { radius: 7.8, angle: 3.2, y: -0.8, scale: 0.75, speed: 0.09 },
    { radius: 9.2, angle: 4.5, y: 2.0, scale: 0.95, speed: 0.06 },
    { radius: 8.0, angle: 5.6, y: -2.2, scale: 0.8, speed: 0.07 },
    { radius: 11.2, angle: 0.9, y: 0.5, scale: 1.25, speed: 0.04 },
    { radius: 9.5, angle: 2.7, y: -1.2, scale: 0.9, speed: 0.065 },
    { radius: 10.5, angle: 3.9, y: 4.0, scale: 1.0, speed: 0.055 },
  ];

  cloudConfigs.forEach(cfg => {
    const cloudMesh = createVolumetricCloud(7 + Math.floor(Math.random() * 4), cfg.scale);
    group.add(cloudMesh);

    clouds.push({
      group: cloudMesh,
      orbitRadius: cfg.radius,
      orbitAngle: cfg.angle,
      orbitSpeed: cfg.speed,
      baseY: cfg.y,
      bobSpeed: 0.8 + Math.random() * 0.6,
    });
  });

  // 2. Whimsical Miniature Flying Airship / Dirigible
  const airshipGroup = new THREE.Group();
  airshipGroup.position.set(6.5, 3.8, -4.0);

  // Gas balloon envelope
  const gasGeo = new THREE.SphereGeometry(0.8, 12, 12);
  gasGeo.scale(1.8, 0.9, 0.9);
  const gasMat = new THREE.MeshStandardMaterial({
    color: 0xdf4a32,
    roughness: 0.6,
    flatShading: true,
  });
  const gasMesh = new THREE.Mesh(gasGeo, gasMat);
  airshipGroup.add(gasMesh);

  // Striped pattern ring
  const stripeGeo = new THREE.TorusGeometry(0.73, 0.06, 8, 16);
  stripeGeo.rotateY(Math.PI / 2);
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const stripe1 = new THREE.Mesh(stripeGeo, stripeMat);
  stripe1.position.x = -0.3;
  airshipGroup.add(stripe1);
  const stripe2 = new THREE.Mesh(stripeGeo, stripeMat);
  stripe2.position.x = 0.3;
  airshipGroup.add(stripe2);

  // Gondola / basket
  const basketGeo = new THREE.BoxGeometry(0.5, 0.22, 0.25);
  const basketMat = new THREE.MeshStandardMaterial({ color: 0x5a3e26, roughness: 0.8 });
  const basket = new THREE.Mesh(basketGeo, basketMat);
  basket.position.set(0, -0.65, 0);
  airshipGroup.add(basket);

  // Suspension rigging lines
  for (let r = -1; r <= 1; r += 2) {
    const lineGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.45, 3);
    const line1 = new THREE.Mesh(lineGeo, basketMat);
    line1.position.set(r * 0.18, -0.45, 0.08);
    airshipGroup.add(line1);

    const line2 = new THREE.Mesh(lineGeo, basketMat);
    line2.position.set(r * 0.18, -0.45, -0.08);
    airshipGroup.add(line2);
  }

  // Small tail propeller
  const propGroup = new THREE.Group();
  propGroup.position.set(-1.45, 0, 0);
  const propBlade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.06), basketMat);
  propGroup.add(propBlade);
  airshipGroup.add(propGroup);

  airshipGroup.userData = {
    type: 'airship',
    title: 'The Sky Corsair',
    description: 'A whimsical cargo dirigible commuting between the floating island and high cloud ports.',
    position: [airshipGroup.position.x, airshipGroup.position.y, airshipGroup.position.z],
  };
  interactiveObjects.push(airshipGroup);
  group.add(airshipGroup);

  // 3. Circling Stylized Birds
  const birdGroup = new THREE.Group();
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x2c3e50 });
  const birds: { mesh: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; offsetAngle: number; speed: number; radius: number; height: number }[] = [];

  for (let b = 0; b < 6; b++) {
    const bird = new THREE.Group();
    // Wing left
    const wingGeo = new THREE.BufferGeometry();
    const wingVerts = new Float32Array([
      0, 0, 0,
      -0.18, 0, 0.08,
      0, 0, 0.08
    ]);
    wingGeo.setAttribute('position', new THREE.BufferAttribute(wingVerts, 3));
    const wingL = new THREE.Mesh(wingGeo, birdMat);
    bird.add(wingL);

    const wingR = wingL.clone();
    wingR.scale.x = -1;
    bird.add(wingR);

    birdGroup.add(bird);
    birds.push({
      mesh: bird,
      wingL,
      wingR,
      offsetAngle: (b / 6) * Math.PI * 2,
      speed: 0.8 + Math.random() * 0.3,
      radius: 4.5 + Math.random() * 1.5,
      height: 2.5 + Math.random() * 1.2,
    });
  }
  group.add(birdGroup);

  // 4. Background Sky Hemisphere Dome with radial gradient
  const skyRadius = 45;
  const skyGeo = new THREE.SphereGeometry(skyRadius, 32, 16);
  // Invert normals so inside of sphere is visible
  skyGeo.scale(-1, 1, 1);

  // Custom vertex/fragment gradient sky shader
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x76b6fe) },
      bottomColor: { value: new THREE.Color(0xd7f1ff) },
      offset: { value: 10 },
      exponent: { value: 0.8 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  });

  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  group.add(skyMesh);

  // Animation Update
  let time = 0;
  const update = (delta: number) => {
    time += delta;

    // Orbit and bob clouds
    clouds.forEach((cloud, idx) => {
      cloud.orbitAngle += delta * cloud.orbitSpeed * cloudSpeedMultiplier;
      const x = Math.cos(cloud.orbitAngle) * cloud.orbitRadius;
      const z = Math.sin(cloud.orbitAngle) * cloud.orbitRadius;
      const y = cloud.baseY + Math.sin(time * cloud.bobSpeed + idx) * 0.25;

      cloud.group.position.set(x, y, z);
      cloud.group.rotation.y = -cloud.orbitAngle + Math.PI / 2;
    });

    // Airship cruising in wide circle
    const airshipAngle = time * 0.12 * cloudSpeedMultiplier;
    const airshipR = 7.5;
    airshipGroup.position.x = Math.cos(airshipAngle) * airshipR;
    airshipGroup.position.z = Math.sin(airshipAngle) * airshipR;
    airshipGroup.position.y = 3.6 + Math.sin(time * 0.8) * 0.3;
    airshipGroup.rotation.y = -airshipAngle - Math.PI / 2;
    propGroup.rotation.x += delta * 15;

    // Birds circling & flapping wings
    birds.forEach(b => {
      const angle = time * b.speed * 0.5 + b.offsetAngle;
      b.mesh.position.set(
        Math.cos(angle) * b.radius - 1.0,
        b.height + Math.sin(time * 3 + b.offsetAngle) * 0.2,
        Math.sin(angle) * b.radius + 0.5
      );
      b.mesh.rotation.y = -angle + Math.PI / 2;
      const wingFlap = Math.sin(time * 12 + b.offsetAngle * 2) * 0.5;
      b.wingL.rotation.z = wingFlap;
      b.wingR.rotation.z = -wingFlap;
    });
  };

  const setCloudSpeed = (speed: number) => {
    cloudSpeedMultiplier = speed;
  };

  const setSkyColors = (topColor: THREE.Color, bottomColor: THREE.Color) => {
    skyMat.uniforms.topColor.value.copy(topColor);
    skyMat.uniforms.bottomColor.value.copy(bottomColor);
  };

  return {
    group,
    update,
    setCloudSpeed,
    setSkyColors,
    interactiveObjects,
  };
}
