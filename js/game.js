"use strict";

// ---------- v6: Maze Minigame Overhaul (F01) ----------
const gameOverlay = document.getElementById("gameOverlay");
const gameScreen = document.getElementById("gameScreen");
const gameFoot = document.getElementById("gameFoot");
const gameCanvas = document.createElement("canvas");

// Game state
let gameOn = false;
let mazeLevel = 1;
let mazeMoves = 0;
let mazeStartTime = 0;
let mazeGrid = null;
let mazeRat = null;
let mazeCheese = null;
let mazeCrumbs = null;
let mazeSolved = false;
let optimalMoves = 0;

// Mobile controls
let joystickActive = false;
let joystickStart = { x: 0, y: 0 };
let joystickPos = { x: 0, y: 0 };
let lastMoveTime = 0;
const MOBILE_THRESHOLD = 0.3; // Minimum joystick displacement to register movement

// Cheese types
const CHEESE_TYPES = {
  "WEDGE CLASSIC": { name: "Wedge Classic", color: "#FFC53D", char: "%", sprite: "maze-wedge-classic" },
  "BLOCK CHUNK": { name: "Block Chunk", color: "#FFD700", char: "&", sprite: "maze-block-chunk" },
  "SWISS SLICE": { name: "Swiss Slice", color: "#FFE4B5", char: "$", sprite: "maze-swiss-slice" },
};

// Rat types (using existing rat definitions)
const RAT_TYPES = {
  "ALBINO BIBBLE": { name: "Albino Bibble", palette: "AMBER" },
  "SHADOW": { name: "Shadow", palette: "MONO" },
  "GHOST": { name: "Ghost", palette: "ICE" },
};

// ---------- SVG sprite drawing on the maze canvas ----------
const spriteImgCache = {};
function spriteImg(id) {
  if (!spriteImgCache[id]) {
    let svg = getSprite(id);
    if (!svg) return null;
    // give the svg root an intrinsic size so naturalWidth is reliable
    // across browsers (viewBox-only SVGs report 0/default otherwise)
    svg = svg.replace("<svg ", '<svg width="16" height="16" ');
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    // the first render happens before the data-URI image finishes loading;
    // redraw once it's ready so sprites replace the fallback circles
    img.addEventListener("load", () => { if (gameOn) renderMaze(); });
    spriteImgCache[id] = img;
  }
  return spriteImgCache[id];
}
// Draw a sprite centered in a tile; false while the image is still loading
function drawSpriteTile(ctx, id, px, py, tileSize, fill) {
  const img = spriteImg(id);
  if (!img || !img.complete || !img.naturalWidth) return false;
  const s = Math.floor(tileSize * fill);
  const off = Math.floor((tileSize - s) / 2);
  ctx.drawImage(img, px + off, py + off, s, s);
  return true;
}

// Warm the sprite image cache at load: data-URI SVGs decode in a few ms,
// long before the maze opens, so the first render draws real sprites
["maze-classic-gray"].concat(Object.values(CHEESE_TYPES).map((t) => t.sprite)).forEach(spriteImg);

// Leaderboard data (stored in localStorage)
const LEADERBOARD_KEY = "asciiRat.maze.leaderboard";
let leaderboard = [];
const mazeLeaderboardEl = document.getElementById("mazeLeaderboard");

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (raw) leaderboard = JSON.parse(raw);
  } catch (e) {}
}

function saveLeaderboard() {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
  } catch (e) {}
}

function addToLeaderboard(score, time, moves, level, date) {
  leaderboard.push({ score, time, moves, level, date });
  leaderboard.sort((a, b) => b.score - a.score);
  leaderboard = leaderboard.slice(0, 10); // Keep top 10
  saveLeaderboard();
  renderLeaderboard();
}

function calculateScore(moves, optimal, time) {
  // Score based on moves vs optimal and time
  const moveScore = Math.max(0, 100 - (moves - optimal) * 5);
  const timeScore = Math.max(0, 100 - time / 1000);
  return Math.round(moveScore * 0.7 + timeScore * 0.3);
}

// Render leaderboard
function renderLeaderboard() {
  if (!mazeLeaderboardEl) return;
  
  let html = '<div class="leaderboard-title">BEST SCORES</div>';
  
  if (leaderboard.length === 0) {
    html += '<div class="leaderboard-row"><span class="leaderboard-rank">-</span><span>No scores yet</span><span class="leaderboard-score">-</span></div>';
  } else {
    leaderboard.forEach((entry, index) => {
      const timeStr = entry.time ? entry.time.toFixed(1) + "s" : "-";
      html += `<div class="leaderboard-row">
        <span class="leaderboard-rank">#${index + 1}</span>
        <span>L${entry.level} ${entry.moves}m</span>
        <span class="leaderboard-score">${entry.score}</span>
      </div>`;
    });
  }
  
  mazeLeaderboardEl.innerHTML = html;
}

