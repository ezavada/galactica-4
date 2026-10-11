# Application window behavior

Game-wide windows (commands, open games, Compare Players, your systems, fleets, settings, view, map display, colony defaults and turn confirmation) are modal. Their own controls may focus or zoom the map. Outside mouse clicks play the existing NoMore clunk (sound 1012), subject to the sound setting, and do not select objects, issue orders, pan, or advance turns. Map wheel zoom is blocked while these windows are open.

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


Modal report narratives and outcome dialogs now use the same neutral system
surface as Settings and Compare Players: nearly white at the top, light gray
at the bottom, black text/buttons, and gold reflective edging. Victory/defeat
art keeps its recovered image and placement, with a 55% white overlay for black
text legibility. Lab/Stardock illustrated presentations keep their separate
source artwork composition. Events remains non-modal and retains its existing
darker surface.

Clicks outside report/outcome windows clunk for left, right and middle buttons
and do not select, order, drag the map or dismiss the dialog. Blank space inside
is inert. Automatic no-dialog playback keeps its interruption behavior. Title
dragging constrains reports and outcomes to the viewport and remembers their
positions in configuration. Continue buttons show Esc in the existing small
shortcut style; sizing includes both label and hint in every supported language.

Both full native suites pass 1,725 tests. Muted real-browser before/after checks
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
