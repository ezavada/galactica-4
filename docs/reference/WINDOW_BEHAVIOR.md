# Application window behavior

Decision dialogs and forms (commands, open games, settings, view, map display, colony defaults, turn confirmation, rename, overlap selection and fleet exchange) are modal. Their own controls may focus or zoom the map. Outside input is consumed. Inspectors, production, course, comparisons, rosters, Events and report/outcome windows are informational and remain interactive alongside the map. Clicking outside an informational panel focuses the map and performs the clicked action; selecting another object preserves the panel. Production follows the selected system; Course keeps its original actor.

These windows and startup/file dialogs use a nearly white to light grey surface, black text and controls, and a gold border with bright upper/left and shaded lower reflection accents. Object inspectors retain their owner tint. Events retains its neutral dark surface and is non-modal: map input outside it remains available.

All window title areas can be dragged, including Events, object inspectors, production/course dialogs and foreground event reports. Dragging moves controls together with the panel. Windows stay within the drawing port. Startup dialogs recover capture on release or Escape; game windows also end capture when the viewport changes.

Application positions are configuration preferences, independent of saved simulation state. Browser storage uses `galactica.windowPosition.<name>`; native configuration uses `windowPosition.<name>` in the Galactica configuration. Each stores finite x/y coordinates. Invalid or unavailable preferences fall back to default layout. Restored bounds are constrained to the current port. Fleet and system tables continue to use their existing persistent geometry preferences, including height. Object and Events positions last for the current game and are not written as application defaults.

No new visible strings are introduced; existing translations remain in use for English, German, Spanish, French, Japanese and Russian.

Button shortcuts use the icon buttons' compact hint treatment: a separate small, right-aligned key label, with no angle brackets in the button caption. This applies to map/inspector/window buttons, startup Start/title controls, and text/file-dialog buttons. Existing translated strings with leading or trailing shortcut tokens are decoded only for button presentation; prose help remains intact. Button measurements reserve room for both label and key, including multi-character icon shortcuts. White-button outlines and non-modal panel borders use 50% alpha; the modal gold edging retains its reflective accents.

All tooltips share a white surface at 75% alpha, no border, 4px corner rounding and solid dark grey text. Immediate icon/table hints and delayed control help (including startup and file dialogs) use the same 20px equilateral triangle as object inspectors, oriented toward the hovered subject. Tooltip placement leaves room for the pointer and keeps the body inside the drawing port.

Map navigation uses a 240ms whip pan with fast acceleration and braking. Home, selected-object centering, tables, event/report navigation, attention and tutorial focus all share the display centering path; fit/reset also animate their location change. New destinations start from the sampled current pose. Dragging, scroll bars and zoom cancel pending motion. Initial framing and reduced-motion preferences use immediate centering. The rendered camera pose also drives hit testing, backgrounds and scroll bars; animation changes no game objects or simulation randomness.

System and ship inspectors outline the exposed sides of their pointers instead
of drawing a straight border through the attachment. System coordinates are
replaced by an inline Send to row with measured Set/Clear buttons; ship Location
is hidden. Both old coordinate rows remain commented in source. Production
locks use bare cached glyphs; the compact = control sits beside the sliders and
uses = as its shortcut. Public system pause actions and the Continuous caption
are removed. Build-button hover headings describe switching production.

Renaming is now an inline white text field over the map label, rather than a
window with a draggable title. Its text is 150% of the map name size. The cursor
becomes a text caret; Enter accepts the draft and Escape keeps the original name.
Target selection uses a crosshair, with a 50% alpha rubber-band line for system
destinations and course waypoint editing.


Tutorial instructions are floating, interactive teaching windows rather than
modal system windows: gameplay/setup actions must remain reachable while a
lesson is displayed. They reuse the bright neutral gradient and gold edging,
wrap localized text and consume pointer/wheel events inside their surface.
Their title is draggable, constrained to the port and remembered in application
configuration. Action-only lessons do not offer a forward button. File and
manual-error dialogs retain foreground priority. Tutorial launch and full guided walkthrough verification are recorded in
[TUTORIAL_CONTROLLER.md](TUTORIAL_CONTROLLER.md) and the main parity checklist.


Report narratives and outcome windows use the same neutral system
surface as Settings and Compare Players: nearly white at the top, light gray
at the bottom, black text/buttons, and gold reflective edging. Victory/defeat
art keeps its recovered image and placement, with a 55% white overlay for black
text legibility. Lab/Stardock illustrated presentations keep their separate
source artwork composition. Events remains non-modal and retains its existing
darker surface.

