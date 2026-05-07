const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.querySelector("#startScreen");
const gameOverScreen = document.querySelector("#gameOverScreen");
const startButton = document.querySelector("#startButton");
const restartButton = document.querySelector("#restartButton");

const hud = document.querySelector("#hud");
const scoreText = document.querySelector("#scoreText");
const depthText = document.querySelector("#depthText");
const levelText = document.querySelector("#levelText");

const energyUI = document.querySelector("#energyUI");
const energyFill = document.querySelector("#energyFill");
const energyPercent = document.querySelector("#energyPercent");

const tip = document.querySelector("#tip");

const finalScore = document.querySelector("#finalScore");
const bestScore = document.querySelector("#bestScore");
const finalDepth = document.querySelector("#finalDepth");
const finalMessage = document.querySelector("#finalMessage");

let width = window.innerWidth;
let height = window.innerHeight;
let dpr = Math.min(window.devicePixelRatio || 1, 1.7);

let gameState = "start";

let score = 0;
let best = Number(localStorage.getItem("acalephBestScore")) || 0;
let energy = 100;
let depth = 0;
let difficulty = 1;
let level = 1;

let lastTime = 0;
let lightTimer = 0;
let enemyTimer = 0;
let bubbleTimer = 0;

let screenShake = 0;
let damageFlash = 0;

const keys = {
  up: false,
  down: false,
  left: false,
  right: false
};

const player = {
  x: width / 2,
  y: height * 0.68,
  targetX: width / 2,
  targetY: height * 0.68,
  radius: 30,
  glow: 1,
  invincible: 0,
  tail: [],
  angle: 0,
  tilt: 0,
  side: 0
};

const lights = [];
const enemies = [];
const bubbles = [];
const particles = [];
const currents = [];
const gridLines = [];

