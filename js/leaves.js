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
  let keyframes = "";
  switch (animation) {
    case "GENTLE":
      keyframes = `
        @keyframes leafGentle {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
          50% { transform: translateY(-2px) translateX(1px) rotate(1deg); }
        }
      `;
      break;
    case "SWAY":
      keyframes = `
        @keyframes leafSway {
          0%, 100% { transform: translateY(0) translateX(0) rotate(-2deg); }
          50% { transform: translateY(-3px) translateX(2px) rotate(2deg); }
        }
      `;
      break;
    case "DRIFT":
      keyframes = `
        @keyframes leafDrift {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg); }
          33% { transform: translateY(-4px) translateX(-2px) rotate(-1deg); }
          66% { transform: translateY(-2px) translateX(3px) rotate(1deg); }
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
      ${animation !== "NONE" ? `animation: leaf${animation} ${state.leafSpeed || 8}s ease-in-out infinite;` : ""}
    }
    .leaf-container {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: -1;
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
    
    // Random position
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const delay = Math.random() * 10;
    const duration = 10 + Math.random() * 10;
    const size = 12 + Math.random() * 16;
    
    leaf.style.left = `${left}%`;
    leaf.style.top = `${top}%`;
    leaf.style.width = `${size}px`;
    leaf.style.height = `${size}px`;
    leaf.style.animationDelay = `${delay}s`;
    leaf.style.animationDuration = `${duration}s`;
    
    // Random leaf color based on season
    const packIdx = Math.floor(Math.random() * leaves.length);
    const leafDef = leaves[packIdx];
    const colorIdx = Math.floor(Math.random() * leafDef.colors.length);
    leaf.style.backgroundColor = leafDef.colors[colorIdx];
    leaf.style.borderRadius = "50% 0 50% 50%";
    
    container.appendChild(leaf);
  }
}

// Apply leaf settings
function applyLeafSettings() {
  generateLeafAnimationCSS();
  createFallingLeaves();
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
