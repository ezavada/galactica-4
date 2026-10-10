# Testing Guide for Galactica-4

Last reviewed: 2026-10-10

## Running the suite

Automated tests mute the native audio output bus. Sound behavior assertions still run, and the game’s saved sound preference is unchanged. Browser automation launches Chrome with `--mute-audio` for the same reason.

Run tests with the PDG runtime from the project root:

```bash
cd /Users/edz/Documents/Personal/galactica-4
./gad4 tests/run-tests.js
```

Current expected result:

```text
Total: 1459
Passed: 1459 ✓
Failed: 0 ✗
```

The output is intentionally verbose because several game systems still log turn, combat, movement, and construction diagnostics.

Use only the pinned PDG runtime (`./gad4`) for the full suite. The tests and runtime use PDG globals and APIs, including `pdg.res`, `pdg.srand()`, `pdg.rand()`, `pdg.Point`, and drawing attributes.

## Live multiplayer transport checks

The unit framework runs synchronous assertions. Real asynchronous HTTP behavior
is tested separately under the PDG runtime:

```bash
./gad4 tools/test-network-host.js
./gad4 tools/test-network-client.js
./gad4 tools/test-network-join.js
./gad4 tools/test-network-orders.js
./gad4 tools/test-network-clock.js
```

These scripts create temporary localhost hosts and documents, check admission,
authenticated state, reconnecting, cancellation, and request failures, then close
listeners and remove their fixtures. They do not upload data or change game
preferences.

For a packaged web app, run the browser/native-host regression with Chrome:

```bash
node tools/test-web-network-client.cjs /path/to/web-build /tmp/live-client-shots en
```

Repeat for `de`, `es`, `fr`, `ja`, and `ru`. The script starts its own temporary
native host, exercises real browser fetch/CORS traffic and production controls,
and captures the manually-fed client baseline, live client, preserved same-turn
edits, and authoritative next turn. It stops Chrome and the host afterward. This
is transport/renderer coverage. Host setup remains unfinished.

For actual startup/File-menu admission, masked password input, modal outside
clicks, remembered title dragging, retained local documents, automatic turn
refresh, same-document rejoining, localized rejection, and close/logout:

```bash
node tools/test-web-network-join.cjs /path/to/web-build /tmp/join-shots en
```

Repeat for the other five languages. Chrome uses `--mute-audio` and all native
network helpers mute the output bus. These checks preserve sound logic and do
not change gameplay sound preferences. Network-game saving remains unfinished; Save currently reports the localized unsupported-operation
message rather than serializing a partial client as a full local galaxy.

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
- `occupation-reports.test.js`
- `destruction-feedback.test.js`
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

Nested groups: `tests/nested-fleet-groups.test.js` adds 14 regressions for actual Group/Parent/member controls, recursive aggregates and movement, cycle protection, repair/defense without duplicate counting, top-container combatants, empty ancestor cleanup, whole-group transfer/remove, knowledge-safe group diagnostics, colony containment preservation, docked technology lookup and contained-group AI. Full suites: 866 passed on release/current native PDG. Final browser creation, multilevel navigation, whole-group transfer, orders/departure, enemy privacy and smaller CSS views passed in en/de/es/fr/ja/ru. Before/after and translated screenshots inspected under `/private/tmp/galactica-parity/groups-{before,after}`; logs `/private/tmp/galactica-nested-fleets-{tests,native-tests}.log`.

Shared-container exchange: `tests/fleet-exchange.test.js` adds 11 regressions for actual row/button hit testing, persistent active destinations, both exchange directions, new top-level/nested fleets, intact group wrapping, group/parent inspection, stale destination/source refusal, patrol/self/foreign restrictions, knowledge-safe diagnostics, paging, modal Enter/Tab/outside input and translated button bounds/sorting. Full suites: 877 passed on release/current native PDG. Final native browser exchanges, creation, group navigation, patrol/scrap, sorting/paging, modal keys and smaller CSS views passed in all six languages. Before/after and translated captures inspected under `/private/tmp/galactica-parity/exchange-{before,after}`; logs `/private/tmp/galactica-exchange-{tests,native-tests}.log`.