function setupOceanLines() {
  currents.length = 0;
  gridLines.length = 0;

  for (let i = 0; i < 34; i++) {
    currents.push({
      x: Math.random() * width,
      y: Math.random() * height,
      length: 70 + Math.random() * 150,
      speed: 14 + Math.random() * 30,
      alpha: 0.035 + Math.random() * 0.065,
      sway: Math.random() * 80
    });
  }

  for (let i = 0; i < 16; i++) {
    gridLines.push({
      y: i * (height / 15),
      speed: 20 + Math.random() * 12
    });
  }
}

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 1.7);

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  setupOceanLines();

  if (gameState === "start" || gameState === "over") {
    player.x = width / 2;
    player.y = height * 0.68;
    player.targetX = player.x;
    player.targetY = player.y;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function showPlayingUI() {
  hud.classList.remove("hidden");
  energyUI.classList.remove("hidden");
  tip.classList.remove("hidden");
}

function hidePlayingUI() {
  hud.classList.add("hidden");
  energyUI.classList.add("hidden");
  tip.classList.add("hidden");
}

function resetGame() {
  score = 0;
  energy = 100;
  depth = 0;
  difficulty = 1;
  level = 1;

  lightTimer = 0;
  enemyTimer = 0.8;
  bubbleTimer = 0;

  screenShake = 0;
  damageFlash = 0;

  lights.length = 0;
  enemies.length = 0;
  bubbles.length = 0;
  particles.length = 0;

  player.x = width / 2;
  player.y = height * 0.68;
  player.targetX = width / 2;
  player.targetY = height * 0.68;
  player.glow = 1;
  player.invincible = 0;
  player.tail.length = 0;
  player.angle = 0;
  player.tilt = 0;
  player.side = 0;

  scoreText.textContent = "0";
  depthText.textContent = "0m";
  levelText.textContent = "1";

  energyPercent.textContent = "100%";
  energyFill.style.width = "100%";
  energyFill.style.background = "linear-gradient(90deg, #43dfff, #8ff4ff)";
}

function startGame() {
  resetGame();
  gameState = "playing";

  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");

  showPlayingUI();
}

function endGame() {
  gameState = "over";

  if (score > best) {
    best = score;
    localStorage.setItem("acalephBestScore", String(best));
    finalMessage.textContent = "New best drift. Your wire glow reached a deeper layer.";
  } else if (depth > 1200) {
    finalMessage.textContent = "You survived the pressure zone. The deep almost let you pass.";
  } else if (depth > 700) {
    finalMessage.textContent = "A strong descent through the wire ocean. The current remembers your path.";
  } else {
    finalMessage.textContent = "The light faded before the deep became quiet.";
  }

  finalScore.textContent = score;
  bestScore.textContent = best;
  finalDepth.textContent = `${Math.floor(depth)}m`;

  hidePlayingUI();
  gameOverScreen.classList.remove("hidden");
}

function getDifficultyByDepth() {
  const base = 1 + depth / 170;
  const pressure = Math.pow(depth / 900, 1.35);
  return base + pressure;
}

function getLevelByDepth() {
  return Math.min(15, 1 + Math.floor(depth / 150));
}

function spawnLight() {
  const size = random(13, 19);

  lights.push({
    x: random(34, width - 34),
    y: -50,
    z: random(-70, 90),
    radius: size,
    speed: random(110, 155) + difficulty * 10,
    drift: random(-18, 18),
    rotation: random(0, Math.PI * 2),
    spin: random(-2.4, 2.4),
    value: 10 + Math.floor(level * 1.5)
  });
}

function createEnemy(type, xOffset) {
  let size = random(22, 32);
  let speed = random(130, 190) + difficulty * 18;
  let drift = random(-28, 28);
  let damage = 22 + Math.floor(difficulty * 1.45);

  if (type === "wide") {
    size = random(36, 48);
    speed = random(105, 145) + difficulty * 13;
    drift = random(-16, 16);
    damage = 30 + Math.floor(difficulty * 1.6);
  }

  if (type === "fast") {
    size = random(18, 25);
    speed = random(230, 310) + difficulty * 22;
    drift = random(-10, 10);
    damage = 20 + Math.floor(difficulty * 1.2);
  }

  if (type === "sine") {
    size = random(22, 30);
    speed = random(135, 185) + difficulty * 16;
    drift = random(70, 115);
    damage = 24 + Math.floor(difficulty * 1.35);
  }

  enemies.push({
    type,
    x: clamp(random(40, width - 40) + xOffset, 40, width - 40),
    baseX: 0,
    y: -80,
    z: random(-80, 110),
    radius: size,
    speed,
    drift,
    rotationX: random(0, Math.PI * 2),
    rotationY: random(0, Math.PI * 2),
    spinX: random(-1.8, 1.8),
    spinY: random(-2.2, 2.2),
    damage,
    phase: random(0, Math.PI * 2)
  });

  enemies[enemies.length - 1].baseX = enemies[enemies.length - 1].x;
}

function pickEnemyType() {
  const roll = Math.random();

  if (level < 3) {
    return "normal";
  }

  if (level < 5) {
    if (roll < 0.25) return "fast";
    return "normal";
  }

  if (level < 8) {
    if (roll < 0.24) return "fast";
    if (roll < 0.46) return "wide";
    if (roll < 0.68) return "sine";
    return "normal";
  }

  if (roll < 0.28) return "fast";
  if (roll < 0.52) return "sine";
  if (roll < 0.72) return "wide";
  return "normal";
}

function spawnEnemyWave() {
  const waveCount = level >= 9 ? 3 : level >= 5 ? 2 : 1;

  for (let i = 0; i < waveCount; i++) {
    const offset = waveCount === 1 ? 0 : (i - (waveCount - 1) / 2) * random(85, 130);
    createEnemy(pickEnemyType(), offset);
  }

  if (level >= 11 && Math.random() < 0.3) {
    setTimeout(() => {
      if (gameState === "playing") {
        createEnemy("fast", random(-120, 120));
      }
    }, 260);
  }
}

function spawnBubble() {
  bubbles.push({
    x: random(0, width),
    y: height + 20,
    radius: random(2, 8),
    speed: random(20, 64),
    alpha: random(0.07, 0.2),
    drift: random(-12, 12)
  });
}

function createParticles(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const angle = random(0, Math.PI * 2);
    const force = random(speed * 0.28, speed);

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force,
      radius: random(1.2, 3.8),
      life: 1,
      decay: random(0.018, 0.035),
      color
    });
  }
}

