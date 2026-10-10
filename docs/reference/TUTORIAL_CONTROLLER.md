# Tutorial progression controller

`src/js/tutorial-controller.js` implements the progression model for the sixty
original lessons. It is connected to an explicitly bound tutorial game through
`src/js/tutorial-runtime.js`, and rendered by a floating localized instruction panel. There is no public startup
entry yet. A successful model walkthrough is not proof of a playable tutorial.
The public launch UI, illustrations, complete saves and full guided walkthrough
remain required work in `V3_V4_FEATURE_STATUS.md`.

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
complete tutorial save: the session owner must also preserve the game graph,
renderer/camera, file association, previous game and progress in setup. Normal
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
