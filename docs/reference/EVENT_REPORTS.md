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

## Complete source-emitter inventory (2026-10-11)

This inventory checks every nonzero `EEventCode` against C/C++ source rather
than inferring gameplay from STR#500. V3 paths are relative to `Classes/`.
V4 `game` methods are in `src/js/game.js`; other module names are relative to
`src/js/`. Suite names below identify `tests/<name>.test.js`.

| Code | Event | V3 emitter | V4 implementation | Regression suites |
|---|---|---|---|---|
| 1 | ColonyCaptured | CShip.cpp:435; broadcasts | game.recordOccupationReports (capture) | occupation-reports |
| 2 | DefendersLost | CShip.cpp:427; direct opponents | game.recordOccupationReports (resistance) | occupation-reports |
| 3 | ShipLost | AGalacticThingy.cpp:805; class destruction code | game.recordDestructionReports / removeDestroyedShip | destruction-reports |
| 4 | FleetLost | AGalacticThingy.cpp:805; fleet destruction code | game.recordDestructionReports / removeDestroyedFleet | destruction-reports |
| 5 | FleetDamaged | CShip.cpp:402,412; built loss helper cannot satisfy gates | Dormant; actual v4 casualty summaries remain | destruction-reports |
| 6 | PlanetDamaged | CShip.cpp:392; failed attacker and positive system defense losses | game.recordSystemDefenseLosses | system-defense-reports |
| 7 | Message | GalacticaHost.cpp:2067; offline recipient | host-chat.js durable private report; network-chat.js connected messages | host-chat / network-chat / network-chat-window |
| 8 | ShipCallin | CShip.cpp:824–834; dynamic call-in code | attention.js request | callin-reports |
| 9 | FleetCallin | CShip.cpp:824–834; dynamic fleet call-in code | attention.js request | callin-reports |
| 10 | BuiltShip | CStar.cpp:931; ordinary mobile hull, no auto delivery | game.recordBuiltShipReport | built-ship-reports |
| 11 | BuiltNewClass | CStar.cpp:920; milestone broadcast, owner Stardock | game.recordCommissioningReports | ship-commissioning / commissioning-observers |
| 12 | InventNewClass | CStar.cpp:651; milestone broadcast, owner Lab | game.recordDiscoveryReports | discovery-observers / research-progress |
| 13 | NewTechLevel | Enum only; no C/C++ emitter | No additional source-backed trigger | Source audit |
| 14 | NewColony | CShip.cpp:460; neutral colonization broadcast | game.recordColonizationReports | neutral-colony-reports |
| 15 | NewFleet | CShip.cpp:537; first rendezvous arrival creates fleet | game.recordRendezvousFleetFormation | rendezvous-formation-reports |
| 16 | FleetFormed | Enum only; no C/C++ emitter | Distinct from v4 FLEET_FORMED, which carries v3 NewFleet | Source audit |
| 17 | PlayerDied | GalacticaHost.cpp:1087; GalacticaSingleDoc.cp:1191 | game.updatePlayerPieceCounts / queueOutcome | outcome-reports |
| 18 | PlayerWins | GalacticaHost.cpp:1118; GalacticaSingleDoc.cp:1221 | game.updateVictoryState / markGameWon / queueOutcome | outcome-reports / game-rules |
| 19 | PlayerSurrenders | Enum only; no C/C++ emitter | No invented surrender trigger | Source audit |
| 20 | ShipDamageFixed | CStar.cpp:617; positive repair completes ship | game.recordRepairCompletion | repair-reports |
| 21 | FleetDamageFixed | CStar.cpp:615; complete top-level fleet repair | game.recordRepairCompletion | repair-reports |
| 22 | RenameColony | CShip.cpp:462; neutral colony naming/production instruction | game.requestColonySetup | colony-setup-reports |

There are eighteen codes with source-backed runtime emitters, three enum-only
codes and the separately audited dormant FleetDamaged branch. The enum-only
references are `GalacticaConsts.h:832,835,838`; searches of all C/C++ source
find no independent emitters. V4 type names are not numeric v3 code mappings:
its `FLEET_FORMED` carries the real NewFleet (15) creation report, and its
ordinary tech-up notice does not prove a NewTechLevel (13) v3 emitter.

