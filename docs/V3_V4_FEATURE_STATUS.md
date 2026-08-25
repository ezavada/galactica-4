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
`./gad4 tests/run-tests.js`: 286 passed, 0 failed. Passing tests prove the
covered classes and helpers behave as tested, but do not prove that the
playable runtime invokes every scaffolded system.

### Status key

| Status | Meaning |
|---|---|
| ✅ Implemented | Present in the normal v4 runtime path and substantially usable. |
| 🟡 Partial | A meaningful portion exists, but parity, UI, or important behavior is missing. |
| 🧱 Scaffold only | Models, helpers, or tests exist, but the feature is not usable end to end in the game. |
| ❌ Missing | No meaningful v4 implementation was found. |

Section completion percentages are rough parity estimates based on the table rows in each numbered section. They are status summaries, not effort estimates.

## Executive summary

Galactica-4 currently has a credible simulation foundation, not feature parity with v3. Its strongest areas are procedural map generation, the coordinate/camera system, the basic turn loop, star growth/research/ship construction, direct point-to-point movement, basic fleet objects, localization resources, and a first pass at AI and fog-of-war calculations.

The largest blockers to a complete game are:

1. **Combat now has a first playable runtime path, but it is not full v3 parity.** Enemy ship/star/fleet arrivals can invoke `CombatSystem`, remove destroyed ships, run basic ground combat, and let surviving colony ships capture stars. Missing pieces remain: combat/result UI, explosion/debris feedback, balance tuning, and fuller fleet edge cases.
2. **The v3 command UI now has a first clickable runtime path, but not full parity.** v4 has a startup setup dialog, charcoal rounded windows, bottom-right permanent map buttons, a top-center turn/game header, clickable popup action buttons, directly clickable production sliders, retained event list, player comparison window, and anchored selection panels. Missing pieces remain: player-name/title dialogs, course editor, attention workflow, system/fleet comparison tables, fleet exchange UI, rendezvous UI, and final visual/art direction polish.
3. **Ship navigation only supports one destination.** v3's waypoint list, editing, looping, course memory, call-in, hunt, patrol, and scrap workflows are missing.
4. **Persistence and multiplayer are absent.** v3 save/open/revert, hosting, joining/rejoining, turn posting, timers, passwords, discovery, chat, and host administration have not been ported.
5. **Several systems are present but incomplete or incorrectly wired.** Examples include fog-of-war rendering, AI economic allocation, repairs, patrol state, victory, events, and fleet UI.

## Easy wins applied on 2026-08-25

- Added a localized permanent End Turn map button that invokes the existing turn-advance path.
- Fixed display-side fog-of-war visibility to read numeric visibility levels directly, so owner/detail disclosure uses the stored visibility tier.
- Made omniscient/all-visible mode affect normal display helpers and visibility queries for enemy stars, ships, and fleets.
- Updated the Game Title status to reflect the top-center header path while keeping setup/save/hosting gaps visible.

## 1. Game creation, configuration, and lifecycle (55% complete)

