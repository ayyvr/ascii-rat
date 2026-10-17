"use strict";

// ---------- persisted state (remembered between loads) ----------
const SAVE_KEY = "asciiRat.v4";
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};
const DEFAULTS = {
  setupDone: false,
  ramp: "GLYPH",
  motion: "SPIN",
  palette: "PHOSPHOR",
  party: false,
  rat: { bodyLen: 1, bodyChunk: 1, headSize: 1, earSize: 1, snoutLen: 1, eyeSize: 1, legLen: 1, tailLen: 1, tailCurl: 1, whiskerLen: 1 },
  spin: 0.55,
  momentum: true,
  glide: 1.2,
  smoothZoom: true,
  zoomSpeed: 1,
  glow: true, // legacy v4 key
  cursor: "PIXEL DOTS",
  entrance: "MATERIALIZE",
  bg: "CLASSIC",
  fps: false,
  fx: true,
  density: 1,
  halloween: false,
};
let state = JSON.parse(JSON.stringify(DEFAULTS));
(function loadState() {
  try {
    const raw = store.get(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      state = Object.assign(state, s, { rat: Object.assign({}, DEFAULTS.rat, s.rat || {}) });
    }
  } catch (e) {}
})();
function saveState() {
  store.set(SAVE_KEY, JSON.stringify(state));
}

// ---------- v5: rat share codes (link carries ONLY the rat) ----------
const RAT_DEFS = [
  { k: "bodyLen", label: "BODY LENGTH", min: 0.6, max: 1.5 },
  { k: "bodyChunk", label: "CHUNKINESS", min: 0.6, max: 1.5 },
  { k: "headSize", label: "HEAD SIZE", min: 0.5, max: 1.6 },
  { k: "earSize", label: "EAR SIZE", min: 0.4, max: 2 },
  { k: "snoutLen", label: "SNOUT LENGTH", min: 0.4, max: 1.8 },
  { k: "eyeSize", label: "EYE SIZE", min: 0.5, max: 2 },
  { k: "legLen", label: "LEG LENGTH", min: 0.5, max: 1.6 },
  { k: "tailLen", label: "TAIL LENGTH", min: 0.4, max: 1.8 },
  { k: "tailCurl", label: "TAIL CURL", min: 0.2, max: 2 },
  { k: "whiskerLen", label: "WHISKER REACH", min: 0.3, max: 2 },
];
const RAT_WORDS = {
  bodyLen: ["stubby", "squat", "compact", "standard", "sleek", "long", "noodle"],
  bodyChunk: ["scrawny", "slim", "trim", "standard", "sturdy", "chunky", "chonk"],
  headSize: ["pin", "pea", "petite", "standard", "large", "big", "mega"],
  earSize: ["nub", "tiny", "alert", "standard", "big", "satellite", "radar"],
  snoutLen: ["pug", "snub", "short", "standard", "pointed", "proboscis", "anteater"],
  eyeSize: ["beady", "bead", "small", "standard", "wide", "goggled", "owl"],
  legLen: ["stump", "lowrider", "short", "standard", "leggy", "stilt", "giraffe"],
  tailLen: ["bobtail", "stub", "short", "standard", "long", "whip", "rope"],
  tailCurl: ["straight", "lazy", "loose", "wavy", "curly", "corkscrew", "spring"],
  whiskerLen: ["tidy", "short", "neat", "standard", "long", "luxurious", "catfish"],
};
const isOctober = new Date().getMonth() === 9;
function ratCode() {
  return RAT_DEFS.map((d) => {
    const f = (state.rat[d.k] - d.min) / (d.max - d.min);
    const i = Math.max(0, Math.min(6, Math.round(f * 6)));
    return RAT_WORDS[d.k][i];
  }).join("-");
}
function applyRatCode(code) {
  const words = code.toLowerCase().split("-");
  if (words.length !== RAT_DEFS.length) return false;
  let n = 0;
  RAT_DEFS.forEach((d, i) => {
    const idx = RAT_WORDS[d.k].indexOf(words[i]);
    if (idx < 0) return;
    state.rat[d.k] = d.min + (idx / 6) * (d.max - d.min);
    n++;
  });
  return n > 0;
}
(function loadSharedRat() {
  let code = null;
  try { code = new URLSearchParams(location.search).get("rat"); } catch (e) {}
  if (!code && location.hash) {
    const m = location.hash.match(/rat=([A-Za-z0-9-]+)/);
    if (m) code = m[1];
  }
  if (code && applyRatCode(code)) saveState();
})();



// ---------- character ramps (light -> dense); preset-pickable in Settings ----------
const RAMPS = {
  MINIMAL: " .:-",
  CLASSIC: " .:-=+*#%@",
  GLYPH: " .':^\"~+-=!*#%$@",
  BLOCKS: " .:\u2591\u2592\u2593\u2588",
};
let ramp = RAMPS.GLYPH;
const shadeChar = (s) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(s * (ramp.length - 1))))];

// ---------- 3D point cloud of a rat (faces +X, up is +Y, viewer is +Z) ----------
const pts = []; // {x,y,z, nx,ny,nz, f?} f = forced shade

const rand = (a, b) => a + Math.random() * (b - a);

function ellipsoid(cx, cy, cz, rx, ry, rz, n, opts = {}) {
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 * Math.PI;
    const v = Math.acos(rand(-1, 1));
    const dx = Math.sin(v) * Math.cos(u);
    const dy = Math.cos(v);
    const dz = Math.sin(v) * Math.sin(u);
    let nx = dx / rx, ny = dy / ry, nz = dz / rz;
    const nl = Math.hypot(nx, ny, nz) || 1;
    pts.push({
      x: cx + dx * rx, y: cy + dy * ry, z: cz + dz * rz,
      nx: nx / nl, ny: ny / nl, nz: nz / nl,
      f: opts.force,
      tag: opts.tag,
    });
  }
}

