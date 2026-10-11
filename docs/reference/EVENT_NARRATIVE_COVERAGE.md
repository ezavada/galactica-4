# Shipped event narrative coverage

Reviewed 2026-10-11 against the peer shipped-v3 source.

`v3-events.json` now includes every original English STR#500 narrative, its
resource source and SHA-256 digest, as well as the Evnt128 recipient rules.
`tools/import-v3-events.py` reproduces that inventory directly from the resource
payloads. `tools/test-import-v3-events.py` checks actual-source equality, complete
45-entry coverage, recipient ordering and corrupt binary input. No wording is
reconstructed from v4 or inferred from an event title.

The source has 22 nonzero codes and 45 resource templates. Actual emitters
reach eighteen codes and 31 recipient-relative templates. The complete emitter
inventory and primary source locations remain in [EVENT_REPORTS.md](EVENT_REPORTS.md).
This table covers narrative meaning and recipient perspective; exact historical
punctuation is not a requirement for the six localized v4 resources. Original
texts remain inspectable in the generated inventory. Source `%`, `#`, `*`, `@`
and `$` substitutions correspond to subject, opposing faction, initiating faction,
focus location and numeric technology/count respectively.

Source emission does not imply a manual attention request: ShowMessages removes
foreign non-autoshow messages (`GalacticaDoc.cp:1568–1570`). In particular,
NewFleet observer template 27 remains in this emitter inventory but is absent
from source Next. V4 retains its detected explicit Events review as an extra
capability, with no automatic attention or End Turn warning request.

## Reachable variants

V4 text IDs refer to the existing en/de/es/fr/ja/ru string resources. Suite names
refer to `tests/<suite>.test.js`; the slash separates two suites. Each row's
corresponding emitters, perspective and dynamic values were reviewed against
source and these suites, rather than treating presence of a translation as
proof of runtime delivery.

| STR#500 index | Event code | Recipient column | V4 text | Runtime regression suites | Required narrative content |
|---|---|---|---|---|---|
| 1 | 1 | winner | 929 | occupation-reports | Capture: system and former owner |
| 2 | 1 | loser | 930 | occupation-reports | Loss: system and attacker |
| 3 | 1 | other | 937 | occupation-reports | Observer: attacker, system and former owner |
| 4 | 2 | winner | 931 | occupation-reports | Last resistance defeated: system and defender |
| 5 | 2 | loser | 932 | occupation-reports | Last defenders lost: system and attacker |
| 7 | 3 | winner | 933 | destruction-reports | Enemy ship destroyed: ship, owner and location |
| 8 | 3 | loser | 934 | destruction-reports | Own ship lost: ship, attacker and location |
| 10 | 4 | winner | 935 | destruction-reports | Enemy fleet destroyed: fleet, owner and location |
| 11 | 4 | loser | 936 | destruction-reports | Own fleet lost: fleet, attacker and location |
| 13 | 7 | winner | Sender title + payload | host-chat | Offline message: immutable sender identity and literal message body |
| 15 | 8 | winner | 1002 | callin-reports | Own starship awaiting orders: name and named/fixed-point location |
| 16 | 9 | winner | 1003 | callin-reports | Own fleet awaiting orders: name and named/fixed-point location |
| 17 | 10 | winner | 1004 | built-ship-reports | Ordinary new ship: name, construction system and launch readiness |
| 18 | 11 | winner | 925; role help 921–924 | ship-commissioning / commissioning-observers | First class: class, technology and construction system |
| 19 | 11 | other | 957 | commissioning-observers | Observer first class: faction, class, technology and construction system |
| 20 | 12 | winner | 958 | discovery-observers | Own drive discovery: system and technology |
| 21 | 12 | other | 959 | discovery-observers | Observer drive discovery: system, faction and technology |
| 24 | 14 | winner | 952 | neutral-colony-reports | Own neutral colonization: system |
| 25 | 14 | other | 953 | neutral-colony-reports | Observer neutral colonization: faction and system |
| 26 | 15 | winner | 950 | rendezvous-formation-reports | New fleet begins forming: location and naming instruction |
| 27 | 15 | other | 951 | rendezvous-formation-reports | Observer new fleet: faction and location; emitted, then excluded from source manual Next; v4 retains explicit Events review |
| 30 | 17 | winner | 637; full story 833 | outcome-reports | Affected player defeat and full source TEXT4001 story |
| 31 | 17 | other | 637 | outcome-reports | Observer defeat: eliminated player identity |
| 32 | 18 | winner | 644; full story 832 | outcome-reports | Affected player victory and full source TEXT4000 story |
| 33 | 18 | other | 644 | outcome-reports | Observer victory: winning player identity |
| 37 | 6 | winner | 940; plural variants | system-defense-reports | Defending system loses ships: system and raw loss count |
| 38 | 6 | loser | 941; plural variants | system-defense-reports | Attacker destroys system ships: system and raw loss count |
| 39 | 6 | other | 942; plural variants | system-defense-reports | Observer system losses: defender, system, attacker and raw count |
| 43 | 20 | winner | 948 | repair-reports | Own ship completely repaired: ship name |
| 44 | 21 | winner | 949 | repair-reports | All ships in own fleet completely repaired: fleet name |
| 45 | 22 | winner | 856 | colony-setup-reports | Private naming and production instruction for new neutral colony |