| v3 function | v3 behavior/UI | v4 status | Evidence and remaining work |
|---|---|---|---|
| New single-player game | `File > New Game...` opens a setup dialog and then asks for the player's name. | 🟡 Partial | `main.js` now shows a simple startup setup dialog before map generation with AI count, AI skill, map size, density, fast game, and fog/all-visible options. It still lacks player-name/title dialogs and v3's full setup layout. |
| Game title | Editable title in the setup dialog; also used for host save files. | 🟡 Partial | `GameConfig.gameTitle` feeds the top-center header (`display.js`) and defaults from localized string ID 500. It is still not editable in setup and is not used for saves/hosting. |
| Human/computer player counts | Configurable human and computer slots. | 🟡 Partial | The startup dialog can cycle AI player count and the model/map generator support the resulting totals. Human count is still fixed to one and `getCurrentHumanPlayer()` always returns player 1. |
| Five computer skill levels | Expert, Good, Average, Passable, Novice. | 🟡 Partial | All five values and localized names exist, but runtime mapping collapses Average, Passable, and Novice to the same AI level (`game.js:52-59`). |
| Computer advantage | Setup offers +3 through -3. | 🧱 Scaffold only | A value is stored in `GameConfig`/`PlayerInfo`, but it is neither modeled over the full v3 range nor applied to AI or rules. |
| Stellar density | Scale of 1-10 controls star count. | 🟡 Partial | Map density affects the original-style count formula and is now exposed in the startup dialog, but v4 validation still accepts only 1-5 instead of the v3 1-10 range. |
| Sector size | Controls galaxy dimensions. | 🟡 Partial | Implemented in map generation/camera and exposed in the startup dialog. |
| Fast Game | Doubles ship speed and increases production. | 🟡 Partial | `Rules` applies it to scanning, shipbuilding, research, and movement, and the startup dialog can toggle it. |
| Fog of War option | Default on; setup can disable it. | 🟡 Partial | Configuration and visibility calculations exist, and the startup dialog can toggle omniscient/all-visible mode. Normal drawing still has visual disclosure gaps; see the fog-of-war section. |
| Turn time limit and units | Optional minutes/hours/days/weeks limit. | 🧱 Scaffold only | `maxTimePerTurn` and multiplayer factory defaults exist; no clock, timeout, or UI uses them. |
| End early when all players post | Host option for asynchronous multiplayer turns. | 🧱 Scaffold only | `endEarly` is stored but never read by the turn loop. |
| Procedural galaxy construction | Random star count/placement, separated home systems, unique names, named homeworlds. | ✅ Implemented | `map-generator.js:36-239` ports the main v3 construction path with the corrected 1024×1024 coordinate scale. |
| Initial homeworld state | One named home system, tech 1, population, scanner, and colony ship at 99%. | ✅ Implemented | `map-generator.js:249-299`. |
| Computer faction naming | Home-star name plus faction word, such as “Vega Alliance.” | ✅ Implemented | Resource-driven templates and group names are used in `map-generator.js:302-333`. |
| End turn | Button/menu/shortcut; multiplayer waits for posts as needed. | 🟡 Partial | Tab and the localized bottom-right End Turn map button advance the local simulation. There is no attention warning, posting, timer, or multiplayer coordination. |
| Victory and defeat | Defeat notifications and victory/defeat conclusion screens. | 🟡 Partial | Piece counting can mark a player defeated and log an event (`game.js:603-621`), but there is no victory test, game-over state, or conclusion UI. |

## 2. Map, camera, visibility, and display modes (45% complete)

