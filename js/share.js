"use strict";

// ---------- Share Format v2: full setup (rat + animations + style + preferences) ----------
// v1 (13 chars, legacy): rat(10) + motion(1) + palette(1) + checksum(1)
// v2 (31 chars): rat(10) + motion(1) + palette(1) + spin(1) + glide(1) +
//   entrance(1) + ramp(1) + bg(1) + density(1) + zoomSpeed(1) + cursor(1) +
//   leafAnim(1) + leafSpecies(1) + leafSize(1) + leafSpeed(1) + leafCount(1) +
//   leafSeason(1) + volume(2) + booleans(2) + checksum(1)
//
// Booleans packed into 2 base-62 chars (8-bit bitmask):
//   bit 0: halloween   bit 4: soundEnabled
//   bit 1: leafEnabled bit 5: fx (phosphor)
//   bit 2: momentum    bit 6: fps
//   bit 3: smoothZoom  bit 7: party

const SHARE_KEY = "asciiRat.v6";
const OLD_SHARE_KEYS = ["asciiRat.v4", "asciiRat.v5"];

// Character set for encoding (62 chars)
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// Option name lists — must match settings.js / leaves.js / state.js
const MOTION_NAMES = ["SPIN", "WAVE", "WALK", "SCUTTLE", "TUMBLE", "ORBIT", "BREATH"];
const PALETTE_NAMES = ["PHOSPHOR", "AMBER", "ICE", "VAPOR", "BLOOD", "MONO", "HALLOWEEN"];
const ENTRANCE_NAMES = ["MATERIALIZE", "RAIN", "POP", "NONE"];
const RAMP_NAMES = ["MINIMAL", "CLASSIC", "GLYPH", "BLOCKS"];
const BG_NAMES = ["CLASSIC", "PIXEL GRID", "STARFIELD", "PIXEL RAIN", "FALL LEAVES"];
const CURSOR_NAMES = ["PIXEL DOTS", "PIXEL SCATTER", "GLOW", "OFF"];
const LEAF_ANIM_NAMES = ["NONE", "GENTLE", "SWAY", "DRIFT"];
const SEASON_NAMES = ["NONE", "SPRING", "SUMMER", "FALL", "WINTER"];

// Rat param keys and ranges (must match RAT_DEFS in state.js)
const RAT_PARAM_KEYS = ["bodyLen", "bodyChunk", "headSize", "earSize", "snoutLen", "eyeSize", "legLen", "tailLen", "tailCurl", "whiskerLen"];
const RAT_PARAM_DEFS = {
  bodyLen: { min: 0.6, max: 1.5 },
  bodyChunk: { min: 0.6, max: 1.5 },
  headSize: { min: 0.5, max: 1.6 },
  earSize: { min: 0.4, max: 2 },
  snoutLen: { min: 0.4, max: 1.8 },
  eyeSize: { min: 0.5, max: 2 },
  legLen: { min: 0.5, max: 1.6 },
  tailLen: { min: 0.4, max: 1.8 },
  tailCurl: { min: 0.2, max: 2 },
  whiskerLen: { min: 0.3, max: 2 },
};

// ---------- helpers ----------

// Clamp a number to an integer range
function clampInt(v, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

// Encode a continuous value as a single ALPHABET char
function encodeStep(value, min, step, count) {
  const idx = clampInt((value - min) / step, 0, count - 1);
  return ALPHABET[idx];
}

// Decode a single ALPHABET char back to a continuous value
function decodeStep(char, min, step) {
  const idx = ALPHABET.indexOf(char);
  if (idx < 0) return min;
  return min + idx * step;
}

// Encode an option name as a single ALPHABET char
function encodeOption(value, names) {
  const idx = clampInt(names.indexOf(value), 0, names.length - 1);
  return ALPHABET[idx];
}

// Decode a single ALPHABET char back to an option name
function decodeOption(char, names) {
  const idx = ALPHABET.indexOf(char);
  if (idx < 0 || idx >= names.length) return names[0];
  return names[idx];
}

// Encode a 0-255 value as 2 base-62 chars
function encode2Char(value) {
  const v = clampInt(value, 0, 255);
  return ALPHABET[Math.floor(v / 62)] + ALPHABET[v % 62];
}

// Decode 2 base-62 chars back to a 0-255 value
function decode2Char(str) {
  const hi = ALPHABET.indexOf(str[0]);
  const lo = ALPHABET.indexOf(str[1]);
  if (hi < 0 || lo < 0) return 0;
  return hi * 62 + lo;
}

// Get the leaf species list (index 0 = AUTO / null)
function getLeafSpeciesList() {
  const list = [""];
  if (typeof LEAF_PACKS !== "undefined") {
    Object.keys(LEAF_PACKS).forEach((packName) => {
      LEAF_PACKS[packName].forEach((leaf) => list.push(leaf.id));
    });
  }
  return list;
}

// ---------- rat param encoding (unchanged from v1 for backwards compat) ----------

function encodeRatParams(rat) {
  let code = "";
  for (const key of RAT_PARAM_KEYS) {
    const def = RAT_PARAM_DEFS[key];
    const f = (rat[key] - def.min) / (def.max - def.min);
    const i = Math.max(0, Math.min(6, Math.round(f * 6)));
    code += ALPHABET[i];
  }
  return code;
}

// ---------- checksum (unchanged) ----------

function calculateChecksum(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i) * (i + 1);
  }
  return sum % ALPHABET.length;
}

