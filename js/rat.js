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

  // Halloween mode: the head becomes a jack-o'-lantern pumpkin
  const pumpkinHead = state.halloween && isOctober;

  if (pumpkinHead) {
    // ---------- pumpkin head: ridged squashed sphere + stem + carved face ----------
    const prx = 0.68 * hs, pry = 0.55 * hs, prz = 0.72 * hs;
    const lobes = 5, ridgeAmp = 0.13;

    // surface X at a given (y, z) on the pumpkin (ellipsoid approx, no ridge)
    const surfX = (y, z) => {
      const ny = (y - headY) / pry, nz = z / prz;
      const r2 = 1 - ny * ny - nz * nz;
      return r2 > 0 ? headX + prx * Math.sqrt(r2) : headX;
    };
    // glowing face point sitting just in front of the surface
    // (carve marks it for negative-color rendering of the eyes/nose/grin)
    const facePt = (y, z) => {
      pts.push({ x: surfX(y, z) + 0.015, y, z, nx: 1, ny: 0, nz: 0, f: 1, carve: true });
    };

    // Pumpkin body: ridged squashed sphere
    for (let i = 0; i < n(1500); i++) {
      const u = Math.random() * 2 * Math.PI;
      const v = Math.acos(rand(-1, 1));
      const ridge = 1 + ridgeAmp * Math.cos(lobes * u);
      const dx = Math.sin(v) * Math.cos(u);
      const dy = Math.cos(v);
      const dz = Math.sin(v) * Math.sin(u);
      let nx = dx / (prx * ridge), ny = dy / pry, nz = dz / (prz * ridge);
      const nl = Math.hypot(nx, ny, nz) || 1;
      pts.push({
        x: headX + dx * prx * ridge,
        y: headY + dy * pry,
        z: dz * prz * ridge,
        nx: nx / nl, ny: ny / nl, nz: nz / nl,
      });
    }

    // Stem: small tapered cylinder on top, slight forward tilt
    const stemH = 0.22 * hs, stemR = 0.08 * hs;
    for (let i = 0; i < n(60); i++) {
      const u = Math.random() * 2 * Math.PI;
      const t = Math.random();
      const r = stemR * (1 - 0.4 * t);
      const dx = Math.cos(u) * r, dz = Math.sin(u) * r;
      const nl = Math.hypot(dx, dz) || 1;
      pts.push({
        x: headX + 0.05 * hs + dx,
        y: headY + pry + stemH * t,
        z: dz,
        nx: dx / nl, ny: 0.3, nz: dz / nl,
      });
    }

    // Carved face: glowing triangle eyes
    for (const side of [-1, 1]) {
      const ez = side * 0.28 * hs, ey = headY + 0.12 * hs;
      const ew = 0.2 * hs, eh = 0.16 * hs;
      for (let i = 0; i < n(30); i++) {
        const t = Math.random();
        const halfW = (ew / 2) * (1 - t * 0.7);
        facePt(ey - eh / 2 + t * eh, ez + rand(-halfW, halfW));
      }
    }

    // Carved face: glowing triangle nose (pointing down)
    {
      const ny2 = headY - 0.06 * hs, nw = 0.14 * hs, nh = 0.12 * hs;
      for (let i = 0; i < n(20); i++) {
        const t = Math.random();
        const halfW = (nw / 2) * (1 - t * 0.7);
        facePt(ny2 + nh / 2 - t * nh, rand(-halfW, halfW));
      }
    }

    // Carved face: jagged grin mouth - wide and deep, corners curving up
    // past the nose, jagged top edge like teeth
    {
      const my = headY - 0.27 * hs, mw = 0.46 * hs, mh = 0.12 * hs;
      for (let i = 0; i < n(75); i++) {
        const t = Math.random();
        const mz = (t - 0.5) * mw;
        const u = 2 * (t - 0.5);                          // -1 .. 1 across the mouth
        const grin = 0.6 * mh * u * u;                    // smile arc: corners rise
        const zig = Math.abs(Math.sin(t * Math.PI * 3)) * 0.5 * mh;
        facePt(my + grin + rand(-mh / 2, mh / 2) + zig, mz);
      }
    }
  } else {
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
  } // end non-pumpkin head

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

  // Whiskers (skipped for pumpkin head)
  if (!pumpkinHead) {
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
  }

  // staggered birth offsets drive the entrance animations
  for (let i = 0; i < pts.length; i++) pts[i].b = Math.random();
}
buildRat(state.rat);