| v3 function | v3 behavior/UI | v4 status | Evidence and remaining work |
|---|---|---|---|
| Galaxy map with grid | Main play field renders stars, ships, fleets, courses, and sector grid. | 🟡 Partial | v4 renders a background, grid, stars, ships, fleets, destinations, and selection. It lacks several layers and user toggles. |
| Pan/scroll map | Scroll bars; Option-drag in the tutorial/manual. | ✅ Implemented | Left or middle drag pans through `main.js:74-148` and `camera.js`. Scroll bars themselves are not reproduced. |
| Zoom in/out | Buttons, +/- keys, and modern manual mouse wheel. | ✅ Implemented | Mouse wheel and +/- are wired; camera zoom is covered by dedicated tests. |
| Zoom to fit | “Zoom Fill”/0 command. | ✅ Implemented | `F` calls content-aware zoom-to-fit; `0` resets view (`game.js:465-476`). The key mapping differs from v3. |
| Go to home planet | Menu/`H` centers/selects home. | ✅ Implemented | `game.js:477-512`. |
| Go to selected/current item | Centers map on selected entity. | ✅ Implemented | Selecting objects works and `C` centers the camera on the selected entity. |
| Go to next item needing attention | Menu/Tab cycles the attention queue. | ❌ Missing | Tab ends the turn; no needy-item iterator exists. |
| Replay/go to enemy moves | Shows noteworthy enemy movement. | ❌ Missing | No enemy-move queue or playback UI. |
| Select objects on map | Stars/ships/fleets can be clicked. | 🟡 Partial | Hit testing and selection exist (`game.js:290-449`), but hit testing does not filter invisible enemy objects and can expose information if their location is guessed. |
| Selection marker | Pulsing marker around selected object. | ✅ Implemented | Rendered for stars, ships, and fleets in `display.js`. |
| Star names | Show/hide names; visibility-aware naming. | 🟡 Partial | Names fade by zoom and all stars remain plotted, but there is no show/hide toggle. |
| Show/hide ships | Map display toggle. | ❌ Missing | No v4 setting or command; visible ships are always drawn. |
| Show/hide grid | Map display toggle. | ❌ Missing | Grid is always drawn. |
| Starlanes | Display toggle and v3 star-lane data. | ❌ Missing | No lane model or rendering was found in v4. |
| Show all courses | Game menu toggle. | ❌ Missing | v4 draws only the single destination vector for every visible ship/fleet; it has no course collection or toggle. |
| Map display modes | Ownership, production, tech, defense, danger, growth, shipbuilding, and research overlays. | ❌ Missing | No display-mode state, legend, or value shading exists. |
| Scanner/range circles | v3 UI can render ranges/spheres of influence. | ❌ Missing | Scan values exist, but range circles are not rendered. |
| Full screen | Window menu toggle. | ❌ Missing | The PDG window is resizable, but no full-screen command exists. |
| Nebula/background art | v3 configurable starmap background. | ✅ Implemented | v4 loads and scales `data/background.png`, with a gradient fallback (`display.js:206-242`). No toggle exists. |

## 3. Star systems, economy, research, and production (45% complete)

| v3 function | v3 behavior/UI | v4 status | Evidence and remaining work |
|---|---|---|---|
| System information panel | Name, owner, population, tech, build choice/progress, and production. | 🟡 Partial | v4 now shows an anchored selected-star panel with owner, population, tech, current hull, inline build progress, directly clickable production sliders, and nearby clickable build buttons. It still lacks ships-in-system access, defenses detail, auto-destination editing, and final v3-style controls. |
| Population growth | Growth allocation drives a capped population curve. | ✅ Implemented | `star.js:98-165` and `rules.js:86-102` implement autonomous growth. |
| Three-way economy | Growth, ships, and tech share system output. | 🟡 Partial | The `Allocation` model, gradual adjustment, and human keyboard controls exist. AI calculates allocations and then only logs them (`ai-star.js:133-142`). |
| Production sliders | Coupled sliders with current/desired colors and gradual adjustment. | 🟡 Partial | Slider bars are drawn in selected-star panels and the production window. They are directly clickable, keep total allocation at 100%, show the desired percentage at the right edge, and mark the current value. Keyboard controls still work. They do not expose locks and still need final tuning/polish. |
| Slider locks | Lock one allocation while adjusting others. | 🧱 Scaffold only | A `locked` field/accessor exists but is not enforced or exposed. |
| Equalize production | Button resets three allocations equally. | 🟡 Partial | `[R]` in the production window resets to the default 34/33/33 split. There is no visible equalize button and no exact v3 equalize behavior. |
| Research and tech advancement | Research accumulates; higher levels take more work. | ✅ Implemented | `star.js:116-141`, `rules.js:78-84`. |
| New-drive milestone | New technology class event every five levels. | ✅ Implemented | A lab overlay is raised at class boundaries (`star.js:132-139`, `display.js:898-944`). |
| Choose hull type | Popup offers Satellite, Scout/Courier, Colony, Battleship. | 🟡 Partial | All four can be started with `s/d/b/c` on an owned selected star or by clicking the selected-star popup arc buttons. A current build cannot be switched and the build selector is still far simpler than v3's production UI. |
| Continuous ship production | A system continues producing the selected hull class. | 🟡 Partial | v4 builds one ship, clears `currentShip`, and requires another key press. v3's selected build type remains active and continues production. |
| Per-hull accumulated production | v3 preserves paid progress separately for each hull type when switching. | ❌ Missing | v4 has one `paidTowardShipBuilding` value and one current hull. |
| Ship build progress/ETA | Panel displays percent complete and v3 can estimate turns. | 🟡 Partial | Construction percentage is shown in selected-star and ship-detail panels. ETA is still absent and the under-construction hull is still represented as a selectable ship. |
| Default new-ship destination | System “Send to” automatically dispatches new ships. | 🟡 Partial | Right-click while a star is selected sets an object/coordinate destination and completed mobile ships inherit it (`game.js:300-376`, `star.js:204-215`). The map indicator now converts the destination to screen coordinates before drawing. There is no rendezvous picker or clear/edit UI. |
| Ships in system | Dedicated list/panel for inspecting and selecting docked ships/fleets. | ❌ Missing | `star.ships` exists, but no list or panel is exposed. |
| Rename colony/system | Edit menu rename dialog; new colony asks for name. | ❌ Missing | No rename command or colony naming prompt. |
| System comparison window | Sortable “Your Star Systems” table. | ❌ Missing | No equivalent UI. |

