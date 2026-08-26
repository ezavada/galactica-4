# Map Generation Port Status

Last reviewed: 2026-08-25

This document used to be a forward-looking port plan. The core map-generation work described here has since been implemented, so this file now records the current status, remaining differences from Galactica v3, and the tests that cover the area.

## Source references

- Original v3 source: `galactica-anno-dominari-3/Classes/GalacticaProcessor.cpp`
- Current v4 implementation: `src/js/map-generator.js`
- Player state: `src/js/player-info.js`
- Setup/config model: `src/js/game-config.js`
- Runtime integration: `src/js/game.js`

## Implemented

- Star count uses the original-style formula:
  `(Rnd(10) + Rnd(10) + 10) * density + Rnd(5) * Rnd(2)`, with a minimum of one star per player and sector-size scaling.
- Star coordinates use the corrected v3-scale constants:
  `PIXELS_PER_SECTOR = 1024` and `COORDINATE_SCALE = 1024`.
- Random star placement, home-star spacing, edge preference for the first home star, and minimum homeworld separation are ported.
- Home stars are initialized with owner, tech level 1, starting population, scanner range, a named homeworld, and a colony ship at 99% completion.
- Computer player names are resource-driven from the home-star name plus localized faction templates/group names.
- `PlayerInfo` tracks home-star ID, tech milestones, first built ship types/classes, piece counts, AI skill/advantage fields, and default economic settings.
- `GameConfig` carries the main v3-style setup values used by the local runtime: player counts, density, sector size, computer skill/advantage, fast-game, omniscient/all-visible mode, end-early, timer, and hosting fields.
- The startup dialog exposes the currently playable local setup controls: AI count, AI skill, map size, density, fast-game, fog/all-visible, reset, and start.

## Remaining differences and caveats

- Density and sector size currently validate as 1-5 in `GameConfig`; v3 exposed a broader density range.
- `compAdvantage` now affects AI research and shipbuilding output, while `endEarly`, `maxTimePerTurn`, and `hosting` are stored but not active in the local turn loop.
- `GameConfig.toMapGeneratorConfig()` intentionally passes only the map/player values needed by `MapGenerator`; other setup values are consumed by `Game`, `Rules`, AI, or future multiplayer systems.
- The map generator creates mostly `S-##` unnamed systems and uses roman numerals only when the random named-star path produces a duplicate. This matches the current v4 implementation, not the older wording in this file.
- Save/load, multiplayer host setup, turn posting, and timed-turn behavior are not part of the current map-generation implementation.
- Display modes, starlanes, scanner circles, and map overlays are rendering/UI work, not map-generation work.

## Test coverage

Relevant suites loaded by `tests/run-tests.js`:

- `tests/map-generation.test.js`
- `tests/player-config.test.js`
- `tests/string-resources.test.js`
- `tests/coordinate-movement.test.js`

The full suite was last verified with:

```bash
./gad4 tests/run-tests.js
```

Current expected result: 355 passed, 0 failed.

## Maintenance notes

When changing map generation, update this document and the tests together. In particular, re-check:

- seeded star-count expectations;
- coordinate bounds and sector scaling;
- home-star spacing rules;
- player and computer naming;
- starting colony ship progress;
- configuration validation ranges.