// Maze generation using recursive backtracking
function genMaze(w, h) {
  const g = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill(1)); // 1 = wall, 0 = path
  
  const stack = [[1, 1]];
  g[1][1] = 0;
  
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const dirs = [[2, 0], [-2, 0], [0, 2], [0, -2]];
    
    // Shuffle directions
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    
    let moved = false;
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && g[ny][nx] === 1) {
        g[ny][nx] = 0;
        g[y + dy / 2][x + dx / 2] = 0;
        stack.push([nx, ny]);
        moved = true;
        break;
      }
    }
    if (!moved) stack.pop();
  }
  
  return g;
}

// Calculate optimal path (BFS)
function calculateOptimalPath(grid, start, end) {
  const w = grid[0].length;
  const h = grid.length;
  const visited = new Array(h).fill(null).map(() => new Array(w).fill(false));
  const queue = [[[start.x, start.y], 0]];
  visited[start.y][start.x] = true;
  
  while (queue.length) {
    const [[x, y], dist] = queue.shift();
    if (x === end.x && y === end.y) return dist;
    
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h && grid[ny][nx] === 0 && !visited[ny][nx]) {
        visited[ny][nx] = true;
        queue.push([[nx, ny], dist + 1]);
      }
    }
  }
  return 0;
}

