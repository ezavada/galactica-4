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
`./gad4 tests/run-tests.js`: 327 passed, 0 failed. Passing tests prove the
covered classes and helpers behave as tested, but do not prove that the
playable runtime invokes every scaffolded system.

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

Galactica-4 currently has a credible simulation foundation, not feature parity with v3. Its strongest areas are procedural map generation, the coordinate/camera system, the basic turn loop, star growth/research/ship construction, direct point-to-point movement, basic fleet objects, technology transfer, localization resources, runtime combat/capture, and a now-usable first pass at AI and fog-of-war calculations.

The largest blockers to a complete game are:

1. **Combat now has a stronger playable runtime path, but it is not full v3 parity.** Enemy ship/star/fleet arrivals can invoke `CombatSystem`, remove destroyed ships, use v3-style ship/star combat formulas, run ground combat, let surviving colony ships capture stars, and record localized battle summaries. Missing v3 pieces remain: polished combat/result UI, explosion/debris feedback, richer fleet reports, surrender/capture reporting, and remaining C++ edge-case verification.
2. **The v3 command UI now has a first clickable runtime path, but not full parity.** v4 has a startup setup dialog, charcoal rounded windows, bottom-right permanent map buttons, a top-center turn/game header, clickable popup action buttons, directly clickable production sliders, retained event list, player comparison window, and anchored selection panels. Missing v3 pieces remain: player-name/title dialogs, course editor, attention workflow, system/fleet list windows, fleet exchange UI, rendezvous UI, shipped map/menu toggles, help, sound, and preferences.
3. **Ship navigation only supports one destination.** v3's waypoint list, editing, looping, course memory, human call-in/attention, Hunt toggle, human Patrol toggle, and scrap workflows are missing.
4. **Persistence and multiplayer are absent.** v3 save/open/revert, hosting, joining/rejoining, turn posting, timers, passwords, discovery, chat, and host administration have not been ported.
5. **Several systems are present but incomplete or incorrectly wired.** Examples include fog-of-war rendering, waypoint courses, attention workflow, event depth, setup/default-settings UI, and fleet UI.

## Easy wins applied on 2026-08-25

- Added a localized permanent End Turn map button that invokes the existing turn-advance path.
- Fixed display-side fog-of-war visibility to read numeric visibility levels directly, so owner/detail disclosure uses the stored visibility tier.
- Made omniscient/all-visible mode affect normal display helpers and visibility queries for enemy stars, ships, and fleets.
- Updated the Game Title status to reflect the top-center header path while keeping setup/save/hosting gaps visible.
- Added a deterministic AI-only autoplay observer (`./gad4 -- --ai-autoplay`) that starts five computer players on the smallest map, one for each v3 AI skill level, using fixed seed `424242` by default.
- Made End Turn close event overlays/event-list windows before advancing, so autoplay and the hotkey do not stall behind event presentation UI.
- Capped default autoplay runs at 250 turns while the late-game AI stagnation issue is unresolved, hid event presentation windows by default for AI autoplay, and added `--show-event-windows` for opt-in visible overlays with a presentation hold.
- Aligned ship/star combat strength and population damage with the v3 formulas, recorded localized combat-summary events, neutralized/captured enemy systems more safely, and recomputed defeat/victory after combat.
- Improved computer-player parity: AI now applies v3-style expert tech-star/shipbuilder allocations, starts concrete defense builds, skips under-construction/defense-satellite movement, carries patrol state for defenders, applies the Good/Expert patrol repair toggle, blocks docked fleets with fewer than three ships from moving, forms docked fleets, gives fleets strategic orders, applies computer production advantage, repairs docked non-patrolling mobile ships, and uses v3 skill values for ship search distance/repetition/randomness.
- Hardened movement/combat bookkeeping by preventing duplicate entity registration and by transferring ships cleanly between fleets.
- Added C++-confirmed technology transfer rules: standalone scouts/couriers pick up higher technology when leaving or arriving at allied systems, ships and fleets can upgrade lower-tech allied systems, battleships do not pick up higher technology, and scouts inside fleets keep v3's no-refresh limitation.
- Added v3 new-colony defaults: human neutral colonies apply the player's default economy/build choice, while computer neutral colonies immediately start a defense satellite.

