# AI Integration Guide for Galactica-4

Last reviewed: 2026-08-25

This guide describes the AI system as it exists in the current runtime. The old “Phase 4 not yet implemented” wording is no longer accurate: AI players are now created and processed during the turn loop. The v3-backed runtime computer-player rules are active; remaining work is mostly setup UI, waypoint/course UI, reporting, and future enhancements.

## Current status

AI is integrated into the local single-player runtime:

- `Game` creates an `AIManager`.
- Computer-controlled players are initialized from `GameConfig`.
- `endTurn()` processes AI decisions before ship/fleet movement, star updates, visibility updates, and piece-count checks.
- AI stars can apply v3-style economic allocations, choose/start ship construction with v3 weighted hull selection, and activate patrol behavior where v3 does.
- AI ships can choose one destination and move toward owned, enemy, or unowned targets, while skipping under-construction ships and stationary defense satellites.
- AI can form docked fleets and process fleets as ship-like strategic actors, including the v3 guard that docked fleets with fewer than three ships do not move.
- Good/Expert AI toggles eligible healthy docked non-scout ships/fleets onto patrol and takes damaged patrollers off patrol for repair.
- AI units use the shared technology-transfer rules when scouts, battleships, and fleets arrive at or depart from allied systems.
- Computer advantage now affects AI research and shipbuilding output.
- Human controls reject AI-owned and unowned entities.

Remaining v3 parity gaps are outside the Section 7 runtime AI rules:

- Fleet formation works for docked ships and rendezvous assembly now has a simple UI. The wider v3 fleet/player UI around sortable roster polish, richer exchange workflows, and course tools is still incomplete.
- AI orders use v4's single-destination movement until the full v3 waypoint/course model is ported for all players.
- Computer advantage is applied to production, but the full v3 setup range is not exposed in the startup UI.
- Older three-bucket helper paths remain as scaffolding/stat display, but they should not be used for new C++-backed behavior where v3's five-value skill actually controls outcomes.

Items such as player-visible AI intent, richer defensive threat tuning, non-production computer-advantage effects, combat-odds estimation, and retreat/avoidance are possible v4 enhancements. They were not found as shipped v3 computer-player requirements in the audited C++ paths.

## Main files

- `src/js/ai-manager.js` - owns AI players and processes their turns.
- `src/js/ai-base.js` - common AI decision/action model.
- `src/js/ai-skill.js` - legacy Average/Good/Expert helper buckets; C++ parity work should prefer the preserved five-value `PlayerInfo.compSkill` where v3 behavior depends on it.
- `src/js/ai-utils.js` - entity/fleet queries, distance, ownership, speed, strength, and docked-state helpers.
- `src/js/ai-ship.js` - ship/fleet target selection, v3 skill handling, fleet formation, and destination execution.
- `src/js/ai-star.js` - star economy role assignment, v3 weighted ship-building choices, dormant threat helpers, and defensive activation scaffolding.
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

Ship AI reads the preserved v3 `PlayerInfo.compSkill` value directly for search distance, target-pass count, skilled scout behavior, per-destination pass merging, lower-skill randomness, Novice fleet avoidance, and Good/Expert patrol toggling. The older three-bucket helper remains for coarse initialization/stat display and dormant scaffold methods.

## What AI decisions currently do

Star decisions:

- apply desired growth/research/shipbuilding allocations;
- use v3-style expert tech-star/shipbuilder roles and default non-expert allocations;
- choose a ship type to build using v3's weighted hull rule, with expert tech stars alternating satellites/scouts;
- call `star.startBuildingShip()` when a build decision is selected;
- keep threat/need helpers dormant as possible future behavior rather than using them to override v3 build selection.

Ship decisions:

- evaluate possible targets using the v3 decision matrices, v3 skill search/repetition values, v3 per-destination pass merging, and v3 tie-break rules;
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

Confirmed remaining v3 work adjacent to AI:

- Integrate AI orders with the full waypoint/course model once that navigation system is ported.
- Polish fleet roster/exchange UI and add course tools around the now-active fleet formation/rendezvous path.
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

See [the Testing Guide](TESTING_GUIDE.md) for the latest verified full-suite result and native runtime selection.

The deterministic AI-only parity observer can be launched with `./gad4 -- --ai-autoplay`. It creates five computer players on the smallest map with v3 skill levels Expert, Good, Average, Passable, and Novice represented by players 1-5, uses a fixed default seed of `424242`, and advances turns until the win condition or the 250-turn max-turn guard. Event presentation windows are hidden by default for unattended runs; add `--show-event-windows` to display lab/stardock overlays, which are held briefly before the next autoplay turn.

Use a native PDG runtime (`./gad4`, or select one with `PDG_EXECUTABLE`) for the full suite; the project relies on PDG globals such as `pdg.res`, `pdg.srand()`, and `pdg.rand()`.