## 4. Ships and navigation (26% complete)

| v3 function | v3 behavior/UI | v4 status | Evidence and remaining work |
|---|---|---|---|
| Four hull roles | Satellite, Scout/Courier, Colony, Battleship with distinct cost/speed/combat/scanner roles. | 🟡 Partial | Types, cost, speed, power, scout scanning, and first-pass combat/capture exist. Key role behaviors such as technology transfer, patrol, and repair remain incomplete. |
| Battleship drive classes/names | A new named class every five tech levels (Traveler through Hellion). | ✅ Implemented | Class index/name and first-of-class event are assigned in `star.js:180-203`, using resource ID 800. |
| Ship information/diagnostics | Name, class, tech, speed, power, damage/health bar. | 🟡 Partial | v4 shows type, tech, speed, and power (`display.js:690-721`). It does not show ship name, damage/health bar, patrol/docked state, course, or scanner information. |
| Direct destination orders | Add destination to a star, ship, fleet, or open space. | 🟡 Partial | Right-click sets one destination for a selected owned ship/fleet, and the popup Orders button can arm a left-click destination target. It replaces rather than appends a course. |
| Multi-waypoint courses | Ordered waypoint list with current destination in bold. | ❌ Missing | A ship has only one `destination`. |
| Add/edit/delete waypoint | Buttons and A/E/Delete shortcuts. | ❌ Missing | No waypoint model or editor. |
| Clear entire course | Clear button/shortcut. | ❌ Missing | No command; destination can only be replaced or cleared programmatically. |
| Repeat/loop course | Repeats the waypoint circuit. | ❌ Missing | No loop state. |
| Course memory | Save/swap a ship's course. | ❌ Missing | No course-memory state. |
| Call in | Ship asks for attention next turn. | ❌ Missing | No ship call-in flag or attention queue. |
| Automatic idle call-ins | Newly built or idle ships request orders periodically. | ❌ Missing | Events are logged only; there is no attention workflow. |
| Patrol mode | Ship or fleet patrols a friendly system and gains defensive advantages; satellites always patrol. | 🧱 Scaffold only | Combat formulas reference `isOnPatrol()`, but it always returns false and is marked TODO (`ship.js:184-187`). There is no patrol command. |
| Hunt mode | Course behavior seeks/intercepts hostile units. | ❌ Missing | No hunt state or command. |
| Scrap ship/fleet | Mark for scrapping and recover part of build value. | 🧱 Scaffold only | `Rules.getShipScrapValue()` exists, but no scrap state, command, or resource return is wired. |
| Movement by drive speed | Ships advance once per turn; scout faster, colony slower, satellite stationary. | ✅ Implemented | `ship.js:44-83` and `rules.js:125-145`. |
| Colonize neutral system | Colony ship is consumed; system takes owner and ship tech. | 🟡 Partial | Implemented in `ship.js:218-253`, but it emits `SHIP_ARRIVED` twice rather than `STAR_COLONIZED`, has no rename/economy prompt, and calls removal twice (the second splice can remove an unrelated final ship). |
| Courier technology pickup/transfer | Courier updates its library from higher-tech systems and upgrades lower-tech colonies. | ❌ Missing | Ships receive build-time tech only; arrival does not exchange technology. |
| Battleship technology delivery | Battleships can upgrade colonies but cannot update their own library. | ❌ Missing | No arrival-time technology transfer. |
| Docking and repair | Damaged mobile ships repair at friendly systems based on system tech/production. | 🧱 Scaffold only | Damage and `repairDamage()` exist, and rules compute a repair amount, but no turn path calls it. |
| Ship arrival/interception outcomes | Friendly arrival docks/forms fleet; enemy arrival fights. | 🟡 Partial | Star docking, friendly ship/fleet formation, and enemy arrival combat are now wired through `CombatSystem`. Remaining gaps include richer arrival events, course continuation, and UI feedback. |

