# Changelog — ASCII Rat

Full release history, mirrored from the in-app Rat-Slop Log (press `L`). Severity: `>>` major, `>` medium, `~` minor.

## v6.0.0 — PIXEL PLUNDER

- >> RAT MAZE overhauled: pixel-art 32x32 tiles with sprite-rendered rat and cheese (color blobs retired), mobile joystick, scoring, cheese types and a leaderboard - mazes grow with every cheese
- >> SOUND SYSTEM: Web Audio chip-tune SFX on move, collision, cheese and level-up - one mute control governs everything
- >> NEW SHARE FORMAT: rat codes are now short character+number strings (?r=) with auto-translate of old rat-phrase links
- >> LEAF SYSTEM: season-dependent falling leaves rendered from SVG sprites, with fall sway - replaces the old color blobs
- >> SPRITE LIBRARY: real SVG leaf, rat and cheese sprites with graceful fallback
- >> Settings tabs rebuilt as an actual tab strip (rounded tops, shared bar) with a working overflow dropdown for narrow screens
- >> INTERACTIVE PREVIEWS: drag to rotate and wheel-zoom the rat in builder and settings, with auto-spin toggle and a single live mini preview
- >> NOTIFICATION HISTORY panel: every toast and notice is browsable after it fades
- > Entrance animation re-triggers instantly when you change entrance style; Entrance options moved into STYLE
- > Builder gets a RESET RAT button opposite RELEASE THE RAT; settings gets its own reset too
- > New SHARE tab with rat code display, copy-link and a DIAGNOSTICS section (version + localStorage status)
- > ? key opens a help overlay listing every keyboard shortcut; Escape closes it
- > Halloween mode sky rebuilt: a single static moon slowly arcing, scrolling starfield layers retired
- > Mobile modals now fill the screen and stay open on outside tap
- > Maze collisions burst a red pixel-scatter effect; tab brackets became CSS overlays - no more resizes or flicker, bigger section headers
- > Big maze time readout; leaf type dropdown grouped by pack
- ~ FPS counter fully hidden when off; chevrons more visible; hints stay centered on wrap; preview fills more of its container
- ~ TAIL CURL slider renamed to TAIL ANGLE (same setting under the hood)
- ~ Save key is now asciiRat.v6 - old v4 saves merge in on first load
- >> HARDENING: single-owner in-game keys (one move per keypress, case-insensitive WASD), joystick and direction indicator survive maze re-renders, settings-open render skips, boot state sync, file://-safe share links, AudioContext autostart fix, leaf constant dedupe, dead preview state dropped

## v5.0.1 — SEWER REPAIR

- >> HOTFIX: Restore code lost at the parting joins
- >> HOTFIX: Remove corrupted js/all.js (reverted to loading 7 parted files directly)

## v5.0.0 — SEWER SHARE

- >> SHARE YOUR RAT: the RAT tab mints a ?rat= link of rat-phrases (noodle-chonk-radar-catfish...) that carries ONLY the rat - every other setting stays unique to whoever opens it
- >> RAT MAZE easter egg: click the title or press M, then guide @ through a generated labyrinth to the % - a crumb trail marks your slop, and mazes grow with every cheese
- >> Rat-Slop Log stepper rebuilt for major.minor.patch: borderless up/down chevrons sit above and below each digit, and stepping slides that digit vertically like an odometer
- > Patch digits that never shipped render faded with no chevrons - a tombstone for ranges that never got a patch release
- > HALLOWEEN MODE: surfaces in STYLE every October only - pumpkin-phosphor palette and a drifting spooky sky with a moon; hibernates the other eleven months
- > FALL LEAVES background joins the rotation: pixel foliage drifting down at three lazy autumn speeds
- > Modal heights hold steady: settings and the log open at a fixed height and keep it through every tab flip; your own resize still sticks
- > Settings categories are now an even segmented bar - all five tabs always visible, no more wrapping button slop
- ~ Button presses now burst a ripple of pixel squares, and hovering sprinkles shimmering pixels - the single-shade wave block is retired

## v4.5.0 — DOT MATRIX

- >> Rat-Slop Log redesign: the tab strip is retired - releases now parade through a big centered dot-matrix version readout, drawn cell by cell on a canvas
- >> RAT tab preview fixed: the pinned pixel preview was being wiped by the slider rebuild the instant it mounted - it now survives and sculpts live, just like the RAT BUILDER
- > Dot-styled chevrons step between releases; the version number slides out and in while the notes below reload in their own scroll area
- > The log modal is now resizable and draggable like settings - stretch it by the hatched corner, park it by the header
- ~ Chevrons dim at the ends of the timeline, and the dot readout recolors itself when you switch palettes

