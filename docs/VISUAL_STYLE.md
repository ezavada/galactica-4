# Visual style

The map and controls use small presentation effects to add life without distracting from strategy.

- One star currently inside the viewport receives a quick 320 ms glint every 1.8 seconds. A soft halo and brighter short cross brighten the existing star; deterministic selection uses visible IDs and time, independently of draw order and game RNG. Scrolling refreshes the candidate set, and sparse views still twinkle.
- All stars gently vary their core brightness by ±10% around a 90% baseline (81–99% of full color), leaving headroom for white stars to brighten without clipping. Stable per-star hashes assign separate phases and periods of 4.8–9.6 seconds; quick glints remain independent. Labels and owner halos retain their normal colors.
- The background moves at a constant rate opposite camera scrolling, with strength proportional to zoom above the minimum. At minimum zoom there is no parallax. Overscan and repeated image tiles keep the viewport covered during unrestricted scrolling.
- Neutral panels use gray vertical gradients and thin gray outlines; buttons retain blue-gray fills and brighter hover states. Inspector surfaces are 92% opaque and dialog surfaces 96% opaque, allowing a little background color through while keeping text and controls clear. System and ship panels blend 6% owner color at the top, fading to the neutral panel gray at the bottom. Identified enemies, allies and no-fog views share this treatment; retained completed/construction ship panels use it too. Known-owner borders blend 20% owner color into the neutral outline, preserving its opacity. Setup, settings, comparison and other ownerless dialogs share the neutral gradient and border recipe; the top information panel uses the same treatment at its existing 86% opacity. Tint visibility follows the corresponding owner label (any observed ownership for systems, Tech visibility for enemy ships). Unknown ownership and unclaimed objects keep the neutral surface.
- Rendezvous crosses use three-pixel filled strokes with rounded ends, cycling from the owning player’s color halfway toward pure white and back every 4.4 seconds. Markers remain visible at wide zoom and respect private ownership; reduced motion keeps them at the owner color. Map buttons and object popups arm placement so a subsequent click can create or move a point in empty space, with optional object anchoring.
- Inspector and runtime-window entrances settle in 120 ms, moving 2 pixels and reaching their normal surface opacity. Closed windows fade out over 85 ms. Controls remain immediately usable.
- Allocation locks use open/closed padlock icons for the current state, with localized Lock/Unlock action hints in both system and production panels. Their shackles are cubic Bézier curves.
- Menu, Home and Fit use familiar icons with localized hover labels and their existing shortcuts. Settings and colony defaults use an eight-tooth gear. All six glyphs use substantial two-pixel strokes and are drawn once to a transparent offscreen surface at 2× resolution, then cached as independent images and scaled down when displayed. Cache variants include icon, size and color; source ports close immediately after rendering, and images are released on display disposal. Filled stroke geometry follows real PDG Bézier splines, avoiding WebGL’s one-pixel GL-line limit.

Browser `prefers-reduced-motion: reduce`, sampled when the display starts, disables twinkle, continuous star brightness, rendezvous color pulsing, parallax and transitions. Native callers can set `game.config.reducedMotion` before creating the display. A settings toggle has not yet been added.

`src/js/panel-appearance.js` shares neutral colors, gradient geometry and owner-border styling between startup and gameplay. `src/js/visual-effects.js` contains the deterministic presentation calculations; `src/js/ui-icons.js` owns icon rendering and caching. Rendering lives in `display.js` and `retained-panel.js`, using shared PDG attributes and two reusable offscreen surfaces for whole-panel transitions. Surfaces are released on resize or display disposal. No game RNG, simulation state, selection geometry or action routing is altered.

Validation: 692 unit tests pass, including 14 presentation regressions. Real browser controls and eight settled views were checked against the previous version in all six supported languages (48 paired screenshots). Additional frames cover window entrances/exits, star twinkle, scrolling and reduced motion. Before/after seeded 250-turn audits matched: 364 ships, 35 fleets and five living players.