## 5. Fleets and rendezvous (42% complete)

| v3 function | v3 behavior/UI | v4 status | Evidence and remaining work |
|---|---|---|---|
| Fleet entity | Group operates as one unit; power sums and speed is slowest member. | ✅ Implemented | `fleet.js:7-118`; map and detail rendering are present. |
| Form fleet by meeting ships | Friendly ship targeting another friendly ship automatically forms a fleet. | ✅ Implemented | `game.js:700-742` and `ship.js:254-258`. |
| Join/merge fleets | Ship joins friendly fleet; two fleets can merge. | ✅ Implemented | Arrival and `mergeFleets()` support these cases. |
| Exchange/remove ships | Fleet/group panels move selected ships between fleets or out of a fleet. | 🧱 Scaffold only | `addShip()`/`removeShip()` exist, but there is no player-facing fleet contents/exchange UI. |
| Fleet contents panel | Lists ships/groups and health. | 🟡 Partial | Fleet detail shows counts by type, but not individual ships or interactive selection/exchange. |
| Fleet navigation | Fleet course panel and the same course tools as ships. | 🟡 Partial | A fleet can receive one right-click destination and move at slowest speed; waypoint tools, loop, memory, patrol, call-in, and hunt are absent. |
| Named fleets | New fleet prompts for a name; rename is available. | ❌ Missing | Fleets are displayed only by numeric ID. |
| Rendezvous points | Place/name/move/delete a point in open space, on a system, or on another ship. | ❌ Missing | No rendezvous entity, placement mode, or UI exists. Arbitrary coordinate auto-destinations are not a substitute because they cannot collect/name/manage a fleet-forming target. |
| Auto-form fleet at rendezvous | Ships sent by producing systems assemble into a named fleet. | ❌ Missing | Default destinations exist, but open-space arrivals do not create a shared target or assemble a fleet. |
| Fleet comparison window | Sortable “Your Fleets” table. | ❌ Missing | No equivalent UI. |

## 6. Combat, occupation, defense, and fog of war (54% complete)

