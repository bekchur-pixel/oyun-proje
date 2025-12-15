const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const previewCanvas = document.getElementById("preview");
const pctx = previewCanvas.getContext("2d");

const scoreEl = document.getElementById("score-value");
const linesEl = document.getElementById("lines-value");
const levelEl = document.getElementById("level-value");
const statusEl = document.getElementById("status-text");

const COLS = 10;
const ROWS = 20;
const CELL = 30;

const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [1, 1, 1],
    [0, 1, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
};

const COLORS = {
  I: "#06b6d4",
  O: "#facc15",
  T: "#a855f7",
  S: "#22c55e",
  Z: "#ef4444",
  J: "#3b82f6",
  L: "#f97316",
};

let board = [];
let current = null;
let next = null;
let score = 0;
let lines = 0;
let level = 1;
let dropTimer = null;
let paused = false;
let gameOver = false;

function cloneShape(shape) {
  return shape.map((row) => [...row]);
}

function randomPiece() {
  const keys = Object.keys(SHAPES);
  const key = keys[Math.floor(Math.random() * keys.length)];
  return {
    shape: cloneShape(SHAPES[key]),
    color: COLORS[key],
    x: 0,
    y: 0,
  };
}

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function resetGame() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  next = randomPiece();
  spawnPiece();
  updateHud();
  setStatus("Oynuyor", "active");
  startLoop();
  draw();
}

function spawnPiece() {
  current = next;
  current.x = Math.floor(COLS / 2 - current.shape[0].length / 2);
  current.y = 0;
  next = randomPiece();
  if (collides(current.shape, current.x, current.y)) {
    endGame();
  }
  updatePreview();
}

function collides(shape, offsetX, offsetY) {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (!shape[y][x]) continue;
      const newX = offsetX + x;
      const newY = offsetY + y;
      if (newX < 0 || newX >= COLS || newY >= ROWS) {
        return true;
      }
      if (newY >= 0 && board[newY][newX]) {
        return true;
      }
    }
  }
  return false;
}

function tryMove(dx, dy) {
  const newX = current.x + dx;
  const newY = current.y + dy;
  if (!collides(current.shape, newX, newY)) {
    current.x = newX;
    current.y = newY;
    draw();
    return true;
  }
  if (dy > 0) {
    lockPiece();
  }
  return false;
}

function lockPiece() {
  const shape = current.shape;
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        const bx = current.x + x;
        const by = current.y + y;
        if (by >= 0 && by < ROWS) {
          board[by][bx] = current.color;
        }
      }
    }
  }
  const cleared = clearLines();
  score += scoreForLines(cleared);
  lines += cleared;
  level = 1 + Math.floor(lines / 10);
  spawnPiece();
  updateHud();
  restartLoop();
}

function clearLines() {
  let cleared = 0;
  const newBoard = [];
  for (const row of board) {
    if (row.every((cell) => cell)) {
      cleared += 1;
    } else {
      newBoard.push(row);
    }
  }
  while (newBoard.length < ROWS) {
    newBoard.unshift(Array(COLS).fill(null));
  }
  board = newBoard;
  return cleared;
}

function scoreForLines(count) {
  const table = { 0: 0, 1: 100, 2: 300, 3: 500, 4: 800 };
  return (table[count] || 0) * level;
}

function rotate(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      rotated[x][rows - y - 1] = shape[y][x];
    }
  }
  return rotated;
}

function tryRotate() {
  const rotated = rotate(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const offset of kicks) {
    const newX = current.x + offset;
    if (!collides(rotated, newX, current.y)) {
      current.shape = rotated;
      current.x = newX;
      draw();
      return;
    }
  }
}

function hardDrop() {
  while (tryMove(0, 1)) {
    // keep dropping until lock
  }
}

function dropDelay() {
  return Math.max(120, 800 - (level - 1) * 50);
}

function step() {
  if (paused || gameOver) return;
  tryMove(0, 1);
}

function startLoop() {
  stopLoop();
  dropTimer = setInterval(step, dropDelay());
}

function restartLoop() {
  startLoop();
}

function stopLoop() {
  if (dropTimer) {
    clearInterval(dropTimer);
    dropTimer = null;
  }
}

function drawCell(context, x, y, color, size = CELL) {
  const pad = 2;
  context.fillStyle = color;
  context.fillRect(x * size + pad, y * size + pad, size - pad * 2, size - pad * 2);
}

function drawGrid() {
  ctx.strokeStyle = "#1f2937";
  ctx.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, ROWS * CELL);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(COLS * CELL, y * CELL);
    ctx.stroke();
  }
}

function drawBoard() {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (board[y][x]) {
        drawCell(ctx, x, y, board[y][x]);
      }
    }
  }
}

function drawCurrent() {
  if (!current) return;
  for (let y = 0; y < current.shape.length; y++) {
    for (let x = 0; x < current.shape[y].length; x++) {
      if (current.shape[y][x]) {
        drawCell(ctx, current.x + x, current.y + y, current.color);
      }
    }
  }
}

function drawPreview() {
  pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
  pctx.fillStyle = "#0b1224";
  pctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
  pctx.strokeStyle = "#1f2937";
  pctx.strokeRect(0.5, 0.5, previewCanvas.width - 1, previewCanvas.height - 1);
  const shape = next.shape;
  const offsetX = Math.floor((4 - shape[0].length) / 2) + 1;
  const offsetY = Math.floor((4 - shape.length) / 2) + 1;
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x]) {
        drawCell(pctx, offsetX + x, offsetY + y, next.color, 20);
      }
    }
  }
}

function drawOverlay(text) {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#e5e7eb";
  ctx.font = "bold 20px Segoe UI, Arial";
  ctx.textAlign = "center";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function draw() {
  ctx.fillStyle = "#0b1224";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawBoard();
  drawCurrent();
  if (gameOver) {
    drawOverlay("Oyun bitti - R ile yeniden baslat");
  } else if (paused) {
    drawOverlay("Duraklatildi - P ile devam et");
  }
}

function updateHud() {
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function setStatus(text, variant = "active") {
  statusEl.textContent = text;
  statusEl.style.background =
    variant === "alert" ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.12)";
  statusEl.style.color = variant === "alert" ? "#fecdd3" : "#bbf7d0";
  statusEl.style.border =
    variant === "alert"
      ? "1px solid rgba(239, 68, 68, 0.35)"
      : "1px solid rgba(34, 197, 94, 0.35)";
}

function endGame() {
  gameOver = true;
  stopLoop();
  setStatus("Oyun bitti", "alert");
  draw();
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  setStatus(paused ? "Duraklatildi" : "Oynuyor", paused ? "alert" : "active");
  if (!paused) {
    restartLoop();
  } else {
    stopLoop();
  }
  draw();
}

function handleKeydown(e) {
  const handled = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space", "KeyP", "KeyR"];
  if (handled.includes(e.code)) {
    e.preventDefault();
  }
  if (gameOver && e.code !== "KeyR") return;
  switch (e.code) {
    case "ArrowLeft":
      if (!paused) tryMove(-1, 0);
      break;
    case "ArrowRight":
      if (!paused) tryMove(1, 0);
      break;
    case "ArrowDown":
      if (!paused) tryMove(0, 1);
      break;
    case "ArrowUp":
      if (!paused) tryRotate();
      break;
    case "Space":
      if (!paused) hardDrop();
      break;
    case "KeyP":
      togglePause();
      break;
    case "KeyR":
      resetGame();
      break;
    default:
      break;
  }
}

document.addEventListener("keydown", handleKeydown);

function init() {
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;
  resetGame();
  drawPreview();
}

init();