## 1. Game creation, configuration, and lifecycle (Functionality 68%, UI 42%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| New single-player game | `File > New Game...` opens a setup dialog and then asks for the player's name. | 🟡 Partial | 🟡 Partial | `main.js` can construct a new local game after a simple setup dialog. It still lacks the player-name/title dialogs and v3's full setup layout. |
| Game title | Editable title in the setup dialog; also used for host save files. | 🟡 Partial | 🟡 Partial | `GameConfig.gameTitle` feeds the top-center header (`display.js`) and defaults from localized string ID 500. It is still not editable in setup and is not used for saves/hosting. |
| Human/computer player counts | Configurable human and computer slots. | 🟡 Partial | 🟡 Partial | The model/map generator support varied totals and the AI autoplay harness runs zero-human games. Normal setup still fixes human count to one and exposes only AI count cycling. |
| Five computer skill levels | Expert, Good, Average, Passable, Novice. | 🟡 Partial | 🟡 Partial | All five values and localized names exist. AI uses preserved v3 values for several movement factors, and autoplay deliberately covers all five. Normal setup still uses one shared skill and older three-bucket helper paths remain where they affect behavior. |
| Computer advantage | Setup offers +3 through -3. | 🟡 Partial | ❌ Missing | `GameConfig`/`PlayerInfo` store a value and computer research/shipbuilding use the v3 20% production modifier per level. Startup setup still lacks the full -3 through +3 range. No v3 C++ evidence was found for non-production strategic effects. |
| Stellar density | Scale of 1-10 controls star count. | 🟡 Partial | 🟡 Partial | Map density affects the original-style count formula and is exposed in startup, but v4 validation still accepts only 1-5 instead of v3's 1-10 range. |
| Sector size | Controls galaxy dimensions. | ✅ Implemented | 🟡 Partial | Implemented in map generation/camera and exposed in the startup dialog, though the dialog is still simplified. |
| Fast Game | Doubles ship speed and increases production. | ✅ Implemented | 🟡 Partial | `Rules` applies it to scanning, shipbuilding, research, and movement, and startup can toggle it. |
| Fog of War option | Default on; setup can disable it. | 🟡 Partial | 🟡 Partial | Configuration and visibility calculations exist, and startup can toggle omniscient/all-visible mode. Normal drawing still has disclosure gaps; see Section 6. |
| Turn time limit and units | Optional minutes/hours/days/weeks limit. | 🧱 Scaffold only | ❌ Missing | `maxTimePerTurn` and multiplayer factory defaults exist; no clock, timeout, or setup widgets use them. |
| End early when all players post | Host option for asynchronous multiplayer turns. | 🧱 Scaffold only | ❌ Missing | `endEarly` is stored but not used by the turn loop. |
| Procedural galaxy construction | Random star count/placement, separated home systems, unique names, named homeworlds. | ✅ Implemented | ➖ N/A | `map-generator.js:36-239` ports the main v3 construction path with the corrected 1024×1024 coordinate scale. |
| Initial homeworld state | One named home system, tech 1, population, scanner, and colony ship at 99%. | ✅ Implemented | ➖ N/A | `map-generator.js:249-299`. |
| Computer faction naming | Home-star name plus faction word, such as “Vega Alliance.” | ✅ Implemented | ➖ N/A | Resource-driven templates and group names are used in `map-generator.js:302-333`. |
| End turn | Button/menu/shortcut; multiplayer waits for posts as needed. | 🟡 Partial | 🟡 Partial | Tab and the localized bottom-right End Turn map button advance the local simulation, closing event overlays/event-list windows before processing the turn. There is no attention warning, posting, timer, or multiplayer coordination. |
| Victory and defeat | Defeat notifications and victory/defeat conclusion screens. | 🟡 Partial | 🟡 Partial | Piece counting can mark defeated players, combat/capture recomputes defeat immediately, a single remaining active player sets game-over/winner state, zero active players records stalemate, and the top header shows the result. Missing v3 pieces: conclusion text/window resources and fuller defeat/victory event reporting. |

### Possible lifecycle enhancements beyond v3, not counted in Section 1

- More elaborate cinematic or art-heavy victory/defeat treatment beyond the v3 text/window resources.