// ---------- rat construction: fully parametric (character creation) ----------
function buildRat(p) {
  pts.length = 0;
  const D = state.density;
  const n = (base) => Math.max(6, Math.round(base * D));
  const chunk = p.bodyChunk, len = p.bodyLen;
  const bodyRx = 1.55 * len, bodyRy = 0.95 * chunk, bodyRz = 0.85 * chunk;
  const hs = p.headSize;
  const headX = bodyRx + 0.35 * hs, headY = 0.28;

  // Body: plump ellipsoid, slightly tapered rear
  ellipsoid(0, 0, 0, bodyRx, bodyRy, bodyRz, n(2600));
  ellipsoid(-1.0 * len, 0.05, 0, 1.15 * len, 0.8 * chunk, 0.72 * chunk, n(1100));

  // Head + cheeks
  ellipsoid(headX, headY, 0, 0.72 * hs, 0.6 * hs, 0.6 * hs, n(1300));
  ellipsoid(headX + 0.25 * hs, 0.1, 0, 0.45 * hs, 0.4 * hs, 0.42 * hs, n(350));

  // Snout: cone from head to nose tip
  (function snout() {
    const baseX = headX + 0.25 * hs, baseY = 0.18 * hs;
    const tipX = baseX + 0.8 * p.snoutLen * hs, tipY = 0.02;
    const segs = 12, ring = 14;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const cx = baseX + (tipX - baseX) * t;
      const cy = baseY + (tipY - baseY) * t;
      const r = (0.34 * (1 - t) * (1 - t) + 0.03) * hs;
      for (let j = 0; j < ring; j++) {
        const a = (j / ring) * Math.PI * 2 + t * 2;
        const dz = Math.cos(a) * r, dy = Math.sin(a) * r;
        const nl = Math.hypot(1, dy, dz) || 1;
        pts.push({ x: cx, y: cy + dy, z: dz, nx: 1 / nl, ny: dy / nl, nz: dz / nl });
      }
    }
    // nose
    ellipsoid(tipX + 0.02, tipY, 0, 0.07 * hs, 0.06 * hs, 0.06 * hs, n(26), { force: 1 });
  })();

  // Ears: thin discs, slightly cupped forward
  for (const side of [-1, 1]) {
    ellipsoid(headX - 0.05 * hs, headY + 0.64 * hs, side * 0.48 * hs,
      0.16 * p.earSize, 0.34 * p.earSize, 0.1 * p.earSize, n(210));
    ellipsoid(headX - 0.05 * hs, headY + 0.64 * hs, side * 0.52 * hs,
      0.2 * p.earSize, 0.4 * p.earSize, 0.06 * p.earSize, n(90));
  }

  // Eyes
  for (const side of [-1, 1]) {
    ellipsoid(headX + 0.38 * hs, headY + 0.14 * hs, side * 0.38 * hs,
      0.1 * p.eyeSize, 0.11 * p.eyeSize, 0.1 * p.eyeSize, n(24), { force: 0.95 });
  }

  // Legs (tagged FL/FR/BL/BR so WALK can animate the gait)
  const legRy = 0.55 * p.legLen;
  const legCy = -(0.4 * chunk + legRy);
  for (const [lx, fb] of [[0.75 * bodyRx, "F"], [-0.6 * bodyRx, "B"]]) {
    for (const side of [-1, 1]) {
      const tag = fb + (side < 0 ? "L" : "R");
      ellipsoid(lx, legCy, side * 0.48 * chunk, 0.15, legRy, 0.15, n(170), { tag });
      ellipsoid(lx + 0.12, legCy - legRy + 0.09, side * 0.48 * chunk,
        0.16, 0.09, 0.13, n(60), { tag }); // foot
    }
  }

  // Tail: long, tapering, with a curl set by TAIL CURL
  (function tail() {
    const segs = 90, ring = 9;
    const x0 = -1.45 * len, span = 2.9 * p.tailLen, curl = p.tailCurl;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = x0 - span * t;
      const y = -0.35 * chunk + 0.15 * curl * Math.sin(t * 2.2) + 1.35 * curl * t * t - 0.35 * t;
      const z = 0.28 * Math.sin(t * 4.5) * (1 - t * 0.4);
      const r = (0.13 * (1 - t) + 0.025) * chunk;
      for (let j = 0; j < ring; j++) {
        const a = (j / ring) * Math.PI * 2 + t * 3;
        const dy = Math.cos(a) * r, dz = Math.sin(a) * r;
        const nl = Math.hypot(dy, dz) || 1;
        pts.push({ x, y: y + dy, z: z + dz, nx: 0, ny: dy / nl, nz: dz / nl });
      }
    }
  })();

  // Whiskers
  const whiskX = headX + 0.25 * hs + 0.8 * p.snoutLen * hs - 0.15;
  for (const side of [-1, 1]) {
    for (let w = 0; w < 3; w++) {
      const spread = (0.22 + w * 0.2) * p.whiskerLen;
      const droop = 0.05 - w * 0.08;
      for (let k = 0; k <= 14; k++) {
        const t = k / 14;
        pts.push({
          x: whiskX + 1.1 * p.whiskerLen * t,
          y: 0.12 + droop * t,
          z: side * (0.15 + spread * t),
          nx: 0, ny: 1, nz: side * 0.6,
        });
      }
    }
  }

  // staggered birth offsets drive the entrance animations
  for (let i = 0; i < pts.length; i++) pts[i].b = Math.random();
}
buildRat(state.rat);



// ---------- render setup ----------
const COLS = 120, ROWS = 34;
const CHAR_ASPECT = 1 / 0.6; // char cell height / width in a typical monospace font
const pre = document.getElementById("screen");
const grid = new Float32Array(COLS * ROWS);   // depth buffer
const chars = new Array(COLS * ROWS).fill(" ");

const LIGHT = (() => {
  const l = [-0.45, 0.75, 0.6];
  const n = Math.hypot(...l);
  return l.map(v => v / n);
})();

let theta = 0.55;          // yaw
let pitch = 0.12;          // tilt
let zoom = 1;              // eased toward zoomTarget when smooth zoom is on
let zoomTarget = 1;
let spinOn = true;
let velH = state.spin, velV = 0; // effective angular velocities (rad/s)
let motion = state.motion;
let entranceT = -1;   // timestamp while an entrance animation plays
let last = performance.now();

// ---------- interaction ----------
let dragging = false, px = 0, py = 0, lastMoveT = 0;
let dragVelH = 0, dragVelV = 0;          // smoothed angular velocity while dragging (rad/s)
let releaseT = -1, releaseFromH = 0, releaseFromV = 0;

pre.addEventListener("pointerdown", e => {
  dragging = true;
  px = e.clientX; py = e.clientY; lastMoveT = performance.now();
  dragVelH = 0; dragVelV = 0; releaseT = -1;
  entranceT = -1; // grabbing the rat skips any entrance ceremony
  pre.setPointerCapture(e.pointerId);
});
pre.addEventListener("pointermove", e => {
  if (!dragging) return;
  const now = performance.now();
  const dts = Math.max(0.008, (now - lastMoveT) / 1000);
  const dh = (e.clientX - px) * 0.008;
  const dv = (e.clientY - py) * 0.006;
  theta += dh;
  pitch = Math.max(-0.9, Math.min(0.9, pitch + dv));
  dragVelH = 0.72 * dragVelH + 0.28 * (dh / dts);
  dragVelV = 0.72 * dragVelV + 0.28 * (dv / dts);
  px = e.clientX; py = e.clientY; lastMoveT = now;
});
const endDrag = () => {
  if (!dragging) return;
  dragging = false;
  // hand off: keep the fling going, easing back to cruise over the glide window
  if (!state.momentum) { releaseT = -1; return; }
  releaseT = performance.now();
  releaseFromH = dragVelH;
  releaseFromV = dragVelV;
};
pre.addEventListener("pointerup", endDrag);
pre.addEventListener("pointercancel", endDrag);
addEventListener("wheel", e => {
  if (document.getElementById("overlay").classList.contains("show") ||
      document.getElementById("setOverlay").classList.contains("show") ||
      document.getElementById("createOverlay").classList.contains("show") ||
      document.getElementById("gameOverlay").classList.contains("show")) return;
  e.preventDefault();
  const f = Math.pow(e.deltaY > 0 ? 0.92 : 1.08, state.zoomSpeed);
  zoomTarget = Math.max(0.6, Math.min(2.2, zoomTarget * f));
  if (!state.smoothZoom) zoom = zoomTarget;
}, { passive: false });
addEventListener("keydown", e => {
  if (gameOn) {
    const k = e.key.toLowerCase();
    const map = {
      arrowup: [0, -1], w: [0, -1],
      arrowdown: [0, 1], s: [0, 1],
      arrowleft: [-1, 0], a: [-1, 0],
      arrowright: [1, 0], d: [1, 0],
    };
    if (map[k]) { e.preventDefault(); mazeMove(map[k][0], map[k][1]); }
    else if (e.code === "Escape") closeGame();
    return;
  }
  if (e.code === "Space") { e.preventDefault(); spinOn = !spinOn; }
  else if (e.code === "KeyP") toggleParty();
  else if (e.code === "KeyL") toggleLog();
  else if (e.code === "KeyS") toggleSettings();
  else if (e.code === "KeyW") toggleZen();
  else if (e.code === "KeyM") toggleGame();
  else if (e.code === "Escape") { closeLog(); closeSettings(); closeGame(); }
});

