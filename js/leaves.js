"use strict";

// ---------- Leaf System: Season-dependent falling leaves background ----------

// Leaf Pack Definitions
const LEAF_PACKS = {
  WOODLAND: [
    { name: "White Oak", id: "woodland-white-oak", colors: ["#5E8C4A", "#8FA0B5", "#16181D", "#E8E4DA", "#F49BB0"] },
    { name: "Maple", id: "woodland-maple", colors: ["#55924A", "#6B4A2E"] },
    { name: "Beech", id: "woodland-beech", colors: ["#6F9E5C", "#4C7A3E", "#7A5230"] },
  ],
  AUTUMN: [
    { name: "Autumn Maple", id: "autumn-maple", colors: ["#E87A3B", "#F2C038", "#A67C2E", "#6B4A2E"] },
    { name: "Autumn Red Oak", id: "autumn-red-oak", colors: ["#C94A2A", "#A83B28", "#D9A441"] },
    { name: "Autumn Ginkgo", id: "autumn-ginkgo", colors: ["#F2C038", "#A67C2E"] },
  ],
  EVERGREEN: [
    { name: "Spruce Twig", id: "evergreen-spruce-twig", colors: ["#4E7A3A", "#6B4A2E"] },
    { name: "Pine Needles", id: "evergreen-pine-needles", colors: ["#3D6B4F", "#7A5230"] },
    { name: "Larch Sprig", id: "evergreen-larch-sprig", colors: ["#8FAF6A", "#6B4A2E"] },
  ],
};

// Season to pack mapping
const SEASON_PACKS = {
  SPRING: ["WOODLAND", "EVERGREEN"],
  SUMMER: ["WOODLAND", "EVERGREEN"],
  FALL: ["AUTUMN", "EVERGREEN"],
  WINTER: ["EVERGREEN"],
};

// Leaf animation styles
const LEAF_ANIMATIONS = ["NONE", "GENTLE", "SWAY", "DRIFT"];
const LEAF_ANIMATION_DESC = {
  NONE: "Static leaves - no animation",
  GENTLE: "Very subtle side-to-side movement",
  SWAY: "Gentle swaying motion",
  DRIFT: "Slow drifting with gentle sway",
};

// Get current season based on date
function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 3 && month <= 5) return "SPRING";
  if (month >= 6 && month <= 8) return "SUMMER";
  if (month >= 9 && month <= 11) return "FALL";
  return "WINTER";
}

// Get leaf packs for current season
function getSeasonLeafPacks() {
  const season = state.leafSeasonOverride || getCurrentSeason();
  return SEASON_PACKS[season] || SEASON_PACKS.SPRING;
}

// Get all leaves from season packs
function getSeasonLeaves() {
  const packs = getSeasonLeafPacks();
  const leaves = [];
  for (const packName of packs) {
    const pack = LEAF_PACKS[packName];
    if (pack) leaves.push(...pack);
  }
  return leaves;
}

// Active leaves: an explicitly picked species (any pack) wins,
// otherwise all species from the season's packs
function getActiveLeaves() {
  if (state.leafSpecies) {
    for (const packName of Object.keys(LEAF_PACKS)) {
      const picked = LEAF_PACKS[packName].find((l) => l.id === state.leafSpecies);
      if (picked) return [picked];
    }
  }
  return getSeasonLeaves();
}



// Generate CSS for leaf animation
function generateLeafAnimationCSS() {
  const season = state.leafSeasonOverride || getCurrentSeason();
  const animation = state.leafAnimation || "GENTLE";
  
  // Remove old leaf animation styles
  const oldStyle = document.getElementById("leafAnimationStyles");
  if (oldStyle) oldStyle.remove();

  // Create new style element
  const style = document.createElement("style");
  style.id = "leafAnimationStyles";
  
  // Define keyframes based on animation style
  // Every style is a full fall down the screen; the styles differ in
  // how much the leaf sways/rotates on its way down.
  // Keyframe names are case-sensitive: the name in the animation
  // shorthand below must match the @keyframes name exactly.
  const animName = "leaf" + animation;
  let keyframes = "";
  switch (animation) {
    case "GENTLE":
      keyframes = `
        @keyframes ${animName} {
          0% { transform: translate(0, -14vh) rotate(-8deg); opacity: 0; }
          8% { opacity: 0.7; }
          25% { transform: translate(1.2vw, 18vh) rotate(6deg); }
          50% { transform: translate(-1.2vw, 48vh) rotate(-6deg); }
          75% { transform: translate(1.2vw, 80vh) rotate(6deg); }
          92% { opacity: 0.7; }
          100% { transform: translate(0, 114vh) rotate(-8deg); opacity: 0; }
        }
      `;
      break;
    case "SWAY":
      keyframes = `
        @keyframes ${animName} {
          0% { transform: translate(0, -14vh) rotate(-15deg); opacity: 0; }
          8% { opacity: 0.7; }
          25% { transform: translate(4vw, 15vh) rotate(10deg); }
          50% { transform: translate(-4vw, 45vh) rotate(-10deg); }
          75% { transform: translate(4vw, 78vh) rotate(10deg); }
          92% { opacity: 0.7; }
          100% { transform: translate(0, 114vh) rotate(-15deg); opacity: 0; }
        }
      `;
      break;
    case "DRIFT":
      keyframes = `
        @keyframes ${animName} {
          0% { transform: translate(3vw, -14vh) rotate(0deg); opacity: 0; }
          8% { opacity: 0.7; }
          20% { transform: translate(-6vw, 12vh) rotate(95deg); }
          40% { transform: translate(7vw, 38vh) rotate(-80deg); }
          60% { transform: translate(-5vw, 66vh) rotate(140deg); }
          80% { transform: translate(6vw, 92vh) rotate(-60deg); }
          92% { opacity: 0.7; }
          100% { transform: translate(-2vw, 114vh) rotate(45deg); opacity: 0; }
        }
      `;
      break;
    default:
      keyframes = "";
  }

  // Define leaf container styles
  const leafStyles = `
    .falling-leaf {
      position: absolute;
      width: ${state.leafSize || 16}px;
      height: ${state.leafSize || 16}px;
      opacity: 0.7;
      pointer-events: none;
      z-index: 0;
      ${animation !== "NONE" ? `animation: ${animName} ${state.leafSpeed || 8}s ease-in-out infinite;` : ""}
    }
    .leaf-container {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: -1;
    }
    .falling-leaf svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  `;

  style.textContent = keyframes + leafStyles;
  document.head.appendChild(style);
}

