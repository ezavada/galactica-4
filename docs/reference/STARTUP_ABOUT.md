# Shipped startup and About presentation

This is source evidence for the startup/About port; the core presentation is now implemented, with remaining startup command work tracked in the parity checklist. It does not mark the
startup/About UI or its preferences as complete.

Regenerate the four shipped English/German shareware/CD-ROM variants:

```sh
python3 tools/import-v3-presentation.py /path/to/galactica-anno-dominari-3
python3 tools/test-import-v3-presentation.py
```

`v3-presentation.json` records source file and payload SHA-256 hashes, decoded
captions, referenced PICT resources, picture frames, scrolling parameters, and
MENU/Mcmd label-to-command mappings with separate payload hashes.
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
the PDG dependency. Available configured startup commands are implemented below; inherited/window command coverage remains unfinished. Original music still needs intact composition metadata. These source
references remain requirements for the remaining port; resource extraction alone
is not runtime completion evidence.

## Configured startup command dispatch

`Classes/Galactica.cpp:1713–1718` reads the numeric `StartAction` and passes it
to `ObeyCommand`; only an absent/unreadable preference defaults to New Game.
The only other source reference is its definition in `GalacticaConsts.h`.
No shipped preference control or writer was found, so v4 adds no chooser.

Decoded `Mcmd` 128 and 129 in the English/German shareware and CD-ROM resources
confirm About=1, New=2, Open=3, Close=4, Save=5, Save As=6, Revert=7 and Quit=10.
The English CD-ROM File menu additionally includes Preferences as command 27
(the shipped caption is misspelled “Prefererences…”); the other three variants
do not include that item. V4 now accepts both this resource-proven command and
the synthetic Preferences command explicitly normalized by the application.
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
Quit, Host, Open as Host, Join, Fullscreen, Sound, Preferences, Flyby Help, Help and Tutorial. Document commands depend on an active
document; a normal launch has none. Browser Open/Help/Fullscreen wait for the
first trusted pointer/key gesture if startup lacks activation, consume that
input before it reaches setup and remove both listeners before opening.

Host (4020), Open as Host (4002), and Join (4021) now open the same localized
forms as the visible commands. These forms do not require browser activation;
native hosting still uses the existing desktop backend, and browsers retain the
localized hosting-unavailable feedback. Cancellation restores setup without
replaying the startup action. A stored StartAction counts as an existing
installation, so this change does not suppress first-install onboarding. The
source command IDs are defined in `GalacticaConsts.h:639,657–658`;
`Galactica.cpp:2241–2278` dispatches them, and `DoJoinGame:2079–2089`
opens the join flow without an additional tutorial guard.

This is not full arbitrary-command parity. Community (8000) and Check for New Version (8001) have individually audited
external destination blockers below. Other inherited/window commands remain
pending source and runtime audits. Music and the pinned
native fullscreen runtime remain the separately documented limitations.

### Application preferences startup commands

`Galactica.cpp:2099–2102` explicitly maps synthetic command `1324679167` to
`cmd_Preferences`; it is now connected to the existing application Settings
window. The PowerPlant constant declaration is absent from this checkout, but the
English CD-ROM MENU/Mcmd 129 directly proves Preferences command 27. Both 27
and the synthetic command now open Settings. Command 16 in MENU/Mcmd 130 is
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

### Legacy Community destination requires replacement

The shipped Community handler (`Galactica.cpp:1777–1789`) opens
`http://www.annodominari.com/community/`. On 2026-10-10 that page returned a
meta-refresh redirect to `http://www.vendornation.com/community_GA.html`.
A direct GET of the destination returned HTTP 404; this was not inferred from
an inaccessible browser/search tool or a HEAD-only check. Recorded body and
headers: `/private/tmp/galactica-legacy-community.html` and
`/private/tmp/galactica-legacy-community-headers.txt`.

Community is blocked on a working, approved replacement community destination
or restoration of the original service. V4 should not claim a working community
feature by sending players to a known missing page. No guessed replacement
service, public issue tracker or discussion URL has been introduced. This
external-service blocker does not block other parity work. Check for New Version has its own independent audit below; its blocker is
not inferred from the Community result.


### Check for New Version requires a v4 release destination (2026-10-10)