Clicks outside report/outcome windows reach the map without dismissing the report. Blank space inside is inert. Automatic no-dialog playback keeps its interruption behavior. Title
dragging constrains reports and outcomes to the viewport and remembers their
positions in configuration. Continue buttons show Esc in the existing small
shortcut style; sizing includes both label and hint in every supported language.

Historical validation of the earlier modal report styling: both native suites passed 1,725 tests. Muted real-browser before/after checks
pass for all six languages, covering three-button outside clicks, actual title
drags, bounds, position persistence, manual outcomes, victory/defeat artwork,
compact narrative paging and non-modal Events isolation. Of 84 paired screenshots,
24 automatic/Events scenes are pixel-identical and 60 modal scenes show the
intended style changes. English before/after narratives, full and compact outcome
art, and the six-language report/compact layouts were visually inspected. The
Russian Continue label/hint spacing was corrected after this inspection exposed
an overlap; final browser runs and both native suites passed afterward.


Window inventory verification covers Compare Players, your systems, fleets,
open games, colony defaults, new-game defaults, Events, ships in a system,
fleet exchange, courses, production, the nearby-object picker and End Turn
confirmation, plus system/ship/fleet/rendezvous inspectors. Muted actual-input
browser checks open these through their real menus, keys or map controls,
drag titles and assert viewport bounds. System windows reject outside clicks
without changing selection or turn; Events and object controls retain their
contextual behavior. Control-click tests press and release the actual Control
key for the GLFW input path. Inline rename has no draggable title; its actual
Escape action restores the original name.

Production and End Turn confirmation now expose measured, localized Close
buttons with compact Esc hints. Their hit actions preserve allocations,
pending attention, selection and turn. Confirmation reserves a separate
footer beneath Review and End anyway. Native regressions cover all six
languages at 800×600, 480×600 and 640×480; both full suites pass 1,748 tests.
`tools/test-web-window-inventory.cjs` contributes 168 pixel-identical pairs;
`tools/test-web-window-extras.cjs` contributes 42 pairs, with 24 expected
production/confirmation changes and 18 unchanged picker/rename scenes.
English before/after panels and localized defaults, ships, production,
pickers and confirmation layouts were visually inspected. This verifies the
listed gameplay surfaces; the remaining foreground startup, document,
network and error dialogs still need their complete current inventory audit.


The startup setup drag area scales with the panel's height, ending before
its game-title edit control. This keeps the entire title control clickable
in compact ports. Startup setup, game-title, computer-count, AI-skill and
player-name title drags and modal outside clicks have actual-input coverage
at 640×480 in all six languages. Dragged startup coordinates are checked in
application configuration. The regression fails against the previous fixed
52px hit area. Both full native suites pass 1,749 tests; 66 screenshot pairs
include six expected title-edge interaction changes and 60 identical scenes.
Shared text-entry Cancel/Save buttons now expose explicit Esc/Enter hints.
Foreground document, network and error dialogs remain in the chrome audit.


Shared text-entry buttons measure their translated captions and compact
Esc/Enter hints using the drawing port's font metrics. They grow horizontally
when there is room and stack vertically in narrow ports. This applies to
startup title/count/player-name and file-name editors. Native geometry and
keyboard checks cover all six languages, including 320×340, without overlap.
Muted actual-input browser checks at 640×480 cover dragging, modality, Enter
acceptance of the game title and Escape cancellation of Save As. Both full
native suites pass 1,750 tests. Of 78 before/after screenshot pairs, 54 show
intended editor hints/sizing and 24 setup/skill scenes remain identical.
English pairs and all six title/player/save editor layouts were inspected.
The 320×340 browser probe now passes in all six languages. Restored
fullscreen letterboxed the canvas on the first gesture, so the driver needed
to convert model coordinates through the current CSS canvas bounds and
account for pixel quantization at fractional control edges. Title drags move
away from clamped corners. The application and PDG needed no rendering fix.
The helper accepts optional width/height arguments. All twelve narrow
baseline/current runs pass; 78 pairs include 54 intended editor changes and
24 unchanged setup/skill scenes. English before/after and all six localized
narrow title/player/save layouts were visually inspected. The standard
640×480 English before/after runs also pass with the corrected driver.