Browser validation used the same compatible PDG WebAssembly runtime as the pre-change baseline. The current default sibling `pdg/build/wasm` output lacks `Animated.defineScript`, required by the existing selection-pulse implementation, so that stale bundle cannot start the game. Rebuild PDG with the current API before using the default web-build path.

### Icon refinement (2026-10-09)

All six icon types now render into transparent surfaces at twice their display resolution and reuse cached image snapshots. Strokes have a two-pixel display width. Open/closed shackles follow actual cubic Bézier splines; the gear uses broad teeth. Filled stroke geometry keeps curves, corners and line weights consistent in WebGL, where GL line width can remain one pixel. Padding prevents edge clipping, and source surfaces close immediately after the snapshots are cached.

Six regressions cover supersampling/reuse, curved shackle geometry/stroke weight, state/size/color variants, disposal, failed-render cleanup and invalid inputs. Full suite: 731 passed. Actual browser lock/unlock, settings/defaults and Home/Fit actions, localized hints, stable cached image identity across frames and disposal passed in all six languages. Compared 48 before/after screenshots and inspected closed/open padlocks, settings gears, Home/Fit/Menu and translated hints. Evidence: `/private/tmp/galactica-parity/icons-{before,after}` and `/private/tmp/galactica-icons-tests.log`.

Yellow-star names remain visible through fog. Undiscovered enemy homeworlds use stable chart aliases until first detection, then retain the real names even when scanners leave. These are presentation labels; actual star/faction names remain unchanged. Player comparison keeps real homeworld-derived faction names, deliberately different from undiscovered map labels. Fogged ownership/economy fields remain hidden.

### Shared window surfaces (2026-10-09)

Setup and all ownerless runtime panels use a neutral gray surface, a subtle +0.022 RGB lift at the top and a 0.7-pixel outline. Owned system/ship surfaces retain the 6% owner tint at the top and fade to neutral gray; their outlines now blend 20% owner color. Unknown ownership remains neutral. Existing opacity levels are preserved. Full suite: 752 passed, including neutral gradient/alpha, startup recipe and border/visibility regressions. Native browser actions and 84 before/after screenshot pairs cover all six languages; no localized resources were added. Evidence: `/private/tmp/galactica-parity/neutral-{before,after}` and `/private/tmp/galactica-neutral-tests.log`.

### Visible-star twinkles (2026-10-09)

Replaced the sparse 21-second, one-in-seven-star effect with a 320 ms glint every 1.8 seconds, selected only from onscreen stars. Peak glint opacity is 75%, with a soft 45% radial halo; selection uses a presentation hash and does not consume simulation randomness. Reduced motion disables it. Full suite: 754 passed. Browser checks cover pulse frames, viewport selection, scrolling and reduced motion in all six languages, with English before/after frames. Evidence: `/private/tmp/galactica-parity/twinkle-{before,after}` and `/private/tmp/galactica-twinkle-tests.log`.

### Rendezvous visibility and free placement (2026-10-09)

Fixed native empty-space placement: `isAwaitingMapTarget()` now includes rendezvous creation/movement, so mouse-down reaches the placement handler instead of beginning camera dragging. Star/ship popup rendezvous actions now arm placement rather than immediately anchoring at the selected object. Existing map/object placement instructions remain localized in all six languages. Thicker filled geometry avoids WebGL line-width limits; a 2.2-second owner-to-pale pulse and minimum 85% opacity improve visibility, including wide zoom. Privacy and reduced-motion behavior are retained. Full suite: 757 passed, including native-routing/inverse-camera, popup placement/cancellation, pulse/privacy and wide-zoom rendering regressions. Actual browser map-button creation, empty-space movement, star-popup placement and Escape cancellation passed in all six languages; pulse frames were compared with the previous version. Evidence: `/private/tmp/galactica-parity/rendezvous-{before,after}` and `/private/tmp/galactica-rendezvous-tests.log`.

### Neutral gradient contrast (2026-10-09)

