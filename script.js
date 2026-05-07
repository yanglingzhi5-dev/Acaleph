import * as THREE from "three";

const canvas = document.querySelector("#experience");
const startScreen = document.querySelector("#startScreen");
const endingScreen = document.querySelector("#endingScreen");
const startBtn = document.querySelector("#startBtn");
const restartBtn = document.querySelector("#restartBtn");
const hud = document.querySelector("#hud");
const instruction = document.querySelector("#instruction");
const instructionText = document.querySelector("#instructionText");
const stateText = document.querySelector("#stateText");
const trustBar = document.querySelector("#trustBar");
const fearBar = document.querySelector("#fearBar");
const openBar = document.querySelector("#openBar");
const aboutBtn = document.querySelector("#aboutBtn");
const aboutPanel = document.querySelector("#aboutPanel");
const closeAbout = document.querySelector("#closeAbout");

let started = false;
let ended = false;

let width = window.innerWidth;
let height = window.innerHeight;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02030a, 0.08);

const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
camera.position.set(0, 0, 6.2);

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});

renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const clock = new THREE.Clock();

const state = {
  trust: 0,
  fear: 0.18,
  open: 0,
  bloom: 0,
  pressure: 0,
  stillness: 0,
  pointerX: 0,
  pointerY: 0,
  smoothX: 0,
  smoothY: 0,
  lastX: 0,
  lastY: 0,
  speed: 0,
  touching: false,
  pointerDownTime: 0,
  lastMoveTime: 0,
  lastPinchDistance: 0,
  phase: "Unknown"
};

const pointerMap = new Map();

const creatureGroup = new THREE.Group();
scene.add(creatureGroup);

const backgroundGroup = new THREE.Group();
scene.add(backgroundGroup);

const rippleGroup = new THREE.Group();
scene.add(rippleGroup);

const outerUniforms = {
  uTime: { value: 0 },
  uTrust: { value: 0 },
  uFear: { value: 0 },
  uOpen: { value: 0 },
  uBloom: { value: 0 },
  uPressure: { value: 0 },
  uPointer: { value: new THREE.Vector2(0, 0) }
};

const outerVertex = `
  uniform float uTime;
  uniform float uTrust;
  uniform float uFear;
  uniform float uOpen;
  uniform float uBloom;
  uniform float uPressure;
  uniform vec2 uPointer;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vPosition;
  varying float vPulse;

  float wave(vec3 p) {
    float w = 0.0;
    w += sin(p.x * 4.0 + uTime * 1.4);
    w += sin(p.y * 5.2 - uTime * 1.1);
    w += sin(p.z * 6.0 + uTime * 1.8);
    w += sin((p.x + p.y) * 3.3 + uTime * 0.9);
    return w / 4.0;
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);

    vec3 p = position;
    float breathing = sin(uTime * 1.4) * 0.045;
    float nervous = sin(uTime * 10.0 + position.y * 8.0) * 0.025 * uFear;
    float organic = wave(position) * (0.075 + uTrust * 0.08 + uBloom * 0.12);

    float pointerInfluence = 1.0 - distance(normalize(position.xy), uPointer) * 0.62;
    pointerInfluence = clamp(pointerInfluence, 0.0, 1.0);
    float touchDent = -pointerInfluence * uPressure * 0.18;

    float openStretch = abs(position.y) * uOpen * 0.18;
    float bloomStretch = pow(abs(position.y), 1.7) * uBloom * 0.35;

    float displacement = breathing + nervous + organic + touchDent + openStretch + bloomStretch;
    p += normal * displacement;

    p.x += sin(uTime + position.y * 4.0) * uOpen * 0.06;
    p.z += cos(uTime * 0.8 + position.x * 5.0) * uBloom * 0.08;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    vViewPosition = -mvPosition.xyz;
    vPosition = p;
    vPulse = displacement;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const outerFragment = `
  uniform float uTime;
  uniform float uTrust;
  uniform float uFear;
  uniform float uOpen;
  uniform float uBloom;
  uniform float uPressure;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vPosition;
  varying float vPulse;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 2.2);

    vec3 afraidColor = vec3(0.35, 0.55, 1.0);
    vec3 trustColor = vec3(0.55, 1.0, 0.95);
    vec3 bloomColor = vec3(1.0, 0.58, 0.92);
    vec3 dangerColor = vec3(1.0, 0.25, 0.52);

    vec3 baseColor = mix(afraidColor, trustColor, uTrust);
    baseColor = mix(baseColor, bloomColor, uBloom);
    baseColor = mix(baseColor, dangerColor, uFear * 0.45);

    float innerGlow = 0.25 + sin(uTime * 2.0 + vPosition.y * 4.0) * 0.08;
    float light = fresnel * 1.5 + innerGlow + abs(vPulse) * 2.2 + uPressure * 0.35;

    vec3 color = baseColor * light;
    float alpha = 0.32 + fresnel * 0.36 + uOpen * 0.1 + uBloom * 0.12;

    gl_FragColor = vec4(color, alpha);
  }