Document decisions advertise their actual Enter/Esc actions using the shared
compact button hints. Revert and overwrite confirmations, saved/error status
acknowledgments and unsaved Close measure captions plus hints through the drawing
port. Decisions stack when translated captions need more horizontal room.
Manual launch failures use the same measured Continue/Enter control. Existing
localization resources supply every caption and message.

Actual-input browser checks cover blocked manual launch, File menu, missing-save
status, unsaved Close cancellation, real Save As download, saved status, Revert
cancellation and accepted restoration. Titles drag within the viewport; outside
clicks clunk without advancing the turn. All six languages pass at 640×480 and
320×340. Across 156 before/after pairs, 96 show expected hints/decision sizing and
60 remain pixel-identical. Narrow comparisons use a consistent windowed fixture
to avoid Escape changing fullscreen state. A standard English windowed recheck
also passes. English before/after and the six-language narrow manual, Revert and
Close layouts were visually inspected.

Both full native suites pass 1,751 tests. Dedicated asynchronous document,
close/save and file-backend suites also pass against both native executables.
The native checks cover actual overwrite/cancel/error paths beyond the browser
fixture. This verifies these dialog workflows, not the entire foreground-window
inventory. Network/chat/hosting/join/turn-notice surfaces and remaining busy/error
variants still require their current chrome audit. The narrow map inspector
layout also needs a separate minimum-viewport/source check; dialog bounds do not
establish that every gameplay panel fits that viewport.


Chat's title drag hit area scales with the panel height, keeping the top edge of
recipient choices clickable in short ports. The recipient and composer surfaces
have actual-input browser coverage against a temporary native HTTP host in all
six languages at 640×340 and 640×480. Checks open Chat from the command menu, use
Tab and recipient clicks, drag the title, verify persisted bounded coordinates,
reject outside clicks with a clunk, send a real broadcast with Enter and close
with Esc without advancing the game. Admission is fixture bootstrap here; the
Join UI has its separate test helper. Automation remains muted.

The native regression fails with the original fixed 52px hit area; both full
suites pass 1,752 tests after the fix. Dedicated HTTP chat routing/retry/offline
checks also pass. Of 84 before/after pairs, 78 are identical and six show the
corrected recipient-edge action. English before/after and the six-language short
recipient/composer layouts were visually inspected. These checks establish the
listed 640px-wide chat interactions; narrower gameplay layout and remaining
network/host/join/turn-notice and busy/error variants remain in the chrome audit.


Join's title drag area ends at 40 scaled pixels, above its address field at 46.
The previous fixed 52px region intercepted the top of the full-height field and
the whole field at short heights. Native geometry checks cover Join/Rejoin/Admin
fields and LAN/saved-host controls at 800×600, 640×480 and 640×340. The regression
fails against the old code; both full native suites pass 1,753 tests afterward.

Actual-input browser checks in all six languages at 800×600 and 640×340 open
startup Join, focus the address field at its top edge, inspect a real native
host, enter credentials, drag/persist the bounded title, reject outside clicks
with a clunk and join with Enter. Baselines recover focus through Tab because
the short address field cannot be clicked. The asynchronous admission lifecycle
suite passes cancellation/reopen/rejection cases.

Of 60 before/after pairs, 24 are identical, 12 show the corrected address-focus
action, and the other 24 differ only inside the actual localhost address field
because each fixture host uses a fresh port. Difference bounds were verified.
English before/after and all six full/short Join layouts were visually inspected.
This review also found pre-existing field-label clipping in Spanish, French and
Japanese; the fixed label column needs its own measured-width layout correction.
This is not a completed audit of all Join modes, errors or discovery surfaces.


Join field labels now reserve a shared column measured at their normal 13px
font size. Credential inputs keep an aligned edge and at least 80px width; the
same layout serves Join, Rejoin, administrator login and saved-host entry.
The renderer uses the actual drawing port metrics. More importantly, shared
window placement now translates point geometry as well as rectangles: dragging
previously moved the inputs but left their `labelPoint` coordinates behind.
That caused the translated-label clipping observed in the previous audit.

Regressions fail against both the original fixed-column layout and the missing
point translation. Native geometry checks cover all six languages, four port
sizes from 320×340 to 800×600, every credential mode and saved-host entry,
including relative label/input positions after placement. Both full native
suites pass 1,754 tests. Async admission lifecycle checks also pass.