function projectPoint(point, centerX, centerY, scale, perspective) {
  const factor = perspective / (perspective + point.z);

  return {
    x: centerX + point.x * scale * factor,
    y: centerY + point.y * scale * factor,
    f: factor
  };
}

function rotatePoint(point, ax, ay, az) {
  let x = point.x;
  let y = point.y;
  let z = point.z;

  let cos = Math.cos(ax);
  let sin = Math.sin(ax);

  let y1 = y * cos - z * sin;
  let z1 = y * sin + z * cos;
  y = y1;
  z = z1;

  cos = Math.cos(ay);
  sin = Math.sin(ay);

  let x1 = x * cos + z * sin;
  z1 = -x * sin + z * cos;
  x = x1;
  z = z1;

  cos = Math.cos(az);
  sin = Math.sin(az);

  x1 = x * cos - y * sin;
  y1 = x * sin + y * cos;

  return {
    x: x1,
    y: y1,
    z
  };
}

function drawLine3D(points, edges, cx, cy, scale, rotation, color, alpha, lineWidth) {
  ctx.save();

  const projected = [];

  for (let i = 0; i < points.length; i++) {
    const rotated = rotatePoint(points[i], rotation.x, rotation.y, rotation.z);
    projected.push(projectPoint(rotated, cx, cy, scale, 420));
  }

  for (let i = 0; i < edges.length; i++) {
    const a = projected[edges[i][0]];
    const b = projected[edges[i][1]];

    const avgF = (a.f + b.f) / 2;
    const lineAlpha = alpha * clamp(avgF, 0.45, 1.2);

    ctx.strokeStyle = color;
    ctx.globalAlpha = lineAlpha;
    ctx.lineWidth = lineWidth * clamp(avgF, 0.7, 1.25);

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  ctx.restore();
}

function updatePlayer(dt) {
  const keyboardSpeed = 390;

  if (keys.left) player.targetX -= keyboardSpeed * dt;
  if (keys.right) player.targetX += keyboardSpeed * dt;
  if (keys.up) player.targetY -= keyboardSpeed * dt;
  if (keys.down) player.targetY += keyboardSpeed * dt;

  player.targetX = clamp(player.targetX, 30, width - 30);
  player.targetY = clamp(player.targetY, 90, height - 90);

  const dx = player.targetX - player.x;
  const dy = player.targetY - player.y;

  player.x += dx * 0.16;
  player.y += dy * 0.16;

  player.angle = Math.atan2(dx, 80);

  const targetSide = clamp(dx / 95, -1, 1);
  player.side += (targetSide - player.side) * 0.12;

  const targetTilt = clamp(dx / 140, -0.9, 0.9);
  player.tilt += (targetTilt - player.tilt) * 0.1;

  player.tail.push({
    x: player.x,
    y: player.y,
    side: player.side,
    life: 1
  });

  if (player.tail.length > 32) {
    player.tail.shift();
  }

  for (let i = 0; i < player.tail.length; i++) {
    player.tail[i].life -= dt * 1.2;
  }

  player.tail = player.tail.filter(point => point.life > 0);

  if (player.invincible > 0) {
    player.invincible -= dt;
  }

  player.glow += (energy / 100 - player.glow) * 0.04;
}

function updateLights(dt, time) {
  lightTimer -= dt;

  const maxLightsOnScreen = level < 5 ? 7 : level < 9 ? 6 : 5;
  const interval = Math.max(0.44, 0.9 - difficulty * 0.038);

  if (lightTimer <= 0 && lights.length < maxLightsOnScreen) {
    spawnLight();
    lightTimer = interval + random(-0.08, 0.12);
  }

  for (let i = lights.length - 1; i >= 0; i--) {
    const item = lights[i];

    item.y += item.speed * dt;
    item.x += Math.sin(time * 1.6 + item.rotation) * item.drift * dt;
    item.rotation += item.spin * dt;

    if (dist(player, item) < player.radius + item.radius * 0.8) {
      score += item.value;
      energy = clamp(energy + 7.2, 0, 100);
      createParticles(item.x, item.y, "cyan", 22, 190);
      lights.splice(i, 1);
    } else if (item.y > height + 80) {
      lights.splice(i, 1);
    }
  }
}

function updateEnemies(dt, time) {
  enemyTimer -= dt;

  const interval = Math.max(0.28, 1.05 - difficulty * 0.078);

  if (enemyTimer <= 0) {
    spawnEnemyWave();
    enemyTimer = interval + random(-0.08, 0.1);
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const item = enemies[i];

    item.y += item.speed * dt;

    if (item.type === "sine") {
      item.x = item.baseX + Math.sin(time * 2.3 + item.phase) * item.drift;
    } else {
      item.x += Math.sin(item.y * 0.012 + item.phase) * item.drift * dt;
    }

    if (item.type === "fast") {
      item.rotationX += item.spinX * dt * 2.1;
      item.rotationY += item.spinY * dt * 2.1;
    } else {
      item.rotationX += item.spinX * dt;
      item.rotationY += item.spinY * dt;
    }

    if (
      player.invincible <= 0 &&
      dist(player, item) < player.radius + item.radius * 0.72
    ) {
      energy -= item.damage;
      player.invincible = 1.05;
      screenShake = item.type === "wide" ? 17 : 13;
      damageFlash = 1;

      createParticles(player.x, player.y, "red", 30, 240);

      enemies.splice(i, 1);

      if (navigator.vibrate) {
        navigator.vibrate(item.type === "wide" ? 110 : 70);
      }
    } else if (item.y > height + 100) {
      enemies.splice(i, 1);
    }
  }
}

function updateBubbles(dt) {
  bubbleTimer -= dt;

  if (bubbleTimer <= 0) {
    spawnBubble();
    bubbleTimer = 0.07;
  }

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const item = bubbles[i];

    item.y -= item.speed * dt;
    item.x += item.drift * dt;

    if (item.y < -30) {
      bubbles.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const item = particles[i];

    item.x += item.vx * dt;
    item.y += item.vy * dt;

    item.vx *= 0.985;
    item.vy *= 0.985;

    item.life -= item.decay;

    if (item.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function updateCurrents(dt) {
  for (let i = 0; i < currents.length; i++) {
    const item = currents[i];

    item.y += item.speed * dt * (0.9 + difficulty * 0.08);

    if (item.y > height + item.length) {
      item.y = -item.length;
      item.x = Math.random() * width;
    }
  }

  for (let i = 0; i < gridLines.length; i++) {
    const line = gridLines[i];

    line.y += line.speed * dt * (0.9 + difficulty * 0.1);

    if (line.y > height + 40) {
      line.y = -40;
    }
  }
}

function updateGame(dt, time) {
  depth += dt * (28 + difficulty * 5.5);
  difficulty = getDifficultyByDepth();
  level = getLevelByDepth();

  score += Math.floor(dt * (7 + difficulty * 2.2));

  const energyDrain = 5.1 + difficulty * 0.95 + Math.max(0, level - 8) * 0.22;
  energy -= dt * energyDrain;
  energy = clamp(energy, 0, 100);

  if (energy <= 0) {
    endGame();
    return;
  }

  updatePlayer(dt);
  updateLights(dt, time);
  updateEnemies(dt, time);
  updateBubbles(dt);
  updateParticles(dt);
  updateCurrents(dt);

  if (screenShake > 0) {
    screenShake *= 0.88;
  }

  if (damageFlash > 0) {
    damageFlash -= dt * 2.35;
  }

  scoreText.textContent = score;
  depthText.textContent = `${Math.floor(depth)}m`;
  levelText.textContent = level;

  const energyValue = Math.round(energy);
  energyPercent.textContent = `${energyValue}%`;
  energyFill.style.width = `${energyValue}%`;

  if (energy < 28) {
    energyFill.style.background = "linear-gradient(90deg, #ff406b, #ff9a5c)";
  } else {
    energyFill.style.background = "linear-gradient(90deg, #43dfff, #8ff4ff)";
  }
}

function drawBackground(time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);

  gradient.addColorStop(0, "#071a3a");
  gradient.addColorStop(0.46, "#031026");
  gradient.addColorStop(1, "#00020a");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();

  const glow = ctx.createRadialGradient(width * 0.5, height * 0.12, 0, width * 0.5, height * 0.12, width * 0.68);
  glow.addColorStop(0, "rgba(143, 244, 255, 0.28)");
  glow.addColorStop(0.42, "rgba(67, 223, 255, 0.07)");
  glow.addColorStop(1, "rgba(67, 223, 255, 0)");

  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();

  ctx.save();

  ctx.globalAlpha = 0.14;
  ctx.strokeStyle = "rgba(143, 244, 255, 0.28)";
  ctx.lineWidth = 1;

  for (let i = 0; i < gridLines.length; i++) {
    const y = gridLines[i].y;
    const perspective = 1 - y / height;
    const gap = 36 + perspective * 60;

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    for (let x = -width; x < width * 2; x += gap) {
      ctx.beginPath();
      ctx.moveTo(width * 0.5, height * 0.08);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }

  ctx.restore();

  ctx.save();

  for (let i = 0; i < currents.length; i++) {
    const item = currents[i];

    ctx.beginPath();
    ctx.strokeStyle = `rgba(143, 244, 255, ${item.alpha})`;
    ctx.lineWidth = 1;
    ctx.moveTo(item.x, item.y);
    ctx.bezierCurveTo(
      item.x + Math.sin(time + i) * item.sway,
      item.y + item.length * 0.32,
      item.x - Math.cos(time * 0.8 + i) * item.sway * 0.4,
      item.y + item.length * 0.66,
      item.x + Math.sin(time * 0.6 + i) * item.sway * 0.32,
      item.y + item.length
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawBubbles() {
  ctx.save();

  for (let i = 0; i < bubbles.length; i++) {
    const item = bubbles[i];

    ctx.globalAlpha = item.alpha;
    ctx.strokeStyle = "rgba(220, 250, 255, 0.72)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawWireCrystal(item) {
  const r = item.radius;

  const points = [
    { x: 0, y: -1.1, z: 0 },
    { x: 1, y: 0, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 0, z: -1 },
    { x: 0, y: 1.1, z: 0 }
  ];

  const edges = [
    [0, 1], [0, 2], [0, 3], [0, 4],
    [5, 1], [5, 2], [5, 3], [5, 4],
    [1, 2], [2, 3], [3, 4], [4, 1]
  ];

  const glow = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, r * 4.2);
  glow.addColorStop(0, "rgba(143, 244, 255, 0.5)");
  glow.addColorStop(0.35, "rgba(67, 223, 255, 0.14)");
  glow.addColorStop(1, "rgba(67, 223, 255, 0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(item.x, item.y, r * 4.2, 0, Math.PI * 2);
  ctx.fill();

  drawLine3D(
    points,
    edges,
    item.x,
    item.y,
    r,
    {
      x: item.rotation * 0.7,
      y: item.rotation,
      z: item.rotation * 0.2
    },
    "rgba(170, 252, 255, 0.95)",
    0.95,
    1.45
  );

  ctx.save();
  ctx.fillStyle = "rgba(235, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(item.x, item.y, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLights() {
  for (let i = 0; i < lights.length; i++) {
    drawWireCrystal(lights[i]);
  }
}

function drawWireMine(item) {
  const r = item.radius;

  const points = [
    { x: 1, y: 0, z: 0 },
    { x: -1, y: 0, z: 0 },
    { x: 0, y: 1, z: 0 },
    { x: 0, y: -1, z: 0 },
    { x: 0, y: 0, z: 1 },
    { x: 0, y: 0, z: -1 },
    { x: 1.35, y: 0, z: 0 },
    { x: -1.35, y: 0, z: 0 },
    { x: 0, y: 1.35, z: 0 },
    { x: 0, y: -1.35, z: 0 },
    { x: 0, y: 0, z: 1.35 },
    { x: 0, y: 0, z: -1.35 }
  ];

  const edges = [
    [0, 2], [2, 1], [1, 3], [3, 0],
    [0, 4], [4, 1], [1, 5], [5, 0],
    [2, 4], [4, 3], [3, 5], [5, 2],
    [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]
  ];

  let glowStrength = 0.46;
  let lineColor = "rgba(255, 91, 130, 0.95)";
  let lineWidth = 1.6;

  if (item.type === "fast") {
    glowStrength = 0.62;
    lineColor = "rgba(255, 120, 160, 1)";
    lineWidth = 1.35;
  }

  if (item.type === "wide") {
    glowStrength = 0.58;
    lineColor = "rgba(255, 70, 105, 0.98)";
    lineWidth = 1.85;
  }

  if (item.type === "sine") {
    glowStrength = 0.52;
    lineColor = "rgba(255, 95, 190, 0.96)";
    lineWidth = 1.55;
  }

  const glow = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, r * 3.4);
  glow.addColorStop(0, `rgba(255, 64, 107, ${glowStrength})`);
  glow.addColorStop(0.42, "rgba(255, 64, 107, 0.13)");
  glow.addColorStop(1, "rgba(255, 64, 107, 0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(item.x, item.y, r * 3.4, 0, Math.PI * 2);
  ctx.fill();

  drawLine3D(
    points,
    edges,
    item.x,
    item.y,
    r,
    {
      x: item.rotationX,
      y: item.rotationY,
      z: item.rotationX * 0.45
    },
    lineColor,
    0.95,
    lineWidth
  );

  ctx.save();

  if (item.type === "fast") {
    ctx.strokeStyle = "rgba(255, 205, 220, 0.72)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(item.x - r * 1.4, item.y);
    ctx.lineTo(item.x + r * 1.4, item.y);
    ctx.stroke();
  } else if (item.type === "wide") {
    ctx.strokeStyle = "rgba(255, 180, 198, 0.66)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(item.x, item.y, r * 0.55, 0, Math.PI * 2);
    ctx.stroke();
  } else if (item.type === "sine") {
    ctx.strokeStyle = "rgba(255, 190, 230, 0.68)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(item.x, item.y, r * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(item.x, item.y, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(255, 180, 198, 0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(item.x, item.y, r * 0.42, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemies() {
  for (let i = 0; i < enemies.length; i++) {
    drawWireMine(enemies[i]);
  }
}

function drawPlayer(time) {
  ctx.save();

  const flicker = player.invincible > 0 ? Math.sin(time * 32) * 0.5 + 0.5 : 1;

  const side = player.side;
  const tilt = player.tilt;
  const r = player.radius;
  const breathe = Math.sin(time * 3.6) * 1.6;
  const frontScale = 1 - Math.abs(side) * 0.32;
  const sideDepth = Math.abs(side) * 0.75;
  const sideDir = side >= 0 ? 1 : -1;

  ctx.globalAlpha = 0.45 + flicker * 0.55;

  ctx.save();

  for (let i = 0; i < player.tail.length; i++) {
    const p = player.tail[i];
    const t = i / player.tail.length;
    const alpha = p.life * 0.11;
    const rx = r * (0.36 + t * 0.95);
    const ry = r * (0.14 + t * 0.34);
    const offX = p.side * 12 * t;

    ctx.strokeStyle = `rgba(143, 244, 255, ${alpha})`;
    ctx.lineWidth = 0.9;

    ctx.beginPath();
    ctx.ellipse(
      p.x + offX,
      p.y + t * 5,
      rx,
      ry,
      p.side * 0.45,
      Math.PI * 0.08,
      Math.PI * 0.92
    );
    ctx.stroke();
  }

  ctx.restore();

  const glow = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, r * 4.8);

  glow.addColorStop(0, "rgba(143, 244, 255, 0.18)");
  glow.addColorStop(0.35, "rgba(67, 223, 255, 0.09)");
  glow.addColorStop(1, "rgba(67, 223, 255, 0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(player.x, player.y, r * 4.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(player.x, player.y);
  ctx.rotate(tilt * 0.15);

  ctx.strokeStyle = "rgba(210, 252, 255, 0.9)";
  ctx.lineWidth = 1.35;

  for (let i = 0; i < 7; i++) {
    const layer = i / 6;
    const scale = 1 - i * 0.085;
    const y = -12 + i * 4.9;
    const width3D = r * 1.24 * scale * frontScale;
    const height3D = (r * 0.3 + breathe * 0.16) * scale;
    const offsetX = side * layer * r * 0.52;

    ctx.globalAlpha = 0.92 - i * 0.08;

    ctx.beginPath();
    ctx.ellipse(
      offsetX,
      y,
      width3D,
      height3D,
      side * 0.28,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(143, 244, 255, 0.72)";
  ctx.lineWidth = 1.05;
  ctx.globalAlpha = 0.8;

  for (let i = -5; i <= 5; i++) {
    const n = i / 5;

    const topX = n * r * 1.02 * frontScale - side * r * 0.18;
    const midX = n * r * 0.64 * frontScale + sideDir * sideDepth * r * (1 - Math.abs(n) * 0.35);
    const endX = n * r * 0.34 * frontScale + side * r * 0.46;

    ctx.beginPath();
    ctx.moveTo(topX, -r * 0.58);
    ctx.bezierCurveTo(
      midX,
      -r * 0.2,
      midX * 0.72,
      r * 0.08,
      endX,
      r * 0.42
    );
    ctx.stroke();
  }

  if (Math.abs(side) > 0.06) {
    ctx.strokeStyle = "rgba(143, 244, 255, 0.36)";
    ctx.lineWidth = 0.95;
    ctx.globalAlpha = Math.abs(side) * 0.42;

    for (let i = 0; i < 4; i++) {
      const y = -8 + i * 5.6;
      const scale = 0.88 - i * 0.1;
      const backOffset = -side * r * 0.55;

      ctx.beginPath();
      ctx.ellipse(
        backOffset,
        y,
        r * 0.98 * scale * frontScale,
        r * 0.2 * scale,
        side * 0.34,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
  }

  ctx.strokeStyle = "rgba(190, 250, 255, 0.55)";
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = 0.72;

  for (let i = -3; i <= 3; i++) {
    const n = i / 3;
    const baseX = n * r * 0.52 * frontScale + side * r * 0.12;

    ctx.beginPath();
    ctx.moveTo(baseX, r * 0.1);
    ctx.quadraticCurveTo(
      baseX + sideDir * sideDepth * r * 0.32,
      r * 0.32,
      baseX * 0.55 + side * r * 0.16,
      r * 0.62
    );
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 0.85;
  ctx.globalAlpha = 0.5;

  ctx.beginPath();
  ctx.ellipse(
    0,
    -r * 0.08,
    r * 1.5 * frontScale,
    r * 0.42,
    side * 0.24,
    Math.PI * 1.08,
    Math.PI * 1.92
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    side * r * 0.18,
    r * 0.04,
    r * 1.22 * frontScale,
    r * 0.34,
    side * 0.24,
    Math.PI * 1.05,
    Math.PI * 1.86
  );
  ctx.stroke();

  ctx.strokeStyle = "rgba(143, 244, 255, 0.78)";
  ctx.lineWidth = 1.15;
  ctx.globalAlpha = 0.9;

  const tentacleCount = 9;

  for (let i = 0; i < tentacleCount; i++) {
    const spread = (i - (tentacleCount - 1) / 2) / ((tentacleCount - 1) / 2);
    const baseX = spread * r * 0.86 * frontScale + side * r * 0.14;
    const length = 46 + Math.sin(time * 2.1 + i * 0.8) * 8 + i * 2;
    const swing = Math.sin(time * 2.4 + i * 0.6) * 10 - side * 18;

    ctx.beginPath();
    ctx.moveTo(baseX, r * 0.38);
    ctx.bezierCurveTo(
      baseX + swing * 0.28,
      r * 0.88,
      baseX - swing * 0.18 + Math.sin(time * 1.7 + i) * 10,
      r * 1.45,
      baseX + swing + Math.cos(time * 1.4 + i) * 10,
      r * 0.72 + length
    );
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(220, 250, 255, 0.34)";
  ctx.lineWidth = 0.7;
  ctx.globalAlpha = 0.75;

  for (let i = 0; i < 5; i++) {
    const spread = (i - 2) / 2;
    const baseX = spread * r * 0.6 * frontScale;
    const length = 58 + i * 8 + Math.sin(time * 1.6 + i) * 6;
    const sway = Math.cos(time * 1.8 + i) * 14 - side * 10;

    ctx.beginPath();
    ctx.moveTo(baseX, r * 0.2);
    ctx.bezierCurveTo(
      baseX + sway * 0.25,
      r * 0.9,
      baseX - sway * 0.2,
      r * 1.6,
      baseX + sway,
      r * 0.9 + length
    );
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(235, 255, 255, 0.55)";
  ctx.lineWidth = 0.95;
  ctx.globalAlpha = 0.85;

  ctx.beginPath();
  ctx.moveTo(side * r * 0.08, -r * 0.32);
  ctx.quadraticCurveTo(
    side * r * 0.15,
    0,
    side * r * 0.06,
    r * 0.52
  );
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 0.9;
  ctx.globalAlpha = Math.abs(side) * 0.72;

  ctx.beginPath();
  ctx.moveTo(side >= 0 ? r * 0.82 * frontScale : -r * 0.82 * frontScale, -r * 0.42);
  ctx.bezierCurveTo(
    side >= 0 ? r * 1.05 : -r * 1.05,
    -r * 0.16,
    side >= 0 ? r * 0.9 : -r * 0.9,
    r * 0.08,
    side >= 0 ? r * 0.42 : -r * 0.42,
    r * 0.34
  );
  ctx.stroke();

  ctx.restore();
}

function drawParticles() {
  ctx.save();

  for (let i = 0; i < particles.length; i++) {
    const item = particles[i];

    if (item.color === "red") {
      ctx.fillStyle = `rgba(255, 64, 107, ${item.life})`;
    } else {
      ctx.fillStyle = `rgba(143, 244, 255, ${item.life})`;
    }

    ctx.beginPath();
    ctx.arc(item.x, item.y, item.radius * item.life, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawDamageFlash() {
  if (damageFlash <= 0) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = damageFlash * 0.23;
  ctx.fillStyle = "#ff406b";
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawDepthOverlay() {
  ctx.save();

  const alpha = clamp(depth / 1600, 0, 0.56);
  ctx.fillStyle = `rgba(0, 2, 10, ${alpha})`;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

function render(time) {
  ctx.save();

  if (screenShake > 0) {
    ctx.translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
  }

  drawBackground(time);
  drawBubbles();
  drawLights();
  drawEnemies();
  drawParticles();
  drawPlayer(time);
  drawDepthOverlay();

  ctx.restore();

  drawDamageFlash();
}

function gameLoop(timestamp) {
  if (!lastTime) {
    lastTime = timestamp;
  }

  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  const time = timestamp / 1000;

  if (gameState === "playing") {
    updateGame(dt, time);
  } else {
    updateCurrents(dt);
    updateBubbles(dt);
    updateParticles(dt);

    if (bubbles.length < 28) {
      spawnBubble();
    }

    player.x += (width / 2 - player.x) * 0.03;
    player.y += (height * 0.68 - player.y) * 0.03;
  }

  render(time);

  requestAnimationFrame(gameLoop);
}

function setTargetFromEvent(event) {
  const rect = canvas.getBoundingClientRect();

  player.targetX = clamp(event.clientX - rect.left, 32, width - 32);
  player.targetY = clamp(event.clientY - rect.top, 92, height - 92);
}

canvas.addEventListener("pointerdown", event => {
  if (gameState === "playing") {
    setTargetFromEvent(event);
  }
});

canvas.addEventListener("pointermove", event => {
  if (gameState === "playing") {
    setTargetFromEvent(event);
  }
});

canvas.addEventListener("touchmove", event => {
  event.preventDefault();
}, { passive: false });

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if (event.key === "ArrowLeft" || key === "a") keys.left = true;
  if (event.key === "ArrowRight" || key === "d") keys.right = true;
  if (event.key === "ArrowUp" || key === "w") keys.up = true;
  if (event.key === "ArrowDown" || key === "s") keys.down = true;
});

window.addEventListener("keyup", event => {
  const key = event.key.toLowerCase();

  if (event.key === "ArrowLeft" || key === "a") keys.left = false;
  if (event.key === "ArrowRight" || key === "d") keys.right = false;
  if (event.key === "ArrowUp" || key === "w") keys.up = false;
  if (event.key === "ArrowDown" || key === "s") keys.down = false;
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
requestAnimationFrame(gameLoop);