Fleet roster: `tests/fleet-roster.test.js` adds 12 regressions for shipped v3 row eligibility (including standalone ships, excluding contained/dead/foreign units and docked satellites), recursive aggregates/direct counts, numeric sort direction, colony rank, named/open-space destinations, rendezvous statistics, actual selection/double-click controls, stale rows, complete paging/clamping, modal keys, all-language logical screen bounds and native/browser preference adapters. Full suites: 889 passed on release/current native PDG. Final actual browser sort/reversal, colony ordering, later-page selection, Enter/Tab, Escape, double-click inspection and new-game sort restoration passed in all six languages. Inspected translated and before/after views under `/private/tmp/galactica-parity/roster-{before,after}`; ordinary map captures are pixel-identical in every language. Logs `/private/tmp/galactica-roster-{tests,native-tests}.log`. At that checkpoint saved window position/height was open; the geometry lane below now verifies it.

Roster geometry: `tests/roster-geometry.test.js` adds 11 regressions for title/corner capture, release outside the starting frame, drag/resize bounds, every-row paging after resize, invalid pointer input, Escape/end-turn/right-click guards, default/changed bounds retention, viewport-change capture cleanup, preferred bounds preserved during temporary clamping, window switching, native/browser geometry adapters and translated grip/control separation. Full suites: 900 passed on release/current native PDG. Final actual browser move/resize, paging, reopen, non-left modal input, Escape and release outside the canvas passed in all six languages. Fresh-page reload removes the fixture game and restores stored geometry and sort in a new game; this replaces the earlier start-function check that only returned an existing game. Inspected final translated moved/resized/restored/recovered and before/after views under `/private/tmp/galactica-parity/geometry-{before,after}`; ordinary map captures are pixel-identical. Logs `/private/tmp/galactica-roster-geometry-{tests,native-tests}.log`.

System comparison sort preferences: three regressions cover v3 numeric/hull initial directions, reversals, all-language hull ranking, independent native/browser storage, corrupt values and unavailable storage. Full suites: 903 passed on release/current native PDG. Real browser header clicks, reversals and full-page reload restoration passed in en/de/es/fr/ja/ru; fixture disappearance proves a new game was created. Inspected before/after default tables and translated hull-sorted/restored screenshots under `/private/tmp/galactica-parity/system-sort-{before,after}`. System comparison geometry remains unfinished.

System comparison geometry: six new regressions cover shared capture/move/resize, complete paging, retained page on reopening, viewport bounds and minimum height, preserved preferred bounds during viewport contraction, close/Escape/window switch/Enter saves, modal map input, stale capture cleanup, native/browser geometry separation and translated grip/control separation. Full suites: 909 passed on release/current native PDG. Actual browser pointer move/resize, paging, reopen, fresh-page geometry/sort restoration, non-left modal input, Escape and outside-canvas release passed in all six languages. F1 is consumed by the system modal; verified through real key input. The existing fleet roster browser flow also passed after sharing drag/grip helpers. Before/after, moved/resized/reopened/restored and smaller viewport screenshots inspected under `/private/tmp/galactica-parity/system-geometry-{before,after}`; ordinary map views are pixel-identical in every language. Logs: `/private/tmp/galactica-system-geometry-{tests,native-tests}.log`.

Compare Players: `tests/player-comparison.test.js` adds 10 regressions for all eleven v3 numeric fields, integer averages, raw population units, combined production, completed non-dead ships including satellites/nested members, raw power despite damage, unowned/defeated/unassigned styling, category-specific extrema and blue-before-red ties, raw production comparison before formatting, live updates, every-player paging, rendered color/dash/italic choices and modal input. Eleven localized resource IDs (811–821) are required in every language. Full suites: 919 passed on release/current native PDG. Real browser menu opening, full paging, modal function/Tab/Enter and middle/right input, close/V/Escape and smaller CSS views passed in en/de/es/fr/ja/ru. Inspected translated and before/after screenshots under `/private/tmp/galactica-parity/player-comparison-{before,after}`; ordinary map scenes are pixel-identical in all six languages. Logs `/private/tmp/galactica-player-comparison-{tests,native-tests}.log`.

Player-name startup: nine new regressions cover selected default replacement, spaces/Unicode code-point editing, Home/End/arrow/delete behavior, the v3 32-character limit, blank/control validation, viewport text/caret bounds, named human initialization/map generation without changing AI names, browser/native preferences, pointer Start bounds and translated dialog layout. The End key uses PDG code 3 and moves the caret rather than submitting; the printable-boundary constant does not suppress spaces. Full suites: 928 passed on release/current native PDG. Actual browser Start/Enter, Cancel/Escape with preserved setup settings, blank rejection, accented/Japanese/Cyrillic typing, generated game and player comparison names, fresh-page preference restoration and smaller CSS layouts passed in all six languages. Inspected before/after setup and dialog/typed/remembered/blank/comparison/smaller captures under `/private/tmp/galactica-parity/player-name-{before,after}`. Logs `/private/tmp/galactica-player-name-{tests,native-tests}.log`. Game title and broader setup remain unfinished.