| v3 function | v3 behavior/UI | v4 status | Evidence and remaining work |
|---|---|---|---|
| Ship/fleet combat on interception | Enemy forces exchange attacks; defeated units are removed and winner continues. | 🟡 Partial | `CombatSystem` is instantiated by `Game`, enemy ship/star/fleet arrivals invoke it, and destroyed ships are removed from game/star/fleet containers. Combat presentation, balancing, and full fleet-result reporting are still thin. |
| Combat reserves | Couriers and colony ships stay in reserve until combat ships are gone. | ✅ Implemented | Reserve sorting is now used by the runtime combat path. |
| Multi-target and rollover damage | Higher-tech attackers hit multiple targets and excess damage rolls over. | ✅ Implemented | The resolver uses tech-based target counts and rollover damage during runtime combat. |
| Defended-system invasion | Defeat stationed ships, then fixed planetary defenses; production/population is damaged. | 🟡 Partial | Enemy star arrivals now run space combat, ground combat against population, and colony capture when a colony survives. Production damage, result UI, and v3-accurate tuning still need work. |
| Capture/surrender | Successful invasion transfers system ownership and reports capture/surrender. | 🟡 Partial | A surviving colony ship can transfer ownership after ground combat. Surrender/result UI, production/population damage presentation, and v3-accurate reporting still need work. |
| Defense satellites | Stationary, strong, always on patrol, cannot repair. | 🟡 Partial | The hull is stationary and attached satellites are included in star-defense combat. Patrol, repair restrictions, and the build/attach path still need cleanup. |
| Patrol coordination bonus | Patrolling defenders receive attack/defense advantages. | 🧱 Scaffold only | Bonus formulas exist but patrol can never be enabled. |
| Damage and destruction | Health decreases, units die, fleet loss accounting and debris/explosion feedback. | 🟡 Partial | Runtime combat now applies damage and removes destroyed ships robustly. Fleet loss accounting is basic, and debris/explosion feedback is still missing. |
| Repairs | Friendly docking repairs surviving mobile ships; satellites do not repair. | 🧱 Scaffold only | Repair calculations exist but are never called. |
| Scanner-based fog of war | Stars/scouts reveal enemy presence, owner, tech, then class/details by range; scout stealth matters. | 🟡 Partial | Spatial visibility levels, star/scout scanners, and stealth calculations exist. Visibility only increases and is never cleared when an entity leaves range; remembered/last-seen presentation is not distinguished. |
| Fog-of-war rendering | Enemy colonies/ships are hidden or partially identified according to visibility. | 🟡 Partial | Enemy ships and fleets are hidden when visibility is none, and star ownership/detail rendering now reads numeric visibility levels correctly. Stars are still always plotted; remembered/last-seen presentation and fuller class/detail UI remain incomplete. |
| Omniscient mode | Disabling Fog of War shows the whole galaxy. | ✅ Implemented | Disabling fog through startup/config makes visibility queries and display helpers treat enemy stars, ships, and fleets as fully visible; covered by fog and command UI tests. |
| Combat odds estimate | Not part of shipped v3/manual behavior; listed as a v4 future enhancement. | ❌ Missing / not a parity blocker | Correctly remains in `docs/FUTURE_IMPROVEMENTS.md`; it should not be counted as missing v3 parity. |

## 7. Computer players (38% complete)

| v3 function | v3 behavior/UI | v4 status | Evidence and remaining work |
|---|---|---|---|
| AI turn participation | Computer systems choose production and ships choose strategic destinations. | 🟡 Partial | AI players are created and processed before movement (`game.js:48-67`, `554-569`). Star build and ship destination decisions can execute. |
| AI ship decision matrices | Role-aware selection of colonies, enemies, friendly systems, and fleet formation. | 🟡 Partial | A large decision matrix port exists, and attack destinations can now resolve combat. Fleet formation is still a log-only placeholder in AI, and several factors use placeholders. |
| AI economy management | Adjusts growth/research/ships by development and threat. | 🧱 Scaffold only | Priorities are calculated but `applyEconomicAllocation()` only logs them (`ai-star.js:133-142`). |
| AI defenses | Builds satellites/patrols/reacts to threats. | 🧱 Scaffold only | Defense decisions exist, but `activateDefenses()` only logs. |
| Skill differences | Five v3 skill levels affect search depth/quality. | 🟡 Partial | The v4 AI system has only three effective levels; lower two v3 levels map to Average. |
| Advantage modifier | Production/decision advantage from -3 to +3. | 🧱 Scaffold only | Stored only; not applied. |