The initial +0.022 RGB lift was too faint to read clearly on neutral windows. Ownerless panels, dialogs, setup and the top information bar now use +0.075 at the top, fading to their existing neutral gray base at the bottom. Owned-panel styling retains its prior color treatment. Full suite: 757 passed. Actual browser controls and neutral-window/setup layouts were checked in all six languages, with English before/after screenshots inspected. Evidence: `/private/tmp/galactica-parity/gradient-contrast-{before,after}` and `/private/tmp/galactica-gradient-contrast-tests.log`.

### Content-sized buttons (2026-10-09)

Map columns and object popup buttons measure localized labels plus keyboard shortcuts at their rendered font size, add padding and expand their drawing/click rectangles together. Icon-only controls retain compact minimum widths. Map controls align without overlap and switch to a single column when needed; popup connectors track their resized edges. Fleet member controls, ship-table headers and state-dependent scrap buttons reserve translated text widths. Course controls use measured widths and wrap when needed, with additional window space and adjusted pagination. Full suite: 762 passed, including measured font/shortcut/icon sizing, resized clicks/connectors, row wrapping and smaller-screen course bounds. Actual browser drawing checks found no text overflow in the covered map/system/ship/menu/settings/defaults/events/course/fleet/table views in any of the six languages. Before/after screenshots were compared and translated layouts inspected. Evidence: `/private/tmp/galactica-parity/buttons-{before,after}` and `/private/tmp/galactica-buttons-tests.log`.

### Slower rendezvous pulse and independent star brightness (2026-10-09)

Rendezvous pulses now take 4.4 seconds (half the previous speed) and peak at a 50% blend between owner color and pure white. Every star continuously varies its gradient brightness by ±10% around a 90% baseline, with independent 4.8–9.6-second periods and phase offsets derived from IDs. This reserves brightening headroom for white stars without changing hue, map labels, ownership or simulation RNG. Reduced motion preserves static original star colors and the owner-colored markers. Full suite: 766 passed; regressions cover range/phases/periods, actual rendered star-gradient colors, pulse timing/peak color, reduced motion and RNG isolation. Native placement/movement/cancellation and animation frames were checked in all six languages, with before/after captures inspected. Evidence: `/private/tmp/galactica-parity/star-motion-{before,after}` and `/private/tmp/galactica-star-motion-tests.log`.

### Compact icon groups (2026-10-09)

Menu, Home and Fit now form one right-aligned row of 44×30-pixel controls with six-pixel gaps, below the content-sized text controls. Icons and visible keyboard hints have separate space; localized hover labels and existing shortcuts remain available. The text grid retains its narrow-screen single-column fallback, and End Turn spans the final text row. Allocation lock/unlock controls form a compact aligned column of 26×18-pixel buttons beside the sliders, with drawing and hit rectangles narrowed together.

Full suite: 766 passed, including compact group spacing, bounds/clicks, text wrapping and allocation-lock routing. Actual browser Menu/Home/Fit and lock/unlock clicks, localized hints and text-overflow checks passed in all six languages. Compared before/after screenshots and inspected compact controls and translated layouts. Evidence: `/private/tmp/galactica-parity/compact-icons-{before,after}` and `/private/tmp/galactica-compact-icons-tests.log`.

### Zoom-scaled parallax and exterior stars (2026-10-09)

Removed the saturating background offset. Equal scrolling distances now produce equal background movement at a given zoom; the rate is 1% of scrolling distance per zoom unit above the camera minimum. Full zoom out produces zero parallax, and reduced motion disables it at every zoom. Repeated backdrop tiles cover unrestricted panning without changing the drift rate.

A deterministic field of small, dim blue-gray stars fills space outside the playable coordinate rectangle. Positions remain anchored while scrolling/zooming, with cached shared drawing styles. These are unnamed presentation points, never factory objects: they have no selection, detection, ownership or simulation RNG effects. No localized strings are added.

Full suite: 767 passed. Regressions cover zoom scaling, zero minimum/reduced-motion drift, constant scrolling, viewport coverage, deterministic exterior-only positions, RNG isolation, dim rendered colors and style reuse. Browser zoom/scroll/reduced-motion and unchanged game-star counts were checked in all six languages, with before/after screenshots at 10%, 50%, 100% and 200% zoom. Evidence: `/private/tmp/galactica-parity/parallax-{before,after}` and `/private/tmp/galactica-parallax-tests.log`.