Game-title setup: six regressions cover isolated drafts, the v3 27-character limit independently of 32-character player names, blank/control/overlong rejection, metadata integration, measured header fitting and all six translated setup controls. Full suites: 934 passed on release/current native PDG. Actual browser title-button/T opening, Unicode typing, blank rejection, Save/Enter acceptance, Cancel/Escape preservation, 27-character boundary and generated-game header passed in all six languages. Inspected translated dialogs, accepted setup, maximum Japanese header and smaller layouts under `/private/tmp/galactica-parity/game-title-{before,after}`. Shared-renderer player-name dialogs compare pixel-identically in every language. Test logs: `/private/tmp/galactica-game-title-{tests,native-tests}.log`; browser logs: `/private/tmp/galactica-game-title-after-<language>.log`.

Computer-opponent setup: seven regressions cover every local count 0–98, accepted/rejected drafts, preserving other setup metadata, integer/count validation, solo generation and turn advancement without premature victory, twelve-opponent initialization and a generated 99-player galaxy with a homeworld for every player. Full suites: 941 passed on the pinned release and current `pdg-devel/build/darwin/arm64/pdg` native runtime (legacy `build/darwin/pdg` binaries lack the required Animated API). Browser count-row/C, Save/Enter, Cancel/Escape, nonnumeric/99 rejection, +/− bounds, twelve-opponent and solo launches, solo turn advancement and smaller layouts passed in every language. Inspected before/after setup and translated editor/error/game captures under `/private/tmp/galactica-parity/opponents-{before,after}`. Test logs: `/private/tmp/galactica-opponents-{tests,native-tests}.log`.

Startup shared AI-skill popup: six regressions cover the exact v3 five-choice order, accepted-choice highlighting, isolation of other setup metadata and explicit per-player harness overrides, strict integer/zero validation, selected skill forwarding to all computers, separate popup/cancel hit bounds and all six translations. Full suites: 947 passed on release/current native PDG. Actual browser clicks on all five choices, Cancel/Escape/outside-click, direct and popup number shortcuts, R reset, non-leaking Enter/T, clicks while count/title/name dialogs are open, launched-game AI metadata and smaller layouts passed in every language. Inspected translated popup/smaller captures and six before/after setup comparisons under `/private/tmp/galactica-parity/skill-{before,after}`. Logs: `/private/tmp/galactica-skill-{tests,native-tests}.log`, `/private/tmp/galactica-skill-after-<language>.log`.

Fast Game setup checkbox: five regressions cover state transitions without affecting other options, strict boolean validation, positive doubled scan/speed/shipbuilding rules, smaller viewport separation from density/hints and all translated labels/shortcuts. Full suites: 952 passed on release/current native PDG. Actual browser click/F agreement, on/off state, R reset, count/title/skill/name modal isolation, preserved other options, launched fast rules and smaller checked/unchecked states passed in all six languages. Inspected six translated before/after setup comparisons and checked/smaller captures under `/private/tmp/galactica-parity/fast-{before,after}`. Review found the checkbox initially touched the density row; added a gap and repeated final checks. Logs: `/private/tmp/galactica-fast-{tests,native-tests}.log`, `/private/tmp/galactica-fast-after-<language>.log`.

Fog of War setup checkbox: five regressions cover inverse checked/omniscient mapping, preserving other settings, rejecting nonboolean flags, actual enemy diagnostic/mobile visibility, public yellow-star labels and unseen-homeworld aliases with true comparison metadata, control separation and six-language labels. Full suites: 957 passed on release/current native PDG. Browser default/check/uncheck/O agreement, independent Fast Game state, R reset, count/title/skill/name modal isolation, launched enemy information/map names and smaller states passed in every language. Inspected six before/after setup comparisons, checked/unchecked and smaller layouts, and actual fog/all-visible enemy windows under `/private/tmp/galactica-parity/fog-{before,after}`. Shared checkbox fonts match the existing setup style. Logs: `/private/tmp/galactica-fog-{tests,native-tests}.log`, `/private/tmp/galactica-fog-after-<language>.log`. Broader fog/last-seen behavior remains governed by the Section 6 checklist.

Final checkbox-renderer regression check: the Fast Game control crop is pixel-identical before/after in all six languages after matching the existing 13-point setup scale.

