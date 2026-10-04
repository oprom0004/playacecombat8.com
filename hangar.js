/**
 * ACE COMBAT 8 - 3D Tactical Hangar & Aircraft Customizer Engine
 * Powered by Three.js WebGL & Interactive PBR Shaders
 */

(function() {
  const canvas = document.getElementById('hangarCanvas');
  if (!canvas) return;

  const container = canvas.parentElement;
  let width = container.clientWidth || window.innerWidth;
  let height = container.clientHeight || 600;

  // Scene Setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050a14);
  scene.fog = new THREE.FogExp2(0x050a14, 0.008);

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
  camera.position.set(22, 9, 26);

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Hangar Environment Lighting
  const ambientLight = new THREE.AmbientLight(0x38557a, 0.9);
  scene.add(ambientLight);

  // Overhead Key Floodlight
  const spotLight = new THREE.SpotLight(0xffffff, 2.5);
  spotLight.position.set(0, 35, 10);
  spotLight.angle = Math.PI / 3;
  spotLight.penumbra = 0.6;
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  scene.add(spotLight);

  // Cyan Telemetry Rim Light
  const rimLightCyan = new THREE.DirectionalLight(0x00f2fe, 1.8);
  rimLightCyan.position.set(-25, 12, -18);
  scene.add(rimLightCyan);

  // Amber Warning Accent Light
  const rimLightAmber = new THREE.DirectionalLight(0xffaa00, 1.2);
  rimLightAmber.position.set(25, 6, -20);
  scene.add(rimLightAmber);

  // Polished Hangar Floor with Warning Grid
  const floorGeo = new THREE.PlaneGeometry(160, 160);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x08101e,
    roughness: 0.25,
    metalness: 0.65
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Tactical Hangar Grid Markings
  const gridHelper = new THREE.GridHelper(160, 32, 0x00f2fe, 0x12243d);
  gridHelper.position.y = -3.18;
  scene.add(gridHelper);

  // Hangar Safety Ring
  const ringGeo = new THREE.RingGeometry(14, 14.3, 48);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -3.17;
  scene.add(ring);

  // Current State
  let currentPlaneType = 'f22a';
  let currentLivery = 'stealth';
  let currentSPW = 'qaam';
  let currentJetGroup = null;

  // Material Library for Liveries
  const liveryMaterials = {
    stealth: {
      body: new THREE.MeshStandardMaterial({ color: 0x222a36, roughness: 0.4, metalness: 0.7, flatShading: true }),
      accent: new THREE.MeshStandardMaterial({ color: 0x11161f, roughness: 0.5, metalness: 0.8 }),
      canopy: new THREE.MeshPhysicalMaterial({ color: 0x00f2fe, roughness: 0.05, metalness: 0.95, transparent: true, opacity: 0.85, transmission: 0.6 })
    },
    razgriz: {
      body: new THREE.MeshStandardMaterial({ color: 0x0d0f14, roughness: 0.35, metalness: 0.85, flatShading: true }),
      accent: new THREE.MeshStandardMaterial({ color: 0xcc1133, roughness: 0.3, metalness: 0.6 }),
      canopy: new THREE.MeshPhysicalMaterial({ color: 0xff1144, roughness: 0.05, metalness: 0.95, transparent: true, opacity: 0.85 })
    },
    arctic: {
      body: new THREE.MeshStandardMaterial({ color: 0xdde6f0, roughness: 0.45, metalness: 0.4, flatShading: true }),
      accent: new THREE.MeshStandardMaterial({ color: 0x3d6688, roughness: 0.4, metalness: 0.6 }),
      canopy: new THREE.MeshPhysicalMaterial({ color: 0x00f2fe, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.85 })
    },
    desert: {
      body: new THREE.MeshStandardMaterial({ color: 0xc29b68, roughness: 0.5, metalness: 0.3, flatShading: true }),
      accent: new THREE.MeshStandardMaterial({ color: 0x6e4e2a, roughness: 0.5, metalness: 0.4 }),
      canopy: new THREE.MeshPhysicalMaterial({ color: 0xffaa00, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.85 })
    }
  };

  // Aircraft Specs Data Matrix
  const aircraftDatabase = {
    f22a: {
      name: "F-22A Raptor",
      role: "5th-Gen Stealth Air Dominance",
      speed: "Mach 2.50",
      rcs: "0.0001 m² (VLO)",
      twr: "1.28 : 1",
      hardpoints: "6 Internal + 4 Wing Pylons"
    },
    su57: {
      name: "Su-57 Felon",
      role: "5th-Gen 3D Thrust-Vectoring Flanker",
      speed: "Mach 2.45",
      rcs: "0.05 m² (Reduced)",
      twr: "1.32 : 1",
      hardpoints: "4 Internal + 6 Wing Pylons"
    },
    fa36: {
      name: "FA-36 Sovereign",
      role: "6th-Gen Autonomous Apex Superplane",
      speed: "Mach 3.20 (Scramjet)",
      rcs: "0.00001 m² (Optical Cloaking)",
      twr: "1.55 : 1",
      hardpoints: "8 Internal + Heavy Ventral Spinal Rail"
    },
    x02s: {
      name: "X-02S Strike Wyvern",
      role: "Variable-Geometry Forward-Swept Superplane",
      speed: "Mach 2.60",
      rcs: "0.01 m² (Variable Geometry)",
      twr: "1.36 : 1",
      hardpoints: "Centerline EML + 6 Multi-Hardpoints"
    },
    adf11f: {
      name: "ADF-11F Raven",
      role: "Belkan AI Drone Flagship",
      speed: "Mach 2.85",
      rcs: "0.005 m² (Internal Drone Bay)",
      twr: "1.48 : 1",
      hardpoints: "Dorsal TLS + 2 Escort Mini-UAVs"
    }
  };

  // Build Procedural Aircraft Meshes
  function buildAircraft(type, liveryKey) {
    const group = new THREE.Group();
    const mat = liveryMaterials[liveryKey];

    // Fuselage
    let fuseGeo;
    if (type === 'fa36') {
      fuseGeo = new THREE.ConeGeometry(2.6, 24, 7);
    } else if (type === 'adf11f') {
      fuseGeo = new THREE.ConeGeometry(1.8, 26, 6);
    } else {
      fuseGeo = new THREE.ConeGeometry(2.4, 21, 6);
    }

    const fuselage = new THREE.Mesh(fuseGeo, mat.body);
    fuselage.rotation.x = Math.PI / 2;
    fuselage.castShadow = true;
    fuselage.receiveShadow = true;
    group.add(fuselage);

    // Cockpit Canopy
    const canopyGeo = new THREE.SphereGeometry(1.2, 16, 16);
    canopyGeo.scale(0.9, 1.15, 3.8);
    const canopy = new THREE.Mesh(canopyGeo, mat.canopy);
    canopy.position.set(0, 1.3, 2.2);
    group.add(canopy);

    // Wings
    const wingShape = new THREE.Shape();
    if (type === 'x02s') {
      // Forward-swept wings
      wingShape.moveTo(0, 4);
      wingShape.lineTo(13, 2);
      wingShape.lineTo(14, -2);
      wingShape.lineTo(2, -7);
      wingShape.lineTo(0, -6);
      wingShape.lineTo(-2, -7);
      wingShape.lineTo(-14, -2);
      wingShape.lineTo(-13, 2);
    } else if (type === 'fa36') {
      // 6th-gen cranked kite
      wingShape.moveTo(0, 6);
      wingShape.lineTo(14, -4);
      wingShape.lineTo(12, -9);
      wingShape.lineTo(2, -8);
      wingShape.lineTo(0, -7);
      wingShape.lineTo(-2, -8);
      wingShape.lineTo(-12, -9);
      wingShape.lineTo(-14, -4);
    } else {
      // Diamond delta (F-22 style)
      wingShape.moveTo(0, 3);
      wingShape.lineTo(13, -4);
      wingShape.lineTo(11, -9);
      wingShape.lineTo(2, -8);
      wingShape.lineTo(0, -7);
      wingShape.lineTo(-2, -8);
      wingShape.lineTo(-11, -9);
      wingShape.lineTo(-13, -4);
    }
    wingShape.closePath();

    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.4, bevelEnabled: true, bevelSize: 0.25, bevelThickness: 0.25 });
    const wings = new THREE.Mesh(wingGeo, mat.body);
    wings.rotation.x = Math.PI / 2;
    wings.position.set(0, 0, -1);
    wings.castShadow = true;
    wings.receiveShadow = true;
    group.add(wings);

    // Wing accent panels
    const accentGeo = new THREE.BoxGeometry(4, 0.2, 5);
    const leftAccent = new THREE.Mesh(accentGeo, mat.accent);
    leftAccent.position.set(5.5, 0.3, -4);
    group.add(leftAccent);

    const rightAccent = new THREE.Mesh(accentGeo, mat.accent);
    rightAccent.position.set(-5.5, 0.3, -4);
    group.add(rightAccent);

    // Twin Canted Vertical Stabilizers
    if (type !== 'fa36') {
      const finShape = new THREE.Shape();
      finShape.moveTo(0, 0);
      finShape.lineTo(1.8, 5);
      finShape.lineTo(0.5, 5);
      finShape.lineTo(-1.5, 0);
      finShape.closePath();

      const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.25, bevelEnabled: false });
      
      const leftFin = new THREE.Mesh(finGeo, mat.accent);
      leftFin.position.set(2.4, 0.5, -7);
      leftFin.rotation.z = -0.32;
      leftFin.castShadow = true;
      group.add(leftFin);

      const rightFin = new THREE.Mesh(finGeo, mat.accent);
      rightFin.position.set(-2.4, 0.5, -7);
      rightFin.rotation.z = 0.32;
      rightFin.castShadow = true;
      group.add(rightFin);
    }

    // Afterburner Engine Nozzles
    const nozzleGeo = new THREE.CylinderGeometry(1.1, 1.3, 3, 12);
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.2 });

    const leftNozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    leftNozzle.rotation.x = Math.PI / 2;
    leftNozzle.position.set(1.3, 0, -10.5);
    group.add(leftNozzle);

    const rightNozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    rightNozzle.rotation.x = Math.PI / 2;
    rightNozzle.position.set(-1.3, 0, -10.5);
    group.add(rightNozzle);

    // Engine Core Glow
    const glowGeo = new THREE.CircleGeometry(0.85, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide });
    const leftGlow = new THREE.Mesh(glowGeo, glowMat);
    leftGlow.position.set(1.3, 0, -12);
    group.add(leftGlow);

    const rightGlow = new THREE.Mesh(glowGeo, glowMat);
    rightGlow.position.set(-1.3, 0, -12);
    group.add(rightGlow);

    // Mount Special Weapons (SPW) Hardpoints
    const spwGroup = new THREE.Group();
    spwGroup.name = "spwMounts";

    if (currentSPW === 'qaam') {
      const missileGeo = new THREE.CylinderGeometry(0.2, 0.2, 4, 8);
      const mslMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.8 });
      [-5.5, -3.5, 3.5, 5.5].forEach(pos => {
        const msl = new THREE.Mesh(missileGeo, mslMat);
        msl.rotation.x = Math.PI / 2;
        msl.position.set(pos, -0.6, -2);
        spwGroup.add(msl);
      });
    } else if (currentSPW === 'eml') {
      // Railgun Centerline Pod
      const emlGeo = new THREE.BoxGeometry(1.2, 0.8, 14);
      const emlMat = new THREE.MeshStandardMaterial({ color: 0x152233, metalness: 0.95 });
      const eml = new THREE.Mesh(emlGeo, emlMat);
      eml.position.set(0, -1.2, -1);
      
      const beamGuide = new THREE.BoxGeometry(0.4, 0.2, 14.2);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
      const guide = new THREE.Mesh(beamGuide, beamMat);
      guide.position.set(0, -1.2, -1);
      spwGroup.add(eml);
      spwGroup.add(guide);
    } else if (currentSPW === 'plsl' || currentSPW === 'tls') {
      // Laser Pods
      const laserGeo = new THREE.CylinderGeometry(0.4, 0.4, 6, 8);
      const laserMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9 });
      [-3.2, 3.2].forEach(pos => {
        const pod = new THREE.Mesh(laserGeo, laserMat);
        pod.rotation.x = Math.PI / 2;
        pod.position.set(pos, -0.8, -1.5);
        spwGroup.add(pod);
      });
    }

    group.add(spwGroup);
    return group;
  }

  function loadActiveAircraft() {
    if (currentJetGroup) {
      scene.remove(currentJetGroup);
    }
    currentJetGroup = buildAircraft(currentPlaneType, currentLivery);
    currentJetGroup.position.set(0, 0, 0);
    scene.add(currentJetGroup);

    // Update Telemetry UI
    const data = aircraftDatabase[currentPlaneType];
    if (data) {
      document.getElementById('hangarPlaneName').textContent = data.name;
      document.getElementById('hangarRole').textContent = data.role;
      document.getElementById('specSpeed').textContent = data.speed;
      document.getElementById('specRCS').textContent = data.rcs;
      document.getElementById('specTWR').textContent = data.twr;
      document.getElementById('specHardpoints').textContent = data.hardpoints;
    }
  }

  loadActiveAircraft();

  // Orbit Controls Physics (Mouse & Touch Drag)
  let isDragging = false;
  let prevMouseX = 0;
  let prevMouseY = 0;
  let targetRotY = 0.5;
  let targetRotX = 0.25;
  let currentRotY = 0.5;
  let currentRotX = 0.25;
  let cameraDistance = 35;
  let targetDistance = 35;

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevMouseX;
    const dy = e.clientY - prevMouseY;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;

    targetRotY += dx * 0.008;
    targetRotX = Math.max(-0.2, Math.min(Math.PI / 3, targetRotX + dy * 0.008));
  });

  window.addEventListener('mouseup', () => { isDragging = false; });

  // Mouse Wheel Zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    targetDistance = Math.max(18, Math.min(55, targetDistance + e.deltaY * 0.03));
  }, { passive: false });

  // Touch Orbit
  let touchStartX = 0, touchStartY = 0;
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;

    targetRotY += dx * 0.01;
    targetRotX = Math.max(-0.2, Math.min(Math.PI / 3, targetRotX + dy * 0.01));
  }, { passive: false });

  canvas.addEventListener('touchend', () => { isDragging = false; });

  // Render Loop
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // Smooth Orbit Damping
    if (!isDragging) {
      targetRotY += 0.003; // Gentle auto-turntable rotation
    }

    currentRotY = THREE.MathUtils.lerp(currentRotY, targetRotY, 0.1);
    currentRotX = THREE.MathUtils.lerp(currentRotX, targetRotX, 0.1);
    cameraDistance = THREE.MathUtils.lerp(cameraDistance, targetDistance, 0.1);

    camera.position.x = Math.sin(currentRotY) * Math.cos(currentRotX) * cameraDistance;
    camera.position.y = Math.sin(currentRotX) * cameraDistance + 4;
    camera.position.z = Math.cos(currentRotY) * Math.cos(currentRotX) * cameraDistance;
    camera.lookAt(0, 0, 0);

    // Subtle Jet Hover Breathing
    if (currentJetGroup) {
      currentJetGroup.position.y = Math.sin(clock.getElapsedTime() * 1.5) * 0.15;
    }

    renderer.render(scene, camera);
  }

  animate();

  // Resize Handler
  window.addEventListener('resize', () => {
    width = container.clientWidth || window.innerWidth;
    height = container.clientHeight || 600;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });

  // Global Switch Functions for UI
  window.switchPlane = function(type, btn) {
    btn.parentElement.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPlaneType = type;
    loadActiveAircraft();
  };

  window.switchLivery = function(livery, btn) {
    btn.parentElement.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentLivery = livery;
    loadActiveAircraft();
  };

  window.switchSPW = function(spw, btn) {
    btn.parentElement.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSPW = spw;
    loadActiveAircraft();
  };

})();
