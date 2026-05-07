import * as THREE from "three";

const canvas = document.querySelector("#scene");

const intro = document.querySelector("#intro");
const result = document.querySelector("#result");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");

const topUI = document.querySelector("#topUI");
const moodTitle = document.querySelector("#moodTitle");
const tip = document.querySelector("#tip");
const tipText = document.querySelector("#tipText");
const progressRing = document.querySelector("#progressRing");
const progressDots = document.querySelectorAll("#progressRing span");

const infoButton = document.querySelector("#infoButton");
const infoPanel = document.querySelector("#infoPanel");
const closeInfo = document.querySelector("#closeInfo");

const resultTitle = document.querySelector("#resultTitle");
const resultText = document.querySelector("#resultText");
const finalTrust = document.querySelector("#finalTrust");
const finalMood = document.querySelector("#finalMood");

let width = window.innerWidth;
let height = window.innerHeight;

let started = false;
let finished = false;

const state = {
  trust: 0,
  fear: 0.22,
  energy: 0.45,
  bloom: 0,
  pointerX: 0,
  pointerY: 0,
  smoothX: 0,
  smoothY: 0,
  lastX: 0,
  lastY: 0,
  speed: 0,
  touching: false,
  touchStartTime: 0,
  stillness: 0,
  lastMoveTime: performance.now(),
  mood: "Sleeping"
};

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050713, 0.065);

const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
camera.position.set(0, 0.15, 6.4);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});

renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const clock = new THREE.Clock();

const world = new THREE.Group();
scene.add(world);

const acaleph = new THREE.Group();
world.add(acaleph);

const background = new THREE.Group();
scene.add(background);

const textureLoader = new THREE.TextureLoader();

const bodyMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x8ff6ff,
  roughness: 0.22,
  metalness: 0.02,
  transparent: true,
  opacity: 0.54,
  transmission: 0.25,
  thickness: 0.8,
  clearcoat: 0.65,
  clearcoatRoughness: 0.18,
  emissive: 0x173b52,
  emissiveIntensity: 0.6
});

