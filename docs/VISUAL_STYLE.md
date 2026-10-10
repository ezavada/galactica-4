# Visual style

The map and controls use small presentation effects to add life without distracting from strategy.

- A subset of stars receives a faint 800 ms twinkle every 21 seconds, with phases derived from stable object IDs.
- The background moves gently opposite camera scrolling, bounded to 8 pixels in each direction. Overscan keeps the viewport covered at all aspect ratios.
- Panels and buttons use quiet blue-gray vertical gradients, thin outlines and brighter hover states. Inspector surfaces are 92% opaque and dialog surfaces 96% opaque, allowing a little background color through while keeping text and controls clear. System panels mix in 6% of the owner color whenever ownership is known, including identified enemies, allies and systems viewed without fog of war. The tint follows the same visibility rule as the owner label. Unknown ownership and unclaimed systems keep the neutral surface.
- Inspector and runtime-window entrances settle in 120 ms, moving 2 pixels and reaching their normal surface opacity. Closed windows fade out over 85 ms. Controls remain immediately usable.
- Allocation locks use open/closed padlock icons for the current state, with localized Lock/Unlock action hints in both system and production panels.
- Menu, Home and Fit use vector icons with localized hover labels and their existing shortcuts. Colony defaults use a gear alongside the localized label.

Browser `prefers-reduced-motion: reduce`, sampled when the display starts, disables twinkle, parallax and transitions. Native callers can set `game.config.reducedMotion` before creating the display. A settings toggle has not yet been added.

`src/js/visual-effects.js` contains the deterministic presentation calculations. Rendering lives in `display.js` and `retained-panel.js`, using shared PDG attributes and two reusable offscreen surfaces for whole-panel transitions. Surfaces are released on resize or display disposal. No game RNG, simulation state, selection geometry or action routing is altered.

Validation: 692 unit tests pass, including 14 presentation regressions. Real browser controls and eight settled views were checked against the previous version in all six supported languages (48 paired screenshots). Additional frames cover window entrances/exits, star twinkle, scrolling and reduced motion. Before/after seeded 250-turn audits matched: 364 ships, 35 fleets and five living players.

Browser validation used the same compatible PDG WebAssembly runtime as the pre-change baseline. The current default sibling `pdg/build/wasm` output lacks `Animated.defineScript`, required by the existing selection-pulse implementation, so that stale bundle cannot start the game. Rebuild PDG with the current API before using the default web-build path.