Actual browser checks at 640×340 and 800×600 use the real mode buttons,
saved-host entry, field focus, native-host inspection, credential entry,
persisted modal dragging/outside-click rejection and Enter admission in all six
languages. The final browser check tests label/input separation after dragging.
Of 108 before/after screenshot pairs, 76 are identical and 22 show intended
column/drag alignment corrections. Ten remaining differences are confined to
the localhost address field's temporary port. Before/after Spanish/French/
Japanese dragged panels and all six full/short credential layouts plus short
saved-host layouts were visually inspected. Other hosting/discovery/turn-notice
and busy/error variants remain in the chrome audit.


Host layouts expose a title height scaled from their own reference height.
Foreground mouse routing passes it to window placement instead of capturing a
fixed 52px strip. This matters because Host setup/status, player/admission lists
and nested editors use different reference heights. In short ports the old
strip swallowed the title field, first player/initial-system row and admission
checkbox. Other application windows keep their existing title capture behavior.

The regression fails with the old implementation; native geometry checks cover
all twelve Host stages at 800×600, 640×480 and 640×340. Both full suites pass
1,755 tests. Dedicated native Host lifecycle checks pass actual durable files,
listeners/admission, retained hosting, failure recovery and save-before-stop.

Actual-input browser checks use the shared Host UI and a test adapter to real
native hosts, not a browser-hosting implementation. All six languages pass at
800×600 and 640×340 for startup Host, field/list/checkbox edge clicks, real host
creation, bounded persisted title drags, modal outside-click clunks, players,
admission, initial state, administrator password and actual shutdown. Across
204 screenshot pairs, 156 are identical and 24 show the corrected short control
edges. Twenty-four Host status pairs differ only in temporary address/port/file
rows; masking those identified fixture rows leaves zero differences. English
before/after controls/status and all six short setup/player/admission/initial/
password layouts were visually inspected. Remaining current foreground coverage
includes settings/open/conversion/confirmation/value editors, discovery,
turn-notice and busy/error variants.


### Host nested editors and admission shortcut

The remaining normal Host dialogs now have actual-input checks for Open Saved,
local-game conversion, settings, player rename, initial population/ship editors,
admission policy and pending-player End Turn confirmation. The source comparison
uses v3 `Classes/GalacticaHostDoc.cp:481–524` and
`Classes/CChangePlayerAttach.cpp:19–50,81–100`: player changes, cancellation and
confirmation before skipping unposted human turns.

Admission's Add code button now shows the existing Enter shortcut. Enter adds
the input to the draft and clears the field; it does not save the admission
policy. Save therefore has no Enter hint. The six-language native regression
fails without the hint, and both full suites pass 1,756 tests. No new translated
strings or PDG changes are required.

Muted browser checks drive the shared Host UI through a test adapter to real
native temporary hosts, files and listeners. All six languages pass before/after
at 800×600 and 640×340, including bounded persisted title drags, outside-click
clunks, canceled conversion/settings/rename/initial-population/admission drafts,
a real pending human player, canceled and accepted End Turn, and actual shutdown.
Dedicated native admission and asynchronous Host lifecycle checks also pass.
Of 216 screenshot pairs, 180 are identical; the other 36 show only the Add code
Enter hint. English before/after and all six short nested-dialog layouts were
visually inspected.

One Japanese baseline run failed save-before-stop after an accepted turn.
The host remained open as required on save failure. The failure did not reproduce
in a diagnostic rerun or the final Japanese matrix rerun. Its cause remains under
investigation; the fixture now logs the underlying stop error, and the original
failure capture is retained. The final 24-run matrix passed without internal
retries or weakened shutdown assertions. An additional English timer probe
confirmed a five-minute setup (300 seconds) and passed the workflow.

Evidence: `/private/tmp/galactica-host-extras-regression.log`,
`galactica-host-extras-{pdg,pdg-devel}-unit.log`,
`galactica-host-extras-{admission,async}.log`,
`galactica-host-extras-{340,600}-{before,after}-<language>.log`,
`galactica-host-extras-comparison.json`, screenshot/geometry trees,
`galactica-host-extras-stop-failure-ja.{png,json}` and
`galactica-host-extras-timer-probe-en.log`. Window chrome remains Partial pending
other discovery/turn-notice/remote-administration and busy/error variants, plus
the separate compact gameplay minimum-viewport audit. PDG fixes remain private
until the post-parity v1.2.1 integration.


