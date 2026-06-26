// snake.js — Logique du jeu Snake pour RetroPi Games

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const box = 16; // taille d'une case
const cols = canvas.width / box;
const rows = canvas.height / box;

let snake, direction, food, score, gameLoop, gameRunning;

function initGame() {
  snake = [{ x: 8, y: 8 }];
  direction = "RIGHT";
  score = 0;
  placeFood();
  updateScore();
  document.getElementById("gameOverModal").classList.add("hidden");
  gameRunning = true;

  if (gameLoop) clearInterval(gameLoop);
  gameLoop = setInterval(tick, 120);
}

function placeFood() {
  food = {
    x: Math.floor(Math.random() * cols),
    y: Math.floor(Math.random() * rows)
  };
  // évite que la pomme tombe sur le serpent
  if (snake.some(s => s.x === food.x && s.y === food.y)) placeFood();
}

function updateScore() {
  document.getElementById("scoreTag").textContent = "Score: " + score;
}

function tick() {
  if (!gameRunning) return;

  const head = { ...snake[0] };

  if (direction === "UP") head.y--;
  if (direction === "DOWN") head.y++;
  if (direction === "LEFT") head.x--;
  if (direction === "RIGHT") head.x++;

  // collision murs
  if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
    return gameOver();
  }

  // collision avec soi-même
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    return gameOver();
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    updateScore();
    placeFood();
  } else {
    snake.pop();
  }

  draw();
}

function draw() {
  ctx.fillStyle = "#1a0533";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // nourriture
  ctx.fillStyle = "#ff2e63";
  ctx.fillRect(food.x * box, food.y * box, box - 2, box - 2);

  // serpent
  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? "#2dd4bf" : "#1fae9c";
    ctx.fillRect(s.x * box, s.y * box, box - 2, box - 2);
  });
}

function gameOver() {
  gameRunning = false;
  clearInterval(gameLoop);
  document.getElementById("finalScore").textContent = "Score : " + score;
  document.getElementById("gameOverModal").classList.remove("hidden");

  // 👉 Ici tu pourras déclencher une Pi Ad avant de permettre de rejouer
  // ex: showPiAd().then(() => { ... });
}

// Contrôles clavier
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowUp" && direction !== "DOWN") direction = "UP";
  if (e.key === "ArrowDown" && direction !== "UP") direction = "DOWN";
  if (e.key === "ArrowLeft" && direction !== "RIGHT") direction = "LEFT";
  if (e.key === "ArrowRight" && direction !== "LEFT") direction = "RIGHT";
});

// Contrôles tactiles (mobile)
document.getElementById("up").addEventListener("click", () => { if (direction !== "DOWN") direction = "UP"; });
document.getElementById("down").addEventListener("click", () => { if (direction !== "UP") direction = "DOWN"; });
document.getElementById("left").addEventListener("click", () => { if (direction !== "RIGHT") direction = "LEFT"; });
document.getElementById("right").addEventListener("click", () => { if (direction !== "LEFT") direction = "RIGHT"; });

document.getElementById("restartBtn").addEventListener("click", initGame);
document.getElementById("modalRestart").addEventListener("click", initGame);

initGame();
