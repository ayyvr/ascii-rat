"use strict";

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
  if (gameOn) return; // in-game keys (maze moves, Escape) are handled in game.js
  if (e.code === "Space") { e.preventDefault(); spinOn = !spinOn; }
  else if (e.code === "KeyP") toggleParty();
  else if (e.code === "KeyL") toggleLog();
  else if (e.code === "KeyS") toggleSettings();
  else if (e.code === "KeyW") toggleZen();
  else if (e.code === "KeyM") toggleGame();
  // PR1-19: Fix ? keybind - use key property instead of code
  else if (e.key === "?") toggleHelp();
  else if (e.code === "Escape") { closeLog(); closeSettings(); closeGame(); closeHelp(); }
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

// ---------- help overlay ----------
const helpOverlay = document.createElement("div");
helpOverlay.id = "helpOverlay";
helpOverlay.className = "overlay";
helpOverlay.setAttribute("aria-hidden", "true");
// PR1-19: Non-movable help overlay with all hints
helpOverlay.innerHTML = `
  <div class="modal helpModal" role="dialog" aria-modal="true" aria-label="Help">
    <div class="mhead">
      <div class="mtitle">H E L P</div>
      <button id="helpClose" class="mclose" type="button" aria-label="Close">&times;</button>
    </div>
    <div class="mbody">
      <div class="helpContent" id="helpContent">
        <p><strong>CONTROLS</strong></p>
        <p>drag &nbsp;&nbsp; spin the rat</p>
        <p>scroll &nbsp; zoom</p>
        <p class="divider"></p>
        <p><strong>KEYBINDS</strong></p>
        <p>P &nbsp;&nbsp;&nbsp;&nbsp; party mode</p>
        <p>L &nbsp;&nbsp;&nbsp;&nbsp; Rat-Slop Log</p>
        <p>S &nbsp;&nbsp;&nbsp;&nbsp; settings</p>
        <p>W &nbsp;&nbsp;&nbsp;&nbsp; wallpaper (zen) mode</p>
        <p>M &nbsp;&nbsp;&nbsp;&nbsp; maze easter egg</p>
        <p>Space &nbsp; pause</p>
        <p>? &nbsp;&nbsp;&nbsp;&nbsp; help</p>
        <p>Esc &nbsp;&nbsp; close modals</p>
      </div>
    </div>
  </div>
`;
document.body.appendChild(helpOverlay);
const helpClose = document.getElementById("helpClose");
const helpContent = document.getElementById("helpContent");
function toggleHelp() {
  helpOverlay.classList.toggle("show");
  helpOverlay.setAttribute("aria-hidden", helpOverlay.classList.contains("show") ? "false" : "true");
  // PR1-19: Animate in the help content
  if (helpOverlay.classList.contains("show")) {
    helpContent.style.opacity = "0";
    helpContent.style.transform = "translateY(10px)";
    requestAnimationFrame(() => {
      helpContent.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      helpContent.style.opacity = "1";
      helpContent.style.transform = "translateY(0)";
    });
  } else {
    helpContent.style.opacity = "";
    helpContent.style.transform = "";
  }
}
function closeHelp() {
  helpOverlay.classList.remove("show");
  helpOverlay.setAttribute("aria-hidden", "true");
  helpContent.style.opacity = "";
  helpContent.style.transform = "";
}
helpClose?.addEventListener("click", closeHelp);
// Close help when clicking outside (on overlay)
helpOverlay.addEventListener("click", (e) => { if (e.target === helpOverlay) closeHelp(); });