### Allocation slider current and target levels (2026-10-09)

The solid colored fill now represents actual output (`value`), and the vertical marker represents the requested target (`desired`). The adjacent percentage continues to show the editable target. Clicking or dragging the track changes the target only; actual output follows the existing per-turn adjustment rules. This shared rendering applies to both system information and production windows, including read-only allocation summaries. Locking, coupled allocation totals and localized percentage formatting are preserved.

Full suite: 769 passed, including fill/marker checks in both adjustment directions and click tests confirming actual output stays unchanged. Native track clicks and before/after screenshots were checked for both allocation views in all six languages. Evidence: `/private/tmp/galactica-parity/slider-{before,after}` and `/private/tmp/galactica-slider-tests.log`.

### Grid visibility preference (2026-10-09)

Settings → Show grid and F3 control sector-grid visibility, with active button styling indicating the current state. The default is on, matching v3. The choice is remembered in browser localStorage or native PDG configuration and survives a new game. Storage denial leaves the drawing control usable. Game objects, decorative stars and simulation state are unaffected.

Full suite: 771 passed. Browser clicks, F3 and new-game persistence passed in all six languages. Inspected translated settings and grid-on/off screenshots. Evidence: `/private/tmp/galactica-parity/grid-{before,after}` and `/private/tmp/galactica-grid-tests.log`.

### Map-name visibility and mobile labels (2026-10-09)

Settings → Show map names and F2 toggle star, ship, fleet and rendezvous map labels. The choice defaults on and persists independently of grid visibility in browser/native preferences. Inspectors, lists, orders and player comparison continue to show names. Fogged yellow-star aliases retain their existing behavior when map names are enabled; comparison still uses real faction names.

Ship/fleet labels now follow v3 drawing rules: at least half zoom, unselected docked labels suppressed, and Class visibility required for non-allied objects unless omniscient. Existing label fading remains; fleet counts and object symbols remain visible when names are hidden. Full suite: 774 passed. Native controls and translated screenshots passed in all six languages, with map-name on/off and French settings views inspected. Evidence: `/private/tmp/galactica-parity/names-{before,after}` and `/private/tmp/galactica-names-tests.log`.

### Ship visibility preference (2026-10-09)

Settings → Show ships and F1 control ship/fleet map rendering. Default-on state persists independently of grid and name choices. The selected visible mobile object remains drawn with its diagnostics and course when hiding others, matching v3; fog still prevents disclosure of an invisible enemy even if selected. Patrol hiding remains in place. Hidden ships/fleets do not intercept map selection or order targets, and stars/rendezvous points are unaffected. Simulation collections and movement are unchanged.

Full suite: 777 passed. Browser settings/F1, selected ship/fleet exceptions, hidden-hit checks and new-game persistence passed in all six languages; before/after translated settings and map views were inspected. Evidence: `/private/tmp/galactica-parity/ships-{before,after}` and `/private/tmp/galactica-ships-tests.log`.

### Course visibility preferences (2026-10-09)

Settings → Show all courses/F4 controls ordinary ship/fleet routes; Show courier courses/F5 independently controls looping scout routes, matching v3. Both default on and persist in browser/native preferences. A selected object's route remains visible when its own setting is off. Enemy routes stay private through the existing course-visibility rules. These controls only change rendering; waypoint state, movement and ship visibility are unaffected.

Full suite: 780 passed. Native settings/keyboard controls, independent route counts, selected-course exceptions and new-game persistence passed in all six languages. Inspected translated settings and route-on/off screenshots. Evidence: `/private/tmp/galactica-parity/courses-{before,after}` and `/private/tmp/galactica-courses-tests.log`.

### Scanner ranges and system influence (2026-10-09)