## 2. Map, camera, visibility, and display modes (Functionality 46%, UI 38%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| Galaxy map with grid | Main play field renders stars, ships, fleets, courses, and sector grid. | 🟡 Partial | 🟡 Partial | v4 renders background, grid, stars, ships, fleets, destinations, and selection. It lacks course layers, display-mode overlays, and user toggles. |
| Pan/scroll map | Scroll bars; Option-drag in the tutorial/manual. | ✅ Implemented | 🟡 Partial | Left or middle drag pans through `main.js:74-148` and `camera.js`. v3-style scroll bars are not reproduced. |
| Zoom in/out | Buttons and +/- keys. | ✅ Implemented | 🟡 Partial | Mouse wheel and +/- are wired and tested. Mouse-wheel zoom is a v4 convenience; v3-style zoom buttons/menu presentation is not complete. |
| Zoom to fit | “Zoom Fill”/0 command. | ✅ Implemented | 🟡 Partial | Content-aware zoom-to-fit exists on `F`, while `0` resets view (`game.js:465-476`). The function exists, but key/menu mapping differs from v3. |
| Go to home planet | Goto menu/Home-key command centers/selects home. | ✅ Implemented | 🟡 Partial | `game.js:477-512` implements centering/selecting home. v4 also maps `H` to home, while v3 uses `H` for Hunt, so shortcuts/menu UI need a pass. |
| Go to selected/current item | Centers map on selected entity. | ✅ Implemented | ✅ Implemented | Selecting objects works and `C` centers the camera on the selected entity. |
| Go to next item needing attention | Menu/Tab cycles the attention queue. | ❌ Missing | ❌ Missing | Tab ends the turn; no needy-item iterator or attention panel exists. |
| Replay/go to enemy moves | Shows noteworthy enemy movement. | ❌ Missing | ❌ Missing | No enemy-move queue or playback UI. |
| Select objects on map | Stars/ships/fleets can be clicked. | 🟡 Partial | 🟡 Partial | Hit testing and selection exist (`game.js:290-449`), but hit testing does not fully filter invisible enemy objects. Selection panel styling is present. |
| Selection marker | Pulsing marker around selected object. | ✅ Implemented | ✅ Implemented | Rendered for stars, ships, and fleets in `display.js`. |
| Star names | Show/hide names; visibility-aware naming. | 🟡 Partial | 🟡 Partial | Names fade by zoom and all stars remain plotted, but there is no show/hide toggle and remembered/unknown names need work. |
| Show/hide ships | Map display toggle. | ❌ Missing | ❌ Missing | No v4 setting or command; visible ships are always drawn. |
| Show/hide grid | Map display toggle. | ❌ Missing | ❌ Missing | Grid is always drawn. |
| Starlanes | Dormant display toggle and disabled v3 star-lane data. | ❌ Missing / not a parity blocker | ❌ Missing / not a parity blocker | v4 has no lane model/rendering. Audited v3 has resources/classes, but star-lane save/load and generation are commented out, `EstablishStarLaneTo()` returns `false`, and generation is labeled broken. |
| Show all courses | Game menu toggle. | ❌ Missing | ❌ Missing | v4 draws only the single destination vector for every visible ship/fleet; it has no course collection or toggle. |
| Map display modes | Ownership, production, tech, defense, danger, growth, shipbuilding, and research overlays. | ❌ Missing | ❌ Missing | No display-mode state, legend, or value shading exists. |
| Scanner/range circles | v3 UI can render ranges/spheres of influence. | 🟡 Partial | ❌ Missing | Scan values exist and drive visibility, but range circles are not rendered. |
| Full screen | Window menu toggle. | ❌ Missing | ❌ Missing | The PDG window is resizable, but no full-screen command exists. |
| Nebula/background art | v3 configurable starmap background. | 🟡 Partial | 🟡 Partial | v4 loads/scales `data/background.png`, with a gradient fallback (`display.js:206-242`). It does not expose the persisted background preference/toggle. |

### Possible map/display enhancements beyond v3, not counted in Section 2

- Restoring starlanes as an actual travel/display network. The shipped v3 code path appears disabled, so this would be a design choice for v4 rather than required parity.
- Modern map affordances that exceed v3, such as mouse-wheel zoom and responsive control layouts.

## 3. Star systems, economy, research, and production (Functionality 62%, UI 40%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| System information panel | Name, owner, population, tech, build choice/progress, and production. | ✅ Implemented | 🟡 Partial | Star data exists and updates. v4 shows an anchored panel with owner, population, tech, current hull, inline build progress, sliders, and build buttons; it still lacks ships-in-system, defense detail, auto-destination edit/clear UI, and several contextual commands. |
| Population growth | Growth allocation drives a capped population curve. | ✅ Implemented | ➖ N/A | `star.js:98-165` and `rules.js:86-102` implement autonomous growth. |
| Three-way economy | Growth, ships, and tech share system output. | 🟡 Partial | 🟡 Partial | Allocation model, gradual adjustment, human keyboard controls, clickable sliders, AI desired allocations, expert tech-star/shipbuilder roles, and default non-expert split exist. Lock/equalize/context workflows remain incomplete. |
| Production sliders | Coupled sliders with current/desired colors and gradual adjustment. | 🟡 Partial | 🟡 Partial | Slider math keeps total allocation at 100%; bars are visible and clickable in the star panel/production window. Locks and the full v3 production interaction model are not exposed. |
| Slider locks | Lock one allocation while adjusting others. | 🧱 Scaffold only | ❌ Missing | A `locked` field/accessor exists but is not fully enforced or exposed. |
| Equalize production | Button resets three allocations equally. | 🟡 Partial | ❌ Missing | `[R]` in the production window resets to 34/33/33. There is no visible v3-style equalize button and exact interaction still needs verification. |
| Research and tech advancement | Research accumulates; higher levels take more work. | ✅ Implemented | ➖ N/A | `star.js:116-141`, `rules.js:78-84`. |
| New-drive milestone | New technology class event every five levels. | ✅ Implemented | ✅ Implemented | A lab overlay is raised at class boundaries (`star.js:132-139`, `display.js:898-944`). |
| Choose hull type | Popup offers Satellite, Scout/Courier, Colony, Battleship. | 🟡 Partial | 🟡 Partial | All four can be started with `s/d/b/c` or clicked popup arc buttons. A current build cannot be switched and the build selector is simpler than v3. |
| Continuous ship production | A system continues producing the selected hull class. | 🟡 Partial | ❌ Missing | v4 builds one ship, clears `currentShip`, and requires another key press. v3 keeps the selected hull class active and continues production. |
| Per-hull accumulated production | v3 preserves paid progress separately for each hull type when switching. | ❌ Missing | ❌ Missing | v4 has one `paidTowardShipBuilding` value and one current hull. |
| Ship build progress/ETA | Panel displays percent complete and v3 can estimate turns. | 🟡 Partial | 🟡 Partial | Construction percentage is shown in selected-star and ship-detail panels. ETA is absent and the under-construction hull is still represented as a selectable ship. |
| Default new-ship destination | System “Send to” automatically dispatches new ships. | 🟡 Partial | 🟡 Partial | Right-click while a star is selected sets an object/coordinate destination and completed mobile ships inherit it (`game.js:300-376`, `star.js:204-215`). The map indicator draws in screen coordinates. There is no rendezvous picker or clear/edit UI. |
| Default new-colony settings | Newly colonized neutral systems use player defaults; computer colonies start satellites. | ✅ Implemented | ❌ Missing | `Game.applyNewColonyDefaults()` applies human default economics/build hulls using v3's 0-1000 allocation scale and starts computer colonies on defense satellites. There is no UI to edit default new-colony settings yet. |
| Ships in system | Dedicated list/panel for inspecting and selecting docked ships/fleets. | 🧱 Scaffold only | ❌ Missing | `star.ships` exists, but no list or panel is exposed. |
| Rename colony/system | Edit menu rename dialog; new colony asks for name. | ❌ Missing | ❌ Missing | No rename command or colony naming prompt. |
| System comparison window | Sortable “Your Star Systems” table. | ❌ Missing | ❌ Missing | No equivalent UI. |