The shipped command is 8001 (`GalacticaConsts.h:712`). Its application command
status is enabled independently of document state (`Galactica.cpp:1913`), and
its handler calls `CheckForNewVersion` (`Galactica.cpp:2173–2175`). The function
at `Galactica.cpp:1761–1774` opens
`http://www.annodominari.com/v` + `gVersionString` + `/` in the system browser.
It does not fetch or compare versions locally. Failure to launch the browser
uses the normal source browser-error alert.

Direct HTTP GETs on 2026-10-10 returned:

- `/v3.0/`: HTTP 200, a **New Version Available** page offering v3.0.2 downloads.
- `/v3.0.2/`: HTTP 200, a **No Update Needed** page describing v3.0.2.
- `/v4.0/`: HTTP 404. This is a candidate v4 endpoint probe, not a claim that the
  development build currently declares a 4.0 release version.

Recorded response bodies and headers are
`/private/tmp/galactica-version-{3.0,3.0.2,4.0}.html` and matching
`-headers.txt` files. The authenticated GitHub API request
`GET /repos/ezavada/galactica-4/releases` returned `[]`: no released, draft or
prerelease entries exist there. V4 currently identifies development builds by
source revision (`src/js/application-version.js`), separately from PDG's
runtime version. The legacy website is therefore not a v4 updater, and no
published GitHub release channel currently supplies a replacement.

This item is blocked on the release owner designating a working v4 update
page/channel and its version identity, or publishing/restoring that service.
After that decision, implement command 8001 independently of an open document,
provide the normal visible command entry, respect browser user-activation
requirements, localize browser-launch failures in all six languages, and test
both startup and in-game launches. Do not open the v3 download page as a v4
update check or claim that a missing page proves the development build is
current. No guessed release policy, release publication or obsolete download
link has been added. Other application commands and multiplayer remain
unfinished work; this is an individual external publication blocker.


### Close Game document lifecycle (2026-10-10)

The shipped File menu maps Close Game/W to command 4. Source evidence:
`GalacticaDoc.cp:1425–1436` stops tutorial instructions when the game closes;
`AGalacticThingyUI.cpp:420–426` marks gameplay changes modified;
`GalacticaSingleDoc.cp:477,497` clears modified state after saving/loading.
The underlying file-document close behavior is inherited from PowerPlant.

V4 now exposes File → Close game with a File-menu W hint. Unsaved/new games
present Save and close (Enter), Discard and Cancel (Escape). Clean saved games
close directly; selection, camera movement, display options and report review
do not by themselves prompt for a save. Save/Open/Revert establish a gameplay
content baseline without changing the version-1 save format. A successful save
closes only after writing completes; canceled/failed saves keep the document
open. Changes made during the write cause another decision, and a late write
cannot close a different active document or leave the busy window stranded.
Discard never overwrites the existing save file.

Closing removes only that session, disposes its renderer and stops its sound
and autoplay timer. The most recently retained game resumes with its existing
state; closing the last document returns to setup. Closing a tutorial practice
game stops the instructions, removes the scripted runtime and restores the
underlying original game. Other retained documents remain available.

Decision labels, explanatory hover help and the manual's File section are
localized in en/de/es/fr/ja/ru. The translated buttons use full-width stacked
rows so longer labels fit, with the shared small right-aligned shortcut hints.
Both full native runtime suites pass 1,358 tests. Dedicated close/save async
regressions and the existing Save/Open/Revert async lane pass on both runtimes.
`tools/test-web-close-game.cjs` provides repeatable actual-input browser
coverage in all six languages for File-menu W and button
entry, modal input isolation, Cancel, Save/filename selection, clean saved-game
Open/Close, Discard with another retained game, failed writes, canceled pickers
and closing a tutorial back to the unchanged original. Opening then closing a
tutorial document while the original application is in New Game setup also
removes the closed session and preserves that setup state. Save pickers use an
explicit in-memory handle fixture, not an automated operating-system dialog.
Inspected the before/after File menu, translated decisions and retained views.

Evidence: `/private/tmp/galactica-close-{tests,public-tests,async,public-async,documents-async,public-documents-async,<language>,before}.log`,
`/private/tmp/galactica-close-setup-<language>.log`,
`/private/tmp/galactica-parity/close-game`, and
`/private/tmp/galactica-close-{review,languages-review}.png`.
Other application/window commands, modal tutorial recovery, multiplayer and
Map Generation remain pending. This item does not claim Quit/browser-tab close
confirmation or complete arbitrary-command parity.