Settings → Show scanner ranges/F6 controls scanner presentation, default on and persisted independently of other drawing choices. Owned systems with known scanner information contribute three low-opacity influence bands at 4×/2×/1× scanner range. Opaque offscreen masks union circles by owner and band, so overlap within one band does not compound its tint. Copied images are cached until viewport, position, range or ownership/visibility changes, and freed when hidden or replaced.

Selected systems/mobile scanners retain three 1×/2×/4× rings even with F6 off. Ordinary unselected mobile scanners show only the first ring; looping couriers suppress unselected rings. System range requires allied/omniscient or Tech visibility. Mobile rings follow v3 visible-ship eligibility, including visible enemies; invisible ships and hidden unselected ships stay excluded. Tint opacity is 10%/15%/30% from outer to inner band. Rendering sits beneath the grid and objects; it does not alter scanners or visibility calculations.

Full suite: 783 passed. Native F6/settings, selected exceptions, system disclosure gates, mask caching and new-game persistence passed in all six languages. Inspected before/after influence regions, selected courier rings and French settings. Evidence: `/private/tmp/galactica-parity/scanners-{before,after}` and `/private/tmp/galactica-scanners-tests.log`.

### Fullscreen command

The command menu adds a localized full-screen toggle with active state, available to players and observers. Browser fullscreen centers the logical 800×600 canvas at 4:3 with dark letterboxing; its actual DOM rectangle remains the input coordinate reference. Request failures use a wrapped localized message and allow retry. Before/after screenshots and native mouse clicks passed in all six languages, including a 1200×800 viewport. Evidence: `/private/tmp/galactica-parity/fullscreen-{before,after}`. The existing map, panels and simulation remain unchanged. Native monitor transition validation remains pending (zero monitors in this session).

### Map display modes

Command Menu → Map display offers ownership and six numeric modes. Higher known values brighten stars and their owner halos; tech/defense also shade mobile objects against the same system range, while economic modes make mobiles faint. Existing ownership visuals are unchanged. A neutral translucent legend shows the active metric and known-system range, with target-allocation percentages distinguished from actual output. Legend clicks consume input so they cannot select objects underneath. The chooser uses the same subtle neutral gradient/border and measured localized buttons as other windows. Before/after images, seven-mode native browser interactions and translated chooser/legend views passed in all six languages; a smaller CSS viewport also passed. Evidence: `/private/tmp/galactica-parity/map-display-{before,after}`.

### Nebula background preference

Settings offers a localized Show nebula background control with active state. The default-on art, parallax and missing-image gradient are retained; turning it off uses v3’s plain black map. System influence bands use lower tint opacity over black while keeping the cached geometry. Star twinkle and continuous brightness, map labels/grid, selection and owned-window color remain active. The settings dialog grows by one row and fits the logical 800×600 viewport; all six translated layouts and a smaller CSS viewport were inspected. Enabled-background before/after maps match exactly, and actual browser clicks/persistence passed. Evidence: `/private/tmp/galactica-parity/nebula-{before,after}`.

### Camera commands

Compact zoom minus/plus icons join Menu/Home/Fit in the existing 44×30 grouped row. The icons use the shared 2× offscreen cache and substantial filled strokes. Single-character shortcuts sit beside icons; longer Home stays in the localized hover hint to keep the house unobstructed. Command Menu → View presents six neutral gradient buttons for zoom, fit, home, center selection and reset. All six translated layouts and before/after map/menu screenshots were inspected. Evidence: `/private/tmp/galactica-parity/camera-{before,after}`.

### Map scroll bars

Twelve-pixel neutral scroll tracks sit at the bottom/right edges without moving the compact map controls. Proportional thumbs use the existing subdued button style; small geometric arrows show both directions, with translated hover hints. Thumb/track state follows the camera and disabled fitted axes remain visible. Offscreen selected objects keep their inspector but suppress map action arcs, preventing edge-clamped buttons from covering the panel. Before/after maps, panned axes, translated hints and smaller CSS viewport screenshots were inspected in all six languages. Evidence: `/private/tmp/galactica-parity/scrollbars-{before,after}`.
