# Tutorial progression controller

`src/js/tutorial-controller.js` implements the progression model for the sixty
original lessons. It is connected to an explicitly bound tutorial game through
`src/js/tutorial-runtime.js`, and rendered by a floating localized instruction
panel. Launch it with Tutorial on the start screen or in-game command menu.
The full normal guided route is verified through real UI input in all six
languages; public launch/cancellation is also verified in each language, with a
complete English run from the visible launch button. V3 saves the practice game
without persisting instruction progress. Active-tutorial Open and Revert retain bindings and preserve independent
documents. See the source audit and lifecycle verification below.

The constructor accepts decoded page metadata and callbacks. Use `tutorial-lessons.js::load(dataDirectory, language)` for runtime pages;
`v3-tutorial.json` is a source reference,
not an English-only UI dependency. The model needs every logical lesson and
recovery pages 100, 101 and 103. macOS alternate resources replace presentation
metadata without changing the logical page number. Source page 102 does not
exist and is not invented.

Source behavior comes from:

- `GalacticaTutorial.cp::LoadPage`, `NextPage` and `TutorialWaiter`: logical
  increments, completion sentinel, ordered window exceptions, hidden buttons,
  and resettable delays.
- `Galactica.cpp::cmd_GalacticaTutorial` and `cmd_TutorialOK`: existing game,
  modal recovery, About/splash dismissal and explicit startup overrides.
- `CGameSetupAttach.cpp` and `Galactica.cpp` name entry: new game, hosting,
  setup and player-name steps.
- `CMessage.cpp:241–257` and `GalacticaDoc.cp:1667–1805`: separate message
  appearance, acknowledgment, attention presentation and empty-queue steps.
- `GalacticaPanels.cp:383–396,453–462,562–589,904–1025`: waypoint, patrol,
  equalize, build choices, slider delays and new-ship destinations.
- `GalacticaDoc.cp:699–768,830–848,1069–1080,2068–2076,2950–2962` and
  `GalacticaUtilsUI.cpp:299–309`: rendezvous placement/naming, colony naming,
  comparison windows, homeworld selection and the naming dialog opening.

Integration must emit `observe` events from successful actions and presentation
lifecycle changes, rather than merely from attempted commands. The first colony
course is exceptional: consult the result before applying the waypoint because
a wrong target is rejected and advances to Retry. Validate a rendezvous location
with `placementAllowed` before creating it; emit `rendezvousPlaced` with the
actual allocated object ID after successful creation. Source-fixed system IDs
remain 2, 9 and 7. The rendezvous ID is bound dynamically, since v4 entity
allocators need not reproduce the source's global object numbering.

Apply returned effects to the tutorial game only: forced New Terra/Alpha names,
courier-route correction and playback changes. The `onEnter` callback receives
separate entry effects for early homeworld focus and the final playback/help
restoration. `onDismissWindow` requests closing an About/splash presentation;
`onStop` reports completion or cancellation. These callbacks do not themselves
preserve, replace or dispose a game, save-file association, renderer or
preferences. The session owner described below supplies that lifecycle.

`pressButton` refuses action-only pages. `advance` and `goto` are controller
primitives, not UI actions that may be offered to skip required work. Repeated
zoom changes delay progression until more than three seconds after the last
change; allocation changes use two seconds. Use a monotonic millisecond clock.
Changing pages or canceling clears the pending delay.

`snapshot(now)` and `restore(saved, now)` retain logical page, active state,
next-page override, rendezvous identity and remaining delay. They do not
serialize the game or a previous session. Restore rejects unknown destinations,
missing recovery metadata, corrupt identifiers and timers outside their two
waiting pages. Restoring progress does not replay game-entry effects or stop
callbacks, so it cannot reset a restored selection or preferences by itself.


## Binding one tutorial game

Construct `TutorialRuntime(game, controller)` only for the separate tutorial
game. It installs removable instance wrappers, without modifying Game/Display
prototypes. It observes successful allocation/build/waypoint/name/patrol actions,
rendezvous creation, auto-destination clicks, comparison windows, the existing
fleet Exchange ships contents table, attention, report windows and turn delivery.
Failed changes and blocked controls do not advance lessons.