Victory/defeat reports: twelve regressions cover actual piece-count transitions, local versus other/observer narratives, duplicate suppression, stalemate and queue ordering, quiet autoplay metadata, modal pointer/keyboard input, Unicode substitution and paging, acknowledgement without turn advance, retained outcome replay, later-turn visibility and accurate event-list turn headings, rendered button labels and all six languages. Full suites: 969 passed on pinned release and current native PDG. Browser ownership transitions on turn 7, opponent notices, personal victory/defeat, actual Continue/View report clicks, Enter/Space/Escape, blocked outside/map input and wheel zoom, paging and stalemate passed in every language. Compared before/after victory/defeat screenshots and inspected translated narratives, replay controls and small layouts under `/private/tmp/galactica-parity/outcome-{before,after}`. Small-layout stress sets Display's drawing dimensions to 480×400 while retaining the 800×600 canvas; it verifies layout/font/paging, not a native window resize. Visual review fixed an accidental action-object button label and the previous-turn-only event-list heading. Logs: `/private/tmp/galactica-outcome-{tests,native-tests}.log` and `/private/tmp/galactica-outcome-{before,after}-<language>.log`.

New Game and retained local documents: ten regressions cover initial setup acceptance, cancellation, full graph/selection/event/allocation/turn/camera retention, independent factories/rules/configurations, duplicate titles with stable identities, unknown IDs, menu controls and menu-only N/G, chooser input isolation, all-document paging, pointer switching, Start/Cancel separation, smaller command menu bounds and six-language resources. Full suites: 979 passed on pinned release/current native PDG. Browser flows passed in all six languages: actual New Game/Cancel clicks, title edits followed by cancellation, nested name cancellation, setup Escape, independent named solo/fast-game creation, actual second-game turn advancement without changing the first, Open Games switching with restored state and camera, outside-click/Enter/Tab/wheel isolation and nine generated documents with paging. Inspected before/after command menus, translated setup/chooser/pages, restored maps and smaller menus under `/private/tmp/galactica-parity/sessions-{before,after}`. Smaller layout stress overrides Display's drawing dimensions to 480×400 with the real 800×600 browser canvas/font, rather than testing a native port resize. Logs: `/private/tmp/galactica-sessions-{tests,native-tests}.log` and `/private/tmp/galactica-sessions-{before,after}-<language>.log`.

Local file documents: `tests/game-save.test.js` and `tests/document-files.test.js` add 13 synchronous regressions; full suites pass 992 tests on release/current native PDG. Separately run `./gad4 tests/document-files-async.js` and `./gad4 tests/documents-async.js` for actual native file transactions, atomic failure preservation, browser handles/download/upload/cancellation, complete UI-controller workflows and all six localized layouts. Both integration commands also pass with the current native `PDG_EXECUTABLE` override. Browser checks passed in every supported language for actual saved-file downloads, current-file Save, Cancel/Revert, retained-document Open, malformed-file preservation, modal input isolation and fresh-page startup import. File input selection uses CDP with real files; OS picker display is outside this headless check. Inspected before/after menus, filename editors, confirmations, errors and restored games under `/private/tmp/galactica-parity/save-{before,after}`. Logs: `/private/tmp/galactica-save-{tests,native-tests}.log`, `/private/tmp/galactica-documents-{tests,native-tests}.log`, `/private/tmp/galactica-document-files-{tests,native-tests}.log` and `/private/tmp/galactica-save-after-<language>.log`.

New-colony setup reports: `tests/colony-setup-reports.test.js` adds nine regressions for actual neutral arrival, default retention, one private attention request, computer/capture exclusions, recapture/removal suppression, Tab/inspector/rename/production controls, pending confirmation, report navigation, save round trips and six-language bounds. Full suites: 1001 passed on release/current native PDG. Actual browser End Turn, Tab, Unicode Rename/Save, production slider clicks, report Go to and recapture suppression pass in all six languages. Before/after inspectors/reports and translated rename/recaptured screens were inspected under `/private/tmp/galactica-parity/colony-setup-{before,after}`. Logs: `/private/tmp/galactica-colony-setup-{tests,native-tests}.log` and `/private/tmp/galactica-colony-setup-{before,after}-<language>.log`.

Allied arrival repricing: five additional `ship-commissioning.test.js` regressions cover every hull, fractional/banked effort, no premature commissioning, stale prices at unchanged technology, paused/enemy systems, actual scout arrival and save round trips. Existing transfer/ETA assertions and the actual fleet-arrival case in `game-rules.test.js` now require the v3 current-tech price. Full suites pass 1006 tests on release/current native PDG. Browser End Turn delivery, changed progress/ETA, courier diagnostics, Production and Pause/Resume pass in all six languages; before/after and translated screenshots inspected under `/private/tmp/galactica-parity/transfer-{before,after}`. Logs: `/private/tmp/galactica-transfer-{tests,native-tests}.log` and `/private/tmp/galactica-transfer-{before,after}-<language>.log`.

