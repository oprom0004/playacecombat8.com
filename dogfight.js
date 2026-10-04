/**
 * ACE COMBAT 8: WINGS OF THEVE - Enhanced WebGL 3D Tactical Dogfight Engine
 * Built with Three.js WebGL Renderer & Web Audio API
 */

(function() {
  const container = document.getElementById('gameWrapper') || document.querySelector('.dogfight-game-wrapper');
  const canvas = document.getElementById('dogfightCanvas');
  if (!canvas || !container) return;

  // Make sure Three.js is available
  if (typeof THREE === 'undefined') {
    console.warn("Three.js not loaded, loading dynamically...");
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
    script.onload = () => initEngine();
    document.head.appendChild(script);
  } else {
    initEngine();
  }

  function initEngine() {
    // Audio Engine
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;
    let engineSoundNode = null;
    let engineGain = null;

    function initAudio() {
      if (!audioCtx) {
        audioCtx = new AudioCtx();
        startEngineHum();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    function startEngineHum() {
      if (!audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        engineGain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(65, audioCtx.currentTime);
        engineGain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        
        // Lowpass filter for deep jet rumble
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, audioCtx.currentTime);

        osc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(audioCtx.destination);
        osc.start();
        engineSoundNode = osc;
      } catch (e) {}
    }

    function playGunSound() {
      if (!audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160 + Math.random() * 40, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
      } catch (e) {}
    }

    function playMissileSound() {
      if (!audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(70, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (e) {}
    }

    function playExplosionSound() {
      if (!audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(110, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.7);
        gain.gain.setValueAtTime(0.6, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.7);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.7);
      } catch (e) {}
    }

    // Three.js Scene Setup
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || 580;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x061124);
    scene.fog = new THREE.FogExp2(0x091b36, 0.0004);

    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 15000);
    camera.position.set(0, 15, 45);

    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x7aa6d6, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sunLight.position.set(1000, 2000, 800);
    scene.add(sunLight);

    // Ocean & Sky Grid Terrain
    const terrainGeo = new THREE.PlaneGeometry(16000, 16000, 64, 64);
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const dist = Math.sqrt(vx * vx + vy * vy);
      let z = Math.sin(vx * 0.002) * Math.cos(vy * 0.002) * 120;
      if (dist > 3000) {
        z += (Math.sin(vx * 0.0008) + Math.cos(vy * 0.0008)) * 350;
      }
      pos.setZ(i, z);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshLambertMaterial({
      color: 0x0a2244,
      wireframe: false,
      flatShading: true
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.y = -600;
    scene.add(terrain);

    // Grid wireframe over ocean
    const gridHelper = new THREE.GridHelper(16000, 80, 0x00f2fe, 0x0b3260);
    gridHelper.position.y = -590;
    scene.add(gridHelper);

    // Clouds
    const cloudGeo = new THREE.DodecahedronGeometry(120, 1);
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0x41658a,
      transparent: true,
      opacity: 0.45,
      flatShading: true
    });
    const cloudGroup = new THREE.Group();
    for (let i = 0; i < 40; i++) {
      const cloud = new THREE.Mesh(cloudGeo, cloudMat);
      cloud.position.set(
        (Math.random() - 0.5) * 10000,
        Math.random() * 800 - 200,
        (Math.random() - 0.5) * 10000
      );
      const scale = 1 + Math.random() * 2.5;
      cloud.scale.set(scale * 2.2, scale * 0.7, scale * 1.5);
      cloudGroup.add(cloud);
    }
    scene.add(cloudGroup);

    // Build Detailed Fighter Jet 3D Mesh (F-22A Style)
    function createFighterJet(colorHex, isPlayer = false) {
      const jet = new THREE.Group();

      // Fuselage Material
      const bodyMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        metalness: 0.7,
        roughness: 0.35,
        flatShading: true
      });

      const cockpitMat = new THREE.MeshStandardMaterial({
        color: isPlayer ? 0x00f2fe : 0xff3366,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true,
        opacity: 0.85
      });

      // Main Fuselage
      const fuselageGeo = new THREE.ConeGeometry(2.4, 20, 6);
      const fuselage = new THREE.Mesh(fuselageGeo, bodyMat);
      fuselage.rotation.x = Math.PI / 2;
      jet.add(fuselage);

      // Cockpit Canopy
      const canopyGeo = new THREE.SphereGeometry(1.2, 8, 8);
      canopyGeo.scale(0.9, 1.1, 3.5);
      const canopy = new THREE.Mesh(canopyGeo, cockpitMat);
      canopy.position.set(0, 1.2, 1.5);
      jet.add(canopy);

      // Delta Wings
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 3);
      wingShape.lineTo(12, -4);
      wingShape.lineTo(11, -8);
      wingShape.lineTo(2, -7);
      wingShape.lineTo(0, -6);
      wingShape.lineTo(-2, -7);
      wingShape.lineTo(-11, -8);
      wingShape.lineTo(-12, -4);
      wingShape.closePath();

      const extrudeSettings = { depth: 0.35, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.2, bevelThickness: 0.2 };
      const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
      const wings = new THREE.Mesh(wingGeo, bodyMat);
      wings.rotation.x = Math.PI / 2;
      wings.position.set(0, 0, -1);
      jet.add(wings);

      // Twin Canted Vertical Stabilizers (Tail Fins)
      const finShape = new THREE.Shape();
      finShape.moveTo(0, 0);
      finShape.lineTo(1.8, 4.5);
      finShape.lineTo(0.6, 4.5);
      finShape.lineTo(-1.2, 0);
      finShape.closePath();

      const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.2, bevelEnabled: false });
      
      const leftFin = new THREE.Mesh(finGeo, bodyMat);
      leftFin.position.set(2.2, 0.4, -6.5);
      leftFin.rotation.z = -0.3;
      leftFin.rotation.y = -0.05;
      jet.add(leftFin);

      const rightFin = new THREE.Mesh(finGeo, bodyMat);
      rightFin.position.set(-2.2, 0.4, -6.5);
      rightFin.rotation.z = 0.3;
      rightFin.rotation.y = 0.05;
      jet.add(rightFin);

      // Twin Engine Exhaust Plumes (Afterburners)
      const flameGeo = new THREE.ConeGeometry(0.8, 6, 8);
      const flameMat = new THREE.MeshBasicMaterial({
        color: isPlayer ? 0x00f2fe : 0xffaa00,
        transparent: true,
        opacity: 0.9
      });

      const leftFlame = new THREE.Mesh(flameGeo, flameMat);
      leftFlame.position.set(1.1, 0, -10.5);
      leftFlame.rotation.x = -Math.PI / 2;
      jet.add(leftFlame);
      jet.leftFlame = leftFlame;

      const rightFlame = new THREE.Mesh(flameGeo, flameMat);
      rightFlame.position.set(-1.1, 0, -10.5);
      rightFlame.rotation.x = -Math.PI / 2;
      jet.add(rightFlame);
      jet.rightFlame = rightFlame;

      return jet;
    }

    // Player Jet
    const playerJet = createFighterJet(0x2a3d54, true);
    scene.add(playerJet);

    const player = {
      pos: new THREE.Vector3(0, 300, 0),
      rot: new THREE.Euler(0, 0, 0, 'YXZ'),
      speed: 680,
      baseSpeed: 680,
      maxSpeed: 1400,
      minSpeed: 380,
      pitchRate: 0,
      rollRate: 0,
      yawRate: 0,
      score: 0,
      kills: 0,
      missiles: 48,
      lockedEnemy: null
    };

    // Bullets, Missiles, Enemies, Explosions
    const bullets = [];
    const missiles = [];
    const enemies = [];
    const particles = [];

    // Enemy Spawner
    function spawnEnemy() {
      const enemyMesh = createFighterJet(0x4a1824, false);
      const angle = Math.random() * Math.PI * 2;
      const distance = 1800 + Math.random() * 1200;
      
      const enemy = {
        mesh: enemyMesh,
        pos: new THREE.Vector3(
          player.pos.x + Math.sin(angle) * distance,
          player.pos.y + (Math.random() - 0.5) * 400,
          player.pos.z + Math.cos(angle) * distance
        ),
        rot: new THREE.Euler(0, Math.random() * Math.PI * 2, 0, 'YXZ'),
        speed: 550 + Math.random() * 200,
        health: 100,
        evadeTimer: Math.random() * 60,
        turnDir: (Math.random() - 0.5) * 0.03
      };

      enemyMesh.position.copy(enemy.pos);
      scene.add(enemyMesh);
      enemies.push(enemy);
    }

    // Initial enemy squadron
    for (let i = 0; i < 6; i++) {
      spawnEnemy();
    }

    // Input Handlers
    const keys = {};
    window.addEventListener('keydown', (e) => {
      initAudio();
      keys[e.key.toLowerCase()] = true;
      keys[e.code] = true;
      if (e.key === ' ' || e.key === 'Enter') e.preventDefault();
    });

    window.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
      keys[e.code] = false;
    });

    // Mobile Virtual Joystick & Touch
    const virtualStick = { x: 0, y: 0, active: false };
    const leftZone = document.getElementById('touchLeftZone');
    const stickNub = document.getElementById('stickNub');

    if (leftZone && stickNub) {
      let touchId = null;
      let startX = 0, startY = 0;

      leftZone.addEventListener('touchstart', (e) => {
        initAudio();
        const t = e.changedTouches[0];
        touchId = t.identifier;
        startX = t.clientX;
        startY = t.clientY;
        virtualStick.active = true;
      }, { passive: false });

      leftZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          if (t.identifier === touchId) {
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;
            const dist = Math.min(Math.hypot(dx, dy), 50);
            const angle = Math.atan2(dy, dx);
            const nx = Math.cos(angle) * dist;
            const ny = Math.sin(angle) * dist;

            stickNub.style.transform = `translate(${nx}px, ${ny}px)`;
            virtualStick.x = nx / 50;
            virtualStick.y = ny / 50;
          }
        }
      }, { passive: false });

      const resetStick = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === touchId) {
            touchId = null;
            virtualStick.active = false;
            virtualStick.x = 0;
            virtualStick.y = 0;
            stickNub.style.transform = `translate(0px, 0px)`;
          }
        }
      };
      leftZone.addEventListener('touchend', resetStick);
      leftZone.addEventListener('touchcancel', resetStick);
    }

    // Action Buttons
    let gunFiring = false;
    const btnGun = document.getElementById('btnGun');
    const btnMissile = document.getElementById('btnMissile');
    const btnBoost = document.getElementById('btnBoost');

    if (btnGun) {
      btnGun.addEventListener('touchstart', (e) => { e.preventDefault(); initAudio(); gunFiring = true; });
      btnGun.addEventListener('touchend', () => { gunFiring = false; });
      btnGun.addEventListener('mousedown', () => { initAudio(); gunFiring = true; });
      btnGun.addEventListener('mouseup', () => { gunFiring = false; });
    }

    if (btnMissile) {
      btnMissile.addEventListener('click', (e) => { e.preventDefault(); initAudio(); fireMissile(); });
    }

    let isBoosting = false;
    if (btnBoost) {
      btnBoost.addEventListener('touchstart', (e) => { e.preventDefault(); isBoosting = true; });
      btnBoost.addEventListener('touchend', () => { isBoosting = false; });
      btnBoost.addEventListener('mousedown', () => { isBoosting = true; });
      btnBoost.addEventListener('mouseup', () => { isBoosting = false; });
    }

    // Weapons
    function fireBullet() {
      playGunSound();
      const forward = new THREE.Vector3(0, 0, -1).applyEuler(player.rot);
      const right = new THREE.Vector3(1, 0, 0).applyEuler(player.rot);

      const bulletGeo = new THREE.BoxGeometry(0.3, 0.3, 8);
      const bulletMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });

      [-1.5, 1.5].forEach(offset => {
        const mesh = new THREE.Mesh(bulletGeo, bulletMat);
        mesh.position.copy(player.pos).addScaledVector(right, offset).addScaledVector(forward, 6);
        mesh.rotation.copy(player.rot);
        scene.add(mesh);

        bullets.push({
          mesh: mesh,
          pos: mesh.position,
          vel: forward.clone().multiplyScalar(player.speed * 0.08 + 25),
          life: 70
        });
      });
    }

    function fireMissile() {
      if (player.missiles <= 0) return;
      player.missiles--;
      playMissileSound();

      const forward = new THREE.Vector3(0, 0, -1).applyEuler(player.rot);
      const right = new THREE.Vector3(1, 0, 0).applyEuler(player.rot);

      const missileGeo = new THREE.ConeGeometry(0.5, 5, 6);
      const missileMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 });
      const mesh = new THREE.Mesh(missileGeo, missileMat);
      mesh.rotation.x = Math.PI / 2;

      const group = new THREE.Group();
      group.add(mesh);

      const offset = (player.missiles % 2 === 0 ? 3.5 : -3.5);
      group.position.copy(player.pos).addScaledVector(right, offset);
      group.rotation.copy(player.rot);
      scene.add(group);

      missiles.push({
        group: group,
        pos: group.position,
        vel: forward.clone().multiplyScalar(player.speed * 0.05 + 12),
        target: player.lockedEnemy,
        life: 180
      });

      const mslElem = document.getElementById('hudMissiles');
      if (mslElem) mslElem.textContent = player.missiles;
    }

    function createExplosion(pos) {
      playExplosionSound();
      const pGeo = new THREE.SphereGeometry(2, 6, 6);
      const pMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.9 });

      for (let i = 0; i < 20; i++) {
        const mesh = new THREE.Mesh(pGeo, pMat.clone());
        mesh.position.copy(pos);
        scene.add(mesh);

        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        );

        particles.push({
          mesh: mesh,
          vel: vel,
          life: 40 + Math.random() * 20
        });
      }
    }

    // Main Game Loop
    let lastGunTime = 0;
    let clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Controls Processing
      let targetPitch = 0;
      let targetRoll = 0;
      let targetYaw = 0;

      // Keyboard
      if (keys['w'] || keys['ArrowUp']) targetPitch = -0.04;
      if (keys['s'] || keys['ArrowDown']) targetPitch = 0.04;
      if (keys['a'] || keys['ArrowLeft']) { targetRoll = -0.06; targetYaw = 0.02; }
      if (keys['d'] || keys['ArrowRight']) { targetRoll = 0.06; targetYaw = -0.02; }
      if (keys['q']) targetYaw = 0.03;
      if (keys['e']) targetYaw = -0.03;

      // Virtual Stick Override
      if (virtualStick.active) {
        targetPitch = virtualStick.y * 0.05;
        targetRoll = virtualStick.x * 0.07;
        targetYaw = -virtualStick.x * 0.025;
      }

      // Smooth flight dynamics
      player.pitchRate = THREE.MathUtils.lerp(player.pitchRate, targetPitch, 0.12);
      player.rollRate = THREE.MathUtils.lerp(player.rollRate, targetRoll, 0.12);
      player.yawRate = THREE.MathUtils.lerp(player.yawRate, targetYaw, 0.12);

      player.rot.x += player.pitchRate;
      player.rot.y += player.yawRate;
      player.rot.z = THREE.MathUtils.lerp(player.rot.z, -player.rollRate * 12, 0.08);

      // Pitch clamping
      player.rot.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, player.rot.x));

      // Speed & Afterburner
      const boostActive = keys['shift'] || isBoosting;
      if (boostActive) {
        player.speed = THREE.MathUtils.lerp(player.speed, player.maxSpeed, 0.06);
      } else {
        player.speed = THREE.MathUtils.lerp(player.speed, player.baseSpeed, 0.04);
      }

      // Update Afterburner flames
      const flameScale = boostActive ? 2.2 : 1.0;
      playerJet.leftFlame.scale.set(1, flameScale, 1);
      playerJet.rightFlame.scale.set(1, flameScale, 1);

      // Move Player
      const forward = new THREE.Vector3(0, 0, -1).applyEuler(player.rot);
      player.pos.addScaledVector(forward, player.speed * 0.035);
      
      // Keep within tactical flight envelope
      player.pos.y = Math.max(-400, Math.min(1800, player.pos.y));
      playerJet.position.copy(player.pos);
      playerJet.rotation.copy(player.rot);

      // Camera Follows with smooth spring
      const camOffset = new THREE.Vector3(0, 7, 32).applyEuler(player.rot);
      camera.position.lerp(player.pos.clone().add(camOffset), 0.18);
      camera.lookAt(player.pos.clone().add(forward.clone().multiplyScalar(80)));

      // Firing Gun
      const now = performance.now();
      if ((keys[' '] || keys['enter'] || gunFiring) && now - lastGunTime > 90) {
        fireBullet();
        lastGunTime = now;
      }

      // Update Bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.pos.add(b.vel);
        b.life--;

        // Collision Check with Enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if (b.pos.distanceTo(e.pos) < 35) {
            e.health -= 35;
            b.life = 0;
            if (e.health <= 0) {
              createExplosion(e.pos);
              scene.remove(e.mesh);
              enemies.splice(j, 1);
              player.kills++;
              player.score += 1200;
              spawnEnemy();
              break;
            }
          }
        }

        if (b.life <= 0) {
          scene.remove(b.mesh);
          bullets.splice(i, 1);
        }
      }

      // Find Closest Enemy for Missile Lock
      let closestDist = 2800;
      let targetLocked = null;
      enemies.forEach(e => {
        const toEnemy = e.pos.clone().sub(player.pos);
        const angle = forward.angleTo(toEnemy);
        const dist = toEnemy.length();
        if (angle < 0.45 && dist < closestDist) {
          closestDist = dist;
          targetLocked = e;
        }
      });
      player.lockedEnemy = targetLocked;

      const lockWarning = document.getElementById('lockWarning');
      if (lockWarning) {
        lockWarning.style.display = targetLocked ? 'block' : 'none';
      }

      // Update Missiles
      for (let i = missiles.length - 1; i >= 0; i--) {
        const m = missiles[i];
        if (m.target && enemies.includes(m.target)) {
          const toTarget = m.target.pos.clone().sub(m.pos).normalize();
          m.vel.lerp(toTarget.multiplyScalar(player.speed * 0.06 + 28), 0.08);
          m.group.lookAt(m.pos.clone().add(m.vel));
        }
        m.pos.add(m.vel);
        m.life--;

        // Hit Detection
        if (m.target && m.pos.distanceTo(m.target.pos) < 45) {
          createExplosion(m.target.pos);
          scene.remove(m.target.mesh);
          enemies.splice(enemies.indexOf(m.target), 1);
          player.kills++;
          player.score += 2500;
          spawnEnemy();
          m.life = 0;
        }

        if (m.life <= 0) {
          scene.remove(m.group);
          missiles.splice(i, 1);
        }
      }

      // Update Enemies AI
      enemies.forEach(e => {
        e.evadeTimer--;
        if (e.evadeTimer <= 0) {
          e.evadeTimer = 40 + Math.random() * 60;
          e.turnDir = (Math.random() - 0.5) * 0.04;
        }
        e.rot.y += e.turnDir;
        const eForward = new THREE.Vector3(0, 0, -1).applyEuler(e.rot);
        e.pos.addScaledVector(eForward, e.speed * 0.03);
        e.mesh.position.copy(e.pos);
        e.mesh.rotation.copy(e.rot);
        e.mesh.rotation.z = -e.turnDir * 25; // Bank into turn
      });

      // Update Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.mesh.position.add(p.vel);
        p.life--;
        p.mesh.scale.multiplyScalar(0.95);
        p.mesh.material.opacity = p.life / 50;
        if (p.life <= 0) {
          scene.remove(p.mesh);
          particles.splice(i, 1);
        }
      }

      // Update HUD
      const speedElem = document.getElementById('hudSpeed');
      const scoreElem = document.getElementById('hudScore');
      const killsElem = document.getElementById('hudKills');
      if (speedElem) speedElem.textContent = Math.round(player.speed);
      if (scoreElem) scoreElem.textContent = player.score;
      if (killsElem) killsElem.textContent = player.kills;

      renderer.render(scene, camera);
    }

    // Handle Resize
    window.addEventListener('resize', () => {
      const nw = container.clientWidth || window.innerWidth;
      const nh = container.clientHeight || 580;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });

    animate();
  }
})();