const glowMaterial = new THREE.MeshBasicMaterial({
  color: 0x9ff8ff,
  transparent: true,
  opacity: 0.7,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const pinkGlowMaterial = new THREE.MeshBasicMaterial({
  color: 0xff9bd8,
  transparent: true,
  opacity: 0.55,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const darkMaterial = new THREE.MeshBasicMaterial({
  color: 0x101428,
  transparent: true,
  opacity: 0.92
});

const bellGeometry = new THREE.SphereGeometry(1, 64, 64);
const bell = new THREE.Mesh(bellGeometry, bodyMaterial);
bell.scale.set(1.22, 0.72, 1.22);
bell.position.y = 0.32;
acaleph.add(bell);

const coreGeometry = new THREE.SphereGeometry(0.42, 42, 42);
const core = new THREE.Mesh(coreGeometry, glowMaterial);
core.position.y = 0.22;
acaleph.add(core);

const haloGeometry = new THREE.TorusGeometry(1.08, 0.018, 12, 120);
const halo = new THREE.Mesh(haloGeometry, glowMaterial.clone());
halo.rotation.x = Math.PI / 2;
halo.position.y = 0.27;
halo.material.opacity = 0.34;
acaleph.add(halo);

const cheekGeometry = new THREE.SphereGeometry(0.115, 24, 24);

const leftCheek = new THREE.Mesh(cheekGeometry, pinkGlowMaterial.clone());
leftCheek.position.set(-0.39, 0.18, 0.85);
leftCheek.scale.set(1, 0.72, 0.35);
acaleph.add(leftCheek);

const rightCheek = new THREE.Mesh(cheekGeometry, pinkGlowMaterial.clone());
rightCheek.position.set(0.39, 0.18, 0.85);
rightCheek.scale.set(1, 0.72, 0.35);
acaleph.add(rightCheek);

const eyeGeometry = new THREE.SphereGeometry(0.07, 20, 20);

const leftEye = new THREE.Mesh(eyeGeometry, darkMaterial);
leftEye.position.set(-0.22, 0.35, 0.9);
leftEye.scale.set(1, 1.5, 0.35);
acaleph.add(leftEye);

const rightEye = new THREE.Mesh(eyeGeometry, darkMaterial);
rightEye.position.set(0.22, 0.35, 0.9);
rightEye.scale.set(1, 1.5, 0.35);
acaleph.add(rightEye);

const finGeometry = new THREE.SphereGeometry(0.26, 28, 28);

const leftFin = new THREE.Mesh(finGeometry, bodyMaterial.clone());
leftFin.position.set(-0.92, 0.18, 0.04);
leftFin.scale.set(0.35, 0.55, 0.75);
leftFin.rotation.z = 0.5;
acaleph.add(leftFin);

const rightFin = new THREE.Mesh(finGeometry, bodyMaterial.clone());
rightFin.position.set(0.92, 0.18, 0.04);
rightFin.scale.set(0.35, 0.55, 0.75);
rightFin.rotation.z = -0.5;
acaleph.add(rightFin);

const tentacles = [];
const tentacleCount = 10;
const tentacleSegments = 26;

for (let i = 0; i < tentacleCount; i++) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(tentacleSegments * 3);

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: i % 2 === 0 ? 0x92f6ff : 0xff9bd8,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending
  });

  const line = new THREE.Line(geometry, material);
  acaleph.add(line);

  tentacles.push({
    line,
    angle: (i / tentacleCount) * Math.PI * 2,
    offset: Math.random() * Math.PI * 2,
    length: 1.05 + Math.random() * 0.45
  });
}

const bloomPetals = [];
const petalGeometry = new THREE.SphereGeometry(0.33, 28, 28);

for (let i = 0; i < 8; i++) {
  const petal = new THREE.Mesh(petalGeometry, pinkGlowMaterial.clone());

  const angle = (i / 8) * Math.PI * 2;
  petal.position.set(Math.cos(angle) * 0.78, 0.15, Math.sin(angle) * 0.78);
  petal.scale.set(0.38, 0.12, 0.7);
  petal.rotation.y = -angle;
  petal.material.opacity = 0;

  acaleph.add(petal);

  bloomPetals.push({
    mesh: petal,
    angle
  });
}

const dustCount = 260;
const dustPositions = new Float32Array(dustCount * 3);
const dustSeeds = [];

for (let i = 0; i < dustCount; i++) {
  const radius = 1.2 + Math.random() * 2.7;
  const angle = Math.random() * Math.PI * 2;
  const y = -1.3 + Math.random() * 2.9;

  dustPositions[i * 3] = Math.cos(angle) * radius;
  dustPositions[i * 3 + 1] = y;
  dustPositions[i * 3 + 2] = Math.sin(angle) * radius;

  dustSeeds.push({
    radius,
    angle,
    y,
    speed: 0.14 + Math.random() * 0.42
  });
}

const dustGeometry = new THREE.BufferGeometry();
dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));

const dustMaterial = new THREE.PointsMaterial({
  color: 0xbaf8ff,
  size: 0.032,
  transparent: true,
  opacity: 0.55,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const dust = new THREE.Points(dustGeometry, dustMaterial);
acaleph.add(dust);

const starCount = 180;
const starPositions = new Float32Array(starCount * 3);

for (let i = 0; i < starCount; i++) {
  starPositions[i * 3] = (Math.random() - 0.5) * 13;
  starPositions[i * 3 + 1] = (Math.random() - 0.5) * 10;
  starPositions[i * 3 + 2] = -2 - Math.random() * 8;
}

const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));

const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.018,
  transparent: true,
  opacity: 0.36,
  blending: THREE.AdditiveBlending
});

const stars = new THREE.Points(starGeometry, starMaterial);
background.add(stars);

const ripples = [];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function toNDC(clientX, clientY) {
  return {
    x: (clientX / width) * 2 - 1,
    y: -(clientY / height) * 2 + 1
  };
}

function createRipple(x, y, color) {
  const geometry = new THREE.RingGeometry(0.08, 0.083, 64);

  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x * 2.4, y * 2.9, 1.6);

  scene.add(mesh);

  ripples.push({
    mesh,
    life: 0,
    maxLife: 0.85
  });
}

