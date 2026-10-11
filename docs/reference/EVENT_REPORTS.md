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

## Reproducible presentation-resource audit (2026-10-11)

[The decoded resource inventory](v3-events.json) is generated directly from
Evnt128 and its five referenced PPob resources. `Evnt_EventSetup` is 128 in
`GalacticaConsts.h:294`; `CMessage::CreateEvent` loads that resource, rather than
the alternate Evnt130. Regenerate and verify with:

```sh
python3 tools/import-v3-events.py /path/to/galactica-anno-dominari-3
python3 tools/test-import-v3-events.py
```

The verifier checks all 22 codes, coverage of every STR#500 index 1–45,
recipient column order, automatic flags, referenced window/art roles and
rejection of corrupt record lengths, counts, flags and padding. With the peer
v3 checkout present it also regenerates and compares the complete inventory.
Resource hashes make changes to the audited payloads reviewable.

Each triple below is **winner / loser / other**, the source recipient columns.
“Winner” is a column name, not a guarantee of winning the game: PlayerDied
uses that column for the eliminated player. Zero means no assigned resource
or text entry. These definitions do not establish who receives an emitted
message; the emitter inventory above remains authoritative for that.

| Code | Event | Auto show | Sound IDs | STR#500 indices | PPob IDs |
|---|---|---|---|---|---|
| 1 | ColonyCaptured | Yes | 1009 / 1010 / 1014 | 1 / 2 / 3 | 0 / 0 / 0 |
| 2 | DefendersLost | Yes | 1007 / 1008 / 1014 | 4 / 5 / 6 | 0 / 0 / 0 |
| 3 | ShipLost | Yes | 1007 / 1008 / 0 | 7 / 8 / 9 | 0 / 0 / 0 |
| 4 | FleetLost | Yes | 1007 / 1008 / 0 | 10 / 11 / 12 | 0 / 0 / 0 |
| 5 | FleetDamaged | Yes | 0 / 0 / 0 | 34 / 35 / 36 | 0 / 0 / 0 |
| 6 | PlanetDamaged | Yes | 0 / 0 / 0 | 37 / 38 / 39 | 0 / 0 / 0 |
| 7 | Message | Yes | 1003 / 0 / 1003 | 13 / 0 / 14 | 10 / 0 / 10 |
| 8 | ShipCallin | No | 1001 / 0 / 0 | 15 / 0 / 0 | 0 / 0 / 0 |
| 9 | FleetCallin | No | 1001 / 0 / 0 | 16 / 0 / 0 | 0 / 0 / 0 |
| 10 | BuiltShip | No | 1001 / 0 / 1014 | 17 / 0 / 0 | 0 / 0 / 0 |
| 11 | BuiltNewClass | Yes | 1011 / 0 / 1014 | 18 / 0 / 19 | 4002 / 0 / 0 |
| 12 | InventNewClass | Yes | 1013 / 0 / 1014 | 20 / 0 / 21 | 4003 / 0 / 0 |
| 13 | NewTechLevel | No | 0 / 0 / 0 | 22 / 0 / 23 | 0 / 0 / 0 |
| 14 | NewColony | Yes | 1011 / 0 / 1014 | 24 / 0 / 25 | 0 / 0 / 0 |
| 15 | NewFleet | No | 0 / 0 / 0 | 26 / 0 / 27 | 0 / 0 / 0 |
| 16 | FleetFormed | No | 0 / 0 / 0 | 28 / 0 / 29 | 0 / 0 / 0 |
| 17 | PlayerDied | Yes | 1004 / 0 / 1006 | 30 / 0 / 31 | 4001 / 0 / 0 |
| 18 | PlayerWins | Yes | 1005 / 0 / 0 | 32 / 0 / 33 | 4000 / 0 / 0 |
| 19 | PlayerSurrenders | Yes | 0 / 0 / 0 | 40 / 41 / 42 | 0 / 0 / 0 |
| 20 | ShipDamageFixed | No | 1001 / 0 / 0 | 43 / 0 / 0 | 0 / 0 / 0 |
| 21 | FleetDamageFixed | No | 1001 / 0 / 0 | 44 / 0 / 0 | 0 / 0 / 0 |
| 22 | RenameColony | No | 1001 / 0 / 0 | 45 / 0 / 0 | 0 / 0 / 0 |

`GalacticaDoc::AddMessageToNeedyList` transfers autoShow to the attention-list
flag. `ShowMessages` distinguishes automatic presentations from owner-only
manual Go to items, and respects the game-message preference and visibility.
`CMessage::BuildClientEvent` selects the recipient resources and marks a
nonzero text entry as wanting attention. Crucially, `CMessage::DoMessage`
does **not** open a dialog when PPob is zero: it plays any assigned sound.
Thus autoShow alone does not imply a modal text window.

PPob10 is the ordinary message dialog. PPob4000/4001 contain static PICT4000/
4001 for victory/defeat. PPob4002/4003 use a `lofV` ship viewer rather than a
static picture for the newly built/discovered class. The observer columns of
these four events have no PPob. Every Evnt128 TEXT resource is zero; Layr is
supplied separately by emitters and is not represented by that field.

V4 repair-completion notices, call-ins, ordinary commissioning, rendezvous
fleet formation and colony naming already use manual attention rather than
queued automatic report dialogs. The existing sound suite checks recipient
cues and quiet reports. V4 also provides explicit manual narrative replay;
that does not change the source automatic/manual classification. This audit
closes the missing Evnt/PPob inventory, but it does not claim exact automatic
presentation equivalence, complete translated narrative coverage, or Layr
animation equivalence. In particular, Evnt references to sounds 1004–1006
must be distinguished from whether samples are present in the shipped bundle.

Validation: five resource-import checks pass, including actual-source equality;
both rebuilt public and development native runtimes pass all 1,683 game tests
with audio muted. No runtime UI changed, so this item requires no new visual
comparison. Existing event-specific browser evidence remains documented above.

## Remaining presentation and application scope

Every source-backed code now has a mapped implementation and regression lane.
Unspecified additional event types are not a concrete missing-feature list.
Evnt128 and its referenced PPob roles now have reproducible source evidence.
Runtime presentation, attention, artwork and sound equivalence still need
checking against that inventory, Layr and the shipped sound bundle, alongside
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
