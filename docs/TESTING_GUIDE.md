# Testing Guide for Galactica-4

Last reviewed: 2026-08-25

## Running the suite

Run tests with the PDG runtime from the project root:

```bash
cd /Users/edz/Documents/Personal/galactica-4
./gad4 tests/run-tests.js
```

Current expected result:

```text
Total: 900
Passed: 900 ✓
Failed: 0 ✗
```

The output is intentionally verbose because several game systems still log turn, combat, movement, and construction diagnostics.

Use only the pinned PDG runtime (`./gad4`) for the full suite. The tests and runtime use PDG globals and APIs, including `pdg.res`, `pdg.srand()`, `pdg.rand()`, `pdg.Point`, and drawing attributes.

## Test runner

`tests/run-tests.js` loads these suites:

- `string-resources.test.js`
- `map-generation.test.js`
- `coordinate-movement.test.js`
- `player-config.test.js`
- `ai-systems.test.js`
- `zoom-scroll.test.js`
- `zoom-to-point-bug.test.js`
- `entity-fog-of-war.test.js`
- `visibility-calculator.test.js`
- `spatial-partition.test.js`
- `fog-of-war-integration.test.js`
- `spatial-partitioning-performance.test.js`
- `fleet.test.js`
- `combat.test.js`
- `game-rules.test.js`
- `command-ui.test.js`
- `fleet-formation.test.js`
- `rendezvous.test.js`
- `ship-naming-events.test.js`
- `attention.test.js`
- `event-reports.test.js`
- `scrapping.test.js`
- `visual-effects.test.js`
- `language-settings.test.js`
- `startup-setup.test.js`
- `autoplay.test.js`

## What the tests cover

- String resource loading for the default resource file, plus localized ID parity and placeholder compatibility across all supported language files.
- v3-style map generation, star naming, homeworld assignment, and seeded reproducibility.
- Coordinate conversion, camera zoom/pan, and ship movement.
- Player info, game configuration, ownership, and serialization helpers.
- AI manager/player utilities, decision plumbing, and ownership protection.
- Fog-of-war entity state, visibility calculations, spatial partitioning, and integration paths.
- Fleet creation, joining, merging, movement, and formation rules.
- Runtime combat resolution, v3-style ship/star strength formulas, destruction, interception, docked defenders, colony capture, defeat/victory updates, and combat summary events.
- V3 game-rule parity for technology transfer, neutral-colony defaults, captured-colony defaults, and AI-facing movement/patrol guards.
- Command UI state, windows, permanent map buttons, popup action buttons, production sliders, hover behavior, and layout details.
- Rendezvous creation/placement, fleet assembly at rendezvous points, named fleet/rendezvous UI, fleet roster rows, and fleet member remove/transfer controls.
- Ship naming and new tech/class event overlays.
- Deterministic AI-only autoplay setup, per-player AI skill assignment, 250-turn default cap, quiet/visible event-window modes, victory/stalemate state, and autoplay stop conditions.

## AI-only parity observer

Run the deterministic smallest-map AI observer with:

```bash
./gad4 -- --ai-autoplay
```

This starts five computer players and no human players. Players 1-5 represent the five v3 AI skill settings: Expert, Good, Average, Passable, and Novice. The default seed is `424242`, fog is disabled for observation, and the game advances automatically until the win condition or the 250-turn max-turn guard is reached.

Autoplay hides event presentation windows by default for unattended testing. Add `--show-event-windows` to display lab/stardock overlays; when shown, the overlays are held briefly before dismissal so they get a visible beat even when the turn timer is short.

Useful options:

```bash
./gad4 -- --ai-autoplay --seed=314159 --autoplay-delay=100 --autoplay-max-turns=250 --show-event-windows --autoplay-event-ms=1000
```

## Important interpretation

Passing tests mean the covered code paths behave as tested. They do not prove full v3 parity or complete runtime integration for every scaffolded system.