// fit to viewport
function fit() {
  const fw = (innerWidth * 0.95) / (COLS * 0.6);
  const fh = (innerHeight * 0.78) / ROWS;
  pre.style.fontSize = Math.max(6, Math.floor(Math.min(fw, fh))) + "px";
}
addEventListener("resize", fit);
fit();

// ---------- party mode ----------
const partyBtn = document.getElementById("partyBtn");
const readout = document.getElementById("readout");
let party = state.party, partyHue = 120;

function toggleParty() {
  state.party = !state.party;
  party = state.party;
  partyBtn.classList.toggle("on", party);
  document.body.classList.toggle("party", party);
  saveState();
}
partyBtn.addEventListener("click", toggleParty);



// ---------- the Rat-Slop Log ----------
const overlay = document.getElementById("overlay");
const mbodyEl = document.getElementById("mbody");
const segCvs = [
  document.getElementById("majCv"),
  document.getElementById("minCv"),
  document.getElementById("patCv"),
];
const segBtns = [
  [document.getElementById("majUp"), document.getElementById("majDn")],
  [document.getElementById("minUp"), document.getElementById("minDn")],
  [document.getElementById("patUp"), document.getElementById("patDn")],
];

const CHANGELOG = [
  {
    tag: "v1.0.0",
    name: "FIRST SCURRY",
    entries: [
      { s: "major", text: "The rat debuts: ~7,000 shaded surface points - body, snout, ears, whiskers, tail, attitude" },
      { s: "medium", text: "Grab-and-spin controls: drag to rotate and tilt, scroll to zoom, Space to freeze" },
      { s: "minor", text: "CRT scanlines, phosphor glow and vignette for that 3am-terminal mood" },
    ],
  },
  {
    tag: "v2.0.0",
    name: "PARTY RAT",
    entries: [
      { s: "major", text: "PARTY MODE: rainbow hue waves ripple down the rat while it bobs to the beat (press P)" },
      { s: "major", text: "The Rat-Slop Log: this changelog, tabbed by release in a graceful centered modal (press L)" },
      { s: "medium", text: "Momentum hands-off: release a spin and velocity keeps adjusting for 1.2s on a smoothstep curve back to cruise" },
      { s: "medium", text: "Live orientation readout: horizontal + vertical degrees tick below the rat as it turns" },
      { s: "minor", text: "Severity-coded log bullets: gold >> major, green > medium, cyan ~ minor" },
    ],
  },
  {
    tag: "v3.0.0",
    name: "PEST CONTROL",
    entries: [
      { s: "major", text: "SETTINGS panel (press S): character ramps, idle motion modes and palette swatches under one roof" },
      { s: "major", text: "WALLPAPER MODE (press W): every scrap of UI fades away - just you, the rat, and your desktop" },
      { s: "medium", text: "Six idle motions: SPIN, WAVE jelly, SCUTTLE hop, TUMBLE, ORBIT drift, BREATH loom" },
      { s: "medium", text: "Six palettes (PHOSPHOR, AMBER, ICE, VAPOR, BLOOD, MONO) - colors shown in the swatch, name on hover" },
      { s: "minor", text: "Four character ramps, from MINIMAL dots to solid BLOCKS, for adjustable rat resolution" },
    ],
  },
  {
    tag: "v4.0.0",
    name: "RAT BUILDER",
    entries: [
      { s: "major", text: "Character creation: first visit opens the RAT BUILDER - live sliders sculpt body, head, snout, ears, eyes, legs, tail and whiskers before you ever see the UI" },
      { s: "major", text: "Everything remembered between loads: your rat, palette, motion, ramp and every setting persist via local save" },
      { s: "major", text: "Settings re-organized into category tabs: RAT, ANIMATION, STYLE, PREFERENCES, PERFORMANCE" },
      { s: "medium", text: "New WALK animation: diagonal-gait leg pumps with body bob - plus a description under every motion option" },
      { s: "medium", text: "Modals are draggable by their headers - park them anywhere and watch the rat react to your tweaks" },
      { s: "medium", text: "Cursor glow: palette-tinted light trailing the pointer, flaring over the rat, buttons and sliders (default on)" },
      { s: "medium", text: "Sliders & toggles: spin speed, momentum release + glide window, smooth zoom + zoom speed, point density" },
      { s: "minor", text: "FPS counter toggle in PERFORMANCE (default off) and phosphor FX toggle for glow-free low-end rigs" },
    ],
  },
  {
    tag: "v4.1.0",
    name: "PIXEL PATCH",
    entries: [
      { s: "major", text: "RAT BUILDER gets its own pixel preview: a dotted silhouette canvas inside the modal - the main stage stays hidden until you press RELEASE THE RAT" },
      { s: "major", text: "Entrance animations on reveal: MATERIALIZE (pixels out of static), RAIN (staggered drop-in), POP (springy overshoot) or NONE - pick in ANIMATION" },
      { s: "medium", text: "Cursor options: PIXEL DOTS trail with glitch flicker (default), the v4 glow, or off" },
      { s: "medium", text: "Pixel-themed backgrounds join CLASSIC: PIXEL GRID, drifting STARFIELD, falling PIXEL RAIN" },
      { s: "minor", text: "Spin holds until the entrance completes; grabbing the rat skips the ceremony" },
    ],
  },
  {
    tag: "v4.2.0",
    name: "PINNED PIXELS",
    entries: [
      { s: "medium", text: "RAT BUILDER fix: the pixel preview is now pinned above the scroll area - it stays in sight while you scroll through every slider and palette below" },
      { s: "minor", text: "The main stage reveal text moved into the scrolling options area to keep the preview column clean" },
    ],
  },
  {
    tag: "v4.3.0",
    name: "CRUMB TRAIL",
    entries: [
      { s: "medium", text: "Cursor trail rework: dots now pin to breadcrumb positions - the path stays exactly where you drew it, no more elastic pull toward the cursor on curves" },
      { s: "minor", text: "Trail fades out in place when the cursor stops, and glitches only affect dots that are still alive" },
    ],
  },
  {
    tag: "v4.4.0",
    name: "SCULPT & PULSE",
    entries: [
      { s: "major", text: "RAT tab in settings now de-spawns the main rat and pins a live pixel preview in the panel - sculpt in peace; the stage rat returns the moment you switch tabs or close settings" },
      { s: "major", text: "Category tabs pinned to the modal top so they never scroll away, no matter how deep the panel you are rummaging through" },
      { s: "medium", text: "Settings modal is resizable - grab the hatched corner and stretch the whole panel to taste" },
      { s: "medium", text: "New PIXEL SCATTER cursor: a tight huddle of tiny pixels per breadcrumb with a gentle orbit and glitch flicker - a chunky trail without the confetti spread" },
      { s: "minor", text: "Buttons now ripple a pixel pulse wave outward from the press point; the old chunky press-translate is retired" },
    ],
  },
  {
    tag: "v4.5.0",
    name: "DOT MATRIX",
    entries: [
      { s: "major", text: "Rat-Slop Log redesign: the tab strip is retired - releases now parade through a big centered dot-matrix version readout, drawn cell by cell on a canvas" },
      { s: "major", text: "RAT tab preview fixed: the pinned pixel preview was being wiped by the slider rebuild the instant it mounted - it now survives and sculpts live, just like the RAT BUILDER" },
      { s: "medium", text: "Dot-styled chevrons step between releases; the version number slides out and in while the notes below reload in their own scroll area" },
      { s: "medium", text: "The log modal is now resizable and draggable like settings - stretch it by the hatched corner, park it by the header" },
      { s: "minor", text: "Chevrons dim at the ends of the timeline, and the dot readout recolors itself when you switch palettes" },
    ],
  },
  {
    tag: "v5.0.0",
    name: "SEWER SHARE",
    entries: [
      { s: "major", text: "SHARE YOUR RAT: the RAT tab mints a ?rat= link of rat-phrases (noodle-chonk-radar-catfish...) that carries ONLY the rat - every other setting stays unique to whoever opens it" },
      { s: "major", text: "RAT MAZE easter egg: click the title or press M, then guide @ through a generated labyrinth to the % - a crumb trail marks your slop, and mazes grow with every cheese" },
      { s: "major", text: "Rat-Slop Log stepper rebuilt for major.minor.patch: borderless up/down chevrons sit above and below each digit, and stepping slides that digit vertically like an odometer" },
      { s: "medium", text: "Patch digits that never shipped render faded with no chevrons - a tombstone for ranges that never got a patch release" },
      { s: "medium", text: "HALLOWEEN MODE: surfaces in STYLE every October only - pumpkin-phosphor palette and a drifting spooky sky with a moon; hibernates the other eleven months" },
      { s: "medium", text: "FALL LEAVES background joins the rotation: pixel foliage drifting down at three lazy autumn speeds" },
      { s: "medium", text: "Modal heights hold steady: settings and the log open at a fixed height and keep it through every tab flip; your own resize still sticks" },
      { s: "medium", text: "Settings categories are now an even segmented bar - all five tabs always visible, no more wrapping button slop" },
      { s: "minor", text: "Button presses now burst a ripple of pixel squares, and hovering sprinkles shimmering pixels - the single-shade wave block is retired" },
    ],
  },
];