// Create falling leaves effect
function createFallingLeaves() {
  // Remove existing leaves
  const oldContainer = document.getElementById("leafContainer");
  if (oldContainer) oldContainer.remove();

  if (!state.leafEnabled) return;

  const animation = state.leafAnimation || "GENTLE";

  const container = document.createElement("div");
  container.id = "leafContainer";
  container.className = "leaf-container";
  document.body.appendChild(container);

  const season = state.leafSeasonOverride || getCurrentSeason();
  const leaves = getActiveLeaves();
  const leafCount = state.leafCount || 15;

  for (let i = 0; i < leafCount; i++) {
    const leaf = document.createElement("div");
    leaf.className = "falling-leaf";

    // Random position / speed per leaf
    const left = Math.random() * 100;
    // LEAF SIZE setting drives the base size; jitter keeps it organic
    const size = Math.max(4, (state.leafSize || 16) * (0.8 + Math.random() * 0.4));
    // fall duration scales with the ANIMATION SPEED setting, with a bit
    // of per-leaf jitter so the fall stays organic
    const duration = Math.max(3, (state.leafSpeed || 8) * (0.8 + Math.random() * 0.4));

    leaf.style.left = `${left}%`;
    // static scatter only when leaves don't fall; otherwise the keyframes
    // carry the leaf from above the viewport to below it (top stays 0)
    if (animation === "NONE") leaf.style.top = `${Math.random() * 100}%`;
    leaf.style.width = `${size}px`;
    leaf.style.height = `${size}px`;
    // negative delay: every leaf starts mid-fall, so the screen is
    // populated immediately instead of waiting through a delay
    leaf.style.animationDelay = `${-Math.random() * duration}s`;
    leaf.style.animationDuration = `${duration}s`;
    
    // Species sprite: each species has a dot-matrix SVG; fall back to the
    // classic colored blob if the sprite is missing
    const packIdx = Math.floor(Math.random() * leaves.length);
    const leafDef = leaves[packIdx];
    const sprite = getSprite("leaf-" + leafDef.id.replace("-", "-pack-"));
    if (sprite) {
      leaf.innerHTML = sprite;
    } else {
      const colorIdx = Math.floor(Math.random() * leafDef.colors.length);
      leaf.style.backgroundColor = leafDef.colors[colorIdx];
      leaf.style.borderRadius = "50% 0 50% 50%";
    }
    
    container.appendChild(leaf);
  }
}

// Apply leaf settings
function applyLeafSettings() {
  generateLeafAnimationCSS();
  createFallingLeaves();
  // PR1-6: keep the settings mini preview in sync with every leaf change
  // (also invalidates its cached species list)
  if (typeof previewLeavesCache !== "undefined") previewLeavesCache = null;
  if (typeof drawRatPreview === "function") drawRatPreview();
}

// Initialize leaf system
function initLeaves() {
  // Add leaf settings to state if not present
  if (state.leafEnabled === undefined) {
    state.leafEnabled = true;
    state.leafAnimation = "GENTLE";
    state.leafSeasonOverride = null;
    state.leafSpecies = null;
    state.leafSize = 16;
    state.leafSpeed = 8;
    state.leafCount = 15;
    saveState();
  }
  
  // Apply initial settings
  applyLeafSettings();
  
  // Listen for state changes
  // This will be called from settings.js when leaf settings change
}

// Cleanup leaves
function cleanupLeaves() {
  const container = document.getElementById("leafContainer");
  if (container) container.remove();
  const style = document.getElementById("leafAnimationStyles");
  if (style) style.remove();
}
