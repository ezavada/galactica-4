# Map Generation Port Status

Last reviewed: 2026-10-12 (final map-generation checklist audited)

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

## Retained v4 differences and integration boundaries

- `compAdvantage` now affects AI research and shipbuilding output, while `endEarly`, `maxTimePerTurn`, and `hosting` are stored but not active in the local turn loop.
- `GameConfig.toMapGeneratorConfig()` intentionally passes only the map/player values needed by `MapGenerator`; other setup values are consumed by `Game`, `Rules`, AI, or multiplayer host systems.
- The map generator creates mostly `S-##` unnamed systems and uses translated numerals for repeated named systems. Homeworld reservations share name-use accounting; translated name pools are deduplicated. Exhausted/repeated numeral entries fall back to unique `S-##` names.
- Local save/open/revert is implemented independently of map generation and restores the saved galaxy without regenerating it. Desktop multiplayer host creation/reopening, authenticated turn posting and timed-turn scheduling are now implemented independently of map generation; remaining multiplayer application work is tracked in `V3_V4_FEATURE_STATUS.md`.
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

Latest verified result: 1842 passed, 0 failed on both rebuilt public/development native PDG runtimes.

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


### Exhausted homeworld candidate selection (2026-10-11)

`GalacticaProcessor::FillSector` checks minimum homeworld spacing only while
there are spare stars to reject. When no spare candidates remain, it accepts
the randomly chosen star immediately. V4 previously kept checking distance
and eventually chose the first remaining star, changing the source selection
rule and consuming unnecessary random draws. It now accepts the random
candidate when the rejection allowance is exhausted or all remaining stars
are reserved for the remaining players. Every rejected spare candidate leaves
the eligible list, so the search terminates without an arbitrary attempt cap.
Rejected candidates remain ordinary stars in the galaxy, as in v3.

Three regressions cover immediate random acceptance, the remaining-player
reserve across successive selections, and the strict distance boundary.
Both full native lanes pass 1700 tests. The muted browser helper
`tools/test-web-homeworld-selection.cjs` proves the former first-star fallback
on the baseline and the corrected one-draw choice on the new build, then
checks that normal startup assigns every player a homeworld. Actual startup
and the algorithm check pass in all six languages. All 12 setup/new-game
before/after screenshot pairs are byte-identical; the six localized final
map screens were inspected. This seeded normal game has spare candidates and
is unaffected; the exhausted-candidate branch is proved by the focused
regression, not inferred from those screenshots. Evidence is under
`/private/tmp/galactica-homeworld-selection`, with logs sharing that prefix.
No user-facing strings changed. The remaining checklist still needs its
separate audit; this entry closes only this selection-rule difference.


### Localized homeworld naming at the player limit (2026-10-11)

The supported 99-player configuration can exceed the 53 unique names in the
translated pools. V4 previously emitted English `Player54Star` placeholders
for those homeworlds and their AI faction names. Source `FillSector` reuses
star names with resource-driven numerals. V4 now retains its distinct initial
reservations, then reuses the localized pool with numerals. Shared reservation
counts include those numbered homeworlds, preventing ordinary stars from
reusing their names. Missing/exhausted numerals retain unique language-neutral
S-number designations. No new strings are required.

The real large-game UI check exposed an independent high-owner inspector
crash: ownership colors indexed beyond the eight-entry v4 palette. All map,
ship/fleet, scanner, rendezvous, panel/pointer and comparison color lookups now
use a bounded accessor. Source `GalacticaDoc::GetColorIndex` also clamps owners
past the palette to its last entry; this fix preserves v4's existing palette
and alpha rather than claiming pixel equivalence to v3's 15-color resource.

Native regressions cover shared numbered reservations, numeral exhaustion,
99 homeworlds plus ordinary stars in all six languages, unique labels,
localized AI names, initial tech/construction/home references and owner
colors/borders through player 99. Both full suites pass 1703 tests. Final real
99-player browser startup and player-54 inspection pass in all six languages;
those inspector screenshots were visually inspected. The prior English
baseline inspector raised an undefined-color exception; the prior German
large-game baseline repeatedly timed out before its map capture. Consequently
no complete six-language large-map before/after comparison is claimed.

