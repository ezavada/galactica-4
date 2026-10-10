# Shipped v3 event reports and call-ins

The event inventory is 22 nonzero event codes, with 45 recipient-relative text
entries in STR#500. These are different counts: the checklist previously called
all 45 entries event types. `Classes/GalacticaConsts.h:818–843` supplies the
codes, `Classes/CMessage.h:27–45` supplies the three recipient columns, and
`Resources/gal-mainrsrc.r` Evnt128 selects each code's sound, string, window and
automatic-presentation behavior. `Resources/gal-en-shareware.r` STR#500 holds
45 text entries. Resource definitions alone do not prove an event is emitted.

## Ship and fleet call-ins

`Classes/CShip.cpp:824–834` emits ShipCallin (8) or FleetCallin (9) for a living
human-owned actor that wants attention; it sends to the owner, then clears the
transient wants-attention flag. The user call-in setting stays enabled until
canceled. Both Evnt128 rows select owner text only (STR#500/15 or /16), sound
1001, no PPob and autoShow=0. The messages identify the starship or fleet and its
location while awaiting orders. Observer strings are zero and there is no
broadcast recipient.

`CMessage::MakeReportString` substitutes the subject name for percent and the
focus description for @. `GalacticaUtils.cpp:515–587` uses a named docked system
without extra coordinates; coordinate positions use fixed-point galactic units
and two decimal places. V4 follows this with existing localized coordinate
formatting. Names, location text and numeric focus coordinates are retained in
the report snapshot. Changing an actor's name/location does not rewrite an old
report. Go to follows a living subject; a lost subject retains remembered focus.
The report's private recipient is the owner even when another human is viewing
the application. Owner reports use true system names rather than the viewer's
fog-of-war aliases, without exposing those names to other recipients.

V4 keeps the existing attention controls and non-modal Events/Go to behavior;
it does not add automatic call-in dialogs. Sound 1001 remains the existing
attention cue. New text IDs 1002–1003 are translated in en/de/es/fr/ja/ru.
Duplicate requests and notify=false do not create extra reports. Complete saves
retain the snapshot, subject identity, recipient and attention handling.

Six new regressions cover ship/fleet distinction, docked and space locations,
real end-turn delivery/manual flag persistence, privacy, complete saves/lost
focus, duplicate/silent requests and all six resources. Both full native suites
pass 1,379 tests. `tools/test-web-callin-reports.cjs` prepares deterministic
actors, then uses actual Course Call in, roster selection, End Turn, Events
selection and Go to controls. All six languages pass, and inspected before/after
screens show the separate complete narratives with unchanged controls. Chrome
and native output remain muted during automation.

Evidence: `/private/tmp/galactica-callin-{tests,public-tests,<language>,before}.log`,
`/private/tmp/galactica-parity/callin`, and
`/private/tmp/galactica-callin-{before-after,languages}-review.png`.

## Ordinary newly built ship notices

`Classes/CStar.cpp:900–931` creates BuiltShip (10) separately from the first
new-class Stardock report. Satellites and automatic deliveries suppress the
ordinary orders notice. Evnt128 selects owner STR#500/17, sound 1001, no PPob,
and autoShow=0. The shipped text identifies the newly built starship and its
origin system, ready for launch. It is sent to the owner, without a broadcast.

V4 now preserves that full narrative with localized text 1004 in en/de/es/fr/ja/ru.
The owner-private report snapshots ship name, origin name, hull and technology;
renaming does not rewrite history. It retains ordinary attention and Events →
Go to, without an additional modal report. First-class commissioning remains a
separate presentation. Existing satellite/default-destination suppression stays
in place, including deliveries that reach their destination immediately. The
intentional v4 rule that exactly 100% paid hulls complete without another positive
payment also remains covered.

Six regressions cover all mobile hulls, suppression, real end-turn completion,
privacy/saves, live/lost navigation and localization. Both native runtimes pass
1,385 tests. `tools/test-web-built-ship-reports.cjs` prepares production credit,
then uses actual Scout production, End Turn, Events selection and Go to controls.
All six languages pass. Reviewed baseline/updated screenshots show the full
ship/origin narrative, readable wrapping and unchanged surrounding controls.
Automated native and browser audio output remains muted.

Evidence: `/private/tmp/galactica-built-report-{tests,public-tests,<language>,before}.log`,
`/private/tmp/galactica-parity/built`, and
`/private/tmp/galactica-built-report-{before-after,languages}.png`.

## Remaining audit scope

Other recipient variants and multiplayer messages still need individual source
and runtime coverage. NewTechLevel (13), FleetFormed (16) and PlayerSurrenders
(19) currently occur only in their enum declarations across this checkout's
C/C++ sources; no emitter was found. Their resource text establishes definitions,
not observable normal-turn behavior. A complete event-matrix audit must preserve
this distinction and must not invent broadcasts from unused resource entries.
The broader parity and Map Generation objectives remain active.