## 4. Ships and navigation (Functionality 46%, UI 22%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| Four hull roles | Satellite, Scout/Courier, Colony, Battleship with distinct cost/speed/combat/scanner roles. | 🟡 Partial | 🟡 Partial | Types, cost, speed, power, scout scanning, combat/capture, technology transfer, satellite patrol, and docked repair now exist. UI still omits several role states and workflows. |
| Battleship drive classes/names | A new named class every five tech levels (Traveler through Hellion). | ✅ Implemented | ✅ Implemented | Class index/name and first-of-class event are assigned in `star.js:180-203`, using resource ID 800. |
| Ship information/diagnostics | Name, class, tech, speed, power, damage/health bar. | 🟡 Partial | 🟡 Partial | v4 has the data, and the panel shows type, tech, speed, and power (`display.js:690-721`). It does not show ship name, damage/health bar, patrol/docked state, course, or scanner information. |
| Direct destination orders | Add destination to a star, ship, fleet, or open space. | 🟡 Partial | 🟡 Partial | Right-click sets one destination for a selected owned ship/fleet, and the popup Orders button can arm a left-click destination target. It replaces rather than appends a course. |
| Multi-waypoint courses | Ordered waypoint list with current destination in bold. | ❌ Missing | ❌ Missing | A ship has only one `destination`. |
| Add/edit/delete waypoint | Buttons and A/E/Delete shortcuts. | ❌ Missing | ❌ Missing | No waypoint model or editor. |
| Clear entire course | Clear button/shortcut. | 🧱 Scaffold only | ❌ Missing | Destination can be cleared programmatically, but no command/UI clears a player's current course. |
| Repeat/loop course | Repeats the waypoint circuit. | ❌ Missing | ❌ Missing | No loop state. |
| Course memory | Save/swap a ship's course. | ❌ Missing | ❌ Missing | No course-memory state. |
| Call in | Human-controlled ship asks for attention next turn. | ❌ Missing | ❌ Missing | No ship call-in flag or attention queue. Audited v3 C++ suppresses call-in for computer ships, so this is player workflow rather than AI parity. |
| Automatic idle call-ins | Newly built or idle ships request orders periodically. | ❌ Missing | ❌ Missing | Events are logged only; there is no attention workflow. |
| Patrol mode | Ship or fleet patrols a friendly system and gains defensive advantages; satellites always patrol. | 🟡 Partial | ❌ Missing | Ships/fleets carry patrol state, completed satellites patrol automatically, Good/Expert AI toggles eligible healthy/damaged docked non-scout ships/fleets, and combat uses patrol bonuses. Human patrol command/button and indicators are absent. |
| Hunt mode | Button/key and serialized course flag exist in v3; no active pursuit logic was found in audited C++ beyond that state. | ❌ Missing | ❌ Missing | No hunt state or command exists in v4. Smarter seek/intercept behavior should be treated as a v4 enhancement unless another v3 path is found. |
| Scrap ship/fleet | Mark for scrapping and recover part of build value. | 🧱 Scaffold only | ❌ Missing | `Rules.getShipScrapValue()` exists, but no scrap state, command, or resource return is wired. |
| Movement by drive speed | Ships advance once per turn; scout faster, colony slower, satellite stationary. | ✅ Implemented | ➖ N/A | `ship.js:44-83` and `rules.js:125-145`. |
| Colonize neutral system | Colony ship is consumed; system takes owner and ship tech. | ✅ Implemented | 🟡 Partial | Arrival and `Game.colonizeStar()` consume the colony ship, update owner/tech/scanner, apply v3 new-colony defaults, and record a colonization event. Rename/economy prompts and richer report UI remain missing. |
| Courier technology pickup/transfer | Courier updates its library from higher-tech systems and upgrades lower-tech colonies. | ✅ Implemented | 🟡 Partial | `handleShipDepartureTechnology()`, arrival transfer hooks, and docked-scout refresh cover the v3 standalone scout/courier rule. UI reflects changed tech only through normal info panels; no dedicated transfer feedback exists. |
| Battleship technology delivery | Battleships can upgrade colonies but cannot update their own library. | ✅ Implemented | ➖ N/A | `applyTechnologyTransferToStar()` lets battleships/fleets raise lower allied star tech while only scouts can pick up higher star tech. |
| Docking and repair | Damaged mobile ships repair at friendly systems using a tech-level repair budget. | 🟡 Partial | ❌ Missing | `Star.update()` repairs docked, non-patrolling, non-moving mobile ships using `35 * techLevel` and excludes satellites. Docked fleet repair is scaffolded but not wired into star repair updates; repair UI/reporting are absent. |
| Ship arrival/interception outcomes | Friendly arrival docks/forms fleet; enemy arrival fights. | 🟡 Partial | 🟡 Partial | Star docking, friendly ship/fleet formation, clean fleet membership transfer, enemy arrival combat, and top-container technology transfer are wired. Remaining gaps include richer arrival events, full top-container combat edge cases, course continuation, and UI feedback. |

