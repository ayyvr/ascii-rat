"use strict";

// ---------- first visit: rat character creation before anything else ----------
const createOverlay = document.getElementById("createOverlay");
document.getElementById("createGo").addEventListener("click", () => {
  state.setupDone = true;
  saveState();
  createOverlay.classList.remove("show");
  createOverlay.setAttribute("aria-hidden", "true");
  document.body.classList.remove("setup");
  // main rat reveals now, with its entrance animation
  if (state.entrance !== "NONE") entranceT = performance.now();
});
document.getElementById("createReset").addEventListener("click", () => {
  state.rat = JSON.parse(JSON.stringify(DEFAULTS.rat));
  buildRat(state.rat);
  drawRatPreview();
  renderRatSliders(document.getElementById("createSliders"));
});
if (!state.setupDone) {
  document.body.classList.add("setup");
  createOverlay.classList.add("show");
  createOverlay.setAttribute("aria-hidden", "false");
  renderRatSliders(document.getElementById("createSliders"));
  renderPalettes(document.getElementById("createPal"), document.getElementById("createPalName"));
  drawRatPreview();
}


function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // entrance animation progress (1 = settled)
  const ent = entranceT >= 0 ? Math.min(1, (now - entranceT) / 1400) : 1;
  if (ent >= 1) entranceT = -1;

  // momentum: after the cursor lets go, angular velocity keeps
  // adjusting for the glide window on a smoothstep curve back to normal speed
  if (!dragging) {
    const targetH = spinOn && motion !== "WALK" && ent >= 1 ? state.spin : 0;
    if (releaseT >= 0) {
      const t = (now - releaseT) / (state.glide * 1000);
      if (t >= 1) {
        velH = targetH; velV = 0; releaseT = -1;
      } else {
        const f = t * t * (3 - 2 * t);
        velH = releaseFromH + (targetH - releaseFromH) * f;
        velV = releaseFromV * (1 - f);
      }
    } else {
      velH = targetH; velV = 0;
    }
    theta += velH * dt;
    pitch = Math.max(-0.9, Math.min(0.9, pitch + velV * dt));
  }

  // party mode: keep the beat (a gentle bob while spinning)
  const bob = party ? 0.07 * Math.sin(now * 0.006) : 0;
  // ambient motion modes stack on top of drag/momentum state
  const t = now / 1000;
  let ph = pitch + bob, dynZoom = zoom, xOff = 0, yOff = 0;
  const walkT = motion === "WALK" ? t * 9 : 0;
  if (motion === "SCUTTLE") {
    yOff = 0.22 * Math.abs(Math.sin(t * 7));   // hop, hop
    ph += 0.05 * Math.sin(t * 14);             // body lean
  } else if (motion === "WALK") {
    yOff = 0.05 * Math.abs(Math.sin(t * 18));  // body bob at step rate
    ph += 0.03 * Math.sin(t * 18);             // slight stride lean
  } else if (motion === "TUMBLE") {
    ph += 0.55 * Math.sin(now * 0.0012);       // slow full-body tumble
  } else if (motion === "ORBIT") {
    dynZoom = zoom * 0.72;                     // back off so the drift fits
    xOff = 1.4 * Math.cos(t * 0.6);            // lazy lissajous wander
    yOff = 0.9 * Math.sin(t * 1.1);
  } else if (motion === "BREATH") {
    dynZoom = zoom * (1 + 0.09 * Math.sin(t * 1.4)); // slow loom in and out
  }
  // POP entrance: springy scale-up overshoot
  if (ent < 1 && state.entrance === "POP") {
    const c1 = 1.70158, c3 = c1 + 1, u = ent - 1;
    dynZoom *= 1 + c3 * u * u * u + c1 * u * u;
  }
  const cy = Math.cos(theta), sy = Math.sin(theta);
  const cp = Math.cos(ph), sp = Math.sin(ph);
  // rows per world unit (vertical half-extent ~3.2 incl. legs/ears, width ~9 incl. tail)
  const scale = dynZoom * Math.min((ROWS * 0.88) / 3.2, COLS * 0.96 / (9 * CHAR_ASPECT));

  // smooth zoom eases toward the wheel target
  if (state.smoothZoom) zoom += (zoomTarget - zoom) * Math.min(1, dt * 6 * state.zoomSpeed);

  // party mode: cycle the global hue
  if (party) {
    partyHue = (partyHue + 150 * dt) % 360;
    document.body.style.setProperty("--party-hue", partyHue.toFixed(1));
  }

  // clear
  grid.fill(-1e9);

  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    // yaw around Y
    const x1 = p.x * cy + p.z * sy;
    const z1 = -p.x * sy + p.z * cy;
    // pitch around X
    let y2 = p.y * cp - z1 * sp;
    const z2 = p.y * sp + z1 * cp;
    // WAVE mode: jelly undulation along the body
    if (motion === "WAVE") y2 += 0.14 * Math.sin(x1 * 2.5 + now * 0.004 + z1 * 2);
    // WALK mode: diagonal-gait leg pumps
    if (motion === "WALK" && p.tag) {
      const off = p.tag === "FL" || p.tag === "BR" ? 0 : Math.PI;
      y2 += 0.13 * Math.max(0, Math.sin(walkT + off));
    }
    // entrance animation point effects
    if (ent < 1) {
      if (state.entrance === "MATERIALIZE" && p.b > ent) continue;
      if (state.entrance === "RAIN") {
        const ep = Math.min(1, Math.max(0, (ent - p.b * 0.4) / 0.6));
        y2 += (1 - ep) * (1 - ep) * 3.6;
      }
    }

    const col = Math.round(COLS / 2 + (x1 + xOff) * scale * CHAR_ASPECT);
    if (col < 0 || col >= COLS) continue;
    const row = Math.round(ROWS / 2 - (y2 + yOff) * scale);
    if (row < 0 || row >= ROWS) continue;

    const idx = row * COLS + col;
    if (z2 <= grid[idx]) continue;
    grid[idx] = z2;

    let s;
    if (p.f !== undefined) {
      s = p.f;
    } else {
      // rotate normal the same way
      const nx1 = p.nx * cy + p.nz * sy;
      const nz1 = -p.nx * sy + p.nz * cy;
      const ny2 = p.ny * cp - nz1 * sp;
      const nz2 = p.ny * sp + nz1 * cp;
      const d = nx1 * LIGHT[0] + ny2 * LIGHT[1] + nz2 * LIGHT[2];
      s = 0.5 + 0.5 * d;                 // lambert 0..1
      s = Math.pow(s, 0.85);
      if (z2 < -0.4) s *= 0.55;          // dim far side slightly (cheap depth cue)
    }
    chars[idx] = shadeChar(s);
  }

  // build frame, clearing unused cells
  let out = "";
  for (let r = 0; r < ROWS; r++) {
    const start = r * COLS;
    for (let c = 0; c < COLS; c++) {
      const idx = start + c;
      if (grid[idx] === -1e9) chars[idx] = " ";
      out += chars[idx];
    }
    if (r < ROWS - 1) out += "\n";
  }

  if (party) {
    // rainbow waves: each line rides its own hue
    const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    pre.innerHTML = out
      .split("\n")
      .map((ln, r) => {
        const h = (partyHue + r * 13) % 360;
        return '<span style="color:hsl(' + h + ', 95%, 68%)">' + esc(ln) + "</span>";
      })
      .join("\n");
  } else {
    pre.textContent = out;
  }

  // live orientation readout (H = yaw, V = pitch)
  const hdeg = (((theta * 180 / Math.PI) % 360) + 360) % 360;
  const vdeg = (pitch * 180) / Math.PI;
  readout.textContent =
    "H " + hdeg.toFixed(1).padStart(5, "0") + "\u00B0" +
    "   V " + (vdeg < 0 ? "-" : "+") + Math.abs(vdeg).toFixed(1).padStart(4, "0") + "\u00B0";

  // fps counter (toggled in PERFORMANCE)
  fpsFrames++;
  if (now - fpsT >= 500) {
    if (state.fps) fpsEl.textContent = "FPS " + Math.round((fpsFrames * 1000) / (now - fpsT));
    fpsFrames = 0;
    fpsT = now;
  }

  // v5: per-digit odometer slide in the Rat-Slop Log
  if (verAnim) {
    const vp = Math.min(1, (now - verAnim.t0) / 320);
    drawVerSegs(vp, verAnim);
    if (vp >= 1) { verAnim = null; drawVerSegs(0, null); }
  }

  // cursor fx: lagged glow or pixel-dot trail with glitch flicker
  cgx += (cgtx - cgx) * Math.min(1, dt * 14);
  cgy += (cgty - cgy) * Math.min(1, dt * 14);
  glowEl.style.transform = "translate(" + cgx.toFixed(1) + "px, " + cgy.toFixed(1) + "px) translate(-50%, -50%)";
  if (state.cursor === "PIXEL DOTS" || state.cursor === "PIXEL SCATTER") {
    // breadcrumb trail: drop a crumb only while the cursor moves,
    // so the trail stays exactly where the path was and evaporates in place
    if (!trail.length) trail.push({ x: cgtx, y: cgty, t: now });
    const lastCrumb = trail[trail.length - 1];
    if (Math.hypot(cgtx - lastCrumb.x, cgty - lastCrumb.y) > 0.6) {
      trail.push({ x: cgtx, y: cgty, t: now });
    }
    if (trail.length > 48) trail.shift();
  }
  if (state.cursor === "PIXEL DOTS") {
    for (let i = 0; i < cursorDots.length; i++) {
      const d = cursorDots[i];
      const crumb = trail[Math.max(0, trail.length - 1 - i * 3)];
      const fade = Math.max(0, 1 - (now - crumb.t) / 650);
      let gx = crumb.x, gy = crumb.y;
      let op = d.baseOp * fade;
      // glitch: brief jitter + near-fade on rolling beats
      if (Math.sin(now * 0.02 + d.ph) > 0.93) {
        gx += (Math.random() - 0.5) * 7;
        op = 0.12 * fade;
      }
      d.node.style.left = gx.toFixed(1) + "px";
      d.node.style.top = gy.toFixed(1) + "px";
      d.node.style.opacity = op.toFixed(3);
    }
  } else if (state.cursor === "PIXEL SCATTER") {
    // scatter: three small pixels huddle at each crumb, gently orbiting
    // a couple of px so the cluster reads as one chunky trail, not confetti
    for (let i = 0; i < 8; i++) {
      const crumb = trail[Math.max(0, trail.length - 1 - i * 3)];
      const fade = Math.max(0, 1 - (now - crumb.t) / 650);
      for (let j = 0; j < 3; j++) {
        const d = scatterDots[i * 3 + j];
        const a = crumb.t * 0.008 + j * 2.1 + i * 0.7;
        const r = 2 + (j % 2) * 1.5;
        let gx = crumb.x + Math.cos(a) * r;
        let gy = crumb.y + Math.sin(a * 1.3) * r;
        let op = (0.85 - i * 0.1) * fade;
        if (Math.sin(now * 0.02 + d.ph) > 0.94) {
          gx += (Math.random() - 0.5) * 6;
          op *= 0.3;
        }
        d.node.style.left = gx.toFixed(1) + "px";
        d.node.style.top = gy.toFixed(1) + "px";
        d.node.style.opacity = op.toFixed(3);
      }
    }
  }

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