## 8. Events, messages, comparison, help, and general UI (35% complete)

| v3 function | v3 behavior/UI | v4 status | Evidence and remaining work |
|---|---|---|---|
| Main information/navigation panels | Context-sensitive system, ship, fleet, and list panels with command buttons. | 🟡 Partial | v4 draws anchored context panels for selected systems, ships, and fleets plus simple menu/event/comparison windows. Permanent map buttons and popup arc buttons are clickable, and panel clicks are consumed so they do not dismiss selection. The v3 contextual button architecture, list panels, and richer command workflows are still absent. |
| Window/dialog chrome | v3 uses styled windows, separators, fixed command areas, and map controls. | 🟡 Partial | v4 now uses charcoal rounded panels, light-gray text, medium dividers, hover brightening/darkening, a top-center game/turn header, bottom-right permanent map buttons, and pointer triangles on anchored panels. It is intentionally simple and still needs final visual direction, more responsive layout polish, and v3-level window variety. |
| Keyboard shortcuts and hover help | Buttons advertise shortcuts; balloon/flyby help describes controls. | 🟡 Partial | More keys are wired (`M/E/P/V`, production controls, `C`, `H`, zoom keys), clickable buttons show `<key>` notation after the label, and hover brightens text/darkens button backgrounds. There is still no hover/balloon help. |
| Events from last turn | Dedicated show/hide event window with selectable event list and narrative text. | 🟡 Partial | `Game` now retains recent noteworthy events and `[E]` or the Events map button opens a simple localized event list. It is not selectable, filtered by last turn, or as narratively complete as v3. |
| Attention queue | New ships, idle ships, colonies, messages, and other important events select themselves in sequence. | ❌ Missing | No `needy` queue; Tab is repurposed to end the turn. |
| New technology lab presentation | Illustrated new-drive event. | ✅ Implemented | Dimming lab overlay with blueprint art; dismissed with any key. |
| New battleship class/stardock presentation | Illustrated first-of-class event. | ✅ Implemented | Stardock overlay and ship art in `display.js:920-944`. |
| Colonization/capture/battle event text | Player-relative narrative messages for 45 event types. | 🟡 Partial | A small localized subset of event text is retained and displayed in the event list. It is still not player-relative in the v3 style and remains far short of v3's event coverage. |
| Compare players | Sortable comparison with best values blue and worst red. | 🟡 Partial | `[V]` or the Compare map button opens a simple player comparison table for stars, ships, population, average tech, and max tech. It is not sortable and does not color best/worst values or compute v3 scores. |
| Send/show/hold player messages | Multiplayer chat to one/all/admin, with message history and repeat settings. | ❌ Missing | No chat or message model. |
| Rename ship/fleet/colony/rendezvous | Edit menu rename workflow. | ❌ Missing | No rename UI. |
| Sound and attention cues | Sound toggle, attention sound, combat/build feedback. | ❌ Missing | No sound use or preference found. |
| Preferences | Persistent drawing, sound, language, and game preferences. | ❌ Missing | No preferences UI or persistence. |
| User's Manual | In-app menu opens the manual. | ❌ Missing | The current v4 UI has no Help/manual command. The public v3 manual remains available online. |
| Interactive tutorial | Guided scripted game teaches map, production, ships, fleets, events, and comparison. | ❌ Missing | v3 tutorial resources and controller have no v4 equivalent. |
| Internationalization | v3 language plug-ins; menu can switch languages. | 🟡 Partial | v4 has English, German, Spanish, French, Japanese, and Russian string files and a `--lang` runtime argument when passed after the `gad4` launcher separator, such as `./gad4 -- --lang=es`. Current user-visible runtime strings are resource-driven and tested for localized ID/placeholder parity, but there is still no in-game language switcher and future unported v3 dialogs/help will need new resources. |
| Original art use | Ship/event/background artwork reinforces game state. | 🟡 Partial | v4 uses background and lab/stardock/ship assets, while most UI buttons, panels, animations, and states are drawn as styled primitives/text. |

