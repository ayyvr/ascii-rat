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
  else if (e.code === "QuestionMark") toggleHelp();
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
helpOverlay.innerHTML = `
  <div class="modal" role="dialog" aria-modal="true" aria-label="Help">
    <div class="mhead">
      <div class="mtitle">H E L P</div>
      <button id="helpClose" class="mclose" type="button" aria-label="Close">&times;</button>
    </div>
    <div class="mbody">
      <p class="helpText">drag to spin &middot; scroll to zoom &middot; P party &middot; L log &middot; S settings &middot; W wallpaper &middot; M maze &middot; space pause &middot; ? help</p>
    </div>
  </div>
`;
document.body.appendChild(helpOverlay);
const helpClose = document.getElementById("helpClose");
function toggleHelp() {
  helpOverlay.classList.toggle("show");
  helpOverlay.setAttribute("aria-hidden", helpOverlay.classList.contains("show") ? "false" : "true");
  // F07: fill the screen on mobile
  if (helpOverlay.classList.contains("show")) {
    helpOverlay.querySelector(".modal")?.classList.toggle("mobile-full", isMobileDevice());
  }
}
function closeHelp() {
  helpOverlay.classList.remove("show");
  helpOverlay.setAttribute("aria-hidden", "true");
}
helpClose?.addEventListener("click", closeHelp);
helpOverlay.addEventListener("click", (e) => { if (e.target === helpOverlay) closeHelp(); });