Arrival container parity: `tests/arrival-containers.test.js` adds twelve regressions for nested planetary defenders, neutral-member colonization, surviving colony fleets, satellite fallback docking, fleet/group/rendezvous identity, anchor routing, destroyed-target fallback, hostile survivors, live-target courses and system/save containment. Full suites: 1018 passed on release/current native PDG. Actual browser End Turn before/after checks for nested group arrivals, satellite docking and defended-system interception pass in all six languages. Inspected screenshots: `/private/tmp/galactica-parity/arrival-{before,after}`. Logs: `/private/tmp/galactica-arrival-{tests,native-tests}.log` and `/private/tmp/galactica-arrival-{before,after}-<language>.log`.

Control flyby help: `tests/control-help.test.js` adds eleven regressions for linger/change/leave/resize, complete Unicode and mixed-width glyph wrapping, actual-vs-target allocation semantics, star default-destination identity, front-window input isolation, drag/targeting/illustrated suppression, keyboard/click dismissal, native/browser/failing storage, coverage of current actions and setup controls, and all translated explanations. Full suites: 1029 passed on release/current native PDG. Browser before/after checks in all six languages cover startup, sliders/locks/default destinations, End Turn, modal Settings/language, disabling/re-enabling/reload, course Add/click-through, saved-game menu/name editors, resumed-game global preference and smaller windows. Reviewed artifacts: `/private/tmp/galactica-parity/help-{before,after}`. Final browser logs: `/private/tmp/galactica-help-complete-<language>.log`; full-suite logs: `/private/tmp/galactica-help-{tests,native-tests}.log`.

Hull order eligibility: `tests/waypoint-course.test.js` now verifies destination-entry controls and direct/keyboard orders for all four hulls, unfinished ships and fleet members, while retaining independent fleet orders, star default destinations and read-only satellite courses. Full suites: 1031 passed on release/current native PDG. Actual browser before/after checks and reviewed screenshots cover all four hull inspectors and Orders clicks in English, German, Spanish, French, Japanese and Russian. Artifacts: `/private/tmp/galactica-parity/hull-orders-{before,after}`; logs: `/private/tmp/galactica-hull-orders-{tests,native-tests}.log` and `/private/tmp/galactica-hull-orders-{before,after}-<language>.log`.

Hull-choice help: `tests/control-help.test.js` checks all four actual build/default actions in all six languages, untouched production on hover, complete descriptions, and smaller viewport bounds. Full suites: 1032 passed on release/current native PDG. Browser before/after checks click through every hull choice in both windows; screenshots inspected under `/private/tmp/galactica-parity/hull-help-{before,after}`. Logs: `/private/tmp/galactica-hull-help-{tests,native-tests}.log` and `/private/tmp/galactica-hull-help-{before,after}-<language>.log`.

First-hull commissioning: four regressions in `tests/ship-naming-events.test.js` cover each nonfighter hull, source-system report/presentation identity after default departure, enemy privacy in all-visible mode, duplicate and lower-class suppression, and save/restoration of milestones/queued presentations. Full suites: 1036 passed on release/current native PDG. Actual browser before/after checks and inspected translated screenshots cover each hull, dismissal and system-focused reports in all six languages. Artifacts: `/private/tmp/galactica-parity/first-hulls-{before,after}`. Logs: `/private/tmp/galactica-first-hulls-{tests,native-tests}.log` and `/private/tmp/galactica-first-hulls-{before,after}-<language>.log`.

Participant battle reports: four new regressions in `tests/combat.test.js` check actual fleet combat, private/mirrored recipient perspectives, immutable force/loss snapshots, real unarmed inconclusive results, exclusion of planets and surviving colony ships from ship casualties, complete-save persistence and translated human-defender focus. The existing runtime summary regression now checks the owner-relative report. Full suites: 1040 passed on release/current native PDG. Actual browser fleet arrival battles cover winner/loser Events and Go to selection or remembered location in all six languages. Reviewed artifacts: `/private/tmp/galactica-parity/battle-reports-{before,after}`. Logs: `/private/tmp/galactica-battle-reports-{tests,native-tests}.log` and `/private/tmp/galactica-battle-reports-{before,after}-<language>.log`.

