/**
 * ACE COMBAT 8 - 3D Tactical Jet Dogfight Arcade Engine
 * Pure Vanilla JavaScript & Web Audio API (Zero External Dependencies)
 */

(function() {
  const canvas = document.getElementById('dogfightCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Audio Synth Engine for Jet Engine, Gunfire, Missiles & Explosions
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playGunSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.06);
  }

  function playMissileSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  }

  function playExplosionSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(90, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(15, audioCtx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.7, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  }

  // Simulation State
  let width = canvas.width = canvas.parentElement.clientWidth;
  let height = canvas.height = canvas.parentElement.clientHeight;

  window.addEventListener('resize', () => {
    width = canvas.width = canvas.parentElement.clientWidth;
    height = canvas.height = canvas.parentElement.clientHeight;
  });

  const player = {
    x: 0,
    y: 0,
    z: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
    speed: 680,
    maxSpeed: 1450,
    boost: false,
    score: 0,
    kills: 0,
    missiles: 48,
    health: 100
  };

  const keys = {};
  const bullets = [];
  const missiles = [];
  const enemies = [];
  const particles = [];
  const clouds = [];

  // Generate 3D Cloud Volume
  for (let i = 0; i < 75; i++) {
    clouds.push({
      x: (Math.random() - 0.5) * 6000,
      y: (Math.random() - 0.5) * 3000 + 400,
      z: Math.random() * 4000 + 300,
      radius: Math.random() * 220 + 120,
      opacity: Math.random() * 0.25 + 0.1
    });
  }

  // Spawn Initial Enemies
  function spawnEnemy() {
    enemies.push({
      x: (Math.random() - 0.5) * 3500,
      y: (Math.random() - 0.5) * 1500,
      z: Math.random() * 2000 + 2500,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 6,
      vz: -Math.random() * 8 - 14,
      health: 2,
      type: Math.random() > 0.4 ? 'Su-57 Felon' : 'ADF-11 Raven',
      locked: false
    });
  }

  for (let i = 0; i < 6; i++) {
    spawnEnemy();
  }

  // Input Listeners
  window.addEventListener('keydown', e => {
    initAudio();
    keys[e.code] = true;
    if (e.code === 'Space') fireBullet();
    if (e.code === 'KeyF' || e.code === 'KeyE') fireMissile();
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') player.boost = true;
  });

  window.addEventListener('keyup', e => {
    keys[e.code] = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') player.boost = false;
  });

  // Mouse Aiming
  let mouseX = width / 2;
  let mouseY = height / 2;
  let isMouseDown = false;

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });

  canvas.addEventListener('mousedown', e => {
    initAudio();
    isMouseDown = true;
    if (e.button === 2) {
      e.preventDefault();
      fireMissile();
    } else {
      fireBullet();
    }
  });

  canvas.addEventListener('mouseup', () => { isMouseDown = false; });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // Mobile Virtual Controls Binding
  const stickArea = document.getElementById('touchStick');
  const stickThumb = document.getElementById('stickThumb');
  const btnFireGun = document.getElementById('btnFireGun');
  const btnFireMissile = document.getElementById('btnFireMissile');
  const btnBoost = document.getElementById('btnBoost');

  if (stickArea && stickThumb) {
    let stickActive = false;
    let startX = 0, startY = 0;

    stickArea.addEventListener('touchstart', e => {
      initAudio();
      stickActive = true;
      const t = e.touches[0];
      const r = stickArea.getBoundingClientRect();
      startX = r.left + r.width / 2;
      startY = r.top + r.height / 2;
    }, { passive: false });

    stickArea.addEventListener('touchmove', e => {
      if (!stickActive) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      const dist = Math.min(45, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      stickThumb.style.transform = `translate(${Math.cos(angle) * dist - 22}px, ${Math.sin(angle) * dist - 22}px)`;

      player.yaw += (dx / 45) * 0.04;
      player.pitch -= (dy / 45) * 0.04;
      player.roll = (dx / 45) * 0.45;
    }, { passive: false });

    stickArea.addEventListener('touchend', () => {
      stickActive = false;
      stickThumb.style.transform = `translate(-50%, -50%)`;
      player.roll = 0;
    });
  }

  if (btnFireGun) {
    btnFireGun.addEventListener('touchstart', e => {
      e.preventDefault();
      initAudio();
      fireBullet();
    }, { passive: false });
  }

  if (btnFireMissile) {
    btnFireMissile.addEventListener('touchstart', e => {
      e.preventDefault();
      initAudio();
      fireMissile();
    }, { passive: false });
  }

  if (btnBoost) {
    btnBoost.addEventListener('touchstart', e => {
      e.preventDefault();
      initAudio();
      player.boost = true;
    }, { passive: false });
    btnBoost.addEventListener('touchend', () => { player.boost = false; });
  }

  function fireBullet() {
    playGunSound();
    bullets.push({
      x: 0,
      y: 0,
      z: 50,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      vz: 75,
      life: 60
    });
  }

  function fireMissile() {
    if (player.missiles <= 0) return;
    player.missiles--;
    playMissileSound();

    let target = null;
    let minDist = Infinity;

    for (let enemy of enemies) {
      const dist = Math.hypot(enemy.x, enemy.y, enemy.z);
      if (dist < minDist && enemy.z > 200) {
        minDist = dist;
        target = enemy;
      }
    }

    missiles.push({
      x: 0,
      y: -20,
      z: 60,
      target: target,
      speed: 45,
      life: 140
    });
  }

  // Update Loop
  function update() {
    // Keyboard controls
    if (keys['KeyW'] || keys['ArrowUp']) player.pitch -= 0.035;
    if (keys['KeyS'] || keys['ArrowDown']) player.pitch += 0.035;
    if (keys['KeyA'] || keys['ArrowLeft']) { player.yaw -= 0.035; player.roll = -0.4; }
    else if (keys['KeyD'] || keys['ArrowRight']) { player.yaw += 0.035; player.roll = 0.4; }
    else if (!stickThumb) { player.roll *= 0.88; }

    if (isMouseDown) {
      const offsetX = (mouseX - width / 2) / (width / 2);
      const offsetY = (mouseY - height / 2) / (height / 2);
      player.yaw += offsetX * 0.03;
      player.pitch += offsetY * 0.03;
      player.roll = offsetX * 0.4;
      if (Math.random() < 0.4) fireBullet();
    }

    const currentSpeed = player.boost ? player.maxSpeed : player.speed;

    // Update Clouds
    for (let c of clouds) {
      c.z -= (currentSpeed / 60);
      c.x -= player.yaw * 80;
      c.y += player.pitch * 80;
      if (c.z < 100) {
        c.z = 4000;
        c.x = (Math.random() - 0.5) * 6000;
        c.y = (Math.random() - 0.5) * 3000 + 400;
      }
    }

    // Update Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.z += b.vz;
      b.life--;

      // Check hit against enemies
      for (let enemy of enemies) {
        if (Math.hypot(b.x - enemy.x, b.y - enemy.y, b.z - enemy.z) < 130) {
          enemy.health -= 1;
          b.life = 0;
          createExplosion(b.x, b.y, b.z, 6);
          if (enemy.health <= 0) {
            destroyEnemy(enemy);
          }
          break;
        }
      }

      if (b.life <= 0) bullets.splice(i, 1);
    }

    // Update Missiles
    for (let i = missiles.length - 1; i >= 0; i--) {
      const m = missiles[i];
      m.life--;

      if (m.target && m.target.health > 0) {
        const dx = m.target.x - m.x;
        const dy = m.target.y - m.y;
        const dz = m.target.z - m.z;
        const dist = Math.hypot(dx, dy, dz);
        m.x += (dx / dist) * m.speed;
        m.y += (dy / dist) * m.speed;
        m.z += (dz / dist) * m.speed;

        if (dist < 100) {
          m.target.health = 0;
          destroyEnemy(m.target);
          m.life = 0;
        }
      } else {
        m.z += m.speed;
      }

      if (m.life <= 0) {
        createExplosion(m.x, m.y, m.z, 16);
        missiles.splice(i, 1);
      }
    }

    // Update Enemies
    let targetLocked = false;
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      e.x += e.vx - player.yaw * 60;
      e.y += e.vy + player.pitch * 60;
      e.z += e.vz - (currentSpeed / 60);

      // Lock-on check
      const screenX = (e.x / e.z) * (width / 1.5) + width / 2;
      const screenY = (e.y / e.z) * (height / 1.5) + height / 2;
      const distToCenter = Math.hypot(screenX - width / 2, screenY - height / 2);

      if (distToCenter < 140 && e.z > 200 && e.z < 2800) {
        e.locked = true;
        targetLocked = true;
      } else {
        e.locked = false;
      }

      if (e.z < 100 || e.health <= 0) {
        enemies.splice(i, 1);
        spawnEnemy();
      }
    }

    const lockBanner = document.getElementById('lockWarning');
    if (lockBanner) lockBanner.style.display = targetLocked ? 'block' : 'none';

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;
      p.life -= 0.025;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // Update HUD Stats
    const scoreEl = document.getElementById('hudScore');
    const killsEl = document.getElementById('hudKills');
    const missilesEl = document.getElementById('hudMissiles');
    const speedEl = document.getElementById('hudSpeed');

    if (scoreEl) scoreEl.textContent = player.score;
    if (killsEl) killsEl.textContent = player.kills;
    if (missilesEl) missilesEl.textContent = player.missiles;
    if (speedEl) speedEl.textContent = Math.round(currentSpeed);
  }

  function destroyEnemy(enemy) {
    playExplosionSound();
    createExplosion(enemy.x, enemy.y, enemy.z, 28);
    player.kills++;
    player.score += 1500;
  }

  function createExplosion(x, y, z, count) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x,
        y: y,
        z: z,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.5) * 18,
        vz: (Math.random() - 0.5) * 18,
        color: Math.random() > 0.4 ? '#ff9e00' : '#ff2a6d',
        size: Math.random() * 8 + 4,
        life: 1.0
      });
    }
  }

  // Render Loop
  function draw() {
    ctx.clearRect(0, 0, width, height);

    // Dynamic Horizon & Sky Gradient
    const horizonY = height / 2 + player.pitch * 300;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#030712');
    skyGrad.addColorStop(0.5, '#0b1b33');
    skyGrad.addColorStop(1, '#1c3456');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Distant Sea / Terrain Horizon
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(player.roll);
    ctx.translate(-width / 2, -height / 2);

    ctx.fillStyle = '#061320';
    ctx.fillRect(-width, horizonY, width * 3, height * 2);

    // Horizon Grid Lines
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-width, horizonY);
    ctx.lineTo(width * 2, horizonY);
    ctx.stroke();

    // Draw Clouds
    for (let c of clouds) {
      if (c.z < 100) continue;
      const k = 700 / c.z;
      const sx = c.x * k + width / 2;
      const sy = c.y * k + horizonY;
      const sr = c.radius * k;

      ctx.fillStyle = `rgba(220, 240, 255, ${c.opacity * Math.min(1, c.z / 1000)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Draw Enemies (3D Jet wireframes with HUD Boxes)
    for (let e of enemies) {
      if (e.z < 100) continue;
      const k = 700 / e.z;
      const sx = e.x * k + width / 2;
      const sy = e.y * k + height / 2;
      const size = Math.max(12, 140 * k);

      // Jet Silhouette
      ctx.save();
      ctx.translate(sx, sy);

      ctx.fillStyle = '#ff2a6d';
      ctx.beginPath();
      ctx.moveTo(0, -size / 2);
      ctx.lineTo(size / 1.5, size / 2);
      ctx.lineTo(0, size / 3);
      ctx.lineTo(-size / 1.5, size / 2);
      ctx.closePath();
      ctx.fill();

      // Tactical HUD Target Box
      ctx.strokeStyle = e.locked ? '#ff2a6d' : '#00ff88';
      ctx.lineWidth = e.locked ? 2 : 1;
      const boxSize = Math.max(28, size * 1.6);
      ctx.strokeRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);

      ctx.font = '10px monospace';
      ctx.fillStyle = e.locked ? '#ff2a6d' : '#00ff88';
      ctx.fillText(`TGT: ${e.type}`, -boxSize / 2, -boxSize / 2 - 6);
      ctx.fillText(`DST: ${Math.round(e.z)}m`, -boxSize / 2, boxSize / 2 + 14);

      ctx.restore();
    }

    // Draw Bullets (Tracers)
    ctx.strokeStyle = '#00f2fe';
    ctx.lineWidth = 3;
    for (let b of bullets) {
      const k = 700 / b.z;
      const sx = b.x * k + width / 2;
      const sy = b.y * k + height / 2;
      ctx.fillStyle = '#00f2fe';
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(2, 6 * k), 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Missiles & Smoke Trails
    for (let m of missiles) {
      const k = 700 / m.z;
      const sx = m.x * k + width / 2;
      const sy = m.y * k + height / 2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(3, 8 * k), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 158, 0, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Draw Particles
    for (let p of particles) {
      const k = 700 / Math.max(50, p.z);
      const sx = p.x * k + width / 2;
      const sy = p.y * k + height / 2;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(sx, sy, p.size * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }

    // Player Jet Cockpit Nose & HUD Frame (First-Person Perspective)
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 80, 0, Math.PI * 2);
    ctx.stroke();
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();