function updateMood() {
  if (!started) {
    state.mood = "Sleeping";
  } else if (state.bloom > 0.92) {
    state.mood = "Blooming";
  } else if (state.fear > 0.62) {
    state.mood = "Scared";
  } else if (state.trust > 0.68) {
    state.mood = "Trusting";
  } else if (state.trust > 0.34) {
    state.mood = "Curious";
  } else {
    state.mood = "Shy";
  }

  if (state.mood === "Scared") {
    moodTitle.textContent = "Acaleph is scared";
  } else if (state.mood === "Trusting") {
    moodTitle.textContent = "Acaleph trusts you";
  } else if (state.mood === "Curious") {
    moodTitle.textContent = "Acaleph is curious";
  } else if (state.mood === "Blooming") {
    moodTitle.textContent = "Acaleph is blooming";
  } else {
    moodTitle.textContent = "Acaleph is shy";
  }
}

function updateTip() {
  if (state.mood === "Scared") {
    tipText.textContent = "Too fast. Give it a little space.";
  } else if (state.mood === "Trusting") {
    tipText.textContent = "Hold gently. It feels safe near you.";
  } else if (state.bloom > 0.7) {
    tipText.textContent = "It is blooming. Stay close.";
  } else if (state.stillness > 2.1) {
    tipText.textContent = "It moves closer when you stop chasing it.";
  } else if (state.trust < 0.25) {
    tipText.textContent = "Tap softly. Do not rush it.";
  } else {
    tipText.textContent = "Move slowly. Let it follow your finger.";
  }
}

function updateProgressDots() {
  const activeCount = Math.floor(state.trust * progressDots.length);

  for (let i = 0; i < progressDots.length; i++) {
    if (i < activeCount) {
      progressDots[i].classList.add("active");
    } else {
      progressDots[i].classList.remove("active");
    }
  }
}

function showGameUI() {
  topUI.classList.remove("hidden");
  tip.classList.remove("hidden");
  progressRing.classList.remove("hidden");
}

function hideGameUI() {
  topUI.classList.add("hidden");
  tip.classList.add("hidden");
  progressRing.classList.add("hidden");
}

function startExperience() {
  started = true;
  finished = false;

  state.trust = 0.08;
  state.fear = 0.2;
  state.energy = 0.45;
  state.bloom = 0;
  state.touching = false;
  state.stillness = 0;

  intro.classList.add("hidden");
  result.classList.add("hidden");
  infoPanel.classList.add("hidden");

  showGameUI();

  createRipple(0, 0, 0x92f6ff);
}

function restartExperience() {
  startExperience();
}

function finishExperience() {
  if (finished) {
    return;
  }

  finished = true;

  const trustPercent = Math.round(state.trust * 100);

  finalTrust.textContent = `${trustPercent}%`;

  if (state.fear > 0.45) {
    resultTitle.textContent = "Sensitive Bloom";
    resultText.textContent = "Acaleph bloomed carefully. It still remembers your fast movements.";
    finalMood.textContent = "Sensitive";
  } else if (state.trust > 0.88) {
    resultTitle.textContent = "Gentle Bloom";
    resultText.textContent = "Your touch made Acaleph feel safe enough to glow fully.";
    finalMood.textContent = "Calm";
  } else {
    resultTitle.textContent = "Quiet Bloom";
    resultText.textContent = "Acaleph opened slowly, like a small light learning to trust.";
    finalMood.textContent = "Quiet";
  }

  setTimeout(() => {
    result.classList.remove("hidden");
    hideGameUI();
  }, 1000);
}

function handlePointerDown(event) {
  if (!started || finished) {
    return;
  }

  const p = toNDC(event.clientX, event.clientY);

  state.touching = true;
  state.touchStartTime = performance.now();
  state.lastMoveTime = performance.now();
  state.lastX = event.clientX;
  state.lastY = event.clientY;
  state.pointerX = p.x;
  state.pointerY = p.y;
  state.stillness = 0;

  state.trust += 0.012;
  state.fear += 0.008;

  createRipple(p.x, p.y, 0x92f6ff);

  state.trust = clamp(state.trust, 0, 1);
  state.fear = clamp(state.fear, 0, 1);
}

function handlePointerMove(event) {
  if (!started || finished) {
    return;
  }

  const now = performance.now();
  const dt = Math.max(now - state.lastMoveTime, 16);

  const dx = event.clientX - state.lastX;
  const dy = event.clientY - state.lastY;

  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = distance / dt;

  const p = toNDC(event.clientX, event.clientY);

  state.pointerX = p.x;
  state.pointerY = p.y;
  state.speed = lerp(state.speed, speed, 0.18);

  state.lastX = event.clientX;
  state.lastY = event.clientY;
  state.lastMoveTime = now;
  state.stillness = 0;

  if (speed > 0.8) {
    state.fear += 0.025;
    state.trust -= 0.008;
    state.energy += 0.02;
  } else if (speed < 0.28) {
    state.trust += 0.006;
    state.fear -= 0.004;
  }

  state.trust = clamp(state.trust, 0, 1);
  state.fear = clamp(state.fear, 0, 1);
  state.energy = clamp(state.energy, 0, 1);
}

