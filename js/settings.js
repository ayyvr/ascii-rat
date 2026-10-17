"use strict";

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