Examples:

- AI tests cover active AI turn participation, v3-backed economy/build rules, ship/fleet scoring, skill differences, patrol behavior, and advantage modifiers. Player-facing setup/debug UI remains separate.
- Fog-of-war tests cover current visibility recalculation, last-seen memory, scanner-based fleet visibility, and some rendering behavior. Full v3 remembered-object presentation is not complete.
- Combat tests cover the current v3-style runtime combat/capture path. Final combat presentation, richer fleet reports, and broader balance tuning remain work items.

Use `docs/V3_V4_FEATURE_STATUS.md` for parity status.

## Deterministic random numbers

Tests use PDG's RNG:

```javascript
pdg.srand(42);
pdg.rand();
```

Use `pdg.srand()` in any test that depends on random map generation, AI choices, or combat values. Avoid `Math.random()` unless nondeterminism is explicitly acceptable.

## Adding tests

1. Add a `*.test.js` file under `tests/`.
2. Export a function that registers tests with `tests/test-framework.js`.
3. Add the suite to `tests/run-tests.js`.
4. Seed PDG RNG when randomness is involved.
5. Keep assertions focused on observable behavior, not incidental debug output.

Available assertions include:

```javascript
test.assertEqual(actual, expected, message)
test.assertNotEqual(actual, expected, message)
test.assertApproximately(actual, expected, tolerance, message)
test.assertInRange(value, min, max, message)
test.assertTrue(value, message)
test.assertFalse(value, message)
test.assertNull(value, message)
test.assertNotNull(value, message)
test.assertDefined(value, message)
test.assertArrayLength(array, length, message)
test.assertContains(array, value, message)
test.assertGreaterThan(actual, expected, message)
test.assertLessThan(actual, expected, message)
test.assertThrows(fn, message)
```

## Debugging failures

- Check the first failing assertion; later failures may be cascading.
- Re-run with the same seed.
- If layout tests fail after intentional UI movement, update expected positions to the new layout.
- If seeded map/combat results change after an algorithm change, verify the new behavior against the intended rules before updating expected values.
- If a resource test fails, confirm `pdg.res.openResourceFile()` is opening `data/` and that all required IDs exist in `data/strings.txt`.

## CI notes

The suite is designed to exit 0 on success and 1 on failure. It requires the `gad4`/PDG runtime and the project `data/` directory, but it does not require network access.

Fullscreen verification: the command menu control was exercised with trusted browser mouse clicks in all six languages, including entry/exit, wider-screen letterboxing and click coordinates, external exit, rejection and retry. Native transition verification requires a connected monitor; this session reports zero monitors. Run `PDG_EXECUTABLE=/path/to/fixed/pdg ../pdg/test/unit fullscreen port` on a monitor-equipped Mac (the engine test wrapper can also be run from its own checkout). The new PDG backend fix is not present in the pinned v1.2.0 release archive yet.

Map display modes: `tests/map-display-modes.test.js` covers visible-system ranges, finite empty/equal values, target-versus-actual allocations, docked defense, mobile de-emphasis and visibility, chooser actions and legend hit regions. Full suite: 795 passed on both the pinned runtime and rebuilt engine. Browser native mouse clicks selected all seven modes, Esc closed the chooser, hidden tech changes did not affect known shading, and legend clicks left selection unchanged. All six translations and a 640×480 CSS viewport were checked. Evidence: `/private/tmp/galactica-parity/map-display-{before,after}` and `/private/tmp/galactica-map-display-tests.log`.

Nebula preference: the settings/visual suites cover default-on browser/native persistence, unchanged camera/selection/turn, full black clearing without image/parallax work, image cache reuse, fallback art, and background-dependent influence opacity without rebuilding masks. Full suite: 799 passed on the release runtime and rebuilt engine. Native browser clicks, persisted new-game choices and before/after screenshots passed in all six languages; English also passed a full reload. Enabled-background map images match the baseline exactly in every language. Evidence: `/private/tmp/galactica-parity/nebula-{before,after}`, `/private/tmp/galactica-nebula-tests.log`, `/private/tmp/galactica-nebula-native-tests.log`.

