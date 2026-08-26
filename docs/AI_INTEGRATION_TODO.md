# AI Integration Summary

Last reviewed: 2026-08-25

## Status

AI integration is active in the local runtime. Computer players are initialized, receive turns, apply v3-derived economy/build rules, send ships/fleets toward destinations with v3-style decision scoring, form/order docked fleets, use technology transfer, apply computer advantage, and show action/target intent overlays in AI-only autoplay by default. The displayed skill ladder has been intentionally shifted one rung easier, and Expert now has v4-only campaign-objective, frontier/standoff scouting, defensive redeployment, strategic targeting, and build-selection extensions represented where practical as decision-matrix overlay rows. Remaining work around AI is mostly adjacent setup, waypoint/course, richer reporting UI, and future tuning.

## What is working

- `Game` owns an `AIManager`.
- Computer players are initialized from the game configuration.
- AI turns run during `Game.endTurn()`.
- AI star logic can apply v3-derived desired allocations, choose a ship type with the v3 weighted hull rule, apply Expert-only strategic hull overrides, call `startBuildingShip()`, and activate v3-derived patrol behavior.
- AI ship logic can set one destination on eligible ships.
- AI ship/fleet logic skips under-construction ships, stationary defense satellites, and docked fleets with fewer than three ships.
- Expert AI ships/fleets retain valid short-lived campaign objectives instead of reselecting a fresh target every turn.
- Expert scouts prefer neutral frontier systems and can approach enemy-owned stars by choosing generated standoff scan points inside scanner range.
- Expert battleships can redeploy from safe rear systems toward threatened owned border systems.
- Expert movement scoring includes matrix rows for frontier/scout context, colony support, duplicate target assignments, local attack readiness, recent attacker identity, recently attacked owned systems, and retaliation/pressure against recent opponents.
- An opt-in genetic trainer can give each AI player a unique matrix genome, run deterministic AI-only matches, keep the top two players, and replace the other three with blended forced-mutation children.
- Average-or-better AI toggles eligible healthy docked non-scout ships/fleets onto patrol and takes damaged patrollers off patrol for repair.
- AI fleet formation can create/join docked fleets, and fleet AI can set one destination on eligible fleets.
- AI-controlled scouts, battleships, and fleets use the shared v3 technology-transfer rules.
- AI production receives the configured computer-advantage modifier.
- AI-only autoplay shows localized action/target intent overlays by default; use `--hide-ai-intent` or `--no-ai-intent` to hide them.
- Human control is restricted to the current human player's owned entities.
- AI/player/config behavior is covered by `tests/ai-systems.test.js` and `tests/ai-genetic-trainer.test.js`.

## What is scaffolded or incomplete

Confirmed remaining v3 work adjacent to AI:

- AI orders still use v4's single-destination movement rather than the full v3 waypoint/course model.
- Fleet formation and rendezvous assembly have a simple UI; the wider v3 fleet UI around sortable roster polish, richer exchange workflows, and course tools is still incomplete.
- Computer advantage applies to production, but the full v3 setup range is not exposed in the startup UI.
- Older Average/Good/Expert helper buckets remain as scaffolding/stat display, but ship movement and build selection use the preserved five-value skill/rule paths plus the new Expert-only extensions.

Possible v4 enhancements, not counted as v3 parity gaps:

- Richer AI intent/debug overlays with per-decision reasons, scores, and stalled-front diagnostics.
- Richer defensive threat tuning or reinforcement coordination beyond the current Expert redeployment behavior.
- Strategic computer-advantage effects beyond v3's production-style modifiers.
- Rendezvous staging, combat-odds estimation, retreat/avoidance, and additional late-game attack-pressure tuning.

## Architecture

| File | Role |
|---|---|
| `src/js/ai-manager.js` | Coordinates AI players and turn processing. |
| `src/js/ai-base.js` | Shared decision/action types. |
| `src/js/ai-skill.js` | Average/Good/Expert behavior modifiers. |
| `src/js/ai-decision-matrices.js` | v3 ship decision tables, Expert overlays, genetic/context factor rows, and matrix combination helpers. |
| `src/js/ai-utils.js` | Entity/fleet lookup, ownership, speed, strength, docked-state, and distance helpers. |
| `src/js/ai-star.js` | Star economy role assignment, v3 weighted ship-build selection, dormant threat helpers, and strategic hull overrides. |
| `src/js/ai-ship.js` | Ship/fleet target scoring, v3 skill handling, v3 pass merging/tie-break behavior, matrix-backed Expert context scoring, fleet formation, and destination assignment. |
| `src/js/ai-genetic-trainer.js` | Opt-in genetic matrix evolution and deterministic self-play match harness. |
| `tools/ai-genetic-trainer.js` | Pinned-PDG command-line entry point for genetic self-play. |
| `src/js/game.js` | Runtime integration, ownership controls, fleet processing, short-lived AI combat memory, and advantage production modifier. |

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

Current expected result: 367 passed, 0 failed.

The AI tests verify the current integrated behavior. The experimental matrix trainer can be smoke-tested with:

```bash
./gad4 tools/ai-genetic-trainer.js --generations=1 --max-turns=1 --quiet
```

The broader parity source of truth is `docs/V3_V4_FEATURE_STATUS.md`.

## Recommended next AI work

1. Integrate AI orders with the full v3 waypoint/course model once navigation parity exists.
2. Polish fleet roster/exchange UI and implement fleet course tools.
3. Expose the full v3 computer-advantage range in setup UI.
4. Use the genetic trainer and 250-turn AI-only observer to tune v4 Expert overlays toward consistent wins under 100 turns.
5. Add Expert rendezvous staging, combat-odds estimation, retreat/avoidance, and production specialization as v4 enhancements once the matrix harness produces useful baselines.
6. Add richer combat/fleet result presentation once balance settles.