### Possible ship/navigation enhancements beyond v3, not counted in Section 4

- Active Hunt auto-pursuit/interception behavior beyond the serialized v3 flag/button.
- More autonomous route planning beyond v3's waypoint/course-memory model.

## 5. Fleets and rendezvous (Functionality 55%, UI 18%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| Fleet entity | Group operates as one unit; power sums and speed is slowest member. | ✅ Implemented | 🟡 Partial | `fleet.js` tracks stats, docked state, patrol state, member positions, spatial location, and technology transfer to allied systems. Map/detail rendering exists but is still sparse. |
| Form fleet by meeting ships | Friendly ship targeting another friendly ship automatically forms a fleet. | ✅ Implemented | ➖ N/A | `handleFleetFormation()` and ship/fleet arrival paths cover the runtime rule. |
| Join/merge fleets | Ship joins friendly fleet; two fleets can merge. | ✅ Implemented | ➖ N/A | Arrival and `mergeFleets()` support these cases; adding a ship to a new fleet removes it from the old one. |
| Exchange/remove ships | Fleet/group panels move selected ships between fleets or out of a fleet. | 🟡 Partial | ❌ Missing | `addShip()`/`removeShip()` and transfer bookkeeping exist, but there is no player-facing fleet contents/exchange UI. |
| Fleet contents panel | Lists ships/groups and health. | 🟡 Partial | 🟡 Partial | Fleet detail shows counts by type, but not individual ships or interactive selection/exchange. |
| Fleet navigation | Fleet course panel and the same course tools as ships. | 🟡 Partial | ❌ Missing | A fleet can receive one right-click or AI-selected destination and move at slowest speed; waypoint tools, loop, memory, patrol commands, call-in, and Hunt button/flag are absent. |
| Named fleets | Human-created fleets prompt for a name; rename is available. | ❌ Missing | ❌ Missing | Fleets are displayed only by numeric ID. The v3 computer-move source has a TODO for unique computer fleet names, so AI-generated fleet naming is not counted as shipped parity. |
| Rendezvous points | Place/name/move/delete a point in open space, on a system, or on another ship. | ❌ Missing | ❌ Missing | No rendezvous entity, placement mode, or UI exists. Arbitrary coordinate auto-destinations are not a substitute because they cannot collect/name/manage a fleet-forming target. |
| Auto-form fleet at rendezvous | Ships sent by producing systems assemble into a named fleet. | ❌ Missing | ❌ Missing | Default destinations exist, but open-space arrivals do not create a shared target or assemble a fleet. |
| Fleet comparison window | Sortable “Your Fleets” table. | ❌ Missing | ❌ Missing | No equivalent UI. |

### Possible fleet enhancements beyond v3, not counted in Section 5

- Automatic unique fleet names for computer-created fleets; v3 source notes this as a TODO rather than shipped behavior.
- Higher-level task-force or staging automation beyond v3 rendezvous points.