Wrong first-course choices are rejected before course mutation. Invalid
rendezvous clicks retain captured placement; accepted creation binds its actual
ID and opens the existing localized rename dialog. Required names are applied
before the normal rename event is recorded. These source proper names remain
New Terra and Alpha rather than locale-dependent map identifiers.

Message acknowledgment notifies the controller before the next queued report is
considered, matching v3's late playback suppression. Animation-only destruction
presentations do not count as modal acknowledgments. The runtime remembers the
first human colony/courier identities; destruction cannot substitute a different
ship for an original tutorial actor. Effects affect only the tutorial game and
do not write drawing preferences.

`Game.draw` ticks the controller using the game clock. Existing display zoom
methods report successful changes; call `attachDisplay` after assigning a new
renderer. `dispose` restores the original instance property descriptors and
callbacks and is idempotent. Attachment failures roll back partial wrappers.

Runtime `snapshot()` includes actor IDs and controller progress; `restore()`
validates hull/owner identities and progress before applying them. This is not a
complete tutorial save. These internal snapshots are not evidence that v3
persisted tutorial progress. Normal
Save/restore does not install or persist the runtime automatically. The startup actions for lessons 1–4 are connected by the session owner below.
All sixty lesson texts are now available in six languages, with recovery pages
and platform variants. The visible instruction panel is implemented below; the full walkthrough remains unfinished. No startup/menu
command advertises this partial tutorial yet.


## Temporary tutorial document ownership

`TutorialSession` owns the controller and runtime separately from ordinary open
sessions. The existing map remains visible through recovery page 100; its
acknowledgment captures the application and suspends it before showing setup.
The actual setup and player-name buttons drive pages 3 and 4 using the original
window exceptions (34, 4 and map window 1). Startup loads the shipped fixed galaxy
and assigns a localized Tutorial title, with no ordinary document/file identity.
The temporary session has ID 0, consumes no ordinary session ID, stays out of the
open-game list and blocks session switching/replacement until it ends.

Cancellation disposes the runtime and temporary renderer and restores the exact
prior game, renderer, configuration/editors, file association and autoplay
controller. Autoplay timers resume only if that restored controller was running.
Successful completion disposes only the runtime, removes the scripted production
helper and promotes the practice game to an unsaved ordinary open document,
retaining its renderer, camera and private random stream. Prior open documents
remain available in Open games. This follows `GalacticaTutorial.cp:111–116,
498–520`: finishing closes the instructions while leaving the practice game open.
Completion before accepting a practice game, attachment failures and fixture
construction failures restore the original application; repeated cleanup is
harmless. Cancellation preserves unfinished initial setup when no game was open. Visible instruction controls, tutorial save/resume and presentation pictures remain required.
Lesson entry audio now uses the shared Sound preference and stops when the
session ends, including cancellation before acknowledgment. Source-silent
pages do not play a cue. The sample is identical in both shipped languages.
Tutorial games now own the private random stream described below.


## Tutorial randomness

`simulation-random.js` routes calls by owning game rather than patching global
functions or relying on temporary ambient context. `createTutorialGame` installs
a private seed-101 Park–Miller state object. Ship/system combat, AI utilities,
AI skill variation and random AI/skill factories use it; a normal game falls back
to the same native PDG calls as before. No stream is shared between tutorials.
The generator uses exact integer arithmetic, and its plain `{algorithm,state}`
object is retained and validated by graph saves. Missing state in older ordinary
saves remains valid. This preserves random continuation only; restoring the full
tutorial runtime, simulation safeguards and session ownership is separate work.
The portable stream is not asserted to reproduce the old platform library's
exact random sequence. Full guided-playthrough verification remains required.


## Runtime lesson resources

`data/tutorial/pages.json` holds the common controls for all 66 source resource
IDs: sixty lessons, three recoveries and three macOS presentation variants.
`tools/make-tutorial-runtime-metadata.py` reproduces it from the decoded reference
and rejects differences in the English/German action controls. Individual JSON
files in `data/tutorial/languages` provide all 63 logical texts, grouped headings
and button labels in en/de/es/fr/ja/ru. Platform variants reuse the matching
modern instructions without changing logical progression.

