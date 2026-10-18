"use strict";

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
  {
    tag: "v5.0.1",
    name: "SEWER REPAIR",
    entries: [
      { s: "major", text: "HOTFIX: Restore code lost at the parting joins" },
      { s: "major", text: "HOTFIX: Remove corrupted js/all.js (reverted to loading 7 parted files directly)" },
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
  updateVerSegs();
  renderBody();
  drawChevrons();
}
function closeLog() {
  overlay.classList.remove("show");
  overlay.setAttribute("aria-hidden", "true");
}
function toggleLog() {
  if (overlay.classList.contains("show")) closeLog();
  else openLog();
}
document.getElementById("mclose").addEventListener("click", closeLog);
document.getElementById("logBtn").addEventListener("click", toggleLog);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeLog();
});