`;

const outerMaterial = new THREE.ShaderMaterial({
  uniforms: outerUniforms,
  vertexShader: outerVertex,
  fragmentShader: outerFragment,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const outerGeometry = new THREE.SphereGeometry(1.25, 96, 96);
const outerMesh = new THREE.Mesh(outerGeometry, outerMaterial);
creatureGroup.add(outerMesh);

const coreGeometry = new THREE.IcosahedronGeometry(0.52, 3);
const coreMaterial = new THREE.MeshBasicMaterial({
  color: 0x9ff8ff,
  transparent: true,
  opacity: 0.72,
  blending: THREE.AdditiveBlending
});
const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
creatureGroup.add(coreMesh);

const haloGeometry = new THREE.TorusGeometry(1.48, 0.018, 16, 160);
const haloMaterial = new THREE.MeshBasicMaterial({
  color: 0xc7a8ff,
  transparent: true,
  opacity: 0.26,
  blending: THREE.AdditiveBlending
});
const halo = new THREE.Mesh(haloGeometry, haloMaterial);
halo.rotation.x = Math.PI * 0.5;
creatureGroup.add(halo);

const secondHalo = new THREE.Mesh(haloGeometry, haloMaterial.clone());
secondHalo.material.color.set(0x9ff8ff);
secondHalo.material.opacity = 0.16;
secondHalo.rotation.y = Math.PI * 0.5;
creatureGroup.add(secondHalo);

const particleCount = 850;
const particlePositions = new Float32Array(particleCount * 3);
const particleSeeds = [];

for (let i = 0; i < particleCount; i++) {
  const radius = 0.35 + Math.random() * 1.85;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  particlePositions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
  particlePositions[i * 3 + 1] = Math.cos(phi) * radius;
  particlePositions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;

  particleSeeds.push({
    radius: radius,
    theta: theta,
    phi: phi,
    speed: 0.25 + Math.random() * 0.8
  });
}

const particleGeometry = new THREE.BufferGeometry();
particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

const particleMaterial = new THREE.PointsMaterial({
  color: 0xbfefff,
  size: 0.022,
  transparent: true,
  opacity: 0.68,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
creatureGroup.add(particles);

const starCount = 520;
const starPositions = new Float32Array(starCount * 3);

for (let i = 0; i < starCount; i++) {
  starPositions[i * 3] = (Math.random() - 0.5) * 18;
  starPositions[i * 3 + 1] = (Math.random() - 0.5) * 14;
  starPositions[i * 3 + 2] = -2 - Math.random() * 10;
}

const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));

const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 0.014,
  transparent: true,
  opacity: 0.38,
  blending: THREE.AdditiveBlending
});

const stars = new THREE.Points(starGeometry, starMaterial);
backgroundGroup.add(stars);

const tendrils = [];
const tendrilCount = 26;
const tendrilSegments = 28;

for (let i = 0; i < tendrilCount; i++) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(tendrilSegments * 3);
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.LineBasicMaterial({
    color: i % 2 === 0 ? 0x9ff8ff : 0xff9fdc,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending
  });

  const line = new THREE.Line(geometry, material);
  creatureGroup.add(line);

  tendrils.push({
    line: line,
    angle: (i / tendrilCount) * Math.PI * 2,
    height: -0.8 + Math.random() * 1.6,
    length: 1.4 + Math.random() * 0.8,
    wave: Math.random() * 10
  });
}

const ripples = [];

function createRipple(x, y, color, strength) {
  const geometry = new THREE.RingGeometry(0.08, 0.085, 64);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });

  const ripple = new THREE.Mesh(geometry, material);

  const worldX = x * 2.4;
  const worldY = y * 2.8;

  ripple.position.set(worldX, worldY, 1.1);
  ripple.scale.setScalar(1);
  rippleGroup.add(ripple);

  ripples.push({
    mesh: ripple,
    life: 0,
    maxLife: 0.9 + strength * 0.5,
    strength: strength
  });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function updateInstruction() {
  if (state.bloom > 0.96) {
    instructionText.textContent = "It opened because you stopped forcing it.";
  } else if (state.fear > 0.68) {
    instructionText.textContent = "Too fast. Give it space.";
  } else if (state.open > 0.55) {
    instructionText.textContent = "It is opening. Stay close, but gentle.";
  } else if (state.trust > 0.55) {
    instructionText.textContent = "Hold softly. Let it breathe with you.";
  } else if (state.stillness > 2.4) {
    instructionText.textContent = "It came closer when you stopped.";
  } else {
    instructionText.textContent = "Move slowly. Let it notice you.";
  }
}

function updatePhase() {
  if (state.bloom > 0.9) {
    state.phase = "Bloom";
  } else if (state.open > 0.48) {
    state.phase = "Open";
  } else if (state.trust > 0.52) {
    state.phase = "Trust";
  } else if (state.fear > 0.55) {
    state.phase = "Afraid";
  } else {
    state.phase = "Unknown";
  }

  stateText.textContent = state.phase;
}

function updateHUD() {
  trustBar.style.width = `${Math.round(state.trust * 100)}%`;
  fearBar.style.width = `${Math.round(state.fear * 100)}%`;
  openBar.style.width = `${Math.round(state.open * 100)}%`;
}

function screenToNDC(clientX, clientY) {
  const x = (clientX / width) * 2 - 1;
  const y = -(clientY / height) * 2 + 1;
  return { x: x, y: y };
}

function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function handlePointerDown(event) {
  if (!started || ended) {
    return;
  }

  pointerMap.set(event.pointerId, {
    x: event.clientX,
    y: event.clientY
  });

  const ndc = screenToNDC(event.clientX, event.clientY);

  state.touching = true;
  state.pointerDownTime = performance.now();
  state.lastMoveTime = performance.now();
  state.lastX = event.clientX;
  state.lastY = event.clientY;
  state.pointerX = ndc.x;
  state.pointerY = ndc.y;
  state.pressure = 0.35;

  state.trust += 0.018;
  state.fear += 0.025;

  createRipple(ndc.x, ndc.y, 0x9ff8ff, 0.6);
}

function handlePointerMove(event) {
  if (!started || ended) {
    return;
  }

  if (pointerMap.has(event.pointerId)) {
    pointerMap.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY
    });
  }

  const now = performance.now();
  const dt = Math.max(16, now - state.lastMoveTime);
  const dx = event.clientX - state.lastX;
  const dy = event.clientY - state.lastY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = distance / dt;

  const ndc = screenToNDC(event.clientX, event.clientY);

  state.pointerX = ndc.x;
  state.pointerY = ndc.y;
  state.speed = lerp(state.speed, speed, 0.25);
  state.lastX = event.clientX;
  state.lastY = event.clientY;
  state.lastMoveTime = now;
  state.stillness = 0;

  if (speed > 0.9) {
    state.fear += 0.028;
    state.trust -= 0.01;
    state.pressure += 0.05;
  } else if (speed < 0.32) {
    state.trust += 0.006;
    state.fear -= 0.006;
    state.pressure += 0.012;
  }

  state.trust = clamp(state.trust, 0, 1);
  state.fear = clamp(state.fear, 0, 1);
  state.pressure = clamp(state.pressure, 0, 1);
}

function handlePointerUp(event) {
  if (!started || ended) {
    return;
  }

  pointerMap.delete(event.pointerId);

  const holdTime = performance.now() - state.pointerDownTime;

  if (holdTime > 650) {
    state.trust += 0.08;
    state.fear -= 0.045;
    state.open += 0.035;

    createRipple(state.pointerX, state.pointerY, 0xff9fdc, 1);
  } else {
    state.fear += 0.022;
  }

  state.touching = pointerMap.size > 0;
  state.pressure *= 0.45;

  state.trust = clamp(state.trust, 0, 1);
  state.fear = clamp(state.fear, 0, 1);
  state.open = clamp(state.open, 0, 1);
}

function handleTouchStart(event) {
  if (!started || ended) {
    return;
  }

  if (event.touches.length === 2) {
    state.lastPinchDistance = getTouchDistance(event.touches);
  }
}

function handleTouchMove(event) {
  if (!started || ended) {
    return;
  }

  if (event.touches.length === 2) {
    event.preventDefault();

    const distance = getTouchDistance(event.touches);
    const delta = distance - state.lastPinchDistance;

    state.open += delta * 0.0022;
    state.trust += Math.abs(delta) * 0.00035;
    state.fear += Math.max(0, Math.abs(delta) - 8) * 0.001;

    state.lastPinchDistance = distance;

    state.open = clamp(state.open, 0, 1);
    state.trust = clamp(state.trust, 0, 1);
    state.fear = clamp(state.fear, 0, 1);
  }
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
}

function resetExperience() {
  ended = false;

  state.trust = 0;
  state.fear = 0.18;
  state.open = 0;
  state.bloom = 0;
  state.pressure = 0;
  state.stillness = 0;
  state.pointerX = 0;
  state.pointerY = 0;
  state.smoothX = 0;
  state.smoothY = 0;
  state.speed = 0;
  state.phase = "Unknown";

  creatureGroup.scale.set(1, 1, 1);
  creatureGroup.rotation.set(0, 0, 0);

  endingScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  instruction.classList.remove("hidden");
  aboutBtn.classList.remove("hidden");
}

function startExperience() {
  started = true;
  startScreen.classList.add("hidden");
  resetExperience();
}

function showEnding() {
  if (ended) {
    return;
  }

  ended = true;

  setTimeout(() => {
    endingScreen.classList.remove("hidden");
  }, 1200);
}

function updateTendrils(time) {
  for (let i = 0; i < tendrils.length; i++) {
    const t = tendrils[i];
    const positions = t.line.geometry.attributes.position.array;

    const openLength = t.length + state.open * 0.9 + state.bloom * 1.4;
    const baseRadius = 0.76 + state.open * 0.18;

    for (let j = 0; j < tendrilSegments; j++) {
      const p = j / (tendrilSegments - 1);
      const wave = Math.sin(time * 1.6 + p * 5.0 + t.wave) * 0.12;
      const angle = t.angle + wave + state.smoothX * 0.16;
      const radius = baseRadius + p * openLength;

      const x = Math.cos(angle) * radius;
      const y = t.height * (1 - p) + Math.sin(p * Math.PI) * 0.25 + Math.sin(time + t.wave) * 0.05;
      const z = Math.sin(angle) * radius;

      positions[j * 3] = x;
      positions[j * 3 + 1] = y;
      positions[j * 3 + 2] = z;
    }

    t.line.material.opacity = 0.08 + state.trust * 0.11 + state.bloom * 0.18;
    t.line.geometry.attributes.position.needsUpdate = true;
  }
}

function updateParticles(time) {
  const positions = particleGeometry.attributes.position.array;

  for (let i = 0; i < particleCount; i++) {
    const seed = particleSeeds[i];

    const radius = seed.radius + state.open * 0.35 + state.bloom * 0.75;
    const theta = seed.theta + time * seed.speed * (0.08 + state.bloom * 0.1);
    const phi = seed.phi + Math.sin(time * 0.35 + seed.theta) * 0.08;

    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    positions[i * 3 + 1] = Math.cos(phi) * radius;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
  }

  particleGeometry.attributes.position.needsUpdate = true;
  particleMaterial.opacity = 0.36 + state.trust * 0.24 + state.open * 0.18 + state.bloom * 0.18;
  particleMaterial.size = 0.018 + state.bloom * 0.012;
}

function updateRipples(dt) {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const ripple = ripples[i];

    ripple.life += dt;

    const progress = ripple.life / ripple.maxLife;
    const scale = 1 + progress * 8 * ripple.strength;

    ripple.mesh.scale.setScalar(scale);
    ripple.mesh.material.opacity = (1 - progress) * 0.6;

    if (progress >= 1) {
      rippleGroup.remove(ripple.mesh);
      ripple.mesh.geometry.dispose();
      ripple.mesh.material.dispose();
      ripples.splice(i, 1);
    }
  }
}

function updateCreature(dt, time) {
  state.smoothX = lerp(state.smoothX, state.pointerX, 0.055);
  state.smoothY = lerp(state.smoothY, state.pointerY, 0.055);

  if (state.touching) {
    const holdTime = performance.now() - state.pointerDownTime;

    if (holdTime > 550 && state.speed < 0.25) {
      state.trust += dt * 0.105;
      state.fear -= dt * 0.055;
      state.open += dt * 0.035;
      state.pressure += dt * 0.18;
    }
  } else {
    state.stillness += dt;

    if (state.stillness > 1.3) {
      state.trust += dt * 0.035;
      state.fear -= dt * 0.025;
    }
  }

  if (state.trust > 0.72 && state.open > 0.42 && state.fear < 0.42) {
    state.bloom += dt * 0.13;
  } else if (state.trust > 0.9 && state.fear < 0.35) {
    state.bloom += dt * 0.08;
  }

  if (state.bloom > 0.98) {
    showEnding();
  }

  state.fear -= dt * 0.045;
  state.pressure -= dt * 0.42;

  state.trust = clamp(state.trust, 0, 1);
  state.fear = clamp(state.fear, 0, 1);
  state.open = clamp(state.open, 0, 1);
  state.bloom = clamp(state.bloom, 0, 1);
  state.pressure = clamp(state.pressure, 0, 1);

  const afraidScale = 1 - state.fear * 0.16;
  const bloomScale = 1 + state.bloom * 0.38;
  const breathing = 1 + Math.sin(time * 1.4) * (0.018 + state.trust * 0.02);

  creatureGroup.scale.setScalar(afraidScale * bloomScale * breathing);

  creatureGroup.rotation.y += dt * (0.16 + state.trust * 0.18);
  creatureGroup.rotation.x = lerp(creatureGroup.rotation.x, -state.smoothY * 0.28, 0.04);
  creatureGroup.rotation.z = lerp(creatureGroup.rotation.z, -state.smoothX * 0.18, 0.04);

  if (state.fear > 0.55) {
    creatureGroup.position.x = Math.sin(time * 18) * state.fear * 0.035;
    creatureGroup.position.y = Math.cos(time * 15) * state.fear * 0.025;
  } else {
    creatureGroup.position.x = lerp(creatureGroup.position.x, state.smoothX * 0.12, 0.02);
    creatureGroup.position.y = lerp(creatureGroup.position.y, state.smoothY * 0.12, 0.02);
  }

  const coreScale = 1 + state.trust * 0.22 + state.open * 0.18 + state.bloom * 0.5;
  coreMesh.scale.setScalar(coreScale + Math.sin(time * 2.2) * 0.04);

  coreMaterial.opacity = 0.46 + state.trust * 0.26 + state.bloom * 0.22;
  coreMaterial.color.lerpColors(
    new THREE.Color(0x7aa8ff),
    new THREE.Color(0xff9fdc),
    state.bloom
  );

  halo.scale.setScalar(1 + state.open * 0.28 + state.bloom * 0.56);
  secondHalo.scale.setScalar(0.75 + state.trust * 0.2 + state.bloom * 0.7);

  halo.rotation.z += dt * (0.18 + state.open * 0.35);
  secondHalo.rotation.x += dt * (0.13 + state.bloom * 0.38);

  halo.material.opacity = 0.12 + state.open * 0.22 + state.bloom * 0.18;
  secondHalo.material.opacity = 0.08 + state.trust * 0.12 + state.bloom * 0.16;

  outerUniforms.uTime.value = time;
  outerUniforms.uTrust.value = state.trust;
  outerUniforms.uFear.value = state.fear;
  outerUniforms.uOpen.value = state.open;
  outerUniforms.uBloom.value = state.bloom;
  outerUniforms.uPressure.value = state.pressure;
  outerUniforms.uPointer.value.set(state.smoothX, state.smoothY);
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.033);
  const time = clock.elapsedTime;

  if (started) {
    updateCreature(dt, time);
    updateParticles(time);
    updateTendrils(time);
    updateRipples(dt);
    updatePhase();
    updateHUD();
    updateInstruction();
  } else {
    creatureGroup.rotation.y += dt * 0.1;
    outerUniforms.uTime.value = time;
  }

  backgroundGroup.rotation.y += dt * 0.008;
  backgroundGroup.rotation.x = Math.sin(time * 0.12) * 0.04;

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

startBtn.addEventListener("click", startExperience);
restartBtn.addEventListener("click", resetExperience);

aboutBtn.addEventListener("click", () => {
  aboutPanel.classList.remove("hidden");
});

closeAbout.addEventListener("click", () => {
  aboutPanel.classList.add("hidden");
});

window.addEventListener("resize", resize);

canvas.addEventListener("pointerdown", handlePointerDown);
canvas.addEventListener("pointermove", handlePointerMove);
canvas.addEventListener("pointerup", handlePointerUp);
canvas.addEventListener("pointercancel", handlePointerUp);
canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

animate();