Camera command UI: zero/keypad star/F fitting, selected-object centering, translated nonoverlapping View controls, cached plus/minus glyphs and Home/Hunt separation have regression coverage. Enter/Tab consume input in View/map-display/settings while Return continues to save rename/default edits. Full suites: 803 passed on release and current native builds. Actual browser interaction and before/after screenshots passed in all six languages. Evidence: `/private/tmp/galactica-parity/camera-{before,after}` and `/private/tmp/galactica-camera-{tests,native-tests}.log`.

Map pan/scroll UI: `tests/map-scrollbars.test.js` verifies camera inverse extents, proportional thumbs, bounds/axis preservation, no-jump capture, step/page and held-repeat behavior, disabled axes, modal/zoom/resize/Escape cancellation, turn/attention isolation, and hiding offscreen context arcs while retaining selection. Browser-adapter regressions cover external release forwarding, re-entry, blur, real pointer capture and ordinary unduplicated releases. Full suite: 815 passed on release and current native PDG. All six languages passed actual browser thumb/arrow/held input, Option/Alt dragging over objects, outside release, fitted states and modal blocking. Before/after, translated hover hints and smaller CSS viewport screenshots were inspected. Evidence: `/private/tmp/galactica-parity/scrollbars-{before,after}` and `/private/tmp/galactica-scrollbars-{tests,native-tests}.log`.

Map selection: `tests/map-selection.test.js` covers zoom-scaled docking and fleet extents, omitted/dead/member/satellite/fog filtering, explicit overlap choices, pending-order cancellation, actual chooser button hit testing during edits, right-click waypoint/rendezvous targets, live candidate revalidation, unknown names, allied-only status, current viewer, paging and modal input. Cached type glyphs extend icon lifecycle tests. Full suites: 830 passed on release/current native PDG. Native browser interaction and translated screenshots passed in all six languages, including a smaller CSS viewport. Ordinary system views match the baseline exactly. Evidence: `/private/tmp/galactica-parity/selection-{before,after}`, `/private/tmp/galactica-selection-{tests,native-tests}.log`. The separate enemy-fleet inspector leak is captured under `selection-audit` and remains open.

Fleet visibility: `tests/fleet-visibility.test.js` checks v3 Speed/Tech/Class gates, hidden inspector text/orders, Class contents, individual member names, actual map count/color rendering, count-independent unknown marker size, allied/omniscient inspection, control ownership and six-language formatting. Full suites: 836 passed on release/current native PDG. Browser mouse selection and Speed/Tech/Class/owned panels passed in en/de/es/fr/ja/ru; before/after screenshots inspected. Evidence: `/private/tmp/galactica-parity/fleet-{before,after}` and `/private/tmp/galactica-fleet-privacy-{tests,native-tests}.log`. Member health and full member paging remain separate open work.

Complete member access: `tests/fleet-members.test.js` covers every member via paged UI hit testing, later-page inspection/remove/transfer, removed-member/stale-page validation, selection reset, live damage/health updates, long Unicode names, hidden member diagnostics, read-only enemy contents and all-language logical 640×480/600 layouts. Full suites: 844 passed on both release/current native PDG. Final native browser paging and later-page controls passed in all six languages; before/after translated panels, final-page contraction, unknown enemy rows and smaller CSS views inspected. Evidence: `/private/tmp/galactica-parity/members-{before,after}` and `/private/tmp/galactica-fleet-members-{tests,native-tests}.log`. Flat-list health/access are complete; nested fleet groups and the deeper exchange UI remain open.

