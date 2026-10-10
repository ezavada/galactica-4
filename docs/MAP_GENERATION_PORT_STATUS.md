# Map Generation Port Status

Last reviewed: 2026-10-09

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
- Density offers the v3 numeric 1–10 range; sector size offers all five v3 dimensions, 1×1 Tiny through 5×5 Huge. Both have clickable/highlighted choices, keyboard cycling, reset and integer validation. Map extent scales linearly with sector size and star count scales by its square.

## Remaining differences and caveats

- `compAdvantage` now affects AI research and shipbuilding output, while `endEarly`, `maxTimePerTurn`, and `hosting` are stored but not active in the local turn loop.
- `GameConfig.toMapGeneratorConfig()` intentionally passes only the map/player values needed by `MapGenerator`; other setup values are consumed by `Game`, `Rules`, AI, or future multiplayer systems.
- The map generator creates mostly `S-##` unnamed systems and uses translated numerals for repeated named systems. Homeworld reservations share name-use accounting; translated name pools are deduplicated. Exhausted/repeated numeral entries fall back to unique `S-##` names.
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

Current expected result: 795 passed, 0 failed.

## Maintenance notes

When changing map generation, update this document and the tests together. In particular, re-check:

- seeded star-count expectations;
- coordinate bounds and sector scaling;
- home-star spacing rules;
- player and computer naming;
- starting colony ship progress;
- configuration validation ranges.

### Full density-range validation (2026-10-09)

The v3 numeric 1–10 range is now available in actual setup and reaches the original count formula. Regression coverage checks every multiplier using the same random sequence and constructs a sector-size-5, density-10 galaxy with unique names, finite in-bounds coordinates and a homeworld for every player. Name accounting includes reserved homeworld labels; duplicated translated pools and missing/repeated numeral suffixes are handled without collisions. Real browser selection, reset and maximum-density launch passed in all six supported languages. Full unit suite: 725 passed. This closes the density-range gap; the other caveats above remain.

### Sector-size setup validation (2026-10-09)

All five v3 sector sizes now have clickable startup controls, active highlighting, S cycling/wraparound and R reset. Their labels match the v3 1×1 Tiny to 5×5 Huge scale in all six languages. Configuration accepts only integer sizes 1–5. Tests check the original square-area star-count scaling at every size and generate each size with in-bounds coordinates, unique labels and all player homeworlds. Actual browser selection/shortcuts/reset and a 3×3 launch with correct map extent passed in all six languages; setup screenshots and a smaller Russian layout were inspected. Full suite: 737 passed. The other map-port caveats above remain.