function handlePointerUp() {
  if (!started || finished) {
    return;
  }

  const holdTime = performance.now() - state.touchStartTime;

  if (holdTime > 650) {
    state.trust += 0.075;
    state.fear -= 0.04;
    createRipple(state.pointerX, state.pointerY, 0xff9bd8);
  } else {
    state.energy += 0.02;
  }

  state.touching = false;

  state.trust = clamp(state.trust, 0, 1);
  state.fear = clamp(state.fear, 0, 1);
  state.energy = clamp(state.energy, 0, 1);
}

function updateTentacles(time) {
  for (let i = 0; i < tentacles.length; i++) {
    const item = tentacles[i];
    const positions = item.line.geometry.attributes.position.array;

    const afraidCurl = state.fear * 0.34;
    const bloomLength = state.bloom * 0.7;

    for (let j = 0; j < tentacleSegments; j++) {
      const t = j / (tentacleSegments - 1);

      const wave = Math.sin(time * 2 + t * 5 + item.offset) * 0.16;
      const angle = item.angle + wave + state.smoothX * 0.18;

      const topRadius = 0.32 + Math.sin(item.angle * 3) * 0.05;
      const x = Math.cos(item.angle) * topRadius + Math.cos(angle) * t * afraidCurl;
      const y = -0.18 - t * (item.length + bloomLength);
      const z = Math.sin(item.angle) * topRadius + Math.sin(angle) * t * afraidCurl;

      positions[j * 3] = x;
      positions[j * 3 + 1] = y;
      positions[j * 3 + 2] = z;
    }

    item.line.material.opacity = 0.36 + state.trust * 0.24 + state.bloom * 0.2;
    item.line.geometry.attributes.position.needsUpdate = true;
  }
}

function updateDust(time) {
  const positions = dust.geometry.attributes.position.array;

  for (let i = 0; i < dustCount; i++) {
    const seed = dustSeeds[i];
    const angle = seed.angle + time * seed.speed * 0.3;
    const radius = seed.radius + Math.sin(time + seed.angle) * 0.08;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = seed.y + Math.sin(time * 0.9 + seed.angle) * 0.16;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }

  dust.geometry.attributes.position.needsUpdate = true;
  dust.material.opacity = 0.34 + state.trust * 0.28 + state.bloom * 0.18;
}

function updateRipples(dt) {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const ripple = ripples[i];

    ripple.life += dt;

    const progress = ripple.life / ripple.maxLife;
    const scale = 1 + progress * 7;

    ripple.mesh.scale.setScalar(scale);
    ripple.mesh.material.opacity = (1 - progress) * 0.65;

    if (progress >= 1) {
      scene.remove(ripple.mesh);
      ripple.mesh.geometry.dispose();
      ripple.mesh.material.dispose();
      ripples.splice(i, 1);
    }
  }
}