// Create pixel-art maze with 32x32px tiles
function createMazeCanvas(w, h) {
  const tileSize = 32;
  const canvasWidth = w * tileSize;
  const canvasHeight = h * tileSize;
  
  // Set canvas size
  gameCanvas.width = canvasWidth;
  gameCanvas.height = canvasHeight;
  gameCanvas.style.width = canvasWidth + "px";
  gameCanvas.style.height = canvasHeight + "px";
  
  const ctx = gameCanvas.getContext("2d");
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  
  // Draw maze
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cell = mazeGrid[y][x];
      
      if (cell === 1) {
        // Wall - gradated: outer █, inner ▓
        const isOuter = x === 0 || y === 0 || x === w - 1 || y === h - 1;
        ctx.fillStyle = isOuter ? "#5A5A5A" : "#3A3A3A";
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
        
        // Add wall texture
        ctx.strokeStyle = "#2A2A2A";
        ctx.lineWidth = 1;
        ctx.strokeRect(x * tileSize, y * tileSize, tileSize, tileSize);
      } else {
        // Path
        ctx.fillStyle = "#1A1A1A";
        ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      }
      
      // Draw crumbs
      if (mazeCrumbs && mazeCrumbs.has(x + "," + y)) {
        ctx.fillStyle = "#888888";
        ctx.beginPath();
        ctx.arc(
          x * tileSize + tileSize / 2,
          y * tileSize + tileSize / 2,
          tileSize / 8,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      
      // Draw rat (sprite; falls back to the classic circle while loading)
      if (mazeRat && mazeRat.x === x && mazeRat.y === y) {
        if (!drawSpriteTile(ctx, "maze-classic-gray", x * tileSize, y * tileSize, tileSize, 0.9)) {
        ctx.fillStyle = "#FFC53D";
        ctx.beginPath();
        ctx.arc(
          x * tileSize + tileSize / 2,
          y * tileSize + tileSize / 2,
          tileSize / 3,
          0,
          Math.PI * 2
        );
        ctx.fill();
        
        // Rat eyes
        ctx.fillStyle = "#000000";
        const eyeOffset = tileSize / 6;
        ctx.beginPath();
        ctx.arc(
          x * tileSize + tileSize / 2 - eyeOffset,
          y * tileSize + tileSize / 2 - eyeOffset / 2,
          tileSize / 12,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
          x * tileSize + tileSize / 2 + eyeOffset,
          y * tileSize + tileSize / 2 - eyeOffset / 2,
          tileSize / 12,
          0,
          Math.PI * 2
        );
        ctx.fill();
        }
      }
      
      // Draw cheese (sprite per cheese type; falls back to the classic circle)
      if (mazeCheese && mazeCheese.x === x && mazeCheese.y === y) {
        const cheeseType = CHEESE_TYPES[state.mazeCheeseType || "WEDGE CLASSIC"];
        if (!drawSpriteTile(ctx, cheeseType.sprite, x * tileSize, y * tileSize, tileSize, 0.85)) {
        ctx.fillStyle = cheeseType.color;
        ctx.beginPath();
        ctx.arc(
          x * tileSize + tileSize / 2,
          y * tileSize + tileSize / 2,
          tileSize / 4,
          0,
          Math.PI * 2
        );
        ctx.fill();
        
        // Cheese holes (for Swiss)
        if (state.mazeCheeseType === "SWISS SLICE") {
          ctx.fillStyle = "#F5F5DC";
          ctx.beginPath();
          ctx.arc(
            x * tileSize + tileSize / 2 - tileSize / 8,
            y * tileSize + tileSize / 2 - tileSize / 8,
            tileSize / 12,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.beginPath();
          ctx.arc(
            x * tileSize + tileSize / 2 + tileSize / 8,
            y * tileSize + tileSize / 2 + tileSize / 8,
            tileSize / 12,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        }
      }
    }
  }
  
  return gameCanvas;
}

function newMaze() {
  // Calculate maze size based on viewport
  const isMobile = 'ontouchstart' in window || window.innerWidth < 768;
  const maxWidth = isMobile ? window.innerWidth * 0.95 : window.innerWidth * 0.8;
  const maxHeight = isMobile ? window.innerHeight * 0.7 : window.innerHeight * 0.6;
  
  const tileSize = 32;
  const cols = Math.max(5, Math.min(25, Math.floor(maxWidth / tileSize)));
  const rows = Math.max(5, Math.min(15, Math.floor(maxHeight / tileSize)));
  
  // Make sure cols and rows are odd for proper maze generation
  const w = cols % 2 === 0 ? cols - 1 : cols;
  const h = rows % 2 === 0 ? rows - 1 : rows;
  
  mazeGrid = genMaze(w, h);
  mazeRat = { x: 1, y: 1 };
  mazeCheese = { x: w - 2, y: h - 2 };
  mazeCrumbs = new Set();
  mazeMoves = 0;
  mazeStartTime = performance.now();
  mazeSolved = false;
  
  // Calculate optimal path
  optimalMoves = calculateOptimalPath(mazeGrid, mazeRat, mazeCheese);

  renderMaze();
  startMazeTimer();
}

function renderMaze() {
  // Clear previous canvas if exists
  const oldCanvas = document.getElementById("mazeCanvas");
  if (oldCanvas) oldCanvas.remove();
  
  // Create new canvas (oldCanvas.remove() above already cleared the previous one;
  // gameScreen also holds the mobile joystick + direction indicator — don't wipe it)
  gameCanvas.id = "mazeCanvas";
  gameScreen.appendChild(gameCanvas);
  
  createMazeCanvas(mazeGrid[0].length, mazeGrid.length);
  
  // Update footer
  const elapsed = mazeSolved ? (performance.now() - mazeStartTime) / 1000 : 0;
  const score = mazeSolved ? calculateScore(mazeMoves, optimalMoves, elapsed * 1000) : 0;
  
  gameFoot.textContent = 
    `LEVEL ${mazeLevel} | MOVES ${mazeMoves} | OPTIMAL ${optimalMoves} | TIME ${Math.round(elapsed)}s | SCORE ${score}`;
}

function mazeMove(dx, dy) {
  if (mazeSolved) return;
  
  const nx = mazeRat.x + dx, ny = mazeRat.y + dy;
  
  if (mazeGrid[ny][nx] === 1) {
    // Wall collision - pixel scatter effect + chip-tune bonk
    playCollisionSound();
    const r = gameCanvas.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    
    for (let i = 0; i < 8; i++) {
      const d = document.createElement("div");
      const a = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 20;
      d.style.cssText = 
        "position:fixed;pointer-events:none;z-index:99;width:2px;height:2px;background:#ff4444;left:" + 
        (cx + Math.cos(a) * dist).toFixed(1) + "px;top:" + 
        (cy + Math.sin(a) * dist).toFixed(1) + "px;transition:transform .2s ease-out,opacity .2s ease-out;opacity:1;";
      document.body.appendChild(d);
      requestAnimationFrame(() => {
        d.style.transform = "translate(" + (Math.cos(a) * 40).toFixed(1) + "px," + (Math.sin(a) * 40).toFixed(1) + "px) scale(0.3)";
        d.style.opacity = "0";
      });
      setTimeout(() => d.remove(), 250);
    }
    return;
  }
  
  mazeCrumbs.add(mazeRat.x + "," + mazeRat.y);
  mazeRat = { x: nx, y: ny };
  mazeMoves++;
  playDirectionBlip(dx, dy);

  if (nx === mazeCheese.x && ny === mazeCheese.y) {
    // Level complete!
    mazeSolved = true;
    playCheeseSound();
    playLevelUpSound();
    const elapsed = (performance.now() - mazeStartTime) / 1000;
    const score = calculateScore(mazeMoves, optimalMoves, elapsed * 1000);
    
    // Add to leaderboard
    addToLeaderboard(score, elapsed, mazeMoves, mazeLevel, new Date().toISOString());

    // freeze the big time readout at the final value
    stopMazeTimer(false);
    if (mazeTimeEl) mazeTimeEl.textContent = "TIME " + Math.floor(elapsed) + "s";
    
    // Show completion message
    showNotification(`LEVEL ${mazeLevel} COMPLETE! Score: ${score}`, "success");
    
    // Advance to next level after delay
    setTimeout(() => {
      mazeLevel++;
      newMaze();
    }, 1500);
    return;
  }
  
  renderMaze();
}

// ---------- F02: big time-played readout, live during play ----------
let mazeTimeEl = null;
let mazeTimerInterval = null;
function startMazeTimer() {
  stopMazeTimer(true);
  mazeTimeEl = document.createElement("div");
  mazeTimeEl.className = "mazeTime";
  // sibling of gameScreen, in the modal flow above the maze
  gameScreen.parentNode.insertBefore(mazeTimeEl, gameScreen);
  updateMazeTimer();
  mazeTimerInterval = setInterval(updateMazeTimer, 250);
}
function updateMazeTimer() {
  if (!mazeTimeEl) return;
  mazeTimeEl.textContent = "TIME " + Math.floor((performance.now() - mazeStartTime) / 1000) + "s";
}
function stopMazeTimer(removeEl) {
  if (mazeTimerInterval) { clearInterval(mazeTimerInterval); mazeTimerInterval = null; }
  if (mazeTimeEl && removeEl) { mazeTimeEl.remove(); mazeTimeEl = null; }
}

// Mobile joystick controls
function createJoystick() {
  const joystick = document.createElement("div");
  joystick.id = "mazeJoystick";
  joystick.style.cssText = 
    "position:absolute;left:20px;bottom:20px;width:80px;height:80px;background:rgba(255,255,255,0.2);border-radius:50%;z-index:100;display:none;";
  
  const stick = document.createElement("div");
  stick.id = "mazeJoystickStick";
  stick.style.cssText = 
    "position:absolute;left:30px;top:30px;width:20px;height:20px;background:rgba(255,255,255,0.4);border-radius:50%;";
  
  joystick.appendChild(stick);
  gameScreen.appendChild(joystick);
  
  let touchId = null;
  
  joystick.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (touchId !== null) return;
    touchId = e.touches[0].identifier;
    joystickActive = true;
    const rect = joystick.getBoundingClientRect();
    joystickStart.x = rect.left + rect.width / 2;
    joystickStart.y = rect.top + rect.height / 2;
    const touch = e.touches[0];
    joystickPos.x = touch.clientX - joystickStart.x;
    joystickPos.y = touch.clientY - joystickStart.y;
    updateJoystick();
  });
  
  document.addEventListener("touchmove", (e) => {
    if (!joystickActive || touchId === null) return;
    const touch = Array.from(e.touches).find(t => t.identifier === touchId);
    if (!touch) return;
    
    joystickPos.x = touch.clientX - joystickStart.x;
    joystickPos.y = touch.clientY - joystickStart.y;
    
    // Clamp to joystick radius
    const radius = 40;
    const dist = Math.sqrt(joystickPos.x * joystickPos.x + joystickPos.y * joystickPos.y);
    if (dist > radius) {
      joystickPos.x = (joystickPos.x / dist) * radius;
      joystickPos.y = (joystickPos.y / dist) * radius;
    }
    
    updateJoystick();
    
    // Trigger movement if beyond threshold
    if (dist > radius * MOBILE_THRESHOLD) {
      const now = performance.now();
      if (now - lastMoveTime > 100) { // Throttle movement
        lastMoveTime = now;
        const dx = Math.abs(joystickPos.x) > Math.abs(joystickPos.y) ? 
          (joystickPos.x > 0 ? 1 : -1) : 0;
        const dy = Math.abs(joystickPos.y) > Math.abs(joystickPos.x) ? 
          (joystickPos.y > 0 ? 1 : -1) : 0;
        if (dx !== 0 || dy !== 0) mazeMove(dx, dy);
      }
    }
  });
  
  document.addEventListener("touchend", (e) => {
    if (Array.from(e.changedTouches).some(t => t.identifier === touchId)) {
      joystickActive = false;
      touchId = null;
      joystickPos.x = 0;
      joystickPos.y = 0;
      updateJoystick();
    }
  });
  
  document.addEventListener("touchcancel", (e) => {
    if (Array.from(e.changedTouches).some(t => t.identifier === touchId)) {
      joystickActive = false;
      touchId = null;
      joystickPos.x = 0;
      joystickPos.y = 0;
      updateJoystick();
    }
  });
}

function updateJoystick() {
  const stick = document.getElementById("mazeJoystickStick");
  if (stick) {
    stick.style.left = (40 + joystickPos.x) + "px";
    stick.style.top = (40 + joystickPos.y) + "px";
  }
}

// Direction indicator
function createDirectionIndicator() {
  const indicator = document.createElement("div");
  indicator.id = "mazeDirectionIndicator";
  indicator.style.cssText = 
    "position:absolute;top:20px;right:20px;width:60px;height:60px;z-index:100;display:none;";
  indicator.textContent = "•";
  indicator.style.fontSize = "40px";
  indicator.style.textAlign = "center";
  indicator.style.color = "var(--fg-bright)";
  gameScreen.appendChild(indicator);
  
  return indicator;
}

function updateDirectionIndicator(dx, dy) {
  const indicator = document.getElementById("mazeDirectionIndicator");
  if (!indicator) return;
  
  // Update position based on direction
  const directions = {
    "1,0": "→",
    "-1,0": "←",
    "0,1": "↓",
    "0,-1": "↑",
    "1,1": "↘",
    "1,-1": "↗",
    "-1,1": "↙",
    "-1,-1": "↖",
  };
  const key = `${dx},${dy}`;
  indicator.textContent = directions[key] || "•";
}

function openGame() {
  gameOn = true;
  gameOverlay.classList.add("show");
  gameOverlay.setAttribute("aria-hidden", "false");

  // F07: fill the screen on mobile
  gameOverlay.querySelector(".modal")?.classList.toggle("mobile-full", isMobileDevice());

  // Initialize joystick for mobile
  createJoystick();
  createDirectionIndicator();

  // Show mobile controls if on mobile
  const isMobile = isMobileDevice();
  document.getElementById("mazeJoystick").style.display = isMobile ? "block" : "none";
  document.getElementById("mazeDirectionIndicator").style.display = isMobile ? "block" : "none";
  
  newMaze();
}

function closeGame() {
  gameOn = false;
  gameOverlay.classList.remove("show");
  gameOverlay.setAttribute("aria-hidden", "true");
  stopMazeTimer(true);
  
  // Clean up mobile controls
  const joystick = document.getElementById("mazeJoystick");
  if (joystick) joystick.remove();
  const indicator = document.getElementById("mazeDirectionIndicator");
  if (indicator) indicator.remove();
}

function toggleGame() {
  if (gameOn) closeGame();
  else openGame();
}

// Handle keyboard input
document.addEventListener("keydown", (e) => {
  if (!gameOn) return;
  
  const map = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    w: [0, -1],
    s: [0, 1],
    a: [-1, 0],
    d: [1, 0],
  };
  
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (map[key]) {
    e.preventDefault();
    const [dx, dy] = map[key];
    mazeMove(dx, dy);
    updateDirectionIndicator(dx, dy);
  } else if (e.code === "Escape") {
    closeGame();
  }
});

// Make modal draggable
function makeDraggable(el) {
  let ox = 0, oy = 0, moving = false;
  el.addEventListener("mousedown", (e) => {
    if (e.target === el || e.target.classList.contains("mhead")) {
      e.preventDefault();
      ox = e.clientX - el.getBoundingClientRect().left;
      oy = e.clientY - el.getBoundingClientRect().top;
      moving = true;
      el.style.transition = "none";
    }
  });
  document.addEventListener("mousemove", (e) => {
    if (moving) {
      el.style.left = (e.clientX - ox) + "px";
      el.style.top = (e.clientY - oy) + "px";
    }
  });
  document.addEventListener("mouseup", () => {
    moving = false;
    el.style.transition = "";
  });
}

document.getElementById("gameClose").addEventListener("click", closeGame);
gameOverlay.addEventListener("click", (e) => {
  if (e.target === gameOverlay) closeGame();
});
document.querySelector("h1").addEventListener("click", toggleGame);

// Initialize leaderboard
loadLeaderboard();

// Make modal draggable
makeDraggable(document.querySelector("#gameOverlay .modal"));

// Add state defaults for maze settings
if (state.mazeCheeseType === undefined) {
  state.mazeCheeseType = "WEDGE CLASSIC";
  saveState();
}