### Native discovery dialog inventory

V3 `Classes/GalacticaClient.cpp:181–224,326–450,462–509,1165–1218`
attaches a game list, updates it after discovery changes, clears stale captions
on selection, inspects a selected host and uses a movable join dialog before
login. The v4 discovery list now has a reproducible actual-input browser audit
through a test adapter to native UDP scans and real temporary HTTP hosts. This
adapter is confined to the test harness; browsers still cannot discover UDP
hosts themselves.

All six languages pass at 800×600 and 640×340 with five native hosts: four-row
paging, selection, R refresh, bounded persisted title dragging, modal outside
clunks, direct-address fallback, public inspection of the selected host,
authenticated admission, empty scans, cancellation and the ordinary unsupported
browser message. Each fixture uses an isolated ephemeral discovery port.
The native discovery integration also passes six-language multicast updates,
expiry, failed-stop preservation, scan cleanup and actual UDP-bind-failure HTTP
fallback. Physical peer discovery and live Internet matchmaking remain separate
unverified/blocked requirements.

Both full native suites pass 1,756 tests. Repeated before/after captures use the
same unchanged product build: 36 of 96 pairs are identical, and all 60 other
pairs differ only in temporary host address/port text. Masking the identified
address rows/field leaves identical images. All six short discovered-list,
empty-state and unsupported-state layouts were visually inspected. No product
behavior, strings or PDG code changed in this item.

The source audit found a real remaining Join presentation gap. V3's inspected
host includes sector dimensions/density, AI skill/advantage, fast game, fog,
turn limit/remaining time and open/full state. V4's current lobby displays only
title/turn, human/computer counts and player slots, despite receiving most of
those other public settings. Join-by-list/IP/hostname UI is therefore Partial
pending the full localized information presentation. This is required work,
not an unavailable-help blocker. Section 9 UI estimates are corrected to 89%
(12.5/14), while functionality remains 93% (13/14). The overall parity and Map
Generation goals remain active.

Evidence: `/private/tmp/galactica-discovery-windows-{pdg,pdg-devel}-unit.log`,
`galactica-discovery-windows-native.log`,
`galactica-discovery-windows-{340,600}-{before,after}-<language>.log`,
`galactica-discovery-windows-comparison.json`,
`galactica-discovery-windows-fixture-differences.json`, screenshot/geometry trees
and the all-language short-view montages.


### Complete public Join game information

Source `Classes/GalacticaClient.cpp:181–224,326–450,462–509` shows inspected
map dimensions/density, AI skill/advantage, fast game, fog, turn limit/remaining
time and open/full state, and updates the selected game's information when it
changes. V4 now exposes those settings through Details in the inspected lobby.
The Game information panel also shows End Early and the admission-code requirement,
using only validated public metadata. The lobby retains its credential fields and
player selection. Back/Esc returns to the same draft; Refresh/R performs a
read-only inspection. Both the lobby and the panel refresh every three seconds
without changing field focus, names, passwords or selected admission mode.
Canceled/obsolete queries cannot update a reopened dialog or clear a newer
request's guard. Invalid data retains the last valid inspection and shows a
localized error; a later successful query clears it.

Public clock validation now retains bounded countdown data while excluding
arbitrary host fields. The panel shows hours/minutes/seconds and localized day
counts, distinguishes the configured next-turn limit from the current active
limit after a settings change, and extrapolates only a running countdown.
Older hosts that omit optional settings remain usable without fabricated values.
Long titles and captions wrap and page completely. Wrapped settings keep their
label and value on the same page; compact errors have a reserved line clear of
the paging buttons. Sixteen new resources (1229–1244) are translated in
English, German, Spanish, French, Japanese and Russian.

Both full native suites pass 1,759 tests. Dedicated native checks pass actual
six-language HTTP inspection, filled slots, edited AI/speed/fog/timer settings,
current-versus-configured limits, exact paused timing, malformed-clock rejection
and recovery. Async lifecycle checks cover preserved focus/credentials and
canceled refresh delivery. Muted actual-input browser tests pass all six
languages before/after at 800×600, 640×340 and 320×340: full captions across pages,
real host turn/settings/countdown changes through automatic polling, Refresh,
malformed-response recovery, bounded persisted title drags, outside-click clunks,
Back and actual admission. The new panel and lobby use the existing white/gray,
black-text, gold-border modal style. This item restores the public-information
Join UI requirement; Section 9 returns to 93% functionality/UI (13/14 each).
Broader window, native/platform, parity and Map Generation work remains open.

