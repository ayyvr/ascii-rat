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
let previewRot = 0;
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
  const theta = state.previewRot || previewRot;
  const cy2 = Math.cos(theta), sy2 = Math.sin(theta);
  const cp2 = Math.cos(0.14), sp2 = Math.sin(0.14);
  const scale = (W * 0.98) / 9;
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
  // Add reset rat button
  const resetRow = el("div", "srow");
  const resetBtn = el("button", "tab", "[ RESET RAT ]");
  resetBtn.type = "button";
  resetBtn.addEventListener("click", () => {
    state.rat = JSON.parse(JSON.stringify(DEFAULTS.rat));
    buildRat(state.rat);
    drawRatPreview();
    saveState();
    renderRatSliders(container);
  });
  resetRow.append(resetBtn);
  container.appendChild(resetRow);
}
function updateSculpt() {
  const sculpting = setOverlay.classList.contains("show") && curTab === "RAT";
  document.getElementById("stage").style.visibility = sculpting ? "hidden" : "";
  if (sculpting) drawRatPreview();
}

// ---------- settings: category tabs + panels ----------
const SET_TABS = ["RAT", "ANIMATION", "STYLE", "PREFERENCES", "PERFORMANCE"];
let curTab = "RAT";

function sectionHead(text) { return el("div", "shead", text); }
function renderSetTabs() {
  setTabsEl.innerHTML = "";
  setTabsEl.style.display = "flex";
  SET_TABS.forEach((name) => {
    const b = el("button", "tab" + (curTab === name ? " active" : ""), "[ " + name + " ]");
    b.type = "button";
    b.addEventListener("click", () => {
      curTab = name;
      renderSettings();
      updateSculpt();
    });
    setTabsEl.appendChild(b);
  });
  // Add overflow dropdown
  const dropdown = el("button", "tab tabDropdown");
  dropdown.innerHTML = "[ \u25bc ]";
  dropdown.type = "button";
  dropdown.style.display = "none";
  dropdown.id = "tabDropdownBtn";
  setTabsEl.appendChild(dropdown);
}
function checkTabOverflow() {
  const container = setTabsEl;
  if (!container) return;
  const tabs = container.querySelectorAll(".tab:not(.tabDropdown)");
  const dropdown = container.querySelector(".tabDropdown");
  if (!dropdown) return;
  
  let totalWidth = 0;
  tabs.forEach(tab => { totalWidth += tab.offsetWidth; });
  
  const availableWidth = container.offsetWidth;
  const needsDropdown = totalWidth > availableWidth;
  dropdown.style.display = needsDropdown ? "block" : "none";
}