## 6. Combat, occupation, defense, and fog of war (Functionality 78%, UI 32%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| Ship/fleet combat on interception | Enemy forces exchange attacks; defeated units are removed and winner continues. | 🟡 Partial | 🟡 Partial | `CombatSystem` is instantiated by `Game`, enemy ship/star/fleet arrivals invoke it, destroyed ships are removed from containers, and battles record localized summaries. Full fleet-result reporting and presentation remain thin. |
| Combat reserves | Couriers and colony ships stay in reserve until combat ships are gone. | ✅ Implemented | ➖ N/A | Reserve sorting is used by the runtime combat path. |
| Multi-target and rollover damage | Higher-tech attackers hit multiple targets and excess damage rolls over. | ✅ Implemented | ➖ N/A | The resolver uses tech-based target counts and rollover damage during runtime combat. |
| Defended-system invasion | Defeat stationed ships, then fixed planetary defenses; production/population is damaged. | 🟡 Partial | 🟡 Partial | Enemy star arrivals run space combat, ground combat against population, v3-style star attack/defense and population damage, and colony capture when a colony survives. Remaining work is result presentation, surrender/capture text coverage, and remaining C++ edge-case verification. |
| Capture/surrender | Successful invasion transfers system ownership and reports capture/surrender. | 🟡 Partial | 🟡 Partial | A surviving colony ship can transfer ownership after ground combat, defeated systems clear stale default destinations, new colony defaults apply where v3 does, non-colony survivors are kept outside hostile stars that hold, and defeat/victory updates run after combat. Surrender/result UI and full v3 reporting still need work. |
| Defense satellites | Stationary, strong, always on patrol, cannot repair. | 🟡 Partial | 🟡 Partial | The hull is stationary, completed defense builds attach to the star, satellites patrol automatically, satellites do not repair, and attached satellites defend systems. Human build/progress presentation and fuller satellite reporting need parity work. |
| Patrol coordination bonus | Patrolling defenders receive attack/defense advantages. | 🟡 Partial | ❌ Missing | Patrol state can be enabled by satellite completion and Good/Expert AI docked-ship/fleet behavior, and ship combat formulas apply patrol bonuses. Direct player patrol command/button and indicators are absent. |
| Damage and destruction | Health decreases, units die, fleet loss accounting and debris/explosion feedback. | 🟡 Partial | ❌ Missing | Runtime combat applies v3-style ship power, star strength, and population damage, and removes destroyed ships robustly. Fleet loss accounting is basic; debris/explosion feedback is missing. |
| Repairs | Friendly docking repairs surviving mobile ships; satellites do not repair. | 🟡 Partial | ❌ Missing | Friendly stars repair docked, non-patrolling, non-moving mobile ships during updates using the v3 tech-level budget, excluding satellites. Docked fleet repair is scaffolded but not wired into star repair updates; visible repair summaries are absent. |
| Scanner-based fog of war | Stars/scouts reveal enemy presence, owner, tech, then class/details by range; scout stealth matters. | 🟡 Partial | 🟡 Partial | Spatial visibility levels, star/scout scanners, and stealth calculations exist. Visibility only increases and is never cleared when an entity leaves range; remembered/last-seen presentation is not distinguished. |
| Fog-of-war rendering | Enemy colonies/ships are hidden or partially identified according to visibility. | 🟡 Partial | 🟡 Partial | Enemy ships/fleets are hidden when visibility is none, and star ownership/detail rendering reads numeric visibility levels. Stars are still always plotted; remembered/last-seen presentation and fuller class/detail UI remain incomplete. |
| Omniscient mode | Disabling Fog of War shows the whole galaxy. | ✅ Implemented | ✅ Implemented | Disabling fog through startup/config makes visibility queries and display helpers treat enemy stars, ships, and fleets as fully visible; covered by fog and command UI tests. |
| Combat odds estimate | Not part of shipped v3/manual behavior; listed as a v4 future enhancement. | ❌ Missing / not a parity blocker | ❌ Missing / not a parity blocker | Correctly remains in `docs/FUTURE_IMPROVEMENTS.md`; it should not be counted as missing v3 parity. |

### Possible combat enhancements beyond v3, not counted in Section 6

- Combat-odds previews, retreat/withdrawal rules, and explicit player-visible probability breakdowns.
- Balance changes aimed at a more aggressive or less stagnant late game beyond matching the v3 formulas and AI decision factors.