Automatic combat report windows: five new regressions in `tests/outcome-reports.test.js` cover actual combat presentation/privacy, modal input isolation, retained Events replay, measured Unicode pages and button rows in all six languages at 320×340, queued complete-save identities and quiet autoplay. Full suites: 1045 passed on release/current native PDG. Actual browser winner/loser battles verify automatic dialogs, Continue/Go to, Events replay, blocked keyboard shortcuts/map clicks/wheel zoom and smaller-window paging in en/de/es/fr/ja/ru. Final before/after and translated screenshots inspected under `/private/tmp/galactica-parity/message-windows-{before,after}`. Logs: `/private/tmp/galactica-message-windows-{tests,native-tests}.log` and `/private/tmp/galactica-message-windows-{before,after}-<language>.log`.

Occupation reports: seven new regressions in `tests/occupation-reports.test.js` exercise actual invasions with and without colony ships, participant-specific resistance/capture reports, hidden lost-system focus, failed invasions and neutral colonies, immutable snapshots, unrelated-player privacy, queued complete saves, final-turn Events replay and translated layouts. Full suites: 1052 passed on release/current native PDG. Actual browser before/after fleet invasions, Continue/Go to, Events replay and smaller windows pass in all six languages; inspected screenshots: `/private/tmp/galactica-parity/occupation-{before,after}`. Logs: `/private/tmp/galactica-occupation-{tests,native-tests}.log` and `/private/tmp/galactica-occupation-{before,after}-<language>.log`.

First-detection ownership: three new regressions in `tests/system-diagnostics.test.js` exercise actual halo drawing at all visibility levels, retained last-seen history with hidden current ownership/mobile markers after a visibility reset, allied/all-visible ownership and neutral stars. Full suites: 1055 passed on release/current native PDG. Actual browser star clicks and before/after knowledge-threshold, lost-detection, allied and all-visible views pass in all six languages; reviewed screenshots: `/private/tmp/galactica-parity/star-ownership-{before,after}`. Logs: `/private/tmp/galactica-star-ownership-{tests,native-tests}.log` and `/private/tmp/galactica-star-ownership-{before,after}-<language>.log`.

Destruction feedback: six regressions in `tests/destruction-feedback.test.js` cover the eight-frame v3 cadence, simulation RNG isolation, actual destroyed-ship reports/locations, cached renderer calls, invisible control consumption and completed report controls, ground resistance without false colony explosions, restored/replayed effects, privacy, quiet autoplay and reduced motion. Full suites: 1061 passed on release/current native PDG. Actual browser fleet battles record all eight frames for winner/loser perspectives, reject invisible Continue clicks and verify final messages, Events replay and ground-resistance effects in all six languages. Reviewed evidence: `/private/tmp/galactica-parity/destruction-{before,after}`. Logs: `/private/tmp/galactica-destruction-{tests,native-tests}.log` and `/private/tmp/galactica-destruction-{before,after}-<language>.log`.


Fleet casualty attribution: two regressions in `tests/combat.test.js` execute actual arrivals and assert that space/ground attacker losses are attributed to the opposing player and defender losses to the attacker. Both full native suites pass (1063 tests); logs `/private/tmp/galactica-fleet-attribution-{tests,native-tests}.log`. No rendering or localized strings changed.

Individual destruction reports: ten regressions in tests/destruction-reports.test.js cover actual standalone/fleet/nested arrivals, suppressed own-system defenders and members, partial fleet survival, actual multi-owner killers, opponent attribution, animation-only completion, retained narrative replay, private saves, quiet autoplay, surviving colony ships, duplicate removal, reduced motion and all six translations. Both full suites pass (1073 tests). Actual browser before/after ship/fleet/nested winner and loser flows pass in all six languages; reviewed captures /private/tmp/galactica-parity/destruction-notices-{before,after}. Logs /private/tmp/galactica-destruction-notices-{tests,native-tests}.log and /private/tmp/galactica-destruction-notices-{before,after}-<language>.log.

Observer capture reports: six regressions in tests/capture-observers.test.js execute actual third-party invasions and verify hidden/detected/allied/all-visible access, private resistance/destruction, saved snapshots and replay, no automatic modal/attention request, failed/neutral/resistance-only outcomes and six-language layouts at 320×340. Full native suites pass (1079 tests). Actual before/after browser hidden/detected/all-visible Events, lost detection, View report and Go to pass in all six languages; reviewed captures /private/tmp/galactica-parity/capture-observers-{before,after}. Logs /private/tmp/galactica-capture-observers-{tests,native-tests}.log and /private/tmp/galactica-capture-observers-{before,after}-<language>.log.

