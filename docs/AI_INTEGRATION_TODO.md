# AI Integration Summary

Last reviewed: 2026-08-19

## Status

AI integration is partially complete and active in the local runtime. Computer players are initialized, receive turns, can start ship construction, and can send ships toward destinations. This is enough for basic computer participation, but it is not yet complete single-player parity with Galactica v3.

## What is working

- `Game` owns an `AIManager`.
- Computer players are initialized from the game configuration.
- AI turns run during `Game.endTurn()`.
- AI star logic can choose a ship type and call `startBuildingShip()`.
- AI ship logic can set one destination on eligible ships.
- Human control is restricted to the current human player's owned entities.
- AI/player/config behavior is covered by `tests/ai-systems.test.js`.

## What is scaffolded or incomplete

- Economy priorities are calculated but not applied to star allocation sliders.
- Defensive actions are decided but do not yet create concrete defenses.
- Fleet-formation decisions are not implemented beyond a placeholder hook.
- v3 Passable and Novice difficulties currently collapse to the Average behavior tier.
- Computer advantage is stored but not applied.
- AI does not yet evaluate combat odds deeply enough for v3-like attack planning.

## Architecture

| File | Role |
|---|---|
| `src/js/ai-manager.js` | Coordinates AI players and turn processing. |
| `src/js/ai-base.js` | Shared decision/action types. |
| `src/js/ai-skill.js` | Average/Good/Expert behavior modifiers. |
| `src/js/ai-utils.js` | Entity lookup, ownership, strength, and distance helpers. |
| `src/js/ai-star.js` | Star threat checks, ship-build selection, and economy-priority calculation. |
| `src/js/ai-ship.js` | Ship target scoring and destination assignment. |
| `src/js/game.js` | Runtime integration and ownership controls. |

## Turn order

When the local human player ends the turn:

1. AI players process star decisions.
2. AI players process ship decisions.
3. Ships move.
4. Fleets move.
5. Stars update growth/research/production.
6. Visibility updates.
7. Piece counts and defeats are checked.
8. The turn increments.

## Tests

Run all tests with:

```bash
./gad4 tests/run-tests.js
```

Current expected result: 284 passed, 0 failed.

The AI tests verify the current integrated behavior, but passing tests should not be read as v3 feature parity. The parity source of truth is `docs/V3_V4_FEATURE_STATUS.md`.

## Recommended next AI work

1. Apply AI economic allocation to stars.
2. Convert defensive decisions into concrete builds/orders.
3. Implement fleet formation/rendezvous behavior.
4. Apply computer advantage.
5. Split Passable and Novice into distinct behavior tiers.
6. Add combat-aware attack planning once combat presentation and balance settle.
