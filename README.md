# ASCII Rat

A 3D rat rendered as pure ASCII in your browser. No libraries, no build step, no canvas pixels — just a z-buffered grid of characters and a point cloud shaped like a rat.

## Run it

Clone (or download) and open `index.html` — that's it. Classic script tags, so it works straight from `file://`. No server, no npm.

## What's in the box

- A fully parametric rat: 10 sliders sculpt body length, chunkiness, ears, snout, tail curl, whisker reach, and more. First visit drops you into the rat builder.
- Motions: spin, wave, walk, scuttle, tumble, orbit, breath — with momentum release when you let go of a drag.
- Character ramps (MINIMAL / CLASSIC / GLYPH / BLOCKS), palettes, pixel-themed backgrounds, and a pixel-dot cursor trail.
- Rat-Slop Log: the in-app changelog, with a dot-matrix release stepper for browsing versions.
- Rat maze easter egg: click the title (or press `M`) and navigate a rodent through a puzzle.
- Halloween mode lurks in Settings during October only.
- Share your rat: the RAT tab in Settings mints a `?rat=` link of rat-phrases (`noodle-chonk-radar-catfish-...`) that carries ONLY the rat — every other setting stays unique to whoever opens it.

## Controls

| Input | Action |
| --- | --- |
| drag | spin the rat |
| scroll | zoom |
| `P` | party mode |
| `L` | Rat-Slop Log |
| `S` | settings |
| `W` | wallpaper (zen) mode |
| `M` | maze easter egg |
| space | pause |

## Project layout

Parted out for human reviewability — seven plain scripts loaded in order by `index.html`:

| File | Responsibility |
| --- | --- |
| `index.html` | markup + script/link tags |
| `styles.css` | all styling (palette vars, modals, FX) |
| `js/state.js` | persisted settings, defaults, rat share codes |
| `js/rat.js` | character ramps, 3D point cloud, parametric `buildRat()` |
| `js/render.js` | z-buffered ASCII renderer, interaction, party mode |
| `js/log.js` | Rat-Slop Log + dot-matrix release stepper |
| `js/settings.js` | settings modal, builder preview, cursor trail, button FX |
| `js/game.js` | rat maze easter egg |
| `js/main.js` | first-run builder, animation frame loop |

## Version

v5.0.0 — SEWER SHARE. Full history lives in the Rat-Slop Log (press `L`).