Enemy-event playback: seven regressions in tests/enemy-events.test.js cover Settings hit targets, automatic observer focus, off/manual replay, duplicate and disabled/hidden queues, post-movement current-turn visibility, private/quiet playback, browser/native defaults, per-game saves and legacy compatibility, and localized viewport paging/help. Both full suites pass (1086 tests). Actual browser menu/Settings clicks, hover help, reload persistence and real third-party capture playback pass in all six languages. The short-panel browser fixture sets logical layout dimensions to 320×340, verifies all pages with real clicks/arrows and does not resize the native port. Reviewed captures /private/tmp/galactica-parity/enemy-events-{before,after}; logs /private/tmp/galactica-enemy-events-{tests,native-tests}.log and /private/tmp/galactica-enemy-events-{before,after}-<language>.log.


Reusable colonies: `tests/reusable-colony.test.js` adds five regressions for two successive actual colony arrivals using one ship, nested containment, neutral and captured population, save/restore reuse, and invalid hull/duplicate/incomplete/dead callers. Existing combat, occupation, neutral colony, event, setup, destruction and containment tests now require surviving colonies. Both full suites pass (1171 tests). Six-language browser checks compare first-colony arrival before/after and use actual map clicks and turns to colonize a second system with the original ship. Inspected evidence: `/private/tmp/galactica-parity/reusable-colony-{before,after}`. Logs: `/private/tmp/galactica-reusable-colony-{tests,native-tests}.log`.


Scripted tutorial production: seven regressions in `tests/tutorial-simulation.test.js` verify scoped allocation restoration, source-turn home/New Terra hull guarantees through real end-turn production, positive-effort requirements, computer hull continuation and ordinary-game isolation. Both full suites pass (1178 tests). Browser before/after End Turn comparisons use deliberately low output to expose stalled baseline hulls versus guaranteed tutorial milestones; inspectors were reviewed in all six languages under `/private/tmp/galactica-parity/tutorial-simulation-{before,after}`.


Tutorial progression model: fourteen regressions in `tests/tutorial-controller.test.js` exercise the complete sixty-lesson source action path, startup/recovery and macOS logical pages, ordered exceptions, hidden-button guards, debounced actions, course Retry, production/target guards, bounded rendezvous placement with actual point identity, distinct message/attention lifecycle signals, source effects, snapshots, cancellation and corrupt metadata. Both full suites pass (1192 tests). Logs: `/private/tmp/galactica-tutorial-controller-{tests,native-tests}.log`. The controller is not connected to game input or rendering yet; these tests do not establish a playable, localized UI.


Tutorial game bindings: sixteen regressions in `tests/tutorial-runtime.test.js` call real game actions and verify successful transitions, rejected first courses, guarded production, source names in events, captured rendezvous placement, actual auto-destinations, real event/attention queues, original courier identity after destruction, patrol/comparison/fleet contents, zoom debounce, original-method restoration, failed attachment rollback and snapshots. Late acknowledgment suppresses subsequent queued observers before queue draining. Both full suites pass (1208 tests). Six-language browser before/after map clicks, rename acceptance and build-button checks passed, plus final real Enter/Escape queue-order checks in all six languages. Inspected screenshots: `/private/tmp/galactica-parity/tutorial-runtime-{before,after}`. Logs: `/private/tmp/galactica-tutorial-runtime-{tests,native-tests}.log` and `/private/tmp/galactica-tutorial-runtime-final-<language>.log`. No full guided UI is advertised yet.


## Existing-game tutorial recovery in the browser

With a packaged web build and Google Chrome installed:

```bash
node tools/test-web-tutorial-existing-game.cjs /path/to/web-build /path/to/screenshots en
```

Run once per supported language (`en`, `de`, `es`, `fr`, `ja`, `ru`). Set
`GALACTICA_CHROME` to override the Chrome executable. The regression uses actual
input, captures the lessons and recovery states, and checks the original saved
document survives cancellation and full tutorial completion. The save picker
uses an in-memory fixture; it does not drive the operating system file dialog.
Audio output is muted. Temporary browser profiles are removed when the run ends.


## Closing game documents

```bash
./gad4 tests/documents-close-async.js
```

The asynchronous lane checks Cancel, Discard, successful/deferred/failed/canceled
Save and close, a late write after the active document changes, gameplay-only
modified-state tracking, and all six translated decision layouts/help strings.
`tests/game-sessions.test.js` and `tests/game-save.test.js` cover retained games,
background removal, setup/tutorial guards and content comparisons in the full
suite. Existing file transport and Save/Open/Revert runners remain relevant:
`tests/document-files-async.js` and `tests/documents-async.js`.


For actual browser decisions and retained-game/tutorial restoration:

```bash
node tools/test-web-close-game.cjs /path/to/web-build /path/to/screenshots en
```