function validateChecksum(code) {
  if (code.length < 4) return false;
  const content = code.slice(0, -1);
  const receivedChecksum = code.slice(-1);
  const calculatedChecksum = ALPHABET[calculateChecksum(content) % ALPHABET.length];
  return receivedChecksum === calculatedChecksum;
}

// ---------- encode: full state → share code ----------

function encodeShareCode() {
  // Rat body (10 chars, same as v1)
  const ratCode = encodeRatParams(state.rat);

  // Motion + palette (2 chars, same as v1)
  const motionChar = encodeOption(state.motion, MOTION_NAMES);
  const paletteChar = encodeOption(state.palette, PALETTE_NAMES);

  // Animation settings
  const spinChar = encodeStep(state.spin, 0, 0.05, 41);        // 0.00–2.00
  const glideChar = encodeStep(state.glide, 0.2, 0.1, 29);     // 0.2–3.0

  // Style settings
  const entranceChar = encodeOption(state.entrance, ENTRANCE_NAMES);
  const rampChar = encodeOption(state.ramp, RAMP_NAMES);
  const bgChar = encodeOption(state.bg, BG_NAMES);
  const densityChar = encodeStep(state.density, 0.3, 0.05, 35); // 0.30–2.00

  // Preferences
  const zoomChar = encodeStep(state.zoomSpeed, 0.25, 0.05, 56); // 0.25–3.00
  const cursorChar = encodeOption(state.cursor, CURSOR_NAMES);

  // Leaf settings
  const leafAnimChar = encodeOption(state.leafAnimation, LEAF_ANIM_NAMES);
  const speciesList = getLeafSpeciesList();
  const leafSpeciesChar = encodeOption(state.leafSpecies || "", speciesList);
  const leafSizeChar = encodeStep(state.leafSize || 16, 8, 1, 25);   // 8–32
  const leafSpeedChar = encodeStep(state.leafSpeed || 8, 2, 1, 19);   // 2–20
  const leafCountChar = encodeStep(state.leafCount || 15, 5, 1, 46);  // 5–50
  const leafSeasonChar = encodeOption(state.leafSeasonOverride || "NONE", SEASON_NAMES);

  // Sound volume (2 chars, 0–100 → 0.00–1.00)
  const volVal = clampInt((state.soundVolume !== undefined ? state.soundVolume : 0.5) * 100, 0, 100);
  const volChars = (function() {
    const hi = Math.floor(volVal / 62), lo = volVal % 62;
    return ALPHABET[hi] + ALPHABET[lo];
  })();

  // Booleans packed into 2 chars (8-bit bitmask)
  let bits = 0;
  if (state.halloween) bits |= 1;
  if (state.leafEnabled) bits |= 2;
  if (state.momentum) bits |= 4;
  if (state.smoothZoom) bits |= 8;
  if (state.soundEnabled !== false) bits |= 16;
  if (state.fx) bits |= 32;
  if (state.fps) bits |= 64;
  if (state.party) bits |= 128;
  const boolChars = encode2Char(bits);

  // Assemble content (30 chars) + checksum
  const content = ratCode + motionChar + paletteChar +
    spinChar + glideChar + entranceChar + rampChar + bgChar + densityChar +
    zoomChar + cursorChar + leafAnimChar + leafSpeciesChar +
    leafSizeChar + leafSpeedChar + leafCountChar + leafSeasonChar +
    volChars + boolChars;

  const checksumChar = ALPHABET[calculateChecksum(content) % ALPHABET.length];
  return content + checksumChar;
}