The text retains the original teaching sequence but describes current controls:
actual fill/target markers and locks, = equalization, Enter/Escape report
acknowledgment versus Tab attention, Scout couriers, map rendezvous placement,
inline Set destinations, command-menu Compare Players, Exchange ships and the
practice game remaining open. Names New Terra and Alpha are tutorial identities.
Text resources are source files, not generated output.

`load` resolves the selected language through LanguageSettings and reads only
packaged runtime files. A missing/blank translation fails validation rather than
silently substituting English. Unsupported language codes use the application's
ordinary English default. It validates headings/buttons/IDs, action destinations,
exceptions and presentation metadata, then returns independent page objects.
The still-hidden application entry now defaults to this loader. Runtime reload when changing language and the visible panel are implemented
below. Illustrations and the public launch action still need integration and
an actual guided walkthrough.


## Floating instruction panel

`src/js/tutorial-panel.js` renders the active localized heading, wrapped text,
Close tutorial and only the button supplied by the source page. Action waits
have no forward control. The application draws instructions after setup/map UI
and routes their pointer input before modal setup handling. Clicks and wheel
events inside instructions are consumed; outside input continues to the lesson
controls. Page changes and cancellation retain mouse-up capture so a button
click cannot deselect the underlying map object. File/error dialogs retain
foreground priority. Keyboard input continues to setup and gameplay rather than
providing a shortcut around required actions.

The bright neutral gradient and gold edging reuse shared window Attributes.
Unlike ordinary system windows, these instructions float without blocking the
actions they teach, matching `GalacticaTutorial.cp::LoadPage`. Source edge
preferences guide placement; current setup, inspectors, reports and system
windows guide collision avoidance. Where there is room, instructions narrow
to fit beside a centered system window. Text wraps at Unicode boundaries and
scrolls when the port cannot show the full lesson. Wrapping is cached between
page/width changes. Dragging the title constrains the window to the port and
persists its position through drawing preferences.

Language changes reload validated runtime pages and use
`TutorialController.replacePresentation`. They preserve the active page,
next destination, rendezvous identity and pending delay without replaying entry
callbacks, sound or gameplay effects. Changed control destinations, exception
records or button presence are rejected. All six languages are supported.

Browser verification uses the hidden test entry to click real instruction,
setup and name buttons, advance the zoom lesson through the normal renderer
clock, drag and reopen instructions, cancel a running practice game and switch
language through Settings. Finale lifecycle checks still use a fixture jump to
page 60; they do not prove a complete guided playthrough. There is no public
Tutorial menu item yet. Lesson illustrations and complete tutorial save/resume
remain separate unfinished requirements.


Lab and stardock overlays acknowledge Enter/Return before the end-turn shortcut,
so the first ship report preserves the current turn and queued reports. An
explicit foreground end-turn confirmation still takes precedence. The first
attention lesson asks the player to acknowledge remaining reports before Tab;
actual six-language browser runs reach the first colony ship on turn 2. Subsequent construction and deferred-attention repairs below extend that
verification. These checks do not establish a full guided playthrough.


Ordinary construction now follows v3's notification rules: first-class stardock
reports remain, but satellites and mobile hulls assigned an automatic destination
do not add a built-ship order request. Real six-language tutorial walks now select
the original colony ship at lesson 28. Continued English input reaches lesson 34,
where Scout-class acknowledgment previously left the home system selected.
The shared deferred-attention behavior below repairs that transition.


### First attention request after turn reports

V3 calls `ShowMessages` followed by `ShowNextNeedyThingy` when activating a
completed turn (`GalacticaDoc.cp:2648–2673`) and when resuming pending playback
on window activation (1449–1453). Ordinary v4 turns now defer one attention
request until report playback and foreground interactions finish, at the draw
boundary. Manual Next item/Tab suppresses a second automatic jump. Quiet
playback does not navigate. Saves retain pending navigation; older saves that
lack this field keep their original selection without scheduling a new jump.

