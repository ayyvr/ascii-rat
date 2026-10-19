"use strict";

// ---------- New Share Format (F06) ----------

// Generate short share code from state
// Format: ?r=ABC123 where ABC = rat type, 123 = hash
const SHARE_KEY = "asciiRat.v6";
const OLD_SHARE_KEYS = ["asciiRat.v4", "asciiRat.v5"];

// Character sets for encoding
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const RAT_NAMES = [
  "ALBINO", "SHADOW", "GHOST", "STANDARD", "CHONK", "NOODLE", "SATAN",
  "BIBBLE", "SQUEAK", "WHISKER", "FUZZ", "TINY", "BIG", "MEGA",
  "PUG", "ANTEATER", "OWL", "GIRRAFE", "RADAR", "CORKSCREW",
];

// Map rat parameters to a 3-character code
function encodeRatParams(rat) {
  const params = [
    rat.bodyLen, rat.bodyChunk, rat.headSize, rat.earSize, rat.snoutLen,
    rat.eyeSize, rat.legLen, rat.tailLen, rat.tailCurl, rat.whiskerLen
  ];
  
  let code = "";
  for (const param of params) {
    // Normalize to 0-6 range
    const normalized = Math.max(0, Math.min(6, Math.round((param - 0.6) / 0.15)));
    code += ALPHABET[normalized];
  }
  
  return code;
}

// Encode state to short share code
function encodeShareCode() {
  // Encode rat parameters
  const ratCode = encodeRatParams(state.rat);
  
  // Add motion and palette
  const motionIndex = ["SPIN", "WAVE", "WALK", "SCUTTLE", "TUMBLE", "ORBIT", "BREATH"].indexOf(state.motion);
  const paletteIndex = ["PHOSPHOR", "AMBER", "ICE", "VAPOR", "BLOOD", "MONO", "HALLOWEEN"].indexOf(state.palette);
  
  const motionChar = ALPHABET[motionIndex % ALPHABET.length];
  const paletteChar = ALPHABET[paletteIndex % ALPHABET.length];
  
  // Combine: RAT_CODE + MOTION + PALETTE + CHECKSUM
  const checksum = calculateChecksum(ratCode + motionChar + paletteChar);
  const checksumChar = ALPHABET[checksum % ALPHABET.length];
  
  return ratCode + motionChar + paletteChar + checksumChar;
}

// Simple checksum calculation
function calculateChecksum(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    sum += str.charCodeAt(i) * (i + 1);
  }
  return sum % ALPHABET.length;
}

// Validate checksum
function validateChecksum(code) {
  if (code.length < 4) return false;
  
  const content = code.slice(0, -1);
  const receivedChecksum = code.slice(-1);
  const calculatedChecksum = ALPHABET[calculateChecksum(content) % ALPHABET.length];
  
  return receivedChecksum === calculatedChecksum;
}

// Decode short share code to state
function decodeShareCode(code) {
  if (!code || code.length < 4) return null;
  
  // Validate checksum
  if (!validateChecksum(code)) {
    showNotification("Invalid share code checksum", "error");
    return null;
  }
  
  const ratCode = code.slice(0, 10);
  const motionChar = code[10];
  const paletteChar = code[11];
  
  // Decode rat parameters
  const rat = {};
  const paramKeys = ["bodyLen", "bodyChunk", "headSize", "earSize", "snoutLen", "eyeSize", "legLen", "tailLen", "tailCurl", "whiskerLen"];
  const paramDefs = {
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
  
  for (let i = 0; i < 10 && i < ratCode.length; i++) {
    const char = ratCode[i];
    const index = ALPHABET.indexOf(char);
    if (index === -1) continue;
    
    const key = paramKeys[i];
    const def = paramDefs[key];
    if (def) {
      rat[key] = def.min + (index / 6) * (def.max - def.min);
    }
  }
  
  // Decode motion
  const motionIndex = ALPHABET.indexOf(motionChar);
  const motions = ["SPIN", "WAVE", "WALK", "SCUTTLE", "TUMBLE", "ORBIT", "BREATH"];
  const motion = motions[motionIndex % motions.length];
  
  // Decode palette
  const paletteIndex = ALPHABET.indexOf(paletteChar);
  const palettes = ["PHOSPHOR", "AMBER", "ICE", "VAPOR", "BLOOD", "MONO", "HALLOWEEN"];
  const palette = palettes[paletteIndex % palettes.length];
  
  return { rat, motion, palette };
}

// Apply share code to state
function applyShareCode(code) {
  const decoded = decodeShareCode(code);
  if (!decoded) return false;

  // Apply rat parameters
  state.rat = { ...state.rat, ...decoded.rat };
  state.motion = decoded.motion;
  state.palette = decoded.palette;

  // Rebuild the live rat and apply motion/palette so the shared look
  // shows immediately (this module loads after rat/render/settings)
  buildRat(state.rat);
  motion = decoded.motion;
  applyPalette(PALETTES.find((p) => p.name === decoded.palette) || PALETTES[0]);

  saveState();
  return true;
}

// Generate share URL
function generateShareURL() {
  const code = encodeShareCode();
  // location.origin is "null" on file:// pages; build from the current URL instead
  return `${location.href.split(/[?#]/)[0]}?r=${code}`;
}

// Auto-translate old URLs
function checkOldShareFormat() {
  const params = new URLSearchParams(location.search);
  
  // Check for old 'rat' parameter
  const oldRat = params.get("rat");
  if (oldRat) {
    // Try to translate old format
    showNotification("Old share format detected, translating...", "info");
    
    // The old format was word-based, try to apply it
    if (applyRatCode(oldRat)) {
      showNotification("Translated old share code successfully!", "success");
      
      // Update URL to new format
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

// Copy share URL to clipboard
async function copyShareURL() {
  const url = generateShareURL();
  try {
    await navigator.clipboard.writeText(url);
    showNotification("Copied to clipboard!", "success");
    return true;
  } catch (e) {
    // Fallback for older browsers
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

// Initialize share system
function initShare() {
  // Check for share code in URL
  checkOldShareFormat();
  
  // Expose to window
  window.encodeShareCode = encodeShareCode;
  window.decodeShareCode = decodeShareCode;
  window.applyShareCode = applyShareCode;
  window.generateShareURL = generateShareURL;
  window.copyShareURL = copyShareURL;
}

// Initialize on script load
initShare();