Transfer destinations: `tests/fleet-transfer-targets.test.js` covers real Transfer-button and chooser hit testing, explicit second/page-two destination choice, cancel without changes/events, modal turn/key handling, single-destination behavior, map visibility independence, moved/removed/foreign/empty targets, source membership/selection/ownership changes, dead/construction units, standalone joins and all-language heading/layout. Full suites: 852 passed on release/current native PDG. Native browser flows passed in all six languages; translated before/after, chooser pages and smaller CSS screenshots inspected. Ordinary source panels are pixel-identical to baseline. Evidence: `/private/tmp/galactica-parity/targets-{before,after}` and `/private/tmp/galactica-fleet-targets-{tests,native-tests}.log`.

Nested groups: `tests/nested-fleet-groups.test.js` adds 14 regressions for actual Group/Parent/member controls, recursive aggregates and movement, cycle protection, repair/defense without duplicate counting, top-container combatants, empty ancestor cleanup, whole-group transfer/remove, knowledge-safe group diagnostics, consumed colony cleanup, docked technology lookup and contained-group AI. Full suites: 866 passed on release/current native PDG. Final browser creation, multilevel navigation, whole-group transfer, orders/departure, enemy privacy and smaller CSS views passed in en/de/es/fr/ja/ru. Before/after and translated screenshots inspected under `/private/tmp/galactica-parity/groups-{before,after}`; logs `/private/tmp/galactica-nested-fleets-{tests,native-tests}.log`.

Shared-container exchange: `tests/fleet-exchange.test.js` adds 11 regressions for actual row/button hit testing, persistent active destinations, both exchange directions, new top-level/nested fleets, intact group wrapping, group/parent inspection, stale destination/source refusal, patrol/self/foreign restrictions, knowledge-safe diagnostics, paging, modal Enter/Tab/outside input and translated button bounds/sorting. Full suites: 877 passed on release/current native PDG. Final native browser exchanges, creation, group navigation, patrol/scrap, sorting/paging, modal keys and smaller CSS views passed in all six languages. Before/after and translated captures inspected under `/private/tmp/galactica-parity/exchange-{before,after}`; logs `/private/tmp/galactica-exchange-{tests,native-tests}.log`.

Fleet roster: `tests/fleet-roster.test.js` adds 12 regressions for shipped v3 row eligibility (including standalone ships, excluding contained/dead/foreign units and docked satellites), recursive aggregates/direct counts, numeric sort direction, colony rank, named/open-space destinations, rendezvous statistics, actual selection/double-click controls, stale rows, complete paging/clamping, modal keys, all-language logical screen bounds and native/browser preference adapters. Full suites: 889 passed on release/current native PDG. Final actual browser sort/reversal, colony ordering, later-page selection, Enter/Tab, Escape, double-click inspection and new-game sort restoration passed in all six languages. Inspected translated and before/after views under `/private/tmp/galactica-parity/roster-{before,after}`; ordinary map captures are pixel-identical in every language. Logs `/private/tmp/galactica-roster-{tests,native-tests}.log`. At that checkpoint saved window position/height was open; the geometry lane below now verifies it.

Roster geometry: `tests/roster-geometry.test.js` adds 11 regressions for title/corner capture, release outside the starting frame, drag/resize bounds, every-row paging after resize, invalid pointer input, Escape/end-turn/right-click guards, default/changed bounds retention, viewport-change capture cleanup, preferred bounds preserved during temporary clamping, window switching, native/browser geometry adapters and translated grip/control separation. Full suites: 900 passed on release/current native PDG. Final actual browser move/resize, paging, reopen, non-left modal input, Escape and release outside the canvas passed in all six languages. Fresh-page reload removes the fixture game and restores stored geometry and sort in a new game; this replaces the earlier start-function check that only returned an existing game. Inspected final translated moved/resized/restored/recovered and before/after views under `/private/tmp/galactica-parity/geometry-{before,after}`; ordinary map captures are pixel-identical. Logs `/private/tmp/galactica-roster-geometry-{tests,native-tests}.log`.