Report focus handles its own entry, without consuming an additional naming or
production instruction sharing the same subject. This follows v3's single-entry
handling (`GalacticaDoc.cp:3044–3077`, `CMessage.cpp:869–874`). Explicit attention
also handles exactly one request. Actual six-language walkthroughs now reach
lesson 34 with the Scout selected and issue its New Terra course to reach 35.
The continued English walkthrough reaches the automatic-destination lesson 41,
where the browser initially omitted choosing Alpha from the overlapping-object
picker. Correcting that input advances the destination lesson; the naming
identity repair below also protects unrelated stars. No public
launch, illustration or complete tutorial save/resume requirement is claimed
complete by this focused verification.


### Naming identifies object kind as well as ID

V3's new-rendezvous command applies the tutorial's forced Alpha name directly
to the created `CRendezvous` (`GalacticaDoc.cp:723–747`). V4 has independent
numeric IDs for stars and rendezvous points. Rename observations and effects
now include the object kind, so Alpha's effect resolves a rendezvous and
New Terra's effect resolves a star. Naming another kind with a matching ID
neither forces the lesson's name nor advances that lesson.

Actual six-language browser runs choose Alpha from the overlapping-object
picker and advance to lesson 42 with Andromeda's automatic destination set to
that exact rendezvous. They verify every unrelated star retains its original
name. The corrected longer English walkthrough reaches lesson 57 but does not
yet select the newly built fleet for its contents instruction. That transition
still needs source verification; the full tutorial remains unfinished.


### Skipped enemy playback and a complete guided route

V3 processes disabled enemy autoshow reports by calling `MessageHandled`
without selecting their subjects (`GalacticaDoc.cp:1629–1633`). V4 now does
that when draining already queued observer reports and when processing a turn
with enemy playback disabled. The reports remain accessible for manual replay;
manual-only fleet notices are not skipped by this autoshow rule.

The tutorial's lesson-55 acknowledgment now skips the remaining enemy reports
before the first automatic attention request. That request selects the player's
new Alpha fleet, rather than an enemy colony, and the real Exchange ships action
advances lesson 57. Both native lanes pass 1,290 tests, including an actual
formation/report/attention/contents regression and save/manual-replay checks.

The full normal guided route is verified in en/de/es/fr/ja/ru using real setup,
name entry, map/production controls, order and destination selection (including
the overlapping-object picker), reports, attention, comparison, fleet contents
and instruction buttons through Finish. Browser input uses the hidden internal
entry only to launch; it does not jump lesson pages or force game/simulation
state. Startup's page-2 exception and optional wrong-course recovery page 18
are covered separately by model/runtime tests. Screenshots are under
`/private/tmp/galactica-parity/tutorial-skipped-observers/<language>` and logs
are `/private/tmp/galactica-tutorial-skipped-observers-<language>.log`.
Public launch, illustrations and complete tutorial save/resume remain open.


### Public startup and menu commands

V3's `Galactica.cpp:2176–2215` chooses the existing-game hiding page when a
map is open, otherwise the welcome page, and preserves startup/name-window
exceptions. The new start-screen Tutorial button and command-menu Tutorial
row call the existing document owner with those contexts. The game menu closes
before launch so cancellation returns to the map. Duplicate launches are
unavailable while instructions are active; the setup button and its help are
also hidden during practice setup. Both entry points use translated title 960,
with new translated control help 964 in all six supported languages.

Tests cover actual menu hit targets, duplicate prevention, cancellation with an
existing document and compact layout reachability. Both native lanes pass all
1,292 tests. Browser input clicks both visible launch controls in en/de/es/fr/ja/ru,
starts the fixed 42-system practice game and cancels, proving the previous game,
renderer, session, saved document and file association remain intact. Reviewed
screenshots are under `/private/tmp/galactica-parity/tutorial-launch/<language>`;
logs are `/private/tmp/galactica-tutorial-launch-{tests,native-tests,<language>}.log`.
A complete English walkthrough from the visible startup button also proves
Finish removes tutorial state and promotes practice to an ordinary unsaved
local document; see `/private/tmp/galactica-tutorial-public-guided-en.log`.


### Illustrated modern controls