## 9. Save/load, multiplayer, and host administration (0% complete)

| v3 function | v3 behavior/UI | v4 status | Evidence and remaining work |
|---|---|---|---|
| Save turn / Save As | Saves a single-player turn document. | ❌ Missing | `PlayerInfo.toJSON()` alone is not a game save system. No complete game serializer or file command exists. |
| Open saved game | Opens a saved turn. | ❌ Missing | No deserializer for game, stars, ships, fleets, courses, events, visibility, or configuration. |
| Revert to saved turn | Restores the last saved state. | ❌ Missing | No implementation. |
| Host new network game | Creates host data, starts server, and presents join flow. | ❌ Missing | `GameConfig.hosting` is data only. There is no network/server code in v4. |
| Open as host / dedicated host | Resume a hosted game and optionally run without a local player. | ❌ Missing | No equivalent. |
| LAN/Internet discovery | Browse advertised games and query the matchmaker. | ❌ Missing | No equivalent. |
| Join by list/IP/hostname | Inspect game information, choose a slot, join or rejoin. | ❌ Missing | No equivalent. |
| Player login/password/rejoin key | Open slots, optional saved password, reconnection, version/private/full checks. | ❌ Missing | `PlayerInfo.password`/`isLoggedIn` are unused model fields only. |
| Turn posting and synchronization | Clients send changed objects and post completion; host resolves turn. | ❌ Missing | v4 directly mutates one local game and advances immediately. |
| Timed turns | Host clock, time remaining, pause/resume, automatic completion. | ❌ Missing | No runtime timer. |
| Host administration | Change settings/player, end turn now, pause/resume, edit state, eject users. | ❌ Missing | No host/admin mode. |
| Multiplayer chat | Player-to-player/all/admin messages. | ❌ Missing | No networking or chat. |

## Documentation status

The project documentation was refreshed on 2026-08-25 so the docs now agree on current runtime status rather than mixing old plans with newer implementation summaries.

- `MAP_GENERATION_PORT_STATUS.md` records current map-generation status instead of listing already-completed work as future tasks.
- `AI_INTEGRATION_STATUS.md` and `AI_INTEGRATION_TODO.md` describe AI as active but partial: AI turns run, stars can start builds, and ships can set destinations, while economy allocation, defenses, fleet formation, advantage, and finer skill behavior remain incomplete.
- `README.md` now links only to files that exist and no longer describes the port as a complete 4X game.
- `INTERNATIONALIZATION_STATUS.md` now serves as the current i18n reference and records that current runtime UI/event strings are localized with parity tests across supported languages.
- `TESTING_GUIDE.md` and `tests/README.md` now match `tests/run-tests.js`, including the current runner command and 286-test expected result.

This file remains the main parity source of truth. More focused docs may describe implementation details for an area, but their status claims should stay consistent with the tables above.

## Recommended parity sequence

1. **Make the core game completable:** harden combat/capture edge cases, tune battle outcomes against v3, finish victory/defeat state, and surface combat results to the player.
2. **Finish essential player control:** complete the build selector/progress workflow, production lock/equalize behavior, ships-in-system, damage state, patrol, repairs, courier tech transfer, and clear destination controls.
3. **Restore v3 navigation:** waypoint lists, add/edit/delete/clear, looping, course memory, call-in, attention queue, and event history.
4. **Finish fleets:** contents/exchange UI, named fleets, rendezvous points, auto-assembly, richer fleet combat reporting, and fleet visibility.
5. **Add game setup and persistence:** setup screen for all supported options, then full save/open/revert.
6. **Add comparison and polish:** sortable/scored player tables, system/fleet tables, display modes/toggles, renaming, sound, manual link, tutorial, and final UI art direction.
7. **Port multiplayer last:** host/join/rejoin, synchronization, turn posting/timers, chat, discovery, and administration rely on the preceding state model being stable and serializable.