Across 180 before/after screenshot pairs, all 18 authenticated-game scenes are
pixel-identical. The other 162 show the intended lobby entry, public information,
updates/error/recovery views and returned lobby; temporary address text also
varies between fixtures. English before/after scenes and all six ordinary,
short and narrow information layouts, final pages and compact errors were
visually inspected. No settings caption splits its label/value across pages.

Evidence: `/private/tmp/galactica-lobby-information-{pdg,pdg-devel}-unit.log`,
`galactica-lobby-information-native-{join,live}.log`,
`galactica-lobby-information-{340,600,compact}-{before,after}-<language>.log`,
`galactica-lobby-information-comparison.json`, screenshot/geometry trees and
all-language ordinary/compact information and error montages. No PDG code or
public-engine checkout changed.


### Foreground new-turn notice chrome and word wrapping

V3 `Classes/GalacticaClient.cpp:2589–2610`, `Classes/GalacticaUtilsUI.cpp:141–174,185–230`
and `Resources/gal-non-module.r:11570–11580` confirm a caption-only foreground
notice that stops mouse tracking, suppresses command keys and closes after three
half-seconds. V4 retains that 1.5-second behavior and the requested shared neutral
white/gray, black-text, gold-border modal presentation. A compact-caption defect
split ordinary words in literal player names. The notice now shares the public
Join information word wrapper: prefer spaces, preserve the complete literal text,
and split long unspaced text at Unicode code points. No strings or translations
changed; the existing six localized captions remain in use.

The new regression fails against the original notice and passes with the fix.
Both full native suites pass 1,760 tests. The dedicated native HTTP/attention
check passes foreground silence, cached background Warning playback, duplicate
guards, mute and no replay. All 36 muted native-backed browser runs pass before
and after in English, German, Spanish, French, Japanese and Russian at 800×600,
640×340 and 320×340. They use real host turns and the client's own refresh polling:
no initial-login notice, complete player identity, exact 1,499/1,500 ms boundary,
left/right/middle outside-click clunks, keyboard/wheel isolation, bounded persisted
title dragging, no duplicate notice, Sound-off arrival and release of a held drag
on expiry. A late mouse release does not pan or select the underlying map.

Of 162 before/after screenshot pairs, 132 are pixel-identical. The 30 changed
pairs are six notice scenes in each compact German, Spanish, French, Japanese and
Russian run; only caption wrapping changes. All pre-arrival and post-dismissal
map scenes are identical. English and French before/after notice/drag/expiry
scenes and all six ordinary, short and narrow notice layouts were visually
inspected. The captions stay complete and readable inside their windows.

Evidence: `/private/tmp/galactica-turn-notice-current-{pdg,pdg-devel}-unit.log`,
`galactica-turn-notice-current-regression.log`,
`galactica-turn-notice-current-native-attention.log`,
`galactica-turn-notice-current-{340,600,compact}-{before,after}-<language>.log`,
`galactica-turn-notice-current-comparison.json`, the screenshot/geometry tree
`/private/tmp/galactica-turn-notice-current` and its language/comparison montages.
No PDG code or public-engine checkout changed. Window chrome remains Partial
pending remote-administration and remaining busy/error variants, plus the
separate compact gameplay minimum-viewport audit. Overall parity and Map
Generation work remains active.


### Remote administration chrome and title drags across refreshes

V3 `Classes/GalacticaClient.cpp:1248–1383` exposes settings, player management
and End Turn commands to administrators while disabling ordinary player posting
and owned-system/fleet commands. Its initial-state commands are restricted to
turn 1. V4 reuses the host dialogs through its separate administrator transport;
the remote adapter owns no listener and exposes no local create/retry/join or
administrator-password editing controls.

The actual-input audit found that replacing the network map model ended an
independent application-window title drag. Routine refreshes now preserve those
drags while clearing old-model map scrolling, sliders, gameplay-window tracking
and cursor state. Explicit window/session changes still release application
tracking, and new-turn notice tracking retains its release behavior. The original
build fails a forced-refresh held-title regression; the fixed build passes.
The fix changes no captions or resources, and all existing UI remains localized
in English, German, Spanish, French, Japanese and Russian.

