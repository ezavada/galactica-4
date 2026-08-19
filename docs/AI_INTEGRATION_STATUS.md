# AI Integration Guide for Galactica-4

Last reviewed: 2026-08-19

This guide describes the AI system as it exists in the current runtime. The old “Phase 4 not yet implemented” wording is no longer accurate: AI players are now created and processed during the turn loop. The integration is real, but it is still partial compared with Galactica v3.

## Current status

AI is integrated into the local single-player runtime:

- `Game` creates an `AIManager`.
- Computer-controlled players are initialized from `GameConfig`.
- `endTurn()` processes AI decisions before ship/fleet movement, star updates, visibility updates, and piece-count checks.
- AI stars can choose and start ship construction.
- AI ships can choose one destination and move toward owned, enemy, or unowned targets.
- Human controls reject AI-owned and unowned entities.

AI is not yet full v3 parity:

- Star economy allocation is calculated but not applied to the star sliders.
- Defensive actions are still scaffold/log-only.
- AI fleet-formation decisions are scaffold/log-only.
- The five v3 skill labels map into three effective AI behavior levels.
- Computer advantage is stored but not applied.
- Combat odds and richer strategic evaluation remain future work.

## Main files

- `src/js/ai-manager.js` - owns AI players and processes their turns.
- `src/js/ai-base.js` - common AI decision/action model.
- `src/js/ai-skill.js` - three effective behavior levels: Average, Good, Expert.
- `src/js/ai-utils.js` - entity queries, distance, ownership, and strength helpers.
- `src/js/ai-ship.js` - ship target selection and destination execution.
- `src/js/ai-star.js` - star ship-building choices, threat checks, and economy-priority calculation.
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
4. Ships and fleets move.
5. Stars update production, growth, research, and construction.
6. Visibility and piece counts update.
7. The turn counter advances.

## Skill mapping

The setup model preserves the five v3 difficulty labels:

- 1 = Expert
- 2 = Good
- 3 = Average
- 4 = Passable
- 5 = Novice

The current AI behavior layer has three effective levels:

- v3 Expert -> AI Expert
- v3 Good -> AI Good
- v3 Average/Passable/Novice -> AI Average

This is why the UI can show five labels while the underlying decision modifiers are coarser.

## What AI decisions currently do

Star decisions:

- assess nearby threats;
- calculate growth/research/shipbuilding priorities;
- choose a ship type to build;
- call `star.startBuildingShip()` when a build decision is selected.

Ship decisions:

- evaluate possible targets using decision-matrix style scoring;
- set a single destination on the ship for movement/attack/colonization;
- avoid moving immobile or ineligible ships.

Ownership controls:

- humans cannot select or command AI-owned entities;
- humans cannot command unowned entities;
- feedback is currently mostly console/event-list level, not final UI polish.

## Known gaps

- Apply AI economic allocations to actual star allocation state.
- Turn defensive decisions into concrete satellite/patrol/reinforcement actions.
- Implement AI fleet formation once the player-facing fleet/rendezvous UI is richer.
- Apply `compAdvantage`.
- Add v3-accurate behavior for Passable and Novice instead of mapping them to Average.
- Improve combat-aware target selection and retreat/avoidance.
- Add long-game AI regression tests and AI-vs-AI scenario tests.

## Testing

Run the full suite with the PDG runtime:

```bash
./gad4 tests/run-tests.js
```

Current expected result: 280 passed, 0 failed.

Do not use plain Node for the full suite; the project relies on PDG globals such as `pdg.res`, `pdg.srand()`, and `pdg.rand()`.
