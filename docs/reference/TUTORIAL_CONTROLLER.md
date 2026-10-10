# Tutorial progression controller

`src/js/tutorial-controller.js` implements the progression model for the sixty
original lessons. It is not yet connected to startup, the game input path or a
rendered instruction panel. A successful model walkthrough is not proof of a
playable tutorial. Session preservation and localized runtime lessons remain
required work in `V3_V4_FEATURE_STATUS.md`.

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
preferences. The pending session owner must do that work.

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
