"use strict";

// ---------- v5: rat maze easter egg (title click or press M) ----------
const gameOverlay = document.getElementById("gameOverlay");
const gameScreen = document.getElementById("gameScreen");
const gameFoot = document.getElementById("gameFoot");
let gameOn = false, mazeLevel = 1, mazeMoves = 0;
let mazeGrid = null, mazeRat = null, mazeCheese = null, mazeCrumbs = null;

function genMaze(w, h) {
  const g = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill("#"));
  const stack = [[1, 1]];
  g[1][1] = ".";
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    let moved = false;
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && g[ny][nx] === "#") {
        g[ny][nx] = ".";
        g[y + dy / 2][x + dx / 2] = ".";
        stack.push([nx, ny]);
        moved = true;
        break;
      }
    }
    if (!moved) stack.pop();
  }
  return g;
}
function newMaze() {
  const w = Math.min(27, 11 + mazeLevel * 4);
  const h = Math.min(13, 7 + mazeLevel * 2);
  mazeGrid = genMaze(w, h);
  mazeRat = { x: 1, y: 1 };
  mazeCheese = { x: w - 2, y: h - 2 };
  mazeCrumbs = new Set();
  mazeMoves = 0;
  renderMaze();
}
function renderMaze() {
  let out = "";
  for (let y = 0; y < mazeGrid.length; y++) {
    let row = "";
    for (let x = 0; x < mazeGrid[0].length; x++) {
      if (mazeRat.x === x && mazeRat.y === y) row += "@";
      else if (mazeCheese.x === x && mazeCheese.y === y) row += "%";
      else if (mazeCrumbs.has(x + "," + y)) row += ".";
      else row += mazeGrid[y][x];
    }
    out += row + "\n";
  }
  gameScreen.textContent = out;
  gameFoot.textContent =
    "LEVEL " + mazeLevel + " - MOVES " + mazeMoves + " - ARROWS OR WASD - EAT THE %";
}
function mazeMove(dx, dy) {
  const nx = mazeRat.x + dx, ny = mazeRat.y + dy;
  if (mazeGrid[ny][nx] === "#") return;
  mazeCrumbs.add(mazeRat.x + "," + mazeRat.y);
  mazeRat = { x: nx, y: ny };
  mazeMoves++;
  if (nx === mazeCheese.x && ny === mazeCheese.y) {
    mazeLevel++;
    newMaze();
    return;
  }
  renderMaze();
}
function openGame() {
  gameOn = true;
  gameOverlay.classList.add("show");
  gameOverlay.setAttribute("aria-hidden", "false");
  newMaze();
}
function closeGame() {
  gameOn = false;
  gameOverlay.classList.remove("show");
  gameOverlay.setAttribute("aria-hidden", "true");
}
function toggleGame() {
  if (gameOn) closeGame();
  else openGame();
}
document.getElementById("gameClose").addEventListener("click", closeGame);
gameOverlay.addEventListener("click", (e) => {
  if (e.target === gameOverlay) closeGame();
});
document.querySelector("h1").addEventListener("click", toggleGame);
makeDraggable(document.querySelector("#gameOverlay .modal"));