// ---------- decode: share code → state object ----------

function decodeShareCode(code) {
  if (!code || code.length < 4) return null;
  if (!validateChecksum(code)) {
    showNotification("Invalid share code checksum", "error");
    return null;
  }

  const isV2 = code.length > 13;
  const ratCode = code.slice(0, 10);
  const motionChar = code[10];
  const paletteChar = code[11];

  // Decode rat parameters (same as v1)
  const rat = {};
  for (let i = 0; i < 10 && i < ratCode.length; i++) {
    const index = ALPHABET.indexOf(ratCode[i]);
    if (index === -1) continue;
    const key = RAT_PARAM_KEYS[i];
    const def = RAT_PARAM_DEFS[key];
    if (def) {
      rat[key] = def.min + (index / 6) * (def.max - def.min);
    }
  }

  // Decode motion + palette
  const motion = decodeOption(motionChar, MOTION_NAMES);
  const palette = decodeOption(paletteChar, PALETTE_NAMES);

  const result = { rat, motion, palette, version: isV2 ? 2 : 1 };

  // v2: decode the additional settings
  if (isV2 && code.length >= 31) {
    result.spin = decodeStep(code[12], 0, 0.05);
    result.glide = decodeStep(code[13], 0.2, 0.1);
    result.entrance = decodeOption(code[14], ENTRANCE_NAMES);
    result.ramp = decodeOption(code[15], RAMP_NAMES);
    result.bg = decodeOption(code[16], BG_NAMES);
    result.density = decodeStep(code[17], 0.3, 0.05);
    result.zoomSpeed = decodeStep(code[18], 0.25, 0.05);
    result.cursor = decodeOption(code[19], CURSOR_NAMES);
    result.leafAnimation = decodeOption(code[20], LEAF_ANIM_NAMES);

    // Leaf species
    const speciesList = getLeafSpeciesList();
    const speciesIdx = ALPHABET.indexOf(code[21]);
    result.leafSpecies = (speciesIdx > 0 && speciesIdx < speciesList.length) ? speciesList[speciesIdx] : null;

    result.leafSize = decodeStep(code[22], 8, 1);
    result.leafSpeed = decodeStep(code[23], 2, 1);
    result.leafCount = decodeStep(code[24], 5, 1);
    result.leafSeasonOverride = decodeOption(code[25], SEASON_NAMES);
    if (result.leafSeasonOverride === "NONE") result.leafSeasonOverride = null;

    // Sound volume (2 chars)
    result.soundVolume = decode2Char(code.slice(26, 28)) / 100;

    // Booleans (2 chars, 8-bit bitmask)
    const bits = decode2Char(code.slice(28, 30));
    result.halloween = !!(bits & 1);
    result.leafEnabled = !!(bits & 2);
    result.momentum = !!(bits & 4);
    result.smoothZoom = !!(bits & 8);
    result.soundEnabled = !!(bits & 16);
    result.fx = !!(bits & 32);
    result.fps = !!(bits & 64);
    result.party = !!(bits & 128);
  }

  return result;
}

// ---------- apply: decoded state → live state + side effects ----------

