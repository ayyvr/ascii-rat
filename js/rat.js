"use strict";

// ---------- character ramps (light -> dense); preset-pickable in Settings ----------
const RAMPS = {
  MINIMAL: " .:-",
  CLASSIC: " .:-=+*#%@",
  GLYPH: " .':^\"~+-=!*#%$@",
  BLOCKS: " .:\u2591\u2592\u2593\u2588",
};
let ramp = RAMPS.GLYPH;
const shadeChar = (s) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.round(s * (ramp.length - 1))))];

// ---------- 3D point cloud of a rat (faces +X, up is +Y, viewer is +Z) ----------
const pts = []; // {x,y,z, nx,ny,nz, f?} f = forced shade

const rand = (a, b) => a + Math.random() * (b - a);

function ellipsoid(cx, cy, cz, rx, ry, rz, n, opts = {}) {
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 * Math.PI;
    const v = Math.acos(rand(-1, 1));
    const dx = Math.sin(v) * Math.cos(u);
    const dy = Math.cos(v);
    const dz = Math.sin(v) * Math.sin(u);
    let nx = dx / rx, ny = dy / ry, nz = dz / rz;
    const nl = Math.hypot(nx, ny, nz) || 1;
    pts.push({
      x: cx + dx * rx, y: cy + dy * ry, z: cz + dz * rz,
      nx: nx / nl, ny: ny / nl, nz: nz / nl,
      f: opts.force,
      tag: opts.tag,
    });
  }
}

// ---------- rat construction: fully parametric (character creation) ----------
function buildRat(p) {
  pts.length = 0;
  const D = state.density;
  const n = (base) => Math.max(6, Math.round(base * D));
  const chunk = p.bodyChunk, len = p.bodyLen;
  const bodyRx = 1.55 * len, bodyRy = 0.95 * chunk, bodyRz = 0.85 * chunk;
  const hs = p.headSize;
  const headX = bodyRx + 0.35 * hs, headY = 0.28;

  // Body: plump ellipsoid, slightly tapered rear
  ellipsoid(0, 0, 0, bodyRx, bodyRy, bodyRz, n(2600));
  ellipsoid(-1.0 * len, 0.05, 0, 1.15 * len, 0.8 * chunk, 0.72 * chunk, n(1100));

  // Head + cheeks
  ellipsoid(headX, headY, 0, 0.72 * hs, 0.6 * hs, 0.6 * hs, n(1300));
  ellipsoid(headX + 0.25 * hs, 0.1, 0, 0.45 * hs, 0.4 * hs, 0.42 * hs, n(350));

  // Snout: cone from head to nose tip
  (function snout() {
    const baseX = headX + 0.25 * hs, baseY = 0.18 * hs;
    const tipX = baseX + 0.8 * p.snoutLen * hs, tipY = 0.02;
    const segs = 12, ring = 14;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const cx = baseX + (tipX - baseX) * t;
      const cy = baseY + (tipY - baseY) * t;
      const r = (0.34 * (1 - t) * (1 - t) + 0.03) * hs;
      for (let j = 0; j < ring; j++) {
        const a = (j / ring) * Math.PI * 2 + t * 2;
        const dz = Math.cos(a) * r, dy = Math.sin(a) * r;
        const nl = Math.hypot(1, dy, dz) || 1;
        pts.push({ x: cx, y: cy + dy, z: dz, nx: 1 / nl, ny: dy / nl, nz: dz / nl });
      }
    }
    // nose
    ellipsoid(tipX + 0.02, tipY, 0, 0.07 * hs, 0.06 * hs, 0.06 * hs, n(26), { force: 1 });
  })();

  // Ears: thin discs, slightly cupped forward
  for (const side of [-1, 1]) {
    ellipsoid(headX - 0.05 * hs, headY + 0.64 * hs, side * 0.48 * hs,
      0.16 * p.earSize, 0.34 * p.earSize, 0.1 * p.earSize, n(210));
    ellipsoid(headX - 0.05 * hs, headY + 0.64 * hs, side * 0.52 * hs,
      0.2 * p.earSize, 0.4 * p.earSize, 0.06 * p.earSize, n(90));
  }

  // Eyes
  for (const side of [-1, 1]) {
    ellipsoid(headX + 0.38 * hs, headY + 0.14 * hs, side * 0.38 * hs,
      0.1 * p.eyeSize, 0.11 * p.eyeSize, 0.1 * p.eyeSize, n(24), { force: 0.95 });
  }

  // Legs (tagged FL/FR/BL/BR so WALK can animate the gait)
  const legRy = 0.55 * p.legLen;
  const legCy = -(0.4 * chunk + legRy);
  for (const [lx, fb] of [[0.75 * bodyRx, "F"], [-0.6 * bodyRx, "B"]]) {
    for (const side of [-1, 1]) {
      const tag = fb + (side < 0 ? "L" : "R");
      ellipsoid(lx, legCy, side * 0.48 * chunk, 0.15, legRy, 0.15, n(170), { tag });
      ellipsoid(lx + 0.12, legCy - legRy + 0.09, side * 0.48 * chunk,
        0.16, 0.09, 0.13, n(60), { tag }); // foot
    }
  }

  // Tail: long, tapering, with a curl set by TAIL CURL
  (function tail() {
    const segs = 90, ring = 9;
    const x0 = -1.45 * len, span = 2.9 * p.tailLen, curl = p.tailCurl;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = x0 - span * t;
      const y = -0.35 * chunk + 0.15 * curl * Math.sin(t * 2.2) + 1.35 * curl * t * t - 0.35 * t;
      const z = 0.28 * Math.sin(t * 4.5) * (1 - t * 0.4);
      const r = (0.13 * (1 - t) + 0.025) * chunk;
      for (let j = 0; j < ring; j++) {
        const a = (j / ring) * Math.PI * 2 + t * 3;
        const dy = Math.cos(a) * r, dz = Math.sin(a) * r;
        const nl = Math.hypot(dy, dz) || 1;
        pts.push({ x, y: y + dy, z: z + dz, nx: 0, ny: dy / nl, nz: dz / nl });
      }
    }
  })();

  // Whiskers
  const whiskX = headX + 0.25 * hs + 0.8 * p.snoutLen * hs - 0.15;
  for (const side of [-1, 1]) {
    for (let w = 0; w < 3; w++) {
      const spread = (0.22 + w * 0.2) * p.whiskerLen;
      const droop = 0.05 - w * 0.08;
      for (let k = 0; k <= 14; k++) {
        const t = k / 14;
        pts.push({
          x: whiskX + 1.1 * p.whiskerLen * t,
          y: 0.12 + droop * t,
          z: side * (0.15 + spread * t),
          nx: 0, ny: 1, nz: side * 0.6,
        });
      }
    }
  }

  // staggered birth offsets drive the entrance animations
  for (let i = 0; i < pts.length; i++) pts[i].b = Math.random();
}
buildRat(state.rat);

