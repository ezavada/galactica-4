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
  This requires actual UI integration; the implemented tutorial entry and
  recovery paths and their evidence are recorded below.
- Both windows use the original looping music with a five-second fade on close.
  The composition has since been recovered and rendered into the packaged
  startup track; see `data/sounds/startup-manifest.json`. Exact original
  QuickTime acoustic equivalence remains unverified. Presentation, preference
  storage, dismissal, About entry and tutorial recovery are implemented.

## Implemented and remaining verification

The core presentation and `ShowSplash` preference are implemented and verified
in six languages, including ordinary setup/game preservation, paging, reduced
motion, modal input, title dragging, original attribution, compact layouts and
packaged resources. First-install tutorial startup now snapshots preferences
before other factories initialize them; tutorial failure falls back to the manual.
Existing installations and later launches do not repeat automatic onboarding.
See `docs/V3_V4_FEATURE_STATUS.md` for the test and screenshot evidence.

About now identifies the actual development application build independently of
the PDG dependency. Available configured startup commands are implemented below; inherited/window command coverage remains unfinished. The recovered startup
composition now has a cached looping runtime handle and a timer-driven five-second
fade in `src/js/sound.js`; exact original QuickTime timbre remains an evidence gap.
These source references remain requirements for the remaining port; resource
extraction alone is not runtime completion evidence.

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

Available application handlers are About, New, Open, Close, Save, Save As, Revert,
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

Native request integration is implemented in current public and devel PDG.
`eventType_QuitRequest` (29) lets a synchronous handler consume window-close/OS
Quit while the game runs the same all-document save decisions as File → Quit.
Busy, canceled and failed requests stay consumed; only successful completion
calls `pdg.quit()`. Repeated requests leave the pending decision intact. Explicit
quit still accepts shutdown without generating another request. Legacy engines
without the new constant remain usable but cannot intercept native requests.

Actual Linux X11 `WM_DELETE_WINDOW` messages pass the C++ lifecycle regression
and the native V8 regression (two requests, live window after deferral, one final
shutdown). Both complete engine suites pass: devel 24 tests and public 23, with
focus and window tests skipped on this Mac because it has no connected display.
All 1,656 game units pass against both rebuilt runtimes. Browser `native-request`
mode exercises the shared game flow through event dispatch in all six languages;
its 66 before/after screenshot pairs are byte-identical, and the French dialogs
were visually inspected. This browser coverage is separate from native OS event
delivery. Evidence is in `/private/tmp/pdg-quit-request-linux{,-bridge}.log`,
`/private/tmp/pdg{,-public}-quit-request-full-ctest.log`,
`/private/tmp/galactica-quit-request-{devel,public}-unit.log`, and
`/private/tmp/galactica-quit-request/{before,after}/<language>`.
A baseline restart intermittently failed to fetch a browser module; a Russian
cancellation assertion also failed once. Individual reruns passed; failure logs
are retained. The runner now waits for completed shutdown instead of assuming
that asynchronous save/cleanup has finished after 250 ms.

Remaining validation and packaging: `tools/pdg-release.env` still pins the old
v1.2.0 archive, whose native paths bypass these decisions. Update the packaged
runtime before claiming default-install parity. Connected macOS window/Command-Q
and Windows GUI validation remain pending; their hooks are implemented, not
runtime-proven here. Other application/window commands and Map Generation remain
pending. These are follow-up items, not completion of the entire parity goal.


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


### Independent Music preference (2026-10-11)

Source audit found a remaining Preferences gap: `Galactica.cpp:763–765`
assigns separate Sound and Music checkboxes, `GalacticaDoc.cp:1336–1341`
loads their flags independently, and `USound.cp:230,277–280` requires both
flags for presentation music. The combined Sound command deliberately assigns
both flags together (`Galactica.cpp:2285–2290`). V4 now follows those rules:
Settings has a separate persistent Music control, while Sound still switches
both flags. Turning Music off stops only the presentation handle and cancels
its fade; event effects remain governed by Sound. Re-enabling Music starts an
open requested presentation, but does not restart dismissed credits.
Missing/unavailable storage retains the enabled default. The preference uses
v4's existing native/browser string storage (`playMusic`), independently of
saved game state. Native configuration and browser persistence are covered.

The label and hover help (IDs 1245–1246), plus the manual's Settings section,
are localized in en/de/es/fr/ja/ru. Five new native regressions cover independent
effects/music, fade cancellation and restart, combined Sound persistence,
actual Settings action eligibility, and native storage/failure fallback.
Both complete native suites pass **1,775 tests, zero failures**; logs are
`/private/tmp/galactica-music-preference-{public,devel}-unit.log`.

`tools/test-web-music-preference.cjs` exercises real canvas Settings and pager
buttons, About playback through the actual audio backend, stopping an active
fade, combined Sound toggles, and a fresh browser reload. All six languages
pass at 800×600 and 320×340. Six baseline runs prove the previous code ignores
the stored disabled music flag. Chrome output is muted throughout; playback
logic remains enabled. The compact fixture follows translated pagination:
Music can be on the page after Sound because translated failure feedback
reduces page capacity. No product paging change was required.

The 18 ordinary before/after pairs are recorded in
`/private/tmp/galactica-music-preference/comparison.json`: six introduction
pairs are identical, six Settings pairs add the Music row, and six About pairs
differ only in their build-revision caption (zero changed pixels outside that
caption's region). Reviewed all six Settings pairs and all six compact Music
pages; labels and fixed footer controls remain readable and separate. The
comparison and compact reviews are `review-1.png`, `review-2.png` and
`compact-review.png` in the same evidence directory. This closes the separate
Music preference gap, not the remaining Preferences, runtime/hardware,
localization completion or Map Generation audits. Unrelated in-progress
optional artwork changes remain outside this commit; no PDG checkout changed.