const SEV = {
  major: { sym: ">>", cls: "major" },
  medium: { sym: ">", cls: "medium" },
  minor: { sym: "~", cls: "minor" },
};
let activeRel = CHANGELOG.length - 1;
let verAnim = null;

// ---------- v5: per-digit dot-matrix stepper (major.minor.patch) ----------
// 5x7 dot font; each lit cell becomes a single canvas pixel, scaled up
// with image-rendering: pixelated for chunky dots
const DOTFONT = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
};
const CHEV_UP = ["00100", "01010", "10001"];
const CHEV_DN = CHEV_UP.slice().reverse();

CHANGELOG.forEach((r) => {
  const n = r.tag.slice(1).split(".");
  r.v = [Number(n[0]) || 0, Number(n[1]) || 0, Number(n[2]) || 0];
});

function strPx(str) {
  let cols = 0, first = true;
  for (const ch of str) {
    const g = DOTFONT[ch];
    if (!g) continue;
    cols += g[0].length + (first ? 0 : 1);
    first = false;
  }
  return cols * 2 + 1;
}
function drawGlyphStr(ctx, str, x0, dy, color) {
  ctx.fillStyle = color;
  let cx = x0 + 1, first = true;
  for (const ch of str) {
    const g = DOTFONT[ch];
    if (!g) continue;
    if (!first) cx += 2;
    first = false;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < g[r].length; c++) {
        if (g[r][c] === "1") ctx.fillRect(cx + c * 2, dy + r * 2 + 1, 1, 1);
      }
    }
    cx += g[0].length * 2;
  }
}
function drawTiny(cv, g, color) {
  const ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = color;
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < g[r].length; c++) {
      if (g[r][c] === "1") ctx.fillRect(c * 2 + 1, r * 2 + 1, 1, 1);
    }
  }
}
function segHasPatches(i) {
  const c = CHANGELOG[i].v;
  return CHANGELOG.some((r) => r.v[0] === c[0] && r.v[1] === c[1] && r.v[2] > 0);
}
function drawVerSegs(p, anim) {
  const pal = curPalObj || PALETTES[0];
  const cur = CHANGELOG[activeRel];
  for (let k = 0; k < 3; k++) {
    const cv = segCvs[k];
    let wpx = strPx(String(cur.v[k]));
    if (anim && anim.seg === k) {
      wpx = Math.max(wpx, strPx(String(anim.fromVal)), strPx(String(anim.toVal)));
    }
    if (cv.width !== wpx) cv.width = wpx;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    const faded = k === 2 && !segHasPatches(activeRel);
    const color = faded ? pal.dim : pal.bright;
    if (anim && anim.seg === k && p < 1) {
      // odometer: the stepped digit slides out, the new one slides in
      const e = 1 - Math.pow(1 - p, 3);
      const fromStr = String(anim.fromVal);
      const toStr = String(anim.toVal);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, cv.width, cv.height);
      ctx.clip();
      drawGlyphStr(ctx, fromStr, Math.round((cv.width - strPx(fromStr)) / 2), -anim.dir * e * 15, pal.mid);
      drawGlyphStr(ctx, toStr, Math.round((cv.width - strPx(toStr)) / 2), anim.dir * (1 - e) * 15, color);
      ctx.restore();
    } else {
      const s = String(cur.v[k]);
      drawGlyphStr(ctx, s, Math.round((cv.width - strPx(s)) / 2), 0, color);
    }
  }
}
function drawChevrons() {
  const pal = curPalObj || PALETTES[0];
  ["majUpCv", "minUpCv", "patUpCv"].forEach((id) => drawTiny(document.getElementById(id), CHEV_UP, pal.fg));
  ["majDnCv", "minDnCv", "patDnCv"].forEach((id) => drawTiny(document.getElementById(id), CHEV_DN, pal.fg));
  ["dot1", "dot2"].forEach((id) => drawTiny(document.getElementById(id), DOTFONT["."], pal.mid));
}
function segExists(k, dir) {
  const c = CHANGELOG[activeRel].v;
  return CHANGELOG.some((r) => {
    if (k === 0) return dir > 0 ? r.v[0] > c[0] : r.v[0] < c[0];
    if (k === 1) return r.v[0] === c[0] && (dir > 0 ? r.v[1] > c[1] : r.v[1] < c[1]);
    return r.v[0] === c[0] && r.v[1] === c[1] && r.v[2] === c[2] + dir;
  });
}
function updateVerSegs() {
  const hasPat = segHasPatches(activeRel);
  for (let k = 0; k < 3; k++) {
    const hide = k === 2 && !hasPat;
    segBtns[k][0].style.display = hide ? "none" : "";
    segBtns[k][1].style.display = hide ? "none" : "";
    segBtns[k][0].disabled = hide || !segExists(k, 1);
    segBtns[k][1].disabled = hide || !segExists(k, -1);
  }
}
function stepRel(k, dir) {
  if (verAnim) return;
  const cur = CHANGELOG[activeRel];
  let target = null;
  if (k === 0) {
    target = dir > 0 ? CHANGELOG.find((r) => r.v[0] > cur.v[0])
      : CHANGELOG.slice().reverse().find((r) => r.v[0] < cur.v[0]);
  } else if (k === 1) {
    target = dir > 0 ? CHANGELOG.find((r) => r.v[0] === cur.v[0] && r.v[1] > cur.v[1])
      : CHANGELOG.slice().reverse().find((r) => r.v[0] === cur.v[0] && r.v[1] < cur.v[1]);
  } else {
    target = CHANGELOG.find((r) =>
      r.v[0] === cur.v[0] && r.v[1] === cur.v[1] && r.v[2] === cur.v[2] + dir);
  }
  if (!target) return;
  verAnim = { seg: k, fromVal: cur.v[k], toVal: target.v[k], dir: dir, t0: performance.now() };
  activeRel = CHANGELOG.indexOf(target);
  renderBody();
  updateVerSegs();
}
segBtns.forEach((pair, k) => {
  pair[0].addEventListener("click", () => stepRel(k, 1));
  pair[1].addEventListener("click", () => stepRel(k, -1));
});
function renderBody() {
  const rel = CHANGELOG[activeRel];
  let html =
    '<div class="ver">RELEASE ' + rel.tag + " \u2014 " + rel.name + "</div>" +
    '<div class="vdiv">+' + "-".repeat(46) + "+</div>";
  for (const en of rel.entries) {
    const s = SEV[en.s];
    html +=
      '<div class="entry"><span class="sym ' + s.cls + '">' + s.sym +
      '</span><span>' + en.text + "</span></div>";
  }
  mbodyEl.innerHTML = html;
  mbodyEl.scrollTop = 0;
}
function openLog() {
  overlay.classList.add("show");
  overlay.setAttribute("aria-hidden", "false");
  const m = overlay.querySelector(".modal");
  if (!m.style.height) m.style.height = Math.round(Math.min(innerHeight * 0.8, 560)) + "px";
  drawVerSegs(0, verAnim);


// ---------- settings: categories, sliders, toggles ----------
const setOverlay = document.getElementById("setOverlay");
const setTabsEl = document.getElementById("setTabs");
const setPanelsEl = document.getElementById("setPanels");
const fpsEl = document.getElementById("fps");
const glowEl = document.getElementById("cursorGlow");
let fpsFrames = 0, fpsT = performance.now();
let cgx = innerWidth / 2, cgy = innerHeight / 2, cgtx = cgx, cgty = cgy;

const MOTIONS = ["SPIN", "WAVE", "WALK", "SCUTTLE", "TUMBLE", "ORBIT", "BREATH"];
const MOTION_DESC = {
  SPIN: "classic cruise around the vertical axis",
  WAVE: "jelly undulation rippling along the body",
  WALK: "sewer-treadmill strut: diagonal-gait leg pumps, body bob, in place",
  SCUTTLE: "nervous little hops with a body lean",
  TUMBLE: "slow full-body somersault",
  ORBIT: "lazy lissajous drift around the screen",
  BREATH: "slow looming in and out",
};
const RAMPS_LIST = ["MINIMAL", "CLASSIC", "GLYPH", "BLOCKS"];

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function sliderRow(label, min, max, step, get, set, fmt) {
  const row = el("div", "srow");
  const top = el("div", "srowtop");
  top.append(el("span", "slabel", label));
  const val = el("span", "sval", fmt(get()));
  top.append(val);
  const input = document.createElement("input");
  input.type = "range";
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(get());
  input.addEventListener("input", () => {
    set(parseFloat(input.value));
    val.textContent = fmt(get());
  });
  row.append(top, input);
  return row;
}
function toggleRow(label, get, set) {
  const row = el("div", "trow");
  row.append(el("span", "slabel", label));
  const btn = el("button", "tab tgl");
  btn.type = "button";
  const sync = () => {
    btn.textContent = "[ " + (get() ? "ON" : "OFF") + " ]";
    btn.classList.toggle("active", get());
  };
  btn.addEventListener("click", () => { set(!get()); sync(); });
  sync();
  row.append(btn);
  return row;
}
function renderOptions(container, values, cur, onPick, descEl, descMap) {
  container.innerHTML = "";
  values.forEach((name) => {
    const b = el("button", "tab" + (cur() === name ? " active" : ""), "[ " + name + " ]");
    b.type = "button";
    if (descEl) {
      b.addEventListener("mouseenter", () => { descEl.textContent = descMap[name]; });
      b.addEventListener("mouseleave", () => { descEl.textContent = descMap[cur()]; });
    }
    b.addEventListener("click", () => {
      onPick(name);
      renderOptions(container, values, cur, onPick, descEl, descMap);
      if (descEl) descEl.textContent = descMap[name];
    });
    container.appendChild(b);
  });
  if (descEl) descEl.textContent = descMap[cur()];
}

// ---------- pixel-dot cursor trail ----------
const cursorFxEl = document.getElementById("cursorFx");
const cursorDots = [];
const trail = []; // breadcrumb history: {x, y, t} - dots pin to past positions, no springing
(function buildCursorDots() {
  for (let i = 0; i < 12; i++) {
    const node = el("div", "cdot");
    const s = Math.max(2, 7 - Math.round(i * 0.5));
    node.style.width = s + "px";
    node.style.height = s + "px";
    cursorFxEl.appendChild(node);
    cursorDots.push({
      node,
      ph: Math.random() * Math.PI * 2,
      baseOp: Math.max(0.12, 0.95 - i * 0.07),
    });
  }
})();
const CURSORS = ["PIXEL DOTS", "PIXEL SCATTER", "GLOW", "OFF"];
const scatterDots = [];
(function buildScatterDots() {
  for (let i = 0; i < 24; i++) {
    const node = el("div", "cdot");
    const s = i % 3 === 0 ? 3 : 2;
    node.style.width = s + "px";
    node.style.height = s + "px";
    cursorFxEl.appendChild(node);
    scatterDots.push({ node, ph: Math.random() * Math.PI * 2 });
  }
})();
function applyCursorMode() {
  glowEl.style.display = state.cursor === "GLOW" ? "" : "none";
  cursorFxEl.style.display =
    state.cursor === "PIXEL DOTS" || state.cursor === "PIXEL SCATTER" ? "" : "none";
  // park unused pools until the active mode drives them again
  cursorDots.concat(scatterDots).forEach((d) => { d.node.style.opacity = "0"; });
}

const ENTRANCES = ["MATERIALIZE", "RAIN", "POP", "NONE"];
const ENTRANCE_DESC = {
  MATERIALIZE: "pixels assemble out of the static, whisker by whisker",
  RAIN: "the rat rains in from above, every point staggered",
  POP: "scale-up with a springy overshoot",
  NONE: "no ceremony - straight to business",
};
const BGS = ["CLASSIC", "PIXEL GRID", "STARFIELD", "PIXEL RAIN", "FALL LEAVES"];
const BG_CLASSES = {
  "PIXEL GRID": "bg-grid",
  STARFIELD: "bg-stars",
  "PIXEL RAIN": "bg-rain",
  "FALL LEAVES": "bg-fall",
};
function applyBg() {
  Object.values(BG_CLASSES).forEach((c) => document.body.classList.remove(c));
  if (BG_CLASSES[state.bg]) document.body.classList.add(BG_CLASSES[state.bg]);
}

// ---------- builder preview: pixel-dot rat silhouette (no spin) ----------
function drawRatPreview() {
  drawPreviewTo(document.getElementById("ratPreview"));
  drawPreviewTo(document.getElementById("ratPreview2"));
}
function drawPreviewTo(cv) {
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  const pal = curPalObj || PALETTES[0];
  const cols = [pal.dim, pal.mid, pal.fg, pal.bright];
  const depth = new Float32Array(W * H).fill(-1e9);
  const shade = new Float32Array(W * H);
  const cy2 = Math.cos(0.55), sy2 = Math.sin(0.55);
  const cp2 = Math.cos(0.14), sp2 = Math.sin(0.14);
  const scale = (W * 0.94) / 9;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const x1 = p.x * cy2 + p.z * sy2;
    const z1 = -p.x * sy2 + p.z * cy2;
    const y2 = p.y * cp2 - z1 * sp2;
    const z2 = p.y * sp2 + z1 * cp2;
    const c2 = Math.round(W / 2 + x1 * scale);
    if (c2 < 0 || c2 >= W) continue;
    const r2 = Math.round(H / 2 - y2 * scale);
    if (r2 < 0 || r2 >= H) continue;
    const idx = r2 * W + c2;
    if (z2 <= depth[idx]) continue;
    depth[idx] = z2;
    let s;
    if (p.f !== undefined) {
      s = p.f;
    } else {
      const nx1 = p.nx * cy2 + p.nz * sy2;
      const nz1 = -p.nx * sy2 + p.nz * cy2;
      const ny2 = p.ny * cp2 - nz1 * sp2;
      const nz2 = p.ny * sp2 + nz1 * cp2;
      s = 0.5 + 0.5 * (nx1 * LIGHT[0] + ny2 * LIGHT[1] + nz2 * LIGHT[2]);
    }
    shade[idx] = Math.max(0.05, Math.min(1, s));
  }
  for (let r2 = 0; r2 < H; r2++) {
    for (let c2 = 0; c2 < W; c2++) {
      const idx = r2 * W + c2;
      if (depth[idx] <= -1e8) continue;
      const ci = Math.min(3, Math.max(0, Math.round(shade[idx] * 3)));
      ctx.fillStyle = cols[ci];
      ctx.fillRect(c2, r2, 1, 1);
    }
  }
}

