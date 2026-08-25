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

Confirmed v3 parity gaps:

- Ship/fleet movement scoring still needs every `CShipCompMove.cpp`/`UShipUtils.cpp` factor and edge case verified against the v3 source.
- The v3 guard that docked AI fleets with fewer than three ships do not move is not yet implemented.
- Good/Expert patrol toggling should run in the normal ship/fleet AI path, including taking damaged patrollers off patrol for repair.
- AI orders still use v4's single-destination movement rather than the full v3 waypoint/course model.
- Fleet formation does not yet include the wider v3 fleet UI around rendezvous, exchange, and course tools.
- Computer advantage applies to production, but the full v3 setup range is not exposed in the startup UI.
- Older Average/Good/Expert helper buckets remain and should be removed or bypassed wherever v3's five skill values control behavior directly.

Possible v4 enhancements, not counted as v3 parity gaps:

- Player-visible AI intent/debug overlays.
- Richer defensive threat tuning or reinforcement coordination beyond v3's satellite/patrol behavior.
- Strategic computer-advantage effects beyond v3's production-style modifiers.
- Combat-odds estimation, retreat/avoidance, and additional late-game attack-pressure tuning.

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

1. Verify the remaining ship/fleet scoring factors against `CShipCompMove.cpp` and `UShipUtils.cpp`.
2. Add the docked-fleet-size guard and normal-path Good/Expert patrol toggle.
3. Implement rendezvous points, fleet exchange UI, and fleet course tools.
4. Expose and validate the full v3 computer-advantage range.
5. Remove or bypass legacy three-bucket helper behavior where it conflicts with v3's five skill values.
6. Use the 250-turn AI-only observer to tune v3-equivalent outcomes; treat combat odds/retreat logic as a future enhancement unless the v3 source/manual confirms it.
7. Add richer combat/fleet result presentation once balance settles.
