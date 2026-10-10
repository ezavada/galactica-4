# Galactica v3 to v4 Feature and UI Port Status

Audit date: 2026-08-25

## Purpose and method

This is a player-facing inventory of Galactica: Anno Dominari v3 functionality and its status in the Galactica-4 port. It covers gameplay, setup, map interaction, UI, persistence, multiplayer, help, and supporting systems.

The comparison is based on:

- the v3 source in `galactica-anno-dominari-3/Classes`;
- the v3 menus, dialogs, strings, and tutorial in `galactica-anno-dominari-3/Resources`, `Galactica-en.txt`, and `Galactica-Tutorial-en.txt`;
- the published [Galactica v3 User's Manual](http://annodominari.com/);
- all JavaScript source, tests, and documentation currently in `galactica-4`.

The comparison started as a static code review. With the public PDG runtime,
the v4 automated suite was verified on 2026-08-25 with
`./gad4 tests/run-tests.js`: 344 passed, 0 failed. Passing tests prove the
covered classes and helpers behave as tested, but do not prove that the
playable runtime invokes every scaffolded system.

Latest validated full-suite result: 1278 passed, 0 failed on release/current native PDG. Item-specific browser and source audits are recorded below.

### Status key

| Status | Meaning |
|---|---|
| ✅ Implemented | Present in the normal v4 runtime path and substantially usable. |
| 🟡 Partial | A meaningful portion exists, but parity, UI, or important behavior is missing. |
| 🧱 Scaffold only | Models, helpers, or tests exist, but the feature is not usable end to end in the game. |
| ❌ Missing | No meaningful v4 implementation was found. |
| ❌ Missing / not a parity blocker | Not implemented in v4, but the audited v3 source/manual does not show this as shipped functionality. |
| ➖ N/A | No distinct UI surface exists in v3 beyond the normal game display, or the row is explicitly an engine-only rule. |

Section completion percentages are rough parity estimates based on the table rows in each numbered section. Each numbered group now carries separate Functionality and UI estimates because many v4 systems have working model/rule code with only thin v3-style presentation, or conversely have a visible placeholder before the underlying rule is complete. Possible v4 enhancements that are not present in the v3 source/manual are listed separately and are not counted against parity.

## Executive summary

Galactica-4 currently has a credible simulation foundation, not feature parity with v3. Its strongest areas are procedural map generation, the coordinate/camera system, the basic turn loop, star growth/research/ship construction, multi-waypoint ship/fleet navigation, fleet/rendezvous assembly, technology transfer, localization resources, runtime combat/capture, Section 6 fog/combat rules, and Section 7 computer-player runtime rules.

The largest blockers to a complete game are:

1. **Combat runtime rules are now at v3 parity for Section 6, but presentation is still thin.** Enemy ship/star/fleet arrivals invoke `CombatSystem`, remove destroyed ships, use v3-style ship/star combat formulas, run ground combat, let surviving colony ships capture stars, repair docked mobile ships/fleets, recalculate fog each turn, and record localized battle summaries. Missing v3 pieces are UI/presentation: remaining observer/other recipient-relative reports, sound and remaining illustrated event coverage. Participant combat, defeated-resistance and capture messages now have automatic windows and replay. A distinct last-seen ghost rendering mode was not found in the shipped v3 drawing paths.
2. **The v3 command UI now has a first clickable runtime path, but not full parity.** v4 has a startup setup dialog, charcoal rounded windows, bottom-right permanent map buttons, a top-center turn/game header, clickable popup action buttons, directly clickable production sliders, retained event list, player comparison window, a paged sortable fleet/ship roster, fleet/rendezvous panels, and anchored selection panels. Missing v3 pieces remain: remaining attention-event coverage, map replay, help, sound, and the remaining drawing/sound/game preferences.
3. **Navigation now supports v3 waypoint editing and looping.** Broader attention-event coverage and full arrival presentation remain incomplete; ship/fleet scrapping is implemented.
4. **Local file persistence is implemented; multiplayer is absent.** Versioned Save/Save As, Open and confirmed Revert preserve the game graph, visibility, courses, events, selection and camera. Hosting, joining/rejoining, turn posting, timers, passwords, discovery, chat and host administration remain missing.
5. **Several systems are present but incomplete or incorrectly wired.** Examples include fog-of-war presentation, remaining attention-event coverage, event depth, setup/default-settings UI, and richer list/command UI polish.

## Easy wins applied on 2026-08-25

- Added a localized permanent End Turn map button that invokes the existing turn-advance path.
- Fixed display-side fog-of-war visibility to read numeric visibility levels directly, so owner/detail disclosure uses the stored visibility tier.
- Made omniscient/all-visible mode affect normal display helpers and visibility queries for enemy stars, ships, and fleets.
- Updated the Game Title status to reflect the top-center header path while keeping setup/save/hosting gaps visible.
- Added a deterministic AI-only autoplay observer (`./gad4 -- --ai-autoplay`) that starts five computer players on the smallest map, one for each v3 AI skill level, using fixed seed `424242` by default.
- Made End Turn close event overlays/event-list windows before advancing, so autoplay and the hotkey do not stall behind event presentation UI.
- Capped default autoplay runs at 250 turns while the late-game AI stagnation issue is unresolved, hid event presentation windows by default for AI autoplay, and added `--show-event-windows` for opt-in visible overlays with a presentation hold.
- Aligned ship/star combat strength and population damage with the v3 formulas, recorded localized combat-summary events, neutralized/captured enemy systems more safely, and recomputed defeat/victory after combat.
- Improved computer-player parity: AI now applies v3-style expert tech-star/shipbuilder allocations, starts concrete v3-weighted ship builds, skips under-construction/defense-satellite movement, carries patrol state for defenders, applies the Good/Expert patrol repair toggle, blocks docked fleets with fewer than three ships from moving, forms docked fleets, gives fleets strategic orders, applies computer production advantage, repairs docked non-patrolling mobile ships, and uses v3 skill values for ship search distance/repetition/randomness.
- Hardened movement/combat bookkeeping by preventing duplicate entity registration and by transferring ships cleanly between fleets.
- Added C++-confirmed technology transfer rules: standalone scouts/couriers pick up higher technology when leaving or arriving at allied systems, ships and fleets can upgrade lower-tech allied systems, battleships do not pick up higher technology, and scouts inside fleets keep v3's no-refresh limitation.
- Added v3 new-colony defaults: human neutral colonies apply the player's default economy/build choice, while computer neutral colonies immediately start a defense satellite.
- Wired docked fleet repair into star repair updates while still excluding defense satellites, moving ships/fleets, and patrolling defenders.
- Reworked fog-of-war updates so current visibility is recalculated every turn while last-seen memory is preserved, and scanner-based fleet queries now include visible enemy fleets.
- Matched v3 computer-player scoring more closely by merging AI pass scores per destination type, preserving v3 tie-break rules, using v3 skill checks for special second/third passes, removing the older three-bucket fleet-size cap, and returning computer build selection to the v3 weighted hull rule.
- Added first-class rendezvous and fuller fleet UI: named fleet support, rendezvous placement/move/delete/rename, automatic fleet assembly at rendezvous points, fleet member remove/transfer controls, and a simple fleet/rendezvous roster window.

## 1. Game creation, configuration, and lifecycle (Functionality 75%, UI 77%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| New single-player game | `File > New Game...` opens a setup dialog and then asks for the player's name. | ✅ Implemented | ✅ Implemented | Startup and Menu → New Game/N use the localized setup followed by remembered Unicode player-name entry. Setup Cancel/Escape returns to the retained game; cancelling name entry returns to setup. Acceptance creates independent game/factory/rules/configuration/display objects without replacing the earlier document. Menu → Open Games/G switches retained documents with stable identity, paging and active highlighting, preserving turns, selection, events, economy and camera. Actual creation/cancellation/switching/active-only advancement is verified in all six languages. Local documents can also be saved, opened and reverted through File; hosting remains Section 9 work. |
| Game title | Editable title in the setup dialog; also used for host save files. | 🟡 Partial | ✅ Implemented | Click the setup title or press T to edit a selected Unicode title with the v3 27-character limit. Save/Enter accepts nonblank text; Cancel/Escape preserves the accepted title and other options. The title reaches `GameConfig` and the measured top-center header; all six translated browser flows passed. Save As uses the game title for the initial filename. Host save-file use remains missing with the Section 9 network lifecycle work. |
| Human/computer player counts | Configurable human and computer slots. | 🟡 Partial | 🟡 Partial | The model/map generator support varied totals and the AI autoplay harness runs zero-human games. The local single-player setup keeps one human, as v3 does when the human-count pane is absent. Click the count row or press C to edit 0–98 opponents; Save/Enter, Cancel/Escape and +/− bounds are implemented. Solo games run without immediate victory; generated twelve-opponent and 99-player games are tested. Multiplayer human-slot setup/hosting remains missing. |
| Five computer skill levels | One shared setup popup: Expert, Good, Average, Passable, Novice. | ✅ Implemented | ✅ Implemented | Click the skill row for five localized choices and active highlighting; choosing a value returns to setup. Cancel/Escape/outside-click preserves the accepted skill. Keys 1–5 work in setup and in the popup; selected values reach every computer. Strict validation rejects noninteger/invalid values. Audited v3 `CGameSetupAttach.cpp:85,370–374` uses one shared popup, so a per-player new-game control is not a parity requirement. All six browser flows and full 947-test suites passed. |
| Computer advantage | Setup offers +3 through -3. | ✅ Implemented | ✅ Implemented | Setup now offers all seven v3 choices in menu order (+3 to −3), with clickable buttons, current-choice highlighting, A cycling and the resulting production percentage. R resets to zero. Configuration rejects non-integer/out-of-range values, and launch passes the selection to each AI player. Research, shipbuilding and production reports apply the verified 20% modifier per level; humans are unaffected. |
| Stellar density | Scale of 1-10 controls star count. | ✅ Implemented | ✅ Implemented | All ten numeric choices are clickable in startup, with active highlighting, D cycling/wraparound and R reset to 1. Integer validation accepts exactly 1–10; launch forwards the selected multiplier to the verified v3 star-count formula. Maximum-density galaxies retain unique names and all player homeworlds. |
| Sector size | Controls galaxy dimensions. | ✅ Implemented | ✅ Implemented | Startup offers all five v3 dimensions (1×1 Tiny through 5×5 Huge), with clickable choices, current-choice highlighting, S cycling and R reset to the configured default. Localized labels match the v3 scale. Integer validation accepts exactly 1–5; map generation and display/camera dimensions consume the chosen size. |
| Fast Game | Setup checkbox; doubles ship speed and accelerates building/research. | ✅ Implemented | ✅ Implemented | Click the localized checkbox or press F; checked state and active styling reflect the accepted option. R resets to normal mode. The flag reaches actual rules, with doubled scan range, ship speed and shipbuilding effort tested; existing fast research thresholds remain in `star.js`. Strict boolean validation and modal input isolation are covered. All six browser flows and 952-test native suites passed. |
| Fog of War option | Default on; setup checkbox can disable it. | 🟡 Partial | ✅ Implemented | The localized checkbox is checked for fog and cleared for `omniscient`, matching v3. Clicking and O agree; R restores fog. Checked state uses shared measured checkbox rendering, and input cannot act behind setup modals. Launched enemy diagnostics/map-name behavior and all six browser flows passed; 957-test suites passed on both native runtimes. The deliberate yellow-star/homeworld-alias rule is preserved. The deliberate yellow-star naming deviation and existing knowledge gates are covered. A separate last-seen ghost display was not found in v3; remaining detailed drawing audits are tracked in Section 6. |
| Turn time limit and units | Optional minutes/hours/days/weeks limit. | 🧱 Scaffold only | ❌ Missing | `maxTimePerTurn` and multiplayer factory defaults exist; no clock, timeout, or setup widgets use them. |
| End early when all players post | Host option for asynchronous multiplayer turns. | 🧱 Scaffold only | ❌ Missing | `endEarly` is stored but not used by the turn loop. |
| Procedural galaxy construction | Random star count/placement, separated home systems, unique names, named homeworlds. | ✅ Implemented | ➖ N/A | `map-generator.js:36-239` ports the main v3 construction path with the corrected 1024×1024 coordinate scale. |
| Initial homeworld state | One named home system, tech 1, population, scanner, and colony construction at 99%. | ✅ Implemented | ➖ N/A | `map-generator.js:249-299`. |
| Computer faction naming | Home-star name plus faction word, such as “Vega Alliance.” | ✅ Implemented | ➖ N/A | Resource-driven templates and group names are used in `map-generator.js:302-333`. |
| End turn | Button/menu/shortcut; multiplayer waits for posts as needed. | 🟡 Partial | 🟡 Partial | Enter and the End Turn map button advance the local simulation. Unreviewed attention requests/event presentations require confirmation, with Review/End anyway/Esc paths; actual advancement closes event overlays/list/confirmation first. Awaiting map clicks and captured sliders cannot advance via the UI. Posting, timers and multiplayer coordination remain missing. |
| Victory and defeat | Defeat notifications and victory/defeat conclusion screens. | ✅ Implemented | ✅ Implemented | Piece counts and combat/capture trigger queued defeat notices and terminal victory/stalemate reports. Local victory/defeat show the complete v3 TEXT 4000/4001 narratives with the actual full player name; other players/observers receive broadcast summaries. Neutral modal panels wrap/page Unicode text, isolate map input and acknowledge without advancing turns. Retained outcomes replay through View report/Enter, including terminal turns that do not increment the clock. All six languages and actual turn-7 browser transitions are verified. Sound/art enhancements remain their separate checklist items. |

### Possible lifecycle enhancements beyond v3, not counted in Section 1

- More elaborate cinematic or art-heavy victory/defeat treatment beyond the v3 text/window resources.

## 2. Map, camera, visibility, and display modes (Functionality 89%, UI 89%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| Galaxy map with grid | Main play field renders stars, ships, fleets, courses, and sector grid. | 🟡 Partial | 🟡 Partial | v4 renders background, grid, stars, ships, fleets, destinations, and selection. It draws allied waypoint circuits and now has display brightness modes and grid/names/ships/courses/scanner controls. Remaining map UI differences are listed below. |
| Pan/scroll map | Scroll bars; Option-drag in the tutorial/manual. | ✅ Implemented | ✅ Implemented | Horizontal and vertical map scroll bars use proportional thumbs, captured dragging, page clicks and step arrows with held-button repetition. They reflect current zoom, pan and viewport, clamp their own movement to the sector map extent, and disable fitted axes. Option/Alt-drag pans over entities without changing selection or issuing orders, matching v3; existing empty-space/middle dragging remains. Browser releases outside the canvas or on blur recover through the normal input path. |
| Zoom in/out | Buttons and +/- keys. | ✅ Implemented | ✅ Implemented | Compact cached 2× plus/minus map icons and Command Menu → View offer zoom in/out alongside existing +/- and wheel input. Existing camera anchors and limits are preserved. |
| Zoom to fit | “Zoom Fill”/0 command. | ✅ Implemented | ✅ Implemented | Map Fit icon and View menu use content-aware fitting; zero and keypad star match v3. F remains an alias. Reset view remains a separate View command. |
| Go to home planet | Goto menu/Home-key command centers/selects home. | ✅ Implemented | ✅ Implemented | House icon, View menu and Home key select and center the current human homeworld without changing zoom. H is reserved for eligible selected mobile Hunt, matching v3. |
| Go to selected/current item | Centers map on selected entity. | ✅ Implemented | ✅ Implemented | View → Center selected item and Shift+C center the current selection; lowercase c remains colony building. |
| Go to next item needing attention | Menu/Tab cycles the attention queue. | ✅ Implemented | ✅ Implemented | Tab, the Next item map button and command-menu entry select and center the next unhandled valid subject. Counts/active controls reflect pending requests. Selecting a subject manually also handles its request; removed/captured/member objects are skipped. Empty queues never advance the turn. Remaining event-subject coverage is tracked under Attention queue in Section 8. |
| Replay/go to enemy moves | Shows noteworthy enemy movement. | 🟡 Partial | 🟡 Partial | Settings → Show enemy events controls automatic playback of accessible observer reports, defaults on as in v3, persists as a new-game default and in complete-game saves, and leaves manual Events replay available when off. Observer captures focus/center the known system; movement-time notices defer until visibility is recalculated. Disabled or newly hidden queued observer copies are skipped, and quiet autoplay/private recipients remain respected. Settings pages in short viewports with mouse/arrow input and localized hover help. Surviving-system defense losses and neutral-colonization notices also broadcast detected observer reports with the same playback preference. Other noteworthy enemy movement/broadcast event types remain to port. |
| Select objects on map | Stars/ships/fleets can be clicked; overlapping items can be chosen explicitly. | ✅ Implemented | ✅ Implemented | Shared marker centers/extents align drawing and hits at every zoom, including scaled docking offsets and fleet size. Omitted small mobiles, satellites, dead ships, empty fleets, members and fog/preference-hidden markers cannot intercept input. A paged neutral chooser resolves stacked clicks, Control-click nearby items and ambiguous order targets; numbered keys/clicks choose, Escape preserves pending commands, and Enter/Tab cannot advance the game. Labels conceal unknown mobile names; cached type icons and allied-only plotted/scrap hints distinguish entries. Fleet inspector/marker information visibility remains the separate Section 5 gap. |
| Navigate containing objects | Left Arrow selects the immediate container and remembers the child; Right Arrow inspects the selected contents row. | ✅ Implemented | ✅ Implemented | Docked ships, nested groups and top-level fleets navigate one real container at a time through the existing fleet-exchange UI. The previous child is highlighted and revealed on its sorted page. Parent and Inspect buttons share the same behavior and display arrow hints; the system-parent button has a translated Containing system label. Right Arrow selects a fleet’s first row on entry and can return through a nested hierarchy. Hidden/stale containers, map targeting, drags and modal/editor input retain their existing restrictions. At the top level the shipped No more sample plays without changing selection or turn. Source and verification are recorded below. |
| Selection marker | Pulsing marker around selected object. | ✅ Implemented | ✅ Implemented | Rendered for stars, ships, and fleets in `display.js`. |
| Star names | Show/hide names; visibility-aware naming. | ✅ Implemented | ✅ Implemented | Deliberate user-requested departure from v3: yellow named stars show their chart names through fog. Undiscovered enemy homeworlds use stable plausible aliases until any successful detection; real names then remain known after scanners leave. Map/inspector/destination labels share the policy. Player comparison deliberately retains real homeworld-derived faction names, so these cannot be matched to the aliases on the fogged map. Ownership/economy visibility remains separate. Settings → Show map names and F2 toggle chart labels, with persisted default-on state. The toggle also gates mobile/rendezvous map labels, matching v3 DrawNames; diagnostic/comparison names remain visible. Existing zoom fading is retained. |
| Show/hide ships | Map display toggle. | ✅ Implemented | ✅ Implemented | Settings → Show ships and F1 toggle ship/fleet rendering. Defaults on and persists independently of grid/names. As in v3, the selected visible ship/fleet remains drawn while hiding others; fog and patrol restrictions still apply. Hidden mobile markers cannot intercept map selection or order targets. |
| Show/hide grid | Map display toggle. | ✅ Implemented | ✅ Implemented | Settings offers a localized Show grid toggle with active state, and F3 toggles it directly, matching the shipped v3 shortcut. Defaults on; browser/native preferences retain the choice across new games. Hiding the grid changes only rendering. |
| Starlanes | Dormant display toggle and disabled v3 star-lane data. | ❌ Missing / not a parity blocker | ❌ Missing / not a parity blocker | v4 has no lane model/rendering. Audited v3 has resources/classes, but star-lane save/load and generation are commented out, `EstablishStarLaneTo()` returns `false`, and generation is labeled broken. |
| Show all courses | Game menu toggle. | ✅ Implemented | ✅ Implemented | Settings offers independent Show all courses (F4) and Show courier courses (F5), matching the shipped v3 split for looping scouts. Both default on and persist. Selected routes remain visible when their setting is off; enemy routes remain private. Allied ship/fleet courses draw their remaining waypoint circuits. |
| Map display modes | Ownership, production, tech, defense, growth, shipbuilding and research brightness modes. | ✅ Implemented | ✅ Implemented | Command Menu → Map display offers all seven working modes to players and observers. Ownership retains existing visuals; numeric modes normalize brightness over known owned systems, with a localized range legend. Defense includes docked allied ships/fleets/satellites; economic allocation modes use target levels. Tech/defense also shade visible ships/fleets using the system range; economic modes de-emphasize mobiles. Unknown enemy metrics cannot alter shading or normalization. Equal/empty ranges are finite. Mode is per-game and is retained by local file saves, matching v3. |
| Danger display | Dormant button/command in v3. | ❌ Missing / not a parity blocker | ❌ Missing / not a parity blocker | Audited `CStar::GetDangerLevel`, `CShip::GetDangerLevel` and base implementation all return zero; `GalacticaDoc::RecalcHighestValues` comments out danger statistics. There is no functioning v3 danger metric to port. V4 offers the seven working modes and does not invent a danger calculation. |
| Scanner/range circles | v3 UI can render ranges/spheres of influence. | ✅ Implemented | ✅ Implemented | Settings/F6 controls default-on, persistent scanner overlays. Systems form three owner-colored unioned influence bands (4×/2×/1× range); selected scanners show three rings (1×/2×/4×) even when the setting is off. Ordinary unselected mobile scanners show one ring; looping couriers only show rings when selected. System coverage requires allied/omniscient or Tech knowledge, while mobile rings follow v3 visible-ship eligibility. |
| Full screen | Window menu toggle. | 🟡 Partial | 🟡 Partial | Localized command-menu and startup/in-game Settings toggles use actual browser fullscreen state and native PDG APIs; Settings shows localized failure feedback without closing or overwriting the saved choice. Browser entry/exit, external exit, rejection/retry and wide-screen click coordinates verified in all six languages. Native GLFW monitor switching and default-port restoration are fixed in both PDG repos. An earlier private-engine run passed real entry/exit/restoration cycles on three connected displays; the current execution session reports zero displays, so the public backport cannot yet be validated on connected monitors. Fullscreen preferences persist; native launch restores immediately and browser launch waits for the first click/key gesture. The pinned v1.2.0 archive still lacks the engine fix: v4 detects its unchanged actual state, reports failure and retains the saved preference. Updating the packaged runtime remains unfinished. |
| Nebula/background art | Persisted, default-on nebula preference; black map when disabled. | ✅ Implemented | ✅ Implemented | Settings → Show nebula background retains the choice through browser/native preferences and new games. On uses existing zoom-scaled parallax art and a missing-image gradient fallback; off clears the entire viewport black without drawing/loading another background. Influence bands dim to the v3 black-background levels (0.0625/0.09375/0.1875 versus 0.1/0.15/0.3) by updating cached drawing attributes; geometry masks are reused. Star animation, decorative exterior stars, grid, rings, controls and simulation remain independent. |

### Possible map/display enhancements beyond v3, not counted in Section 2

- Restoring starlanes as an actual travel/display network. The shipped v3 code path appears disabled, so this would be a design choice for v4 rather than required parity.
- Modern map affordances that exceed v3, such as mouse-wheel zoom and responsive control layouts.

## 3. Star systems, economy, research, and production (Functionality 100%, UI 100%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| System information panel | Name, owner, population, tech, build choice/progress, and production. | ✅ Implemented | ✅ Implemented | Anchored panels show localized grouped population, integer tech, current drive class, construction progress/ETA, total/satellite/mobile defenses and production totals. Owned systems retain build/rename, bare lock icons, a compact = equalize button, ship-list and inline Set/Clear default-destination controls. Coordinate rows and public pause actions are intentionally removed per the requested v4 design. Allied production/destination inspection is read-only, and allied docked ships can be inspected. V3 visibility rules hide true names/population below Class, technology below Tech, hulls below Details, and enemy progress, allocations and destinations at every visibility level. Long Unicode titles/map labels fit their available space. A focused new-colony setup report displays its localized naming/production instruction above the ordinary inspector controls. Help/manual remains its separate checklist item. |
| Population growth | Growth allocation drives a density-dependent population curve. | ✅ Implemented | ➖ N/A | Owned systems grow after allocation adjustment using the v3 percentage-to-allocation scaling and both density curves. Resulting population truncates to whole thousand-person units; the original minimum increment is retained. Zero-growth systems stay stationary. The 99,900 limit in `CStar::SetPopulation` applies only to a slider indicator, so actual colony population is not capped there. |
| Three-way economy | Growth, ships, and tech share system output. | ✅ Implemented | ✅ Implemented | Allocation model, gradual adjustment, human keyboard controls, dragging/clicking, locks/equalize, AI desired allocations, expert tech-star/shipbuilder roles, and default non-expert split exist. Runtime and player defaults retain v3’s 0–1000 precision in percentage units, with the 33.4/33.3/33.3 initial split, six-point adjustment rate, balanced unlocked redistribution and fractional Equalize. Owned systems now repair, produce research/ships from current output, then adjust allocations and grow/improve next-turn benefits, matching v3’s phase order. Research, growth and construction completion now match the verified v3 economy rules. Pending construction is system data, with cached hull costs and commissioning at current system technology. |
| Production sliders | Coupled sliders with current/desired colors and gradual adjustment. | ✅ Implemented | ✅ Implemented | Visible controls support click-and-drag in the system panel and production window, with pointer capture, clamped endpoints, locked-allocation protection and one notification per gesture. New-colony sliders also drag on their 0–1000 scale. Fractional percentages use localized decimal separators, and solid fills show current output, vertical markers show desired output, and track clicks set the desired level during gradual adjustment. |
| Slider locks | Lock one allocation while adjusting others. | ✅ Implemented | ✅ Implemented | Localized Lock/Unlock buttons in system and production panels preserve locked allocations while redistributing the remaining budget. Ownership, all-locked behavior, and click routing are tested. |
| Equalize production | Button resets unlocked allocations equally. | ✅ Implemented | ✅ Implemented | The compact `=` icon button and `=` shortcut in owned system/production views preserve locked allocations, split the remaining budget evenly, and put rounding remainder on the first unlocked allocation, matching `CGalacticSlider.cpp`. |
| Research and tech advancement | Research accumulates; higher levels take more work. | ✅ Implemented | ➖ N/A | Research uses current output before allocation adjustment, pays whole credits on v3’s integer 0–1000 allocation scale, truncates computer bonuses separately, and advances at most once per turn when credit strictly exceeds 1000 (normal) or 750 (fast). Excess credit is retained. |
| New-drive milestone | New technology class event every five levels. | ✅ Implemented | ✅ Implemented | The localized lab overlay appears when a system first reaches a new drive class for its player. Other systems reaching an already known class do not repeat the discovery event. Lab artwork is owner-only; eligible observers receive localized discovery narratives with Events replay and retained discovery details. |
| Choose hull type | Popup offers Satellite, Scout/Courier, Colony, Battleship. | ✅ Implemented | ✅ Implemented | All four hulls can be switched by keyboard or popup buttons; the active hull is highlighted. Per-hull effort survives switching; superseded unfinished hulls are unregistered. Public Pause build and its X shortcut are intentionally removed per the requested v4 design. Build-button tooltips say “Switch to building {type}” in all six languages. |
| Continuous ship production | A system continues producing the selected hull class. | ✅ Implemented | ✅ Implemented | Human systems keep the selected hull active, use carried effort, and can complete multiple ships each turn. Computer systems choose their next v3-weighted hull after each completion. A hull completes as soon as accumulated effort reaches its cost (100%). Fully paid saved hulls need no further payment, including at zero output. This intentionally improves on v3’s strict greater-than boundary at the user’s request. System panels identify continuous production. |
| Per-hull accumulated production | v3 preserves paid progress separately for each hull type when switching. | ✅ Implemented | ✅ Implemented | Per-hull credits are retained across switch/pause/resume and computer hull selection; resumed progress is visible in system and construction panels. |
| Ship build progress/ETA | Panel displays percent complete and v3 can estimate turns. | ✅ Implemented | ✅ Implemented | The system panel shows construction percentage truncated as in v3, alongside localized ETA using desired allocation, fast-game, computer advantage and inclusive completion rounding. Pending construction is system data, excluded from map selection, ship IDs/counts, scanners, docked lists and defenses. Hull cost is cached when selected; the real ship is created with current system owner/technology at commissioning. |
| Default new-ship destination | System “Send to” automatically dispatches new ships. | ✅ Implemented | ✅ Implemented | The owned-system panel shows its target and localized Set/Clear controls. Set arms a map click on an object or coordinate; Escape cancels without changing the existing target. Completed mobile hulls dispatch automatically; defense satellites remain at home. Right-click targeting remains available, including rendezvous/fleet targets. |
| Default new-colony settings | Newly colonized neutral systems use player defaults; computer colonies start satellites. | ✅ Implemented | ✅ Implemented | The command menu opens a localized modal editor for coupled growth/ships/research defaults and all four hulls. Save commits the human player’s defaults on v3’s 0–1000 scale; Cancel/Escape discard edits. Future neutral colonies inherit them through `Game.applyNewColonyDefaults()`, while existing systems and AI defaults remain intact. Cross-session preference persistence remains in Section 9. |
| Ships in system | Dedicated list/panel for inspecting and selecting docked ships/fleets. | ✅ Implemented | ✅ Implemented | A localized system window lists completed docked ships and fleets, with indented fleet members, tech/power/damage/speed columns, sorting and pagination. Clicking a row selects and centers its ship/fleet. Visibility follows the v3 system-panel rules, including friendly ships at neutral systems; unfinished hulls are excluded. Scrap/Cancel controls are available in the list; expanded fleet management remains its separate checklist item. |
| Rename colony/system | Edit menu rename dialog; new colony requests naming/production through attention. | ✅ Implemented | ✅ Implemented | Neutral human colonization creates the v3-style private instruction report and one attention request. Tab/manual selection or report Go to centers/selects the colony and displays the instruction above existing Rename/N and production controls. Unicode Save/Cancel remain available; allocations preserve defaults until edited. Recaptured/removed colonies cannot expose the private request. The v3 report has no modal naming window: `Evnt`128/event22 has zero PPob/autoShow and STR#500/45 requests naming and production. |
| System comparison window | Sortable “Your Star Systems” table. | ✅ Implemented | ✅ Implemented | Command-menu window lists the current human player’s systems with all nine v3 columns: name, tech, population in thousands, production, build class, completion, total defense, satellites and mobile ships. Every column sorts both ways with stable ties; paging keeps the window within the viewport. Single-click highlights; double-click or Enter selects and centers the system. Data refreshes live and stale ownership cannot be opened. Title-bar movement and corner height resizing retain pointer capture, resize-aware paging and in-session page retention. Position/height and sort restore from native/browser preferences after a fresh app reload. Viewport clamping preserves saved bounds; Escape ends a gesture first, and map input cannot pass through the modal. All six language layouts and real browser flows are verified; full suites: 909 passed on release/current native PDG. |

## 4. Ships and navigation (Functionality 100%, UI 94%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| Four hull roles | Satellite, Scout/Courier, Colony, Battleship with distinct cost/speed/combat/scanner roles. | ✅ Implemented | ✅ Implemented | V3 construction/cost rules match the runtime hulls, including stationary satellite patrol, fast unarmed scanning couriers, slower reusable colony ships, battleship combat and class progression. Diagnostics and destination-entry eligibility reflect these roles. Build/default choices have translated role help; first-built hulls and higher battleship classes have owner-only Stardock art/reports focused on the building system. Milestones and pending presentations survive save/restore; repeated/older classes do not announce again. Broader recipient-relative arrival/colonization narratives remain their separate Section 8 rows. |
| Battleship drive classes/names | A new named class every five tech levels (Traveler through Hellion). | ✅ Implemented | ✅ Implemented | Class index/name and first-of-class event are assigned in `star.js:180-203`, using resource ID 800. |
| Ship information/diagnostics | Name, class, tech, speed, power, damage/health bar. | ✅ Implemented | ✅ Implemented | The retained panel shows the real/renamed ship name, hull, named drive class, owner, integer tech/power, localized v3 speed, integer damage percent and health bar, scanner range in light-years, docking/patrol/travel/fleet status, location and current destination. Long Unicode names and values fit the panel. Selected map ships show the v3 health bar at normal zoom or closer. Enemy fields respect v3 visibility thresholds and enemy courses remain hidden. Full course editing is its separate navigation checklist item. |
| Direct destination orders | Add destination to a star, ship, fleet, or open space. | ✅ Implemented | ✅ Implemented | Human right-click and Orders targeting append star, ship, fleet or coordinate waypoints. AI destination assignments retain one-point replacement semantics. |
| Multi-waypoint courses | Ordered waypoint list with current destination in bold. | ✅ Implemented | ✅ Implemented | Shared ship/fleet course model retains origin, active/previous indices and live object references. The paged editor highlights the active destination, shows localized leg/remaining turns and draws the remaining circuit. |
| Add/edit/delete waypoint | Buttons and A/E/Delete shortcuts. | ✅ Implemented | ✅ Implemented | Course <G> opens the editor. Add <A>, Edit <E> and Delete preserve v3 selection/index semantics; targeting hides the inspector, supports Escape cancellation and rejects stale edits. |
| Clear entire course | Clear button/shortcut. | ✅ Implemented | ✅ Implemented | Clear <X> removes every waypoint and loop state, preserving Patrol as in v3. Deleting the sole destination also clears its origin. |
| Repeat/loop course | Repeats the waypoint circuit. | ✅ Implemented | ✅ Implemented | Loop <L> traverses the whole circuit including its origin, one leg per turn. Appending a courier’s second destination automatically enables looping, matching v3. |
| Course memory | Save/swap a ship's course. | ✅ Implemented | ✅ Implemented | Memory <M> first copies a ship/fleet course, then swaps active and remembered courses, retaining waypoint values/references, progress, origin, Loop and Hunt flags. Initial copy excludes Patrol; the player action cancels Patrol and selects/reveals the active waypoint after refresh. Clear preserves memory. Empty/read-only contexts cannot use Memory. |
| Call in | Human-controlled ship asks for attention next turn. | ✅ Implemented | ✅ Implemented | Call in <C> in the course editor toggles completed, independently controlled, movable human ships/fleets without changing course/Loop/Hunt/Patrol/memory. The request remains active each turn until canceled. Stationary, enemy/computer, satellite, unfinished, member and removed objects cannot use the control. |
| Automatic idle call-ins | Newly built or idle ships request orders periodically. | ✅ Implemented | ✅ Implemented | Completed non-looping courses, newly built mobile ships and idle human ships/fleets in space enter attention. Idle requests start on the first eligible turn (v3 initial last-call-in value -5), then recur every five turns. Docked idle ships, active/looping courses, members, satellites and computer ships do not generate idle requests. Translated event text and queue navigation show the requests. Broader build/message presentation is tracked under Attention queue. |
| Patrol mode | Ship or fleet patrols a docked system and gains defensive advantages; satellites always patrol. | ✅ Implemented | ✅ Implemented | Human Patrol <P> requires a completed, docked, independently controlled mobile ship or nonempty fleet. Enabling it clears the whole active course/Loop/Hunt while preserving memory; new waypoints cancel Patrol. Satellites cannot toggle their mandatory state. Editor and context controls reflect active state; P on a selected mobile object takes precedence over production commands, while system P still opens production. Ship/fleet details report Patrol. Idle docked patrols are hidden on the map unless selected and cannot be clicked while hidden. Fleets propagate Patrol to members without independent courses and clear docking at departure. Existing AI, combat bonuses and repair exclusion remain wired. |
| Hunt mode | Button/key and serialized course flag exist in v3; no active pursuit logic was found in audited C++ beyond that state. | ✅ Implemented | ✅ Implemented | Hunt <H> toggles the flag for editable, plotted ship/fleet courses with nonzero movement speed. The localized active button reflects the state. Memory preserves it; Clear, deleting the final destination and finishing the course reset it. Empty, stationary and read-only contexts cannot toggle it. Source-matched flag behavior does not introduce autonomous target seeking. |
| Scrap ship/fleet | Mark for scrapping and recover part of build value. | ✅ Implemented | ✅ Implemented | Reversible localized Scrap/Cancel controls appear on eligible ship/fleet panels and system-list rows. Owner/container checks match v3’s ship-in-system/fleet controls; satellites and individual fleet members are supported. Turn processing scraps before movement, refunds one quarter of each hull’s own-tech build cost to its enclosing star, cleans containment/spatial/rendezvous references and removes empty fleets. Fleets propagate orders to members; adding an unmarked ship, assigning courses, using course memory or enabling Patrol cancels the appropriate scrap orders. Marking handles attention. Paused systems retain refunds until construction resumes. Private scrap reports keep the saved location. |
| Movement by drive speed | Ships advance once per turn; scout faster, colony slower, satellite stationary. | ✅ Implemented | ➖ N/A | `ship.js:44-83` and `rules.js:125-145`. |
| Pursuit movement ordering | A moving target/top container can complete its turn before its pursuer when eligible. | ✅ Implemented | ➖ N/A | Confirmed in `CShip.cpp:670–745` and `AGalacticThingy::GetTopContainer`. The end-turn scheduler marks actors before recursion, moves an eligible destination or its highest container first, recalculates pursuit after departure, prevents duplicate/cyclic movement and skips removed actors and independently moving fleet members. |
| Colonize neutral system | Colony ship survives; system takes owner and ship tech. | ✅ Implemented | 🟡 Partial | Arrival and `Game.colonizeStar()` retain the colony ship, update owner/tech/scanner, apply v3 new-colony defaults, and record a colonization event. The private v3 naming/production attention report is implemented with usable inspector controls. Broader recipient-specific colonization/arrival narratives remain Section 8 work. |
| Courier technology pickup/transfer | Courier updates its library from higher-tech systems and upgrades lower-tech colonies. | ✅ Implemented | ✅ Implemented | Departure/arrival and docked standalone refresh match v3 pickup/delivery, including the restriction on scouts inside fleets. Allied arrival reselects the existing hull price at current star technology while preserving paid effort, paused production and other hull credits. Technology, completion, scanner and ETA displays refresh through ordinary inspectors. Audited v3 `CShip.cpp:204–213,466–489` logs transfers only to debug output and emits no dedicated transfer report, so a separate popup is not a parity requirement. |
| Battleship technology delivery | Battleships can upgrade colonies but cannot update their own library. | ✅ Implemented | ➖ N/A | `applyTechnologyTransferToStar()` lets battleships/fleets raise lower allied star tech while only scouts can pick up higher star tech. |
| Docking and repair | Damaged mobile ships repair at friendly systems using a tech-level repair budget. | ✅ Implemented | ✅ Implemented | `Star.update()` repairs docked, non-patrolling, non-moving mobile ships and member ships inside docked fleets using `35 * techLevel`, excluding satellites. The ship panel shows docking/fleet state, current damage percentage and a live health bar that updates after repairs. v3 `CShip::RepairDamage` refreshes the object without a separate player-facing repair summary. |
| Ship arrival/interception outcomes | Friendly arrival docks/forms fleet; enemy arrival fights. | ✅ Implemented | 🟡 Partial | Shared ship/fleet arrival resolves combat, neutral colonization and technology at the highest container, then places survivors in a living neutral/allied container or at coordinates. Nested navigation and rendezvous arrivals retain fleet groups and register the docked outer group once. Destroyed navigation targets fall back to the surviving container. Courses advance only for surviving independent actors; colony ships and their containing fleets remain docked and available for further orders. Twelve regressions and actual browser End Turn comparisons cover these paths. Richer recipient-specific arrival narratives and result presentation remain Section 8 work. |

### Possible ship/navigation enhancements beyond v3, not counted in Section 4

- Active Hunt auto-pursuit/interception behavior beyond the serialized v3 flag/button.
- More autonomous route planning beyond v3's waypoint/course-memory model.

## 5. Fleets and rendezvous (Functionality 100%, UI 100%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| Fleet entity | Group operates as one unit; power sums and speed is slowest member. | ✅ Implemented | ✅ Implemented | `fleet.js` tracks stats, docked state, patrol state, member positions, spatial location, naming, and technology transfer to allied systems. Map/detail rendering exposes fleet state and member controls. |
| Form fleet by meeting ships | Friendly ship targeting another friendly ship automatically forms a fleet. | ✅ Implemented | ➖ N/A | `handleFleetFormation()` and ship/fleet arrival paths cover the runtime rule. |
| Join/merge fleets | Ship joins friendly fleet; two fleets can merge. | ✅ Implemented | ✅ Implemented | Arrivals join the destination fleet while preserving an arriving fleet as a nested group; explicit `mergeFleets()` combines fleets. The shared-container exchange window lets players select a destination fleet, move selected ships or intact groups into it, return contents to the enclosing system/fleet, or form a new fleet. Nested groups retain identity; self/ancestor cycles are refused. |
| Exchange/remove ships | Fleet/group panels move selected ships between fleets or out of a fleet. | ✅ Implemented | ✅ Implemented | Exchange ships opens a v3-style main/sub-list window at a system or fleet. Selecting a main-list fleet keeps it active as the destination while selecting other members. Exchange moves a main member into that destination, or a sub-list member back to the enclosing container. With no active destination it creates a new top-level/nested fleet; New fleet clears the destination while preserving a main selection. Paging, sorting, inspection, parent navigation, patrol/scrap and modal close work in all six languages. Live membership, ownership, completed/alive state, location, patrol and cycles are checked before mutation; stale destination/source references cannot create replacement fleets. Knowledge-safe row diagnostics preserve enemy privacy. Full suites: 877 passed on release/current native PDG; final browser flows and inspected before/after views in all six languages. Evidence: `/private/tmp/galactica-parity/exchange-{before,after}`. |
| Fleet contents panel | Lists ships/groups and health; enemy information respects knowledge. | ✅ Implemented | ✅ Implemented | Paged direct-member rows show measured names, technology/speed/power and live health. Group rows open their own contents, with Parent fleet navigation through multiple levels. Group/Transfer/Remove preserve hierarchy and reject containment cycles. Recursive stats, movement, repair, defense, combat, technology delivery and cleanup account for nested members without duplicate processing; contained groups leave AI decisions to their parent. Knowledge gates apply separately to group/member names and health; contained groups have no independent map marker. Owner gradients/borders and translated controls fit below the status bar. Full suites: 866 passed; native browser flows and inspected before/after captures in all six languages. Evidence: `/private/tmp/galactica-parity/groups-{before,after}`. |
| Fleet navigation | Fleet course panel and the same course tools as ships. | ✅ Implemented | ✅ Implemented | The shared ship/fleet course model and editor provide waypoint add/edit/delete, looping, memory, clear, Call in and Hunt controls, with current leg progress and visibility-safe course drawing. Their implemented rules and validation are tracked in Section 4. Overlap targeting now preserves the pending command and chosen reference for fleets as for ships. |
| Named fleets | Human-created fleets prompt for a name; rename is available. | ✅ Implemented | ✅ Implemented | Fleets have localized default names and can be renamed through the simple rename window. The v3 computer-move source has a TODO for unique computer fleet names, so AI-generated fleet naming is not counted as shipped parity. |
| Rendezvous points | Place/name/move/delete a point in open space, on a system, or on another ship. | ✅ Implemented | ✅ Implemented | `rendezvous.js` adds first-class owned rendezvous markers. Map and context buttons create/place them; selected rendezvous can be renamed, moved, deleted, centered, and inspected. |
| Auto-form fleet at rendezvous | Ships sent by producing systems assemble into a named fleet. | ✅ Implemented | ✅ Implemented | First arriving ship creates a named assembly fleet; later ships and fleets join/merge into the remembered rendezvous fleet, and the reference clears when that fleet leaves. |
| Fleet comparison window | Sortable “Your Fleets” table. | ✅ Implemented | ✅ Implemented | Owned standalone ships and top-level fleets match v3 eligibility; private rendezvous rows remain a v4 extension. Eight measured columns, numeric/colony/destination sort rules, complete paging, selection/centering and double-click inspection are implemented. Title dragging and corner height resizing retain captured pointer input; viewport bounds and minimum usable height preserve controls and every-row access. Position/height and sort persist through native/browser preferences and restore after a fresh app reload. Temporary viewport clamping retains preferred bounds. Escape ends a capture before closing; right/middle input cannot order or pan behind the roster. Full suites: 900 passed on release/current native PDG; actual browser flows and inspected translated screenshots in all six languages. Evidence: `/private/tmp/galactica-parity/geometry-{before,after}` and `/private/tmp/galactica-parity/roster-{before,after}`. |

### Possible fleet enhancements beyond v3, not counted in Section 5

- Automatic unique fleet names for computer-created fleets; v3 source notes this as a TODO rather than shipped behavior.
- Higher-level task-force or staging automation beyond v3 rendezvous points.

## 6. Combat, occupation, defense, and fog of war (Functionality 100%, UI 32%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| Ship/fleet combat on interception | Enemy forces exchange attacks; defeated units are removed and winner continues. | ✅ Implemented | 🟡 Partial | `CombatSystem` is instantiated by `Game`, enemy ship/star/fleet arrivals invoke it, destroyed ships are removed from containers/fleets, empty fleets are cleaned up, and battles record private winner/loser/inconclusive reports with battle-time own/enemy ship losses and survivor/remembered-location navigation. V3 fleet loss results use ordinary recipient-relative event messages; a separate tabular fleet-result window was not found in the audited source. Local participant messages now open automatically in neutral modal windows and replay through Events → View report/Enter. Acknowledgment and Go to preserve the turn; complete Unicode paging, private access, pending saves and quiet autoplay are covered. Observer/other narrative variants remain Section 8 work. |
| Combat reserves | Couriers and colony ships stay in reserve until combat ships are gone. | ✅ Implemented | ➖ N/A | Reserve sorting is used by the runtime combat path. |
| Multi-target and rollover damage | Higher-tech attackers hit multiple targets and excess damage rolls over. | ✅ Implemented | ➖ N/A | The resolver uses tech-based target counts and rollover damage during runtime combat. |
| Defended-system invasion | Defeat stationed ships, then fixed planetary defenses; production/population is damaged. | ✅ Implemented | 🟡 Partial | Enemy star arrivals run space combat, ground combat against population, v3-style star attack/defense and population damage, and colony capture when a colony survives. Both involved owners receive distinct last-resistance and capture narratives, automatically presented and replayable through Events. Reports retain the battle-time system/faction names and old owner, survive saves, and stay available on terminal turns. Participant casualty/resistance reports now play an eight-frame destruction burst before the complete message. Private ship/fleet destruction notices follow v3 suppression rules and play automatically without another alert; their full narratives replay through Events. Known/all-visible captures also have an observer narrative with optional automatic playback through Settings → Show enemy events; resistance stays private. Other observer variants and sound remain separate event/presentation work. |
| Capture and defeated resistance | Successful invasion reports the loss of resistance and transfers ownership when a colony survives. | ✅ Implemented | 🟡 Partial | A surviving colony ship can transfer ownership after ground combat, defeated systems clear stale default destinations, new colony defaults apply where v3 does, non-colony survivors are kept outside hostile stars that hold, and defeat/victory updates run after combat. V3 `CShip::Arriving` distinguishes defeated resistance from subsequent occupation; both have private winner/loser reports, queued modal presentation, attention and Events replay. A separate surrender event has enum/resource definitions but no runtime emitter in the shipped source; it is not treated as an additional confirmed gameplay trigger. Defeated resistance plays a source-timed procedural explosion before its report. Private ship/fleet destruction notices are implemented separately. Captures broadcast an observer narrative visible for detected/allied subjects or in all-visible mode, retained for manual replay and automatically presented when Show enemy events is enabled; resistance remains private. Sound and other event variants remain presentation work. |
| Defense satellites | Stationary, strong, always on patrol, cannot repair. | ✅ Implemented | ✅ Implemented | The hull is stationary, completed defense builds attach to the star, satellites patrol automatically, satellites do not repair, and attached satellites defend systems. Localized hull/build/progress controls, ship inspection and separate damaged-satellite defense totals are present in the system panel and comparison table. |
| Patrol coordination bonus | Patrolling defenders receive attack/defense advantages. | ✅ Implemented | ✅ Implemented | Satellite completion, Good/Expert AI and docked human ship/fleet commands enable Patrol. Ship combat formulas apply the v3 docked attack/damage bonuses; localized ship/fleet status and active editor/context controls indicate the mode. |
| Damage and destruction | Health decreases, units die, fleet loss accounting and explosion feedback. | ✅ Implemented | 🟡 Partial | Runtime combat applies v3-style ship power, star strength, and population damage, removes destroyed ships robustly, and recalculates/cleans up affected fleets. Private casualty and defeated-resistance reports now center their recorded battle location and play eight expanding/contracting frames at the v3 tick cadence before showing the complete message. Events replay and restored pending messages restart the effect; quiet autoplay, private access and reduced motion are respected. Attributes are cached and disposed, and the simulation RNG is untouched. Private ship/fleet destruction narratives now retain separate winner/loser perspectives and automatically play an animation-only notice after the existing battle summary. Fleet members, nested subfleets and individual defenders at their own systems are suppressed. Events retains and replays the full narrative. Partial fleet losses do not announce fleet destruction. Sound and other event variants remain Section 8 work. Persistent debris art was not confirmed in the audited destruction renderer. |
| Repairs | Friendly docking repairs surviving mobile ships; satellites do not repair. | ✅ Implemented | ✅ Implemented | Friendly stars repair docked, non-patrolling, non-moving mobile ships and fleet members using the v3 tech-level budget, excluding satellites. Damage and health displays update after repair. The separate CStar::EndOfTurn completion emitter now creates private human-system-owner notices when positive repair reaches zero ship or whole-fleet damage, with retained names, attention, Events navigation and manual replay. Partial repairs and completed individual fleet members do not emit notices; sound remains separate Section 8 work. |
| Scanner-based fog of war | Stars/scouts reveal enemy presence, owner, tech, then class/details by range; scout stealth matters. | ✅ Implemented | 🟡 Partial | Spatial visibility levels, star/scout/fleet scanners, stealth calculations, current-visibility recalculation, and preserved last-seen memory are implemented. Current detection controls map/inspector knowledge. V3 stores last-seen history for scanner bookkeeping; a separate remembered-object drawing mode was not found. That optional extension is recorded in `FUTURE_IMPROVEMENTS.md`. |
| Fog-of-war rendering | Enemy colonies/ships are hidden or partially identified according to visibility. | ✅ Implemented | 🟡 Partial | Enemy ships/fleets are hidden when visibility is none, star ownership/detail rendering reads numeric visibility levels, and scanner-based fleet visibility queries work. Stars remain plotted while undetected enemy ownership is hidden. Ownership halos and inspectors agree at first detection; allied/all-visible systems remain identified without scanners. Losing detection hides current ownership and mobile markers while preserving last-seen history. Yellow-star labels retain the requested v4 naming deviation. Remaining class/detail rendering audits stay separate; no v3 last-seen ghost drawing mode was confirmed. |
| Omniscient mode | Disabling Fog of War shows the whole galaxy. | ✅ Implemented | ✅ Implemented | Disabling fog through startup/config makes visibility queries and display helpers treat enemy stars, ships, and fleets as fully visible; covered by fog and command UI tests. |
| Combat odds estimate | Not part of shipped v3/manual behavior; listed as a v4 future enhancement. | ❌ Missing / not a parity blocker | ❌ Missing / not a parity blocker | Correctly remains in `docs/FUTURE_IMPROVEMENTS.md`; it should not be counted as missing v3 parity. |

### Possible combat enhancements beyond v3, not counted in Section 6

- Combat-odds previews, retreat/withdrawal rules, and explicit player-visible probability breakdowns.
- Balance changes aimed at a more aggressive or less stagnant late game beyond matching the v3 formulas and AI decision factors.

## 7. Computer players (Functionality 100%, UI 67%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| AI turn participation | Computer systems choose production and ships/fleets choose strategic destinations. | ✅ Implemented | 🟡 Partial | AI players are created and processed before movement. Star build/economy, ship destinations, and fleet destinations execute. `./gad4 -- --ai-autoplay` advances a deterministic no-human observer game until win condition or the 250-turn guard. Event windows are hidden by default and restored with `--show-event-windows`. |
| AI ship decision matrices | `CShipCompMove.cpp` scores owned stars, enemy stars, unowned stars, enemy ships, and fleet formation using v3 factor tables. | ✅ Implemented | ➖ N/A | The port uses the v3 factor tables, v3 skill search distances/repetition counts, v3 per-destination pass merging, v3 tie-break rules, skilled scout behavior, lower-skill randomness, Novice fleet avoidance, invalid-target guards, ineligible-actor skips, the docked-fleet-with-fewer-than-three-ships guard, docked fleet formation, and fleet AI actors. Full waypoint/course UI remains Section 4/5 work, not a Section 7 computer-player blocker. |
| AI economy management | `CStar::DoComputerMove()` changes desired allocations: Expert can designate tech stars; non-experts reset to the default split. | ✅ Implemented | ➖ N/A | AI writes desired star allocations. Expert AI can select a v3-style tech star using highest-tech/no-nearby-enemy/nearby-ally checks and splits other systems into growth/shipbuilding; non-experts use the default split. Threat/development allocation helpers are scaffold/future behavior, not v3 parity. |
| AI colonization defaults | Computer colonies immediately set a defensive build on newly colonized neutral stars. | ✅ Implemented | ➖ N/A | `Game.applyNewColonyDefaults()` starts a defense satellite for computer-owned neutral colonies, matching `CShip::Arriving()`. |
| AI use of tech transfer | Computer scouts/battleships/fleets benefit from the same arrival/departure technology rules as human units. | ✅ Implemented | ➖ N/A | Technology transfer is in the shared movement/rule path, so AI orders use it automatically. Tests cover standalone scout refresh, battleship/fleet delivery, and the v3 limitation that scouts inside fleets do not refresh. |
| AI defenses | v3 computer defense is satellites plus Good/Expert auto-patrol for docked, healthy non-scout ships/fleets; computer ships do not use call-in. | ✅ Implemented | ➖ N/A | Satellites, patrol state, patrol combat bonuses, and the C++-confirmed Good/Expert patrol toggle for healthy/damaged docked ships and fleets are implemented and tested. No v3 computer reinforcement/call-in subsystem was found. |
| Skill differences | v3 has five skill values. They change search distance, target passes, skilled scout behavior, lower-skill randomness, Novice fleet avoidance, and Good/Expert patrol toggling. | ✅ Implemented | 🟡 Partial | Ship AI reads the preserved five-level v3 skill for C++-backed movement behavior. Older three-bucket helpers remain only as general scaffolding/stat display and no longer affect v3-backed ship movement or build selection. UI/localized skill names exist, but setup display remains basic. |
| Advantage modifier | Computer advantage is a setup value from +3 through -3 and applies a 20% modifier to production-style calculations. | ✅ Implemented | ✅ Implemented | Computer advantage applies to AI research, shipbuilding and production reports at 20% per level, matching `CStar.cpp`. Setup exposes all seven values through clickable choices/A cycling and displays the resulting 40%–160% rate. Config validation and game launch preserve the selected integer value. |

### Possible AI enhancements beyond v3, not counted in Section 7

- Player-visible AI intent/debug overlays.
- Richer defensive threat evaluation or reinforcement coordination beyond v3's satellite/patrol behavior.
- Strategic uses of computer advantage beyond the v3 production-style modifiers.
- Combat-odds estimation, retreat/avoidance, and late-game attack-pressure tuning beyond matching the v3 decision factors.

## 8. Events, messages, comparison, help, and general UI (Functionality 65%, UI 59%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| Main information/navigation panels | Context-sensitive system, ship, fleet, rendezvous, and list panels with command buttons. | 🟡 Partial | 🟡 Partial | v4 draws anchored context panels for systems, ships, fleets, and rendezvous points plus simple menu/event/comparison/fleet-roster windows. Permanent map buttons and popup arc buttons are clickable. The full v3 contextual button architecture, sortable fleet tables, and richer command workflows remain incomplete. The sortable system comparison is implemented. |
| Window/dialog chrome | v3 uses styled windows, separators, fixed command areas, and map controls. | ✅ Implemented | 🟡 Partial | v4 uses neutral gray rounded panels with subtle gradients/outlines, slightly owner-tinted inspector borders, brighter buttons and hover states, known-owner system tint, familiar map icons with localized hints, brief whole-panel transitions, a top-center game/turn header and pointer triangles. Remaining parity is concrete window/menu/list coverage, not an open-ended final visual redesign. |
| Keyboard shortcuts and hover help | Buttons advertise shortcuts; balloon/flyby help describes controls. | ✅ Implemented | ✅ Implemented | Current controls advertise their working v4 shortcuts. Delayed explanatory help uses the same hit targets as clicks across inspectors, allocation sliders, command/list/course/report windows, startup options and local file dialogs. Text wraps by measured Unicode glyph width and stays within the viewport; covered controls behind modal windows, active drags, destination placement and illustrated overlays cannot show help. Clicks/keys clear it without intercepting input. Settings → Control help persists through native/browser preferences, reload and open-game switching. Eleven regressions and actual six-language browser comparisons cover timing, privacy/input isolation, allocation semantics, current action coverage, persistence, complete text and viewport bounds. New commands introduced with the remaining unported dialogs will need their own help alongside those implementations. |
| Events from last turn | Dedicated show/hide event window with selectable event list and narrative text. | 🟡 Partial | 🟡 Partial | `[E]`/Events shows recipient-visible reports from the last completed turn in chronological order. Paged rows select and center live subjects, preserve locations for lost subjects and show reviewed state; complete Unicode narratives have separate paging. Combat, outcome, repair-completion and rendezvous fleet-creation rows offer View report/Enter replay; ordinary rows offer Go to/Enter navigation without advancing time. Local combat reports automatically open private modal windows. Busy turns retain every report, and smaller windows reduce row count. Broader v3 event generation, narrative variants and illustrated replay remain incomplete. |
| Attention queue | New ships, idle ships, colonies, messages, and other important events select themselves in sequence. | 🟡 Partial | 🟡 Partial | A per-turn subject queue covers human mobile ship/fleet call-ins, course completions, idle requests, completed mobile/satellite builds, complete ship/fleet repair notices, rendezvous fleet-creation notices and newly colonized/captured stars. Tab, menu and map Next item visit/center subjects; manual selection or report review handles linked requests. Colony reports focus the star while the colony ship remains available. UI End Turn confirms before discarding pending requests or presentations. Other v3 message types, enemy moves and notable event subjects remain to port. |
| New technology lab presentation | Illustrated new-drive event. | ✅ Implemented | ✅ Implemented | Dimming lab overlay with blueprint art; Space/Esc continues, while End Turn confirms before discarding unreviewed presentations. |
| New hull/class Stardock presentation | Illustrated first-built satellite, scout/courier, colony or higher battleship class event. | ✅ Implemented | ✅ Implemented | Owner-only Stardock overlays use matching hull/class art and translated titles. Reports retain role explanations and focus the building system even after default-order departure. First-build flags, highest built class and queued presentation identities survive saves; repeated hulls and older classes are suppressed. Source-confirmed observer broadcasts now retain faction/class/technology/origin snapshots, follow current detection and Show enemy events, and replay as ordinary reports. Illustrated Stardock art stays owner-only. Space/Esc continues, while End Turn confirms before discarding unreviewed presentations. |
| Colonization/capture/battle event text | Player-relative narrative messages for 45 event types. | 🟡 Partial | 🟡 Partial | Participant battle outcomes, system capture, defeated resistance and individual ship/fleet destruction now have private winner/loser narratives, retained battle-time names, remembered-location navigation and replay. Commissioning, discovery and neutral colony naming/production reports are also present. Neutral colonization now has separate owner and observer narratives, automatic eligible playback, Events replay and retained colony-time names. Capture observer narratives are also available through Events with fog gating; resistance and destruction remain direct-participant notices. First-class construction now broadcasts owner/observer copies: detected observers receive automatic/plain reports and manual replay, while owner Stardock art remains private. Discovery now also broadcasts separate owner/observer copies with private Lab art, current detection checks and replay. Other observer variants, multiplayer messages and remaining event types are still incomplete. |
| Compare players | Player summary table with best values blue and worst red; the audited v3 sort handler is empty. | ✅ Implemented | ✅ Implemented | Menu/V opens all eleven v3 numeric fields: systems, population in thousands, production, system min/max/average technology, completed ships, raw ship power and ship min/max/average technology. Unowned systems have an italic neutral row and no ship fields; unassigned names are italic Unknown; defeated rows show a localized suffix and dashes. Living category-specific extrema exclude neutral/dead rows; blue takes precedence for tied best values. Production comparisons retain hundredths before formatting. Names retain true enemy homeworld/faction identity under fog, with full hover text when needed. Viewport paging reaches every player; Close/V/Escape and modal map input are verified in all six languages. Full suites: 919 passed on release/current native PDG. Functional sorting and aggregate score columns were not confirmed in v3 C++. |
| Send/show/hold player messages | Multiplayer chat to one/all/admin, with message history and repeat settings. | ❌ Missing | ❌ Missing | No chat or message model. |
| Rename ship/fleet/colony/rendezvous | Edit menu rename workflow. | ✅ Implemented | ✅ Implemented | Owned ships, systems, fleets and rendezvous points have localized Unicode Rename/Save/Cancel controls. New human neutral colonies create the private v3 naming/production instruction and attention navigation, rather than a forced naming modal. Requests disappear for recaptured/removed colonies and do not target computer or captured enemy systems. |
| Sound and attention cues | Sound toggle, attention sound, combat/build feedback. | 🟡 Partial | 🟡 Partial | The localized persistent Sound setting now controls cached PDG audio across open/restored games. Presented colony, battle, destruction, repair, lab and stardock reports and attention navigation select recipient cues from the shipped samples; explosions precede the later cue by the source animation cadence plus 20 ticks. Hidden reports and quiet autoplay are silent, and mute stops owned playback. Native suites and actual browser controls/playback are verified below. Empty Tab/Next item now plays the shipped No more cue without changing selection or the turn. Chat, background network-turn and tutorial cues remain tied to their unported features; Left Arrow at a top-level object also plays No more. Startup/About music is blocked by missing source movie metadata, documented below. |
| Preferences | Persistent drawing, sound, language, and game preferences. | 🟡 Partial | 🟡 Partial | Default player name, language, grid, map-name, ship, course, scanner and nebula choices persist through native PDG configuration or browser localStorage. Fleet roster sort and position/height persist and restore after a fresh app reload, with safe fallback for invalid/unavailable storage and visible viewport clamping. System comparison sort column/direction also persist independently; numeric and hull columns start highest first, with hull class/technology ordering across languages. System comparison position/height also persist with title/corner dragging, viewport bounds and resize-aware paging; the page is retained during the session. Show enemy events defaults on, persists for new games and retains independent saved-game choices. Sound now persists independently of saved games and controls playback across open sessions. Fullscreen choices now persist across launch: native restoration is immediate, while browsers defer until the first user gesture and remember external exits. Startup Settings and Menu → Settings → New game defaults now select numeric values directly and saves map size, density, AI skill/advantage, fast game and fog of war separately from ordinary setup and current games. Startup and New Game apply these defaults; tutorial setup is isolated. Colony hull and coupled production defaults now persist independently and are available from startup/in-game Settings and the game menu. Save applies them to the local human and future games; opening saves reapplies application colony defaults as in v3, while existing systems and computer defaults stay unchanged. Fixed tutorial practice is isolated. Startup now offers a persistent introduction and independent About presentation with original artwork, localized narrative/credits, paging, modal dragging and tutorial entry. First-install automatic tutorial is implemented. Stored numeric startup actions now dispatch available About/New/Open/Save/Revert/Quit/Fullscreen/Help/Tutorial handlers once after introduction/onboarding. Browser commands requiring activation wait for trusted input. Arbitrary inherited/window commands and multiplayer startup actions remain unfinished, alongside other preference coverage and the pinned native runtime update. |
| User's Manual | In-app menu opens the manual. | ✅ Implemented | ✅ Implemented | Startup and command-menu buttons plus the Help key open a bundled offline manual in the selected language, using a separate browser tab or the native system browser. All six complete pages cover current gameplay, strategy and shortcuts, with native-script language navigation, local contents links, responsive layout and print styling. Missing files and browser-launch failures show localized modal feedback without changing the game or turn. Browser packaging, actual six-language startup/game opening and navigation, narrow layouts and native macOS launch are verified. Unported networking and interactive tutorial are explicitly identified in the manual and remain separate checklist requirements. |
| Interactive tutorial | Guided scripted game teaches map, production, ships, fleets, events, and comparison. | 🟡 Partial | 🟡 Partial | The shipped 42-system galaxy, production safeguards, sixty-lesson progression model, removable action bindings and temporary session owner are implemented. Actual setup/name actions install the fixture without replacing ordinary documents; cancellation restores the prior game/file/renderer/configuration/autoplay. Tutorial AI and combat use a private seed-101 stream; graph saves retain its state without changing normal PDG RNG behavior. Runtime tests exercise production, orders, naming, placement, events, attention, comparison and fleet contents. The floating instruction panel renders complete six-language texts and buttons, follows language changes without resetting progress, and preserves action-only waits; its attention cue is packaged. The complete normal guided route is verified through real UI input in all six languages. Tutorial launches from the start screen and in-game menu, with cancellation preserving existing documents. All source picture references have localized modern control illustrations. Source audit confirms v3 saves practice games without persisting instruction progress; Open and Revert retain active instruction bindings and production safeguards, with independent documents preserved. The optional wrong-course retry is verified through actual controls in all six languages. Hosting recovery remains dependent on the unported multiplayer startup flow; other recovery paths retain model-level coverage. See docs/reference/TUTORIAL_CONTROLLER.md. |
| Internationalization | v3 language plug-ins; menu can switch languages. | ✅ Implemented | 🟡 Partial | v4 has English, German, Spanish, French, Japanese, and Russian resources and accepts runtime language with `./gad4 -- --lang=es`. Current user-visible runtime strings are resource-driven/tested; Menu → Settings → Language switches cached UI labels and numeric formatting immediately, remembers the selection and always lists native-script language names. Unported v3 dialogs/help still need future resources. |
| Original art use | Ship/event/background artwork reinforces game state. | 🟡 Partial | 🟡 Partial | v4 uses background and lab/stardock/ship assets, while most UI buttons, panels, animations, and states are styled primitives/text. Remaining parity should be tied to specific shipped v3 event/help/window imagery. |

### Possible UI enhancements beyond v3, not counted in Section 8

- The final v4 visual direction, responsive layout polish, pointer-triangle/arc-button refinement, and other modernized styling choices.
- Functional sorting for Compare Players, unless another shipped v3 path is found; the audited `SortCompareWindowByColumn()` body is empty.
- Additional dashboard/scoring views beyond the v3 summary columns.

## 9. Save/load, multiplayer, and host administration (Functionality 25%, UI 25%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| Save turn / Save As | Saves a single-player turn document. | ✅ Implemented | ✅ Implemented | Menu → File provides Save and Save As with a selected Unicode filename/path editor. Versioned graph serialization preserves configuration/rules, players, stars, ships, nested fleets, rendezvous, shared courses/memory, economy, events/attention, historical subjects, visibility/chart aliases, selection, camera, drawing flags and Events-window visibility/paging. Native writes replace files atomically; Save As confirms existing native paths. Browsers use retained file handles or downloaded JSON. |
| Open saved game | Opens a saved turn. | ✅ Implemented | ✅ Implemented | Startup Open Game and File → Open load `.gad4.json` documents without regenerating the galaxy, preserving already-open games. References, object prototypes, spatial indexes, factory/AI/runtime services and future entity IDs are restored. Malformed or unsupported files report a localized error without replacing the active document. Browser fresh-page imports of actual downloaded files pass in all six languages. The format is v4 JSON, not a reader for legacy v3 binary files. |
| Revert to saved turn | Restores the last saved state. | ✅ Implemented | ✅ Implemented | File → Revert asks before discarding changes, then restores the saved graph, turn, selection and camera under the same local document identity. Cancel preserves the running game. Native/file-handle backends reread the file; download-only browsers revert to the last successfully saved/imported snapshot. No-saved-file and load failures are localized. |
| Host new network game | Creates host data, starts server, and presents join flow. | ❌ Missing | ❌ Missing | `GameConfig.hosting` is data only. There is no network/server code in v4. |
| Open as host / dedicated host | Resume a hosted game and optionally run without a local player. | ❌ Missing | ❌ Missing | No equivalent. |
| LAN/Internet discovery | Browse advertised games and query the matchmaker. | ❌ Missing | ❌ Missing | No equivalent. |
| Join by list/IP/hostname | Inspect game information, choose a slot, join or rejoin. | ❌ Missing | ❌ Missing | No equivalent. |
| Player login/password/rejoin key | Open slots, optional saved password, reconnection, version/private/full checks. | ❌ Missing | ❌ Missing | `PlayerInfo.password`/`isLoggedIn` are unused model fields only. |
| Turn posting and synchronization | Clients send changed objects and post completion; host resolves turn. | ❌ Missing | ❌ Missing | v4 directly mutates one local game and advances immediately. |
| Timed turns | Host clock, time remaining, pause/resume, automatic completion. | ❌ Missing | ❌ Missing | No runtime timer. |
| Host administration | Change settings/player, end turn now, pause/resume, edit state, eject users. | ❌ Missing | ❌ Missing | No host/admin mode. |
| Multiplayer chat | Player-to-player/all/admin messages. | ❌ Missing | ❌ Missing | No networking or chat. |

### Possible persistence/multiplayer enhancements beyond v3, not counted in Section 9

- Modern cloud matchmaking, account integration, replay storage, or external service hosting beyond v3's local save/OpenPlay/GameRanger-era model.

## Documentation status

The project documentation was refreshed on 2026-08-25 so the docs now agree on current runtime status rather than mixing old plans with newer implementation summaries.

- `MAP_GENERATION_PORT_STATUS.md` records current map-generation status instead of listing already-completed work as future tasks.
- `AI_INTEGRATION_STATUS.md` and `AI_INTEGRATION_TODO.md` describe AI as active: AI turns run, stars can start v3-weighted builds, ships and fleets can set destinations, and key v3 skill/advantage hooks are active. Speculative AI upgrades are separated from C++-confirmed v3 parity gaps.
- `README.md` now links only to files that exist and no longer describes the port as a complete 4X game.
- `INTERNATIONALIZATION_STATUS.md` now serves as the current i18n reference and records that current runtime UI/event strings are localized with parity tests across supported languages.
- `TESTING_GUIDE.md` and `tests/README.md` now match `tests/run-tests.js`, including the current runner command. The main suite currently reports 344 tests.

This file remains the main parity source of truth. More focused docs may describe implementation details for an area, but their status claims should stay consistent with the tables above.

## Recommended parity sequence

1. **Exercise the now-playable core:** use the 250-turn autoplay observer to diagnose stalls and tune balance only where the v3 source/manual supports it. Richer combat/result presentation should be treated as UI work, and deeper attack-pressure or combat-odds work remains a future enhancement unless further v3 evidence appears.
2. **Finish essential player control:** complete the build selector/progress workflow, default-new-colony settings UI, production lock/equalize behavior, ships-in-system, damage state, patrol, repairs, and clear destination controls.
3. **Restore v3 navigation:** waypoint lists, add/edit/delete/clear, looping, course memory, call-in, attention queue, and event history.
4. **Finish remaining command/list polish:** sortable system/fleet tables, full course editor integration, richer fleet combat reporting, fleet visibility presentation, and less minimal fleet exchange/list workflows.
5. **Add game setup and persistence:** setup screen for all supported options, then full save/open/revert.
6. **Add comparison and polish:** remaining comparison/list polish, display modes/toggles, remaining renaming prompts, sound, manual link, tutorial, and shipped preference/help flows. Treat Compare Players sorting/scoring and final v4 art direction as future enhancements unless further v3 evidence appears.
7. **Port multiplayer last:** host/join/rejoin, synchronization, turn posting/timers, chat, discovery, and administration rely on the preceding state model being stable and serializable.

## Parity implementation log

- 2026-10-09: Baseline 353 unit tests passed. Deterministic 250-turn AI observer reached its guard without a crash (428 ships, 25 fleets, no winner); additional balance tuning requires evidence of a v3 rule mismatch.
- Production locks: corrected allocation normalization and added localized controls in both production surfaces. Full suite: 357 passed; browser click verified; production panels checked in English, German, Spanish, French, Japanese, and Russian.
- Equalize production: matches the v3 locked-slider and rounding behavior, with visible controls in both production panels.
- Continuous production: removed the one-hull-per-turn limit, retained production effort, and reused v3 AI hull selection after every completion. Full suite: 362 passed; all six language layouts checked; 250-turn observer completed without a crash (511 ships, 17 fleets, no winner).
- Hull selection: per-hull credit, switch/pause/resume, active build highlighting, and cleanup of superseded construction hulls. Full suite: 365 passed; actual browser switch/pause/resume clicks verified saved 99% colony credit; layouts checked in all six languages.
- Construction ETA: projected-production calculation follows `CStar::GetEstimatedTurnsToNextShip`, with system and retained construction-panel display.
- System/ship rename: added context and keyboard controls, Unicode input/deletion, and explicit localized Save/Cancel buttons. Full suite: 373 passed; real browser Unicode typing and Save clicks verified; localized dialog layouts inspected.
- Window chrome/interaction: opaque shared window styling, foreground control routing, and modal rename behavior prevent background text and hidden controls from interfering with dialogs.
- Default new-ship destination: visible target, localized Set/Clear buttons, map targeting and Escape cancellation, matching the v3 system panel workflow. Full suite: 382 passed; actual browser Set/map/Clear clicks verified; all six language layouts checked. Before/after captures preserve standalone ship, fleet, rendezvous and pulse scenes; system-panel changes are intentional.
- Ships in system: ported the v3 system-content visibility rules and ship/fleet inspection, with grouped members, sortable statistics, pagination and localized guidance. Full suite: 392 passed; actual browser opening/sort/page/selection clicks verified; all six language layouts inspected. Fleet constructors are cached to avoid repeated synchronous module fetches during rendering. Before/after captures preserve standalone ship, fleet, rendezvous and pulse scenes.
- New-colony defaults: added a command-menu editor for coupled 0–1000 allocations and all four hulls, with modal Save/Cancel/Escape behavior. Full suite: 402 passed; real browser edits, cancellation, save and neutral-colony inheritance verified; all six localized layouts inspected. Decimal formatting is verified against the native resource manager for every supported language. Before/after captures preserve map, ship, fleet and production scenes; localized system-table decimal changes are intentional. Cross-session preference storage remains a separate checklist item.
- Production dragging: added captured gestures in the system panel, production window and new-colony editor, following v3’s `HorzSlider::ClickSelf`/tracking behavior. Locks, bounds, release, Escape, stale-target cancellation and one production notification per gesture are covered. Full suite: 412 passed; real held-button updates and release verified on all three surfaces, including stationary camera and locked controls. All 55 shared before/after scenes were pixel-identical across the supported language layouts. Runtime allocation precision remains a separate economy-model gap.
- Economy precision/rate: verified `CStar` initial settings, `SettingT::AdjustValue` and slider equalization against v3. Runtime percentages now retain integer 0–1000 precision, initialize to 33.4/33.3/33.3, change upward by six points and downward by twenty-four, and share changes across unlocked neighbors. Full suite: 421 passed; browser dragging, locked values, exact new-colony inheritance and all six localized decimal layouts verified. Before/after captures preserve 24 unaffected scenes; production values and current/desired markers change intentionally. Deterministic 250-turn audits completed without a crash: before 422 ships/20 fleets, after 351 ships/18 fleets, both at the guard with all five players alive. Research/construction versus adjustment/growth ordering remains the next confirmed economy gap.
- Economy phase order: verified `CStar::EndOfTurn`; owned systems now repair, pay research/construction using current output, then adjust allocations, grow population and improve next-turn benefits. Unowned systems do not produce, zero-growth settings do not grow, and low ship/research benefits recover to the v3 minimum at turn end. Full suite: 428 passed. All six pre-turn screenshot pairs were identical; after-turn views correctly show the test scout at 53% instead of 71%, with translated layouts intact. The 250-turn observer completed without a crash before and after (351 ships/18 fleets versus 348 ships/28 fleets); both reached the guard with five players alive. Confirmed growth, research payment/threshold and exact-cost completion gaps remain explicitly listed.

- Research payments/advancement: verified `CStar::EndOfTurn` and both `IncreaseByPercent` overloads. Payments now use integer allocation units and whole credits; computer bonus increments truncate separately, including negative bonuses. Normal/fast thresholds are 1000/750 with strict greater-than checks, one advance per turn and retained excess. Drive discoveries are announced only for a newly reached player class. Full suite: 438 passed. All 24 pre-turn screenshot pairs and six ordinary milestone pairs were identical; boundary cases and localized lab/production layouts passed in all six languages. A repeated browser run passed after an intermittent French startup failure. Deterministic 250-turn audits completed without crashes before/after (348 ships/28 fleets versus 529 ships/33 fleets), both at the guard with all five players alive.

- Population growth: verified `CStar::GrowPopulation` and `SetPopulation`, including the distinction between actual population and the capped slider economy indicator. Corrected allocation scaling, restored the damped low-population curve, truncated the final population and removed the erroneous 99,900 colony cap. Full suite: 448 passed, including both density branches, equilibrium, negative growth, zero allocation and owned-empty recovery. All 18 pre-turn and six zero-growth screenshot pairs were identical; corrected population values fit the system panels in all six languages. Deterministic 250-turn audits completed without crashes before/after (529 ships/33 fleets versus 366 ships/23 fleets), both at the guard with five players alive.

- Construction completion boundary (historical; superseded by the inclusive completion correction below): verified the positive-effort guard and strict `paid > cost` loop in `CStar::EndOfTurn`. Exact-cost hulls remain unfinished at 100%, cannot move, and complete after another positive payment. Zero output does not consume banked over-cost credit; multiple production leaves the final exact-cost hull pending. Full suite: 456 passed. All six pre-turn screenshot pairs were identical; localized 100%/one-turn ETA views and subsequent commissioning passed in all six languages. The before/after 250-turn runs had identical final states (366 ships, 23 fleets, five players alive) and completed without crashes. Private construction representation and technology/cost semantics remain the next recorded build-progress gaps.

- System-only construction and commissioning: verified `CStar::SetBuildHullType`, cached `mCostOfNextShip`, `BuildNewShip` and the integer construction-percent display. Pending builds are plain system records, allocate no ship IDs, contribute no ships/scanners/defenses and cannot enter map selection or AI ship lists. Commissioning creates a completed ship with the current owner/technology; research or transferred technology does not reprice an already selected hull. Successive/resumed selections cache their current price. Full suite: 465 passed. Compared 36 before/after browser scenes across all six languages: initial construction stays at 99%, placeholders disappear, empty/docked ship lists remain functional, and the research fixture commissions tech 5 instead of tech 4. All localized layouts were inspected. Both 250-turn runs completed without crashes (before 366 registered ship entities/23 fleets, including unfinished hulls; after 409 completed ships/27 fleets), with five players alive at the guard.

- Ship diagnostics/repair feedback: verified `CbxNaPanel::UpdatePanel`, `GetSpeedString`, `CShip::GetDamagePercent`, selected-map health drawing and `RepairDamage`. Panels now show real/renamed names, class, integer tech/power/damage percent, health, scanner range, localized state/location and current destination. V3’s 16,380 speed divisor and zero-power courier damage convention are retained; decimals, labels, states and units are localized in all six languages. Enemy fields follow visibility thresholds and course lines remain ally-only (with the existing omniscient override). Native text references are reused across selection/repair changes. Full suite: 479 passed. Compared 54 before/after scenes across all six languages, including real Unicode rename clicks, repaired health, fleet membership and enemy visibility; inspected final panels and clipped names. A wider draft covered the selected marker, so the final 350-pixel panel preserves its visibility. One repeated-navigation run failed at French startup; final independent browser launches of every language passed. Before/after 250-turn audits were identical (409 ships, 27 fleets, five players alive), without crashes.

- Your Star Systems comparison: verified `CSystemInfoLine::SetStar`/double-click, `CStar::GetProduction`, total/non-satellite defense, and `CFleet::CalcFleetInfo` against v3. Added the command-menu table with all nine columns, bidirectional sorting, stable ties, paging, row highlighting, double-click/Enter navigation and live data. Production uses v3 integer combined benefits; defense includes docked allies, damaged satellites and mobile fleets without double counting, including the one-power minimum applied once per fleet. All six language resources and layouts are covered. Full suite: 498 passed. Compared 18 before/after browser scenes: all 12 shared ship/system views were identical; menus intentionally gained the new entry. Inspected six translated tables, paging, selected rows and empty state; real browser clicks verified all nine sorts in both directions, next/previous, double-click and Enter for every language. Before/after 250-turn audits were identical (409 ships, 27 fleets, five players alive), without crashes.

- System information/visibility: verified `CbxInPanel::UpdatePanel`/`UpdateShipCompletion`, `CStar::GetName` and `Waypoint::GetDescription`. Added localized grouped population, integer tech, current battleship drive class, coordinates and three defense totals. V3 visibility gates now apply to names, population, tech and hulls; enemy progress, allocations and destinations remain private even at Details. Allies can inspect production, destinations and docked ships without edit controls. Owner-side alliance checks match v3 for both panel visibility and contributing defenses. Read-only unknown sliders convey unavailable information; existing owned-system controls remain functional. Waypoint coordinates use v3 light-years (65,536 units), two decimal places and localized decimal separators across system, ship, fleet and rendezvous panels. Unicode titles and map labels fit without covering the system panel. Full suite: 513 passed. Compared 78 before/after screenshot pairs across all six languages; inspected final owned/neutral/enemy/allied/long-name layouts and verified real lock/unlock, pause/build, Set/Clear and ship-list clicks in every language. System-panel changes and ID-based unknown-name labels are intentional. Before/after 250-turn audits were identical (409 ships, 27 fleets, five players alive), without crashes. Event/list coordinate text in `Game` still uses the older display convention and will be addressed with event/list parity.

- Waypoint courses/editor: verified `CShip.cpp:703–781,850–1060`, `GalacticaPanels.cp:420–485,589–630` and `Waypoint::GetDescription`. Added shared ship/fleet courses, origin and active-index handling, Add/Edit/Delete/Clear, Loop, courier automatic looping, moving-object targets, one-leg-per-turn arrival and localized integer leg/remaining estimates. Human map orders append; legacy AI setters replace. Enemy routes/names remain private according to visibility. Fourteen new resources (726–739) are present in all six languages. Full suite: 544 passed. Compared 30 shared before/after browser scenes: all six system views were unchanged; course buttons and hiding enemy fleet routes are intentional changes. Real browser interactions passed in all six languages, including paging, cancellation and courier looping; inspected final translated and mixed-target layouts plus empty, picker, loop and paged states. Both 250-turn audits completed without crashes. Correcting the exact arrival boundary and per-turn fleet pursuit recalculation changed the seeded outcome from 409 ships/27 fleets to 389 ships/40 fleets, with five players alive in both. The source-confirmed target-first pursuit rule is explicitly tracked above; course memory, attention, Hunt, scrapping and other remaining checklist items are not claimed complete.

- Pursuit movement ordering: restored the source-confirmed destination-first rule from `CShip::EndOfTurn` and highest-container fallback from `AGalacticThingy::GetTopContainer`. Departure precedes target movement; eligible ship/fleet targets move before distance/arrival calculations. Actors are marked before recursion, so mutual pursuit and longer cycles terminate, every actor moves at most once, fleet members stay synchronized and removed pursuers cannot resume movement. Sixteen new regression tests include the real end-turn phase, chains, cycles, member/container targets, static targets, actor removal, departure ordering and next-turn reset. Full suite: 560 passed. Before/after browser checks passed in all six supported languages; 42 screenshot pairs compared, with 36 unchanged and only six pursuit-finish scenes intentionally changed. The regression formerly joined a fleet at its obsolete 40,000-unit position; now the target moves to 90,000 and the pursuer advances to 60,000 without joining it. Inspected English/Japanese before/after panels and markers; existing localized state/location text is reused without new resources. Seeded 250-turn audits completed without crashes, with five players alive in both: before 389 ships/40 fleets, after 364 ships/35 fleets. This behavior change is intentional; other arrival, course-memory and attention checklist work remains open.

- Course memory: verified `CShip::SwapCourseWithCourseMem`, `CourseT` flag/index copying and `CbxNaPanel` memory enable/refresh handling. Memory <M> now first copies the active ship/fleet course without changing its progress; subsequent uses swap the complete active and remembered courses. Coordinates are copied independently while live object targets keep their identity. Origin, current/previous indices, Loop and Hunt are preserved, and Clear retains memory. The initial copy omits Patrol; the player command cancels Patrol, then selects/reveals the active row as v3’s refreshed list does. Empty and read-only contexts cannot use Memory. Resource 740 is translated in all six languages. Sixteen regression tests cover copy/swap/clear/restore, flags, moving/removed targets, fleet recalculation, privacy, keyboard routing, stale edits and active-row paging. Full suite: 576 passed. Before/after browser comparison covered 108 shared scenes: 48 unchanged, with the other 60 intentionally gaining the Memory control. Real save, clear, keyboard restore, independent edit, swap/back and fleet-memory interactions passed in every language; inspected final translated controls, selected rows, empty remembered-course state and restored fleet layout. Both 250-turn audits were identical (364 ships, 35 fleets, five players alive) without crashes. Hunt controls, call-in/attention, Patrol integration and scrapping remain separate open items.

- Hunt control: verified `CShip::IsHunting`/`SetHunting`, `CbxNaPanel` enable/control-value handling and `CGalacticaDoc` H/h attachment. Added Hunt <H> for editable, plotted, movable ship/fleet courses with an active state indicator and resource 741 translated into all six languages. Loop, Memory and Hunt share a spaced mode row with room for Escape. Hunt preserves waypoint progress/looping and is retained by memory; Clear, final-waypoint deletion and completed courses reset it. The editor consumes disabled H presses without navigating home. Audited v3 stores this mode without autonomous seeking, so no new seek/intercept mechanics were invented. Ten regression tests cover state, enable rules, ownership, lifecycle, fleet behavior, keyboard routing, memory and localized layouts. Full suite: 586 passed. Before/after browser comparison covered 144 shared scenes: 36 unchanged, with 108 editor scenes intentionally showing the new mode-row layout. Real ship/fleet Hunt clicks, H toggling, memory restoration, clearing, zero-speed and read-only states passed in all six languages; inspected final translated controls and selected, restored, cleared and stationary layouts. Before/after 250-turn audits were identical (364 ships, 35 fleets, five players alive), without crashes. Call-in/attention, full Patrol integration, scrap and other open parity items remain.

- Inclusive hull completion: user-requested correction to v3 parity. Exactly 100% now commissions the ship immediately; multiple exact-cost hulls all complete, and saved fully funded hulls complete on selection or update without another positive payment. Below-cost construction remains private and excess effort carries to the next hull. ETA rounds up to the same inclusive boundary. Updated construction, satellite and cached-cost ETA regressions; added saved-credit and zero-output boundary tests. The isolated change passes all 588 tests; the working tree including pending Patrol work passes all 602. All six languages passed before/after browser checks (18 paired scenes), confirming a real docked ship and next-hull 0% at exact payment. Inspected translated system panels; no new strings were needed. The 250-turn audit completed without crashes with 364 ships, 35 fleets and five players alive.

- Patrol integration: verified `CbxNaPanel` docked/non-satellite enable rules and course clearing, `CFleet::SetPatrol` independent-member-course preservation, and `CShip::ShouldDraw` selected/idle-docked behavior. Human editor/context P now toggles eligible docked mobile ships/fleets, clears active Loop/Hunt/waypoints on enable while preserving memory, and yields to production only for system selection. New orders cancel Patrol; satellites retain mandatory Patrol. Fleets clear docking on departure, propagate Patrol only to members without independent courses, and show localized status. Hidden patrols and fleet-member ships cannot steal system map clicks; selected patrols remain visible. Fourteen regression tests cover these behaviors, privacy, six-language controls, docked attack/damage bonuses and repair exclusion. Full suite: 602 passed. All six languages passed focused native click/key workflows and the longer course/Memory/Hunt/Patrol workflow. Before/after comparison covered 180 shared scenes: 36 unchanged; the other 144 intentionally show the spaced editor command row or remove an invalid in-space Patrol action. Inspected translated course/fleet panels, selected/hidden markers, remembered-course preservation and satellite controls. Intermittent long-run headless Chrome capture/renderer stalls occurred during validation; focused workflows and a complete paired rerun passed in all six languages. Both 250-turn audits completed without crashes with identical 364 ships, 35 fleets and five players alive. Call-in/attention, scrapping and remaining parity items are still open.

- Human call-ins and attention navigation: verified `CShip::SetCallIn`/`FinishEndOfTurn`, initial `AGalacticThingy::mLastCallin(-5)`, the five-turn preference default, `CbxNaPanel` movable/control-state handling, and `GalacticaDoc` Tab/next-item/attended-subject/end-early paths. The course editor now has Call in <C> for completed independent movable human ships/fleets; manual requests recur until canceled without altering other orders. Completed non-looping courses, new mobile builds and idle-in-space subjects enter a per-turn queue. Idle calls start on the first eligible turn and repeat at five-turn intervals; active courses and computer/member/satellite objects are excluded. Tab, menu and map Next item select/center valid unhandled subjects; manual selection handles them, and empty controls consume clicks without advancing time or passing through to the map. Enter/End Turn confirms pending requests or presentations with Review, End anyway and Esc; queued presentations are preserved for review, and editing/dragging cannot advance the turn. Seven resources and updated shortcut/overlay help are localized in all six languages, with appropriate singular/plural prompt text (285 IDs per file). Twenty-four new regressions cover requests, timing, ownership, fleet behavior, navigation, modal/queued-presentation handling and localized controls. Full suite: 626 passed. Real browser click/C/Tab/Enter workflows passed in all six languages; compared 30 shared before/after scenes, intentionally changed by the new map/menu controls, editor mode row and accurate help text. Inspected translated active controls, pending/reviewed ship/fleet scenes, menu routes, singular/multiple confirmations and restored event overlays. The before/after 250-turn audits were identical (364 ships, 35 fleets, five players alive), without crashes. The broader attention queue remains partial: colony/satellite/message/enemy-move and other event subjects plus handled/selectable event rows are still to port.

- Last-turn event reports and event subjects: verified `GalacticaDoc.cp:872–909`, `CMessage::SetSubject`/`Select`, recipient filtering in `ShowMessages`, handled-row styling in `CEventTable`, and `CStar` build subjects. Reports now retain all entries from busy turns, filter by last completed turn and recipient/visibility, page chronologically and select live subjects or remembered locations. Selecting a row marks it reviewed and displays the complete narrative with independent Unicode-safe paging; Go to/Enter exposes the subject without advancing the turn. E and existing menu shortcuts remain available. Linked attention requests are handled by report review or subject selection. Completed satellite builds and new colony/capture subjects join the human attention queue; colony reports select the colonized star independently of the surviving colony ship. Five new resources are translated in all six languages (290 IDs each). Twenty-five new regressions cover report dates, privacy, live/lost subjects, linked requests, colony/satellite events, busy turns, native click routing, paging, Unicode, smaller-window layout, stale controls and keyboard shortcuts. Full suite: 651 passed. Real browser row clicks, report/detail paging, Enter, E/menu shortcuts, colony/satellite navigation and private-report filtering passed in all six languages. Compared 24 shared before/after scenes: all 12 system/ship views were unchanged; 12 report/empty-window views intentionally gained the new layout. Inspected translated report controls and narratives, colony/satellite selections, remembered locations, locationless notices and a smaller browser viewport. Before/after 250-turn audits were identical (364 ships, 35 fleets, five players alive), without crashes. Full v3 event-generation/narrative variants, illustrated replay and other message/enemy-move attention subjects remain explicitly incomplete.

- Ship and fleet scrapping: verified `CShip::SetScrap`/`Scrapped`/`EndOfTurn`, `CFleet::SetScrap`/`AddContent`/`EndOfTurn`, and `CbxShPanel` eligibility plus `CbxNaPanel` course/Memory/Patrol cancellation. Added reversible Scrap/Cancel controls in eligible ship/fleet inspectors and system-list rows, localized marked status, fleet-to-member propagation and attention handling. Turn processing refunds one quarter of each ship’s actual own-tech build cost to its top system before departure; space-contained fleet members can scrap without a refund. Fixed the existing refund helper’s incorrect cost arguments. Containment, spatial entries, selection and rendezvous references are cleaned, empty fleets disappear, and individual cancellation leaves surviving fleets valid. New courses, course memory and explicit Patrol cancel orders; inheriting an existing fleet Patrol preserves a marked incoming hull. Paused systems retain unassigned refund credit until the next selected hull; inclusive 100% commissioning remains intact. Five resources are translated in all six languages (295 IDs each). Twenty-seven regression tests cover costs/tech, timing, permissions, satellites, propagation, cancellation, pursuit-first fleet processing, saved credit, exact completion, cleanup, privacy and localized controls. Full suite: 678 passed. Real browser clicks for ship/list/fleet/member marking and cancellation, course/Patrol cancellation, turn refund/100% completion and space-member removal passed in all six languages. Compared 30 shared before/after scenes: six system views were unchanged; 24 ship/fleet/list scenes intentionally gained the new controls/action column. Inspected translated lists, marked status, ship/fleet panels, before/after table layouts and localized refund reports. Both 250-turn audits completed without crashes and were identical (364 ships, 35 fleets, five players alive). Section 4 estimates now reflect its current rows: implemented=100%, partial=50%, with N/A UI rows omitted (Functionality 95%, UI 89%); remaining arrival/role UI gaps are still listed.

- Requested visual polish beyond v3 parity: occasional deterministic star twinkles, bounded background parallax, blue-gray panel/button gradients and thin outlines, subtle controlled-system tint, 120 ms/2 pixel entrances and 85 ms exits. Menu/Home/Fit icons retain localized hover labels and shortcuts; colony defaults gains a gear beside its label. Browser reduced-motion preferences and native configuration disable motion. Full suite: 692 passed, including 14 new presentation regressions; all six native browser interaction runs passed and 48 before/after screenshot pairs showed the intended styling changes. Inspected translated menu layouts and actual opening/closing, twinkle, scrolling and reduced-motion frames. Both 250-turn audits matched (364 ships, 35 fleets, five players alive). Short map-draw samples ranged from 6.34–12.12 ms after versus 6.14–11.78 ms before, with run-to-run variation; these are smoke measurements, not a full performance benchmark. One extended headless screenshot run stalled at capture; fresh focused language and motion checks passed. General window/menu coverage remains partial. See VISUAL_STYLE.md for parameters and implementation.

- Allocation lock icon follow-up: replaced Lock/Unlock text buttons in the owned-system inspector and production window with open/closed vector padlocks indicating current state. Existing localized action labels remain hover hints; foreground window hints render above the active panel while background hints stay hidden. Click regions and lock rules are unchanged. Full suite: 692 passed. Real lock/unlock clicks and localized hints passed in all six languages; compared 24 before/after screenshots and inspected both icon states in system and production panels.

- Language settings: added a gear-marked Settings command with immediate language selection and current-language highlighting. Choices always read English, Deutsch, Español, Français, 日本語 and Русский regardless of UI language. Refreshed cached display strings; resource-driven text and retained inspector fields update on the next draw. Browser/native preferences remember the choice, explicit launch arguments override it, and blocked storage does not prevent switching. Modal input preserves the turn, selection and map; observer games can also open settings. Localized Settings/Language headings add IDs 759–760 (297 IDs per language). Existing proper names and already-generated narratives retain their original text. Full suite: 703 passed, including 11 new regressions. Actual browser clicks from all six starting languages to all six choices verified fixed autonyms, updated UI, active selection, unchanged game state, reload persistence and explicit override. Compared 12 shared before/after screenshots: six system views were identical; six menus intentionally gained Settings. Inspected translated native-script lists and switched inspectors. Other preferences and unported dialogs/help remain partial.

- Window transparency adjustment: lowered inspector opacity from 96% to 92% and dialog opacity from 100% to 96%, retaining full-strength text and controls. Full suite: 703 passed. Real browser controls passed in all six languages; compared 48 before/after views and inspected the small increase in background visibility for readability. No strings or game behavior changed.

- Identified enemy system tint: removed the human-control-only condition from panel coloring. Owned systems, allies, observed enemies and no-fog views now share the same 6% owner-color blend whenever the owner label can be shown. Unknown and unclaimed systems stay neutral. The tint and owner label share one visibility predicate. Three new regressions cover all visibility levels, loss of visibility, no-fog/neutral behavior, different owner styles and known alliances. Full suite: 706 passed. Real browser views passed in all six languages, with 42 paired screenshots: 18 owned/unknown/neutral views remained pixel-identical; 24 known/identified/detailed/no-fog enemy views gained the intended tint. Inspected translated enemy diagnostics and preserved hidden fields. No localization resources or simulation behavior changed.

- Computer-advantage setup: verified the +3,+2,+1,0,−1,−2,−3 menu mapping in `CGameSetupAttach.cpp:375–380` and 20% production/research/ship-effort modifiers in `CStar.cpp:483,551,636,681`. Added all seven clickable choices, current-value highlighting, A cycling, the resulting production rate and zero reset through R. Launch transfers the setting to AI players; humans and neutral owners remain unmodified. Added integer/range validation and responsive setup spacing/font sizes for shorter windows. Three strings are translated in all six languages (300 IDs each). Eight new regressions cover exact menu order, clicking/gaps, wraparound, layout, invalid values and every choice’s AI/human production behavior. Full suite: 714 passed. Real browser clicks across all seven choices, A wraparound, existing skill shortcut, reset and −3 launch passed in all six languages. Compared six before/after startup screenshots, with intentional layout/control additions; inspected default/+3/−3 states, all translated headings/hints and English/Russian smaller-window captures. Final layout checks repeated native clicks/keys/launch in English and Russian. Touched-section estimates now use their current checklist rows (implemented=100%, partial=50%, scaffold/missing=0%, N/A omitted): Section 1 66% functionality/46% UI; Section 7 100%/67%. Other setup options and lifecycle gaps remain listed.

- Owner-to-neutral inspector gradients: known-owner system panels retain their current tinted top color and now fade to the same neutral gray as unowned panels at the bottom. Retained ship panels share this owner treatment, including the construction renderer, while unknown-owner ships stay neutral until their owner label is visible. Added a shared owner-style lookup and kept both gradient endpoints at the existing 92% surface opacity. Three new regressions cover exact gradient endpoints/alpha, ship ownership visibility and safe neutral retained-panel fallback. Full suite: 717 passed. Real browser controls passed in all six languages; compared 48 before/after views and inspected system/ship gradients. A final English browser run also checked known/unknown enemy ships and an actual incomplete Ship in the construction renderer. No strings or game rules changed.

- Stellar-density setup: verified the numeric 1–10 Density Popup Menu (`Resources/gal-en-cdrom.r`, MENU 131) and count/scaling formula in `GalacticaProcessor.cpp:350–355`. Added all ten clickable choices, selection highlighting, D wraparound, R reset and integer validation; the selected density reaches actual map construction. Replaced five qualitative descriptions with one translated numeric density label (ID 764, 301 IDs per language). Maximum-density validation exposed duplicate ordinary/homeworld names and duplicate translated pool entries. Home reservations now share name-use accounting, pools are deduplicated, repeated names use the correct numeral index, and exhausted/repeated suffixes fall back to unique S-numbers. Eight new regressions cover selection/options isolation, cycling/gaps, invalid input, smaller layouts, the original formula across all ten values, maximum-density construction/homeworlds, reserved-name suffixes and translated pool duplicates. Full suite: 725 passed. Actual browser clicking of all ten choices, D wraparound, R reset, the existing AI-skill shortcut and density-10 launch passed in en/de/es/fr/ja/ru, with unique generated names. Compared six before/after setup screenshots and inspected all translated layouts, density-10 selection, a Japanese launched galaxy and a smaller Russian viewport. Evidence: `/private/tmp/galactica-parity/density-{before,after,small}`; test log `/private/tmp/galactica-density-tests.log`. Section 1 is now 69% functionality/50% UI by its current weighted checklist rows. Other setup/lifecycle and map-port requirements remain open.

- Requested icon refinement: replaced per-frame thin glyph lines with a reusable 2× offscreen image cache for Menu/Home/Fit/Gear/Lock/Unlock. Added two-pixel strokes, a broad-toothed gear and real cubic Bézier lock shackles. Filled stroke geometry avoids WebGL line-width limits; image variants account for state, size and color, source ports close immediately, and display disposal releases the cache. Full suite: 731 passed, including six cache/geometry/lifecycle regressions. All six language browser runs passed actual lock/unlock, settings and map actions, localized hints, cache identity stability and disposal. Compared 48 before/after screenshots; inspected improved icon states and translated panels. This is user-requested visual polish, without changing checklist completeness estimates.

- Sector-size setup: verified v3 Size Popup (MENU 140 in `Resources/gal-en-cdrom.r`) and `CGameSetupAttach.cpp:389–392`: 1×1 Tiny, 2×2 Small, 3×3 Average, 4×4 Large, 5×5 Huge. Added all five clickable dimension choices with current-value highlighting, S cycling/wraparound and R reset to the existing local default (5×5). Corrected the five localized size names and separated size/density headings; the taller setup scales to smaller viewports. Configuration now rejects non-integer/out-of-range sizes instead of silently converting zero to one. Six new regressions cover choices/forwarding/options isolation, cycling/gaps, invalid input, control separation/layout, square-area scaling across all five values and actual generation/homeworlds/coordinate bounds. Full suite: 737 passed. Browser clicking of every size, S wraparound, R reset, the existing AI-skill shortcut and 3×3 launch with correct drawing dimensions and in-bounds stars passed in all six languages. Compared six before/after setup screenshots; inspected all translated labels, 1×1/5×5 states and a smaller Russian viewport. Evidence: `/private/tmp/galactica-parity/size-{before,after,small}` and `/private/tmp/galactica-size-tests.log`. Section 1 is now 69% functionality/54% UI by its current weighted rows; other setup/lifecycle and map-port gaps remain listed.

- Requested departure from v3 chart naming: yellow named stars now show real chart labels through fog. Undiscovered enemy homeworlds receive deterministic, plausible aliases drawn from localized star-name/numeral resources, excluding real labels and other aliases. Map, inspector and destination references use these aliases; comparison player/faction names deliberately retain their real homeworld-derived names so the comparison cannot identify an undiscovered homeworld on the map. First successful detection reveals the real name, retained through last-seen history when scanners leave. Owned/allied/no-fog/observer views use real names; ownership/economy visibility is unchanged. Simulation names and RNG are untouched. Full suite: 748 passed, with 11 regressions including actual spatial scanner entry/exit, viewer-specific history, alias stability/order, language switching and exhausted pools. Actual browser chart/inspector/detection/history/no-fog/comparison checks passed in all six languages; compared 42 before/after screenshots and inspected English/Japanese/Russian labels. Evidence: `/private/tmp/galactica-parity/chart-{before,after}` and `/private/tmp/galactica-chart-tests.log`. The star-name toggle remains a separate gap.

- Compare Players is now a localized command-menu item (V shortcut retained), removed from object actions and the map button grid. The menu also offers comparison in observer games. Full suite: 749 passed; native browser menu clicking opened comparison successfully and the menu layout was visually inspected.

- Requested shared window chrome: setup, comparison, settings, options and all neutral runtime panels now share gray gradient/outline styling without a color bias. The top information panel shares that styling while retaining its previous opacity. Known-owner system/ship outlines gain a restrained 20% owner-color blend; their 6% tinted tops still fade to neutral gray and hidden owners remain neutral. Added three presentation regressions; full suite: 752 passed. Native UI checks and 84 paired screenshots cover all six languages. No simulation or localization resource changes. Evidence: `/private/tmp/galactica-parity/neutral-{before,after}` and `/private/tmp/galactica-neutral-tests.log`.

- Requested visible-star twinkle refinement: one currently onscreen star glints for 320 ms every 1.8 seconds, replacing the barely visible 800 ms/21-second eligibility scheme. Brighter short rays and a soft halo make the quick peak visible. Candidate selection refreshes on scrolling, remains deterministic without game RNG and honors reduced motion. Full suite: 754 passed, covering cadence, sparse views, draw order, viewport filtering and scrolling. Actual browser pulse/scroll/reduced-motion checks cover all six languages; English before/after frames were visually inspected. No strings or simulation changes. Evidence: `/private/tmp/galactica-parity/twinkle-{before,after}`.

- Rendezvous visibility and placement: fixed the native map-target predicate so empty-space clicks create/move rendezvous points instead of starting a camera drag. Star/ship popup actions now enter placement mode, matching the permanent map button and U shortcut. Markers use three-pixel filled strokes with rounded ends, an owner-to-pale-to-owner 2.2-second pulse and at least 85% opacity, and remain visible at wide zoom. Private ownership and reduced motion are preserved. Existing localized placement instructions cover all six languages. Full suite: 757 passed; actual browser creation/movement, popup placement, Escape cancellation and pulse frames passed in all six languages. Inspected before/after marker views and wide zoom. Evidence: `/private/tmp/galactica-parity/rendezvous-{before,after}`.

- Neutral window gradient contrast: increased the top lift from +0.022 to +0.075 RGB so comparison, settings, setup and other ownerless windows visibly shade from a lighter top to the neutral gray bottom. Owned-panel color styling and surface opacity are retained. Full suite: 757 passed; native controls and translated layouts checked in all six languages, with English before/after neutral-window/setup screenshots inspected. Evidence: `/private/tmp/galactica-parity/gradient-contrast-{before,after}`.

- Content-sized buttons: measure localized labels/shortcuts at their actual font size, with padding and shared rendering/hit regions. Map columns expand and can fall back to one column; popup arcs expand with correct connectors. Fleet-row controls, ship headers/scrap states and wrapped course controls also account for translated text, with course-window height and page size adjusted for extra rows. Full suite: 762 passed. Browser checks found no button text overflow in the covered views in any supported language; compared before/after screenshots and inspected Russian map/popup and German course layouts. Evidence: `/private/tmp/galactica-parity/buttons-{before,after}`.

- Requested continuous map animation: rendezvous color cycles now take 4.4 seconds and blend at most 50% toward pure white. All stars gently vary their actual radial-gradient brightness by ±10% around a 90% baseline, using independent ID-derived 4.8–9.6-second periods/phases; quick glints remain separate. Hue, owner halos, labels and game RNG are preserved; reduced motion restores static original colors. Full suite: 766 passed, with four new presentation regressions plus updated rendezvous peak/timing coverage. Native animation/placement/movement/cancellation/reduced-motion checks and before/after frames passed in all six languages. Evidence: `/private/tmp/galactica-parity/star-motion-{before,after}`.

- Requested compact icon controls: Menu/Home/Fit share a 44×30-pixel row with six-pixel gaps, separate from measured text controls. Allocation lock/unlock backgrounds shrink to 26×18 pixels in an aligned column. Localized hints and keyboard shortcuts are retained, and hit rectangles follow the smaller controls. Full suite: 766 passed. Native clicks, translated hints, text-fit checks and before/after screenshots cover all six languages. Evidence: `/private/tmp/galactica-parity/compact-icons-{before,after}`.

- Requested background refinement: parallax scrolling now has a constant rate scaled by zoom above the camera minimum, reaching zero at full zoom out. Dim unnamed decorative stars fill space outside the playable rectangle, independently of simulation objects, RNG and visibility rules. Full suite: 767 passed; browser zoom/scroll/reduced-motion checks and before/after screenshots cover all six languages. Evidence: `/private/tmp/galactica-parity/parallax-{before,after}`.

- Allocation slider correction: solid fill shows actual output; the vertical marker shows the requested target. Native track clicks set the target without changing actual output, in both the system panel and production window. Full suite: 769 passed; native interactions and before/after views checked in all six languages. Evidence: `/private/tmp/galactica-parity/slider-{before,after}`.

- Grid visibility parity: verified default-on `mDrawGrid`, `ShowGridlines` preference loading and the F3 handler in v3 `GalacticaDoc.cp`, plus the rendering gate in `GalacticaPanes.cp`. Added a localized Settings toggle, F3 handler and browser/native preference adapter with safe default-on behavior when storage is unavailable. Full suite: 771 passed. Native settings clicks, F3, new-game persistence and translated before/after screenshots passed in all six languages. Evidence: `/private/tmp/galactica-parity/grid-{before,after}` and `/private/tmp/galactica-grid-tests.log`. Other map toggles, display modes and preferences remain open.

- Map-name visibility parity: checked v3 default-on `mDrawNames`, preference loading, F2 handler, `ANamedThingy::InternalDrawSelf` and `CShip::DrawSelf`. The shared v3 flag applies to all map labels, so Settings → Show map names/F2 now gates stars, ships, fleets and rendezvous labels and persists independently of grid visibility. Restored ship/fleet map labels: hidden below half zoom, suppressed for unselected docked objects, and private until Class visibility (or allied/omniscient). User-requested yellow-star fog aliases and comparison real names are retained; diagnostic/order/list names remain available. Full suite: 774 passed. Native toggle/F2/new-game checks and translated before/after map/settings screenshots passed in all six languages. Evidence: `/private/tmp/galactica-parity/names-{before,after}` and `/private/tmp/galactica-names-tests.log`.

- Ship visibility parity: verified default-on `mDrawShips`, preference loading, F1 in `GalacticaDoc.cp` and `CShip::ShouldDraw` (fog check precedes selected exception, followed by the preference and patrol gates). Added persistent localized Show ships/F1, shared ship/fleet rendering eligibility and matching mobile hit filters. Full suite: 777 passed. Tests cover selected/fog/patrol behavior, hidden ship/fleet hit regions, retained object collections and independent preferences. Native settings/F1, selected ship/fleet views, new-game persistence and translated screenshots passed in all six languages. Evidence: `/private/tmp/galactica-parity/ships-{before,after}` and `/private/tmp/galactica-ships-tests.log`. Other map toggles/display overlays remain open.

- Course visibility parity: verified `mShowAllCourses`/`mDrawCourierCourses` defaults and preferences, F4/F5 in v3 `GalacticaDoc.cp`, and `CShip::DrawSelf`'s independent looping-scout gate plus selected/allied exceptions. Added localized persistent ordinary/courier controls without changing navigation. Full suite: 780 passed; tests cover ordinary/courier independence, selected exceptions, enemy-route privacy, Settings/key routing and separate preferences. Native controls, F4/F5, new-game persistence and translated route/settings screenshots passed in all six languages. Evidence: `/private/tmp/galactica-parity/courses-{before,after}` and `/private/tmp/galactica-courses-tests.log`.

- Scanner display parity: audited `GalacticaPanes.cp` influence unions, `CStar::DrawSphereOfInfluence`/`DrawSelf`, `CShip::ShouldDraw`/`DrawSelf`, and default/preferences/F6 in `GalacticaDoc.cp`. Added three system influence bands, selected-system/mobile 1×/2×/4× rings and the ordinary-versus-looping mobile gate, with persistent localized F6 control. Per-owner opaque offscreen masks union overlapping systems before tinting once per band, cache unchanged geometry and dispose on replacement/hiding/display teardown. V4 uses transparent tint compositing in place of QuickDraw addMax; union/radius behavior is retained. System coverage requires Tech knowledge; as in v3, visible enemy mobile scanners can show rings while invisible ones cannot. Full suite: 783 passed. Native controls, selected exceptions, system knowledge thresholds, caching, persistence and translated screenshots passed in all six languages. Evidence: `/private/tmp/galactica-parity/scanners-{before,after}` and `/private/tmp/galactica-scanners-tests.log`.

- Fullscreen command: browser DOM fullscreen tracks actual state, survives external exits and reports rejected requests with localized retry feedback. Fullscreen uses a centered 4:3 canvas so larger viewports retain graphics proportions and accurate input coordinates. Full suite: 788 passed against both the release runtime and rebuilt engine. Native PDG port/fullscreen specs: 60 tests, 416 assertions, zero failures; the connected-monitor transition is explicitly deferred. Browser before/after and wide-screen screenshots plus native clicks passed in every language. Evidence: `/private/tmp/galactica-parity/fullscreen-{before,after}`, `/private/tmp/galactica-fullscreen-tests.log`, `/private/tmp/pdg-fullscreen-port-tests.log`. Review needed: native fullscreen entry/exit on a monitor-equipped Mac; include the engine fix in a future public runtime bundle before considering native parity complete.

- Map display modes: audited `GalacticaConsts.h` mode IDs, `GalacticaPanes.cp` commands, `AGalacticThingyUI::GetBrightness`, `CStar::GetBrightness`/`GetSpending`, `CShip::GetBrightness`, `GalacticaDoc::RecalcHighestValues` and `CalcBrightnessFromRange`. Implemented owner/production/tech/defense/growth/shipbuilding/research with system-based brightness normalization, target economic settings and docked defense. Privacy gating follows current v4 diagnostic knowledge: Tech for technology, Details for defense, allied/omniscient for private economy. This prevents the full local world model from leaking unknown values into the scale. Guarded the v3 divide-by-zero equal-range case. Existing ownership visuals are retained; the English before/after ownership image matches exactly. Browser clicks, modal handling, legends, selected mode, all translations and smaller CSS viewport passed; full suite: 795 passed against both runtimes. Evidence: `/private/tmp/galactica-parity/map-display-{before,after}`, `/private/tmp/galactica-map-display-tests.log`, `/private/tmp/galactica-map-display-native-tests.log`. Danger is confirmed dormant in shipped source, not a missing working overlay.

- Nebula preference: audited `GALACTICA_PREF_SHOW_NEBULA`, default/load and `GalacticaDoc::UpdateFromPrefs`, plus `CStarMapView::DrawSelf` black fallback and background-dependent influence brightness. Added localized default-on persistent control, black clearing while disabled and dynamic influence opacity without replacing cached masks. Targeted and full tests pass: 799 tests on release and current native runtimes. Native browser clicks, on/off state, unchanged game/camera, image/mask reuse, new-game persistence and translated settings/screenshots passed in all six languages; English also passed full page reload. All enabled-background before/after map images match exactly. Evidence: `/private/tmp/galactica-parity/nebula-{before,after}` and `/private/tmp/galactica-nebula-{tests,native-tests}.log`.

- Camera command UI: audited `GalacticaDoc.cp` key attachments (zero/keypad star fit, Home navigation, +/- zoom) and home selection/centering. Added compact cached zoom icons and localized View chooser; H now toggles Hunt for an eligible selected ship/fleet. Reset remains explicit and F fit remains an alias. Fixed modal Enter/Tab handling while preserving rename/default Return saves. Full suite: 803 passed on both release and current native PDG runtimes. Actual browser clicks, zoom round trip, fit, Home and modal Enter/Tab passed in all six languages. Inspected before/after map/menu images and every translated View dialog; removed Home text overlap on the compact house icon, retaining the shortcut hint. Evidence: `/private/tmp/galactica-parity/camera-{before,after}` and `/private/tmp/galactica-camera-{tests,native-tests}.log`. Section 2 estimates now reflect current rows, excluding dormant v3 features: full=1, partial=0.5. Scroll bars, enemy move replay and broader map selection parity remain open.

- Map pan/scroll UI: audited `CStarMapView::SetSectorSize` image extent and `Click` Option-drag behavior in `GalacticaPanes.cp`. Added both scroll bars with proportional thumbs, captured dragging, bounded steps/pages and held-button repeat; ordinary map dragging remains unbounded. Bars use the actual camera inverse viewport, update after pan/zoom/resize, and disable only axes whose complete sector extent fits (content-aware Fit can still leave a small scroll range). Added Option/Alt-drag over objects without selection/orders and localized its help. Browser pointer capture and external-release forwarding recover GLFW’s canvas-only mouse-up path, including re-entry with buttons released and blur. Screenshot review also fixed clamped offscreen context arcs covering the inspector; selection remains intact. Full suite: 815 passed on release/current native runtimes. Actual thumb/arrow/held input, Alt-drag, outside release, fitted-state and modal checks passed in all six languages; before/after map, translated hint and smaller CSS viewport screenshots inspected. Evidence: `/private/tmp/galactica-parity/scrollbars-{before,after}`, `/private/tmp/galactica-scrollbars-{tests,native-tests}.log`. Section 2 is now 86% functionality/UI by the current weighted rows; enemy-move replay and broader map selection auditing remain open.

- Map selection/overlap chooser: audited `CStarMapView::Click` and `ResolveOverlappingPanesFromPoint` (10-pixel nearby list, visibility/dead/member/satellite filtering, cancel and awaiting-target handling), plus v3 name/class and course/scrap indications. Shared marker geometry fixes fixed dock offsets and fleet hit radius; hit eligibility now matches omitted zoom levels and drawing. Added a six-row paged chooser with cached 2× object icons, numbered choices, full-name hover hints and allied-only status. Unknown mobile names stay generic. Cancel preserves pending default/waypoint/rendezvous commands; right-click respects an awaiting target. Fixed actual UI precedence between pending waypoint editing and chooser clicks, and suppressed placement hints above the modal. Full suite: 830 passed on release/current native runtimes. Native browser clicks, orders, cancel/retry, waypoint replacement, rendezvous anchoring, paging, Control-click, scaled docking, hidden low-zoom hits, large fleet edges and smaller CSS views passed in all six languages. Inspected translated chooser, before/after, paging and target screenshots; every ordinary system baseline is pixel-identical. Evidence: `/private/tmp/galactica-parity/selection-{before,after}` and `/private/tmp/galactica-selection-{tests,native-tests}.log`. Separate fleet privacy/health gaps are explicitly open in Section 5; map replay/native fullscreen and the other checklist items remain.

- Fleet information privacy: audited `CShip::GetName`, the v3 ship-info panel in `GalacticaPanels.cp` (Speed/Tech/Class thresholds), and its fleet-contents panel (Class promotes fleet contents to Details). Centralized fleet knowledge drives title/statistics, composition/members, marker count/geometry, selection connectors and comparison count; enemy destinations stay private. Fleet speed now uses the same localized drive-speed units as the ship inspector instead of raw internal units. Known fleet panels receive the owner gradient/border already used by ship panels, while unknown owners stay neutral. Member names follow individual visibility. All six languages reuse existing resources and measure translated label widths. Six new behavioral tests; full suite 836 passed on both release/current native PDG. Actual browser mouse selection and Speed/Tech/Class/owned views passed in all six languages. Inspected before/after and localized screenshots under `/private/tmp/galactica-parity/fleet-{before,after}`; logs `/private/tmp/galactica-fleet-privacy-{tests,native-tests}.log`. Health rows, full member access and exchange-window depth remain open, as do the rest of the parity and Map Generation checklists.

- Fleet member health/full access: audited v3 `CShipTable` member health and technology/speed/power display plus `CFleetTable` contents selection. Added visibility-safe member diagnostics, measured Unicode names, live health percentages/bars and translated paging through the complete flat fleet list. Page size follows logical screen height; panels fit below the top status bar. Later-page select/remove/transfer use actual hit testing; page and member actions validate the selected fleet and current visible members, paging resets on changed selection and clamps after removals/resize/visibility changes. Eight new tests; full suite 844 passed on release/current native PDG. Actual browser selection, all pages, later-page remove/transfer/selection, final-page contraction, unknown enemy member rows, read-only paging and smaller CSS views passed in en/de/es/fr/ja/ru. Final translated captures and before/after comparison inspected under `/private/tmp/galactica-parity/members-{before,after}`; logs `/private/tmp/galactica-fleet-members-{tests,native-tests}.log`. The v3 audit also confirmed nested groups (`CFleet::AddContent` accepts a containing fleet with cycle protection, and `CFleetTable` presents its contents). V4 has flat merge/member storage and lacks the corresponding nested-group model/selection UI. The fleet contents functionality status is corrected to Partial; Section 5 functionality is now 90% rather than claiming group parity. Nested groups/exchange-window depth, fleet roster sorting and the other checklist gaps remain active work, not blockers.

- Explicit fleet transfer destinations: audited v3 `CbxShPanel::DoPanelButton('bExg')` and its selected active destination/list workflow. V4 previously used the first nearby fleet, and the transfer method could move a ship between unrelated locations. Added a named destination chooser whenever multiple eligible fleets exist, reusing the established paged/numbered modal; cancel preserves membership and events, and the source selection remains. Destination eligibility is independent of map-mobile visibility. Every transfer rechecks registered source/destination, source membership, ownership, alive/completed ship and matching locations before mutation/events; stale moved/removed/foreign/empty targets fail. Eight new tests; full suite 852 passed on release/current native PDG. Actual browser mouse source/member selection, Enter/Tab blocking, Escape cancel/retry, hidden map mobiles, page-two choice, correct destination membership and moved-target rejection passed in all six languages, with smaller CSS captures. Inspected localized heading/list and before/after screenshots under `/private/tmp/galactica-parity/targets-{before,after}`; ordinary source views are pixel-identical in all six languages. Logs `/private/tmp/galactica-fleet-targets-{tests,native-tests}.log`. This completes destination choice for flat member transfers; shared-container main/sub-list exchange, new/nested groups and other parity items remain active work.

- Nested fleet groups: audited v3 `CFleet::AddContent` cycle protection/preserved containers, recursive `CalcFleetInfo`, `CFleetTable` sublist selection and `CShipCompMove` parent-fleet AI control. Added nested containers rather than flattening groups, localized Group/Parent controls, recursive statistics/positions and whole-group transfer/removal/departure. Root-only repair/defense candidates prevent double counting; descendant combat and empty ancestor cleanup retain runtime consistency. Nested technology delivery resolves the ancestral docked star; contained AI groups do not make independent decisions. Fourteen new tests; full suites 866 passed on release/current native PDG. Final native browser creation, nested navigation, member and whole-group transfer, order placement/departure, enemy privacy and smaller CSS views passed in en/de/es/fr/ja/ru. Inspected translated controls, before/after root views, nested/transferred/departed and read-only enemy captures under `/private/tmp/galactica-parity/groups-{before,after}`. Fleet contents now implements groups; Section 5 is 95% functionality/83% UI. Full shared-container exchange-window workflow, standalone new-fleet creation UI, roster sorting and the other checklist gaps remain active work.

- Shared-container fleet exchange: verified v3 `CbxShPanel::DoPanelButton(bExg)`, `UpdateButtons` and `CFleetTable::SelectCell`. Added the persistent active destination/main-list/sub-list workflow, transfer in both directions, creation when no destination is active, and whole-group moves without flattening. New fleet retains the selected main member so an existing group can be wrapped; group inspection and Parent navigate enclosing containers. Two paged lists use visibility-safe diagnostics and localized sorting, health, patrol, scrap and close controls. Stale removed/moved destinations invalidate selection rather than silently forming another fleet; unregistered source references are filtered. Eleven new tests; full suites 877 passed on release/current native PDG. Final native browser exchanges, new top-level/nested fleets, intact group wrapping, nested/system navigation, patrol/scrap, sorting/paging, modal Enter/Tab and smaller CSS views passed in en/de/es/fr/ja/ru. Before/after context views intentionally add Exchange ships; translated destination/list/control screenshots inspected under `/private/tmp/galactica-parity/exchange-{before,after}`. Section 5 UI is now 94%; roster sorting/polish and the other parity/Map Generation items remain open.

- Fleet roster contents/sorting: audited v3 `ShowFleetsWindow`, `SortFleetsByColumn` and `CFleetInfoLine::SetShip`/double-click behavior. Added standalone owned ships and all eight shipped fields; excluded nested/contained members, dead/foreign units and docked satellites. Retained private rendezvous rows, corrected their light-year coordinates and identified row types with cached 2× icons. Added live numeric sorting with v3 initial directions and colony/destination ranking, complete viewport paging, selection/centering and double-click inspection, measured localized columns and compact logical-screen headers. Sort preferences use native configuration/browser storage and survive corrupt or unavailable values. Twelve new regressions; full suites 889 passed on release/current native PDG. Final actual browser sorting/reversal, colony ranking, paging, later-row selection, modal Enter/Tab, Escape, double-click inspection and new-game preference restoration passed in en/de/es/fr/ja/ru. Inspected translated and before/after captures under `/private/tmp/galactica-parity/roster-{before,after}`; ordinary map views are pixel-identical in all six languages. Section 5 functionality is now 100%; UI remains 94% because the source audit also confirmed saved roster window position/height, which is still active work under Preferences. Other parity and Map Generation gaps remain.

- Roster window geometry: audited v3 `ShowFleetsWindow` restore, `CloseFleetsWindow` scroll retention and `AllowSubRemoval` position/height persistence. Added title-bar movement and corner height resizing with captured native pointer input, safe viewport/minimum bounds, complete resize-aware paging and a localized grip/title hint. Native/browser preferences validate geometry and retain user bounds while smaller viewports temporarily clamp rendering. Closing records default bounds; release records changed bounds. Escape stops a capture first; viewport changes and window switches stop stale motion, while non-left input cannot pan/order through the modal. Eleven new regressions; full suites 900 passed on release/current native PDG. Actual browser move/resize, paging, reopen, modal middle/right input, Escape and release outside the canvas passed in en/de/es/fr/ja/ru. The initial restoration harness called the guarded start function and retained the same game; corrected it to reload the app, prove fixture removal and restore both geometry and sort from storage in a fresh game. Final translated moved/resized/restored/recovered and before/after captures inspected under `/private/tmp/galactica-parity/geometry-{before,after}`; ordinary map views are pixel-identical. Section 5 now reaches 100% functionality/UI for its listed fleet/rendezvous items. System comparison preferences and the remaining parity/Map Generation checklist items are still open.

- System comparison sort preferences: audited v3 `SortSystemsByColumn`, `EShipClass`, saved `mSystemsSortColumn` and `GALACTICA_PREF_SYS_WIND_SORTBY`. Numeric columns now start highest first; construction sorts by hull class including battleship technology rather than translated name. V4 retains reversible sorting and its paused/None row extension. System column/direction persist independently of fleet preferences in native configuration/browser storage, with invalid/unavailable storage fallback. Three regressions; full suites 903 passed on release/current native PDG. Actual browser header clicks/reversal and full-page reload restoration passed in all six languages; fixture removal proves a new game. Inspected before/after and translated captures under `/private/tmp/galactica-parity/system-sort-{before,after}`. Window position/height remains the next comparison preference item; remaining parity and Map Generation work stays open.

- System comparison geometry: audited v3 `ShowSystemsWindow`, `CloseSystemsWindow` and `AllowSubRemoval` for saved height/position, in-session scroll retention and disabled map commands. Shared the roster title/corner capture and localized grip hint; added independent system bounds, viewport/minimum limits, fixed preferred height through empty/short pages, retained valid page on reopen, close button and modal keyboard/pointer guards. Default/changed bounds save on close, release, switching and Enter inspection; saved preferences survive fresh browser/native startup. Six new regressions; full suites 909 passed on release/current native PDG. Actual browser move/resize, paging, reopen, fresh-page geometry/sort restoration, non-left modal input, Escape and outside-canvas release passed in en/de/es/fr/ja/ru. Inspected before/after translated and smaller/restored screenshots under `/private/tmp/galactica-parity/system-geometry-{before,after}`; ordinary map views are pixel-identical in all six languages. Existing roster browser geometry regression also passed. Comparison preferences are now implemented; fullscreen startup, sound/game preferences and the remaining parity/Map Generation checklist items remain open.

- Compare Players: audited v3 `GalacticaDoc::DoComparePlayers`, `CSummaryLine::SetSummary`, `GalacticaShared::GetPlayerNameAndStatus`, `CStar::GetPopulation` and commissioning through `BuildNewShip`. Added all eleven numeric fields, unowned systems, owner dots, live asset-derived defeated rows, italic unknown names, integer technology averages, system population units, combined production and raw completed ship power. Nested fleets count their ships once; satellites are included and dead/unfinished ships excluded. Best/worst colors use only living players with corresponding assets, blue precedence for tied best values, and raw production hundredths before formatting. Grouped translated technology headers, measured names/full hover text, subtle alternating stripes, complete paging and modal keyboard/pointer input retain the real enemy homeworld names under fog. Ten new regressions; full suites 919 passed on release/current native PDG. Actual browser menu/paging, map-input isolation, Close/V/Escape and smaller CSS views passed in all six languages; inspected before/after and translated screenshots under `/private/tmp/galactica-parity/player-comparison-{before,after}`. Ordinary map scenes are pixel-identical in every language. Resources now total 356 IDs per language. Section 8 current-table estimates are 53% functionality/47% UI (implemented=1, partial=0.5, missing=0 across its 17 rows). The remaining parity and Map Generation checklist items stay open.

- New-game player name: audited v3 `GalacticaApp::GetLogin`/`DoNewGame`, `GalacticaSingleDoc::DoNewGame`, default-name preference updates and `MAX_PLAYER_NAME_LEN` (32). Added the post-setup name dialog with selected remembered/default name, measured input/caret viewport, Unicode code-point editing, spaces, Home/End/arrows/deletion, blank validation and Start/Cancel controls. Added clickable setup Start; Cancel/Escape returns without creating a game or changing selected map options. Accepted human names initialize players and survive map generation; zero-human autoplay retains its direct launch. Remembered names use native configuration/browser storage with corrupt/unavailable fallback. Nine regressions; full suites 928 passed on release/current native PDG. Real browser Start/Enter, Cancel/Escape, blank rejection, six native-language names, generated game/comparison display and full-page preference restoration passed in en/de/es/fr/ja/ru. Inspected before/after setup and translated typed/remembered/error/comparison/smaller screenshots under `/private/tmp/galactica-parity/player-name-{before,after}`. Resources now total 359 IDs per language. Game-title editing, remaining setup/lifecycle parity and the Map Generation checklist remain active work.

- Game-title setup: verified `CGameSetupAttach.cpp:344` copies the setup title into new-game metadata and `GalacticaConsts.h:57` defines a 27-character maximum. Added clickable title/T editing, selected Unicode drafts, Save/Enter and Cancel/Escape, blank validation and independent title/name limits. Accepted titles reach game configuration and a measured header that fits long native-script titles. Six regressions; full suites: 934 passed on release/current native PDG. Browser clicks/keys, blank validation, six localized titles, cancellation, maximum length, generated-game metadata/header and smaller layouts passed in en/de/es/fr/ja/ru. Inspected before/after setup and translated editor/header captures under `/private/tmp/galactica-parity/game-title-{before,after}`; existing player-name dialog screenshots are pixel-identical in all six languages. Resources: 363 IDs per language. Section 1 UI is now 58% by its weighted checklist rows; save/hosting title use, remaining setup/lifecycle parity and the Map Generation checklist remain open.

- Single-player opponent count: audited `CGameSetupAttach.cpp:349–367` (one human when the pane is absent, zero computers permitted), `MAX_PLAYERS_CONNECTED` = 99 in `GalacticaConsts.h:53`, and solo-victory suppression in `GalacticaSingleDoc.cp:1216–1218`. Replaced five-opponent cycling with a clickable count/C editor, selected draft, 0–98 bounds, localized validation, Save/Enter and Cancel/Escape; +/− step within bounds. Removed the incorrect two-player configuration minimum while retaining rejection of empty games and enforcing integer counts. Seven regressions exercise the full range, solo turns, twelve opponents and a generated 99-player map with every homeworld. Full suites: 941 passed on release/current native PDG. All six browser flows passed, including invalid input, cancel, boundary steps, actual twelve-opponent/solo launches and solo advancement. Inspected translated before/after setup, editors, errors, smaller layouts and generated games under `/private/tmp/galactica-parity/opponents-{before,after}`. Resources: 366 IDs per language. Human-slot multiplayer setup, remaining lifecycle/UI parity and the Map Generation checklist remain open; the combined player-count row stays partial.

- Shared AI-skill setup: audited the v3 single `LStdPopupMenu` member in `CGameSetupAttach.h:34`, attachment at `CGameSetupAttach.cpp:85`, and shared `NewGameInfoT.compSkill` transfer at lines 370–374; the resource menu lists Expert, Good, Average, Passable, Novice in that order. Corrected the unsupported checklist claim that v3 new-game setup requires per-player skill controls. Added a clickable five-choice popup with current-value highlighting, choice acceptance, Cancel/Escape/outside-click, number shortcuts and modal input isolation. Tightened explicit shared/harness skill validation while preserving absent-option defaults and harness overrides. Six regressions; full suites: 947 passed on release/current native PDG. Every choice, cancellation path, number shortcuts, R reset, modal isolation, launched AI values and smaller layouts passed in all six browser languages. Inspected translated popup/smaller captures and before/after setup under `/private/tmp/galactica-parity/skill-{before,after}`. No new resources (366 IDs per language). Section 1 UI is now 62% by its weighted checklist rows; remaining setup/lifecycle and Map Generation requirements remain open.

- Fast Game setup checkbox: audited `CGameSetupAttach.cpp:393–405` mapping checkbox state to `NewGameInfoT.fastGame`. Added a clickable native-style check mark and active state using translated label 505, retaining the F shortcut and R reset. Separated the fog description with measured font fitting; other setup settings stay unchanged. Added strict boolean validation and five regressions for state/isolation, invalid values, positive doubled scan/speed/building rules, smaller control separation and six-language labels. Full suites: 952 passed on release/current native PDG. Browser click/F/reset, count/title/skill/name modal isolation, accepted launch rules and smaller checked/unchecked states passed in en/de/es/fr/ja/ru. Inspected all translated before/after setup, checked states and smaller captures under `/private/tmp/galactica-parity/fast-{before,after}`. Visual review added a gap below density controls; final checks repeated. No new resources (366 IDs per language). Section 1 UI is now 65%; the fog setup control, broader setup/lifecycle parity and Map Generation checklist remain open.

- Fog of War setup checkbox: audited `CGameSetupAttach.cpp:406–413`, where clearing the fog checkbox sets `NewGameInfoT.omniscient`. Added a clickable checkbox with checked/default fog state, O agreement, R reset, independent Fast Game state and existing modal input isolation. Shared measured checkbox drawing preserves the neutral setup style and readable native-language labels. Added strict omniscient validation and five regressions for state/isolation, invalid values, enemy detail/mobile visibility, public yellow-star names, unseen-homeworld aliases/true comparison metadata and control bounds/translations. Full suites: 957 passed on release/current native PDG. All six browser flows passed, including actual fog/all-visible enemy windows and smaller checked/unchecked states. Inspected six before/after setup comparisons and translated layouts under `/private/tmp/galactica-parity/fog-{before,after}`. No new resources (366 IDs per language). Section 1 UI is now 69%; broader Section 6 fog functionality, lifecycle/hosting and Map Generation requirements remain open.

- Victory/defeat conclusion reports: audited `GalacticaSingleDoc.cp:1180–1228`, `CMessage::MessageConcernsEveryone`, viewer-specific event construction, `CShowMessageAttach::PrepareDialog` full player-name substitution and replay through `CMessage::PlayMessage`/`MovableAlert`. Restored all three paragraphs from v3 `Resources/gal-en-cdrom.r` TEXT 4000/4001 (correcting the English prisoner typo), translated in all six languages. Added queued neutral modal notices, acknowledgement, smaller-area paging and event-list replay; quiet autoplay retains metadata without popups. Fixed later-turn replay visibility when terminal turns do not increment and made the event-list heading reflect represented turns. Twelve regressions; full suites 969 passed on release/current native PDG. All six browser flows passed on turn 7, including actual ownership transitions, win/defeat/draw, queue draining, pointer/keyboard acknowledgement, replay without duplicate records or turn advance, modal input isolation and small-layout paging. Inspected translated narratives, controls and before/after screenshots under `/private/tmp/galactica-parity/outcome-{before,after}`. Resources: 370 IDs per language. Section 1 is now 72% functionality/73% UI by its weighted rows; persistence, multiplayer, other event presentation and Map Generation requirements remain open.

- New Game and retained local documents: audited `Galactica.cpp:2034–2050`, which asks for the remembered player name and allocates a new single-player document, preserving existing documents; name cancellation leaves setup open. Audited `CGameSetupAttach.cpp:260–285` Start/Cancel handling and `Galactica.cpp:1838–1848` Window-menu lookup/active marking. Added Menu New Game/N, cancellable existing setup, independent documents and Open Games/G with stable identities, active marking and paging. Preserved original graph/turn/events/economy/selection/camera; suspended autoplay during setup and while its document is inactive. Game construction installs the new active document only after its Game and Display are created. Ten regressions; full suites: 979 passed on release/current native PDG. Actual browser creation, nested cancellation, independent configuration/name acceptance, active-only turn advancement, switching, modal input isolation, nine-document paging and smaller layouts passed in en/de/es/fr/ja/ru. Inspected translated screens, before/after menus and original/restored maps under `/private/tmp/galactica-parity/sessions-{before,after}`. Resources: 372 IDs per language. Section 1 is now 75% functionality/77% UI; file persistence, hosting/networking, other event presentation and the Map Generation checklist remain open. Retained documents currently last only for the running app.

### Local file documents validation

v3 audit: `GalacticaSingleDoc.cp:350–478` writes version/player identity, game configuration, drawing flags, selection/scroll/zoom, Events-window visibility, ID continuity, map graph and pending reports; `ReadSavedTurnFile` and `DoRevert` restore the document. The v4 local implementation uses independently versioned JSON rather than legacy binary compatibility. `tests/game-save.test.js` covers complete graph round trips, economy, nested references, visibility/aliases, historical subjects, queued reports, spatial services, ID continuity, conclusions, camera/selection/events state, seeded continuation and malformed input. Full suites: 992 passed on release/current native PDG. Actual native filesystem/controller tests cover Save/Save As/Open/Revert, atomic failure preservation, overwrite/cancellation and failed installation. Browser flows cover actual downloaded files, Save of an existing document, Cancel/Revert, retained-document Open, malformed input, modal isolation and fresh-page startup import in all six languages. Before/after captures: `/private/tmp/galactica-parity/save-{before,after}`. Browser file-handle behavior is integration-tested with injected handles; screenshots use download/upload fallback and CDP selection of real files instead of an OS picker. Multiplayer rows remain open.

### New-colony naming/production report validation

v3 source: `CShip.cpp:440–462` creates `event_RenameColony` only for newly owned neutral stars after applying player defaults; `CMessage.cpp:651–659` rejects a request if its subject is no longer owned by the recipient. `Resources/gal-mainrsrc.r` Evnt 128/event22 uses STR#500/45 ("Please name your new colony and set its production levels"), no PPob and no autoShow. This is an attention/goto instruction, not an automatic text-entry dialog. V4 now creates the matching private report/request, retains the existing colonization report, focuses through Tab/manual selection/Go to, and displays translated guidance in the colony inspector. Defaults stay unchanged until the player edits them. Nine regressions cover real arrival, queue/privacy, computer/capture exclusions, recapture/removal, naming/production controls, End Turn confirmation, report replay, saved graph identity and translated bounds. Full suites: 1001 passed on release/current native PDG. Actual browser End Turn colonization, Tab, Unicode Rename/Save, production clicks, report Go to and recapture suppression pass in en/de/es/fr/ja/ru. Inspected before/after inspectors/reports and translated naming/recaptured screens under `/private/tmp/galactica-parity/colony-setup-{before,after}`. Section 3 percentages now reflect the completed table rows rather than the stale earlier estimate; Section 8 still has substantial event, sound, help, tutorial and preference work.

### Courier technology transfer and arrival repricing validation

Audited v3 `CShip.cpp:204–213` departure library pickup and `466–489` allied arrival. Transfer changes star/scout technology and scanner/frame state, then calls `CStar::SetBuildHullType` with the existing type; `CStar.cpp:1235–1238` recomputes its cost at current technology. V4 now does the same price refresh without changing paid effort or commissioning during arrival. Equal/lower-library allied arrivals also refresh a price made stale by research; enemy arrivals and paused builds remain intact. Five new commissioning regressions plus strengthened standalone/fleet assertions cover all hulls, fractional/banked effort, progress/ETA, unchanged technology, paused/enemy systems, actual arrival and local-save preservation. Full suites: 1006 passed on release/current native PDG. Actual browser End Turn delivery, progress/ETA, ordinary courier diagnostics and Pause/Resume pass in all six languages. Before/after inspectors, production windows and resumed construction were reviewed under `/private/tmp/galactica-parity/transfer-{before,after}`. This supersedes the earlier commissioning note claiming that transfer always retains the old hull price; research alone retains a selected price until the next explicit reselect/arrival. Transfer feedback is the normal refreshed inspector in shipped v3, with no dedicated event popup.

### Highest-container arrival and nested assembly validation

Audited v3 `CShip.cpp:295–600` and `AGalacticThingy::GetTopContainer`: navigation members resolve combat/colonization/technology at their highest container, then survivors use a living allied/neutral navigation container, the surviving outer container, or coordinates. V4 now shares this path between ships and fleets. Planetary combat expands nested fleet members rather than omitting them; satellite interceptions fall back to system docking. Incoming fleet groups retain identity when joining nested fleets or existing rendezvous assemblies; explicit user merges remain available. System contents register the outer docked group once, and colonization retains the colony ship and its fleet hierarchy. Twelve new regressions cover actual planetary combat, nested members and defenses, neutral colonization, container fallback, hostile survivors, course advancement, assembly identity and saved graph identity. The prior course fixture now supplies a live fleet member rather than an empty destroyed target. Full suites: 1018 passed on release/current native PDG. Actual browser End Turn comparisons for nested assembly, satellite fallback and defended enemy-member interception pass in en/de/es/fr/ja/ru. Inspected before/after inspectors and translated group/report screens under `/private/tmp/galactica-parity/arrival-{before,after}`. Section 4 functionality is now 98%; detailed narratives/result presentation, the separate remaining ship-row gap, networking and map-generation checklist work remain active.

### Control and setup flyby-help validation

Audited v3 `UNewModalDialogs.cp:35–123` mouse-linger balloon dispatch, `CGalacticSlider.cpp:26–27` attached slider explanations, `GalacticaUtilsUI.cpp:352–356` exclusion of automatic flyby balloons for map objects, and `MenuHelp.r` menu/hull help attachments. V4 now supplies delayed explanations for all current interactive control action types, without automatic map-object balloons. The shared 750 ms linger state wraps complete Unicode text by measured font width, stays inside the viewport, clears on leaving/activating a control, and respects front-window hit testing. Allocation help distinguishes actual fill from requested targets; system default-destination help uses star identity rather than its spectral type. Startup configuration, text editors and local file menus/confirmations share the help renderer and have their own explanations. Native/browser preferences default help on, remember the toggle, and refresh it when an existing game resumes; help remains a UI preference outside simulation saves. Eleven new regressions cover timing/change/leave/resize, varied-width glyphs, untouched allocations, front modal targets, dragging/targeting/illustrated suppression, clicks/keys, failing storage, exhaustive current game-action coverage, setup controls, system destinations and every translated explanation. Full suites: 1029 passed on release/current native PDG. Actual browser before/after checks and inspected screenshots cover startup density, allocation/lock/default-destination, End Turn, language settings, disabling/re-enabling/reload, course Add and click-through, file-menu/name editing, open-game preference propagation and smaller browser windows in en/de/es/fr/ja/ru. Evidence: `/private/tmp/galactica-parity/help-{before,after}` and `/private/tmp/galactica-help-{tests,native-tests}.log`. Section 8 is now 59% functionality/53% UI; manual, tutorial, sound, richer reports and the other project/map-port gaps remain active.

### Hull destination-entry eligibility (2026-10-10)

Audited v3 `Classes/GalacticaPanels.cp:695–713`: Add/Set/Call In depend on a nonzero ship speed; satellites cannot toggle their mandatory patrol. V4 now offers Orders only for entities eligible for course editing and rejects invalid direct/shortcut destination entry before creating a pending map click. Direct player waypoints use the same existing eligibility check, preventing orders to unfinished or contained ships. Independent scouts, colony ships, battleships and fleets remain orderable; star default destinations remain supported. Read-only satellite course viewing is retained. Two integration regressions cover all four hulls, keyboard access, unfinished hulls, fleet members, fleet commands and star defaults. Full suites: 1031 passed on release/current native PDG. Actual before/after browser checks exercise inspector buttons, Orders clicks/shortcut and satellite course viewing in all six languages; reviewed screenshots are under `/private/tmp/galactica-parity/hull-orders-{before,after}`. Existing translated controls are reused with no new strings. The larger Four hull roles row remains partial pending its remaining audit.

### Hull-choice explanations (2026-10-10)

V3 `Resources/MenuHelp.r` attaches separate STR# 5000 entries 66–69 to its four hull choices. Role descriptions were checked against `Classes/CStar.cpp:808–874` (speed, patrol, power, scanners and stealth), `Classes/UShipUtils.cpp:356–382` (costs), and the already ported colony/technology-transfer behavior. V4 build and new-colony default choices now describe each hull in English, German, Spanish, French, Japanese and Russian, while preserving existing construction-credit/default explanations. Hovering is informational; actual build/default clicks still work. A multilingual integration regression exercises every real hull-choice action, unchanged production, complete Unicode wrapping and small viewport bounds. Full suites: 1032 passed on release/current native PDG. Actual browser before/after checks and inspected screenshots cover all four choices in both windows in every language: `/private/tmp/galactica-parity/hull-help-{before,after}`. Role-specific report/first-built-class workflows still require Section 8 audit, so the larger hull row remains partial.

### First-built hull and higher-class announcements (2026-10-10)

Audited v3 `Classes/GalacticaProcessor.cpp:584–610,650–660` and `Classes/CStar.cpp:916–932`: each nonfighter hull is announced once per owner, fighters only when exceeding the highest built class, the illustrated event is private to that owner, and its focus remains the building system after automatic departure. V4 now announces the first satellite, scout and colony ship through the existing Stardock path, selects their existing art, and retains owner-only translated reports with role explanations and source-system focus. Enemy builds cannot open a presentation even in all-visible mode. Battleship milestone tracking now suppresses older classes after a higher class was built. Four regressions cover all hulls, departure focus, enemy privacy, repeat/older suppression and exact save/restore of first-build flags and queued presentations. Full suites: 1036 passed on release/current native PDG. Actual before/after browser flows cover all four hulls, Space dismissal, source-system reports, repeated builds and enemy privacy in all six languages; inspected artifacts are `/private/tmp/galactica-parity/first-hulls-{before,after}`. The four-hull role row is now implemented; Section 4 is 100% functionality/94% UI, with richer colonization/arrival narratives still pending separately. Other parity and Map Generation requirements remain active.

### Participant-relative combat casualty reports (2026-10-10)

Audited v3 `Classes/CShip.cpp:370–414`, `Classes/CFleet.cpp:536–590`, `Classes/CMessage.cpp:916–943`, and `Galactica-en.txt` LIST 500 entries 34–39. Fleet loss accounting feeds ordinary player-relative messages: the winner learns their own losses and the loser learns enemy losses inflicted. V4 replaces its global battle summary with one private report per participating owner, correctly describing winner, loser or inconclusive results. Force names and own/enemy ship losses are retained at battle time rather than recomputed after repair or regrouping. Loss counting excludes planetary defeat; successful occupation retains the surviving colony ship. Reports focus surviving forces or remembered battle coordinates after destruction; their structured snapshots survive complete-game saves. Four regressions cover actual fleets, outsider privacy even in all-visible mode, mirrored perspectives, unchanged snapshots after renaming/repair, real unarmed stalemate, invasion/colony accounting, saves and translated human-defender reports. Full suites: 1040 passed on release/current native PDG. Actual fleet arrival combat and Events/Go to browser flows pass for the local winner and loser in all six languages; before/after and translated screenshots were inspected under `/private/tmp/galactica-parity/battle-reports-{before,after}`. Automatic ordinary-message windows/replay, observer variants, surrender/capture narratives and other Section 6/8 gaps remain active; the combat UI row remains partial.

### Automatic combat message windows and replay (2026-10-10)

Audited v3 `Classes/CMessage.cpp:916–943`: ordinary messages use `DoMessageSelf()` and the generic message alert, and retained reports can be reopened from Events. V4 now automatically presents accessible local-participant battle reports in neutral modal windows. Continue and Go to acknowledge and focus the surviving subject or remembered location without advancing turns; Events → View report/Enter reopens retained messages without duplicating them. Keyboard shortcuts, mouse-wheel zoom and background map clicks are isolated until acknowledgment. Complete measured Unicode text pages above measured, wrapping controls; short messages use compact windows. Pending report identities and queues survive complete-game saves, and quiet autoplay retains Events without interrupting dialogs. Five regressions cover real combat, privacy, input isolation, retained replay, all six languages at 320×340, complete-save queues and autoplay. Full suites: 1045 passed on release/current native PDG. Actual browser winner/loser combat, Continue/Go to, Events replay, background mouse/keyboard/scroll blocking and small-window paging pass in en/de/es/fr/ja/ru. Inspected final before/after and translated screenshots: `/private/tmp/galactica-parity/message-windows-{before,after}`. Logs: `/private/tmp/galactica-message-windows-{tests,native-tests}.log` and `/private/tmp/galactica-message-windows-{before,after}-<language>.log`. Observer variants, capture/surrender narratives and remaining Section 6/8 presentation rows remain active; this implements local combat message presentation rather than the entire narrative checklist.

### System resistance and capture participant reports (2026-10-10)

Audited v3 `Classes/CShip.cpp:353–460`, `Classes/CMessage.cpp:735–842`, `Classes/GalacticaConsts.h:818–842`, `Resources/gal-mainrsrc.r` Evnt 128, and `Galactica-en.txt` LIST 500 entries 1–6. Losing the last resistance emits a report to both involved owners, whether or not a colony survives; successful occupation then emits distinct winner/loser capture reports. V4 now follows those triggers, preserves the previous owner and literal system/faction names, queues participant modal messages, requests attention and replays retained reports through Events. Lost systems navigate to remembered coordinates when no longer visible; captures on the final turn remain replayable without advancing time. Complete saves retain snapshots and pending queues. Neutral colonies retain naming/production guidance; failed invasions do not invent occupation/resistance reports. IDs 929–932 are translated in all six languages (467 IDs per file). Seven regressions cover actual fleet arrival with/without a colony, defender privacy/focus, failed attacks, neutral colonies, outsiders even in all-visible mode, immutable names, queued saves, terminal-turn replay and complete translated layouts. Full suites: 1052 passed on release/current native PDG. Actual before/after browser winner/loser invasions, Continue/Go to, Events replay and smaller windows pass in en/de/es/fr/ja/ru; final translated screenshots were inspected under `/private/tmp/galactica-parity/occupation-{before,after}`. Logs: `/private/tmp/galactica-occupation-{tests,native-tests}.log` and `/private/tmp/galactica-occupation-{before,after}-<language>.log`. Observer capture variants, destruction animations and the other narrative/checklist items remain active.

Surrender provenance: `event_PlayerSurrenders` and LIST 500 entries 40–42 exist, but a whole-source search found no runtime call emitting that event. The verified shipped invasion path emits `event_DefendersLost` and `event_ColonyCaptured`, not a distinct surrender action. Those two reports are implemented here; the resource-only surrender variant is recorded as unconfirmed shipped behavior rather than an unavailable-help blocker.

### First-detection ownership and last-seen rendering audit (2026-10-10)

Audited v3 `Classes/CStar.cpp:1241–1257,1350–1375,1465–1497`, `Classes/CShip.cpp:1221–1245,1476–1488`, and `Classes/AGalacticThingy.cpp:900–930,1164–1194`. Stars expose ownership whenever current visibility exceeds None (or the player is allied/all-visible); undetected hostile ships are not drawn, and ship names require Class. Last-seen history and last scanner ID support visibility bookkeeping; whole-source lookup found no drawing path consuming last-seen history to show stale objects or a remembered owner. The former checklist claim that such rendering was shipped v3 behavior was unsupported. An optional stale-snapshot/ghost display remains a future enhancement, distinct from the already implemented remembered coordinates in private event reports.

V4 ownership halos now use the same first-detection/alliance/all-visible gate as star inspectors, instead of waiting for Class. Technology, population and true-name gates retain their separate thresholds. Three regressions exercise actual drawing at every visibility level, removal of ownership/mobile markers after visibility reset with retained last-seen history, allied/all-visible identification and untinted neutral stars. Full suites: 1055 passed on release/current native PDG. Actual browser star selection and before/after Unknown, first detection, Tech, Class, Details, lost detection, allied and all-visible views pass in en/de/es/fr/ja/ru; reviewed final first-detection/lost-detection translated screenshots and English comparisons under `/private/tmp/galactica-parity/star-ownership-{before,after}`. Logs: `/private/tmp/galactica-star-ownership-{tests,native-tests}.log` and `/private/tmp/galactica-star-ownership-{before,after}-<language>.log`. Existing resources are reused (467 IDs per language); the overall parity and map-generation goal remains active.

### Destruction visual feedback for casualty/resistance reports (2026-10-10)

Audited v3 `Classes/AGalacticThingy.cpp:776–808`, `Classes/CMessage.cpp:868–877,970–1044` and `Classes/GalacticaConsts.h:306–310`. Destruction messages select their recorded location and play eight expanding/contracting explosion frames; the active renderer waits 2,3,4,5,6,5,4,3 ticks and erases shrinking frames. V4 participant casualty and defeated-resistance reports now center their recorded location and play a procedural PDG burst at that cadence (about 533 ms), then reveal the existing complete translated message. Renderer-only WeakMap timing starts on first drawing, so replay and restored pending reports restart rather than inheriting an old clock. Cached glow/ray Attributes are disposed with the renderer; sampling consumes no simulation randomness and does not alter casualties or turns. Invisible report controls consume clicks during the effect; existing Escape/Enter acknowledgment and modal map-input isolation remain intact. Zero-loss encounters and successful colonization do not invent explosions. Private participants, quiet autoplay and reduced motion are respected.

Six regressions cover all eight source-timed frames, real destroyed-ship combat and recorded positions, actual renderer calls/cache reuse, invisible-to-visible control transition, ground resistance and neutral colonies, restored pending/replayed effects, privacy, autoplay and reduced motion. Full suites: 1061 passed on release/current native PDG. Actual browser before/after winner/loser fleet combat, each individual frame, invisible Continue clicks, completed translated messages, Events replay and ground-resistance playback pass in en/de/es/fr/ja/ru. Reviewed frame sequences, all-language peaks/messages/resistance and before/after completion captures: `/private/tmp/galactica-parity/destruction-{before,after}`. Logs: `/private/tmp/galactica-destruction-{tests,native-tests}.log` and `/private/tmp/galactica-destruction-{before,after}-<language>.log`. Existing translations remain 467 IDs per language. The visual feedback is implemented for current participant reports; individual ship/fleet destruction narrative variants, observers, sound and the remaining parity/map-generation items remain active.


### Fleet casualty attribution prerequisite

Audited `Classes/UShipUtils.cpp:398–425` (`FinalizeLosses`) and `Classes/AGalacticThingy.cpp:776–808`: v3 passes the opposing player into fleet destruction. V4's final empty-fleet cleanup previously passed the attacking player for every side, incorrectly attributing a lost attacking fleet to its own owner. Combat now snapshots opposing owners before ship removal and uses the ground defender when an attacking fleet is eliminated during invasion. Defending fleets retain the attacker attribution. Two regressions execute real ship/fleet arrivals and verify removal plus opponent identity for space attacker losses, ground attacker losses and defender losses. Both full native suites pass: 1063 tests. Logs: `/private/tmp/galactica-fleet-attribution-{tests,native-tests}.log`. This prerequisite changes combat cleanup attribution without altering UI drawing or resource strings; individual destruction narratives/presentation, observer variants and the remaining checklist remain unfinished.


### Individual ship/fleet destruction reports

Audited v3 Classes/AGalacticThingy.cpp:776–808, Classes/UShipUtils.cpp:398–425, Classes/CMessage.cpp:970–1044 and Galactica-en.txt LIST 500 entries 7–12. Ship notices go directly to the owner and killing player; individual fleet members and ships defending their own systems are suppressed. Top-level fleet destruction has a distinct message, while nested subfleets are suppressed. V3 destruction playback returns without the generic alert.

V4 snapshots battle containment before damage/removal and emits separate private winner/loser notices for eligible ships and destroyed top-level fleets. Nested cleanup cannot lose the root identity; partial fleet casualties cannot produce a false fleet destruction. A surviving colony ship is not counted as a casualty of occupation. Independent ship notices retain the actual killing player even with several defending owners. Messages retain literal unit/faction names and localized light-year coordinates or the invaded system name. Existing participant summaries present first, followed by animation-only destruction notices that finish automatically; map input is consumed during playback. Events retains the complete narrative and offers ordinary report replay with navigation, without advancing time. Complete saves preserve private snapshots and pending animation-only presentations; quiet autoplay and reduced motion are respected. No observer recipient is invented for the audited direct-participant destruction trigger.

IDs 933–936 are translated in en/de/es/fr/ja/ru (471 IDs per language). Ten regressions cover actual standalone/fleet/nested arrivals, invading loss versus docked/member suppression, partial fleet survival, multi-owner ship killers, attacker loss attribution, automatic completion without another alert, narrative replay, saves, privacy, colonies, duplicate removal, reduced motion and measured translated text. Full suites: 1073 passed on release/current native PDG. Actual before/after browser runs cover ship/fleet/nested winner and loser perspectives, automatic animation completion, Events selection, View report and Continue in all six languages. Before/after comparisons, all-language narratives and animation peaks were inspected under /private/tmp/galactica-parity/destruction-notices-{before,after}. Logs: /private/tmp/galactica-destruction-notices-{tests,native-tests}.log and /private/tmp/galactica-destruction-notices-{before,after}-<language>.log. Sound, other observer/event variants and the remaining parity/map-generation checklist remain active.
### Observer capture reports

Audited v3 Classes/CShip.cpp:435, Classes/CMessage.cpp:643–674 and Classes/GalacticaDoc.cp:1547–1558, 1629–1635 plus Galactica-en.txt LIST 500 entry 3. Capture uses kAllPlayers as the secondary audience, with a third-person observer narrative; defeated resistance uses only the two involved players. Observer messages about unallied, undetected subjects are filtered under fog. With enemy-move playback disabled, foreign reports remain available in the event list without interrupting play.

V4 now records a private copy of the public capture narrative for each observer recipient and distinguishes it from involved-player copies. Observers must satisfy the ordinary subject knowledge gate (any current detection, allied ownership or all-visible mode); the explicit recipient field no longer bypasses fog for observer copies. Participants retain their remembered-location/private replay behavior, and resistance/destruction notices do not gain observer recipients. Observer captures add neither an automatic modal nor a local attention request. Their literal system/faction snapshots and observer marker survive complete-game saves, and accessible reports replay/navigate through existing Events controls without advancing time. Current visibility continues to govern observer access, including after detection is lost.

ID 937 is translated in all six languages (472 IDs per file). Six regressions cover actual third-party invasions, hidden/detected/allied/all-visible access, private resistance/destruction, snapshot saves and replay, no modal/attention interruption, failed attacks/neutral colonies/resistance-only outcomes, and complete translated layouts at 320×340. Full suites: 1079 passed on release/current native PDG. Actual before/after browser third-party capture, hidden/detected/all-visible Events, lost detection, View report and Go to pass in en/de/es/fr/ja/ru. Reviewed evidence: /private/tmp/galactica-parity/capture-observers-{before,after}; logs /private/tmp/galactica-capture-observers-{tests,native-tests}.log and /private/tmp/galactica-capture-observers-{before,after}-<language>.log. Enemy-move playback controls, other broadcast narrative types, sound and the remaining parity/map-generation checklist remain active.
### Enemy-event playback preference and responsive Settings

Audited v3 Classes/GalacticaDoc.cp:297, 688–691, 1629–1635 and Classes/GalacticaSingleDoc.cp:420,649. The local document enables enemy-event playback initially, toggles it through the command UI and saves the flag. Disabling it skips foreign automatic reports while retaining Events review.

Settings → Show enemy events now controls accessible observer playback and defaults on. Turning it off retains manual replay; turning it on queues unhandled retained/current-turn observer reports once. Automatic copies are distinguished from manual replays, so disabled or newly hidden queued copies are skipped without discarding participant messages. Known observer captures select and center their subject before presentation. Notices produced during movement wait for end-of-turn visibility recalculation, including turns after the first; fog/private access and quiet autoplay remain enforced. Browser/PDG configuration remembers the new-game default, while complete saves retain an independent per-game choice and pending presentation identity. Older version-1 saves missing the flag load with the v3 default; malformed new values are rejected.

Settings now keeps all native-script language names and controls within its panel, with Previous/Next and arrow-key paging when the logical viewport is short. Existing window/hover styling is reused. IDs 938–939 are translated in all six languages (474 IDs per file). Seven regressions cover actual hit targets, default automatic focus/acknowledgment, off/manual replay, duplicate queues, disabled/hidden copies, post-movement current-turn visibility, quiet/private playback, browser/native defaults, independent saves and legacy compatibility, plus complete localized paging/help. Both full suites pass: 1086 tests. Actual six-language browser menu/Settings clicks, hover help, toggling, fresh reload persistence and real third-party fleet capture playback pass; a 320×340 logical-layout fixture also verifies every page with real canvas clicks and keyboard input. This short-layout fixture overrides layout dimensions rather than resizing the native port. Before/after Settings, translated help/reports and short-layout pages were inspected under /private/tmp/galactica-parity/enemy-events-{before,after}. Logs: /private/tmp/galactica-enemy-events-{tests,native-tests}.log and /private/tmp/galactica-enemy-events-{before,after}-<language>.log. Remaining enemy movement/broadcast types, sound and the other parity/map-generation requirements remain active; the enemy-move row is Partial.


### Surviving-system defense loss reports (2026-10-10)

Audited Classes/CShip.cpp:310–327,385–395, Classes/UShipUtils.cpp:291–310, the event_PlanetDamaged destruction classification and STR# 500 entries 37–39. When an attacking force is wiped out at a star and the source defender tally is positive, v4 now records separate defender, attacker and observer messages. Attribution uses the last hostile defending ship owner, matching RemoveAllies, including mixed-owner defenses. Participants retain private access and recorded coordinates; outsiders use current detection/alliance/all-visible gates. Automatic observer playback respects Show enemy events and movement-time visibility refresh. Destruction-only automatic presentations and complete manual Events replay reuse the existing effect and report window. Literal subject/faction snapshots, recipient identity, loss counts and pending presentations survive complete saves.

Review note: shipped v3 counts defending ships before ground combat but includes the planet in surviving reserves afterward. Thus two destroyed defending ships followed by a failed ground invasion report one loss, while one destroyed ship reports none. This port preserves that tally explicitly for parity; the general casualty report still contains actual ship casualties. No simulation damage or population rules were changed. This source quirk is recorded for a possible deliberate departure from v3.

IDs 940–942 are translated in English, German, Spanish, French, Japanese and Russian; all six resources have 477 IDs. Eight regressions exercise actual space/ground battles, zero-loss/success/inconclusive suppression, mixed-owner attribution, participant privacy, observer detection/preferences, automatic animation/manual text, complete save/replay snapshots and all translated layouts. Both full suites pass: 1094 tests. Before/after browser fixtures isolate real failed battles for all three perspectives in all six languages, capture effect/report frames and verify Escape acknowledgment without a turn advance. Inspected artifacts: /private/tmp/galactica-parity/system-loss-{before,final}. Logs: /private/tmp/galactica-system-loss-{tests,native-tests}.log and /private/tmp/galactica-system-loss-{before,final}-<language>.log. Other broadcast/combat narratives, sound, remaining illustrated events and the Map Generation checklist remain active.


### Fleet-damage notice reachability and manual audit (2026-10-10)

Verified all event_FleetDamaged emitters in the shipped source: Classes/CShip.cpp:397–413 contains the two calls, gated by defendersInFleetLosses > 1 or attackersInFleetLosses > 1. Both values come from Classes/UShipUtils.cpp:398–429 FinalizeLosses. That function starts numDead at zero and subtracts startingShips - remainingShips. CFleet::RecordCombatInfo and RecordCombatResults (Classes/CFleet.cpp:536–594) count living leaf ships recursively; normal combat only removes ships. Consequently ordinary positive losses produce a nonpositive return value, and neither notice branch is reachable. The resource/event definitions demonstrate intended text, not observable shipped behavior. No additional emitter was found in Classes outside these two guarded calls.

This does not remove partial fleet casualty accounting from parity: existing private battle summaries still report actual casualties, retain each participant perspective and animate/replay through Events. It also does not remove fleet destruction, whose separate source emitter and v4 snapshots are already implemented. A positive partial-fleet-loss broadcast would be a deliberate bug fix beyond shipped v3 behavior, rather than a missing runtime trigger. No new broadcast is introduced by this audit. Other source-confirmed reports remain required.

The next manual requirement was also checked against the application source. Galactica.cpp:1075 binds the Help key; 1911–1915 always enables the documentation command; 2167–2169 calls ShowHelpDocs. ShowHelpDocs at 1742–1759 resolves STR_DocsFileName and opens the bundled document in the system browser, with separate missing-document and browser-launch alerts. The v3 Plug-ins tree includes docs.html and docs-de.html, and the shipped application includes the English document and its linked images. Thus a web-only external link or hover hints alone would not complete the User's Manual row. V4 still needs startup and in-game access, a complete readable manual, native/browser opening, localized controls/failures/content in all six supported languages, and packaging/link/layout verification. This item is incomplete, not blocked by unavailable help. Interactive tutorial remains a separate requirement.

No runtime or resource strings changed in this audit. The current clean runtime remains the verified 8adf410 implementation: all 1094 tests passed on both release and development PDG, with the six-language system-report browser evidence recorded above. The overall parity and Map Generation objective remains active.


### Localized offline User’s Manual (2026-10-10)

Completed the ShowHelpDocs requirement audited above: startup and command-menu access, Help-key opening, and separate missing-document/browser-launch feedback. The local opener uses native execFile argument arrays (macOS open, Linux xdg-open, Windows rundll32) or a synchronous browser popup within the input gesture, then clears the opener reference. Invalid language/path values fall back to English, and stale asynchronous failures cannot replace a newer result. Failure acknowledgment consumes input without starting a game or advancing time; F1 retains ship visibility and H retains Hunt outside the command menu.

All six bundled UTF-8 pages contain the same 17 complete chapters: startup, map navigation, economy, hulls, construction, orders, fleets, rendezvous, fog, combat, events, comparisons, saves, settings, strategy, shortcuts and currently unavailable network/tutorial modes. Source review corrected colony-ship combat reserves, courier technology transfer, homeworld/player naming, allocation locks and browser-specific motion preferences. The guide describes exact-100% commissioning and actual-fill/target-marker sliders. No external assets or network connection are required. Shared CSS provides readable desktop/narrow layouts, focus styles and printing; native-script language links and contents anchors resolve locally. Networking and interactive tutorial remain independent unfinished requirements; their original v3 instructions are not advertised as available in v4.

IDs 943–946 are translated in en/de/es/fr/ja/ru, bringing each resource to 481 IDs. Eight regressions cover all language URLs, native argument arrays, missing/blocked/retry/stale failures, real command hit regions and shortcuts, small startup geometry, translated error wrapping, all chapter/contents/language links and traversal fallback. Both full suites pass: 1102 tests on release and development PDG. Actual browser checks in every language open the local page from startup and the game menu, click every language link, verify no opener, inspect desktop/economy/combat/settings and 320-pixel layouts, and exercise blocked-popup and missing-file dialogs without turn changes. Final web asset packaging includes all six pages and CSS. Actual macOS system-browser launches succeeded for all six files; Windows/Linux launcher argument handling is unit-tested but their GUI launchers were not available here.

Inspected before/after startup and menu artifacts: /private/tmp/galactica-parity/manual-access-before and /private/tmp/galactica-parity/manual-final/<language>. The final directory also contains complete standalone page and failure-dialog screenshots. Logs: /private/tmp/galactica-manual-{tests,native-tests}.log and /private/tmp/galactica-manual-final-<language>.log. The remaining parity and Map Generation objective stays active.

### Complete ship and fleet repair notices (2026-10-10)

Corrected an incomplete source audit in the Repairs row: CShip::RepairDamage refreshes the object, but CStar::EndOfTurn at 609–618 emits event_ShipDamageFixed or event_FleetDamageFixed after positive repair reaches zero total damage, for human system owners only. Resources/gal-mainrsrc.r Evnt 128 entries 20–21 use STR#500/43–44, sound 1001, no PPob and autoShow=0; their other-recipient strings are zero. Resources/gal-en-shareware.r confirms the separate ship and all-fleet-ships wording. CMessage::BuildClientEvent sets attention for a nonzero report string. Sound remains the open sound checklist item.

V4 now emits those private completion events from the actual docking repair path. Nested fleet members aggregate into one top-level notice; partial repairs, patrol, moving units, satellites, undamaged units and computer systems do not create completion notices. Events retains the literal completed subject name and coordinates, attention selects it, and View report manually displays the full notice without an explosion or automatic modal. Complete saves retain recipients, subjects and pending attention. IDs 947–949 and the manual explanation are localized to all six languages; resources now have 484 IDs each.

Eight regressions cover positive/partial/absent repair, real end-turn delivery, fleet aggregation including nested groups, private all-visible access, attention without turn advancement, complete save/replay and translated report layouts. Both full suites pass: 1110 tests on release/development PDG. Actual browser before/after comparisons cover ship and fleet completion, event-row and View report clicks, complete translated messages and Escape acknowledgment without turn advancement in all six languages. Screenshots: /private/tmp/galactica-parity/repairs-{before,after}/<language>. Logs: /private/tmp/galactica-repair-{tests,native-tests}.log and /private/tmp/galactica-repair-{before,after}-<language>.log. Other event types, sound, tutorial, networking and Map Generation remain active.

### Rendezvous fleet-creation notices and manual attention playback (2026-10-10)

Audited Classes/CShip.cpp:492–537. Only creating a new fleet for a first ship arriving at a rendezvous emits event_NewFleet; ordinary ship-to-ship formation, joining an existing assembly fleet, and moving an existing fleet to an empty rendezvous do not emit that event. Resources/gal-mainrsrc.r Evnt 128 entry 15 selects STR#500/26 for the owner and /27 for observers, with no sound, PPob or automatic presentation. Resources/gal-en-shareware.r gives the owner naming instruction and separate observer formation narrative. Event 16 / strings 28–29 describe completed formation, but event_FleetFormed has no runtime emitter in Classes; it is not treated as an additional shipped trigger.

V4 now records the source-proven creation notice once after membership is established. Owner copies request naming; separate observer copies identify the faction and creation coordinates, and stay inaccessible without detection/alliance/all-visible knowledge of the fleet. Complete saves retain the snapshot, recipients, subject and manual-only flag. Joining/assignment status notices now retain an owner recipient and fleet subject rather than leaking as unscoped reports. Existing Unicode Rename controls supply the naming workflow. IDs 950–951 and explanatory manual paragraphs are translated in all six languages, bringing each resource to 486 IDs.

The attention audit also checked CMessage::BuildClientEvent and GalacticaDoc::AddMessageToNeedyList plus the non-autoshow message loop at 1766–1789: Tab/Next selects the subject and plays the message. V4 now displays explicitly manual-only fleet-creation and repair notices when reached through attention, while ordinary automatic turn playback skips them. This corrects the previous repair item's focus-only attention behavior. Events View report remains available; acknowledgment does not advance time. No explosion is attached to either notice type.

Seven new regressions cover actual arrivals, owner/observer wording, first-only creation, joining/assignment/ship-target suppression, fog loss/reacquisition, private naming, no automatic presentation, complete saves, attention-driven naming and all translated layouts. Repair regressions additionally check attention playback. Both full suites pass: 1117 tests on release and development PDG. Actual six-language browser before/final comparisons cover owner and observer event lists, real row/View report clicks, Tab displaying the notice, and Escape without turn advancement. The same actual Tab flow is verified for repaired ships and fleets. Inspected artifacts: /private/tmp/galactica-parity/rendezvous-formation-{before,final}/<language> and /private/tmp/galactica-parity/repairs-attention/<language>. Logs: /private/tmp/galactica-rendezvous-formation-{tests,native-tests}.log, /private/tmp/galactica-rendezvous-formation-{before,final}-<language>.log and /private/tmp/galactica-repair-attention-<language>.log. Further event types, sound, tutorial, networking and Map Generation remain active.

### Neutral-colony owner and observer reports (2026-10-10)

Audited Classes/CShip.cpp:438–462: neutral colonization emits event_NewColony to the colonizer and all other players, followed by the separate private event_RenameColony instruction. Resources/gal-mainrsrc.r Evnt 128 entry 14 selects STR#500/24–25, sounds 1011/1014, no special PPob and autoShow=1. Resources/gal-en-shareware.r confirms separate colonizer success and observer faction/system narratives. CMessage::CreateEvent uses the subject/recipient snapshot; client report selection and existing fog gates determine what an observer can inspect. Sound remains the separate open sound requirement. Enemy capture and defeated resistance retain their distinct reports.

V4 now creates recipient-specific neutral-colony reports from the actual arrival/colonization path, with retained literal faction and system identity, colony-time coordinates and star subject while the colony ship remains docked. The owner report automatically opens; acknowledgment selects the colony, exposes its existing naming/production guidance and attends shared-subject requests without advancing a turn. Detected/allied/all-visible observer copies follow Show enemy events and wait for movement-time visibility refresh. Turning that preference off retains manual Events replay; losing knowledge hides observer access again. Quiet autoplay produces retained events without modal windows. Complete saves preserve pending presentation, report snapshots, recipients, subject identity and attention. No destruction animation or ship casualty is introduced by colonization.

IDs 952–953 and manual explanations are localized in en/de/es/fr/ja/ru, bringing resources to 488 IDs each. Eight new regressions cover actual arrival, private owner/observer narratives, colonized-star subject identity, acknowledgment and guidance, fog, playback preferences, real end-turn visibility ordering, quiet autoplay, complete saves/replay, capture/duplicate suppression and all translated layouts. Existing naming/navigation/destruction tests now acknowledge the source-required colony success window before exercising their original workflows. Both full suites pass: 1125 tests on release and development PDG.

Actual browser before/after checks in all six languages exercise owner and observer automatic windows, acknowledgment/focus, owner naming guidance, disabled observer playback, event-row/View report clicks and manual replay without turn advancement. Inspected screenshots: /private/tmp/galactica-parity/neutral-colony-{before,after}/<language>. Logs: /private/tmp/galactica-neutral-colony-{tests,native-tests}.log and /private/tmp/galactica-neutral-colony-{before,after}-<language>.log. Remaining event types, sound, tutorial, networking, UI gaps and Map Generation remain active.

### Sound source audit and portable sample preparation (2026-10-10)

Sound remains an unfinished parity item. Audited USound.cp:19 (sound defaults on), GalacticaDoc::UserChangedSettings at 1333–1338 (PlaySound preference), Galactica.cpp:1923 and 2286–2287 (menu state/toggle), CMessage::BuildClientEvent and PlayMessage (recipient-specific resource selection and playback), and CDestructionMsg::DoMessage at 977/1039–1044 (explosion first, then optional recipient cue). No game playback hooks or sound control have been added in this preparation commit.

Both shipped shareware and CD resource bundles contain exactly twelve snd resources: 1000 explosion, 1001 attention, 1002 warning, 1003 message, 1007/1008 won/lost battle, 1009/1010 won/lost planet, 1011 new colony, 1012 no more, 1013 discovery and 1014 enemy move. The outcome IDs 1004–1006 referenced by Evnt 128 are absent in both shipped bundles; the source-only definitions do not establish an audible shipped outcome cue. Event 14 neutral colony uses 1011/1014; events 20–22 repairs/naming use 1001; event 15 new fleet has no sound. The imported message resource is labeled Message (TNG doorbell) in the source; recording provenance and public redistribution remain under ASSET_RIGHTS.md alongside the existing legacy art audit. No new grant is inferred from this conversion.

Added tools/import-v3-sounds.py to extract the raw shipped bundle's resource map and decode standard unsigned 8-bit mono buffers into WAV. It resolves buffer-command offsets rather than assuming one command or a fixed header location; Discovery has an additional command and a sample header at byte 28. All twelve PCM payloads remain byte-identical. WAV rates round the legacy 16.16 rate to the nearest integer, with less than 0.003% speed change. data/sounds/manifest.json records source/resource/PCM/WAV SHA-256 hashes, rates and frame counts; data/sounds/README.md records names, provenance and regeneration. Independent imports from both editions produce identical resource entries and WAV bytes.

Two regressions check the complete inventory, WAV codec/header, frame/rate bounds and PCM/WAV hashes, then load all twelve files through the real public PDG resource manager. Both complete suites pass: 1127 tests on release/development PDG. Web packaging includes all samples. Actual browser resource-manager loading decodes all twelve files to valid nonzero HTMLAudio durations, and muted PDG playback advances before stopping. Logs: /private/tmp/galactica-sound-assets-{tests,native-tests,browser}.log; browser decoded durations: /private/tmp/galactica-sound-assets-browser/decoded-sounds.json; independent CD import: /private/tmp/galactica-cd-sounds. No UI behavior changed, so there is no sound-control screenshot to claim.

Next work for this same item is the persistent localized sound control, cached native/browser playback, presentation-time recipient cues, explosion sequencing, attention/build feedback, mute/stop behavior, privacy and quiet-autoplay checks, actual Settings interactions and before/after screenshots in all six languages. The checklist remains Missing for runtime/UI sound; it is not blocked. The full parity and Map Generation goal remains active.

### Sound preference and presentation playback (2026-10-10)

Added an application-owned audio service using public ResourceManager.getSound, Sound.setLooping(false), Sound.start and Sound.stop. Cached controllable instances allow mute to stop current playback. Sound defaults on and persists independently of saved simulation state through the existing browser/native preference adapter. The same service is attached to newly created and restored games; session changes stop old playback. Localized Settings label/help and manual explanations cover en/de/es/fr/ja/ru (490 string IDs per language).

Report rendering selects source owner/loser/observer cues after existing privacy and quiet-autoplay gates. Presentation state is kept in a WeakMap outside saves: redraws do not repeat cues, manual replay/restored overlays begin a new presentation, and enabling sound does not replay a muted report. Destruction audio begins with the effect and defers the recipient cue until the eight source-timed frames plus CDestructionMsg’s additional 20 ticks have elapsed. Reduced-motion reports retain audio without requiring visual flashes. Attention navigation plays the appropriate report/call-in cue; manual repair reports play through their presentation rather than duplicating attention sound.

Eight new regressions cover persistence, cache/stop/mute, recipient selection, explosion sequencing/replay, privacy/autoplay, unavailable backend, actual Settings action/save exclusion and six-language resources. Full suites: 1135 passed on release and development PDG. Browser checks use actual Settings clicks, measured PDG audio-clock advancement, stopped playback after mute, actual neutral-colony arrival/report audio and full-page reload persistence. The headless lane silences audio output while checking playback; it does not prove speaker listening quality. Before/after Settings and all-language enabled/muted/report screenshots are under /private/tmp/galactica-parity/sound-{before,after}; logs /private/tmp/galactica-sound-runtime-{tests,native-tests,before-<language>,after-<language>}.log.

This advances the Sound row to Partial, not complete. The remaining source sound triggers, exhausted selection behavior and MIDI/menu behavior require further audit and implementation; the overall parity and map-generation checklists remain active.

### Exhausted attention cue and remaining sound audit (2026-10-10)

Corrected the initial source audit: GalacticaDoc::ObeyCommand at 626 plays snd_NoMore for cmd_GotoNext when mNumUnprocessedGotos is zero; the 576 occurrence is a separate left-arrow containment-limit cue, not a right-arrow command. Attention.next now plays sample 1012 when its eligible list is empty. Both actual Tab and the Next item button use this path; selection, queued simulation events and turn number remain unchanged. Sound off, quiet autoplay and active map targeting/dragging/presentations suppress the cue. Pending call-ins retain their attention cue instead. No UI strings were added; explanatory manual paragraphs are localized in all six languages.

Two regressions drive the actual game Tab/canvas-button routes with a cached PDG audio adapter and check selection/turn/cache/mute, pending call-ins, map-target/drag contexts, quiet autoplay and event presentation suppression. Both full suites pass: 1137 tests on release/development PDG. Actual browser key/button events in en/de/es/fr/ja/ru load only sounds/1012.wav, advance the audio clock, reuse one sample for repeated commands and stay silent after mute. The headless harness silences output; speaker quality is not claimed. Before/after empty-list, post-Tab and post-button screenshots are inspected under /private/tmp/galactica-parity/no-more-{before,after}; playback state is recorded per language. Logs: /private/tmp/galactica-no-more-{tests,native-tests,before-<language>,after-<language>}.log.

Audited all CSoundResourcePlayer/StSoundResourcePlayer call sites outside their implementation: CChatHandler::AddChatToHistory at GalacticaClient.cpp:1019 plays Message (1003) only with a chat window; HandleTurnComplete at 2600 plays Warning (1002) for an incoming network turn when the client/app is in the background; GalacticaTutorial.cp:448–450 plays tutorial sample 7000 from its plug-in. These remain requirements of the unported chat/network/tutorial rows; they are not invented as local single-player notifications. General event sounds remain selected by the Evnt recipient table. GalacticaDoc.cp:576 containment-limit feedback remains navigation work.

### User-review blocker: original startup/About music metadata

Galactica.cpp:1687–1697 and 1793–1807 instantiate looping CMidiMovieFilePlayer only for the startup splash and About box, fading out over five seconds on dismissal. There is no confirmed in-game background music loop. cmd_Sound at 2286–2287 toggles both effects and music; USound.cp:230/277 also requires the effects switch for music.

All four available Galactica Music files (root, release/backup and shipped shareware/CD MacOS directories) are identical 6152-byte files, SHA-256 444c0a33479a538324e908987ad54ceca14d4099324d80ae4c08fc9ee9259f9b. Each parses as exactly one mdat atom spanning the entire file. None has an accessible resource fork; no alternate movie/MIDI/AppleDouble/archive copy was found in this checkout. Neither shipped Galactica.rsrc bundle contains moov or Midi resources. Audit output: /private/tmp/galactica-v3-music-audit.json.

Apple’s [QuickTime movie atom documentation](https://developer.apple.com/documentation/quicktime-file-format/movie_atoms) describes moov as the metadata defining tracks and referencing media samples. The available data does not include that composition/track metadata. Source-faithful conversion/playback therefore needs an intact original Galactica Music file with its resource fork/movie metadata, or an authoritative rendered recording. This asset dependency is explicitly blocked for user review; existing event sounds and other parity work continue. A guessed composition or substitute track would not establish v3 music parity.

### Containment keyboard navigation and limit feedback (2026-10-10)

Audited GalacticaDoc.cp:368–370/558–578: Left Arrow selects the current thingy’s immediate position/container, switches to its contents panel, and assigns CbxShPanel::sPrevThingy; no parent plays snd_NoMore. GalacticaPanels.cp:1187–1190 maps Right Arrow to the Look At button. Its bSet handler at 1255–1265 selects the active-table member and switches a selected fleet to its contents panel. UpdatePanel at 1533–1557 selects the previous child when found, otherwise the first row.

V4 now selects the immediate containing fleet/system and opens the existing container exchange window. Remembered child selection uses current membership and knowledge rules, and its actual sorted index selects the correct page. Parent controls use the same path. Right Arrow/Inspect selects the member; entering a fleet selects its first sorted row for subsequent inspection. Ship inspection returns to the map. Navigation changes no containment, orders or turn state. Root objects use the cached shipped No more cue, respecting sound/quiet-autoplay settings. Existing modal/editor arrow behavior and targeting/drag suppression are preserved.

The system-parent control now says Containing system rather than Parent fleet; ID 956 is translated in en/de/es/fr/ja/ru (491 resource IDs per language). Inspect/Parent controls show universal arrow hints with measured button widths. All six manuals explain upward/downward navigation, remembered rows and root-limit behavior.

Eight regressions cover real docked and multi-level Left/Right routes, child selection, later-page reveal, top-level audio/mute, hidden/stale membership, read-only enemy contents, targeting/drag restrictions, and Settings/rename/course/report arrow isolation. Both full suites pass: 1145 tests on release/development PDG. Actual six-language browser key and Parent/Inspect button events traverse ship → inner fleet → top fleet → system and back, retain membership/turn state, reveal a later-page member and advance root-limit audio. Headless audio is silenced for playback verification. Before/after map/container/paged-list screenshots and all-language navigation views are inspected under /private/tmp/galactica-parity/containment-{before,after}. Logs: /private/tmp/galactica-containment-{tests,native-tests,before-<language>,after-<language>}.log. The broader parity/map-generation work and previously documented music asset blocker remain active.

### First-class construction observer broadcasts (2026-10-10)

CStar.cpp:920–927 creates event_BuiltNewClass for the owner plus kAllPlayers, with the owner as affected player, ship as subject, technology as numeric data, and SetFocus(this) preserving the building system before default-order departure. CMessage.h:117–128 and CMessage.cpp:743–761 confirm that the fifth argument is the additional recipient, so this is a real broadcast. Evnt 128/entry 11 assigns owner/observer STR#500/18–19 and sounds 1011/1014; only the owner has PPob 4002 and Stardock art. The existing enemy-first-class test had incorrectly ruled out observer narratives as well as art. The separate ordinary BuiltShip event has zero other-recipient report text and remains private.

V4 records separate recipient copies for each first hull and higher battleship-class milestone. Construction-time faction/class/type/technology/system names and position are retained. Reports use the origin system for current visibility and navigation, preserving the source focus even after default-order departure. Owners retain their existing illustrated Stardock presentation and role explanation; acknowledgment handles the linked owner report and selects the origin. Observers get ordinary neutral reports, attention and manual Events replay, with current fog/alliance/all-visible access, Show enemy events and quiet-autoplay gates. Their cue is 1014; no owner-only art or explosion is exposed. During actual star updates, automatic observer presentation waits until the final end-turn visibility pass.

Added localized observer narrative 957 in en/de/es/fr/ja/ru (492 IDs per file), with a six-language manual explanation. Eight new regressions cover actual hull/class milestones and repeats, owner art/acknowledgment, private/fog gates, off/manual/quiet behavior, departure and immutable snapshots, real end-turn visibility ordering, complete saves/replay and sound selection, and localized parameters. Updated the prior first-class privacy test to preserve private art while requiring the source broadcast, and the build-attention test to acknowledge the separate first-class notification before asserting the remaining ship request. Both complete suites pass: 1153 tests on release/development PDG.

Actual six-language browser builds exercise all four hull roles, observer auto acknowledgment/origin focus, Events row/View report replay, real Show enemy events toggling with manual replay, newly acquired detection and unchanged owner scout Stardock artwork. The observer cue advances through the actual PDG audio backend (headless output is silenced). Before/after map, Events, owner art and all-language report screenshots are inspected under /private/tmp/galactica-parity/commissioning-observers-{before,after}. Logs: /private/tmp/galactica-commissioning-observers-{tests,native-tests,before-<language>,after-<language>}.log. Discovery broadcasts and remaining parity/map-generation work remain active; the previously recorded source-music asset dependency is still blocked for review.

### Drive discovery broadcasts

Verified CStar.cpp:651–654 in the shipped v3 source: InventNewClass sends to the owner plus all other players, with the discovering system as subject and the technology level as numeric argument. Evnt 128 entry 12 selects owner/observer strings 20/21 and sounds 1013/1014; only the owner receives Lab PPob 4003.

V4 previously queued Lab art for enemy discoveries without recipient checks. Separate discovery copies now snapshot faction, system, tech and drive class. Owner Lab acknowledgment focuses the system and handles attention; observer narratives obey current detection, Show enemy events, quiet autoplay and replay access. Automatic observation waits until the end-turn visibility pass. Saves retain the snapshots and replay metadata. Existing highest-tech milestone rules remain unchanged.

Validation: all 1,158 tests pass on release and development PDG. Six-language actual browser flows verify owner Lab acknowledgment, observer reports, Events row/View report replay, disabled automatic playback and new detection. Before/after observer and owner-art screenshots and translated report layouts were inspected under /private/tmp/galactica-parity/discovery-{before,after}. Logs: /private/tmp/galactica-discovery-{tests,native-tests,before-<language>,after-<language>}.log. Broader parity and Map Generation work remain active.

### Interactive tutorial source decoding

Added tools/import-v3-tutorial.py and docs/reference/v3-tutorial.json as a port reference, with source/resource hashes and the fixed tutorial saved-game identity. The importer follows GalacticaTutorial.h pageResT, GalacticaTutorial.cp LoadPage/NextPage and GalacticaSingleDoc.cp DoNewGame. It preserves all sixty lessons in each of the available English/German Rez dumps, recovery routes, macOS overrides, exact front-window exceptions, placement bindings and blank-button action waits. No runtime tutorial UI has been added, and no existing game behavior changes. Six independent Python parser checks cover endian layout, flags, exceptions, default IDs, MacRoman strings, duplicate/malformed input and unresolved references. Three game-suite regressions cover the complete reference, gameplay milestones/action waits and fixture provenance. Re-importing produces identical bytes. All 1,161 tests pass on release and development PDG. Screenshots do not apply to this source-only importer. Tutorial remains Missing; the full controller/fixture/localization work is the current next item, with no unavailable-help blocker established.

### Shipped tutorial galaxy conversion

Decoded the complete v1.2b10-format tutorial data fork using the verified source stream order, packed legacy header/player records, Waypoint/Setting readers and star payloads. Both shipped editions produce identical converted JSON. The development tutorial copy has a different fast-game flag and system ID 9 label; it is not the authoritative fixture. The port uses shipped fast mode and S-20, matching the instructions.

The fresh-game builder preserves all 42 original system IDs/positions, three faction homeworlds, billion-person populations, allocation actuals/targets/rates, floating-point hull payments, research and first-build milestones. Source IDs are installed before spatial registration; unrelated game objects, preferences and global random state are untouched. Pending colony hulls stay outside the completed ship list and commission through ordinary first-turn production. Full graph save/restore and neutral colonization remain valid. The guided controller/session restoration and all sixty translated lessons remain incomplete; no tutorial menu/launch claim is made.

Validation: six parser checks pass, including complete source decoding, truncated records, invalid references and trailing bytes. Both shipped editions re-import identically. All 1,166 tests pass on release and development PDG. Actual browser flows in English, German, Spanish, French, Japanese and Russian verify the original startup graph/configuration, real Enter first-turn colony commissioning, owner acknowledgment and an actual map click setting a course to S-20. Screenshots of the map, original home production, first colony art and plotted destination were inspected under /private/tmp/galactica-parity/tutorial-game. Logs: /private/tmp/galactica-tutorial-game-{tests,native-tests,<language>}.log. No normal-game UI changed in this component; guided instruction panels, six-language lesson text and session lifecycle remain to implement.


### Colony ships survive colonization and capture

A fresh audit of `Classes/CShip.cpp:429–544` corrects the earlier interpretation that colony ships were consumed. V3 changes ownership, adds one thousand colonists to a previously neutral system, applies colony defaults and transfers technology, then docks the surviving ship normally. Captured systems retain their population. Tutorial lessons 28 and 48 explicitly reuse the original colony ship. Earlier checklist and verification descriptions have been corrected accordingly.

V4 now retains colony ships and their nested fleet hierarchy after colonization and capture. The same ship can receive orders, leave its first colony and establish another; full saves preserve that identity and docking. Invalid hulls, incomplete ships, destroyed colonists and duplicate owned targets are rejected. Resource 923 and the hull table in every manual describe reuse in English, German, Spanish, French, Japanese and Russian (494 resource IDs per language).

Five new regressions cover successive actual arrivals, nested fleets, neutral/captured population (including zero captured population), full-save reuse and invalid callers. Both full suites pass: 1171 tests with release and development PDG. Actual browser map clicks and Enter turns establish S-20 and S-7 with the same shipped-tutorial colony ship in all six languages. Before/after arrival captures and all-language second-colony screens were inspected under `/private/tmp/galactica-parity/reusable-colony-{before,after}`; the intentional change is the surviving docked colony ship and its defense contribution. Logs: `/private/tmp/galactica-reusable-colony-{tests,native-tests}.log` and `/private/tmp/galactica-reusable-colony-{before,after}-<language>.log`. The tutorial controller and remaining parity/map-generation checklist are still incomplete.


### Tutorial production safeguards

Audited `GalacticaSingleDoc.cp:887–913`, `CStar.cpp:684–704,959–964` and the fixed system IDs in `GalacticaTutorial.h`. The source restores homeworld production before processing turns 2–13 and guarantees the selected home hull on processing turns 3, 4 and 8, plus New Terra's hull on turn 8. Positive ship effort is required; the source sets payment to cost plus 0.1 and uses ordinary commissioning. Computer systems choose battleships after completing a hull. These are tutorial-specific safeguards, not changes to normal game rules. V4's fixed tutorial builder now attaches a scoped simulation helper implementing those rules. The deliberate exact-100% completion rule remains intact.

Seven regressions cover all three real homeworld commissioning milestones, New Terra versus other systems, zero effort/paused production, turn-boundary allocation restoration, computer continuation and ordinary-game isolation. Both full suites pass: 1178 tests with release and development PDG. Real browser Enter turns with deliberately low production compare stalled baseline hulls with guaranteed satellite, courier and battleship completion in all six languages. Before/after translated inspectors were inspected under `/private/tmp/galactica-parity/tutorial-simulation-{before,after}`. No strings were added or changed; commissioning reports and controls use existing localized resources. Logs: `/private/tmp/galactica-tutorial-simulation-{tests,native-tests}.log` and `/private/tmp/galactica-tutorial-simulation-{before,after}-<language>.log`. The guided controller, session/save lifecycle and six-language instructions remain unfinished; this dependency does not complete the tutorial row or the broader parity goal.


### Tutorial progression model

Implemented `src/js/tutorial-controller.js` against decoded page metadata and the original action hooks. The model preserves logical pages and macOS variants, zero/increment and minus-one/completion destinations, first-match window exceptions, existing-game/modal/About/splash recovery, hidden explanatory buttons, resettable three-second zoom and two-second slider delays, first-colony Retry rejection, guarded hull/system orders, two-system rendezvous placement and dynamically allocated Alpha identity. Message-window appearance, acknowledgment, attention presentation and empty attention are separate transitions. Source corrections return tutorial-only effects for fixed colony/rendezvous names and the courier route; entry effects restore early home focus and final playback/help behavior. Serializable progress validates destinations and timer state. See `docs/reference/TUTORIAL_CONTROLLER.md` for source hooks and integration requirements.

Fourteen regressions include a complete sixty-lesson model action path, recovery branches, ordered wildcard handling, timing/cancel behavior, wrong courses/builds/points, object identity, source side effects, saved progress and corrupt state. Both full suites pass: 1192 tests with release and development PDG. This is an unconnected model: no startup entry, game-input binding, instruction rendering, session preservation or six-language lesson text has been added. No user-facing strings or rendered screens change, so a model test is not claimed as a UI or localization check. Those remaining pieces are still required before the tutorial row can be completed; broader parity and Map Generation remain active.


### Tutorial bindings to real game actions

Added `TutorialRuntime` to bind the progression model to one explicitly supplied tutorial game through removable instance wrappers. Successful mouse/keyboard build choices, target allocations, Equalize, waypoint entry, valid rendezvous placement and naming, auto-destinations, home selection, patrol, comparisons, fleet contents, attention and modal event lifecycle now drive the source transitions. The wrong first course is rejected before mutation, invalid placement retains capture, and source names are recorded correctly in rename events. The existing Exchange ships table supplies fleet contents in the modern UI. Game drawing ticks debounce waits; display zoom changes reset their timer. Source acknowledgment effects run before queued observer playback, and original colony/courier identities remain fixed even after destruction. Runtime snapshots include actor IDs and model progress. Disposal and failed attachment restore the original methods; tutorial effects do not write normal drawing preferences.

Sixteen new regressions exercise actual game methods, production/event delivery, mutation rejection, placement capture, source naming/report text, real auto-destinations, attention and route correction, patrol/comparison/fleet table, zoom/timing, wrapper cleanup, original-actor loss, progress snapshots and late queue suppression. Both full suites pass: 1208 tests with release and development PDG. Actual browser map clicks, rename acceptance and build-button choices compare before/after in all six languages; final Enter/Escape flows verify real queued observer suppression in every language. Reviewed captures: `/private/tmp/galactica-parity/tutorial-runtime-{before,after}`. Logs: `/private/tmp/galactica-tutorial-runtime-{tests,native-tests}.log`, `/private/tmp/galactica-tutorial-runtime-{before,after}-<language>.log` and `/private/tmp/galactica-tutorial-runtime-final-<language>.log`. No new strings are exposed; controls remain localized and New Terra/Alpha are source proper names.

This adapter is not installed by normal startup. Tests explicitly bind the isolated tutorial fixture, and rename scenes use an owned-system fixture; they are not a complete tutorial playthrough. Visible lesson text, startup actions, session/file/renderer preservation, complete tutorial saves and picture/sound presentation remain required. The tutorial UI and overall parity/map-generation goal are not complete.

### Game-wide window styling, modality and dragging (user-directed deviation)

Game-wide windows now use a near-white/light-grey gradient, black controls and text, and reflective gold edging. Their outside clicks play the existing clunk and block underlying map actions; their own view/focus controls can still move the map. Events remains dark and non-modal. Title dragging covers object and game windows plus startup/file dialogs and foreground reports. Application window positions persist in native/browser configuration and are constrained to the current viewport; the existing resizable table geometry preferences remain supported.

Both release and development PDG full suites pass: 1214 tests each. Actual browser before/after captures and click/drag checks cover all six supported languages under `/private/tmp/galactica-parity/gold-{before,after}`. Reload and smaller-port checks verify configuration restoration and bounds. See `docs/reference/WINDOW_BEHAVIOR.md` for the window classification and configuration keys.

### Consistent button shortcut hints and lighter outlines (user-directed UI refinement)

All existing button shortcuts now use the compact, small right-aligned hint style from icon buttons, including translated Start/Close labels and startup title editing. Labels and hints are measured separately; multi-character icon hints receive enough space, and normal click/keyboard routes are preserved. White-button outlines and non-modal window borders use 50% alpha. Modal gold borders retain their accents.

Both full suites pass: 1218 tests with release PDG and development PDG. Browser before/after captures cover startup/name entry, owned inspectors, Settings, Compare Players, the command menu and Events in all six languages, with actual resized-button clicks, printable shortcuts and small viewport checks. Captures live under `/private/tmp/galactica-parity/button-hints-{before,after}`; test logs are `/private/tmp/galactica-button-hints-{tests,native-tests}.log`.


### Temporary tutorial session ownership

Verified the v3 hide acknowledgment and startup window exceptions in
`Galactica.cpp:2176–2238` and the fixed tutorial's removed file association in
`GalacticaSingleDoc.cp:275–299`. Added a session owner that captures/restores the
current application, binds the actual setup/name buttons to source lessons, and
installs the fixed galaxy as a temporary document. It preserves ordinary open
games, IDs, files, renderer/camera, unfinished setup and autoplay ownership;
construction/attachment failures clean up and restore the original application.
The Tutorial title uses all six languages. No menu entry advertises this partial
feature. Visible sixty-lesson instruction UI/text, full tutorial saves, scoped
randomness and sound/pictures remain unfinished; the tutorial row is still Partial
functionality/Missing UI and the broader parity/map-generation goal remains active.

Nine lifecycle regressions plus the tooltip placement regression bring both full
suites to 1,228 passing tests. Actual Chrome setup/name clicks, the temporary
42-system game and cancellation/restoration pass in en/de/es/fr/ja/ru. The
original game serializes identically after its initial map rendering, both during
the tutorial and after return. Initial rendering lazily creates fog-of-war map
aliases, so the browser snapshot is taken after that ordinary rendering step.
Inspected original/restored views, name dialog and all six tutorial maps under
`/private/tmp/galactica-parity/tutorial-session`; logs are
`/private/tmp/galactica-tutorial-session-{tests,native-tests,<language>}.log`.


### Animated map navigation

Applied the requested modern UI deviation to the shared camera navigation path: jumps now use a 240ms whip pan with quintic acceleration/braking. Home, Center, system/fleet tables, event/report navigation, attention and tutorial focus use that path, and Fit/Reset animate their positional changes. Retargeting begins at the sampled current pose; dragging, scroll positions and anchored zoom cancel motion. Initial framing and reduced-motion preferences remain immediate. Rendering and inverse transforms use the same camera pose, including background parallax and map scroll bars. No strings or simulation randomness change.

Five regressions cover exact landing, inverse transforms during movement, continuous retargeting, manual-control interruption, initial/reduced-motion behavior and fit/reset. Both full test lanes pass all 1,233 tests. Actual browser Home, double-clicked system comparison and event Go to controls pass in all six languages, with precise final centering and manual interruption. Before/after and timed start/mid/end screenshots were inspected under `/private/tmp/galactica-parity/whip-pan-{before,after}`; logs are `/private/tmp/galactica-whip-pan-{tests,native-tests,<language>}.log`. Tooltip surfaces are separately committed as white at 75% alpha with 4px corners. The parity and Map Generation checklists remain active.


### Bounded source combat damage rolls

A tutorial RNG audit found that ship and system attacks added three raw native
`pdg.rand()` values, allowing damage far above attack strength. Restored the
exact `AGalacticThingy.cpp:848–854` formula with three independent bounded rolls
of 100, 98 and 99, plus 3, divided by 300 and truncated. `GenericUtils.cpp:27–30`
confirms `Rnd(max)` is modulo; the largest possible base attack is therefore
99% of attack strength. The existing docked Patrol bonus is applied afterward,
matching `CShip.cpp:239–249`. This corrects actual combat for ordinary and tutorial
games; it changes no text, drawing or random-call count.

Two regressions cover native-sized values, distinct roll bounds, exactly three
samples, extreme damage and 200 real seeded attacks across ships and systems.
Both full suites pass all 1,235 tests. Real browser fleet arrivals exercise
private winner/loser reports, Events → View report → Go to and surviving/remembered
focus in en/de/es/fr/ja/ru. Before/after report screenshots and all-language
winner/loser views were inspected under
`/private/tmp/galactica-parity/combat-roll-{before,after}`; logs are
`/private/tmp/galactica-combat-roll-{tests,native-tests,<language>}.log`.
The tutorial's separate random stream, visible lessons, full saves and
presentation resources remain unfinished; parity and Map Generation remain active.


### Private tutorial random stream

`GalacticaSingleDoc.cp:285–291` loads the fixed tutorial file, removes its file
association and supplies seed 101. The modern port now owns a seed-101 portable
Park–Miller stream on each tutorial game; it does not reseed, replace or consume
the global PDG stream. Combat, AI utilities, random skill selection and AI skill
variation use their owning game. Ordinary games retain existing PDG calls and
bounds. Graph saves retain the private stream, validate corrupt state and accept
older ordinary documents without it. This is a portable modern sequence, not a
claim of byte-for-byte identity with the legacy platform's random library.

Seven regressions include an independent known sequence, real tutorial turns and
combat with global rolls forbidden, actual native RNG continuation, every AI
random-helper path, ten simulated turns with an added non-research enemy colony
that exercises random hull selection, private save continuation and corrupt/old
save handling. Both full lanes pass all 1,242 tests. The unmodified early tutorial
turns do not consume RNG, so browser isolation also explicitly exercises actual
ship/system damage rolls: the baseline consumes six global values; the new code
consumes zero and leaves the next eight native results identical after restoring
the original game. Actual setup/name clicks, four processed turns, saved-stream
continuation and original-game restoration pass in en/de/es/fr/ja/ru. All-language
maps and before/after/original/restored screenshots were inspected under
`/private/tmp/galactica-parity/tutorial-random-{before,after}`; logs are
`/private/tmp/galactica-tutorial-random-{tests,native-tests,<language>}.log`.

No visible strings change. Visible lessons, complete tutorial save/resume,
source picture/audio presentation and the full walkthrough remain unfinished;
this item does not complete the tutorial, parity or Map Generation checklists.


### Tutorial lesson attention cue

Audited `GalacticaTutorial.cp:443–453`: each LoadPage plays its nonzero sound,
with -1 resolving to tutorial attention resource 7000. The shipped English and
German resources contain identical samples. The sound importer now accepts
`--tutorial /path/to/v3` and reproducibly preserves all 3,824 unsigned PCM bytes
at 10,000 Hz in `data/tutorial/sounds/7000.wav`; source and converted hashes are
recorded in its manifest. Regeneration also reproduced the twelve existing
normal-game WAVs and their manifest byte for byte.

The session owner uses the application sound service on lesson entry, respects
source-silent pages and the persistent Sound setting, and stops owned playback
on completion/cancellation, including cancellation before hiding a game. Muted
entries are never replayed merely by enabling sound. Four new regressions cover
sample provenance/native loading and real session progression/cleanup; both
full lanes pass all 1,246 tests. Packaged browser checks decode the 0.3824-second
sample and observe real playback progress, actual setup/name button cues, silent
lessons, mute and cancellation in en/de/es/fr/ja/ru. Reviewed before/after tutorial
and restored-game screenshots under `/private/tmp/galactica-parity/tutorial-sound-{before,after}`.
Logs: `/private/tmp/galactica-tutorial-sound-{tests,native-tests}.log` and
`/private/tmp/galactica-tutorial-sound-after-<language>.log`.

No visible text changes and the cue is identical in all languages. Instruction
rendering, six-language lesson text/art, full tutorial save/resume and a complete
guided walkthrough still remain. The tutorial and broader parity/map-generation
checklists are not complete.


### Compact system and ship inspectors

Applied the requested v4 deviations: removed Rendezvous and Pause build from
system context menus, removed public pause actions/X, and removed the Continuous
caption. Build-button tooltip headings now say “Switch to building {type}”.
Locks retain their hit regions but draw only the cached glyphs, shifted up two
pixels. The compact = button sits to the right of the three sliders at their
vertical midpoint; its = shortcut preserves locked shares and actual production.
+ still zooms. Owned systems show an inline Send to row in the old Position slot,
with measured Set/Clear buttons separated by the same four-pixel gap as locks
from the slider control. Long Unicode destinations ellipsize before the buttons.
System and ship coordinate rows are commented out for potential reuse.

Inspector triangles now draw after the panel, match its owner/neutral gradient,
cover the straight seam and outline only their exposed sides. Shorter inspector
heights remove the old footer gap. All new strings and changed manual instructions
are supplied in en/de/es/fr/ja/ru. Regressions cover removed menu/actions, actual
= key behavior, locked allocations, actual-output preservation, destination
routing and localized long-name bounds. Both full suites pass 1,248 tests.
Actual browser mouse/keyboard checks pass in all six languages for locks,
equalize, removed X, Set/map target/Clear, localized build hints and production
window shortcuts. Before/after system/ship screenshots, both pointer orientations,
translated tooltips and long destination layouts were inspected under
`/private/tmp/galactica-parity/compact-inspector-{before,after}`. Logs:
`/private/tmp/galactica-compact-inspector-{tests,native-tests}.log` and
`/private/tmp/galactica-compact-inspector-after-<language>.log`.

These explicit UI deviations supersede the earlier pause/coordinate descriptions;
remaining tutorial, parity and Map Generation items remain open.


### Bookmatched nebula background

Background repeats now alternate horizontal and vertical reflection using PDG's
public image/Quad rendering. Tile identity is anchored to the original image,
including negative offsets, so orientation is continuous across pan/repeat
boundaries. Adjacent tiles meet the same source edge on both axes. Scaling,
zoom-dependent parallax, reduced motion and the Nebula toggle retain their
existing behavior; no image asset, UI text or simulation random stream changes.

The new regression verifies both seam orientations and tile parity over eight
positive/negative whole-tile shifts. Existing edge coverage checks still cover
landscape, portrait and square art/viewports and extreme panning with at most
four draws. Both full suites pass all 1,249 tests. Actual browser before/after
seam, whole-repeat, tiny boundary-crossing and normal-game captures were inspected
under `/private/tmp/galactica-parity/bookmatched-background-{before,after}`;
all six language runs pass. Pixel comparisons show zero difference between
reflected strips at both seams and offsets 1/10/50/100 pixels from them, versus
baseline seam differences of 25.74 and 15.81 on an 8-bit channel scale. A 0.1px
pan across a repeat boundary changes the full-frame mean by only 0.119 in every
language. Evidence: `/private/tmp/galactica-bookmatched-background-pixels.json`
and `/private/tmp/galactica-bookmatched-background-{tests,native-tests}.log`.
This completes the requested background treatment; the remaining parity,
tutorial and Map Generation requirements are still open.


### Tutorial completion retains the practice document

Source audit of `GalacticaTutorial.cp:111–116,498–520` shows that completion
closes the instructions and releases tutorial resources without closing the
practice game. Corrected v4's previous completion cleanup: it now promotes the
accepted temporary game into an unsaved ordinary open document, preserves its
graph/renderer/camera/private RNG and removes the runtime wrappers and scripted
production safeguards. Prior games and their file associations remain in Open
games. Cancellation and failures still restore the suspended application; a
completion request before accepting a practice game creates no document.

Both full suites pass: 1,253 tests each with release and development PDG. Actual
Chrome startup/name clicks, final controller completion, ordinary continuation,
save/restore and switching to the previous game and back pass in en/de/es/fr/ja/ru.
The previous graph serializes identically before switching; selecting an open
game deliberately closes its Events panel under the existing session behavior.
Before/after and six-language screenshots were inspected under
`/private/tmp/galactica-parity/tutorial-completion-{before,after}`. Logs:
`/private/tmp/galactica-tutorial-completion-{tests,native-tests}.log` and
`/private/tmp/galactica-tutorial-completion-{before,after}-<language>.log`.

No new visible strings. Browser fixtures explicitly enter the still-hidden
session and advance the controller to its final lesson; this is a completion
lifecycle check, not a full guided tutorial playthrough. Visible instruction UI,
six-language lesson resources/art and complete tutorial save/resume remain open;
this item does not complete the broader parity or Map Generation checklists.


### Map destination controls and inline name editing

Implemented the requested v4 UI refinements. System destinations and course
waypoint targeting use a crosshair and a 50% alpha line to the current mouse
position; extending a course starts at its preceding waypoint. Rendezvous
placement also uses a crosshair. Browser cursors use CSS, native cursors use
cached PDG software images, and finishing/cancelling/restoring sessions resets
the cursor. Set/Clear are six pixels shorter; Send to shares the other diagnostic
labels’ style and value alignment. Clear is absent without a destination.

Ships in system and Exchange ships are now the final radial actions and appear
only for accessible completed ships/fleets. Empty and unfinished-only systems
show neither; enemy knowledge gates remain respected. Colony’s shortcut hint is
capital C. The old inspector footer button is no longer drawn.

Rename overlays the map label with a white field and black text at 150% map-name
size. Initial selection permits replacement; Unicode caret movement, clicking,
backspace/delete and long-name viewport limits use a draft. Escape leaves the
original name/event history unchanged; Return/Enter accepts it. PDG End is code
3, so the previous code-3-as-Enter convention was corrected for this editor.
Owned systems, ships, fleets and rendezvous points share the control. The field
is anchored to its object and has no draggable title or separate Save/Cancel.
Help and all six manuals describe the new behavior in en/de/es/fr/ja/ru.

Both complete unit suites pass: 1,259 tests each with release and development
PDG. Actual Chrome checks pass in all six languages for radial list clicks,
Set/map/Clear, targeting and cancellation, draft rollback, clicked caret, End and
backspace, Return/keypad Enter, native-script input and all four object renames.
Before/after, six-language radial menus and inline editors were inspected under
`/private/tmp/galactica-parity/map-edit-{before,after}`. Logs:
`/private/tmp/galactica-map-edit-{tests,native-tests}.log` and
`/private/tmp/galactica-map-edit-{before,after}-<language>.log`. All six manuals
parse with their seventeen chapters retained. Actual native cursor appearance
still requires a connected native display; the browser appearance/behavior and
both native model suites were checked. The overall parity, tutorial presentation
and Map Generation checklists remain active.


### Complete six-language runtime tutorial texts

Added runtime presentation resources for all sixty source lessons, recovery pages
100/101/103 and macOS variants 1001/1002/1060. Every supported language has all
texts, headings and instruction buttons; there is no English-only runtime docs
reference dependency. Common source action controls, sounds and picture IDs match
the shipped English and German resources. The metadata tool regenerates identical
bytes. Text follows the original teaching sequence while describing v4’s actual
sliders/locks/=, report acknowledgment, Scout couriers, rendezvous placement,
Set destinations, command-menu comparison, fleet exchange and retained practice
game. Proper names New Terra and Alpha remain stable tutorial identities.

The validated loader reads the chosen packaged language, refuses blank/missing
translations and corrupt control destinations, and returns independent pages.
The existing hidden session entry defaults to it. Six regressions bring both full
suites to 1,265 passing tests on release and development PDG. Browser virtual-FS
loading and the real setup/name/install/completion/continue/switch flows pass in
all six languages under `/private/tmp/galactica-parity/tutorial-lessons`; logs are
`/private/tmp/galactica-tutorial-lessons-{tests,native-tests,<language>}.log`.

The lesson text is not rendered yet; these browser fixtures exercise the hidden
entry and final-controller completion, not a complete guided playthrough.
Instruction-panel rendering, lesson illustrations, language-switch refresh,
public launch controls and complete tutorial saves remain required. The tutorial
row and broader parity/Map Generation goal remain incomplete.


### Floating localized tutorial instructions

Audited v3 `GalacticaTutorial.cp::LoadPage` (108–160, 275–395) and its
button/progression behavior. Added a floating instruction renderer over the
actual setup and practice game. It reuses the bright neutral gradient and gold
edging, presents only the source page's forward button and leaves map/setup
actions accessible. Text is measured and wrapped for every localized page,
with scrolling for short ports and side placement to avoid covering current
controls. Title dragging is constrained and persisted. Instruction clicks
retain pointer capture through page changes and cancellation; file/error
dialogs retain foreground priority.

Changing language reloads presentation without changing source control
destinations, action-button presence, current page, timer, dynamic rendezvous
identity or practice turn, and without replaying entry effects or sound.
English, German, Spanish, French, Japanese and Russian use their complete
runtime resources.

Eight regressions cover all 66 records in all six languages at ordinary and
narrow sizes, action-only waits, Unicode wrapping, outside clicks, constrained
remembered dragging, scrolling, cancellation, live translation and centered
system-window visibility. Both full native lanes pass all 1,273 tests. Actual
browser checks click instruction/setup/name controls, exercise renderer-driven
zoom progression, preserve action waits, drag/reopen positions, cancel an
installed practice game, complete a finale lifecycle fixture and reopen the
previous document in all six languages. Settings clicks also change the live
lesson through all six languages without advancing it or replaying cues.

Before/after and localized screenshots are reviewed under
`/private/tmp/galactica-parity/tutorial-panel`; the baseline is
`/private/tmp/galactica-parity/tutorial-lessons/en/tutorial.png`. Logs are
`/private/tmp/galactica-tutorial-panel-{tests,native-tests,<language>}.log`.
These checks prove instruction presentation and integration, not a complete
sixty-lesson guided playthrough. Public launch controls, illustrations and
complete tutorial save/resume remain open; broader parity and Map Generation
requirements remain open.


### First tutorial report acknowledgment

A real browser walkthrough found that Enter in the first stardock report
reached the end-turn confirmation path. Confirming discarded reports and
advanced to turn 3 before the first colony ship could receive orders. V3
`CMessage.cpp:241–257, 916–942` separates message appearance and movable-alert
acknowledgment from turn processing. Corrected keyboard precedence for lab
and stardock presentations, matching report/outcome acknowledgment; an explicit
foreground end-turn confirmation still takes priority. Tab remains attention
navigation and cannot bypass an open report. The End key is not treated as
Enter for paginated report/outcome confirmation.

The class/outcome continuation hint now includes Enter in all six languages.
The first attention lesson explains acknowledging remaining reports before
using Tab. Actual browser input starts from setup, zooms, changes production,
ends turn 1, acknowledges the class and opponent reports, and selects the first
colony ship with Tab, still on turn 2, in en/de/es/fr/ja/ru. Screenshots before
and after are reviewed under `/private/tmp/galactica-parity/tutorial-guided-before`
and `/private/tmp/galactica-parity/tutorial-report-input`. Logs:
`/private/tmp/galactica-tutorial-report-input-{tests,native-tests,<language>}.log`.
Both full native lanes pass all 1,275 tests, including report queues, confirmation
cancel/review and tutorial input progression.

The continued English walkthrough reaches lesson 28 through real controls. It
then exposes a separate attention issue: a new defense satellite is selected
before the colony ship, although satellites cannot receive movement orders.
That is the next repair, not an unavailable-help blocker. The full guided
walkthrough, public launch, illustrations, complete tutorial saves, broader
parity and Map Generation remain unfinished.


### Construction notifications for ships that need orders

Audited v3 `CStar.cpp:801–803, 823–828, 899–908, 916–931`: satellites set
`notify=false`; a mobile ship with the system's automatic destination also
suppresses the built-ship request. First-class stardock announcements remain
independent. Updated ordinary construction to use those same rules. The notify
choice is captured before immediate movement, so arriving at a nearby automatic
destination does not accidentally turn into a build-time order request. Mobile
ships without automatic destinations still appear in attention. Normal course
completion and other arrival events retain their separate attention rules.

The old satellite-build attention regression asserted behavior contradicted by
the shipped source. It now commissions a real satellite, verifies its first-class
report, acknowledges that report and verifies no stationary ship requests orders.
Three additional regressions cover repeated satellites, far/near automatic
destinations and mobile ships without automatic destinations. Both complete
native lanes pass all 1,278 tests.

Actual six-language browser runs follow the tutorial from setup through report
acknowledgment, first colony orders, defense construction, colony naming and
New Terra's building controls. Next item now selects the original colony ship
at lesson 28, on turn 4, with no satellite request preceding it. Before/after
screenshots are reviewed under `/private/tmp/galactica-parity/tutorial-guided-after`
and `/private/tmp/galactica-parity/tutorial-build-notify`; logs are
`/private/tmp/galactica-tutorial-build-notify-{tests,native-tests,<language>}.log`.
There are no changed visible strings; existing en/de/es/fr/ja/ru reports remain
resource-driven.

Continuing the actual English walkthrough reaches lesson 34, where acknowledging
the new Scout class leaves Andromeda selected rather than the Scout. That next
action-selection repair still needs source verification. These construction
checks do not prove a full guided tutorial. Public launch, illustrations, full
tutorial saves, the remaining parity inventory and Map Generation remain open.


### Automatic first attention after turn reports

Audited v3 `GalacticaDoc.cp:1449–1453, 2648–2673`: completed-turn activation
and resumed playback call `ShowMessages`, then `ShowNextNeedyThingy`. V4 now
presents one queued non-modal attention request after reports finish, deferred
to drawing so callbacks complete first. Foreground dialogs and active map
interactions defer it; manual attention navigation suppresses a second jump;
quiet autoplay does not navigate. Saves preserve the deferred action, while
older saves without it preserve their selection and do not invent a new jump.

A report previously handled its event and then consumed another attention
entry by selecting the same subject. V3 handles one entry at a time
(`GalacticaDoc.cp:3044–3077`, `CMessage.cpp:869–874`). Report focus and explicit
attention now handle only their own entry. Colony regressions verify that
acknowledging the colonization report leaves the private naming/production
request pending; visiting that request handles it separately, including after
save/load. Additional checks cover shared subjects, modal/report deferral,
manual navigation, quiet playback and old/corrupt saves.

Both complete native lanes pass all 1,285 tests. Real browser input in
en/de/es/fr/ja/ru walks from setup through lesson 34 and issues Scout orders to
New Terra, reaching lesson 35. Reviewed before/after screenshots are under
`/private/tmp/galactica-parity/tutorial-build-notify/en/page-34.png` and
`/private/tmp/galactica-parity/tutorial-turn-attention/<language>/page-34.png`;
logs are `/private/tmp/galactica-tutorial-turn-attention-{tests,native-tests,<language>}.log`.
No visible strings changed; existing localized instructions remain resource-driven.

A continued English browser walkthrough reaches lesson 41 and encounters a
map-selection problem in the automatic-destination step. Its cause still needs
investigation; it is not documented as an unavailable-help blocker. Public
launch, full guided verification, illustrations, complete tutorial saves, the
remaining parity inventory and Map Generation remain unfinished.


### Tutorial names target the correct object kind

V3 names the newly created rendezvous directly (`GalacticaDoc.cp:723–747`).
V4's tutorial rename effect searched stars before rendezvous points using only
numeric ID, so creating Alpha also renamed the unrelated star with the same ID.
Rename events/effects now identify the object kind. New Terra only resolves a
star; Alpha only resolves its rendezvous. A matching ID on a different kind
cannot force a name or advance the naming lesson. Regression tests reproduce
both kinds of collision and prove unrelated names remain unchanged.

The automatic-destination walkthrough failure at lesson 41 was test input:
Alpha overlaps the docked Scout, and the test omitted choosing Alpha from the
visible object picker. The corrected real input reaches lesson 42, sets the
home system's destination to the actual rendezvous and verifies all unrelated
star names against their setup values. Six-language screenshots are reviewed
under `/private/tmp/galactica-parity/tutorial-rename-identity/<language>`;
before screenshots are under
`/private/tmp/galactica-parity/tutorial-turn-attention/full-en/page-41.png`.
Logs are `/private/tmp/galactica-tutorial-rename-identity-{tests,native-tests,<language>}.log`.
Both complete native lanes pass all 1,287 tests. No user-facing strings changed;
existing en/de/es/fr/ja/ru names and instructions remain resource-driven.

The continued English walkthrough reaches lesson 57 with another system
selected instead of the newly built fleet. Source verification and an actual
fleet-contents transition remain required. Public launch, full guided validation,
illustrations, complete tutorial saves, the broader parity inventory and Map
Generation remain open. No unavailable-help blocker has been established.


### Process disabled enemy reports before attention

V3 `GalacticaDoc.cp:1629–1633` marks disabled enemy autoshow messages handled
without selecting them. V4 skipped their windows but retained the requests,
so tutorial lesson 55's playback change allowed an enemy colony to take the
first attention selection instead of the new Alpha fleet. Skipped automatic
observer reports now finish without a camera or selection change, both when
draining queued playback and when processing disabled playback. Manual replay
remains available, and manual-only fleet notices retain their separate behavior.

Tests cover queued and unqueued skips, retained manual replay, save/load,
re-enabling without replaying processed reports, fog-dependent newly visible
reports, and an actual fleet formation followed by late acknowledgment,
automatic fleet selection and opening contents. Both full native lanes pass
all 1,290 tests.

Real browser input now completes the entire normal guided route in
English, German, Spanish, French, Japanese and Russian: actual setup and name
entry, production, orders, colony naming, rendezvous creation, automatic
destinations, reports, attention, comparison, fleet contents and Finish. The
hidden internal entry launches the test; no lesson jumps, selected-object
assignments or simulation mutations replace the guided actions. Optional
recovery routes and startup exceptions retain separate unit/runtime coverage.
Before/after screenshots are reviewed under
`/private/tmp/galactica-parity/tutorial-final-before/en/page-57.png` and
`/private/tmp/galactica-parity/tutorial-skipped-observers/<language>/page-58.png`.
Logs are `/private/tmp/galactica-tutorial-skipped-observers-{tests,native-tests,<language>}.log`.
No visible strings changed; existing en/de/es/fr/ja/ru reports/instructions remain
resource-driven. Public launch, illustrations, full tutorial save/resume,
the remaining parity inventory and Map Generation remain unfinished.


### Public tutorial launch on startup and in-game

Audited v3 `Galactica.cpp:2176–2215`: a map launches the existing-game hiding
page, ordinary startup launches Welcome, and modal setup/name exceptions remain.
The visible Tutorial startup button and command-menu entry use the established
owner with the correct context, including preserved ordinary documents and
cancellation. The menu closes before capture; duplicate launch commands are
unavailable while instructions are active. The startup control shares the bottom
row with Open Game/Cancel without overlapping other controls. Title 960 is
already localized; new launch-help string 964 is supplied in en/de/es/fr/ja/ru.
README now explains launch, cancellation and Finish.

Both complete native lanes pass 1,292 tests, including real menu actions,
duplicate prevention, restoration and layout reachability at 800×600, 640×480
and 320×340. Actual six-language browser input launches from each public control,
starts practice and cancels, proving previous game/renderer/session/document/file
identity is preserved. Before/after screenshots are reviewed under
`/private/tmp/galactica-parity/tutorial-launch-before/en` and
`/private/tmp/galactica-parity/tutorial-launch/<language>`; logs are
`/private/tmp/galactica-tutorial-launch-{tests,native-tests,<language>}.log`.
A complete English walkthrough from the public startup button reaches Finish
and verifies practice is retained as a normal unsaved document with tutorial
runtime/simulation removed (`/private/tmp/galactica-tutorial-public-guided-en.log`).

Tutorial illustrations and complete tutorial save/resume remain open, alongside
the broader parity inventory and Map Generation. Launch availability does not
claim the full tutorial or project checklist complete.


### Localized tutorial illustrations

Audited all fifteen PICT IDs referenced by the sixteen illustrated source pages,
including welcome/macOS alternatives. Added modern teaching figures for each:
New Game, actual/target production, End Turn, Orders, rubber-band course and
crosshair, Defense, rendezvous placement, Equalize, Send to/Set, health bars,
fleet members, Patrol and Exchange ships. The existing source picture IDs remain
in runtime metadata. Figures use cached reusable Attributes and the same live
localized labels as the real controls, so en/de/es/fr/ja/ru switching updates the
illustrations without replaying lesson effects.

Floating instructions reserve figure space separately from scrolling text and
footer controls. An actual browser run exposed that the larger Orders lesson
covered the real Orders button; placement now includes context controls and
prioritizes keeping them exposed. Tests cover this concrete regression, all
source IDs, all languages, narrow layouts, picture clicks and drawing reuse.
Both complete native lanes pass all 1,295 tests.

The full normal tutorial route from the public startup button completes through
Finish in all six languages with illustrations enabled. Reviewed before/after
lesson screenshots are under `/private/tmp/galactica-parity/tutorial-public-guided/en`
and `/private/tmp/galactica-parity/tutorial-illustrations/<language>`; all-picture
galleries are under `/private/tmp/galactica-parity/tutorial-illustration-gallery/<language>`.
Logs are `/private/tmp/galactica-tutorial-illustrations-{tests,native-tests,<language>}.log`
and `/private/tmp/galactica-tutorial-illustration-gallery-<language>.log`.
Complete tutorial save/resume, the remaining parity inventory and Map Generation
remain open; this does not mark the tutorial or project fully complete.


### Tutorial save behavior: source audit correction

The earlier entries above repeatedly described complete tutorial save/resume as
required parity work. That claim was unsupported: the shipped v3 source saves
the practice game, not the instruction session. It must not be used as evidence
that v3 offers a resumable tutorial after quitting and reopening the application.

`Classes/GalacticaSingleDoc.cp::DoSave` (350–478) writes the ordinary saved-game
header, player/game settings, map, objects and needy messages. Its reserved
expansion bytes are zeroed (389–392). `ReadSavedTurnFile` (482–827) restores those
same structures and skips the expansion bytes (547–548). Neither path stores
or loads a lesson number. `GalacticaTutorial.h` (185–257) holds `mPageNum`,
`mNextPageNum`, instruction-window bindings and waiter state in memory; it has
no persistence API. `Galactica.cpp::OpenDocument` (1945–1981) distinguishes a
tutorial resource file, which launches instructions, from an ordinary saved game,
which opens a `GalacticaSingleDoc`. Loading the shipped fixture during tutorial
setup (`GalacticaSingleDoc.cp:280–296`) is not tutorial-progress restoration.

While instructions remain active in the same application, v3's
`GalacticaDoc::ShowWindow` (2638–2651) reassigns their commander to the document
being shown, including after `DoRevert` (832–858). Save/Open/Revert are not
specially disabled by the tutorial in the inspected command-status handlers.
This is distinct from persisting progress across application launches.

V4 already serializes the practice graph and private random-stream state through
ordinary Save. It does not persist the instruction runtime, matching the audited
save format's scope. However, `main.js::installSavedGame` and `revertSavedGame`
currently replace the game/display without updating the active tutorial owner.
That lifecycle defect remains concrete, open parity work: verify and repair
instruction bindings when loading or reverting during an active tutorial, without
inventing a v3 cross-launch resume feature. The tutorial row remains Partial;
other parity and Map Generation requirements remain open. This entry supersedes
older statements requiring complete tutorial save/resume, not their recorded
implementation or test results. No runtime behavior was changed in this audit.

Validation for this documentation-only correction: both complete native-runtime
lanes passed all 1,295 tests, with zero failures. Logs:
`/private/tmp/galactica-tutorial-save-audit-tests.log` and
`/private/tmp/galactica-tutorial-save-audit-native-tests.log`. No rendered UI was
changed, so existing tutorial screenshots remain applicable.


### Revert keeps active tutorial bindings

V3 rebuilds a reverted document and calls `GalacticaDoc::ShowWindow`, which
reassigns the active tutorial commander (`GalacticaSingleDoc.cp:832–858`,
`GalacticaDoc.cp:2638–2651`). V4 now routes Revert through the tutorial owner
when its practice document is active. It keeps the same instruction controller,
lesson, wait deadline and captured actor identities, replaces the graph/display
and file reference in the temporary session, and attaches actions to the restored
game. The scripted production helper remains active until Finish. Old runtime
wrappers are removed and the old renderer is disposed only after successful
replacement; binding failure restores the previous game/runtime/session.

Three lifecycle regressions verify restored bindings and timed progression,
failure rollback, cancellation restoring the original document, and Finish
promoting the reverted graph with its saved-file association. Both full native
lanes pass all 1,298 tests. Logs:
`/private/tmp/galactica-tutorial-revert-{tests,native-tests}.log`.

Actual browser mouse input follows the public Tutorial launch, File menu,
Revert confirmation, instruction buttons and zoom shortcut in en/de/es/fr/ja/ru.
Every run verifies unchanged lesson 5 after Revert, then progression through
zoom to lesson 8 on the restored display and cancellation back to startup.
The read adapter supplies a serialized practice save; production Revert parsing,
confirmation, document installation and action handling are exercised unchanged.
Reviewed before/after, confirmation and zoom screenshots are under
`/private/tmp/galactica-parity/tutorial-revert/<language>`; browser logs are
`/private/tmp/galactica-tutorial-revert-<language>.log`. Existing localized controls
are reused; no new user-facing text was introduced.

Opening another saved document during active instructions remains a separate
ownership item. This change does not establish cross-launch tutorial resume or
mark tutorial, broader v3 parity, or Map Generation complete.


### Open retains documents and rebinds active instructions

Source audit: v3 `Galactica.cpp:1971–1976` creates another single-player document
for a saved game. Its Open path calls ShowWindow (`GalacticaSingleDoc.cp:251–271`),
which reassigns the active tutorial commander (`GalacticaDoc.cp:2638–2651`).
Opening a save therefore must not leave instructions attached to the previous
map or overwrite the previous document.

V4 now transfers the active runtime to the newly opened saved graph/display
without changing the instruction controller or lesson. The previous practice
session becomes an ordinary retained document, keeping its renderer and any
file association. The opened save receives a distinct ordinary session ID and
retains its file reference. Scripted production applies only to the currently
bound game. Revert on that opened document also rebinds correctly. Finish keeps
the active document without creating a duplicate; Close tutorial restores the
original view while both practice and opened documents remain selectable through
Open Games. Tutorial action bindings and production safeguards are removed from
retained documents when instructions stop. Failed Open binding or application
installation rolls back the active document, retained list and ID allocation.

Four regressions cover independent Open/cancel/selection, Open/Revert/Finish,
binding failure and application-installation failure. Both full native-runtime
lanes pass all 1,302 tests; logs are
`/private/tmp/galactica-tutorial-open-{tests,native-tests}.log`.
Actual browser input in en/de/es/fr/ja/ru launches Tutorial from an existing game,
uses File/Open, reverts the opened save, advances its zoom lesson, closes the
instructions, and selects the retained save through Open Games. The file-picker
adapter provides serialized save bytes; production parsing, installation,
confirmation, action bindings and document selection remain unchanged. Reviewed
before/after and retained-document screenshots are under
`/private/tmp/galactica-parity/tutorial-open/<language>`; logs are
`/private/tmp/galactica-tutorial-open-<language>.log`. No new user-facing strings
were introduced; all existing controls remain localized.

This resolves the previously documented active-tutorial Open ownership defect.
It does not add cross-launch lesson resume or claim that every tutorial exception,
broader parity requirement or Map Generation item has completed its final audit.


### Optional wrong-course recovery: actual input audit

V3 `Classes/GalacticaPanels.cp:562–587` checks the first colony course at
lesson 17. A target other than New Terra's fixed ID 9 skips adding the waypoint
and advances to lesson 18; a correct target forces lesson 19. The source lesson
18 metadata returns to lesson 16, so Retry must restore the Orders step rather
than quietly accepting the rejected destination.

The existing v4 runtime matches this behavior. New six-language browser runs
start from the public Tutorial button and reach lesson 17 through normal setup,
production, reports and attention controls. They click S-7 deliberately, verify
lesson 18 with unchanged waypoints and no destination, click Retry, reopen
Orders through its real button, and target S-20. Every run reaches lesson 19
with the original colony ship's destination referencing the real star ID 9.
No forced lesson jumps or simulated progression events are used. This closes
the actual-UI coverage gap left by the normal walkthrough, which correctly
skips the optional error lesson.

Both full native lanes pass all 1,302 tests, including the existing rejected-
course runtime regression. Logs are
`/private/tmp/galactica-tutorial-recovery-{tests,native-tests}.log` and
`/private/tmp/galactica-tutorial-recovery-<language>.log`; reviewed course,
localized Retry, Orders and success screenshots are under
`/private/tmp/galactica-parity/tutorial-recovery/<language>` for en/de/es/fr/ja/ru.
This was verification of existing behavior, with no runtime or resource changes.

The tutorial UI status is corrected from Missing to Partial: the floating panel,
all lesson resources, illustrations, normal route and optional retry have direct
rendered evidence. Recovery pages 100/101/103 retain model coverage; the hosting
recovery's real entry flow depends on the still-unported multiplayer setup.
That is unfinished project work, not an unavailable-help blocker. No complete
project or Map Generation claim is made by this audit.


### Persistent fullscreen startup restoration

V3 `Classes/Galactica.cpp::SavePrefs` (1333–1337) writes its application fullscreen
preference; `GalacticaRegistration.cpp:257–279` restores it and defaults a fresh
installation to fullscreen. V4 now stores the choice independently of saved games
through browser localStorage or native PDG configuration, retaining that default.
Native startup requests restoration after creating the port. Browser startup
queues it until the first click or key gesture; no pre-gesture request is issued.
Explicit toggles clear queued restoration. Browser fullscreen changes, including
external exits, update the saved choice; rejected requests keep it unchanged.
Native requests are accepted only when the reported actual state matches the
requested state, preventing a backend's false success from replacing the choice.

Five new regressions cover native restoration/persistence, false-success state
mismatch, browser gesture deferral/external exit, explicit-toggle cancellation,
and both preference adapters. The existing native-failure test double now models
actual state separately from request success. Both complete lanes pass all
1,307 tests. Logs: `/private/tmp/galactica-fullscreen-startup-{tests,native-tests}.log`.

Actual browser checks in en/de/es/fr/ja/ru cover fresh fullscreen defaults,
first-click restoration, menu exit, fresh-page windowed restoration, saved
fullscreen restoration by click and keyboard, reload while fullscreen, and
external exit persistence. Reviewed startup/menu/windowed/reload screenshots are
under `/private/tmp/galactica-parity/fullscreen-startup/<language>`; logs are
`/private/tmp/galactica-fullscreen-startup-<language>.log`. Existing localized
fullscreen labels and retry feedback are reused; no new UI strings were added.

Historical native revalidation found three displays. The private development
runtime completed real fullscreen →
windowed → saved-fullscreen → windowed cycles, with preference writes
`true,false,true,false`, using isolated in-memory preferences. The pinned release
runtime reports request success while remaining windowed; the new guard reports
failure and performs no preference write. Evidence:
`/private/tmp/galactica-fullscreen-startup-current-native-ui.log` and
`/private/tmp/galactica-fullscreen-startup-native-ui.log`. The source engine fix
was already committed in the private repository; the claim that it also existed
in the public repository was incorrect. The public backport and current release
gate results are recorded below. Updating the pinned release archive is still
required for native distribution, and broader parity/Map Generation remains
unfinished.


### Separate persistent new-game defaults

V3 `Galactica.cpp:762–771` lists AI skill/advantage, fast game, fog of war,
density and map size as application preferences. `PrefsDialogAttach::CloseDialog`
(848–882) writes them on acceptance, while Cancel does not write.
`CGameSetupAttach.cpp:106–132` reads them for new-game setup. Starting an ordinary
game does not write these six defaults back. `GalacticaDoc::UserChangedSettings`
(1332 onward) applies display/audio choices without replacing current simulation
configuration. This distinguishes preferences from the setup of one game.

V4 now provides Menu → Settings → New game defaults, with six reachable controls,
Save/Enter and Cancel/Escape. Numeric controls cycle through their validated ranges;
fast game and fog toggle. The draft is separate from both persisted defaults and
the active graph. Saved fields apply at fresh startup and subsequent New Game;
ordinary setup overrides do not update the preferences. Tutorial setup explicitly
bypasses ordinary defaults and its installed game retains the fixed source fixture.
Fresh fast-game and fog defaults match `GalacticaRegistration.cpp:310–311`.
Map size/AI baseline choices retain v4's existing setup values.

Preferences use independent browser/localStorage and native PDG configuration
adapters, store only the six fields, validate stored values individually and
fall back safely for malformed or inaccessible storage. Titles, player counts,
individual AI assignments and autoplay settings are not persisted by this panel.
The new window uses shared modal chrome, constrained persistent title dragging,
button styling and localized help. Title/help strings 965/966 are provided in
English, German, Spanish, French, Japanese and Russian; field captions reuse
existing localized setup resources.

Five regressions cover adapter reloads, invalid fields/storage failure, actual
hit targets and draft isolation, Save/Cancel/Enter, range wraparound, refused
unrelated edits, modal input and normal/narrow localized bounds. Both full native
lanes pass all 1,312 tests; logs are
`/private/tmp/galactica-new-game-defaults-{tests,native-tests}.log`.
Actual browser input in all six languages edits every option, cancels without a
write, saves and reopens the draft, verifies unchanged serialized current-game
state, starts another game with the defaults, overrides its fast-game setup
without changing preferences, reloads the application, and starts/cancels the
fixed tutorial without preference contamination. Reviewed before/after, saved,
new-setup, reload and 320×340 screenshots are under
`/private/tmp/galactica-parity/new-game-defaults/<language>`; logs are
`/private/tmp/galactica-new-game-defaults-<language>.log`.

This completes the six new-game preference fields and their in-game entry path.
Startup-wide preference access, other unported preference controls, remaining
v3 parity and Map Generation still require their own audits/implementations.


### Direct numeric preference choices

V3 `CGameSetupAttach.cpp:84–92` binds AI skill, advantage, density and map size
to popup menus. The preference map in `Galactica.cpp:762–771` stores the same
fields. V4's new-game default controls now open direct choice menus for these
four numeric fields; the earlier cycling implementation is superseded. Fast game
and fog of war remain toggles. A dropdown indicator identifies numeric controls.
All allowed values appear at once, with density arranged in two columns so its
ten choices fit compact viewports. Arrow keys move the highlight according to
that layout, Enter selects, and Escape closes only the choice menu. Choosing a
value returns to the existing draft; Save/Cancel still control persistence for
future games, leaving the active simulation unchanged.

Selections are validated against the active field and legal value range.
Rendering caches module imports at initialization, avoiding synchronous browser
module fetches from the menu drawing path. Choice help 967 explains keyboard
selection and the distinct Escape behavior in en/de/es/fr/ja/ru.

Two added regressions cover direct mouse choices, invalid-value rejection,
keyboard navigation/wrapping, menu cancellation without draft mutation and
subsequent Save. They also enumerate every choice in all six languages at
800×600 and 320×340, checking bounds, non-overlap and localized help. Existing
preference adapter/draft-isolation tests remain. Both full native suites pass all
1,314 tests; logs are `/private/tmp/galactica-default-choice-{tests,native-tests}.log`.

The actual browser verification follows Settings → New game defaults, opens
all four menus and directly chooses size 1, density 10, AI skill 1 and advantage
−3. It exercises arrow/Enter selection, Escape dismissal, whole-draft Cancel,
Save/reopen, unchanged serialized current-game state, future setup overrides,
fresh-page restoration and tutorial isolation. The harness rejects runtime
exceptions; before/after and normal/compact menu screenshots are recorded under
`/private/tmp/galactica-parity/default-choice-final/<language>`, with logs at
`/private/tmp/galactica-default-choice-final-<language>.log`.
All six language runs passed without runtime exceptions. The final before/after,
six-language density menus and compact-viewport screenshots were inspected: all
choices remain visible, localized and within the modal panel.
Broader v3 parity, startup-wide preferences and Map Generation remain unfinished.


### Startup-wide Settings access

V3 `Galactica.cpp:1911–1915` always enables `cmd_Preferences`, including when
no document is open; `2299–2301` routes it to `DoPreferences()`. V4 now has a
Settings button on startup and the retained-game New Game setup. It opens the
existing shared Settings and New game defaults panels, with all current drawing,
language, sound and enemy-event preference controls. No new game document,
map or simulation is installed. A cached presentation model with map generation
disabled reuses the existing game/display preference actions and styling.

The panel consumes outside clicks with the clunk sound and blocks game shortcuts,
map scrolling and background input. Its title is draggable, constrained to the
viewport and persisted through the existing window-position adapter. Escape
stops an active drag before closing; in numeric choices it cancels only that
menu, and in the defaults draft it cancels without writing. Save keeps the
currently displayed setup and retained game unchanged; future setups and fresh
launches read the saved defaults. Settings labels, native-script language choices,
hover help and buttons reuse translated resources in all six languages. The
six local manuals now explain the startup entry and draft/isolation behavior.

Two regressions cover distinct nonoverlapping startup controls, localized help,
no map construction, modal shortcuts/outside clicks, saved window placement,
preference Save/Cancel, cached reopen and unchanged current-game/setup data.
Both full unit lanes pass 1,316 tests; logs are
`/private/tmp/galactica-startup-settings-{tests,native-tests}.log`.

Actual Chromium runs pass in en/de/es/fr/ja/ru, rejecting runtime exceptions.
They use startup Settings before any game exists, switch languages, drag beyond
the viewport and verify clamping/persistence, exercise blocked shortcuts and
outside clicks, Save/reopen/Cancel defaults, preserve the unfinished setup,
reload to apply saved defaults, and reopen Settings from New Game while
retaining an unchanged serialized original document. Before/after startup,
localized panels, defaults and CSS-scaled 320×340 screenshots were inspected.
The compact check explicitly asserts that Settings opened; mouse coordinates
are scaled to the canvas's displayed size. Actual screenshots are under
`/private/tmp/galactica-parity/startup-settings-final/<language>`, with logs at
`/private/tmp/galactica-startup-settings-final-<language>.log`. The packaged app
includes all six updated manuals at
`/private/tmp/galactica-startup-settings-packaged-app`.

Broader preference controls, the pinned native runtime update, remaining v3
parity and Map Generation remain unfinished.


### Persistent new-colony production and hull preferences

V3 `Galactica.cpp:781–784` stores hull, growth, ships and technology in the
application preferences. `PrefsDialogAttach::CloseDialog:848–882` writes only
on acceptance; `GalacticaDoc.cp:1375–1398` corrects the three allocations to a
sum of 1000 using equal shares and a growth remainder.
`GalacticaSingleDoc.cp:222–248` applies these values to the local human when
preferences change, and `602–626` reads them when opening a saved game.

V4 now persists these four fields in separate native/browser adapters. Typed
validation preserves valid hulls, requires complete allocations, applies the
source normalization when safe and otherwise falls back to 334/333/333.
The existing colony editor reads the latest application defaults, saves them
and applies them to its captured human player, and leaves existing-system
allocations, AI defaults and ordinary galaxy configuration untouched. Ordinary
new and opened/reverted games read these application defaults for the local
human, as v3 does. The accepted fixed-tutorial isolation remains: practice
neither reads nor writes these preferences.

Startup and in-game Settings now expose the shared colony editor; Save/Cancel
return there, while the existing direct game-menu entry returns to the map.
Startup supports the same slider dragging. Save/Cancel show the shared Enter/Esc
hints. The previously negative-width compact sliders now have labels above
their tracks, with percentage and adjustment controls to the right. All
controls fit the 320×340 logical viewport. Help 968 and the six local manuals
explain persistence and isolation in en/de/es/fr/ja/ru.

Six regressions cover both adapters/all hulls, input normalization and denied
storage, current/future/opened games, existing-system and AI isolation, Cancel,
latest application defaults on reopen, fixed tutorial isolation, startup slider
dragging and Settings return, plus localized compact geometry. Both full
suites pass 1,322 tests; logs are
`/private/tmp/galactica-colony-preferences-{tests,native-tests}.log`.

Actual Chromium UI checks passed in all six languages without runtime
exceptions. They open the startup Settings editor, edit the coupled growth
slider and hull, Cancel without writes, Save/reopen, create a normal game,
save another set of defaults from its menu, and open an earlier serialized
game through File → Open with a file-picker adapter. The opened game's local
human receives current application defaults while its systems remain unchanged.
Fresh-page reload restores the preferences; the public tutorial still starts
with the fixture defaults and leaves the stored values intact. Before/after
game-editor views, startup edits, saved/reloaded panels and all six compact
layouts were inspected. The compact rendering fixture overrides logical port
dimensions to 320×340; it does not resize the native window. Screenshots are
under `/private/tmp/galactica-parity/colony-preferences/<language>` and baseline
`/private/tmp/galactica-parity/colony-preferences-before/en`; logs are
`/private/tmp/galactica-colony-preferences-<language>.log`. All six updated
manual files are byte-identical in the packaged app at
`/private/tmp/galactica-colony-preferences-packaged-app`.

Other v3 preferences, the packaged fullscreen runtime, remaining gameplay/UI
parity and Map Generation are still unfinished.


### Fullscreen preference control in Settings

V3 `Galactica.cpp:765` lists the fullscreen preference, and the shipped
English Preferences `PPob` 36 (`Resources/gal-en-shareware.r`) contains its
Full Screen checkbox. `GalacticaDoc.cp:1342–1345` applies the preference and
adjusts windows. V4 now exposes the existing fullscreen controller in startup
and in-game Settings as well as the command menu. Selection reflects actual
native/browser state, including external browser exits. Pending/failed requests
are consumed as UI actions, keeping Settings modal. A localized failure message
reserves space above the page controls, preserves the saved preference and
clears after a successful retry. Unsupported backends omit the control. The
existing title dragging, styling, localized caption/help and startup restoration
remain shared; all six manuals describe the new entry and feedback.

A candidate preference Equalize gap was checked before implementation:
`Galactica.cpp:799–811` links and equalizes the sliders while preparing the
dialog. The four shipped English/German shareware/CD Preferences PPob 36
resources contain no `msg_SetSlidersEven` (1001) button. The source confirms
initialization, not a separate preference button to port. Production-panel
equalization remains implemented through the existing = action.

Three added regressions cover Settings entry/state, failed native transitions
and retry without preference writes or modal escape, external state changes,
unsupported controls, startup sharing and six-language error/paging geometry
at 800×600 and 320×340. Both full unit lanes pass all 1,325 tests; logs are
`/private/tmp/galactica-fullscreen-settings-{tests,native-tests}.log`.

Actual Chromium runs passed in en/de/es/fr/ja/ru without runtime exceptions.
They use the startup Settings control for real browser entry/exit and saved
state, verify external exit updates the highlight, inject a rejected request
to exercise the translated failure UI and retry through the same control,
and confirm the unfinished setup remains unchanged. In-game Settings entry/exit
leaves the complete serialized current game unchanged. Fresh-page startup
restores the saved windowed choice and can enter fullscreen through Settings.
Before/after startup Settings, normal-size translated failures/retry and
320×340 logical error layouts were inspected; the compact fixture overrides
port dimensions rather than resizing the native window. Screenshots are under
`/private/tmp/galactica-parity/fullscreen-settings/<language>` and baseline
`/private/tmp/galactica-parity/fullscreen-settings-before/en`; logs are
`/private/tmp/galactica-fullscreen-settings-<language>.log`. The updated manuals
are included in `/private/tmp/galactica-fullscreen-settings-packaged-app`.

The pinned native release still lacks the previously fixed fullscreen engine
behavior. Its packaging update, other preferences, remaining v3 parity and
Map Generation are not complete.


### Public fullscreen engine backport and native release gate

Inspection of public main confirmed that the private fullscreen fix was absent.
Public commit `f95a1d36f` now applies the same implementation and regression spec
as private commit `120fde2946669106c4b21d24194435774d08cfdc`: GLFW changes the
window monitor, GraphicsManager returns actual fullscreen state and uses the
chosen dimensions, and returning to windowed mode restores the default port.
The public commit is local; it has not been pushed or packaged into a release.

The rebuilt public runtime and both C++ test targets compile. All 20 C++ tests
pass, and the targeted fullscreen spec passes its no-monitor failure/default-port
restoration path (one test, five assertions). The connected-monitor path remains
unverified in this execution session. The release script passes 1,464 Node tests
(11,328 assertions), but stops at the native gate: 1,691 tests, 17,319 assertions,
11 failures. Every failure is in GraphicsManager screen validation. Running that
spec against Galactica's original pinned v1.2.0 runtime reproduces all 11 failures
at the same assertions (26 tests, 106 assertions). Both rebuilt public and private
runtimes currently report zero displays; launching the public app through macOS
Launch Services and retrying in a terminal did not provide display access.

This packaging item requires a macOS execution session with native display
access to run connected-monitor transitions and the complete release gate.
Tests were not bypassed. No replacement archive was produced or uploaded, and
Galactica's runtime pin/cache remain unchanged. Historical three-display success
above is evidence for the private implementation, not a current public-runtime
release validation. Full Galactica suites pass against both the original pinned
runtime and the rebuilt public runtime: 1,325 tests in each lane. No game UI or
user-facing strings changed in this backport follow-up.

Evidence: `/private/tmp/pdg-public-fullscreen-{build,spec-runtime,ctest,release}.log`,
`/private/tmp/pdg-public-fullscreen-original-graphics.log`,
`/private/tmp/galactica-public-fullscreen-native.log`,
`/private/tmp/galactica-private-fullscreen-current.log`, and
`/private/tmp/galactica-fullscreen-backport-{tests,public-tests}.log`.
Broader parity and Map Generation work remain active.


### Startup/About source audit for the next preference item

Decoded PPob 22/32 and their referenced picture metadata from all four shipped
English/German shareware/CD-ROM modules. The reproducible importer and reference
retain static attribution, source hashes, shared artwork provenance and distinct
startup/About scrolling timing. Inspected the original splash screenshot: startup
includes a scrolling origin narrative, not just authors and a title. The runtime
port must preserve this narrative and About credits, remember default-on
`ShowSplash`, and integrate actual tutorial recovery. Details and remaining
verification are in `docs/reference/STARTUP_ABOUT.md`. Five importer checks pass
and re-import is byte-identical. Full suites pass against both the pinned release
and rebuilt public PDG runtime (1,325 tests each); logs are
`/private/tmp/galactica-presentation-reference-{tests,public-tests}.log`. No runtime UI or localization changed; the
startup/About presentation and its preference remain unfinished. The music asset
blocker is independent of this implementable presentation work.


### Startup introduction and independent About presentation

Implemented the original startup/About presentation content behind one shared
application modal. A default-on `ShowSplash` preference is stored independently
of saved games; Settings exposes its toggle and About independently. Denied
storage still allows the current-session toggle to change. Startup uses the
original PICT 131 splash art converted from source bytes. About also includes the
original STS/VendorNation logos. The complete origin narrative and credit headings
are localized to en/de/es/fr/ja/ru; original credited names remain proper names,
including Claudio Berni. Image provenance is in `data/presentation/README.md`.

The modal uses the shared light gradient/gold border/black text treatment and
supports constrained title dragging with persistent position. It consumes map
input and pauses autoplay scheduling while open. Startup and About have separate
source scrolling delays/cadences; reduced motion presents static readable text.
Manual arrow paging stops scrolling and makes every line accessible. About opened
from startup Settings returns there; opening it during play preserves the game.
Its triangle/T tutorial entry closes presentation before using the ordinary
existing-game recovery path; actual Close tutorial restores the same game and
unchanged save data. Opening About again cannot duplicate an active presentation.

Five new regressions cover preference persistence/denied storage, lifecycle,
paging/reduced motion, complete six-language content and compact modal geometry.
Both full unit lanes pass 1,330 tests against pinned release and rebuilt public
PDG. Actual browser runs in all six languages cover startup dismissal, paging,
About entry/return, 320×340 logical layout, modal outside clicks, retained normal
game serialization, tutorial entry/cancellation and saved-off reload. English
also checks actual title dragging/clamping and position storage. Compared the
previous setup screenshot with the new introduction; inspected original source
art, desktop/compact About and all six introduction screenshots. Evidence:
`/private/tmp/galactica-presentation-{tests,public-tests,<language>}.log`,
`/private/tmp/galactica-parity/presentation/<language>`, baseline
`/private/tmp/galactica-parity/presentation-before/en`, and
`/private/tmp/galactica-presentation-{review,languages}.png`.

The six manuals and README document the new controls. This implements the core
presentation and preference, not complete startup parity: first-install automatic
tutorial, the configured startup command and accurate application-version
presentation still require work. They are not blocked. Original music remains the
separately recorded missing-metadata asset blocker. Broader v3 parity and Map
Generation work remain active.


### First-install tutorial startup after introduction

V3 `GalacticaRegistration.cpp:171–179` snapshots `useConfig` existence before
loading preferences. `Galactica.cpp:1701–1709` starts tutorial on a new install
and tries the manual if tutorial startup fails. V4 now takes the installation
snapshot before any preference factory uses configuration. Native startup uses
PDG's actual configuration-existence return value. Browser startup recognizes
any existing `galactica.` preference, including choices created before the new
installation marker, and ignores unrelated application keys. Startup remembers
its occurrence without touching saved games. When storage cannot be inspected,
installation state remains unknown and manual tutorial entry remains available.

A first installation starts tutorial Welcome after dismissal of the introduction;
with introduction disabled the lifecycle can start onboarding immediately. An
explicit tutorial request consumes the pending automatic request. About remains
independent, cancellation restores setup, and returning launches do not reopen
automatic onboarding. Failed/throwing tutorial startup tries the manual once.
The original configured startup command and application-version presentation
remain implementable follow-up work; this does not complete startup or project
parity.

Seven regressions cover browser/native existence snapshots, upgrades, lifecycle,
manual fallback, unavailable storage and the real presentation close handler.
Full suites pass 1,337 tests against both pinned and rebuilt public runtimes.
Actual browser checks in en/de/es/fr/ja/ru dismiss startup, verify Welcome,
cancel to setup, exercise the independent About/tutorial recovery paths and
reload without onboarding. Separate browser runs confirm an existing language
preference suppresses onboarding and failed tutorial startup opens the packaged
manual. Compared before/after setup screenshots and inspected all six localized
Welcome panels. No new UI labels were needed; existing tutorial/manual resources
are reused, and README plus all six manuals explain first-launch behavior.

Evidence: `/private/tmp/galactica-startup-lifecycle-{tests,public-tests,<language>,fallback,upgrade}.log`,
`/private/tmp/galactica-parity/startup-lifecycle/<language>`, baseline
`/private/tmp/galactica-parity/startup-lifecycle-before/en`, and
`/private/tmp/galactica-startup-lifecycle-{review,languages}.png`.


### About application build identity

V3 `Galactica.cpp:1790–1808` populates About from the application version resource,
not the engine dependency version. V4 has no release tags or declared release
number. About now identifies its actual development source build with a twelve-
character application commit and a localized modified marker. Missing/invalid
metadata reports unavailable information instead of showing a guessed version.
The PDG pin is deliberately independent. Native launchers capture checkout state;
web packaging snapshots it before generating output and freezes it in the asset
manifest. Canonical commit validation prevents malformed metadata from entering
JavaScript. Source archives without Git remain usable.

All six language resources and manuals are updated. Desktop and compact About
wrap the identifier without dropping text. Visual review also found a crowded
German Close label/Esc hint: the presentation footer now groups three small icon
controls and measures the Close button to keep its full label and hint separate.
Five new game regressions cover metadata source/validation/localization and compact
text/button geometry. Both full lanes pass 1,342 tests. Five isolated packaging
checks verify clean, modified, generated-output, Git-less and invalid-tool-output
cases; their minimal WASM files are packaging fixtures, not runtime build evidence.
The actual macOS runtime receives the launcher metadata. Real PowerShell on macOS
passes the same metadata to an executable override; Windows GUI execution was not
available here.

Actual browser checks in all six languages verify the frozen identifier, localized
clean/unavailable caption fixtures, compact layout, About/tutorial recovery and
unchanged normal game serialization. Compared before/after About and inspected
all six compact views; the final footer sizing is included. Evidence:
`/private/tmp/galactica-version-{tests,public-tests,packaging-tests,native,powershell,<language>}.log`,
`/private/tmp/galactica-parity/version/<language>`, baseline
`/private/tmp/galactica-parity/startup-lifecycle/en/about-credits.png`, and
`/private/tmp/galactica-version-{review,languages}.png`.
Configured startup actions, other v3 parity and Map Generation remain unfinished.


### Stored application startup actions

Verified `GalacticaApp::StartUp` and decoded Mcmd 128/129 in all four shipped
English/German shareware/CD-ROM variants. The stored `StartAction` is a numeric
command, not a shipped preferences chooser. Implemented native/browser readers,
New fallback for absent/invalid storage, preservation of unknown numeric
commands and once-only dispatch after first-install tutorial/manual handling.
Explicit introduction tutorial entry consumes onboarding without losing the
configured command. About dismissal does not replay startup.

Existing About, New, Open, Save/Save As, Revert, Quit, Fullscreen, Help and
Tutorial services are connected. Browser Open, Help and Fullscreen defer until
trusted input when activation is absent; the input is consumed before setup
receives it. Existing localized presentations, tutorial lessons, manuals and
file-dialog messages supply all six languages; no new strings were introduced.
Hosting/Joining and other inherited/window commands are still pending, as
listed in `docs/reference/STARTUP_ABOUT.md`. This item does not complete full
startup, v3 or Map Generation parity.

Six meaningful regressions cover ordering, once-only execution, explicit
onboarding consumption, native/browser numeric reads, unknown commands and
trusted gesture routing/cleanup. Both the cached v1.2.0 runtime and public PDG
native build pass all 1,348 tests. Actual browser checks in all six languages
cover configured About, New, Tutorial, unknown zero, Open, Help and Fullscreen.
Help opens each language's bundled manual; real fullscreen state changes.
A separate actual English first-install run also verifies automatic onboarding,
cancellation, retained-game About/tutorial recovery and returning launch
without onboarding (`/private/tmp/galactica-startup-actions-default-onboarding.log`).
For Open, a controlled file-picker cancellation checks that the real Documents
path calls the picker synchronously with active browser user activation;
it does not claim to automate the operating system's file chooser.

Inspected the before/after configured-About comparison and six-language tutorial
screenshots. Evidence: `/private/tmp/galactica-startup-actions-{tests,public-tests,before,<language>-<action>}.log`,
`/private/tmp/galactica-parity/startup-actions`, and
`/private/tmp/galactica-startup-actions-{review,languages}.png`.