// Check overflow on resize and initial render
let tabOverflowCheck = null;
function scheduleTabOverflowCheck() {
  if (tabOverflowCheck) clearTimeout(tabOverflowCheck);
  tabOverflowCheck = setTimeout(checkTabOverflow, 50);
}
window.addEventListener("resize", scheduleTabOverflowCheck);
function shareRow() {
  const row = el("div", "srow");
  const code = ratCode();
  const link = location.origin + location.pathname + "?rat=" + code;
  const top = el("div", "srowtop");
  top.append(el("span", "slabel", "SHARE YOUR RAT"));
  const btn = el("button", "tab", "[ COPY RAT LINK ]");
  btn.type = "button";
  btn.addEventListener("click", () => {
    try {
      navigator.clipboard.writeText(link);
      btn.textContent = "[ LINK COPIED ]";
    } catch (e) {
      btn.textContent = "[ " + code + " ]";
    }
    setTimeout(() => { btn.textContent = "[ COPY RAT LINK ]"; }, 1400);
  });
  top.append(btn);
  row.append(top, el("div", "palname", code));
  return row;
}
function renderSettings() {
  renderSetTabs();
  setPanelsEl.innerHTML = "";
  const panel = el("div");
  if (curTab === "RAT") {
    const cv = document.createElement("canvas");
    cv.id = "ratPreview2";
    cv.width = 132; cv.height = 52;
    panel.append(cv, sectionHead("SCULPT YOUR RAT"));
    const sliders = el("div");
    panel.append(sliders);
    renderRatSliders(sliders);
    panel.append(sectionHead("SHARE YOUR RAT"));
    panel.append(shareRow());
  } else if (curTab === "ANIMATION") {
    panel.append(sectionHead("IDLE MOTION"));
    const cm = el("div", "optrow"), dm = el("div", "palname");
    panel.append(cm, dm);
    renderMotions(cm, dm);
    panel.append(sectionHead("ENTRANCE"));
    const ce = el("div", "optrow"), de = el("div", "palname");
    panel.append(ce, de);
    renderOptions(ce, ENTRANCES, () => state.entrance,
      (n) => { state.entrance = n; saveState(); }, de, ENTRANCE_DESC);
    panel.append(sectionHead("SPIN"));
    panel.append(sliderRow("SPIN SPEED", 0, 2, 0.05, () => state.spin,
      (v) => { state.spin = v; saveState(); }, (v) => Number(v).toFixed(2)));
    panel.append(toggleRow("MOMENTUM ON RELEASE", () => state.momentum,
      (v) => { state.momentum = v; saveState(); }));
    panel.append(sliderRow("GLIDE WINDOW", 0.2, 3, 0.1, () => state.glide,
      (v) => { state.glide = v; saveState(); }, (v) => Number(v).toFixed(1) + "s"));
  } else if (curTab === "STYLE") {
    panel.append(sectionHead("CHARACTER RAMP"));
    const cr = el("div", "optrow");
    panel.append(cr);
    renderRamps(cr);
    panel.append(sectionHead("PALETTE"));
    const cp = el("div", "optrow"), np = el("div", "palname");
    panel.append(cp, np);
    renderPalettes(cp, np);
    panel.append(sectionHead("BACKGROUND"));
    const cb = el("div", "optrow");
    panel.append(cb);
    renderOptions(cb, BGS, () => state.bg,
      (n) => { state.bg = n; applyBg(); saveState(); }, null, null);
    if (isOctober) {
      panel.append(sectionHead("SEASONAL"));
      panel.append(toggleRow("HALLOWEEN MODE", () => state.halloween,
        (v) => { state.halloween = v; applyHalloween(); saveState(); renderSettings(); }));
    }
  } else if (curTab === "PREFERENCES") {
    panel.append(sectionHead("CURSOR"));
    const cc = el("div", "optrow");
    panel.append(cc);
    renderOptions(cc, CURSORS, () => state.cursor,
      (n) => { state.cursor = n; applyCursorMode(); saveState(); }, null, null);
    panel.append(sectionHead("ZOOM"));
    panel.append(toggleRow("SMOOTH ZOOM", () => state.smoothZoom,
      (v) => { state.smoothZoom = v; if (!v) zoom = zoomTarget; saveState(); }));
    panel.append(sliderRow("ZOOM SPEED", 0.25, 3, 0.05, () => state.zoomSpeed,
      (v) => { state.zoomSpeed = v; saveState(); }, (v) => Number(v).toFixed(2) + "x"));
  } else {
    panel.append(sectionHead("POINT DENSITY"));
    panel.append(sliderRow("DENSITY", 0.3, 2, 0.05, () => state.density,
      (v) => { state.density = v; buildRat(state.rat); drawRatPreview(); saveState(); },
      (v) => Number(v).toFixed(2) + "x"));
    panel.append(sectionHead("OVERLAYS"));
    panel.append(toggleRow("PHOSPHOR FX", () => state.fx,
      (v) => { state.fx = v; applyFx(); saveState(); }));
    panel.append(toggleRow("FPS COUNTER", () => state.fps,
      (v) => { state.fps = v; fpsEl.classList.toggle("on", v); if (!v) fpsEl.textContent = "FPS --"; saveState(); }));
  }
  setPanelsEl.append(panel);
  if (curTab === "RAT") drawRatPreview();
}
function applyFx() {
  const on = state.fx;
  document.querySelector(".scanlines").style.display = on ? "" : "none";
  document.querySelector(".vignette").style.display = on ? "" : "none";
}
function openSettings() {
  setOverlay.classList.add("show");
  setOverlay.setAttribute("aria-hidden", "false");
  const m = setOverlay.querySelector(".modal");
  if (!m.style.height) m.style.height = Math.round(Math.min(innerHeight * 0.8, 560)) + "px";
  renderSettings();
  updateSculpt();
}
function closeSettings() {
  setOverlay.classList.remove("show");
  setOverlay.setAttribute("aria-hidden", "true");
  updateSculpt();
}
function toggleSettings() {
  if (setOverlay.classList.contains("show")) closeSettings();
  else openSettings();
}
document.getElementById("setBtn").addEventListener("click", toggleSettings);
document.getElementById("setClose").addEventListener("click", closeSettings);
setOverlay.addEventListener("click", (e) => {
  if (e.target === setOverlay) closeSettings();
});