function applyShareCode(code) {
  const decoded = decodeShareCode(code);
  if (!decoded) return false;

  // --- Rat body (always present) ---
  state.rat = { ...state.rat, ...decoded.rat };

  // --- Animation (always present) ---
  state.motion = decoded.motion;

  // --- Palette (always present) ---
  state.palette = decoded.palette;

  // --- v2 fields (only apply if present in the code) ---
  if (decoded.version >= 2) {
    // Animation
    state.spin = decoded.spin;
    state.glide = decoded.glide;
    state.momentum = decoded.momentum;
    state.entrance = decoded.entrance;

    // Style
    state.ramp = decoded.ramp;
    state.bg = decoded.bg;
    state.density = decoded.density;
    state.halloween = decoded.halloween;
    state.leafEnabled = decoded.leafEnabled;
    state.leafAnimation = decoded.leafAnimation;
    state.leafSpecies = decoded.leafSpecies;
    state.leafSize = decoded.leafSize;
    state.leafSpeed = decoded.leafSpeed;
    state.leafCount = decoded.leafCount;
    state.leafSeasonOverride = decoded.leafSeasonOverride;

    // Preferences
    state.cursor = decoded.cursor;
    state.smoothZoom = decoded.smoothZoom;
    state.zoomSpeed = decoded.zoomSpeed;

    // Performance
    state.fps = decoded.fps;
    state.fx = decoded.fx;
    state.soundEnabled = decoded.soundEnabled;
    state.soundVolume = decoded.soundVolume;

    // Party
    state.party = decoded.party;
  }

  // ---------- side effects: push state into the live renderers ----------

  // Rebuild the 3D rat (picks up body params + density + halloween pumpkin head)
  buildRat(state.rat);

  // Motion variable (read by the render loop in render.js)
  motion = state.motion;

  // Character ramp (read by shadeChar in rat.js)
  ramp = RAMPS[state.ramp] || RAMPS.GLYPH;

  // Halloween mode (toggles body class + may override palette)
  applyHalloween();

  // Palette: if Halloween is active, force HALLOWEEN palette; otherwise use
  // the shared palette. Use decoded.palette (not state.palette) because
  // applyHalloween() above may have overwritten state.palette.
  const targetPal = (state.halloween && isOctober) ? "HALLOWEEN" : decoded.palette;
  state.palette = PALETTE_NAMES.includes(targetPal) ? targetPal : "PHOSPHOR";
  applyPalette(PALETTES.find((p) => p.name === state.palette) || PALETTES[0]);

  // Background
  applyBg();

  // Cursor mode
  applyCursorMode();

  // Phosphor FX (scanlines + vignette)
  applyFx();

  // Falling leaves
  if (typeof applyLeafSettings === "function") applyLeafSettings();

  // Sound
  if (typeof setSoundEnabled === "function") setSoundEnabled(state.soundEnabled);
  if (typeof setSoundVolume === "function") setSoundVolume(state.soundVolume);
  if (typeof syncMuteUI === "function") syncMuteUI();

  // FPS counter
  if (typeof fpsEl !== "undefined") {
    fpsEl.classList.toggle("on", state.fps);
    if (!state.fps) fpsEl.textContent = "";
  }

  // Party mode (update both the variable and the UI)
  party = state.party;
  if (typeof partyBtn !== "undefined") partyBtn.classList.toggle("on", party);
  document.body.classList.toggle("party", party);

  // Refresh the settings/creation preview canvases
  if (typeof drawRatPreview === "function") drawRatPreview();

  saveState();
  return true;
}

// ---------- URL generation (unchanged) ----------

function generateShareURL() {
  const code = encodeShareCode();
  // location.origin is "null" on file:// pages; build from the current URL instead
  return `${location.href.split(/[?#]/)[0]}?r=${code}`;
}

// ---------- old URL format translation (unchanged) ----------

function checkOldShareFormat() {
  const params = new URLSearchParams(location.search);

  // Check for old 'rat' parameter (word-based format)
  const oldRat = params.get("rat");
  if (oldRat) {
    showNotification("Old share format detected, translating...", "info");
    if (applyRatCode(oldRat)) {
      showNotification("Translated old share code successfully!", "success");
      const newCode = encodeShareCode();
      const newURL = `${location.href.split(/[?#]/)[0]}?r=${newCode}`;
      window.history.replaceState({}, "", newURL);
    } else {
      showNotification("Failed to translate old share code", "warning");
    }
    return true;
  }

  // Check for new 'r' parameter
  const newCode = params.get("r");
  if (newCode) {
    if (applyShareCode(newCode)) {
      showNotification("Loaded share code!", "success");
    } else {
      showNotification("Invalid share code", "error");
    }
    return true;
  }

  return false;
}

// ---------- clipboard (unchanged) ----------

async function copyShareURL() {
  const url = generateShareURL();
  try {
    await navigator.clipboard.writeText(url);
    showNotification("Copied to clipboard!", "success");
    return true;
  } catch (e) {
    const textarea = document.createElement("textarea");
    textarea.value = url;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      showNotification("Copied to clipboard!", "success");
      return true;
    } catch (e2) {
      showNotification("Failed to copy", "error");
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

// ---------- init ----------

function initShare() {
  checkOldShareFormat();
  window.encodeShareCode = encodeShareCode;
  window.decodeShareCode = decodeShareCode;
  window.applyShareCode = applyShareCode;
  window.generateShareURL = generateShareURL;
  window.copyShareURL = copyShareURL;
}

initShare();