Both full native suites pass 1,760 tests. The six-language native administrator
integration passes actual authorization, separate player/admin roles, durable
controls and revision guards, failed-save rollback/retry, revocation, logout,
read-only full-map observation and persisted reopening. The existing new-turn
browser check also passes timing, input isolation and held-drag expiry after
this cleanup change.

All 24 muted browser runs pass before/after at 800×600 and 640×340 using real
native HTTP hosts and administrator login. Each checks observer ownership,
role-only controls, pause/resume, settings/player/admission/initial-state
modal bounds, persisted dragging and outside-click clunks; settings cancellation,
admission drafts, actual settings/admission saves, End Turn, disabled mutation
controls after password revocation, DOM blur-handler release and disconnect
without stopping the host are also covered. Each title drag forces delivery
through the application's own network poll. Baseline runs assert its original
interruption and re-press the title for final placement comparison; fixed runs
require the uninterrupted drag.

Fixture verification is explicit: baseline re-pressing originally reused a stale
input counter, so it now waits for the actual final mouse release. DOM/PDG traces
also showed genuine page blur and the normal mouse-release path interrupting
unfocused headless runs. CDP focus emulation keeps the refresh regression active;
a separate DOM blur event verifies release routing. Headless tab activation did
not reliably generate a blur event. This is not physical OS/window activation
coverage; that remains in the existing platform/focus audit. Frame/input deadlines
were not increased, and the failed diagnostic artifacts remain available.

Across 216 screenshot pairs, 126 are pixel-identical and 81 differ only in
isolated temporary host-address text. Nine ordinary Spanish scenes have a small
disabled-text intensity variation with identical control states and geometry.
A repeat of the unchanged fixed build passes and matches all baseline scenes
exactly after masking temporary addresses; the original differing artifacts
are retained rather than replaced. Their rendering cause is not established.
All six ordinary/short remote control layouts, short admission/initial-state
editors and revoked-authentication layouts, plus the Spanish before/after
player/authentication/blur scenes, were visually inspected. Captions and controls
remain readable and inside the gold-bordered neutral windows.

Evidence: `/private/tmp/galactica-remote-admin-current-final-{pdg,pdg-devel}-unit.log`,
`galactica-remote-admin-current-native.log`,
`galactica-remote-admin-current-regression.log`,
`galactica-remote-admin-current-turn-notice.log`,
`galactica-remote-admin-current-verified-{340,600}-{before,after}-<language>.log`,
`galactica-remote-admin-current-verified-comparison.json`,
`galactica-remote-admin-current-repeat-{es.log,comparison.json}`, and the
`/private/tmp/galactica-remote-admin-current/{verified,repeat,trace,dom}` trees
and language/comparison montages. No PDG source or public-engine checkout changed.
Window chrome remains Partial pending remaining busy/error variants and the
compact gameplay minimum-viewport audit. Overall parity and Map Generation work
remains active.

## PDG 1.3 input ownership

Keyboard, pointer and wheel commands enter named PDG input contexts. The foreground blocking dialog or text editor owns local input; Help and Quit remain application commands. Repeated presses are accepted for navigation and increments, while toggles and consequential actions require a fresh press.

Tab selects the next attention item, including when an informational panel has focus. It is consumed during text entry, blocking dialogs, dragging and explicit targeting. It does not traverse controls. Enter acts only on a focused control or dialog. End Turn uses Cmd+Enter on macOS and Ctrl+Enter elsewhere and requires map focus. Application New/Open/Save/Save As/Close/Quit use Cmd on macOS and Ctrl elsewhere, preserving document confirmation flows.

Help accepts F1, a dedicated Help key and macOS Cmd+?. Display toggles use F2–F7. Mnemonics use typed Unicode letters; arrows navigate. Production retains Q/A, W/S and E/D adjustment pairs and = equalization; elsewhere +, - and = zoom.

Wheel input belongs to the panel under the pointer, even at its scroll boundary; outside panels it zooms around the pointer. Middle-button or Alt+left dragging pans, including during targeting. Right-click cancels explicit targeting; otherwise it issues orders. Escape ends the innermost drag while retaining its current value or position, then cancels targeting or closes the focused window. Drag rollback remains a possible later option.

Text fields support Unicode selection, caret movement and standard copy/cut/paste. Browser clipboard events use the active editor; native clipboard utilities receive text directly without a shell. Binding customization and a broader multi-window redesign remain separate work.
