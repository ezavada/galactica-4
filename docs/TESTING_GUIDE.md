# Testing Guide for Galactica-4

Last reviewed: 2026-10-11

## Running the suite

Automated tests mute the native audio output bus. Sound behavior assertions still run, and the game’s saved sound preference is unchanged. Browser automation launches Chrome with `--mute-audio` for the same reason.

Run tests with the PDG runtime from the project root:

```bash
cd /Users/edz/Documents/Personal/galactica-4
./gad4 tests/run-tests.js
```

Latest verified result with the current public/development native executables:

```text
Total: 1810
Passed: 1810 ✓
Failed: 0 ✗
```

The artwork checks now validate the selected replacement assets and original
provenance in its archive location. Both native executables pass all 1,810 tests.
The previous two failures are resolved; dated writeback logs retain their actual
results rather than being presented as green runs.

The output is intentionally verbose because several game systems still log turn, combat, movement, and construction diagnostics.

Use a native PDG runtime for the full suite. `./gad4` selects the pinned release by default; set `PDG_EXECUTABLE` to the rebuilt public or development executable when validating engine changes. The tests and runtime use PDG globals and APIs, including `pdg.res`, `pdg.srand()`, `pdg.rand()`, `pdg.Point`, and drawing attributes.

## Live multiplayer transport checks

The unit framework runs synchronous assertions. Real asynchronous HTTP behavior
is tested separately under the PDG runtime:

```bash
./gad4 tools/test-network-host.js
./gad4 tools/test-network-client.js
./gad4 tools/test-network-join.js
./gad4 tools/test-network-orders.js
./gad4 tools/test-network-writeback.js
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
is transport/renderer coverage; actual host setup checks are documented below.

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

### Visible multiplayer countdown

Run against the packaged application with the normal muted Chrome/native host
fixture:

```bash
node tools/test-web-network-countdown.cjs /path/to/web-build /tmp/countdown-shots en
```

Repeat in de/es/fr/ja/ru. Passing `before` after the language captures the old
countdown-less application baseline for comparison. The regression joins through
actual controls, inspects paused/seconds/hours/day labels, retains edited targets
and selection during same-turn refresh, posts through actual End Turn, and
checks that a local zero countdown waits for the real native scheduler's new
turn. Screenshots include baseline, paused/running, posted, awaiting-host and
next-turn states. Fixture clock controls exist only in the temporary test host.

The earlier runtime-clock item has since gained this client countdown UI. Host
setup widgets and remote administration controls remain pending.


### Desktop host creation and safe shutdown

```bash
./gad4 tools/test-host-setup.js
node tools/test-web-host-setup.cjs BUILD_DIR SCREENSHOT_DIR en
```

Repeat the browser run in de/es/fr/ja/ru. The native integration checks actual
exclusive host files, listeners, ordinary authenticated joining, recoverable
port collisions, save-failure rollback, Stop and shutdown. The browser runner
uses the shipped shared UI with a test-only adapter to actual native hosts;
production browsers cannot create listeners and explicitly say so. Actual
controls cover startup/File Host, independent local documents, all four time
units and end-early defaults, modal input isolation and persisted dragging,
real two-human posting/timed turns, Stop, failed-save Quit and successful retry.
The adapter adds no production remote host-creation or administration endpoint.
All audio output is muted. Before/after screenshots are under
`/private/tmp/galactica-parity/host-setup-{before,after}/<language>`.
Full native suites on both runtimes: 1,476 passed, 0 failed.


### Saved hosts and dedicated hosting

```bash
./gad4 tools/test-host-reopen.js
./gad4 tools/host-game.js HOST_FILE 0 en
```

The awaited integration verifies galaxy/turn/identity/password/paused-clock
preservation, normal authenticated rejoining, same-path/symlink reuse,
independent-process exclusive leases, duplicate game identities, malformed file
preservation, failed-bind recovery with the lease retained, dedicated listener
startup and save-before-SIGTERM shutdown, and stale lease recovery after a
real SIGKILL. It passes on both native PDG runtimes. The dedicated command
opens existing hosts and supports named new-game options described below.
Local-turn conversion is available in the desktop Open as host flow.

`tools/test-web-host-setup.cjs` also covers File Open as host, localized missing
file errors, preserved timed turn/claims, ordinary saved-player rejoining, and
Stop. As above, the shared UI uses a test-only adapter to actual native hosts;
production browser hosting remains unavailable. Run the focused final dialog flow with:

```bash
node tools/test-web-host-setup.cjs BUILD_DIR SCREENSHOT_DIR en reopen
```

Repeat in de/es/fr/ja/ru. Before screenshots are under
`/private/tmp/galactica-parity/host-reopen-before/<language>` and final compact
dialog/error/rejoin screenshots under
`/private/tmp/galactica-parity/host-reopen-final/<language>`. The focused runner
prepares a real native two-human saved turn, then uses actual Host/File actions,
filename editing, Enter, missing-file errors, rejoining and Stop. The complete
flow also checks creating a new host, timer units, normal posting and save-safe
Quit. Native SIGTERM tests include a real write-permission failure followed by
successful retry.


The saved-host browser runner also makes the already-loaded network module URL
return HTTP 503 and verifies that cached exports remain available without
another source request. The production CommonJS loader now checks its cache
before fetching. The runner records input and frame counters before dispatch,
and keeps the Chrome page focused/active with background throttling disabled;
this avoids a hidden automated page ceasing to draw during lengthy client/Quit
flows. Render failures include page visibility and controller state in the log.
These settings affect automation only, and audio remains muted.


### Local saved-turn conversion

```bash
./gad4 tools/test-host-conversion.js
node tools/test-web-host-setup.cjs BUILD_DIR SCREENSHOT_DIR en convert
```

Repeat the shared UI run in de/es/fr/ja/ru. The browser uses a test-only localhost
adapter to the real native desktop host service; production browser hosting
remains unavailable. `before-convert` captures the committed pre-conversion UI.
All audio output stays muted.

The awaited native test covers snapshot inspection/cancel, human count bounds,
first-N human roles, preserved galaxy/economy/turn, exclusive output publication,
real write-permission failure and retry, unchanged source and live document,
untimed open human slots, authenticated former-AI posting, authoritative next
turn, and saved-host rejoin. Ordinary Open rejects host files with localized
messages in all six languages. Unit regressions also verify graph references,
private destinations, AI skill preservation, completed-game outcomes and failed
partial-write cleanup. The UI flow uses actual File/Open as host, filename/count
editing, Enter/Escape, localized validation, exclusive filename errors, Join,
Stop and reopening with the former-AI human claim retained.

Native results: `/private/tmp/galactica-host-conversion-{native,public-native}.log`.
Full suites: `/private/tmp/galactica-host-conversion-{unit,public-unit}.log`.
Before/after screenshots: `/private/tmp/galactica-parity/host-conversion-{before,after}/<language>`.
UI logs: `/private/tmp/galactica-host-conversion-ui-<language>.log`.


### Dedicated new-game commands

```bash
./gad4 tools/test-host-command.js
./gad4 tools/host-game.js --help --language en
```

The awaited tool launches the actual dedicated entry in all six languages,
checks localized help/invalid-input errors, forwards setup/AI/map/timer/speed/fog
options into real saved hosts, joins and posts both human turns, saves on SIGTERM,
rejoins through named load, rejects existing output without overwrite, and starts
an AI-only host that advances without login. An occupied port on the same wildcard
bind address must leave a complete reopenable host file with its lease released.
All client-facing robot lobby data remains validated; no human admission slot is
invented. Unit regressions cover parser bounds, conflicting/duplicate flags,
positional compatibility, AI-only pause, completed/sole-survivor stopping and
failed-save rollback/retry. This command-only item adds no graphical surface.

Results: `/private/tmp/galactica-host-command-{unit,public-unit,native,public-native}.log`.
The full unit suite expects 1,496 passes.


### Desktop host turn controls

```bash
./gad4 tools/test-host-controls.js
node tools/test-web-host-setup.cjs BUILD_DIR SCREENSHOT_DIR en controls
node tools/test-web-host-setup.cjs BUILD_DIR SCREENSHOT_DIR en controls-pages
```

Repeat the ordinary controls run in de/es/fr/ja/ru. `before-controls` captures
the committed status window without administration buttons. The same test-only
localhost adapter exercises the real native service; production browser hosting
and remote administration are not enabled by this fixture. Audio remains muted.

The awaited native test covers assigned/living unposted warnings, cancellation,
durable pause and client clock propagation, forced turns while paused, stale
confirmation rejection, actual denied writes/rollback/retry, saved pause/reopen,
resume/rejoin, completion during confirmation, and desktop/record/action guards.
Units verify exact forced-turn persistence, rollback, pending-list paging, layout
bounds, translated controls, completion guards and absent-listener behavior.
The actual-control browser flow covers Pause/Resume, pending-player names,
Keep waiting/Escape, confirmation/Enter, stale-turn and failed-save errors,
retry, authenticated client countdowns, retained local documents and Stop.
`controls-pages` uses seven real claimed players to exercise Next/Previous and
the final pending-player page.

Before/after screenshots: `/private/tmp/galactica-parity/host-controls-{before,after}/<language>`.
Paged screenshots: `/private/tmp/galactica-parity/host-controls-pages/en`.
Native/full-unit logs: `/private/tmp/galactica-host-controls-{native,public-native,unit,public-unit}.log`.
UI logs: `/private/tmp/galactica-host-controls-ui-<language>.log`.
The full suite expects 1,501 passes.


### Host player ejection

```bash
./gad4 tools/test-host-eject.js
node tools/test-web-host-setup.cjs BUILD_DIR SCREENSHOT_DIR en eject
node tools/test-web-host-setup.cjs BASELINE_BUILD_DIR SCREENSHOT_DIR en before-eject
```

Repeat the browser runs for de/es/fr/ja/ru. The native check awaits real HTTP
requests in all six languages, including durable permission failure/retry,
posted-order preservation, same-slot password rejoin, an order body arriving
after ejection, completed hosts and save/reopen. Unit regressions live in
`tests/host-eject.test.js`. The browser fixture joins through the ordinary UI,
checks the actual application's disconnect banner and retained model/identity,
then rejoins through the same password dialog. Native and browser audio output
is muted. Current full suite: 1,537 passed on both PDG runtimes.

Screenshots: `/private/tmp/galactica-parity/host-eject-{before,after}/<language>`.
Logs: `/private/tmp/galactica-host-eject-{unit,public-unit,native,public-native}.log`
and `/private/tmp/galactica-host-eject-{before,after}-<language>.log` (English
initial after run: `/private/tmp/galactica-host-eject-ui-en.log`).


### Private host admission

```bash
./gad4 tools/test-host-admission.js
./gad4 tools/test-host-command.js
node tools/test-web-host-setup.cjs BUILD_DIR SCREENSHOT_DIR en admission
node tools/test-web-host-setup.cjs BASELINE_BUILD_DIR SCREENSHOT_DIR en before-admission
```

Repeat the browser flow for de/es/fr/ja/ru; both native tools already exercise
all six languages. Policy tests cover v3 allow-list precedence, code-free joins,
blocked codes, malformed/corrupt data, private projections, revision guards,
rollback, canceled/paged drafts and transient client code entry. Actual native
flows check failed filesystem writes and retry with live sessions, preserved
posts/clock, admitted/rejected joins and unrestricted password rejoining.
Dedicated process checks verify policy publication before first listen,
replacement before reopening listen, invalid-file before-IO errors, persisted
rules and normal shutdown. Browser controls exercise the full policy editor and
ordinary Join/Rejoin dialogs. Full suite: 1,549 passes on both PDG runtimes.

Screenshots: `/private/tmp/galactica-parity/host-admission-{before,after}/<language>`.
Logs: `/private/tmp/galactica-host-admission-{unit,public-unit,native,public-native,command,public-command}.log`
and `/private/tmp/galactica-host-admission-{before,after}-<language>.log` (English
after: `/private/tmp/galactica-host-admission-ui-en.log`).

### Administrator access and remote controls

The dedicated host accepts `--admin-password-file FILE` on `--new` and `--load`.
Store a JSON string in the file, for example `"my administrator password"`.
It is read before listening; an empty JSON string disables access. Omission
preserves saved credentials when reopening a host. The desktop host status
window also provides Administrator access with a masked field.

Run `./gad4 tools/test-host-command.js` for actual new/load credential checks
and `./gad4 tools/test-host-admin.js` for owner-service and administrator
protocol checks. Both mute automated audio and cover all six languages.
For the rendered local password editor, use:

```sh
node tools/test-web-host-setup.cjs BUILD_DIR SCREENSHOT_DIR en admin-password
```

Repeat for de/es/fr/ja/ru. The `before-admin-password` mode captures baseline
host status against the pre-administrator frontend. The editor check exercises
masked input, cancel, failed-save retry, login using the saved password, stale
drafts, credential revocation and disable. For the real administrator Join/control flow, use:

```sh
node tools/test-web-host-setup.cjs BUILD_DIR SCREENSHOT_DIR en remote-admin
```

Repeat for all six languages. `before-remote-admin` captures the previous Join
window. The current mode covers disabled/wrong/correct administrator login,
slot and local-document isolation, read-only saves, pause/resume with failed-save
retry, pending-player and stale force confirmations, settings, rename/ejection,
admission, observer refresh, disconnect/rejoin and actual logout on Close.
Before/after Join screenshots and all localized remote control layouts should
be inspected. Full current unit count: 1,568 passed on both PDG runtimes.

### First-turn system state editing

Run actual local, host-owner and remote-administrator editing against native
listeners on both PDG runtimes:

```sh
./gad4 tools/test-initial-state-edit.js
PDG_EXECUTABLE=/path/to/public/pdg ./gad4 tools/test-initial-state-edit.js
```

The runner covers all six languages with muted output. It checks local zero-value
ownership and saved restoration, all four host operations, actual authenticated
editor adapters, read-only player isolation, same-turn projection refresh,
construction/credit retention, failed-save rollback/retry, stale and late
requests, privacy and durable host reopening.

Capture and exercise the real application dialogs:

```sh
node tools/test-web-host-setup.cjs BEFORE_BUILD_DIR BEFORE_SCREENSHOTS en before-initial-state
node tools/test-web-host-setup.cjs BUILD_DIR AFTER_SCREENSHOTS en initial-state
```

Repeat for de/es/fr/ja/ru. The muted browser drives system paging, cancellation,
failed-save retry, population/technology/owner/ship dialogs, local selected-star
editing, administrator login and map editing, observer refresh and rejection
when the turn advances with a draft open. Inspect before/after host status,
translated system lists and numeric/hull dialogs. Full current suite:
**1,581 passed on both PDG runtimes**.

### Remembered multiplayer passwords

```sh
./gad4 tools/test-network-join.js
./gad4 tools/test-network-passwords.js
PDG_EXECUTABLE=/path/to/public/pdg ./gad4 tools/test-network-join.js
PDG_EXECUTABLE=/path/to/public/pdg ./gad4 tools/test-network-passwords.js
node tools/test-web-host-setup.cjs BEFORE_BUILD_DIR BEFORE_SCREENSHOTS en before-passwords
node tools/test-web-host-setup.cjs BUILD_DIR AFTER_SCREENSHOTS en passwords
```

The native password runner covers all six languages with isolated test preferences
and actual host listeners. Browser checks should be repeated for de/es/fr/ja/ru:
default-off checkbox, opt-in, masked restoration, failed/cancelled preservation,
role separation, actual application reload, forgetting after a successful
unchecked login, and public descriptor privacy. Inspect before/after Join,
restored/rejected rejoin and administrator layouts. Output remains muted.
Current full suite: **1,589 passed on both PDG runtimes**.

### Saved multiplayer game lists

```bash
./gad4 tools/test-network-saved-hosts.js
PDG_EXECUTABLE=/path/to/public/pdg ./gad4 tools/test-network-saved-hosts.js
node tools/test-web-host-setup.cjs BEFORE_BUILD_DIR BEFORE_SCREENSHOTS en before-saved-hosts
node tools/test-web-host-setup.cjs BUILD_DIR AFTER_SCREENSHOTS en saved-hosts
```

Repeat browser checks for de/es/fr/ja/ru. The native script checks all six
languages against real temporary hosts. Unit regressions cover canonical
addresses, authenticated metadata upgrades, game/player/admin identity scope,
bounded lists, malformed or unavailable preferences, native config isolation,
keyboard/pager selection and translated layouts. Browser controls exercise
empty/disabled states, manual address entry, paging/removal, write-failure retry,
actual player and administrator admission, masked saved passwords and application
reload. Preferences use an isolated browser profile or in-memory native fixture;
all hosts and temporary files are cleaned up. Audio output is muted.

Evidence for this item is recorded in V3_V4_FEATURE_STATUS.md after validation.

### Native LAN discovery

```bash
./gad4 tools/test-network-discovery.js
PDG_EXECUTABLE=/path/to/public/pdg ./gad4 tools/test-network-discovery.js
node tools/test-web-host-setup.cjs BEFORE_BUILD_DIR BEFORE_SCREENSHOTS en before-lan
node tools/test-web-host-setup.cjs BUILD_DIR AFTER_SCREENSHOTS en lan
```

Repeat shared-UI checks for de/es/fr/ja/ru. Native checks use actual UDP multicast
and HTTP admission: simultaneous hosts, public metadata, live slot counts,
failed-stop preservation, expiry after successful stop, scan cancellation,
multiple native interfaces and a real occupied-UDP-port failure with direct HTTP
fallback and recovery on reopening. The default fixture scopes UDP to loopback and also checks the normal
multi-interface API. This does not prove physical-network peer discovery. Run
`GALACTICA_LAN_INTERFACE=<physical IPv4 address> ./gad4 tools/test-network-discovery.js`
for the explicit physical adapter check; its current environment blocker is
recorded in V3_V4_FEATURE_STATUS.md. Fixtures use temporary files and an ephemeral
discovery port.

Nine unit regressions cover bounded queries/announcements, nonce/protocol
validation, sender-derived endpoints, per-address expiry, multihomed deduplication,
stable selection, paging, cancellation and translated layouts/failures. The
normal browser explicitly reports that UDP discovery requires the desktop app.
For the shared dialog controls, browser automation uses a test-only bridge to an
actual native multicast browser. This does not enable UDP in the released web
app. Native and browser output stays muted.


## Multiplayer chat

Run the full synchronous suite with either native runtime, then the actual HTTP
integration checks:

```bash
./gad4 tools/test-network-chat.js
PDG_EXECUTABLE=/Users/edz/Documents/Personal/pdg/build/darwin/arm64/pdg/src/pdg.app/Contents/MacOS/pdg ./gad4 tools/test-network-chat.js
node tools/test-web-host-setup.cjs /path/to/before-build /tmp/chat-before en before-chat
node tools/test-web-host-setup.cjs /path/to/current-build /tmp/chat-after en chat
```

Repeat browser checks for de/es/fr/ja/ru. Twenty-one new synchronous regressions
cover authenticated routing, private identity isolation, unclaimed-slot binding,
saved offline reports/acknowledgments, failed-write rollback, unread capacity,
strict response validation, Unicode paging, draft/history retention, uncertain
retry editing and localization. The native integration runner exercises real
HTTP with players/admins in all six languages, host reopening, response-loss
retry and late cancellation. It never replaces the player's pending game orders.
The browser runner uses actual input, native hosts and player/admin transport:
recipient pages, broadcast/private traffic, incoming selection, modal outside
clicks, failed-send draft retry, retained history, viewport-clamped persistent
dragging, admin composition, localized offline report/acknowledgment and
unsupported disconnected sending. Chrome and native test audio remain muted.


Show/Hold game reports verification:

```sh
./gad4 tests/run-tests.js
node tools/test-web-host-setup.cjs /private/tmp/galactica-report-ui-app /private/tmp/galactica-parity/report-after/en en reports
```

Repeat the browser check for de/es/fr/ja/ru. Mode `before-reports` captures the
previous build's menu without the controls. The muted runner checks actual menu
Hold, pending colonization reports, ordered one-shot Show, acknowledgements,
retained Hold for subsequent reports, and automatic resume. Unit coverage also
checks manual replay, privacy, old-save defaults, Lab/Stardock/outcome saves and
client subject identity across refresh.


Tutorial hosting recovery verification:

```sh
node tools/test-web-host-setup.cjs /private/tmp/galactica-tutorial-host-ui-app /private/tmp/galactica-parity/tutorial-host-after/en en tutorial-host
```

Repeat for de/es/fr/ja/ru. Mode `before-tutorial-host` captures the rejected Host
entry in the previous build. The muted runner covers visible page 103 over Host,
Cancel/Escape, local setup/name continuation, restoration of the unchanged
original document, cancelling instructions without closing Host, and actual
native-backed host creation ending the instructions. The fixture stops its hosts
and removes temporary files.


Background network turn audio verification:

```sh
./gad4 tools/test-network-turn-attention.js
node tools/test-web-host-setup.cjs /private/tmp/galactica-turn-ui-app /private/tmp/galactica-parity/turn-after/en en turn-attention
```

Run the native helper with both PDG runtimes and the browser helper in all six
languages. Both are muted. The real host advances behind a selected local game;
Warning playback, foreground silence, duplicate guards, mute/no replay and actual
browser focus loss are checked. Mode `before-turn-attention` captures the previous
build without the cue. Native OS activation detection remains pending. The separate foreground notice
checks below cover its modal presentation.


Foreground network turn notice verification:

```sh
node tools/test-web-host-setup.cjs /private/tmp/galactica-turn-notice-ui-app /private/tmp/galactica-parity/turn-notice-after/en en turn-notice
```

Repeat for de/es/fr/ja/ru. Mode `before-turn-notice` captures the previous build.
The muted real-host runner verifies the localized caption, 1.5-second dismissal,
keyboard/outside-click blocking, constrained persisted dragging, duplicate refresh,
advanced rejoin, deferred offline-report playback and notices while Sound is off.
It shuts down fixture hosts and removes their temporary files. Run `turn-attention`
against the same build to verify background Warning and actual browser focus loss.
Native OS activation integration remains outside these browser checks.


Native application focus verification (requires a rebuilt PDG with the query):

```sh
PDG_EXECUTABLE=/path/to/rebuilt/pdg ./gad4 tools/test-network-turn-attention.js --native-focus
node tools/test-web-host-setup.cjs /private/tmp/galactica-focus-api-ui-app /private/tmp/galactica-parity/focus-api-after/en en turn-attention-focus-api
```

The native helper verifies actual unfocused/no-window state and cached Warning
through real HTTP arrivals, while muting the output bus. The browser mode requires
newly compiled WebAssembly and checks the query against real focus loss/recovery;
it retains the ordinary attention/mute/duplicate checks. PDG's native
`pdg-application-focus` CTest fixture exercises multiple windows, foreign focus,
recovery, closure and offscreen-only states. Linux can run it with `xvfb-run -a`.
No connected display is recorded as skipped; that is not foreground validation.
The pinned archive still lacks the query and needs a runtime update.

### Saved multiplayer startup actions

`tools/test-web-host-setup.cjs` accepts `startup-host`, `startup-join`, and
`startup-open-host` to seed the shipped numeric StartAction before application
launch. Prefix each mode with `before-` when testing the pre-change app snapshot.
It verifies automatic opening, the matching manual form, cancellation without
replay, preference preservation and actual native create/join/reopen/stop work.
Host operations use a test adapter to real native listeners; browser hosting
remains unavailable in the product. All automation is muted.

```bash
node tools/test-web-host-setup.cjs BUILD_DIR SCREENSHOT_DIR ja startup-join
GALACTICA_TEST_STARTUP_INTRO=1 node tools/test-web-host-setup.cjs BUILD_DIR SCREENSHOT_DIR en startup-host
```

The introduction variant verifies that the command waits for dismissal. The
unit suite additionally covers native numeric preference reads, returning
installation detection, absent/unknown commands, real dialog models and the
once-only lifecycle.

### Native quit-request integration

With a rebuilt PDG runtime that exports `eventType_QuitRequest`, OS/window-close
requests use the same save decisions as application Quit. The pinned v1.2.0
archive does not yet contain this engine change.

```bash
node tools/test-web-quit.cjs /private/tmp/galactica-quit-request-app /private/tmp/quit-request-en en native-request
```

Repeat for de/es/fr/ja/ru. This muted browser fixture dispatches the event into
the real game, checks repeated requests, Cancel, all retained games, failed and
canceled saves, restart and empty setup. Actual Linux X11 window-close delivery
is verified separately with PDG's `test/cxx/test-quit-request.cpp` window mode
and `test/cxx/test-quit-request.js` native bridge fixture. Browser dispatch does
not prove operating-system event delivery. Connected macOS and Windows GUI
validation remain pending. Current evidence and release-runtime limitations are
recorded in `docs/reference/STARTUP_ABOUT.md`.

### Local post-game turns

```bash
node tools/test-web-postgame.cjs /private/tmp/galactica-postgame-app /private/tmp/postgame-en en
```

Repeat for de/es/fr/ja/ru. Add `before` when comparing with the previous packaged
application: it confirms the old frozen turn. The muted runner prepares a
turn-seven endgame, uses actual End Turn and acknowledgment controls, then checks
real post-game production, the unchanged recorded result and complete save data.
No direct `markGameWon`/`endTurn` call substitutes for the tested UI actions.
Local continuation is implemented; multiplayer host clocks/posting still need
separate post-game work.


### Desktop document busy/status/error windows

```bash
node tools/test-web-document-status.cjs BUILD_DIR SCREENSHOT_DIR en after 640 340
```

Repeat for de/es/fr/ja/ru and 800×600/320×340. Use `before` with the preceding
application build to verify its truncated caption and compare screenshots.
`PDG_EXECUTABLE` selects the native bridge runtime; otherwise `gad4` uses the
configured release runtime. The helper starts its own temporary localhost
bridge and muted Chrome, then opens an actual saved game and exercises real
native writes/reads, saved-content checks, canceled late Open/Revert results,
noncancelable atomic Save, true ENOTDIR/corrupt/missing-file errors and recovery.
It also checks each busy/status/error modal's drag, clunk and action behavior.
The fixed build must reconstruct the entire long literal caption using actual
paging buttons and Left/Right shortcuts. Both the native bridge and browser
are muted; ordinary gameplay sound remains enabled. This does not exercise
an operating-system picker or establish physical native-window focus behavior.

Current audit: 36 actual-input runs pass in all six languages and three
viewport sizes. Of 342 paired screenshots, 288 match exactly; only the 54
saved-message scenes change. Evidence is in
`/private/tmp/galactica-document-message/verified` and
`galactica-document-message-verified-comparison.json`. Full native suites on
public/private runtimes pass 1,761 tests; no public PDG changes are made.


### Remote-host modal connection feedback

```bash
node tools/test-web-remote-admin-status.cjs BUILD_DIR SCREENSHOT_DIR en after 640 340
```

Repeat for de/es/fr/ja/ru and 800×600. Use `before` with the preceding build
(which already preserves refresh-time title drags) to assert the connection
error is hidden in the host modal. The fixed build must draw the complete
actual session error after real native-host administrator password revocation,
with mutation controls disabled. The muted helper also rechecks existing
remote saves, cancellation, forced turn, title dragging across refresh, DOM
blur release and disconnect leaving the host running. It records drawn
caption text as well as screenshots and layout/control metadata.

All 24 input runs pass. Initial 216-pair comparison: 114 identical, 57
temporary-address-only, 24 intended caption changes and 21 disabled-label
intensity differences. German/Spanish fixed-build repeats match the baseline
outside addresses/caption. An unchanged Russian baseline repeat reproduces
its intensity variation; using that repeat leaves only the intended caption
change. Retain these artifacts rather than claiming all ordinary scenes were
initially identical. Evidence is under
`/private/tmp/galactica-remote-admin-status/{verified,repeat,repeat-baseline}`
and corresponding comparison reports. Both full native suites pass 1,763
tests; `tools/test-host-admin.js` also passes its actual six-language native
authorization checks. Physical focus, other busy/error variants and compact
gameplay layouts remain separate audits.


### Complete and persistent Join feedback

```bash
node tools/test-web-join-status.cjs BUILD_DIR SCREENSHOT_DIR en after 320 340
```

Repeat for de/es/fr/ja/ru and 800×600/640×340. Use `before` with the preceding
build to check its overflowing caption and feedback clearing on a successful
lobby refresh. The muted helper starts an actual native host with a test-only
access policy, provokes real duplicate-name/code rejection, verifies denial
does not claim a slot, drags the window, refreshes the actual lobby and joins
with an allowed code. It captures the recovered map too. Fixed-build runs
add explicit exact-font component probes for each message/mode at all three
sizes, storing geometry in `measured-layouts.json`; they do not substitute
mocked responses for the actual admission flows.

Current verification: 36 before/after runs and six extra measurement runs
pass; the latter cover 810 layouts. Of 90 paired scenes, 18 recovered maps
match exactly, 49 differences are temporary address text only and 23 are
intended feedback changes. Artifacts are in
`/private/tmp/galactica-join-status/{verified,measured}` and
`galactica-join-status-comparison.json`. Both native suites pass 1,764 tests.
`tools/test-network-lobby-information.js` also exercises real wrong-password
feedback surviving metadata refresh/error/recovery in all six languages;
`tools/test-network-join.js` checks pending/canceled admission and inspection.
The unchanged original Join class fails the new native refresh regression.
Compact footer/summary crowding and other busy/error variants remain separate
UI audits. Public PDG remains unchanged.


### Compact direct Join form

Run `node tools/test-web-join-layout.cjs BUILD_DIR SCREENSHOT_DIR LANGUAGE
before|after WIDTH HEIGHT` against the retained 551e314 baseline or the current
web build. Use en/de/es/fr/ja/ru at 800×600, 640×340 and 320×340. The native host
requires its allowed admission code; both host and Chrome are muted.

The helper drives actual duplicate-name/code rejection, refresh, title drag,
retry and successful admission. Narrow runs additionally switch through Rejoin
and Administrator, inspect the restored Join lobby and capture each form.
Current narrow runs verify wheel delivery, PageDown, arrows, final checkbox
access and Tab revealing its field. Actual-font assertions check complete
button captions/hints and rectangle separation, plus 810 message/mode/size
geometry cases across six languages. This is separate from claiming every
error was individually emitted by the real host. Recovered-map screenshots
use the same animation time before/after.

Final verification: 36 matched input runs pass; 126 screenshot pairs comprise
18 identical recovered maps, 60 temporary-address-only ordinary/short lobby
differences, and 48 intended narrow-layout changes. Both complete native
suites pass 1,765 tests. Evidence lives in
`/private/tmp/galactica-join-layout/verified`,
`galactica-join-layout-comparison.json`, and
`galactica-join-layout-{pdg,pdg-devel}-unit.log`. Saved-host/LAN/information
control bars and other busy/error variants remain separate audits.


### Compact saved-host browser

Run `node tools/test-web-saved-hosts.cjs BUILD_DIR SCREENSHOT_DIR LANGUAGE
before|after WIDTH HEIGHT` against the f9cec7e baseline and current web build.
Use all six languages at 800×600, 640×340 and 320×340. The temporary native
host and Chrome are muted; bookmark/profile storage is isolated.

The helper uses actual UI controls for invalid-address handling, five adds,
paging, deletion, dismissal/reopening, injected localStorage write failure,
retry, persisted constrained dragging, outside-click clunk and admission to
the actual native host through the selected bookmark. It then opens the
browser through the model to examine the saved-game descriptor and drive
list keyboard paging. Current narrow runs additionally assert actual wheel
movement, PageDown/PageUp, caption/hint fit and visible keyboard selection.
The fixture skips the native host port when constructing dummy addresses;
a retained baseline artifact proved an earlier 61001 collision.

All 36 matched workflows pass. Of 234 screenshot pairs, 90 match exactly
(including all 18 recovered maps), 72 ordinary/short differences stay within
connection-address fields/lines, and 72 narrow pairs are intended layout
changes. Descriptor-line masking is a region comparison. Both complete native
suites pass 1,766 tests. Evidence:
`/private/tmp/galactica-saved-hosts/verified`,
`galactica-saved-hosts-comparison.json`, and
`galactica-saved-hosts-{pdg,pdg-devel}-unit.log`.
LAN/information bars and other hosting/busy/error audits remain separate.


### Compact LAN discovery window

Run `node tools/test-web-lan-layout.cjs BUILD_DIR SCREENSHOT_DIR LANGUAGE
before|after WIDTH HEIGHT` against the 0af65ea baseline and current web build.
Use en/de/es/fr/ja/ru at 800×600, 640×340 and 320×340. The fixture's native
hosts and Chrome are muted. Its adapter bridges actual loopback UDP discovery
into the browser; ordinary browser multicast remains unavailable.

Actual-input checks cover five hosts, paging, refresh, selection, persisted
constrained dragging, modal outside clicks, direct-address fallback, real HTTP
inspection/admission, empty discovery and the localized browser fallback.
Narrow after runs also check wheel delivery/movement, PageDown/PageUp, keyboard
paging and caption/hint fit. All 36 workflows pass. Of 144 matched screenshots,
42 are identical (including 18 admitted maps), 60 ordinary/short differences
stay within connection-address regions, and 42 narrow pairs change layout.
Both native suites pass 1,767 tests. Evidence:
`/private/tmp/galactica-lan-layout/verified`,
`galactica-lan-layout-comparison.json`, and
`galactica-lan-layout-{pdg,pdg-devel}-unit.log`.
Physical LAN and other hosting/error variants remain separate audits.


### Compact public-information controls

Run `node tools/test-web-information-layout.cjs BUILD_DIR SCREENSHOT_DIR LANGUAGE
before|after WIDTH HEIGHT` against d3eba44 and the current build. Both builds
already have Details and live inspection. Test all six languages at 800×600,
640×340 and 320×340. The muted native host supplies real public settings,
countdown updates, malformed responses and authenticated admission; muted
Chrome drives actual input, paging, title dragging, modal isolation and Back.
Narrow after runs also measure complete command captions/hints.

All 36 workflows pass. Of 180 screenshot pairs, 111 match exactly (including
18 admitted maps), 27 differ only in connection-address regions and 42 narrow
information views change layout. Both native suites pass 1,768 tests. Evidence:
`/private/tmp/galactica-information-layout/verified`,
`galactica-information-layout-comparison.json`, and
`galactica-information-layout-{pdg,pdg-devel}-unit.log`.


### Tutorial Add orders visibility

Run `node tools/test-web-map-target-ui.cjs BUILD_DIR SCREENSHOT_DIR LANGUAGE
before|after` against 7afcfb9 and the current build in all six languages. Chrome
is muted. Actual tutorial startup/setup installs the original practice galaxy;
a completed colony-ship fixture starts the focused interaction at lesson 16.
The helper clicks Add orders, captures the hidden inspector/radials and
crosshair over their old location, checks Escape restoration, then clicks S-20.
All twelve workflows pass. Eighteen screenshot pairs are identical; twelve
show the intended targeting changes. Both full suites pass 1,769 tests.
Evidence: `/private/tmp/galactica-map-target-ui` and matching log prefixes.


### First tutorial target visibility

Run `node tools/test-web-tutorial-target.cjs BUILD_DIR SCREENSHOT_DIR LANGUAGE
before|after` against c17a94f and the current build in each supported language.
The muted fixture uses actual tutorial startup/setup, then a completed colony
ship at lesson 16. Add orders, cursor movement, Escape, retry and actual S-20
selection are exercised. The baseline already hides inspectors; this isolates
target framing/cue changes. `framing.json` records 21.21px separation before and
90px after; the after cue must clear when lesson 19 begins. All twelve runs pass.
Six screenshot pairs are identical; 24 show the intended camera/cue changes.
Both native suites pass 1,770 tests. Evidence:
`/private/tmp/galactica-tutorial-target` and matching log prefixes.


### Independent Music preference browser/native verification (2026-10-11)

Source audit found a remaining Preferences gap: `Galactica.cpp:763–765`
assigns separate Sound and Music checkboxes, `GalacticaDoc.cp:1336–1341`
loads their flags independently, and `USound.cp:230,277–280` requires both
flags for presentation music. The combined Sound command deliberately assigns
both flags together (`Galactica.cpp:2285–2290`). V4 now follows those rules:
Settings has a separate persistent Music control, while Sound still switches
both flags. Turning Music off stops only the presentation handle and cancels
its fade; event effects remain governed by Sound. Re-enabling Music starts an
open requested presentation, but does not restart dismissed credits.
Missing/unavailable storage retains the enabled default. The preference uses
v4's existing native/browser string storage (`playMusic`), independently of
saved game state. Native configuration and browser persistence are covered.

The label and hover help (IDs 1245–1246), plus the manual's Settings section,
are localized in en/de/es/fr/ja/ru. Five new native regressions cover independent
effects/music, fade cancellation and restart, combined Sound persistence,
actual Settings action eligibility, and native storage/failure fallback.
Both complete native suites pass **1,775 tests, zero failures**; logs are
`/private/tmp/galactica-music-preference-{public,devel}-unit.log`.

`tools/test-web-music-preference.cjs` exercises real canvas Settings and pager
buttons, About playback through the actual audio backend, stopping an active
fade, combined Sound toggles, and a fresh browser reload. All six languages
pass at 800×600 and 320×340. Six baseline runs prove the previous code ignores
the stored disabled music flag. Chrome output is muted throughout; playback
logic remains enabled. The compact fixture follows translated pagination:
Music can be on the page after Sound because translated failure feedback
reduces page capacity. No product paging change was required.

The 18 ordinary before/after pairs are recorded in
`/private/tmp/galactica-music-preference/comparison.json`: six introduction
pairs are identical, six Settings pairs add the Music row, and six About pairs
differ only in their build-revision caption (zero changed pixels outside that
caption's region). Reviewed all six Settings pairs and all six compact Music
pages; labels and fixed footer controls remain readable and separate. The
comparison and compact reviews are `review-1.png`, `review-2.png` and
`compact-review.png` in the same evidence directory. This closes the separate
Music preference gap, not the remaining Preferences, runtime/hardware,
localization completion or Map Generation audits. Unrelated in-progress
optional artwork changes remain outside this commit; no PDG checkout changed.


### Compact Host form and conversion browser checks

`tools/test-web-host-compact.cjs BUILD OUTPUT LANG before|after WIDTH HEIGHT`
checks actual roster/map/timer controls, validation, wheel/keyboard scrolling,
real native host creation and Open Saved. All six languages pass before/after
at 800×600, 640×340 and 320×340 (36 runs).
`tools/test-web-host-conversion-compact.cjs` accepts the same arguments and
checks a real native saved-game offer/conversion, constrained modal drag and
unchanged source bytes; all twelve narrow language/baseline runs pass. Both
helpers mute their native/Chrome output. They use localhost HTTP adapters,
not production browser hosting or physical-LAN validation.

Both complete native suites pass 1,777 tests. Logs and screenshots use
`/private/tmp/galactica-host-compact` and
`/private/tmp/galactica-host-conversion-compact` prefixes; each screenshot tree
includes JSON layout geometry and `comparison.json`. The parity status entry
records the precise comparisons and remaining scope.


### Compact live Host and remote administrator status checks

`tools/test-web-host-status-compact.cjs BUILD OUTPUT LANG before|after WIDTH HEIGHT`
uses real native hosts for pause/resume, turn advancement, occupied-port failure,
retry, modal drag/cancellation, reopening and independent host stop. All 36
six-language before/after runs pass at 800×600, 640×340 and 320×340.
`tools/test-web-remote-admin-compact.cjs` accepts the same arguments and checks
actual authenticated administration, durable changes, revocation, blur release
and disconnect without stopping the host; all twelve narrow runs pass.
Clipped Join/body controls are scrolled into view before actual clicks. Both
helpers mute Chrome/native output and use localhost HTTP adapters.

Both full native suites pass 1,779 tests. Evidence uses the
`/private/tmp/galactica-host-status-compact` and
`/private/tmp/galactica-remote-admin-compact` prefixes. Comparison JSON records
162 local pairs and 108 remote pairs; six-language final status/failure/retry
and authorization-loss reviews are recorded there. Ordinary local differences
are confined to connection/file/clock/input metadata. See the parity entry for
remaining scope and exact counts; these checks do not establish physical LAN
or packaged native GUI behavior.


### Compact active Host Settings checks

The Host status helper now also exercises real AI/visibility choices, invalid
timer validation, Cancel preservation and durable exact-second Save. All 36
six-language before/after runs pass at 800×600, 640×340 and 320×340; twelve narrow
runs additionally capture both ends of the Settings body. The remote helper
scrolls clipped Settings controls before actual clicks, and detects compact
status by layout metadata in either baseline. All twelve narrow authenticated
before/after runs pass, including Save/Cancel, revocation and disconnect.

Both full native suites pass 1,780 tests. Logs/screenshots use the
`/private/tmp/galactica-host-settings` and
`/private/tmp/galactica-remote-settings` prefixes. Comparison JSON records 264
local pairs (ordinary Settings unchanged) and 108 remote pairs (administrator
and disconnected maps unchanged). All six narrow top/bottom, invalid/edited
and remote original/dragged Settings comparisons were visually reviewed. Native
fixtures and Chrome remain muted. These localhost checks do not establish
physical LAN or packaged native GUI behavior; other compact admin dialogs remain
separate parity work.


### Administrator-access layout and credential browser checks

Append `admin-password` to the Host status helper's ordinary arguments:
`node tools/test-web-host-status-compact.cjs BUILD OUTPUT LANG before|after WIDTH HEIGHT admin-password`.
This native-backed lane checks actual masked editing, canceled draft clearing,
durable-save failure/retry, credential login, stale-draft rejection, revocation,
empty-password disabling, constrained modal drag/outside isolation and host stop.
All 36 six-language before/after runs pass at 800×600, 640×340 and 320×340; native
geometry/focus checks also cover 320×600. Chrome/native fixture output is muted.

Both full native suites pass 1,781 tests. Evidence uses the
`/private/tmp/galactica-admin-password` prefix, including layout JSON and
`comparison.json`: 180 pairs, 60 exact ordinary password-dialog matches and 60
ordinary hosting pairs with zero differences outside connection/file/clock
regions. All six narrow original/dragged, masked-cancel and save-error pairs were
visually reviewed. These localhost checks do not establish physical LAN or
packaged native GUI behavior. Other compact administration dialogs remain open.


### Compact player roster and name-editor browser checks

Append `players` to the Host status helper:
`node tools/test-web-host-status-compact.cjs BUILD OUTPUT LANG before|after WIDTH HEIGHT players`.
The native-backed lane creates seven slots, claims two human players, then uses
actual canvas/keyboard input for paging, keyboard reveal, modal drag/isolation,
rename cancel/save failure/retry/password rejoin, role changes, stale mutation
rejection, slot freeing, named computer conversion, elimination and host stop.
Optional `GALACTICA_TEST_PLAYER_NAME` supplies a literal name; `<Enter>` suffix
coverage also records actual drawText output to detect accidental shortcut parsing.
Native fixtures and Chrome remain muted.

Both full native suites pass 1,783 tests. All 36 six-language ordinary/short/narrow
local before/after runs, twelve authenticated remote narrow runs and four
additional literal-name runs pass. Remote coverage is roster layout/drag/cancel
plus the existing Settings/admission/revocation/disconnect lane. Evidence prefixes:
`/private/tmp/galactica-host-players`, `galactica-remote-players` and
`galactica-player-literal`. Local comparison contains 270 pairs: 120 exact, 48
ordinary hosting metadata-only, 12 ordinary off-page-target-name changes and 90
narrow changes. Remote comparison contains 108 pairs, 70 exact; administrator and
disconnected maps stay identical in all six languages. Reviewed the roster,
paging, name-edit/failure/conversion and remote dragged views in all languages,
and literal names at both sizes. Other compact administration and gameplay
viewport checks remain open; localhost evidence does not prove physical LAN or
packaged native GUI behavior.


### Compact Admission browser checks

Append `admission` to the Host status helper:
`node tools/test-web-host-status-compact.cjs BUILD OUTPUT LANG before|after WIDTH HEIGHT admission`.
The native fixture seeds long Unicode/literal codes; actual canvas/key input
checks list selection/paging, drag/isolation, removal/cancel, duplicate rejection,
adding, durable-save failure/retry, stale policy and stop. Native clients check
allow/reject and password rejoin after code removal. The fixture supplies the
current policy revision and waits for native metadata refresh after concurrency.
Chrome/native fixtures stay muted.

Both native suites pass 1,784 tests. All 36 six-language local runs at ordinary,
short and narrow sizes and twelve authenticated remote narrow runs pass. Evidence:
`/private/tmp/galactica-admission/` and `galactica-remote-admission/`. Comparison
JSON records 234 local pairs (36 exact; 60 ordinary hosting metadata-only with
zero outside changes; 60 ordinary literal-code changes; 78 narrow changes) and
108 remote pairs (48 exact). Reviewed all six selected/paged/blocked-code/error
and remote-dragged/draft pairs. Other compact admin/gameplay viewport checks and
physical LAN/packaged GUI validation remain separate work.


### Compact Initial State browser checks

Append `initial` to the Host status helper:
`node tools/test-web-host-status-compact.cjs BUILD OUTPUT LANG before|after WIDTH HEIGHT initial`.
The native fixture seeds a Unicode/literal system name. Actual canvas/key input
checks list paging/selection, modal drag/isolation, numeric cancellation/validation,
failed-save rollback/retry, population/technology/owner edits, all four hulls,
stale revisions, turn-one cutoff and host stop. Test-only `initial-ships` reads
completed native ships; production-hull metadata is deliberately unchanged.
Chrome and the native fixture remain muted.

Both full native suites pass 1,786 tests. All 36 six-language local-owner runs at
ordinary/short/narrow sizes and twelve authenticated remote narrow runs pass.
Remote coverage includes Initial State list drag/cancel and inherited administration
workflows. Evidence: `/private/tmp/galactica-initial/` and
`galactica-remote-initial/`. Comparison JSON records 468 local pairs: 180 exact,
60 ordinary hosting metadata-only (zero outside), 72 ordinary literal-name changes
and 156 narrow changes. Remote comparison records 108 pairs, 54 exact, including
unchanged administrator/disconnected maps in all languages. Reviewed selected/
paged/error, technology/owner, hull-choice and remote-dragged views in all six
languages. Compact End Turn and broader gameplay/native GUI audits remain open.


### Compact pending-player End Turn browser checks

Append `end-turn` to the Host status helper:
`node tools/test-web-host-status-compact.cjs BUILD OUTPUT LANG before|after WIDTH HEIGHT end-turn`.
Seven actual native clients claim human slots. Actual canvas/key input checks
paging, modal dragging/isolation, cancellation, failed-save rollback/retry,
client refresh, stale captured-turn rejection, fresh confirmation and durable
Stop. Set `GALACTICA_TEST_END_TURN_NAME` to a 31-character wide-letter prefix
for maximum-length name coverage. Chrome and native fixtures remain muted.

Both full native suites pass 1,787 tests after separately committed artwork mock
correction `df3fd5d`. All 36 six-language local ordinary/short/narrow workflows,
12 maximum-name narrow workflows and 12 authenticated remote regression workflows
pass. Remote fixtures have no pending human posts; their immediate End Now
checks do not claim every pending-player remote mutation path. Evidence prefixes:
`/private/tmp/galactica-end-turn`, `galactica-end-turn-wide`,
`galactica-remote-end-turn`. Comparisons record 198 standard local pairs (72 exact,
60 ordinary hosting metadata-only with zero outside changes, 66 narrow changes),
108 remote pairs (66 exact, all administrator/disconnected maps identical),
and 66 maximum-name narrow pairs. Reviewed all six standard dragged/paged/fresh/
error and maximum-name original/paged/error comparisons. Remaining busy/error
variants and gameplay/native GUI viewport audits remain separate work.


### Narrow Compare Players footer verification

`node tools/test-web-comparison-footer.cjs BUILD OUTPUT LANG before|after WIDTH HEIGHT`
uses the application drawing-port size override as well as browser viewport
metrics. Actual input pages through all 31 summary rows, tests modal isolation,
Previous, Close and disabled final Next, retaining turn/selection. Chrome remains
muted. Both full native suites pass 1,788 tests. All 36 six-language ordinary,
short and narrow before/after workflows pass; baseline narrow Close failure is
recorded as the reproduced defect rather than an expected success. After Close
works in every language. Evidence: `/private/tmp/galactica-compare-footer/` and
its comparison/result/geometry files. All 48 ordinary/short screenshot pairs are
pixel-identical; 24 narrow pairs change. First/middle/last views were inspected
in all six languages. Compact table text readability remains a separate item.


### Compact comparison text, statistics and scrolling

The comparison-footer helper also exercises complete 32-character player names,
all eleven statistic pages, keyboard/mouse navigation and delayed translated help.
Use `GALACTICA_TEST_COMPARISON_DEFEATED=1` for maximum-length defeated names.
Add `GALACTICA_TEST_COMPARISON_WIDE_FONT=1` to induce conservative overflow with
1.7× measured widths on both screen and retained offscreen ports. This fixture
simulates wider metrics; it does not replace actual platform-font validation.
It checks fixed commands, Page Up/Down and actual wheel scrolling.

Both full native suites pass 1,790 tests. All 60 six-language before/after standard,
defeated-name and wider-font workflows pass; twelve final narrow normal/wider-font
runs also verify the exact translated tooltip text. Evidence roots are
`/private/tmp/galactica-compare-columns`, `galactica-compare-columns-defeated`
and `galactica-compare-columns-wide-font`. Final common scenes have 72 pairs,
48 ordinary/short pairs identical and 24 narrow changes. Reviewed complete names,
values, group headings, overflow and help in all six languages. Chrome and native
fixtures remain muted. Broader compact/native GUI audits remain open.


### Compact Course editor browser verification

`tools/test-web-arrival-course.cjs` accepts `GALACTICA_COURSE_WIDTH` and
`GALACTICA_COURSE_HEIGHT` (default 800×600). It sets the actual drawing-port size
and browser metrics, disables stored fullscreen, keeps focus and mutes Chrome.
`GALACTICA_COURSE_BASELINE=1` records prior geometry without requiring the new
compact layout. At 320×340, final checks use real wheel input and click Call in,
paging, Add, Escape and Close after inherited course/memory/save validation.

Both full native suites pass 1,791 tests. Thirty-six six-language before/after
ordinary/short/narrow workflows pass, followed by six final narrow action checks.
Evidence: `/private/tmp/galactica-course-compact`. Of 72 common screenshot pairs,
48 ordinary/short and six narrow maps are identical; eighteen Course views change.
Reviewed all six narrow original/scrolled/paged/targeting views. Native overflow
coverage uses conservative text metrics and owned maximum-length names. Compact
map-target hint truncation seen during Add is tracked separately, not claimed fixed.


### Complete target-prompt input/layout checks

Add `GALACTICA_TARGET_PROMPTS=1` to the arrival-course helper for course,
rendezvous placement and rendezvous movement prompt captures. Use
`GALACTICA_TARGET_PROMPTS_BASELINE=1` only for baseline captures that lack the new
layout API. Viewport environment options are unchanged. Course targeting starts
through real G/A input; rendezvous modes use fixture setup. Real lower-prompt
clicks must leave targeting active, avoid creating/moving markers, and Escape
must cancel without changing the turn. Chrome remains muted.

Both full suites pass 1,792 tests. Thirty-six six-language before/after workflows
at three port sizes and six final-source narrow workflows pass. Evidence lives
under `/private/tmp/galactica-target-prompt`. Comparison records 126 common pairs,
103 exact; fifteen narrow prompts and eight ordinary/short German/Japanese
rendezvous views change. Reviewed all six narrow course/place/move comparisons
and the changed ordinary prompts. The older rendezvous UI mock now provides
text-width measurements for geometry, as real graphics ports do.


### Map instruction separation and real manual access

Add `GALACTICA_MAP_INSTRUCTIONS=1` to the arrival-course helper. Baseline builds
without the new layout API additionally use `GALACTICA_MAP_INSTRUCTIONS_BASELINE=1`.
The helper captures the map, clicks Menu and User’s Manual, attaches to the actual
new tab, verifies the supported language/map section/no opener and captures that
section at the game viewport size. The server must serve `.css` as `text/css`;
checks assert the system font stylesheet loaded and the document has no horizontal
overflow. Closing the manual preserves game selection and turn.

Full native suites pass 1,793 tests, including owner/administrator layouts in all
six languages/three sizes. Thirty-six initial before/after workflows and 24 final
styled-help follow-ups pass. Evidence: `/private/tmp/galactica-map-instructions`.
The 162 common image pairs change only within the combined footer/help band
(zero outside-band pixels). Reviewed all six compact map/manual and short map
comparisons. Earlier unstyled screenshots reflected the helper's MIME mistake,
not a product/manual stylesheet bug. Compressed command-menu presentation and
other compact toolbar variants remain separate work. Audio remains muted.


### Readable constrained Command Menu verification

The arrival-course helper's `GALACTICA_MAP_INSTRUCTIONS=1` path now exercises
scrolling menus when the layout reports a constrained body. Real Page Down/Up
and wheel events expose lower commands; wheel traversal uses the measured limit
rather than assuming one event reaches the bottom. Checks retain Close position
and camera zoom, toggle Hold reports twice, open the real styled localized manual,
then click the fixed Close footer after returning. Audio remains muted.

Both complete native suites pass 1,794 tests. Native menu coverage includes six
languages, owner/observer/administrator fixtures, full-screen feedback and three
sizes. Tutorial/attention checks scroll to the actual command before asserting
its layout/semantics. Thirty-six before/after workflows, eighteen final indicator
checks and six final narrow Close checks pass. Evidence roots:
`/private/tmp/galactica-command-menu`, `galactica-command-menu-final`.
Common comparisons record 180 pairs: 162 identical and eighteen menu changes.
All six ordinary/short/narrow top and bottom views were inspected. Browser cases
use local owners; role and error fixtures do not claim new remote-host UI paths.


### Durable unposted writeback transport

`./gad4 tools/test-network-writeback.js` creates two actual localhost clients and
checks authenticated `POST /changes`, without posting the turn. The envelope
contains raw state `orderRevision` as `revision`, plus `playerRevision`,
`initialStateRevision` and an `Orders.snapshot(model, requestId)` decision payload.
Retain the same envelope/32-hex request ID for uncertain-response retry. Rebuild
from fresh acknowledged state and its remapped IDs before a new request. This
is a host/API contract, not yet an application autosave or close hook.

The lane verifies persisted decisions/created IDs, readiness/clock isolation,
private metadata, stale/forged denial, dropped replies, failed-save rollback,
reopen/rejoin, authoritative context changes and later normal posting. It mutes
sound, disables discovery for its listener and removes its temporary files.
Both runtimes pass this and the existing posting lane; full suites pass 1,801
tests. Seven native regressions also cover malformed receipts, role changes
and old-turn acknowledgments. Evidence prefix: `/private/tmp/galactica-writeback-host-`.
No new GUI is introduced; client reconciliation and localized close/retry flows
remain next.


## Client draft writeback transport

Run `./gad4 tools/test-client-writeback.js` with each native executable. This
actual localhost HTTP lane checks clean/no-op baselines, saving without posting,
creation acknowledgments and live object references, temporary-ID collisions,
newer edits while a reply is pending, lost-response retry across rejoin, malformed
responses, failed durable writes, stale context, explicit draft discard and a
concurrent flush/End Turn. The lane passes on public and development runtimes.
Existing `test-network-writeback.js` and `test-network-orders.js` pass on both.
Logs use `/private/tmp/galactica-client-writeback-{public,devel}` with `.log`,
`-host.log`, `-orders.log` and `-unit.log` suffixes. Application scheduling and
Save/Close/Quit integration remain separate unfinished work.


## Application client Save/Close/Quit

`./gad4 tools/test-client-documents.js` checks actual host persistence, failure
retention, retry, delayed Quit, readiness isolation and localized partial-map
Save As rejection. It passes on both native executables. Existing
`tests/documents-close-async.js` and `tests/quit-documents-async.js` also pass on
both. Current full suites report 1,800/1,802 with the two existing artwork failures.
Native evidence uses `/private/tmp/galactica-client-documents-` log prefixes.

Set `GALACTICA_TEST_WRITEBACK=1` when running `tools/test-web-network-orders.cjs`
for the six-language selection/Save/Close workflow; pass `before` against the
previous build to verify its Save refusal. Add
`GALACTICA_TEST_WRITEBACK_ERROR=1` for controlled failed-Close feedback and retry.
Screenshot evidence and pixel comparison metadata live under
`/private/tmp/galactica-client-documents-ui`, with failed-Close captures under
`/private/tmp/galactica-client-documents-errors`.


## Automatic client creation

`./gad4 tools/test-client-creation.js` verifies actual Exchange and nested-group
creation through a live host. `tools/test-client-writeback.js` also covers
no-selection point creation. Both pass on public and development native runtimes.
Full suites: 1,802/1,804, with the same two artwork expectations pending adjustment
to the user-selected replacements.

Use `GALACTICA_TEST_CREATION=1` with `tools/test-web-network-orders.cjs` for
placement, explicit Rename and cancellation; pass `before` for the prior-build
unsaved baseline. Six-language before/after evidence and comparison metadata
are under `/private/tmp/galactica-creation-ui`; logs share that prefix.


## Selected artwork verification

`node tools/test-art-resources.cjs` checks the active manifest, source checksums,
alpha roles and byte-preserved former-default archive.
`./gad4 tools/test-art-style-images.js` passes on both native runtimes for image
decoding, alpha-safe caching, lab foreground transparency and retained additive
propulsion fields. Full suites pass **1,804/1,804** on both.

The class-layer unit check covers 147 lookups and all 43 unique PNG paths.
Selected layers match their active checksums; retained event layers match their
archived files; the eleven retained blueprints keep valid 408×240 dimensions.
All thirty archived decoded pictures retain their provenance checksums/dimensions.
Outcome images match the selected manifest dimensions and aspect ratio while
remaining bounded and private to the affected player.

Actual `test-web-outcome-art.cjs` and `test-web-stardock-source-art.cjs` flows pass
in all six languages. Captures are under `/private/tmp/galactica-selected-art-ui`
and `/private/tmp/galactica-selected-class-art`; native logs use
`/private/tmp/galactica-selected-art-` with `-unit-final.log` and `-images.log`
suffixes. These are current-art rendering checks; this change modifies tests and
documentation only, so no before/after renderer change is claimed.


## Draft preservation across host updates

`./gad4 tools/test-client-context.js` tests same-turn initial-state refresh and
late acknowledgment context changes through a real host. It covers authoritative
population/new satellites, edited names/allocations, routes and containment,
local deletions, temporary-ID collisions (including an unsent creation during
ACK), revoked ownership and subsequent saving without posting. The ACK fixture
combines a committed receipt with live host state after an intervening edit,
matching the response shape of an idempotent retry after an authority update.
It passes on both native runtimes. Existing client writeback, document, creation
and turn-posting lanes pass on both after the changes.

Both full suites pass **1,806/1,806**, with two new regressions for initial-state
draft retention and fixed defense patrol state. Final logs use
`/private/tmp/galactica-client-context-` with native executable/lane suffixes.

Set `GALACTICA_TEST_CONTEXT=1` with `tools/test-web-network-orders.cjs` for actual
slider/rename edits followed by a live host population/satellite update and Save.
The former build reproduces draft loss with the `before` argument. Six-language
captures/comparison metadata are under `/private/tmp/galactica-context-ui`.
Open editor/targeting continuity during an acknowledgment remains separate
unfinished application work.


## Interaction continuity during writeback

`./gad4 tools/test-client-interaction.js` checks unfinished rename text/caret,
unsubmitted editor text, current source/drag references, Course/target state,
ownership revocation and next-turn cancellation against a real host. It passes
on both native runtimes. Existing context/writeback/document/creation/posting
lanes also pass on both. Full suites: **1,810/1,810**, four added regressions
covering presentation/reference/authority and pre-draw marker hit coordinates.

Set `GALACTICA_TEST_INTERACTION=1` with `tools/test-web-network-orders.cjs`.
It delays real server acknowledgments while actual controls edit a name or arm
Orders, then checks continuation, table state and a real destination click.
The `before` argument against the former build reproduces interruption. All
six languages pass. Captures/comparison metadata live under
`/private/tmp/galactica-interaction-ui`; native logs use
`/private/tmp/galactica-client-interaction-`.

Of 48 common pairs, 24 are exact, twelve show intended rename/target retention,
six target-before frames reflect the earlier accepted rename, and six Join
frames contain different localhost ports. Before/after rename/target and final
destination-click sheets were reviewed in all six languages. Manual report
overlay continuity and late-turn decision recovery remain separate open work.


## Manual report review during writeback

`./gad4 tools/test-client-reports.js` delays actual HTTP receipts while reviewing
reports, outcomes, owner Lab/Stardock presentations, then verifies page and live
entity identity and a single cue. It also checks authoritative population
refresh and cancellation when the host no longer supplies the report. Both
native runtimes pass; complete suites pass **1,816/1,816** with six added report
continuity cases, including older explicitly shown held reports and no restarted
explosion after Display replacement. Automated audio remains muted.

Use `GALACTICA_TEST_REPORTS=1 node tools/test-web-network-orders.cjs BUILD_DIR
SCREENSHOT_DIR LANGUAGE [before]` for actual Events controls, paging and delayed
save acknowledgments against the native fixture host. The `before` argument
checks the original disappearance. Fixture reports/artwork are opt-in and do
not affect normal hosting tests. Late-turn draft recovery remains separate.

All six browser languages pass before/after. The 72 common pairs include 42
exact frames, 24 intended report-retention changes and six localhost-port
changes. All six four-family before/after sheets were reviewed. Art references
use the selected replacement assets. Evidence: `/private/tmp/galactica-report-ui`
(including comparisons.json and `*-final-review.png`). A transient Japanese
localhost failure is archived separately; the affected final lane was rerun
successfully without changing the connection timeout.


## Draft recovery across host turn changes

`./gad4 tools/test-client-turn-refresh.js` verifies actual forced turns and
running scheduler expiry while saves are pending; old rejected requests, lost
accepted receipts/rejoin and assigned-ID collisions; canceled state recovery;
and no accidental next-turn posting/replay after lost End Turn replies. It
passes on both runtimes, as do existing writeback/context/manual-report lanes.
Full final native suites pass **1,822/1,822**. New unit cases include production/
defaults/marker deltas, movement/progress separation, completed versus interrupted
routes, fixed courier origins, host-valid grouping and same-turn canonical
attention records. Audio remains muted.

Use `GALACTICA_TEST_TURN_REFRESH=1` with `tools/test-web-network-orders.cjs`
for actual delayed Save, newer Rename and forced-turn input in all six
languages. `before` verifies original draft loss; final runs also check the
pending attention report and absence of next-turn readiness. An optional
`GALACTICA_TEST_ATTENTION_AUDIT=1` prints event/queue identity diagnostics.
All six before/after sheets were reviewed. Of 36 common pairs, 24 are exact,
six show the retained newer name and six differ by localhost port. Art is the
selected replacement set. Evidence: `/private/tmp/galactica-turn-refresh-ui`,
`verified-comparisons.json`, `*-verified-review.png`; native logs use
`/private/tmp/galactica-turn-refresh-`. A failed Japanese baseline host read was
retained separately and rerun successfully without increasing timeouts.
Final posted-turn control/source parity remains a separate audit.


## Editing decisions while a posted player waits

`./gad4 tools/test-client-posted-edit.js` checks automatic marker/group creation,
production/course/name changes after posting, unchanged readiness/turn/clock,
original-post idempotency, unfinished editor retention, disk failure, lost receipt
and rejoin, authoritative context updates and unsent next-turn decisions. Both
runtimes pass. Full suites pass **1,825/1,825**, including three new posted
control/context/departure regressions. Departing fleets now leave their system's
ship list, allowing the next atomic save and reopen to validate containment.
Existing turn/writeback/context/document/creation/host-writeback lanes also pass.

Use `GALACTICA_TEST_POSTED_EDIT=1` with `tools/test-web-network-orders.cjs`
for six-language actual posted Rename, Orders, allocation/File Save, unchanged
host readiness, duplicate Posted click and the next turn. `before` reproduces
owned read-only controls. All six final before/after map sheets were reviewed.
Of 60 common pairs, 35 are exact, 18 show intended controls/decisions/simulation,
six contain different localhost ports and one is a differing End Turn menu frame.
The fixture navigates paged menus, advances the fixed visual clock through
menu appearance, closes the underlying menu before map clicks and waits for
the next-turn notice before comparing map views. It records the frame count at
input delivery so validation requires a subsequent draw without increasing the
timeout. Evidence: `/private/tmp/galactica-posted-edit-ui/final-comparisons.json`
and `*-final-review.png`; native logs use `/private/tmp/galactica-posted-edit-`.
Historical posted-read-only expectations are superseded by the source audit.


### Compact system ship list

Run `node tools/test-web-system-ships-compact.cjs BUILD_DIR OUTPUT_DIR LANGUAGE`
with `GALACTICA_SYSTEM_SHIPS_WIDTH` / `GALACTICA_SYSTEM_SHIPS_HEIGHT` set before
startup. The default 800×600 lane preserves the original wide table; 800×240 and
320×240 exercise complete wrapped controls, wheel scroll without zoom, sorting,
PageDown, Scrap/Cancel, paging/reset, actual Close and exact-row inspection.
An optional final `before` argument records the previous compact layout. Startup
name entry uses Enter because its separate short-height submit layout remains
open work. Chrome is muted. The game fixture opens the list through the real
Game command; subsequent actions use actual PDG input and wait for a draw after
input delivery. Six languages pass, and all final narrow/short comparison sheets
were inspected. Six wide frames are pixel-identical. Full suites pass 1,827/1,827
on both native runtimes. Evidence: `/private/tmp/galactica-system-ships-ui` and
`/private/tmp/galactica-system-ships-{devel,public}-unit-` logs.
