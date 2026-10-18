"use strict";

// ---------- persisted state (remembered between loads) ----------
const SAVE_KEY = "asciiRat.v6";
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