const PALETTES = [
  { name: "PHOSPHOR", fg: "#8effa5", bright: "#b6ffc6", mid: "#6fdc8b", dim: "#4c8f60", border: "#2f7a4b", panel: "#071009", deep: "#06120b", bg0: "#0d1a12", bg1: "#050807", glow: "rgba(70, 255, 130, 0.45)" },
  { name: "AMBER", fg: "#ffc46e", bright: "#ffe3ab", mid: "#d9a355", dim: "#966a3a", border: "#8a6428", panel: "#140d04", deep: "#120b04", bg0: "#1c1305", bg1: "#0a0603", glow: "rgba(255, 190, 90, 0.4)" },
  { name: "ICE", fg: "#9fdcff", bright: "#d8f2ff", mid: "#74b5da", dim: "#46748f", border: "#33627f", panel: "#04101a", deep: "#030d15", bg0: "#081a26", bg1: "#040a10", glow: "rgba(120, 210, 255, 0.4)" },
  { name: "VAPOR", fg: "#ff9ad5", bright: "#ffd4f2", mid: "#d874b5", dim: "#8a4a78", border: "#964a88", panel: "#150618", deep: "#120416", bg0: "#1e0a24", bg1: "#0b0410", glow: "rgba(255, 150, 220, 0.4)" },
  { name: "BLOOD", fg: "#ff8f8f", bright: "#ffd0d0", mid: "#d87070", dim: "#8f4a4a", border: "#963a3a", panel: "#150404", deep: "#110303", bg0: "#1e0808", bg1: "#0a0303", glow: "rgba(255, 120, 120, 0.4)" },
  { name: "MONO", fg: "#e8e8e8", bright: "#ffffff", mid: "#b3b3b3", dim: "#6d6d6d", border: "#7c7c7c", panel: "#0e0e0e", deep: "#0b0b0b", bg0: "#151515", bg1: "#060606", glow: "rgba(230, 230, 230, 0.35)" },
  { name: "HALLOWEEN", fg: "#ff9a3c", bright: "#ffd9a0", mid: "#d97b2a", dim: "#8f4a1a", border: "#6d3fa0", panel: "#140a04", deep: "#0e0803", bg0: "#1a0e05", bg1: "#0a0503", glow: "rgba(255, 150, 50, 0.45)" },
];