// ---------- wallpaper mode (press W): every scrap of UI fades away ----------
let zen = false;
function toggleZen() {
  zen = !zen;
  ["h1", "readout", "fps"].forEach((id) => {
    const e2 = document.getElementById(id);
    if (e2) e2.style.display = zen ? "none" : "";
  });
  document.querySelector(".controls").style.display = zen ? "none" : "";
  document.querySelector(".hint").style.display = zen ? "none" : "";
}

// ---------- cursor tracking (glow + pixel trails chase the pointer) ----------
addEventListener("pointermove", (e) => { cgtx = e.clientX; cgty = e.clientY; });

// ---------- draggable + resizable modals ----------
function makeDraggable(modal) {
  const head = modal.querySelector(".mhead");
  if (!head) return;
  let dragging = false, sx = 0, sy = 0, cx = 0, cy = 0;
  head.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".mclose")) return;
    dragging = true;
    const r = modal.getBoundingClientRect();
    cx = r.left + r.width / 2; cy = r.top + r.height / 2;
    modal.style.left = cx + "px";
    modal.style.top = cy + "px";
    modal.style.transform = "translate(-50%, -50%)";
    sx = e.clientX; sy = e.clientY;
    head.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  head.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    modal.style.left = cx + (e.clientX - sx) + "px";
    modal.style.top = cy + (e.clientY - sy) + "px";
  });
  const end = () => { dragging = false; };
  head.addEventListener("pointerup", end);
  head.addEventListener("pointercancel", end);
}
function makeResizable(handle, modal) {
  let on = false, sx = 0, sy = 0, sw = 0, sh = 0;
  handle.addEventListener("pointerdown", (e) => {
    on = true;
    sx = e.clientX; sy = e.clientY;
    const r = modal.getBoundingClientRect();
    sw = r.width; sh = r.height;
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  handle.addEventListener("pointermove", (e) => {
    if (!on) return;
    modal.style.width = Math.max(320, sw + (e.clientX - sx)) + "px";
    modal.style.height = Math.max(220, sh + (e.clientY - sy)) + "px";
  });
  const end = () => { on = false; };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
}
makeDraggable(document.querySelector("#overlay .modal"));
makeDraggable(document.querySelector("#setOverlay .modal"));
makeResizable(document.getElementById("logResize"), document.querySelector("#overlay .modal"));
makeResizable(document.getElementById("resizeHandle"), document.querySelector("#setOverlay .modal"));

// ---------- v5: pixel ripple on press + shimmer on hover ----------
function pixelBurst(x, y, n, spread, dist) {
  for (let i = 0; i < n; i++) {
    const d = document.createElement("div");
    const a = Math.random() * Math.PI * 2;
    const r = 2 + Math.random() * spread;
    d.style.cssText =
      "position:fixed;pointer-events:none;z-index:99;width:3px;height:3px;" +
      "background:var(--fg-bright);left:" + (x + Math.cos(a) * r).toFixed(1) + "px;" +
      "top:" + (y + Math.sin(a) * r).toFixed(1) + "px;" +
      "transition:transform .4s ease-out,opacity .4s ease-out;opacity:0.9;";
    document.body.appendChild(d);
    requestAnimationFrame(() => {
      d.style.transform = "translate(" + (Math.cos(a) * dist).toFixed(1) + "px," + (Math.sin(a) * dist).toFixed(1) + "px) scale(0.4)";
      d.style.opacity = "0";
    });
    setTimeout(() => d.remove(), 450);
  }
}
document.addEventListener("pointerdown", (e) => {
  if (e.target.closest("button")) pixelBurst(e.clientX, e.clientY, 6, 10, 24);
}, true);
document.addEventListener("pointerover", (e) => {
  const b = e.target.closest("button");
  if (b && !b.dataset.shx) {
    b.dataset.shx = "1";
    const r = b.getBoundingClientRect();
    pixelBurst(r.left + r.width / 2, r.top + r.height / 2, 2, 8, 12);
    setTimeout(() => { delete b.dataset.shx; }, 400);
  }
}, true);

// ---------- boot: apply the persisted look ----------
applyHalloween();
applyBg();
applyCursorMode();
applyFx();
drawChevrons();

// Schedule initial tab overflow check
scheduleTabOverflowCheck();