Repeat for all six languages. Chrome is muted, and `GALACTICA_CHROME` overrides
its executable. Save/Open pickers use in-memory fixtures, including canceled
picks and failed writes. Temporary browser profiles are removed at completion.


## Application Quit

```bash
./gad4 tests/quit-documents-async.js
./gad4 tests/quit-runtime.js
node tools/test-web-quit.cjs /path/to/web-build /path/to/screenshots en
node tools/test-web-quit.cjs /path/to/web-build /path/to/startup-screenshots en startup
node tools/test-web-quit.cjs /path/to/web-build /path/to/tutorial-screenshots en tutorial
node tools/test-web-quit.cjs /path/to/web-build /path/to/welcome-screenshots en welcome
```

The full suite includes `tests/quit-documents.test.js`. Async checks cover every
open document, save failures/cancellation, deferred writes and changes during
save. The separate native process writes two real files, verifies their content
and exits using the actual PDG Quit API; it must not run inside the shared suite.
The browser runner uses actual clicks/keys and a shutdown event observer. It
checks first/later Cancel, every retained document, failed/canceled pickers,
modal isolation, the actual browser unload confirmation, restart, empty-setup
Quit and configured startup command 10. Repeat ordinary, startup and tutorial browser modes in all six
languages. Chrome is muted; file pickers use in-memory handles. Native window
close and OS Quit integration are still pending and are not covered by these
application-command tests.


## Tutorial modal-window recovery

```bash
node tools/test-web-tutorial-modal.cjs /path/to/web-build /path/to/screenshots en game
node tools/test-web-tutorial-modal.cjs /path/to/web-build /path/to/screenshots en startup
```

Run both modes in en/de/es/fr/ja/ru. The muted browser runner launches Tutorial
through actual Settings buttons, verifies recovery page 101, retries while the
blocking modal is still open, checks outside clicks/turn keys, cancels without
closing Settings, then closes Settings and retries against the real front
window. In-game entry continues through Hide; tutorial cancellation restores
the original document, renderer, camera and selection. Startup entry returns
to setup without a playable document. No synthetic lesson transitions are used.
`tests/tutorial-modal.test.js` covers front-window resolution, Settings actions,
startup preference-model entry, shortcut T, translated labels and hover help.
The complete existing-game runner remains a regression for the normal lessons.


## Ship and fleet call-in reports

```bash
node tools/test-web-callin-reports.cjs /path/to/web-build /path/to/screenshots en
```

Repeat in en/de/es/fr/ja/ru. The muted browser fixture prepares docked ship/fleet
actors, then actual Course controls enable their call-in flags. Actual End Turn
creates owner-private Events narratives; roster/Events selection and Go to are
verified without another turn or a modal report. `tests/callin-reports.test.js`
checks real turn delivery, ship/fleet distinction, system/fixed-point locations,
snapshots, privacy including another human owner, complete saves and lost focus.


## Actual multiplayer End Turn controls

```bash
node tools/test-web-network-orders.cjs /path/to/web-build /tmp/posting-shots en
```

Repeat for `de`, `es`, `fr`, `ja`, and `ru`. This starts a temporary native host,
joins using the actual localized form, changes a production target using the
actual slider, posts through the actual End Turn button, checks the localized
Posted label and edit locks, and posts the second authenticated human through
the same browser transport. It verifies authoritative next-turn refresh and
unlocking, preserves a retained local game, and captures before/posting/posted/
next-turn screenshots. All automated audio output stays muted.

`tools/test-network-orders.js` separately awaits real HTTP posting, duplicate
click single-flight behavior, temporary/permanent ID remaps (including overlap),
server commits followed by lost replies, immutable receipt retries, tampered
and unauthenticated request rejection, host reopen receipts, and logout cleanup.
Unit cases cover all decision families, marker deletion, cyclic memberships,
hidden/self targets, host-only commissioning, patrol/scrap decisions, unassigned
slots, timed endEarly gating, disk-failure rollback and isolated host randomness.

### Native host turn-clock regression

`tools/test-network-clock.js` is awaited separately from the synchronous unit
framework. It uses real one-second host turns, actual localhost admission and
posting, and the production listener scheduler. It checks the untimed first
turn, authenticated countdown records, paused/offline players, automatic
expiration, remaining-time persistence across stopped/reopened listeners,
failed-save rollback/retry and shutdown. Audio is muted, and all temporary hosts
and documents are removed. Run it with both pinned and current public runtimes.

Clock state is currently transport/service functionality. Host setup controls,
visible countdowns and remote administration are still pending; this regression
does not claim those UI requirements are implemented.