Audited every nonzero PICT reference in the shipped English/German lesson
resources and the original teaching text (`Resources/gal-tutorial-en.r`,
`Resources/gal-tutorial-de.r`, `GalacticaTutorial.cp::LoadPage`). The sixteen
references use fifteen picture IDs, including two welcome pages and the macOS
New Game alternative. `tutorial-illustrations.js` renders a modern equivalent
for each ID using cached Attributes and live localized control labels:

| Picture | Modern teaching example |
| --- | --- |
| 7000 | Galactica-4 welcome heading |
| 7001, 8001 | New Game menu command |
| 7002 | Actual production fills and target markers |
| 7003 | End Turn and its shortcut |
| 7004 | Orders and its shortcut |
| 7005 | Half-alpha tracking line and target crosshair |
| 7006 | Defense construction control |
| 7007 | Rendezvous placement between Andromeda and New Terra |
| 7008 | Equalize icon and shortcut |
| 7009 | Send to/Set destination and Alpha marker |
| 7010 | Three health bars at different damage levels |
| 7011 | Fleet members and Exchange ships control |
| 7012 | Patrol control and shortcut |
| 7013 | Exchanging a member out of a fleet |

The panel reserves illustration space below instruction text and above its
footer. Long text retains independent scrolling in narrow ports. Illustrations
consume clicks without progressing action-wait lessons. Placement includes
real context controls and prioritizes exposing them over passive inspectors;
this repairs the browser-detected Orders occlusion when the figure enlarged
lesson 16. Switching language redraws figure labels from the same resource
strings as the controls; no screenshot captions remain in another language.

Both native lanes pass all 1,295 tests. Coverage includes every source ID in all
six languages, 320×340 layouts, illustration input, label localization, reused
Attributes and the real Orders placement regression. Actual browser input from
the public Tutorial button completes the normal route through Finish in all
six languages, including ordinary practice-document promotion. Reviewed lesson
screenshots are under `/private/tmp/galactica-parity/tutorial-illustrations/<language>`;
separate rendered galleries cover all picture IDs, including startup exceptions,
under `/private/tmp/galactica-parity/tutorial-illustration-gallery/<language>`.
Active-tutorial Open/Revert ownership remains unfinished.


### Save scope and active-document binding audit

V3 `Classes/GalacticaSingleDoc.cp::DoSave` (350–478) and
`ReadSavedTurnFile` (482–827) serialize the ordinary practice game, not the
instruction page or wait timer. Reserved expansion space is zeroed on write
and skipped on read. `GalacticaTutorial.h` keeps page numbers in runtime fields
and exposes no save/load API. `Galactica.cpp::OpenDocument` (1945–1981) opens
saved games as ordinary documents; only a tutorial resource launches instructions.
Consequently cross-launch tutorial resume is not a shipped-v3 parity requirement.
Older progress entries in this document calling it required are superseded by
this audit.

Within the running application, `GalacticaDoc::ShowWindow` (2638–2651) calls
`ReassignControlTo(this)` whenever instructions are active. Revert rebuilds the
map then calls ShowWindow (`GalacticaSingleDoc.cp:832–858`). V4's corresponding
load/revert paths currently leave the tutorial owner bound to the previous game.
That defect requires a separate implementation and verification item. Ordinary
practice saves preserve the graph and private RNG; they do not reactivate the
instruction runtime when opened. This source audit changes documentation only
and does not claim full tutorial or project parity.


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
rendered evidence. At that audit, recovery pages 100/101/103 retained model coverage. Existing-game
recovery (100) now has actual-input coverage described below; modal recovery
(101) still needs actual-entry verification, and hosting recovery (103) depends
on the still-unported multiplayer setup.
That is unfinished project work, not an unavailable-help blocker. No complete
project or Map Generation claim is made by this audit.


### Existing-game Hide/Close recovery: actual input audit (2026-10-10)

V3 `Galactica.cpp:2176–2240` starts at page 100 when a regular star-map
window exists. The original game stays visible until the Hide acknowledgment;
that acknowledgment hides it and proceeds to Welcome. V4 follows the same
sequence while retaining the document in its session list.

