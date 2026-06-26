// arena.js — Snake Arena (style snake.io) avec bots IA — RetroPi Games

const canvas = document.getElementById("arenaCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ---------- CONFIG ----------
const WORLD_SIZE = 2500;        // taille du monde (carré)
const FOOD_COUNT = 150;
const BOT_COUNT = 6;
const SEGMENT_SIZE = 10;
const START_LENGTH = 8;
const BASE_SPEED = 2.2;
const TURN_SPEED = 0.12;

const SKIN_COLORS = ["#2dd4bf", "#ff2e63", "#fbbf24", "#a78bfa", "#34d399", "#60a5fa"];

// ---------- TALENTS (depuis le Hub) ----------
function getTalentLevels() {
  return JSON.parse(localStorage.getItem("retropi_talents") || "{}");
}
function getStats() {
  return JSON.parse(localStorage.getItem("retropi_stats") || '{"foodEaten":0,"kills":0,"gamesPlayed":0,"bestLength":0}');
}
function setStats(s) { localStorage.setItem("retropi_stats", JSON.stringify(s)); }

const talentLevels = getTalentLevels();
const speedBonus = 1 + (talentLevels.speed || 0) * 0.05;
const startSizeBonus = (talentLevels.startsize || 0);
const coinBoostBonus = 1 + (talentLevels.coinboost || 0) * 0.1;

let snakes = [];
let foods = [];
let player = null;
let running = false;
let coins = parseInt(localStorage.getItem("retropi_coins") || "0");
let bestLength = parseInt(localStorage.getItem("retropi_best") || "0");
let playerName = localStorage.getItem("retropi_name") || "";
let selectedSkin = (function() {
  const ALL_SKIN_COLORS = {
    teal: "#2dd4bf", rose: "#ff2e63", or: "#fbbf24",
    violet: "#a78bfa", vert: "#34d399", bleu: "#60a5fa",
    feu: "#f97316", legende: "#fde047"
  };
  const equippedId = localStorage.getItem("retropi_skin") || "teal";
  return ALL_SKIN_COLORS[equippedId] || SKIN_COLORS[0];
})();
let animFrame;

// ---------- UTILS ----------
function rand(min, max) { return Math.random() * (max - min) + min; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function makeSnake(isPlayer, color) {
  const startX = rand(WORLD_SIZE * 0.2, WORLD_SIZE * 0.8);
  const startY = rand(WORLD_SIZE * 0.2, WORLD_SIZE * 0.8);
  const segments = [];
  const length = isPlayer ? START_LENGTH + startSizeBonus : START_LENGTH;
  for (let i = 0; i < length; i++) {
    segments.push({ x: startX - i * SEGMENT_SIZE, y: startY });
  }
  return {
    segments,
    angle: 0,
    targetAngle: 0,
    speed: isPlayer ? BASE_SPEED * speedBonus : BASE_SPEED,
    color,
    isPlayer,
    alive: true,
    boostTimer: 0
  };
}

function spawnFood(count) {
  for (let i = 0; i < count; i++) {
    foods.push({
      x: rand(0, WORLD_SIZE),
      y: rand(0, WORLD_SIZE),
      color: SKIN_COLORS[Math.floor(rand(0, SKIN_COLORS.length))],
      r: rand(3, 5)
    });
  }
}

function initGame() {
  snakes = [];
  foods = [];

  player = makeSnake(true, selectedSkin);
  player.name = playerName || "Toi";
  snakes.push(player);

  for (let i = 0; i < BOT_COUNT; i++) {
    snakes.push(makeSnake(false, SKIN_COLORS[(i + 1) % SKIN_COLORS.length]));
  }

  spawnFood(FOOD_COUNT);

  document.getElementById("gameOverModal").classList.add("hidden");
  updateHUD();
  running = true;
}

// ---------- INPUT (souris / tactile = direction depuis le centre de l'écran) ----------
let inputX = 0, inputY = 0;

function setDirectionFromPointer(clientX, clientY) {
  inputX = clientX - canvas.width / 2;
  inputY = clientY - canvas.height / 2;
}

canvas.addEventListener("mousemove", (e) => setDirectionFromPointer(e.clientX, e.clientY));
canvas.addEventListener("touchmove", (e) => {
  const t = e.touches[0];
  setDirectionFromPointer(t.clientX, t.clientY);
}, { passive: true });

// ---------- LOGIQUE SERPENT ----------
function updatePlayerAngle() {
  if (Math.abs(inputX) > 5 || Math.abs(inputY) > 5) {
    player.targetAngle = Math.atan2(inputY, inputX);
  }
}

function updateBotAngle(bot) {
  // trouve la nourriture la plus proche
  let nearest = null;
  let nearestDist = Infinity;
  const head = bot.segments[0];

  for (const f of foods) {
    const d = dist(head, f);
    if (d < nearestDist) { nearestDist = d; nearest = f; }
  }

  if (nearest) {
    bot.targetAngle = Math.atan2(nearest.y - head.y, nearest.x - head.x);
  }

  // évite les bords du monde
  const margin = 150;
  if (head.x < margin) bot.targetAngle = 0;
  if (head.x > WORLD_SIZE - margin) bot.targetAngle = Math.PI;
  if (head.y < margin) bot.targetAngle = Math.PI / 2;
  if (head.y > WORLD_SIZE - margin) bot.targetAngle = -Math.PI / 2;
}

function moveSnake(s) {
  // tourne progressivement vers l'angle cible (évite les virages instantanés)
  let diff = s.targetAngle - s.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  s.angle += diff * TURN_SPEED;

  const head = s.segments[0];
  const newHead = {
    x: head.x + Math.cos(s.angle) * s.speed,
    y: head.y + Math.sin(s.angle) * s.speed
  };

  s.segments.unshift(newHead);
  s.segments.pop();
}

function growSnake(s, amount = 3) {
  const tail = s.segments[s.segments.length - 1];
  for (let i = 0; i < amount; i++) {
    s.segments.push({ x: tail.x, y: tail.y });
  }
}

function checkFoodCollision(s) {
  const head = s.segments[0];
  for (let i = foods.length - 1; i >= 0; i--) {
    if (dist(head, foods[i]) < SEGMENT_SIZE) {
      foods.splice(i, 1);
      growSnake(s, 3);
      if (s.isPlayer) {
        coins += 1;
        updateHUD();
        const stats = getStats();
        stats.foodEaten = (stats.foodEaten || 0) + 1;
        setStats(stats);
      }
      foods.push({
        x: rand(0, WORLD_SIZE),
        y: rand(0, WORLD_SIZE),
        color: SKIN_COLORS[Math.floor(rand(0, SKIN_COLORS.length))],
        r: rand(3, 5)
      });
    }
  }
}

function checkSnakeCollisions() {
  for (const s of snakes) {
    if (!s.alive) continue;
    const head = s.segments[0];

    // collision avec les murs du monde
    if (head.x < 0 || head.x > WORLD_SIZE || head.y < 0 || head.y > WORLD_SIZE) {
      killSnake(s);
      continue;
    }

    // collision avec un autre serpent (corps)
    for (const other of snakes) {
      if (other === s || !other.alive) continue;

      for (let i = 4; i < other.segments.length; i++) {
        if (dist(head, other.segments[i]) < SEGMENT_SIZE * 0.9) {
          // si "s" est plus grand que "other", "s" tue "other" et grossit
          if (s.segments.length > other.segments.length) {
            killSnake(other);
            growSnake(s, Math.floor(other.segments.length / 3));
            if (s.isPlayer) {
              const coinGain = Math.floor((other.segments.length / 2) * coinBoostBonus);
              coins += coinGain;
              updateHUD();
              const stats = getStats();
              stats.kills = (stats.kills || 0) + 1;
              setStats(stats);
            }
          } else {
            // sinon "s" meurt (touché par un serpent plus grand ou égal)
            killSnake(s);
          }
          break;
        }
      }
      if (!s.alive) break;
    }
  }
}

function killSnake(s) {
  s.alive = false;
  // transforme son corps en nourriture
  for (const seg of s.segments) {
    if (Math.random() < 0.5) {
      foods.push({ x: seg.x, y: seg.y, color: s.color, r: 4 });
    }
  }

  if (s.isPlayer) {
    endGame(s);
  } else {
    // respawn le bot ailleurs après un délai
    setTimeout(() => {
      const idx = snakes.indexOf(s);
      if (idx !== -1) snakes[idx] = makeSnake(false, s.color);
    }, 1500);
  }
}

function endGame(s) {
  running = false;
  const finalLength = s.segments.length;
  const earned = Math.floor((finalLength / 2) * coinBoostBonus);
  coins += earned;
  localStorage.setItem("retropi_coins", coins);

  if (finalLength > bestLength) {
    bestLength = finalLength;
    localStorage.setItem("retropi_best", bestLength);
  }

  const stats = getStats();
  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
  stats.bestLength = Math.max(stats.bestLength || 0, finalLength);
  setStats(stats);

  document.getElementById("finalScore").textContent = "Taille atteinte : " + finalLength;
  document.getElementById("coinsEarned").textContent = "Pièces gagnées : " + earned;
  document.getElementById("gameOverModal").classList.remove("hidden");

  // 👉 Ici on pourra brancher une Pi Ad avant de permettre de "revivre"
}

function updateHUD() {
  document.getElementById("coinsTag").textContent = "🪙 " + coins;
  document.getElementById("lengthTag").textContent = "Taille: " + (player ? player.segments.length : 1);
}

// ---------- DESSIN ----------
function draw() {
  ctx.fillStyle = "#0d0221";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const camX = player.segments[0].x - canvas.width / 2;
  const camY = player.segments[0].y - canvas.height / 2;

  // grille de fond légère
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  const gridSize = 50;
  for (let x = -camX % gridSize; x < canvas.width; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = -camY % gridSize; y < canvas.height; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // bords du monde
  ctx.strokeStyle = "#ff2e63";
  ctx.lineWidth = 4;
  ctx.strokeRect(-camX, -camY, WORLD_SIZE, WORLD_SIZE);
  ctx.lineWidth = 1;

  // nourriture
  for (const f of foods) {
    const sx = f.x - camX, sy = f.y - camY;
    if (sx < -20 || sx > canvas.width + 20 || sy < -20 || sy > canvas.height + 20) continue;
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.arc(sx, sy, f.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // serpents
  for (const s of snakes) {
    if (!s.alive) continue;
    for (let i = s.segments.length - 1; i >= 0; i--) {
      const seg = s.segments[i];
      const sx = seg.x - camX, sy = seg.y - camY;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(sx, sy, SEGMENT_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ---------- BOUCLE PRINCIPALE ----------
function loop() {
  if (running) {
    updatePlayerAngle();
    for (const s of snakes) {
      if (!s.alive) continue;
      if (!s.isPlayer) updateBotAngle(s);
      moveSnake(s);
      checkFoodCollision(s);
    }
    checkSnakeCollisions();
    updateHUD();
    draw();
  }
  animFrame = requestAnimationFrame(loop);
}

// ---------- BOUTONS ----------
document.getElementById("startBtn").addEventListener("click", () => {
  playerName = document.getElementById("nameInput").value.trim() || "Toi";
  localStorage.setItem("retropi_name", playerName);
  document.getElementById("startScreen").classList.add("hidden");
  initGame();
});

document.getElementById("restartBtn").addEventListener("click", () => {
  document.getElementById("gameOverModal").classList.add("hidden");
  document.getElementById("startScreen").classList.remove("hidden");
  setupStartScreen();
});

function setupStartScreen() {
  document.getElementById("nameInput").value = playerName;
  document.getElementById("statCoins").textContent = coins;
  document.getElementById("statBest").textContent = bestLength;
  document.getElementById("statSpeed").textContent = "Normal";

  const ALL_SKIN_COLORS = {
    teal: "#2dd4bf", rose: "#ff2e63", or: "#fbbf24",
    violet: "#a78bfa", vert: "#34d399", bleu: "#60a5fa",
    feu: "#f97316", legende: "#fde047"
  };
  const ownedIds = JSON.parse(localStorage.getItem("retropi_owned_skins") || '["teal"]');

  const skinRow = document.getElementById("skinRow");
  skinRow.innerHTML = "";
  ownedIds.forEach((id) => {
    const color = ALL_SKIN_COLORS[id] || "#2dd4bf";
    const dot = document.createElement("div");
    dot.className = "skin-dot" + (color === selectedSkin ? " selected" : "");
    dot.style.background = color;
    dot.addEventListener("click", () => {
      selectedSkin = color;
      drawPreview();
      document.querySelectorAll(".skin-dot").forEach(d => d.classList.remove("selected"));
      dot.classList.add("selected");
    });
    skinRow.appendChild(dot);
  });

  drawPreview();
}

function drawPreview() {
  const pc = document.getElementById("previewCanvas");
  const pctx = pc.getContext("2d");
  pctx.clearRect(0, 0, pc.width, pc.height);
  for (let i = 0; i < 8; i++) {
    pctx.fillStyle = selectedSkin;
    pctx.beginPath();
    pctx.arc(20 + i * 12, 30 + Math.sin(i * 0.6) * 6, 7, 0, Math.PI * 2);
    pctx.fill();
  }
}

setupStartScreen();
updateHUD();
loop();
