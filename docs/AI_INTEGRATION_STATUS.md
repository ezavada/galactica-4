# AI Integration Guide for Galactica-4

Last reviewed: 2026-08-25

This guide describes the AI system as it exists in the current runtime. The old “Phase 4 not yet implemented” wording is no longer accurate: AI players are now created and processed during the turn loop. The integration is real, but it is still partial compared with Galactica v3.

## Current status

AI is integrated into the local single-player runtime:

- `Game` creates an `AIManager`.
- Computer-controlled players are initialized from `GameConfig`.
- `endTurn()` processes AI decisions before ship/fleet movement, star updates, visibility updates, and piece-count checks.
- AI stars can apply v3-style economic allocations, choose/start ship construction, and activate basic defensive builds/patrols.
- AI ships can choose one destination and move toward owned, enemy, or unowned targets.
- AI can form docked fleets and process fleets as ship-like strategic actors.
- Computer advantage now affects AI research and shipbuilding output.
- Human controls reject AI-owned and unowned entities.

AI is not yet full v3 parity:

- AI economy is still a first-pass v3 role port rather than a fully tuned long-game economy.
- Defensive actions build satellites and toggle patrol, but do not yet implement v3 reinforcement/call-in behavior.
- Fleet formation works for docked ships, but rendezvous points, named fleets, exchange UI, and course tools are still missing.
- Ship AI uses the five v3 skill values for search distance, target passes, lower-skill randomness, and Novice fleet avoidance, but some other behavior still maps into three coarse AI buckets.
- Computer advantage is applied to production, but the full v3 setup range and any non-production effects are incomplete.
- Combat odds, retreat/avoidance, and richer strategic evaluation remain future work.

## Main files

- `src/js/ai-manager.js` - owns AI players and processes their turns.
- `src/js/ai-base.js` - common AI decision/action model.
- `src/js/ai-skill.js` - three effective behavior levels: Average, Good, Expert.
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

The current high-level AI behavior bucket still has three effective levels:

- v3 Expert -> AI Expert
- v3 Good -> AI Good
- v3 Average/Passable/Novice -> AI Average

Ship AI also reads the preserved v3 `PlayerInfo.compSkill` value directly for search distance, target-pass count, lower-skill randomness, and Novice fleet avoidance. This is why the UI can show five labels and several ship-decision behaviors now differ by all five values, while some other AI modifiers remain coarser.

## What AI decisions currently do

Star decisions:

- assess nearby threats;
- apply desired growth/research/shipbuilding allocations;
- use v3-style expert tech-star/shipbuilder roles and default non-expert allocations;
- choose a ship type to build;
- call `star.startBuildingShip()` when a build decision is selected;
- start defensive satellite construction and put healthy docked non-scout defenders on patrol when defensive activation is selected.

Ship decisions:

- evaluate possible targets using decision-matrix style scoring and v3 skill search/repetition values;
- set a single destination on the ship for movement/attack/colonization;
- form/join docked fleets when the scoring result selects fleet formation;
- avoid moving immobile or ineligible ships.

Fleet decisions:

- use the ship-decision matrix through the strongest fleet role present;
- set one fleet destination for movement/attack/colonization;
- keep member ship positions synchronized with the fleet.

Ownership controls:

- humans cannot select or command AI-owned entities;
- humans cannot command unowned entities;
- feedback is currently mostly console/event-list level, not final UI polish.

## Known gaps

- Tune AI economic allocation and build choices against long v3/autoplay outcomes.
- Expand defensive decisions beyond satellite builds/patrol toggles into v3-like reinforcement and call-in behavior.
- Add rendezvous, named fleets, fleet exchange UI, and course tools around the now-active fleet formation path.
- Expose the full v3 computer-advantage range in setup and determine whether any strategic modifiers are needed beyond production.
- Finish v3-accurate behavior for Passable and Novice outside the ship search/randomness/fleet-avoidance hooks.
- Improve combat-aware target selection and retreat/avoidance.
- Add long-game AI regression tests and AI-vs-AI scenario tests.

## Testing

Run the full suite with the PDG runtime:

```bash
./gad4 tests/run-tests.js
```

Current expected result: 312 passed, 0 failed.

The deterministic AI-only parity observer can be launched with `./gad4 -- --ai-autoplay`. It creates five computer players on the smallest map with v3 skill levels Expert, Good, Average, Passable, and Novice represented by players 1-5, uses a fixed default seed of `424242`, and advances turns until the win condition or the 250-turn max-turn guard. Event presentation windows are hidden by default for unattended runs; add `--show-event-windows` to display lab/stardock overlays, which are held briefly before the next autoplay turn.

Use only the pinned PDG runtime (`./gad4`) for the full suite; the project relies on PDG globals such as `pdg.res`, `pdg.srand()`, and `pdg.rand()`.
