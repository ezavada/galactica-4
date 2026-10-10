# Shipped startup and About presentation

This is source evidence for the startup/About port; the core presentation is now implemented, with remaining startup command work tracked in the parity checklist. It does not mark the
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

## Implemented and remaining verification

The core presentation and `ShowSplash` preference are implemented and verified
in six languages, including ordinary setup/game preservation, paging, reduced
motion, modal input, title dragging, original attribution, compact layouts and
packaged resources. First-install tutorial startup now snapshots preferences
before other factories initialize them; tutorial failure falls back to the manual.
Existing installations and later launches do not repeat automatic onboarding.
See `docs/V3_V4_FEATURE_STATUS.md` for the test and screenshot evidence.

About now identifies the actual development application build independently of
the PDG dependency. Configured startup commands remain unfinished. Original music still needs intact composition metadata. These source
references remain requirements for the remaining port; resource extraction alone
is not runtime completion evidence.

## Configured startup command dispatch

`Classes/Galactica.cpp:1713–1718` reads the numeric `StartAction` and passes it
to `ObeyCommand`; only an absent/unreadable preference defaults to New Game.
The only other source reference is its definition in `GalacticaConsts.h`.
No shipped preference control or writer was found, so v4 adds no chooser.

Decoded `Mcmd` 128 and 129 in the English/German shareware and CD-ROM resources
confirm About=1, New=2, Open=3, Close=4, Save=5, Save As=6, Revert=7 and Quit=10.
The English CD-ROM File menu additionally includes command 27; the other three
variants do not. This difference does not change these shared command IDs.
The header defines Fullscreen=4016, Help=0x4069FFFA and Tutorial=0x4069FFF9.
`xmnu` extension data does not supply these command IDs.

V4 reads native `cfg.getConfigLong("StartAction")` after selecting Galactica
configuration; its missing value is `undefined`, as verified in PDG's binding
source. Browser storage uses `galactica.StartAction`. Unknown valid integers,
including zero, remain unknown commands instead of silently becoming New Game.
The application lifecycle dispatches once after introduction/onboarding,
including when the introduction is disabled or the tutorial was requested
explicitly. Closing About cannot replay it.

Available application handlers are About, New, Open, Save, Save As, Revert,
Quit, Fullscreen, Sound, Preferences, Flyby Help, Help and Tutorial. Document commands depend on an active
document; a normal launch has none. Browser Open/Help/Fullscreen wait for the
first trusted pointer/key gesture if startup lacks activation, consume that
input before it reaches setup and remove both listeners before opening.

This is not full arbitrary-command parity. Hosting (4020), Open as Host (4002)
and Joining (4021) require the unported multiplayer flows. Community (8000),
Check for New Version (8001), the edition-specific command 27 and other
inherited/window commands still need individual source and runtime audits.
They are pending work, not unavailable-help blockers. Music and the pinned
native fullscreen runtime remain the separately documented limitations.

### Application preferences startup commands

`Galactica.cpp:2099–2102` explicitly maps synthetic command `1324679167` to
`cmd_Preferences`; it is now connected to the existing application Settings
window. The numeric PowerPlant constant behind `cmd_Preferences` is not defined
in this checkout and is not guessed. In particular, command 16 in Mcmd 130 is
Select All, not Preferences. The shipped Preferences handler (`1813–1815`)
opens its modal dialog without a beep and is enabled before a game exists.

Sound (`4017`) toggles the global sound/music flags, saves preferences and
updates command status (`2285–2290`). Flyby Help (`0x4069FFFC`) toggles global
mouse-linger help and saves preferences (`2150–2165`). V4 connects both to the
existing application controllers without creating a game, opening a dialog or
adding feedback audio. Disabling sound stops cached audio; enabling it does not
play an invented source cue. Flyby Help changes clear cached hover state and
update any existing renderer. The settings window reads the shared preferences
when opened. These behaviors remain separate from the unavailable original
music asset; no music playback is claimed.