Outcome affected-player windows intentionally show the full source victory/defeat
story in addition to the concise player-named summary. Observer reports retain
the identity and result without revealing the private affected-player artwork.
The message row is dynamic user content: its sender/title and literal payload
are retained, while its application controls use the current language. Chat
text is never translated or rewritten.

## All fourteen remaining resource entries

These are accounted for explicitly; they are not silently omitted from parity:

- 6, 9 and 12: observer resistance, ship-loss and fleet-loss templates exist,
  but the corresponding actual emitters send only to the direct participants.
- 14: offline Message's observer template exists, but `GalacticaHost.cpp:2067`
  sends only to the addressed offline player with `kNoOtherPlayers`.
- 22/23, 28/29 and 40/41/42: NewTechLevel, FleetFormed and PlayerSurrenders
  are enum/resource definitions without independent C/C++ emitters. V4's
  NewFleet report is code 15, not evidence for dormant FleetFormed code 16.
- 34/35/36: FleetDamaged has source calls, but the built loss helper returns
  nonpositive counts which cannot pass their `>1` emission gates. Actual
  destruction and surviving-system casualty reports remain covered separately.

Together the reachable set and these fourteen entries cover exactly indices
1–45. No new event triggers or recipient disclosures are invented to make
the resource count appear implemented.

## Runtime, localization and presentation evidence

The mapped suites exercise actual movement/combat, star commissioning/research,
repair, first rendezvous arrivals, call-ins, offline delivery and outcome
transitions. The event-family suites also check private recipients, observer
detection, suppression, literal Unicode/`$&` values, immutable snapshots,
complete saves and manual review without another turn. Six-language checks
cover complete resolved narratives, count grammar and measured layout; the
owner commissioning browser audit covers all six class/technology/origin views.

Both fresh complete muted native suites pass 1731 tests with zero failures:
`/private/tmp/galactica-event-narrative-{public,devel}-unit.log`. All eight
source-import checks pass in `/private/tmp/galactica-event-narrative-source.log`.

Actual six-language browser and visual audits are recorded by event family in
[V3_V4_FEATURE_STATUS.md](../V3_V4_FEATURE_STATUS.md): call-in and ordinary
build reports; destruction; surviving system defenses; capture/resistance;
neutral colonization; owner/observer commissioning and discovery; rendezvous;
repair; and outcomes. The latest attention audit uses 84 matched captures,
with 30 focus changes and 54 identical views including every explicit narrative
view. This inventory change modifies no runtime presentation or translation,
so it reuses those specific visual checks rather than claiming new screenshots.

This closes the **event-text** row: every source-reachable perspective and its
dynamic narrative content has an implementation and runtime evidence. It does
not close the separate attention sequencing, enemy replay, original-art pixel
equality, packaged-runtime, native GUI/focus, sound-timbre or broader localization
audit rows. Saved historical narratives remain immutable and are not rewritten
when the current application language changes.
