# Galactica-4 Test Suite

Run the full suite from the project root with the PDG runtime:

```bash
./gad4 tests/run-tests.js
```

Current expected result: 1597 passed, 0 failed.

The launcher downloads the checksum-pinned public PDG release on first use;
no sibling `pdg` or `pdg-devel` checkout is required.

## Runner

- `run-tests.js` - main PDG runtime test runner.
- `test-framework.js` - lightweight assertion/test grouping helpers.

## Suites

- `outcome-reports.test.js`: conclusion narratives, literal Unicode names, viewer roles, queue ordering, quiet autoplay, modal input, paging, replay on later turns, correct event-list headings, and six-language resources.
- `game-sessions.test.js`: independent documents, cancellation, graph/turn/camera retention, stable identity, menu shortcuts, modal input, paging, smaller control bounds and six-language controls.
- String resources
- Map generation
- Coordinate conversion and movement
- Waypoint courses, memory, Hunt/Patrol controls and v3 pursuit ordering
- Human call-ins, idle requests, attention navigation and End Turn confirmation
- Ship/fleet scrap orders, quarter-cost refunds, cancellation and containment cleanup
- Last-turn event reports, recipient privacy, live/lost subject navigation, reviewed state and paged Unicode narratives
- Player/config models
- AI systems
- Zoom and camera behavior
- Entity fog of war
- Visibility calculator
- Spatial partitioning and performance
- Fleet mechanics
- Combat
- V3 game rule parity
- Command UI
- Fleet formation
- Rendezvous and fleet UI
- Ship naming and events
- AI skill autoplay
- PDG v1.2 camera, retained panel text, and selection scripts

- `player-name.test.js`: selected-name replacement, spaces and Unicode editing, caret/delete behavior, 32-character limit, configuration/map integration, native/browser preferences, pointer Start bounds and all six languages.
- `player-comparison.test.js`: all v3 summary metrics, population/production units, integer technology averages, nested members/satellites, dead/unfinished exclusions, unowned/defeated/unassigned rows, raw production extrema, rendered colors/dashes, paging, modal input and all six languages.
- `system-comparison.test.js`: owned-system filtering, v3 production/defense arithmetic, fleet/satellite minimums, all-column sorting, paging, stale selection, mouse/keyboard navigation and six-language resources.

- `system-diagnostics.test.js`: information visibility, read-only allied production, live defense values, localized grouped population, light-year coordinates and Unicode panel fitting.

## Notes

The tests use PDG APIs directly, including seeded random numbers:

```javascript
pdg.srand(42);
pdg.rand();
```

Use `docs/TESTING_GUIDE.md` for details on adding or debugging tests.

- `game-title.test.js`: isolated title drafts, Save/Cancel behavior, the v3 27-character limit, Unicode validation, configuration/header integration, measured header fitting and six-language setup controls.

- `computer-count.test.js`: full opponent range, numeric drafts and cancellation isolation, integer validation, solo generation/turns, twelve-opponent generation, a complete 99-player galaxy and six-language setup controls.

- `startup-skill.test.js`: ordered five-choice shared popup, current-choice highlighting, setup isolation, strict skill validation, AI forwarding, smaller layout bounds and translated labels.

- `startup-fast-game.test.js`: checkbox/key state isolation, boolean validation, actual fast scan/speed/shipbuilding rates, smaller layout separation and all six native-language labels.

- `startup-fog.test.js`: inverse checkbox/omniscient state, setup isolation, strict boolean validation, enemy detail/mobile visibility, public yellow-star and disguised-homeworld names, comparison metadata, separated hit areas and six-language labels.

- `game-save.test.js`: complete graph, shared/historical references, economy, visibility, camera/selection/Events state, spatial services, ID continuity and malformed saves.
- `document-files.test.js`: portable suggested filenames.

Run real file transactions and asynchronous document-controller integration separately:

```bash
./gad4 tests/document-files-async.js
./gad4 tests/documents-async.js
```

These cover atomic writes, failure preservation, browser file handles/download/upload/cancellation, Save/Save As/Open/Revert, overwrite confirmation, session identity, malformed files and translated dialog bounds.

- `colony-setup-reports.test.js`: private naming/production attention reports after neutral human colonization, default retention, computer/capture exclusions, recapture/removal privacy, actionable inspector controls, report navigation, local save identity and translated bounds.

- `ship-commissioning.test.js` and `game-rules.test.js`: allied standalone/fleet arrival refreshes selected hull prices at current colony technology, retaining fractional and banked credit; progress/ETA, paused/enemy cases, unchanged-library arrivals and save round trips follow the v3 behavior.