## 7. Computer players (Functionality 82%, UI 10%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| AI turn participation | Computer systems choose production and ships/fleets choose strategic destinations. | 🟡 Partial | 🟡 Partial | AI players are created and processed before movement. Star build/economy, ship destinations, and fleet destinations can execute. `./gad4 -- --ai-autoplay` advances a deterministic no-human observer game until win condition or the 250-turn guard. Event windows are hidden by default and restored with `--show-event-windows`. |
| AI ship decision matrices | `CShipCompMove.cpp` scores owned stars, enemy stars, unowned stars, enemy ships, and fleet formation using v3 factor tables. | 🟡 Partial | ➖ N/A | The port uses v3 skill search distances/repetition counts, fixes placeholder comparisons, prevents invalid no-target choices, skips ineligible actors, applies the docked-fleet-with-fewer-than-three-ships guard, forms/joins docked fleets, and processes fleets as AI actors. Remaining C++-confirmed work: verify every factor/weight and integrate with the waypoint/course model. |
| AI economy management | `CStar::DoComputerMove()` changes desired allocations: Expert can designate tech stars; non-experts reset to the default split. | ✅ Implemented | ➖ N/A | AI writes desired star allocations. Expert AI can select a v3-style tech star using highest-tech/no-nearby-enemy/nearby-ally checks and splits other systems into growth/shipbuilding; non-experts use the default split. Threat/development allocation helpers are scaffold/future behavior, not v3 parity. |
| AI colonization defaults | Computer colonies immediately set a defensive build on newly colonized neutral stars. | ✅ Implemented | ➖ N/A | `Game.applyNewColonyDefaults()` starts a defense satellite for computer-owned neutral colonies, matching `CShip::Arriving()`. |
| AI use of tech transfer | Computer scouts/battleships/fleets benefit from the same arrival/departure technology rules as human units. | ✅ Implemented | ➖ N/A | Technology transfer is in the shared movement/rule path, so AI orders use it automatically. Tests cover standalone scout refresh, battleship/fleet delivery, and the v3 limitation that scouts inside fleets do not refresh. |
| AI defenses | v3 computer defense is satellites plus Good/Expert auto-patrol for docked, healthy non-scout ships/fleets; computer ships do not use call-in. | ✅ Implemented | ➖ N/A | Satellites, patrol state, patrol combat bonuses, and the C++-confirmed Good/Expert patrol toggle for healthy/damaged docked ships and fleets are implemented and tested. No v3 computer reinforcement/call-in subsystem was found. |
| Skill differences | v3 has five skill values. They change search distance, target passes, skilled scout behavior, lower-skill randomness, Novice fleet avoidance, and Good/Expert patrol toggling. | 🟡 Partial | 🟡 Partial | Ship AI reads the preserved five-level v3 skill for several movement choices, UI/localized names exist, and Good/Expert patrol edge cases are covered. Remaining work is to replace older three-bucket helper paths where they affect v3-backed outcomes. |
| Advantage modifier | Computer advantage is a setup value from +3 through -3 and applies a 20% modifier to production-style calculations. | 🟡 Partial | ❌ Missing | Computer advantage applies to AI research and shipbuilding output at 20% per level, matching `CStar.cpp`. Remaining v3 gap is setup/UI exposure and validation for full -3 through +3. No C++ evidence was found for non-production strategic effects. |

### Possible AI enhancements beyond v3, not counted in Section 7

- Player-visible AI intent/debug overlays.
- Richer defensive threat evaluation or reinforcement coordination beyond v3's satellite/patrol behavior.
- Strategic uses of computer advantage beyond the v3 production-style modifiers.
- Combat-odds estimation, retreat/avoidance, and late-game attack-pressure tuning beyond matching the v3 decision factors.

## 8. Events, messages, comparison, help, and general UI (Functionality 38%, UI 40%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| Main information/navigation panels | Context-sensitive system, ship, fleet, and list panels with command buttons. | 🟡 Partial | 🟡 Partial | v4 draws anchored context panels for systems, ships, and fleets plus simple menu/event/comparison windows. Permanent map buttons and popup arc buttons are clickable. The v3 contextual button architecture, list panels, and richer command workflows remain absent. |
| Window/dialog chrome | v3 uses styled windows, separators, fixed command areas, and map controls. | ✅ Implemented | 🟡 Partial | v4 uses charcoal rounded panels, light-gray text, medium dividers, hover brightening/darkening, top-center game/turn header, bottom-right map buttons, and pointer triangles. Remaining parity is concrete window/menu/list coverage, not an open-ended final visual redesign. |
| Keyboard shortcuts and hover help | Buttons advertise shortcuts; balloon/flyby help describes controls. | 🟡 Partial | 🟡 Partial | More keys are wired (`M/E/P/V`, production controls, `C`, `H`, zoom keys), clickable buttons show `<key>` notation after labels, and hover styling exists. Some mappings differ from v3 and there is no hover/balloon help. |
| Events from last turn | Dedicated show/hide event window with selectable event list and narrative text. | 🟡 Partial | 🟡 Partial | `Game` retains recent events and `[E]`/Events opens a simple localized list. End Turn closes it before advancing. It is not selectable, filtered by last turn, or narratively complete like v3. |
| Attention queue | New ships, idle ships, colonies, messages, and other important events select themselves in sequence. | ❌ Missing | ❌ Missing | No `needy` queue; Tab is repurposed to end the turn. |
| New technology lab presentation | Illustrated new-drive event. | ✅ Implemented | ✅ Implemented | Dimming lab overlay with blueprint art; dismissed with any key or cleared by End Turn. |
| New battleship class/stardock presentation | Illustrated first-of-class event. | ✅ Implemented | ✅ Implemented | Stardock overlay and ship art in `display.js:920-944`; cleared by any key or End Turn. |
| Colonization/capture/battle event text | Player-relative narrative messages for 45 event types. | 🟡 Partial | 🟡 Partial | A small localized subset of event text is retained and displayed. It is not player-relative in the full v3 style and remains far short of v3's event coverage. |
| Compare players | Player summary table with best values blue and worst red; the audited v3 sort handler is empty. | 🟡 Partial | 🟡 Partial | `[V]`/Compare opens a simple table for stars, ships, population, average tech, and max tech. Remaining parity is extra columns/metrics, dead/unassigned styling, and best/worst coloring. Functional sorting and aggregate score columns were not confirmed in v3 C++. |
| Send/show/hold player messages | Multiplayer chat to one/all/admin, with message history and repeat settings. | ❌ Missing | ❌ Missing | No chat or message model. |
| Rename ship/fleet/colony/rendezvous | Edit menu rename workflow. | ❌ Missing | ❌ Missing | No rename UI. |
| Sound and attention cues | Sound toggle, attention sound, combat/build feedback. | ❌ Missing | ❌ Missing | No sound use or preference found. |
| Preferences | Persistent drawing, sound, language, and game preferences. | ❌ Missing | ❌ Missing | No preferences UI or persistence. |
| User's Manual | In-app menu opens the manual. | ❌ Missing | ❌ Missing | The current v4 UI has no Help/manual command. The public v3 manual remains available online. |
| Interactive tutorial | Guided scripted game teaches map, production, ships, fleets, events, and comparison. | ❌ Missing | ❌ Missing | v3 tutorial resources and controller have no v4 equivalent. |
| Internationalization | v3 language plug-ins; menu can switch languages. | ✅ Implemented | 🟡 Partial | v4 has English, German, Spanish, French, Japanese, and Russian resources and accepts runtime language with `./gad4 -- --lang=es`. Current user-visible runtime strings are resource-driven/tested; there is no in-game language switcher and unported v3 dialogs/help need future resources. |
| Original art use | Ship/event/background artwork reinforces game state. | 🟡 Partial | 🟡 Partial | v4 uses background and lab/stardock/ship assets, while most UI buttons, panels, animations, and states are styled primitives/text. Remaining parity should be tied to specific shipped v3 event/help/window imagery. |