function updateAcaleph(dt, time) {
  state.smoothX = lerp(state.smoothX, state.pointerX, 0.04);
  state.smoothY = lerp(state.smoothY, state.pointerY, 0.04);

  if (state.touching) {
    const holdTime = performance.now() - state.touchStartTime;

    if (holdTime > 700 && state.speed < 0.25) {
      state.trust += dt * 0.08;
      state.fear -= dt * 0.045;
    }
  } else {
    state.stillness += dt;

    if (state.stillness > 1.4) {
      state.trust += dt * 0.025;
      state.fear -= dt * 0.02;
    }
  }

  if (state.trust > 0.72 && state.fear < 0.48) {
    state.bloom += dt * 0.12;
  }

  if (state.bloom > 0.98) {
    finishExperience();
  }

  state.fear -= dt * 0.035;
  state.energy -= dt * 0.018;

  state.trust = clamp(state.trust, 0, 1);
  state.fear = clamp(state.fear, 0, 1);
  state.energy = clamp(state.energy, 0.18, 1);
  state.bloom = clamp(state.bloom, 0, 1);

  const breathe = 1 + Math.sin(time * 2.1) * (0.025 + state.trust * 0.02);
  const scared = 1 - state.fear * 0.12;
  const bloomScale = 1 + state.bloom * 0.28;

  acaleph.scale.setScalar(breathe * scared * bloomScale);

  acaleph.rotation.y = lerp(acaleph.rotation.y, state.smoothX * 0.45 + Math.sin(time * 0.4) * 0.18, 0.035);
  acaleph.rotation.x = lerp(acaleph.rotation.x, -state.smoothY * 0.22 + Math.sin(time * 0.6) * 0.05, 0.035);

  if (state.fear > 0.55) {
    acaleph.position.x = Math.sin(time * 18) * 0.055;
    acaleph.position.y = Math.cos(time * 16) * 0.035;
  } else {
    acaleph.position.x = lerp(acaleph.position.x, state.smoothX * 0.22, 0.025);
    acaleph.position.y = lerp(acaleph.position.y, state.smoothY * 0.16, 0.025);
  }

  bell.scale.x = 1.22 + Math.sin(time * 2.1) * 0.035 + state.bloom * 0.1;
  bell.scale.y = 0.72 + Math.cos(time * 2.1) * 0.018 - state.fear * 0.06;
  bell.scale.z = 1.22 + Math.sin(time * 2.1) * 0.035 + state.bloom * 0.1;

  core.scale.setScalar(1 + state.trust * 0.18 + state.bloom * 0.45 + Math.sin(time * 3) * 0.035);

  core.material.opacity = 0.52 + state.trust * 0.24 + state.bloom * 0.2;
  core.material.color.lerpColors(
    new THREE.Color(0x92f6ff),
    new THREE.Color(0xff9bd8),
    state.bloom
  );

  bodyMaterial.emissiveIntensity = 0.45 + state.trust * 0.8 + state.bloom * 0.9 - state.fear * 0.25;
  bodyMaterial.opacity = 0.42 + state.trust * 0.14 + state.bloom * 0.16;

  halo.scale.setScalar(1 + state.trust * 0.18 + state.bloom * 0.45);
  halo.rotation.z += dt * (0.25 + state.bloom * 0.6);
  halo.material.opacity = 0.18 + state.trust * 0.16 + state.bloom * 0.28;

  const blink = Math.sin(time * 3.4) > 0.96 ? 0.15 : 1;

  leftEye.scale.y = lerp(leftEye.scale.y, blink * (1.5 - state.fear * 0.5), 0.25);
  rightEye.scale.y = lerp(rightEye.scale.y, blink * (1.5 - state.fear * 0.5), 0.25);

  leftFin.rotation.z = 0.5 + Math.sin(time * 2.3) * 0.18 + state.bloom * 0.15;
  rightFin.rotation.z = -0.5 - Math.sin(time * 2.3) * 0.18 - state.bloom * 0.15;

  leftCheek.material.opacity = 0.22 + state.trust * 0.35;
  rightCheek.material.opacity = 0.22 + state.trust * 0.35;

  for (let i = 0; i < bloomPetals.length; i++) {
    const item = bloomPetals[i];
    const petal = item.mesh;

    const open = state.bloom;
    const radius = 0.45 + open * 0.55;
    const y = 0.1 + open * 0.12;

    petal.position.x = Math.cos(item.angle) * radius;
    petal.position.z = Math.sin(item.angle) * radius;
    petal.position.y = y;

    petal.scale.set(0.18 + open * 0.28, 0.08 + open * 0.06, 0.36 + open * 0.5);
    petal.material.opacity = open * 0.6;
  }
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);
  const time = clock.elapsedTime;

  updateAcaleph(dt, time);
  updateTentacles(time);
  updateDust(time);
  updateRipples(dt);

  updateMood();
  updateTip();
  updateProgressDots();

  background.rotation.y += dt * 0.01;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

startButton.addEventListener("click", startExperience);
restartButton.addEventListener("click", restartExperience);

infoButton.addEventListener("click", () => {
  infoPanel.classList.remove("hidden");
});

closeInfo.addEventListener("click", () => {
  infoPanel.classList.add("hidden");
});

canvas.addEventListener("pointerdown", handlePointerDown);
canvas.addEventListener("pointermove", handlePointerMove);
canvas.addEventListener("pointerup", handlePointerUp);
canvas.addEventListener("pointercancel", handlePointerUp);

window.addEventListener("resize", resize);

animate();