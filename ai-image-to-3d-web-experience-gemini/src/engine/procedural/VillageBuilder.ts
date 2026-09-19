import * as THREE from 'three';

export interface VillageBuildResult {
  group: THREE.Group;
  update: (delta: number) => void;
  setNightMode: (isNight: boolean) => void;
  interactiveObjects: THREE.Object3D[];
}

export function buildVillage(customColors?: { roof?: string }): VillageBuildResult {
  const group = new THREE.Group();
  group.name = 'VillageGroup';

  const interactiveObjects: THREE.Object3D[] = [];

  // Materials
  const roofColor = customColors?.roof ? new THREE.Color(customColors.roof) : new THREE.Color(0xd65838);
  const wallColors = [
    new THREE.Color(0xf4efe6), // Warm stucco
    new THREE.Color(0xe8ded1), // Sandstone
    new THREE.Color(0xd8c8b4), // Earth plaster
    new THREE.Color(0xefdfc8), // Cream
  ];

  const roofMat = new THREE.MeshStandardMaterial({
    color: roofColor,
    roughness: 0.75,
    flatShading: true,
  });

  const roofDarkMat = new THREE.MeshStandardMaterial({
    color: roofColor.clone().multiplyScalar(0.75),
    roughness: 0.8,
    flatShading: true,
  });

  const wallMatList = wallColors.map(c => new THREE.MeshStandardMaterial({
    color: c,
    roughness: 0.85,
    flatShading: true,
  }));

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x6e4e37,
    roughness: 0.8,
    flatShading: true,
  });

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffe28a,
    emissive: 0xffa020,
    emissiveIntensity: 0.4,
    roughness: 0.3,
  });

  const chimneyMat = new THREE.MeshStandardMaterial({
    color: 0x7c736d,
    roughness: 0.9,
    flatShading: true,
  });

  // 1. Shared geometries for performance
  const doorGeo = new THREE.BoxGeometry(0.12, 0.22, 0.02);
  const windowGeo = new THREE.BoxGeometry(0.1, 0.12, 0.02);

  // Chimney smoke particles
  const smokePuffs: { mesh: THREE.Mesh; initialY: number; speed: number; phase: number }[] = [];
  const smokeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
    roughness: 1.0,
    flatShading: true,
  });
  const smokeGeo = new THREE.DodecahedronGeometry(0.08, 0);

  // Function to create a miniature cottage
  const createHouse = (
    pos: THREE.Vector3,
    rotY: number,
    scale: number = 1.0,
    hasChimney: boolean = true,
    houseName: string = 'Village Cottage'
  ) => {
    const houseGroup = new THREE.Group();
    houseGroup.position.copy(pos);
    houseGroup.rotation.y = rotY;
    houseGroup.scale.set(scale, scale, scale);

    const wallW = 0.65;
    const wallH = 0.55;
    const wallD = 0.8;

    // Wall body
    const wallMesh = new THREE.Mesh(
      new THREE.BoxGeometry(wallW, wallH, wallD),
      wallMatList[Math.floor(Math.random() * wallMatList.length)]
    );
    wallMesh.position.y = wallH * 0.5;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    houseGroup.add(wallMesh);

    // Terracotta Pitched Roof (triangular prism via 3-sided cylinder)
    const roofH = 0.42;
    const roofGeo = new THREE.CylinderGeometry(0.02, wallW * 0.75, roofH, 3, 1, false, 0);
    roofGeo.rotateY(Math.PI / 6);
    roofGeo.scale(1.0, 1.0, wallD * 1.25);
    const roofMesh = new THREE.Mesh(roofGeo, Math.random() > 0.3 ? roofMat : roofDarkMat);
    roofMesh.position.y = wallH + roofH * 0.48;
    roofMesh.castShadow = true;
    houseGroup.add(roofMesh);

    // Door
    const door = new THREE.Mesh(doorGeo, woodMat);
    door.position.set(0, 0.12, wallD * 0.5 + 0.01);
    houseGroup.add(door);

    // Windows
    const win1 = new THREE.Mesh(windowGeo, windowMat);
    win1.position.set(-wallW * 0.28, 0.26, wallD * 0.5 + 0.01);
    houseGroup.add(win1);

    const win2 = new THREE.Mesh(windowGeo, windowMat);
    win2.position.set(wallW * 0.28, 0.26, wallD * 0.5 + 0.01);
    houseGroup.add(win2);

    // Side windows
    const win3 = new THREE.Mesh(windowGeo, windowMat);
    win3.position.set(wallW * 0.5 + 0.01, 0.26, 0);
    win3.rotation.y = Math.PI / 2;
    houseGroup.add(win3);

    // Chimney & Smoke
    if (hasChimney) {
      const chimney = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.4, 0.12),
        chimneyMat
      );
      chimney.position.set(wallW * 0.25, wallH + roofH * 0.6, -wallD * 0.2);
      chimney.castShadow = true;
      houseGroup.add(chimney);

      // Create 3 animated smoke puffs
      for (let s = 0; s < 3; s++) {
        const puff = new THREE.Mesh(smokeGeo, smokeMat);
        const startY = chimney.position.y + 0.25 + s * 0.18;
        puff.position.set(chimney.position.x, startY, chimney.position.z);
        houseGroup.add(puff);
        smokePuffs.push({
          mesh: puff,
          initialY: chimney.position.y + 0.25,
          speed: 0.35 + Math.random() * 0.2,
          phase: s * 1.2,
        });
      }
    }

    houseGroup.userData = {
      type: 'house',
      title: houseName,
      description: `A traditional hillside cottage with terracotta tiled roof and stone masonry.`,
      position: [pos.x, pos.y, pos.z],
    };
    interactiveObjects.push(houseGroup);

    group.add(houseGroup);
    return houseGroup;
  };

  // Village Layout (Dozens of houses placed along riverbanks and backside)
  const houseLayouts = [
    // Front Riverbank Cluster (Main village square)
    { pos: new THREE.Vector3(0.6, 0.38, 0.8), rot: 0.4, scale: 0.95, name: "Baker's Cottage" },
    { pos: new THREE.Vector3(1.6, 0.42, 0.9), rot: -0.3, scale: 1.05, name: "Town Apothecary" },
    { pos: new THREE.Vector3(2.4, 0.46, 0.2), rot: -0.7, scale: 0.9, name: "Fisherman's Lodge" },
    { pos: new THREE.Vector3(1.2, 0.40, 1.8), rot: 0.2, scale: 1.0, name: "Weaver's House" },
    { pos: new THREE.Vector3(0.2, 0.36, 1.9), rot: 0.8, scale: 0.85, name: "Herbalist Workshop" },
    { pos: new THREE.Vector3(2.2, 0.44, 1.6), rot: -0.5, scale: 0.95, name: "Carpenter's Den" },
    { pos: new THREE.Vector3(3.1, 0.50, 1.1), rot: -1.0, scale: 0.88, name: "Valley Forge" },

    // North / Riverbank cluster (opposite bank)
    { pos: new THREE.Vector3(0.8, 0.40, -1.0), rot: 2.8, scale: 1.0, name: "Canalside Tavern" },
    { pos: new THREE.Vector3(1.8, 0.44, -0.6), rot: 3.1, scale: 0.9, name: "Blacksmith Studio" },
    { pos: new THREE.Vector3(2.6, 0.48, -1.4), rot: 2.4, scale: 0.95, name: "Potter's Kiln" },
    { pos: new THREE.Vector3(-0.4, 0.35, -1.2), rot: 2.6, scale: 0.85, name: "Cobbler's House" },
    { pos: new THREE.Vector3(1.2, 0.42, -2.1), rot: 2.9, scale: 1.1, name: "Riverside Granary" },
    { pos: new THREE.Vector3(2.1, 0.46, -2.5), rot: 3.0, scale: 0.8, name: "Mason's Quarters" },

    // Hillside Terraces (Climbing towards windmill hill)
    { pos: new THREE.Vector3(3.2, 0.54, -0.5), rot: -1.2, scale: 1.1, name: "Mayor's Manor" },
    { pos: new THREE.Vector3(3.6, 0.56, -1.8), rot: -1.6, scale: 0.85, name: "Hilltop Observatory" },
    { pos: new THREE.Vector3(2.8, 0.52, -3.2), rot: -2.1, scale: 0.9, name: "Vineyard Cottage" },
    { pos: new THREE.Vector3(3.7, 0.58, 0.3), rot: -0.9, scale: 0.8, name: "Sunrise Belfry" },

    // Near Waterfall & West Overlook
    { pos: new THREE.Vector3(-1.4, 0.32, 1.6), rot: 0.6, scale: 0.9, name: "Waterfall Lookout" },
    { pos: new THREE.Vector3(-2.2, 0.30, 0.5), rot: 1.2, scale: 0.85, name: "Cliffhanger Shack" },
    { pos: new THREE.Vector3(-1.2, 0.33, 2.7), rot: 0.3, scale: 0.8, name: "Rainbow Falls Cabin" },
    { pos: new THREE.Vector3(-2.6, 0.29, 2.6), rot: 0.9, scale: 0.75, name: "Mist Watch House" },

    // Seamless Backside & Southern Slopes (ensures rich 360° exploration)
    { pos: new THREE.Vector3(-1.8, 0.32, -1.8), rot: 2.0, scale: 0.95, name: "Pinecrest Retreat" },
    { pos: new THREE.Vector3(-2.8, 0.28, -1.1), rot: 1.7, scale: 0.85, name: "West Edge Cottage" },
    { pos: new THREE.Vector3(-0.9, 0.34, -2.8), rot: 2.4, scale: 0.9, name: "Silent Grove Nook" },
    { pos: new THREE.Vector3(0.1, 0.36, -3.4), rot: 2.8, scale: 0.85, name: "Starlight Cabin" },
    { pos: new THREE.Vector3(1.5, 0.42, -3.6), rot: 3.1, scale: 0.8, name: "Backside Watchtower" },
    { pos: new THREE.Vector3(-2.2, 0.29, -2.5), rot: 1.9, scale: 0.75, name: "Shadow Rock Hermitage" },
    { pos: new THREE.Vector3(-3.4, 0.26, -0.4), rot: 1.5, scale: 0.78, name: "Abyss Point Cabin" },

    // Southeastern Garden cluster
    { pos: new THREE.Vector3(-0.8, 0.34, 3.2), rot: 0.1, scale: 0.85, name: "Meadow Cottage" },
    { pos: new THREE.Vector3(0.6, 0.37, 2.9), rot: -0.2, scale: 0.9, name: "Flora Haven" },
    { pos: new THREE.Vector3(1.8, 0.41, 2.6), rot: -0.4, scale: 0.8, name: "Lavender Lodge" },
    { pos: new THREE.Vector3(2.8, 0.45, 2.2), rot: -0.7, scale: 0.75, name: "Orchard House" },
  ];

  houseLayouts.forEach(h => {
    createHouse(h.pos, h.rot, h.scale, Math.random() > 0.35, h.name);
  });

  // 2. Windmill Feature on the High Hill
  const windmillGroup = new THREE.Group();
  windmillGroup.position.set(3.4, 0.6, -2.2);

  // Octagonal base
  const millBaseGeo = new THREE.CylinderGeometry(0.55, 0.75, 1.6, 8);
  const millBase = new THREE.Mesh(millBaseGeo, wallMatList[0]);
  millBase.position.y = 0.8;
  millBase.castShadow = true;
  millBase.receiveShadow = true;
  windmillGroup.add(millBase);

  // Wooden door and window
  const millDoor = new THREE.Mesh(doorGeo, woodMat);
  millDoor.position.set(0, 0.25, 0.76);
  windmillGroup.add(millDoor);

  const millWin = new THREE.Mesh(windowGeo, windowMat);
  millWin.position.set(0, 1.1, 0.62);
  windmillGroup.add(millWin);

  // Conical roof cap
  const millRoofGeo = new THREE.ConeGeometry(0.7, 0.85, 8);
  const millRoof = new THREE.Mesh(millRoofGeo, roofMat);
  millRoof.position.y = 1.6 + 0.42;
  millRoof.castShadow = true;
  windmillGroup.add(millRoof);

  // Rotor hub and blades
  const rotorGroup = new THREE.Group();
  rotorGroup.position.set(0, 1.5, 0.65);

  const hubMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 8), woodMat);
  hubMesh.rotateX(Math.PI / 2);
  rotorGroup.add(hubMesh);

  // 4 Blades with lattice struts
  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });

  for (let b = 0; b < 4; b++) {
    const bladeArm = new THREE.Group();
    bladeArm.rotation.z = (b * Math.PI) / 2;

    // Wood spar
    const spar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.04), woodMat);
    spar.position.y = 0.65;
    bladeArm.add(spar);

    // Sail canvas
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.9), bladeMat);
    sail.position.set(0.12, 0.75, 0.01);
    bladeArm.add(sail);

    rotorGroup.add(bladeArm);
  }

  windmillGroup.add(rotorGroup);

  windmillGroup.userData = {
    type: 'windmill',
    title: 'Windmill of Zephyr',
    description: 'The ancient grain mill perched atop the eastern cliff, catching the high altitude trade winds.',
    position: [windmillGroup.position.x, windmillGroup.position.y, windmillGroup.position.z],
  };
  interactiveObjects.push(windmillGroup);
  group.add(windmillGroup);

  // 3. Arched River Bridge
  const bridgeGroup = new THREE.Group();
  bridgeGroup.position.set(-0.2, 0.42, -0.3);
  bridgeGroup.rotation.y = THREE.MathUtils.degToRad(35);

  // Bridge deck curve
  const deckLength = 1.5;
  const deckWidth = 0.55;
  const bridgeArchGeo = new THREE.CylinderGeometry(deckWidth * 0.5, deckWidth * 0.5, deckLength, 12, 1, false, 0, Math.PI);
  bridgeArchGeo.rotateZ(Math.PI / 2);
  bridgeArchGeo.scale(1.0, 0.25, 1.0);

  const bridgeDeck = new THREE.Mesh(
    new THREE.BoxGeometry(deckLength, 0.08, deckWidth),
    woodMat
  );
  bridgeDeck.castShadow = true;
  bridgeDeck.receiveShadow = true;
  bridgeGroup.add(bridgeDeck);

  // Wooden handrails
  const railGeo = new THREE.BoxGeometry(deckLength, 0.04, 0.04);
  const rail1 = new THREE.Mesh(railGeo, woodMat);
  rail1.position.set(0, 0.16, deckWidth * 0.45);
  bridgeGroup.add(rail1);

  const rail2 = new THREE.Mesh(railGeo, woodMat);
  rail2.position.set(0, 0.16, -deckWidth * 0.45);
  bridgeGroup.add(rail2);

  // Rail posts
  for (let p = -2; p <= 2; p++) {
    const postGeo = new THREE.BoxGeometry(0.04, 0.22, 0.04);
    const post1 = new THREE.Mesh(postGeo, woodMat);
    post1.position.set((p / 2) * 0.6, 0.08, deckWidth * 0.45);
    bridgeGroup.add(post1);

    const post2 = new THREE.Mesh(postGeo, woodMat);
    post2.position.set((p / 2) * 0.6, 0.08, -deckWidth * 0.45);
    bridgeGroup.add(post2);
  }

  bridgeGroup.userData = {
    type: 'bridge',
    title: 'Timber Crossing',
    description: 'A handcrafted wooden arch bridge uniting the upper and lower village districts.',
    position: [bridgeGroup.position.x, bridgeGroup.position.y, bridgeGroup.position.z],
  };
  interactiveObjects.push(bridgeGroup);
  group.add(bridgeGroup);

  // 4. Wooden Pier / Dock & Rowboat
  const dockGroup = new THREE.Group();
  dockGroup.position.set(1.4, 0.4, 0.15);
  dockGroup.rotation.y = 0.6;

  const pierPlank = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 0.35), woodMat);
  pierPlank.castShadow = true;
  dockGroup.add(pierPlank);

  // Tiny rowboat floating in water
  const boatGroup = new THREE.Group();
  boatGroup.position.set(0.65, -0.06, 0.05);
  boatGroup.rotation.y = 0.3;

  const boatHull = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.15, 0.25),
    woodMat
  );
  boatHull.castShadow = true;
  boatGroup.add(boatHull);

  const oar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4), woodMat);
  oar.rotation.z = Math.PI / 4;
  oar.position.set(0, 0.1, 0.1);
  boatGroup.add(oar);

  boatGroup.userData = {
    type: 'boat',
    title: 'Fisherman Skiff',
    description: 'A small wooden skiff tied to the dock for catching fresh river trout.',
    position: [1.8, 0.35, 0.2],
  };
  interactiveObjects.push(boatGroup);
  dockGroup.add(boatGroup);
  group.add(dockGroup);

  // 5. Cozy Street Lanterns along pathways
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xffd277,
    emissive: 0xffa500,
    emissiveIntensity: 0.8,
  });

  const lanternCoords = [
    new THREE.Vector3(0.0, 0.4, 0.4),
    new THREE.Vector3(1.1, 0.42, 0.5),
    new THREE.Vector3(2.1, 0.46, 0.7),
    new THREE.Vector3(-0.6, 0.38, -0.7),
    new THREE.Vector3(0.8, 0.41, -0.4),
    new THREE.Vector3(2.8, 0.52, -1.8),
  ];

  lanternCoords.forEach((lp, idx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.5, 6), chimneyMat);
    post.position.set(lp.x, lp.y + 0.25, lp.z);
    post.castShadow = true;
    group.add(post);

    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), lanternMat);
    globe.position.set(lp.x, lp.y + 0.52, lp.z);
    group.add(globe);

    // Subtle point light for night illumination
    const lampLight = new THREE.PointLight(0xffa238, 0.4, 2.5);
    lampLight.position.copy(globe.position);
    lampLight.name = `lantern_light_${idx}`;
    group.add(lampLight);
  });

  // Animation Update
  let time = 0;
  const update = (delta: number) => {
    time += delta;

    // Spin windmill blades
    rotorGroup.rotation.z -= delta * 1.5;

    // Bob boat gently
    boatGroup.position.y = -0.06 + Math.sin(time * 2.2) * 0.02;
    boatGroup.rotation.z = Math.sin(time * 1.8) * 0.04;

    // Chimney smoke rise & fade
    smokePuffs.forEach(sp => {
      sp.mesh.position.y += delta * sp.speed;
      const progress = (sp.mesh.position.y - sp.initialY) / 0.8;

      if (progress >= 1.0) {
        sp.mesh.position.y = sp.initialY;
        sp.mesh.scale.set(0.6, 0.6, 0.6);
      } else {
        const scale = 0.6 + progress * 1.2;
        sp.mesh.scale.set(scale, scale, scale);
        // Slight wind drift
        sp.mesh.position.x += Math.sin(time + sp.phase) * delta * 0.04;
      }
    });
  };

  const setNightMode = (isNight: boolean) => {
    windowMat.emissiveIntensity = isNight ? 1.5 : 0.4;
    lanternMat.emissiveIntensity = isNight ? 2.5 : 0.8;

    group.traverse(obj => {
      if (obj.name.startsWith('lantern_light_') && obj instanceof THREE.PointLight) {
        obj.intensity = isNight ? 1.2 : 0.3;
      }
    });
  };

  return {
    group,
    update,
    setNightMode,
    interactiveObjects,
  };
}