For the visual naming comparison, a separate controlled preview reserves 99
names through the production generator with fixed selection randomness and
renders the 54th name in an otherwise unchanged normal game. All twelve
before/after preview runs pass: English is byte-identical, and five translated
frames replace the English placeholder with localized numbered names. The
German before/after and translated final previews were inspected. The preview
is deliberately separate from the six real large-game startup checks.
Helpers are `tools/test-web-homeworld-names.cjs` (large game) and
`tools/test-web-homeworld-name-preview.cjs` (controlled comparison). Captures,
comparison metadata and logs are under `/private/tmp/galactica-homeworld-names`
and the matching log prefix. Automated output remains muted. This closes the
large-game naming/display defects, not the full map-port audit.


### Final source-edge checklist (2026-10-12)

The map-generation checklist is complete for the supported game configuration.
This closes map generation, not the separate application parity/platform/service
checklist. No further compact-window work is included.

| Requirement | Verification |
|---|---|
| Star-count formula, player floor, area multiplier | Exact lower/upper random outcomes for all ten densities, all five sizes and 1/3/99 players; player floor is applied before area scaling. |
| Coordinates and sector bounds | First/last possible random coordinates, 1024-unit lattice, zero z, and exclusive outer extent at each size. Existing seeded integration checks cover actual generated maps. |
| First homeworld edge preference | Strict quarter-sector cutoff, inclusive eighth-sector boundary, both axes/edges, zero-spare and no-suitable-star fallback; source `FillSector` uses the same predicates. |
| Later homeworld spacing and termination | Existing minimum-distance/no-spare regressions plus retained rejected-star regression. Removed candidates leave only the eligible list, not the galaxy registry; remaining-player reserve prevents exhaustion. |
| Names and supported player counts | Existing six-language 99-player/name exhaustion tests, shared numeral accounting, unique ordinary/homeworld names and high-owner rendering evidence. |
| Initial player/homeworld state | Population 1,000,000, tech 1, scanner from actual rules, home reference, 99%-paid colony construction with no commissioned ship, discovery flags and 334/333/333 colony defaults. All six languages, fast/normal, fog/omniscient and noncontiguous human roles pass. |
| Setup/configuration and runtime integration | Existing configuration tests validate density 1–10, size 1–5, player total 1–99, skill/advantage and boolean ranges. Actual localized startup checks assign all homeworlds. Host timers/readiness and AI production are consumed outside map generation. |

Source references: `GalacticaProcessor.cpp` 336–523 (`FillSector`) and 556–579
(initial player flags), `CStar.cpp` 103–109 (ordinary star naming), current
`map-generator.js`, `player-info.js`, `game-config.js` and `Game.initializeGame`.
Five additional regressions live in the final source-edge group of
`tests/map-generation.test.js`. Both complete muted native lanes pass 1,842
of 1,842 tests; logs are
`/private/tmp/galactica-final-map-audit-{devel,public}.log`.

Retained differences must not be described as exact binary/source equivalence:

- V3 ordinary names are the resource prefix plus entity ID. V4 occasionally
  allocates localized named ordinary stars and uses sequential S-numbers. Its
  initial distinct home-name reservations and deduplicated pools are retained
  behavior; later reuse uses localized numerals. This changes RNG consumption,
  so the same seed does not promise an identical v3 galaxy.
- V3 stores truncated integer/float home-spacing thresholds; v4 uses JavaScript
  floating-point Euclidean geometry consistently with its movement model.
  The separation rule is retained, but sub-unit threshold equality is not
  claimed across the two runtimes.
- Source density zero returns without generating stars for internal empty maps;
  supported setup is 1–10. V4 uses `skipMapGeneration` for fixtures/empty models.
  The source debug-only density-one forced tiny map is not release behavior.
- Reserved home names and invalid/exhausted numeral fallbacks are handled more
  safely than source unchecked resource reads. Dormant starlanes remain excluded.

`tools/test-web-homeworld-selection.cjs` runs twice per locale at 800×600 with
actual startup input and the exhausted-candidate regression, on unchanged
production code. Paired setup/map captures and logs are in
`/private/tmp/galactica-final-map-audit-ui`; all twelve runs pass and all twelve
screenshot pairs have zero changed pixels (`comparison.json`). Both six-language
review sheets were inspected as normal-window regression evidence.
No player-facing text changed; all supported language resources remain intact.