The current complete 1,656-test suites passed on both rebuilt PDG runtimes and
include the suites above. Their meaningful coverage includes gameplay transitions,
recipient privacy, observer detection, suppression, literal snapshots, replay,
manual/automatic behavior, complete saves and six-language layouts. Examples:
`destruction-reports` checks actual open-space arrival and suppression at a
friendly system; `system-defense-reports` checks failed real attacks and mixed
owners; `discovery-observers` checks actual research and delayed visibility;
`rendezvous-formation-reports` checks actual first-ship arrival without repeating
creation on later arrivals. This inventory is an implementation/coverage map,
not execution of an archived v3 binary or proof of every presentation resource.

Owner/opponent destruction notices remain private. Capture, surviving-system
defense losses, neutral colonization, commissioning and discovery have tested
observer copies. Repairs and call-ins are owner-only. Rendezvous creation is
manual-only. Victory/defeat have viewer-relative modal narratives in addition
to their shorter event-list summaries; STR#500/30–33 distinguishes the affected
player from observers. Those perspectives are exercised by `outcome-reports`.

## Remaining presentation and application scope

Every source-backed code now has a mapped implementation and regression lane.
Unspecified additional event types are not a concrete missing-feature list.
The separate presentation, attention, artwork and sound requirements still
need checking against Evnt/PPob, Layr and sound resources, alongside runtime
packaging and platform validation. Passing the covered tests does not establish
blanket equivalence of all 45 text templates. Introduction music remains an
independently recorded missing-asset issue. Window/preference requirements and
the Map Generation checklist remain active. Different release-source evidence
can reopen any dormant classification.


## FleetDamaged: defined, but not an ordinary shipped-source emitter

Source audit on 2026-10-10 found two apparent FleetDamaged (5) emitters in
`Classes/CShip.cpp:397–414`. They test `defendersInFleetLosses > 1` after a
failed attack on a non-system destination, or `attackersInFleetLosses > 1`
after a surviving attack. Both numbers come from
`Classes/UShipUtils.cpp:398–428`, `FinalizeLosses`.

That implementation starts `numDead` at zero and does:

```cpp
UInt32 startingShips = infoP->numShips;
fleet->RecordCombatResults();
UInt32 remainingShips = infoP->numShips;
numDead -= (startingShips - remainingShips);
```

Ordinary combat removes ships; `CFleet::RecordCombatResults:567–590` counts
remaining live members. Thus no losses return zero and positive losses return
a negative count, which does not pass either `> 1` test. A resource definition
and a syntactic CreateEvent call do not establish a reachable normal-combat
notice. Other FleetDamaged references in the C/C++ source are its enum; no
independent emitter was found.

This is the built helper, not a guess from a similarly named old file:
`Galactica.xcodeproj/project.pbxproj:16,885` includes UShipUtils.cpp in Sources.
The CodeWarrior XML `x-misc/Galactica.mcp.xml` also selects UShipUtils.cpp for
Carbon Final, Carbon Beta, Carbon Debug, Carbon on Classic Debug and Profile.
The older `Classes/UStarUtils.cp:317–350` adds starting ships then subtracts
survivors, but those audited build manifests do not select that file. It must
not be substituted silently to infer shipped behavior.

Evnt128 still defines FleetDamaged with STR#500/34 (winner), /35 (loser), /36
(observer), no recipient sound or PPob, and autoShow=1. It is classified as a
dormant defined event in this source version, rather than another confirmed
missing v4 combat broadcast. This audit does not claim execution of an archived
v3 binary. If a release built from different source is shown to emit the
notice, its exact helper/build must be audited and the parity requirement
reopened. Restoring the apparent intended positive count would be a deliberate
behavior change, requiring a separate decision.

V4 retains its recipient-private battle summaries with casualty counts,
remembered-location navigation and replay, alongside the reachable v3-backed
system-defense loss notices. No gameplay, UI or user-visible strings changed
for this audit; no new screenshot or translation artifact is needed.
