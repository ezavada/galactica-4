# AI Integration Guide for Galactica-4

Last reviewed: 2026-08-25

This guide describes the AI system as it exists in the current runtime. The old “Phase 4 not yet implemented” wording is no longer accurate: AI players are now created and processed during the turn loop. The integration is real, but it is still partial compared with Galactica v3.

## Current status

AI is integrated into the local single-player runtime:

- `Game` creates an `AIManager`.
- Computer-controlled players are initialized from `GameConfig`.
- `endTurn()` processes AI decisions before ship/fleet movement, star updates, visibility updates, and piece-count checks.
- AI stars can apply v3-style economic allocations, choose/start ship construction, and activate basic defensive builds/patrols.
- AI ships can choose one destination and move toward owned, enemy, or unowned targets, while skipping under-construction ships and stationary defense satellites.
- AI can form docked fleets and process fleets as ship-like strategic actors, including the v3 guard that docked fleets with fewer than three ships do not move.
- Good/Expert AI toggles eligible healthy docked non-scout ships/fleets onto patrol and takes damaged patrollers off patrol for repair.
- AI units use the shared technology-transfer rules when scouts, battleships, and fleets arrive at or depart from allied systems.
- Computer advantage now affects AI research and shipbuilding output.
- Human controls reject AI-owned and unowned entities.

AI is not yet full v3 parity. The confirmed v3 gaps are narrower than "make the AI smarter" work:

- Ship/fleet AI still needs every `CShipCompMove.cpp`/`UShipUtils.cpp` factor and edge case verified against the v3 source.
- Fleet formation works for docked ships, but the wider v3 fleet/player UI around rendezvous, exchange, and course tools is still missing.
- AI orders still use v4's single-destination movement instead of the full v3 waypoint/course model.
- Computer advantage is applied to production, but the full v3 setup range is not exposed in the startup UI.
- Older three-bucket helper paths remain in the implementation and should be removed or bypassed wherever they affect C++-backed behavior.

Items such as player-visible AI intent, richer defensive threat tuning, non-production computer-advantage effects, combat-odds estimation, and retreat/avoidance are possible v4 enhancements. They were not found as shipped v3 computer-player requirements in the audited C++ paths.

## Main files

- `src/js/ai-manager.js` - owns AI players and processes their turns.
- `src/js/ai-base.js` - common AI decision/action model.
- `src/js/ai-skill.js` - legacy Average/Good/Expert helper buckets; C++ parity work should prefer the preserved five-value `PlayerInfo.compSkill` where v3 behavior depends on it.
- `src/js/ai-utils.js` - entity/fleet queries, distance, ownership, speed, strength, and docked-state helpers.
- `src/js/ai-ship.js` - ship/fleet target selection, v3 skill handling, fleet formation, and destination execution.
- `src/js/ai-star.js` - star economy role assignment, ship-building choices, threat checks, and defensive activation.
- `src/js/game.js` - runtime integration, ownership checks, AI initialization, and turn sequencing.
- `tests/ai-systems.test.js` - unit/integration coverage for the AI pieces.

## Runtime flow

On game creation:

1. `GameConfig` determines total players, human count, computer count, skill, and advantage fields.
2. `Game` creates `PlayerInfo` records.
3. Computer players receive skill/advantage metadata.
4. `AIManager.initializeAIPlayer()` creates an `AIPlayer` for each computer player.

On end turn:

1. `AIManager.processAITurns()` runs once.
2. Each AI player processes its owned stars.
3. Each AI player processes its owned ships.
4. Each AI player processes its owned fleets.
5. Ships and fleets move.
6. Stars update repairs, production, growth, research, and construction.
7. Visibility and piece counts update.
8. The turn counter advances.

## Skill mapping

The setup model preserves the five v3 difficulty labels:

- 1 = Expert
- 2 = Good
- 3 = Average
- 4 = Passable
- 5 = Novice

The legacy high-level AI helper bucket still has three effective levels:

- v3 Expert -> AI Expert
- v3 Good -> AI Good
- v3 Average/Passable/Novice -> AI Average

Ship AI also reads the preserved v3 `PlayerInfo.compSkill` value directly for search distance, target-pass count, skilled scout behavior, lower-skill randomness, and Novice fleet avoidance. The remaining cleanup is to stop using the older three-bucket helper anywhere it changes behavior that v3's five-value skill actually controlled.

## What AI decisions currently do

Star decisions:

- apply desired growth/research/shipbuilding allocations;
- use v3-style expert tech-star/shipbuilder roles and default non-expert allocations;
- choose a ship type to build;
- call `star.startBuildingShip()` when a build decision is selected;
- choose defense satellites through the build-selection path when threat/need calls for it. The separate defensive-activation helper exists, but the normal star decision path currently returns the build decision and does not execute that helper as an independent second action.

Ship decisions:

- evaluate possible targets using decision-matrix style scoring and v3 skill search/repetition values;
- set a single destination on the ship for movement/attack/colonization;
- form/join docked fleets when the scoring result selects fleet formation;
- avoid moving immobile or ineligible ships;
- apply v3 Good/Expert patrol toggles when an eligible docked non-scout ship or fleet remains without a movement order.

Fleet decisions:

- use the ship-decision matrix through the strongest fleet role present;
- set one fleet destination for movement/attack/colonization;
- keep member ship positions synchronized with the fleet.

Ownership controls:

- humans cannot select or command AI-owned entities;
- humans cannot command unowned entities;
- feedback is currently mostly console/event-list level, not final UI polish.

## Known gaps

Confirmed v3 parity gaps:

- Verify the full ship/fleet decision factor set against `CShipCompMove.cpp` and `UShipUtils.cpp`.
- Integrate AI orders with the full waypoint/course model once that navigation system is ported.
- Add rendezvous, fleet exchange UI, and course tools around the now-active fleet formation path.
- Expose the full v3 computer-advantage range in setup.

Possible v4 enhancements, not counted as v3 parity gaps:

- Player-visible AI intent/debug overlays.
- Richer defensive threat tuning or reinforcement coordination beyond v3's satellite/patrol behavior.
- Strategic computer-advantage effects beyond v3's production-style modifiers.
- Combat-odds estimation, retreat/avoidance, and additional late-game attack-pressure tuning.
- Add long-game AI regression tests and AI-vs-AI scenario tests.

## Testing

Run the full suite with the PDG runtime:

```bash
./gad4 tests/run-tests.js
```

Current expected result: 327 passed, 0 failed.

The deterministic AI-only parity observer can be launched with `./gad4 -- --ai-autoplay`. It creates five computer players on the smallest map with v3 skill levels Expert, Good, Average, Passable, and Novice represented by players 1-5, uses a fixed default seed of `424242`, and advances turns until the win condition or the 250-turn max-turn guard. Event presentation windows are hidden by default for unattended runs; add `--show-event-windows` to display lab/stardock overlays, which are held briefly before the next autoplay turn.

Use only the pinned PDG runtime (`./gad4`) for the full suite; the project relies on PDG globals such as `pdg.res`, `pdg.srand()`, and `pdg.rand()`.