function swatchBg(p) {
  return "linear-gradient(90deg, " + p.bright + " 0 25%, " + p.fg + " 25% 50%, " +
    p.mid + " 50% 75%, " + p.dim + " 75% 100%)";
}
let curPalObj = null;
let halloweenPrev = null;
function applyPalette(p) {
  curPalObj = p;
  const r = document.documentElement.style;
  r.setProperty("--fg", p.fg);
  r.setProperty("--fg-bright", p.bright);
  r.setProperty("--fg-mid", p.mid);
  r.setProperty("--fg-dim", p.dim);
  r.setProperty("--border", p.border);
  r.setProperty("--panel", p.panel);
  r.setProperty("--deep", p.deep);
  r.setProperty("--bg0", p.bg0);
  r.setProperty("--bg1", p.bg1);
  r.setProperty("--glow", p.glow);
  // keep the log's dot-matrix readout in step with the new palette
  drawVerSegs(0, verAnim);
  drawChevrons();
}
function applyHalloween() {
  const on = state.halloween && isOctober;
  document.body.classList.toggle("halloween", on);
  if (on) {
    if (state.palette !== "HALLOWEEN") halloweenPrev = state.palette;
    state.palette = "HALLOWEEN";
  } else if (state.palette === "HALLOWEEN") {
    state.palette = halloweenPrev || "PHOSPHOR";
  }
  applyPalette(PALETTES.find((p) => p.name === state.palette) || PALETTES[0]);
}
function renderRamps(container) {
  container.innerHTML = "";
  RAMPS_LIST.forEach((name) => {
    const b = el("button", "tab" + (state.ramp === name ? " active" : ""), "[ " + name + " ]");
    b.type = "button";
    b.addEventListener("click", () => {
      state.ramp = name;
      ramp = RAMPS[name];
      saveState();
      renderRamps(container);
    });
    container.appendChild(b);
  });
}
function renderMotions(container, descEl) {
  container.innerHTML = "";
  MOTIONS.forEach((name) => {
    const b = el("button", "tab" + (state.motion === name ? " active" : ""), "[ " + name + " ]");
    b.type = "button";
    b.addEventListener("mouseenter", () => { descEl.textContent = MOTION_DESC[name]; });
    b.addEventListener("mouseleave", () => { descEl.textContent = MOTION_DESC[state.motion]; });
    b.addEventListener("click", () => {
      state.motion = name;
      motion = name;
      saveState();
      renderMotions(container, descEl);
      descEl.textContent = MOTION_DESC[name];
    });
    container.appendChild(b);
  });
  descEl.textContent = MOTION_DESC[state.motion];
}
function renderPalettes(container, nameEl) {
  container.innerHTML = "";
  PALETTES.filter((p) => p.name !== "HALLOWEEN" || isOctober).forEach((p) => {
    const b = el("button", "swatch" + (state.palette === p.name ? " active" : ""));
    b.type = "button";
    b.title = p.name;
    b.setAttribute("aria-label", p.name);
    b.style.background = swatchBg(p);
    b.addEventListener("click", () => {
      applyPalette(p);
      state.palette = p.name;
      saveState();
      renderPalettes(container, nameEl);
      nameEl.textContent = p.name;
      drawRatPreview(); // recolor the builder preview if visible
    });
    b.addEventListener("mouseenter", () => { nameEl.textContent = p.name; });
    b.addEventListener("mouseleave", () => { nameEl.textContent = state.palette; });
    container.appendChild(b);
  });
  nameEl.textContent = state.palette;
}
function renderRatSliders(container) {
  container.innerHTML = "";
  const fmt = (v) => v.toFixed(2) + "x";
  RAT_DEFS.forEach((d) => {
    container.appendChild(sliderRow(d.label, d.min, d.max, 0.01,
      () => state.rat[d.k],
      (v) => { state.rat[d.k] = v; buildRat(state.rat); drawRatPreview(); saveState(); },
      fmt));
  });
}
function updateSculpt() {


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


// ---------- first visit: rat character creation before anything else ----------
const createOverlay = document.getElementById("createOverlay");
document.getElementById("createGo").addEventListener("click", () => {
  state.setupDone = true;
  saveState();
  createOverlay.classList.remove("show");
  createOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("setup");
  // main rat reveals now, with its entrance animation
  if (state.entrance !== "NONE") entranceT = performance.now();
});
if (!state.setupDone) {
  document.body.classList.add("setup");
  createOverlay.classList.add("show");
  createOverlay.setAttribute("aria-hidden", "false");
  renderRatSliders(document.getElementById("createSliders"));
  renderPalettes(document.getElementById("createPal"), document.getElementById("createPalName"));
  drawRatPreview();
}


function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // entrance animation progress (1 = settled)
  const ent = entranceT >= 0 ? Math.min(1, (now - entranceT) / 1400) : 1;
  if (ent >= 1) entranceT = -1;

  // momentum: after the cursor lets go, angular velocity keeps
  // adjusting for the glide window on a smoothstep curve back to normal speed
  if (!dragging) {
    const targetH = spinOn && motion !== "WALK" && ent >= 1 ? state.spin : 0;
    if (releaseT >= 0) {
      const t = (now - releaseT) / (state.glide * 1000);
      if (t >= 1) {
        velH = targetH; velV = 0; releaseT = -1;
      } else {
        const f = t * t * (3 - 2 * t);
        velH = releaseFromH + (targetH - releaseFromH) * f;
        velV = releaseFromV * (1 - f);
      }
    } else {
      velH = targetH; velV = 0;
    }
    theta += velH * dt;
    pitch = Math.max(-0.9, Math.min(0.9, pitch + velV * dt));
  }

  // party mode: keep the beat (a gentle bob while spinning)
  const bob = party ? 0.07 * Math.sin(now * 0.006) : 0;
  // ambient motion modes stack on top of drag/momentum state
  const t = now / 1000;
  let ph = pitch + bob, dynZoom = zoom, xOff = 0, yOff = 0;
  const walkT = motion === "WALK" ? t * 9 : 0;
  if (motion === "SCUTTLE") {
    yOff = 0.22 * Math.abs(Math.sin(t * 7));   // hop, hop
    ph += 0.05 * Math.sin(t * 14);             // body lean
  } else if (motion === "WALK") {
    yOff = 0.05 * Math.abs(Math.sin(t * 18));  // body bob at step rate
    ph += 0.03 * Math.sin(t * 18);             // slight stride lean
  } else if (motion === "TUMBLE") {
    ph += 0.55 * Math.sin(now * 0.0012);       // slow full-body tumble
  } else if (motion === "ORBIT") {
    dynZoom = zoom * 0.72;                     // back off so the drift fits
    xOff = 1.4 * Math.cos(t * 0.6);            // lazy lissajous wander
    yOff = 0.9 * Math.sin(t * 1.1);
  } else if (motion === "BREATH") {
    dynZoom = zoom * (1 + 0.09 * Math.sin(t * 1.4)); // slow loom in and out
  }
  // POP entrance: springy scale-up overshoot
  if (ent < 1 && state.entrance === "POP") {
    const c1 = 1.70158, c3 = c1 + 1, u = ent - 1;
    dynZoom *= 1 + c3 * u * u * u + c1 * u * u;
  }
  const cy = Math.cos(theta), sy = Math.sin(theta);
  const cp = Math.cos(ph), sp = Math.sin(ph);
  // rows per world unit (vertical half-extent ~3.2 incl. legs/ears, width ~9 incl. tail)
  const scale = dynZoom * Math.min((ROWS * 0.88) / 3.2, COLS * 0.96 / (9 * CHAR_ASPECT));

  // smooth zoom eases toward the wheel target
  if (state.smoothZoom) zoom += (zoomTarget - zoom) * Math.min(1, dt * 6 * state.zoomSpeed);

  // party mode: cycle the global hue
  if (party) {
    partyHue = (partyHue + 150 * dt) % 360;
    document.body.style.setProperty("--party-hue", partyHue.toFixed(1));
  }

  // clear
  grid.fill(-1e9);

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    // yaw around Y
    const x1 = p.x * cy + p.z * sy;
    const z1 = -p.x * sy + p.z * cy;
    // pitch around X
    let y2 = p.y * cp - z1 * sp;
    const z2 = p.y * sp + z1 * cp;
    // WAVE mode: jelly undulation along the body
    if (motion === "WAVE") y2 += 0.14 * Math.sin(x1 * 2.5 + now * 0.004 + z1 * 2);
    // WALK mode: diagonal-gait leg pumps
    if (motion === "WALK" && p.tag) {
      const off = p.tag === "FL" || p.tag === "BR" ? 0 : Math.PI;
      y2 += 0.13 * Math.max(0, Math.sin(walkT + off));
    }
    // entrance animation point effects
    if (ent < 1) {
      if (state.entrance === "MATERIALIZE" && p.b > ent) continue;
      if (state.entrance === "RAIN") {
        const ep = Math.min(1, Math.max(0, (ent - p.b * 0.4) / 0.6));
        y2 += (1 - ep) * (1 - ep) * 3.6;
      }
    }

    const col = Math.round(COLS / 2 + (x1 + xOff) * scale * CHAR_ASPECT);
    if (col < 0 || col >= COLS) continue;
    const row = Math.round(ROWS / 2 - (y2 + yOff) * scale);
    if (row < 0 || row >= ROWS) continue;

    const idx = row * COLS + col;
    if (z2 <= grid[idx]) continue;
    grid[idx] = z2;

    let s;
    if (p.f !== undefined) {
      s = p.f;
    } else {
      // rotate normal the same way
      const nx1 = p.nx * cy + p.nz * sy;
      const nz1 = -p.nx * sy + p.nz * cy;
      const ny2 = p.ny * cp - nz1 * sp;
      const nz2 = p.ny * sp + nz1 * cp;
      const d = nx1 * LIGHT[0] + ny2 * LIGHT[1] + nz2 * LIGHT[2];
      s = 0.5 + 0.5 * d;                 // lambert 0..1
      s = Math.pow(s, 0.85);
      if (z2 < -0.4) s *= 0.55;          // dim far side slightly (cheap depth cue)
    }
    chars[idx] = shadeChar(s);
  }

  // build frame, clearing unused cells
  let out = "";
  for (let r = 0; r < ROWS; r++) {
    const start = r * COLS;
    for (let c = 0; c < COLS; c++) {
      const idx = start + c;
      if (grid[idx] === -1e9) chars[idx] = " ";
      out += chars[idx];
    }
    if (r < ROWS - 1) out += "\n";
  }

  if (party) {
    // rainbow waves: each line rides its own hue
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    pre.innerHTML = out
      .split("\n")
      .map((ln, r) => {
        const h = (partyHue + r * 13) % 360;
        return '<span style="color:hsl(' + h + ', 95%, 68%)">' + esc(ln) + "</span>";
      })
      .join("\n");
  } else {
    pre.textContent = out;
  }

  // live orientation readout (H = yaw, V = pitch)
  const hdeg = (((theta * 180 / Math.PI) % 360) + 360) % 360;
  const vdeg = (pitch * 180) / Math.PI;
  readout.textContent =
    "H " + hdeg.toFixed(1).padStart(5, "0") + "\u00B0" +
    "   V " + (vdeg < 0 ? "-" : "+") + Math.abs(vdeg).toFixed(1).padStart(4, "0") + "\u00B0";

  // fps counter (toggled in PERFORMANCE)
  fpsFrames++;
  if (now - fpsT >= 500) {
    if (state.fps) fpsEl.textContent = "FPS " + Math.round((fpsFrames * 1000) / (now - fpsT));
    fpsFrames = 0;
    fpsT = now;
  }

  // v5: per-digit odometer slide in the Rat-Slop Log
  if (verAnim) {
    const vp = Math.min(1, (now - verAnim.t0) / 320);
    drawVerSegs(vp, verAnim);
    if (vp >= 1) { verAnim = null; drawVerSegs(0, null); }
  }

  // cursor fx: lagged glow or pixel-dot trail with glitch flicker
  cgx += (cgtx - cgx) * Math.min(1, dt * 14);
  cgy += (cgty - cgy) * Math.min(1, dt * 14);
  glowEl.style.transform = "translate(" + cgx.toFixed(1) + "px, " + cgy.toFixed(1) + "px) translate(-50%, -50%)";
  if (state.cursor === "PIXEL DOTS" || state.cursor === "PIXEL SCATTER") {
    // breadcrumb trail: drop a crumb only while the cursor moves,
    // so the trail stays exactly where the path was and evaporates in place
    if (!trail.length) trail.push({ x: cgtx, y: cgty, t: now });
    const lastCrumb = trail[trail.length - 1];
    if (Math.hypot(cgtx - lastCrumb.x, cgty - lastCrumb.y) > 0.6) {
      trail.push({ x: cgtx, y: cgty, t: now });
    }
    if (trail.length > 48) trail.shift();
  }
  if (state.cursor === "PIXEL DOTS") {
    for (let i = 0; i < cursorDots.length; i++) {
      const d = cursorDots[i];
      const crumb = trail[Math.max(0, trail.length - 1 - i * 3)];
      const fade = Math.max(0, 1 - (now - crumb.t) / 650);
      let gx = crumb.x, gy = crumb.y;
      let op = d.baseOp * fade;
      // glitch: brief jitter + near-fade on rolling beats
      if (Math.sin(now * 0.02 + d.ph) > 0.93) {
        gx += (Math.random() - 0.5) * 7;
        op = 0.12 * fade;
      }
      d.node.style.left = gx.toFixed(1) + "px";
      d.node.style.top = gy.toFixed(1) + "px";
      d.node.style.opacity = op.toFixed(3);
    }
  } else if (state.cursor === "PIXEL SCATTER") {
    // scatter: three small pixels huddle at each crumb, gently orbiting
    // a couple of px so the cluster reads as one chunky trail, not confetti
    for (let i = 0; i < 8; i++) {
      const crumb = trail[Math.max(0, trail.length - 1 - i * 3)];
      const fade = Math.max(0, 1 - (now - crumb.t) / 650);
      for (let j = 0; j < 3; j++) {
        const d = scatterDots[i * 3 + j];
        const a = crumb.t * 0.008 + j * 2.1 + i * 0.7;
        const r = 2 + (j % 2) * 1.5;
        let gx = crumb.x + Math.cos(a) * r;
        let gy = crumb.y + Math.sin(a * 1.3) * r;
        let op = (0.85 - i * 0.1) * fade;
        if (Math.sin(now * 0.02 + d.ph) > 0.94) {
          gx += (Math.random() - 0.5) * 6;
          op *= 0.3;
        }
        d.node.style.left = gx.toFixed(1) + "px";
        d.node.style.top = gy.toFixed(1) + "px";
        d.node.style.opacity = op.toFixed(3);
      }
    }
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