### Possible UI enhancements beyond v3, not counted in Section 8

- The final v4 visual direction, responsive layout polish, pointer-triangle/arc-button refinement, and other modernized styling choices.
- Functional sorting for Compare Players, unless another shipped v3 path is found; the audited `SortCompareWindowByColumn()` body is empty.
- Additional dashboard/scoring views beyond the v3 summary columns.

## 9. Save/load, multiplayer, and host administration (Functionality 0%, UI 0%)

| v3 function | v3 behavior/UI | Functionality status | UI status | Evidence and remaining work |
|---|---|---|---|---|
| Save turn / Save As | Saves a single-player turn document. | ❌ Missing | ❌ Missing | `PlayerInfo.toJSON()` alone is not a game save system. No complete game serializer or file command exists. |
| Open saved game | Opens a saved turn. | ❌ Missing | ❌ Missing | No deserializer for game, stars, ships, fleets, courses, events, visibility, or configuration. |
| Revert to saved turn | Restores the last saved state. | ❌ Missing | ❌ Missing | No implementation. |
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
- `AI_INTEGRATION_STATUS.md` and `AI_INTEGRATION_TODO.md` describe AI as active but partial: AI turns run, stars can start builds, ships and fleets can set destinations, and key v3 skill/advantage hooks are now active. Speculative AI upgrades are separated from C++-confirmed v3 parity gaps.
- `README.md` now links only to files that exist and no longer describes the port as a complete 4X game.
- `INTERNATIONALIZATION_STATUS.md` now serves as the current i18n reference and records that current runtime UI/event strings are localized with parity tests across supported languages.
- `TESTING_GUIDE.md` and `tests/README.md` now match `tests/run-tests.js`, including the current runner command. The main suite currently reports 327 tests.

This file remains the main parity source of truth. More focused docs may describe implementation details for an area, but their status claims should stay consistent with the tables above.

## Recommended parity sequence

1. **Continue making the core game completable:** use the 250-turn autoplay observer to diagnose stalls, finish the C++-confirmed combat/capture and AI scoring/course gaps, add richer fleet/result reporting, and verify remaining combat outcomes against v3. Treat deeper attack-pressure or combat-odds work as future enhancement unless the v3 source/manual confirms it.
2. **Finish essential player control:** complete the build selector/progress workflow, default-new-colony settings UI, production lock/equalize behavior, ships-in-system, damage state, patrol, repairs, and clear destination controls.
3. **Restore v3 navigation:** waypoint lists, add/edit/delete/clear, looping, course memory, call-in, attention queue, and event history.
4. **Finish fleets:** contents/exchange UI, named fleets, rendezvous points, auto-assembly, richer fleet combat reporting, and fleet visibility.
5. **Add game setup and persistence:** setup screen for all supported options, then full save/open/revert.
6. **Add comparison and polish:** v3 player-comparison columns/highlights, sortable system/fleet tables, display modes/toggles, renaming, sound, manual link, tutorial, and shipped preference/help flows. Treat Compare Players sorting/scoring and final v4 art direction as future enhancements unless further v3 evidence appears.
7. **Port multiplayer last:** host/join/rejoin, synchronization, turn posting/timers, chat, discovery, and administration rely on the preceding state model being stable and serializable.
