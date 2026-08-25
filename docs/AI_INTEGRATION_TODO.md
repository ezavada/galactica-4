# AI Integration Summary

Last reviewed: 2026-08-25

## Status

AI integration is partially complete and active in the local runtime. Computer players are initialized, receive turns, can apply basic economy/defense choices, can start ship construction, can send ships toward destinations, and can form/order docked fleets. This is enough for basic computer participation, but it is not yet complete single-player parity with Galactica v3.

## What is working

- `Game` owns an `AIManager`.
- Computer players are initialized from the game configuration.
- AI turns run during `Game.endTurn()`.
- AI star logic can apply v3-style desired allocations, choose a ship type, call `startBuildingShip()`, and activate basic defensive builds/patrols.
- AI ship logic can set one destination on eligible ships.
- AI fleet formation can create/join docked fleets, and fleet AI can set one destination on eligible fleets.
- AI production receives the configured computer-advantage modifier.
- Human control is restricted to the current human player's owned entities.
- AI/player/config behavior is covered by `tests/ai-systems.test.js`.

## What is scaffolded or incomplete

- Economy roles and allocations need more long-game tuning against v3/autoplay outcomes.
- Defensive actions do not yet implement v3 reinforcement/call-in behavior.
- Fleet formation does not yet include rendezvous points, named fleets, exchange UI, or course tools.
- v3 Passable and Novice have ship-decision differences, but some remaining AI behavior still collapses to the Average behavior tier.
- Computer advantage applies to production, but the full v3 setup range and any non-production effects remain incomplete.
- AI does not yet evaluate combat odds, retreats, and attack pressure deeply enough for v3-like planning.

## Architecture

| File | Role |
|---|---|
| `src/js/ai-manager.js` | Coordinates AI players and turn processing. |
| `src/js/ai-base.js` | Shared decision/action types. |
| `src/js/ai-skill.js` | Average/Good/Expert behavior modifiers. |
| `src/js/ai-utils.js` | Entity/fleet lookup, ownership, speed, strength, docked-state, and distance helpers. |
| `src/js/ai-star.js` | Star economy role assignment, threat checks, ship-build selection, and defensive activation. |
| `src/js/ai-ship.js` | Ship/fleet target scoring, v3 skill handling, fleet formation, and destination assignment. |
| `src/js/game.js` | Runtime integration, ownership controls, fleet processing, and advantage production modifier. |

## Turn order

When the local human player ends the turn:

1. AI players process star decisions.
2. AI players process ship decisions.
3. AI players process fleet decisions.
4. Ships move.
5. Fleets move.
6. Stars update repairs/growth/research/production.
7. Visibility updates.
8. Piece counts and defeats are checked.
9. The turn increments.

## Tests

Run all tests with:

```bash
./gad4 tests/run-tests.js
```

Current expected result: 312 passed, 0 failed.

The AI tests verify the current integrated behavior, but passing tests should not be read as v3 feature parity. The parity source of truth is `docs/V3_V4_FEATURE_STATUS.md`.

## Recommended next AI work

1. Tune long-game attack pressure and combat odds with the 250-turn AI-only observer.
2. Expand defensive decisions into v3-like reinforcement/call-in behavior.
3. Implement rendezvous points, named fleets, fleet exchange UI, and fleet course tools.
4. Expose and validate the full v3 computer-advantage range.
5. Split remaining Passable and Novice behavior outside ship search/randomness/fleet avoidance.
6. Add richer combat/fleet result presentation once balance settles.
