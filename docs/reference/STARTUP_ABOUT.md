# Shipped startup and About presentation

This is source evidence for the startup/About port; the core presentation is now implemented, with remaining startup lifecycle/version work tracked in the parity checklist. It does not mark the
startup/About UI or its preferences as complete.

Regenerate the four shipped English/German shareware/CD-ROM variants:

```sh
python3 tools/import-v3-presentation.py /path/to/galactica-anno-dominari-3
python3 tools/test-import-v3-presentation.py
```

`v3-presentation.json` records source file and payload SHA-256 hashes, decoded
captions, referenced PICT resources, picture frames and scrolling parameters.
The importer reads only the requested hexadecimal resources; comments never
contribute bytes. Shared splash and logo artwork comes from
`Resources/gal-non-module.r`, rather than the language module. No translated v4
runtime strings or recreated graphics are supplied by this import.

## Behavior to port

- `Galactica.cpp::StartUp` (1674–1718) reads `ShowSplash`, defaulting to true
  when absent. Once per normal startup it opens Intro Box (PPob 32) before the
  initial tutorial/help and configured startup command. Registration holds
  startup in v3; the port must not invent a registration gate.
- `ShowAboutBox` (1790–1808) opens About Box (PPob 22) independently of
  `ShowSplash`, guards against duplicate openings and supplies the application
  version to the caption placeholder. Preserve the current game when closing.
- The two windows use the same splash art (PICT 131), but different scrolling
  content: startup uses Intro (134), About uses Credits (132). About also shows
  STS (135) and VendorNation (136) logos. Startup explicitly credits Edmund
  Zavada, James Whitehouse and Claudio Berni. About's static author caption
  names Edmund R. Zavada and James Whitehouse; Claudio Berni is credited for art
  in the scrolling Credits picture. Do not drop his attribution.
- Startup scrolling begins after 60 ticks, with a four-tick cadence and one
  vertical pixel per move. About begins after 120 ticks, with a three-tick
  cadence and one vertical pixel per move. `CScrollingPict::SpendTime`
  (231–263) uses a strict elapsed-ticks comparison and scrolls one pixel per
  eligible call; its catch-up multiplier is commented out. It wraps the picture
  after scrolling past its extent. Reduced-motion behavior can adapt this for
  accessibility without omitting narrative or credits.
- Intro includes the complete origin story, not merely a title/author splash.
  `old-art/PICT_134_Intro.png` and `old-art/screenshots/splash.jpg` are existing
  visual references; the latter was visually inspected during this audit.
- Tutorial command handling (2178–2214) closes startup/About first, then routes
  to Welcome or existing-game recovery according to the underlying window.
  This needs actual UI integration, not only the existing controller model.
- Both windows use the original looping music with a five-second fade on close.
  The missing movie composition metadata is the separately documented music
  blocker. It does not block implementing presentation, preference storage,
  dismissal, About entry, or tutorial recovery.

## Remaining verification

Implement startup and About, persist `ShowSplash` outside saved games, retain
current setup/game state across About and startup dismissal, and localize
narrative/controls to en/de/es/fr/ja/ru. Verify default-on, saved-off, unavailable
storage, re-entry, modal input, constrained draggable remembered windows,
version/attribution, tutorial recovery, reduced motion and narrow layouts.
Compare actual before/after screenshots, run relevant and full suites, and
check packaged artwork/string inclusion. Existing resource extraction is not
proof of runtime completion.
