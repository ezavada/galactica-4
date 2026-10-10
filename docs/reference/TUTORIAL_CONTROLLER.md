# Tutorial progression controller

`src/js/tutorial-controller.js` implements the progression model for the sixty
original lessons. It is connected to an explicitly bound tutorial game through
`src/js/tutorial-runtime.js`, but has no startup entry or rendered instruction
panel. A successful model walkthrough is not proof of a
playable tutorial. Session preservation is implemented below; localized runtime
lessons and the public launch UI remain required work in `V3_V4_FEATURE_STATUS.md`.

The constructor accepts decoded page metadata and callbacks. Use localized
runtime pages when the UI is wired; `v3-tutorial.json` is a source reference,
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
Visible instructions and the full walkthrough remain unfinished. No startup/menu
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

Cancellation/completion disposes the runtime and temporary renderer and restores
the exact prior game, renderer, configuration/editors, file association and
autoplay controller. Autoplay timers resume only if that restored controller was
running. Attachment and fixture-construction failures restore the original
application; repeated cleanup is harmless. Unfinished initial setup is preserved
when no ordinary game was open. Visible instruction controls, translated lesson
resources, tutorial save/resume and presentation audio/pictures remain required.
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