### Application Quit decisions and browser unload protection

Shipped v3 command resources identify Quit as command 10. `GalacticaDoc.cp:237`
uses `LSingleDoc`, and its unhandled document commands fall through to that
framework at line 912. `GalacticaClient.cpp:1482–1495` explicitly describes
cancellation when saving a modified document; its network override sends changed
objects. `GalacticaHostDoc.cp:406–419` delays Quit while host work is in progress.
The inherited PowerPlant GUI implementation is not present in this checkout;
the server-only `Galactica::Quit` is not evidence for GUI save decisions.

V4 now provides File → Quit/Q, Command/Ctrl+Q, startup Quit and configured startup
command 10 through the same all-document coordinator. The active game is checked
first, followed by retained games. Clean saved games close directly. New/changed
games offer localized Save and close, Discard and Cancel. Save completion is
required before exit. Deferred/failed/canceled writes and edits during a write
cannot silently discard progress. First Cancel restores the previous setup/menu;
later Cancel preserves the games still open without resurrecting closed ones.
Tutorial practice is checked before its original; closure removes instructions
and scripted simulation. Quit during tutorial welcome also checks the original.
Only after all documents close does the application invoke actual `pdg.quit()`.

Browsers warn through their own beforeunload dialog when any retained game or
unsaved tutorial has changes, including during a pending save. This warning
requires browser activation and cannot provide the application's Save buttons.
After accepted application Quit, a localized terminal panel offers Start again;
reload does not warn once the games have been handled. Configured startup Quit
keeps this panel rather than replacing it with the bootstrap's ready state.

Both native runtime full suites pass 1,369 tests. Dedicated async decisions and
real native processes verify both files are written before actual PDG exit.
`tools/test-web-quit.cjs` drives actual browser clicks/keys, observes the PDG
shutdown event, dismisses an actual browser unload confirmation, and verifies
Cancel, every retained document, failed/canceled saves, restart and empty setup.
All six languages pass ordinary, tutorial-practice and configured-startup Quit.
Actual File-menu Quit during tutorial welcome also passes in English. Modifier-Q
recognition is covered by unit tests; physical native GUI shortcut testing is
still pending. The translated
prompts, terminal panels and before/after startup views were inspected.
Evidence: `/private/tmp/galactica-quit-{tests,public-tests,async,public-async,runtime,public-runtime,<language>,startup-<language>}.log`,
`/private/tmp/galactica-parity/quit`, and the
`/private/tmp/galactica-quit-{languages,startup,before-after}-review.png` images.
Automation mutes audio without changing saved preferences.

Remaining native integration: the pinned public PDG GLFW main-window close
callback (`src/sys/glfw/platform-graphics-glfw.cpp:96–105`) calls `pdg_LibQuit`
directly. Cocoa `applicationShouldTerminate` returns `NSTerminateNow` and
last-window close returns YES (`src/sys/macosx/pdg-lib-macosx.mm:255–262`). The
public JS Shutdown event is a final notification, not a vetoable Quit request.
These paths need an engine request/deferral API and validated runtime packaging;
application commands alone do not establish OS/window-close parity. Network logout and pending host-work decisions are implemented in the
application command paths. Other application/window commands and Map Generation
remain pending. This is actionable follow-up,
not a claim that the entire parity goal is blocked or completed.


### Multiplayer startup verification (2026-10-10)

Host, Join and Open as Host are now dispatched from the stored v3 numeric
commands. The full native suite passes 1,653 tests on both rebuilt public and
development PDG runtimes. Eighteen before and eighteen after browser runs cover
all three commands in en/de/es/fr/ja/ru. Every form screenshot is byte-identical
to the before-change manually opened form and to the after-change manual form;
representative screenshots were also visually inspected. After-change runs
exercise real native create, join, saved-host reopen with identity preservation,
and listener shutdown, alongside Cancel and the no-replay check. Three English
introduction runs confirm that the commands open only after dismissal.

Evidence: `/private/tmp/galactica-startup-multiplayer/` contains per-command,
per-language logs, before/after screenshots, introduction checks and both full
unit logs. Existing six-language dialog strings are reused, including browser
hosting feedback; no untranslated command chooser was added. This completes
these three startup routes, not arbitrary inherited/window commands or the
remaining preference/runtime requirements.