## v4.4.0 — SCULPT & PULSE

- >> RAT tab in settings now de-spawns the main rat and pins a live pixel preview in the panel - sculpt in peace; the stage rat returns the moment you switch tabs or close settings
- >> Category tabs pinned to the modal top so they never scroll away, no matter how deep the panel you are rummaging through
- > Settings modal is resizable - grab the hatched corner and stretch the whole panel to taste
- > New PIXEL SCATTER cursor: a tight huddle of tiny pixels per breadcrumb with a gentle orbit and glitch flicker - a chunky trail without the confetti spread
- ~ Buttons now ripple a pixel pulse wave outward from the press point; the old chunky press-translate is retired

## v4.3.0 — CRUMB TRAIL

- > Cursor trail rework: dots now pin to breadcrumb positions - the path stays exactly where you drew it, no more elastic pull toward the cursor on curves
- ~ Trail fades out in place when the cursor stops, and glitches only affect dots that are still alive

## v4.2.0 — PINNED PIXELS

- > RAT BUILDER fix: the pixel preview is now pinned above the scroll area - it stays in sight while you scroll through every slider and palette below
- ~ The main stage reveal text moved into the scrolling options area to keep the preview column clean

## v4.1.0 — PIXEL PATCH

- >> RAT BUILDER gets its own pixel preview: a dotted silhouette canvas inside the modal - the main stage stays hidden until you press RELEASE THE RAT
- >> Entrance animations on reveal: MATERIALIZE (pixels out of static), RAIN (staggered drop-in), POP (springy overshoot) or NONE - pick in ANIMATION
- > Cursor options: PIXEL DOTS trail with glitch flicker (default), the v4 glow, or off
- > Pixel-themed backgrounds join CLASSIC: PIXEL GRID, drifting STARFIELD, falling PIXEL RAIN
- ~ Spin holds until the entrance completes; grabbing the rat skips the ceremony

## v4.0.0 — RAT BUILDER

- >> Character creation: first visit opens the RAT BUILDER - live sliders sculpt body, head, snout, ears, eyes, legs, tail and whiskers before you ever see the UI
- >> Everything remembered between loads: your rat, palette, motion, ramp and every setting persist via local save
- >> Settings re-organized into category tabs: RAT, ANIMATION, STYLE, PREFERENCES, PERFORMANCE
- > New WALK animation: diagonal-gait leg pumps with body bob - plus a description under every motion option
- > Modals are draggable by their headers - park them anywhere and watch the rat react to your tweaks
- > Cursor glow: palette-tinted light trailing the pointer, flaring over the rat, buttons and sliders (default on)
- > Sliders & toggles: spin speed, momentum release + glide window, smooth zoom + zoom speed, point density
- ~ FPS counter toggle in PERFORMANCE (default off) and phosphor FX toggle for glow-free low-end rigs

## v3.0.0 — PEST CONTROL

- >> SETTINGS panel (press S): character ramps, idle motion modes and palette swatches under one roof
- >> WALLPAPER MODE (press W): every scrap of UI fades away - just you, the rat, and your desktop
- > Six idle motions: SPIN, WAVE jelly, SCUTTLE hop, TUMBLE, ORBIT drift, BREATH loom
- > Six palettes (PHOSPHOR, AMBER, ICE, VAPOR, BLOOD, MONO) - colors shown in the swatch, name on hover
- ~ Four character ramps, from MINIMAL dots to solid BLOCKS, for adjustable rat resolution

## v2.0.0 — PARTY RAT

- >> PARTY MODE: rainbow hue waves ripple down the rat while it bobs to the beat (press P)
- >> The Rat-Slop Log: this changelog, tabbed by release in a graceful centered modal (press L)
- > Momentum hands-off: release a spin and velocity keeps adjusting for 1.2s on a smoothstep curve back to cruise
- > Live orientation readout: horizontal + vertical degrees tick below the rat as it turns
- ~ Severity-coded log bullets: gold >> major, green > medium, cyan ~ minor

## v1.0.0 — FIRST SCURRY

- >> The rat debuts: ~7,000 shaded surface points - body, snout, ears, whiskers, tail, attitude
- > Grab-and-spin controls: drag to rotate and tilt, scroll to zoom, Space to freeze
- ~ CRT scanlines, phosphor glow and vignette for that 3am-terminal mood