`tools/test-web-tutorial-existing-game.cjs` now provides a repeatable browser
regression. It starts and saves an ordinary game through actual controls,
launches Tutorial through the command menu, cancels both before and after Hide,
and checks identity of the original game, renderer, session and file reference.
It then follows the full normal tutorial route through actual mouse/keyboard
input, finishes into an ordinary unsaved practice game and selects the original
through Open Games. The original serialized graph, camera and selection, saved
file association and saved bytes are unchanged. The browser Save picker is an
explicit in-memory file-handle fixture; this does not claim OS file-dialog
coverage. No lesson jumps or synthetic progression events are used.

The harness waits for PDG input delivery and a subsequent draw, rather than
assuming CDP delivery means the queued native input has already run. This
replaces a fixed delay that intermittently let the next action run against an
old scene. Chrome output is muted; application sound logic remains enabled.
Native automation also mutes its output bus without changing saved preferences.

All six languages (en/de/es/fr/ja/ru) pass the complete recovery walkthrough.
Inspected the original/canceled/restored English views and the translated page
100 panels; the existing game view is preserved and labels fit. Both native
runtime suites pass 1,353 tests, including the new visible Hide/Close panel
regression. Logs: `/private/tmp/galactica-tutorial-hide-synchronized-<language>.log`
and `/private/tmp/galactica-muted-{tests,public-tests}.log`. Screenshots:
`/private/tmp/galactica-parity/tutorial-hide/synchronized-<language>`; reviewed
montages: `/private/tmp/galactica-hide-{recovery,languages}-review.png`.

This verifies recovery page 100. Modal recovery 101 still needs an actual
application-command entry path and rendered verification. Hosting recovery 103
still depends on the unported multiplayer setup. No runtime or localization
resource changes were needed for page 100.


### Modal tutorial recovery through actual application commands

Verified shipped v3 `Classes/Galactica.cpp:2176–2240`: Tutorial examines the
front modal window, automatically dismisses Intro/About, allows New Game and
Enter Name, and selects recovery page 101 for another modal. Its OK command
restarts entry against the current front window. The existing star-map path
then uses page 100 before hiding the original. No automatic closure or fake
progression through the obstructing dialog is part of this behavior.

V4 now resolves the real front application state for both tutorial launch and
instruction acknowledgment. Settings → Tutorial/T is available from startup
and the running game. Starting it retains Settings and the original document
while showing the localized Close the dialog recovery lesson. Retry while
Settings stays open remains on page 101. Closing the tutorial leaves Settings
open and the game unchanged. Closing Settings then acknowledging the lesson
rechecks the real state: startup proceeds to Welcome, and an open game proceeds
to Hide before entering practice. The instruction panel remains visible and
receives its own pointer/scroll/drag events above startup Settings. Modal clicks
and turn keys continue to respect the blocking window. A second tutorial cannot
be launched while the first is active.

Four new regressions cover front-window classification and the New Game/Enter
Name exceptions, actual Settings action/keyboard routing, the startup preference
model and translated Tutorial labels/help. All six existing lesson resources
remain the source of recovery text; no English-only UI strings were added.
Both native runtime suites pass 1,373 tests. The complete existing-game normal
walkthrough still passes using actual controls. The new repeatable muted browser
runner `tools/test-web-tutorial-modal.cjs` checks actual Settings entry, outside
clicks/turn keys, retry, Cancel, modal closure, Hide and restoration in both
startup and running-game modes for en/de/es/fr/ja/ru. Before/after Settings,
translated commands/recovery panels and restored originals were inspected.
The six bundled manuals now describe the available tutorial and modal recovery,
correcting their stale statement that the interactive tutorial was unavailable.

Evidence: `/private/tmp/galactica-modal-{tests,public-tests,game-<language>,startup-<language>,full-existing-game,final-en,before}.log`,
`/private/tmp/galactica-parity/tutorial-modal`, and
`/private/tmp/galactica-modal-{before-after,languages,settings}-review.png`.
This completes actual-entry verification for recovery 101. Recovery 103 remains
a requirement of multiplayer hosting, and native Quit/window-close integration,
other application/window commands, the wider parity inventory and Map Generation
remain active work. No global completion or unavailable-help blocker is claimed.
