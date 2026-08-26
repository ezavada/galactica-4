# AI Integration Guide for Galactica-4

Last reviewed: 2026-08-25

This guide describes the AI system as it exists in the current runtime. The old “Phase 4 not yet implemented” wording is no longer accurate: AI players are now created and processed during the turn loop. The v3-derived runtime computer-player rules are active, with the displayed skill ladder intentionally shifted one rung easier and Expert-only behavior represented where practical as data-driven decision-matrix overlays. Remaining work is mostly setup UI, waypoint/course UI, richer reporting, and future enhancements.

## Current status

AI is integrated into the local single-player runtime:

- `Game` creates an `AIManager`.
- Computer-controlled players are initialized from `GameConfig`.
- `endTurn()` processes AI decisions before ship/fleet movement, star updates, visibility updates, and piece-count checks.
- AI stars can apply v3-style economic allocations, choose/start ship construction with v3 weighted hull selection, and activate patrol behavior where v3 does.
- AI ships can choose one destination and move toward owned, enemy, or unowned targets, while skipping under-construction ships and stationary defense satellites.
- AI can form docked fleets and process fleets as ship-like strategic actors, including the v3 guard that docked fleets with fewer than three ships do not move.
- Average-or-better AI toggles eligible healthy docked non-scout ships/fleets onto patrol and takes damaged patrollers off patrol for repair.
- Expert AI ships retain short-lived campaign objectives while their target remains valid, reducing turn-to-turn retargeting churn.
- Expert scouts prefer neutral frontier stars and can approach enemy-owned stars using generated standoff scan points that stay inside scanner range while biasing away from defender threat.
- Expert idle battleships can redeploy from safe rear systems to threatened owned border systems.
- Expert-only movement preferences are now expressed through additional decision-matrix rows where possible; procedural code still discovers richer target candidates and remembers campaign objectives.
- The game records short-lived AI combat memory for recent attacker/defender context, and ship scoring can use matrix rows for retaliation, recently attacked owned systems, and recent mobile/star attacks.
- AI units use the shared technology-transfer rules when scouts, battleships, and fleets arrive at or depart from allied systems.
- Computer advantage now affects AI research and shipbuilding output.
- AI-only autoplay records player-visible action/target intent overlays each AI turn; these are shown by default in self-play and can be hidden with `--hide-ai-intent` or `--no-ai-intent`.
- An opt-in genetic trainer can run AI-only matches with a unique per-player decision-matrix genome, keep the top two players, and replace the remaining three with blended forced-mutation children.
- Human controls reject AI-owned and unowned entities.

Remaining v3 parity gaps are outside the Section 7 runtime AI rules:

- Fleet formation works for docked ships and rendezvous assembly now has a simple UI. The wider v3 fleet/player UI around sortable roster polish, richer exchange workflows, and course tools is still incomplete.
- AI orders use v4's single-destination movement until the full v3 waypoint/course model is ported for all players.
- Computer advantage is applied to production, but the full v3 setup range is not exposed in the startup UI.
- Older three-bucket helper paths remain as scaffolding/stat display, but they should not be used for new C++-backed behavior where v3's five-value skill actually controls outcomes.

Items such as richer AI intent reason/score diagnostics, defensive coordination beyond the current Expert redeployment pass, non-production computer-advantage effects, combat-odds estimation, and retreat/avoidance are possible v4 enhancements. They were not found as shipped v3 computer-player requirements in the audited C++ paths.

## Main files

- `src/js/ai-manager.js` - owns AI players and processes their turns.
- `src/js/ai-base.js` - common AI decision/action model.
- `src/js/ai-skill.js` - legacy Average/Good/Expert helper buckets; C++ parity work should prefer the preserved five-value `PlayerInfo.compSkill` where v3 behavior depends on it.
- `src/js/ai-utils.js` - entity/fleet queries, distance, ownership, speed, strength, and docked-state helpers.
- `src/js/ai-decision-matrices.js` - v3 ship decision tables, Expert overlay rows, genetic/context factor definitions, and matrix combination helpers.
- `src/js/ai-ship.js` - ship/fleet target selection, v3 skill handling, matrix-backed Expert objective/scouting/redeployment scoring, recent-combat context scoring, fleet formation, and destination execution.
- `src/js/ai-star.js` - star economy role assignment, v3 weighted ship-building choices, dormant threat helpers, and defensive activation scaffolding.
- `src/js/ai-genetic-trainer.js` - opt-in genetic matrix evolution utilities and deterministic AI-only match harness.
- `tools/ai-genetic-trainer.js` - pinned-PDG command-line entry point for the genetic trainer.
- `src/js/game.js` - runtime integration, ownership checks, AI initialization, turn sequencing, AI intent overlay storage, and short-lived AI combat memory.
- `src/js/display.js` - map rendering, including the autoplay AI intent overlay.
- `src/js/autoplay.js` - deterministic AI-only observer configuration and controller.
- `tests/ai-systems.test.js` - unit/integration coverage for the AI pieces.
- `tests/ai-genetic-trainer.test.js` - matrix, evolution, per-player override, and combat-memory context coverage.

## Runtime flow

On game creation:

1. `GameConfig` determines total players, human count, computer count, skill, and advantage fields.
2. `Game` creates `PlayerInfo` records.
3. Computer players receive skill/advantage metadata.
4. `AIManager.initializeAIPlayer()` creates an `AIPlayer` for each computer player.

On end turn:

1. `AIManager.processAITurns()` runs once.
2. The previous AI intent overlay records are cleared for the new AI decision pass when the overlay is enabled.
3. Each AI player processes its owned stars.
4. Each AI player processes its owned ships.
5. Each AI player processes its owned fleets.
6. Non-idle AI decisions are recorded for the player-visible intent overlay before execution.
7. Ships and fleets move.
8. Stars update repairs, production, growth, research, and construction.
9. Visibility and piece counts update.
10. The turn counter advances.

## Skill mapping

The setup model preserves the five v3 difficulty labels:

- 1 = Expert
- 2 = Good
- 3 = Average
- 4 = Passable
- 5 = Novice

The legacy high-level AI helper bucket still has three effective levels:

- v3 Expert -> AI Expert
- v3 Good -> AI Expert
- v3 Average -> AI Good
- v3 Passable/Novice -> AI Average

Ship AI reads the preserved v3 `PlayerInfo.compSkill` value directly for search distance, target-pass count, skilled scout behavior, per-destination pass merging, lower-skill randomness, fleet formation, and patrol toggling. Existing v3-derived capabilities are intentionally shifted one displayed level downward: Good receives the old Expert rung, Average receives old Good, Passable receives old Average, and Novice receives old Passable. Expert keeps the strongest old rung and adds v4-only campaign-objective, scouting, redeployment, strategic targeting, and build-selection improvements. Most Expert movement preferences are represented as decision-matrix overlay rows, while target discovery and objective memory remain procedural scaffolding. The older three-bucket helper remains for coarse initialization/stat display and dormant scaffold methods.

## Current AI capability matrix

The rows below describe the live runtime path. In particular, they use the five-value v3 `compSkill` field, not the older three-bucket helper scaffolding. Search distance is the star/planet search radius; enemy-ship search uses one quarter of that radius.

| Capability / behavior | Expert `1` | Good `2` | Average `3` | Passable `4` | Novice `5` |
|---|---:|---:|---:|---:|---:|
| Main search distance | 999,999 | 888,888 | 777,777 | 666,666 | 555,555 |
| Enemy-ship search distance | 249,999 | 222,222 | 194,444 | 166,666 | 138,888 |
| Target-evaluation passes | 4 | 3 | 2 | 1 | 1 |
| Baseline nearest-star/ship matrix scoring | ✅ | ✅ | ✅ | ✅ | ✅ |
| Extra pass for weakest nearby enemy star | ✅ | ✅ | ✅ | ❌ | ❌ |
| Extra pass for enemy tech-production star | ✅ | ✅ | ❌ | ❌ | ❌ |
| Expert strategic pass for vulnerable/high-value enemy stars | ✅ | ❌ | ❌ | ❌ | ❌ |
| Expert campaign-objective retention | ✅ | ❌ | ❌ | ❌ | ❌ |
| Expert matrix overlay rows for frontier/retaliation/defense context | ✅ | ❌ | ❌ | ❌ | ❌ |
| Preserve best score per destination class across passes | ✅ | ✅ | ✅ | N/A | N/A |
| Skilled scout/courier tech-transfer/scouting shortcut | ✅ | ✅ | ✅ | ❌ | ❌ |
| Expert frontier/standoff scout targeting | ✅ | ❌ | ❌ | ❌ | ❌ |
| Score randomness | None | None | None | None | Medium |
| Fleet formation scoring | ✅ | ✅ | ✅ | ✅ | ✅ |
| Docked fleet movement requires at least three ships | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fleet actor uses strongest member role for scoring | ✅ | ✅ | ✅ | ✅ | ✅ |
| Strong fleet avoids chasing much weaker enemy ships | ✅ | ✅ | ✅ | ❌ | ❌ |
| Colony avoids defended neutral star target | ✅ | ✅ | ✅ | ✅ | ❌ |
| Healthy docked non-scout ship/fleet toggles onto patrol | ✅ | ✅ | ✅ | ❌ | ❌ |
| Damaged patroller leaves patrol for repair | ✅ | ✅ | ✅ | ❌ | ❌ |
| Expert defensive redeployment from safe rear systems | ✅ | ❌ | ❌ | ❌ | ❌ |
| Defense satellites always patrol | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tech-star economy role | ✅ | ✅ | ❌ | ❌ | ❌ |
| Non-tech-star/default economy split | Role-dependent | Role-dependent | 34/33/33 | 34/33/33 | 34/33/33 |
| v3 weighted hull build rule | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tech-star defense/scout build alternation | ✅ | ✅ | ❌ | ❌ | ❌ |
| Expert strategic hull override for urgent defenders/colonies/scouts | ✅ | ❌ | ❌ | ❌ | ❌ |
| Late-game scout/colony builds can skew to battleship | ✅ | ✅ | ✅ | ✅ | ✅ |
| AI-only autoplay action/target intent overlay | ✅ | ✅ | ✅ | ✅ | ✅ |
| Shared technology transfer on movement/arrival | ✅ | ✅ | ✅ | ✅ | ✅ |
| Computer production advantage modifier | Configured separately | Configured separately | Configured separately | Configured separately | Configured separately |
| AI-created/managed rendezvous points | ❌ | ❌ | ❌ | ❌ | ❌ |
| Full waypoint/course planning | ❌ | ❌ | ❌ | ❌ | ❌ |

### Shared capabilities not currently split by skill

All AI levels currently participate in the same turn pipeline: owned stars manage allocations and construction, eligible ships choose one destination, fleets are processed as strategic actors after ship decisions, movement/combat/tech-transfer rules are shared with human-owned units, and defeats/victory are evaluated after turn resolution.

### Skill-adjacent limitations

- The startup UI still exposes one shared computer skill rather than per-player skill editing, though `aiSkillByPlayer` and the AI-only autoplay harness already support all five levels.
- Computer advantage is orthogonal to skill: it is a separate `-3` through `+3` production modifier, not an Expert/Good/Average behavior difference.
- Rendezvous points are implemented for player control and fleet assembly, but computer players do not yet place or deliberately target them.
- Waypoints, course memory, looping courses, call-in/attention behavior, and rendezvous-based strategic staging are unavailable to every AI level until the shared navigation model is ported.

## What AI decisions currently do

Star decisions:

- apply desired growth/research/shipbuilding allocations;
- use the shifted v3-derived tech-star/shipbuilder roles for Good and Expert, and default non-tech allocations for lower skills;
- let Expert override the random hull roll for urgent local defense, needed colonies, and needed scouts;
- choose a ship type to build using v3's weighted hull rule, with Good/Expert tech stars alternating satellites/scouts;
- call `star.startBuildingShip()` when a build decision is selected;
- keep threat/need helpers dormant as possible future behavior rather than using them to override v3 build selection.

Ship decisions:

- evaluate possible targets using the v3 decision matrices, v3 skill search/repetition values, v3 per-destination pass merging, and v3 tie-break rules;
- set a single destination on the ship for movement/attack/colonization;
- form/join docked fleets when the scoring result selects fleet formation;
- avoid moving immobile or ineligible ships;
- apply shifted Average-or-better patrol toggles when an eligible docked non-scout ship or fleet remains without a movement order;
- let Expert ships retain valid short-lived campaign objectives;
- let Expert scouts choose neutral frontier systems or generated enemy-star standoff scan points;
- let Expert battleships redeploy from safe rear systems to threatened owned systems;
- apply optional per-player matrix overrides when a test/trainer installs them;
- use short-lived recent-combat context rows for attack/retaliation scoring.

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

- Richer AI intent/debug overlays with per-decision reasons, scores, and stalled-front diagnostics.
- Richer defensive threat tuning or reinforcement coordination beyond the current Expert redeployment behavior.
- Strategic computer-advantage effects beyond v3's production-style modifiers.
- Combat-odds estimation, retreat/avoidance, and additional late-game attack-pressure tuning.
- Add long-game AI regression tests and AI-vs-AI scenario tests.
- Persist/import/export trained matrix genomes once a useful genome emerges.

## Expert additions

These are intentionally v4 behavior improvements, not v3 parity requirements:

Implemented:

1. **Objective memory:** Expert ships/fleets keep short-lived campaign objectives until their target expires, is captured/destroyed, or is reached.
2. **Frontier scouting:** Expert scouts bias toward neutral frontier systems and can inspect enemy-owned stars from generated standoff scan points.
3. **Defensive redeployment:** Expert battleships can move from safe rear systems toward threatened owned border systems.
4. **Matrix-backed context:** Expert movement weights now include data rows for frontier scouting, colony support, assigned targets, attack readiness, recent attacker identity, recently attacked owned systems, and retaliation/pressure against recent opponents.
5. **Genetic tuning harness:** `tools/ai-genetic-trainer.js` can evolve unique per-player matrix overlays through deterministic AI-only matches.

Still proposed:

1. **Rendezvous staging for attacks:** Expert players could create private rendezvous points near a front, send multiple ships there, then launch a fleet once a minimum strength/colony escort threshold is met.
2. **Attack readiness scoring:** before committing to an enemy star, Expert could estimate expected ship losses, required colony presence, travel time, and target value instead of relying only on matrix factors.
3. **Production specialization:** Expert could classify owned systems as shipyards, tech worlds, or growth worlds based on location and safety, then adjust builds/economy accordingly.

## Testing

Run the full suite with the PDG runtime:

```bash
./gad4 tests/run-tests.js
```

Current expected result: 367 passed, 0 failed.

The deterministic AI-only parity observer can be launched with `./gad4 -- --ai-autoplay`. It creates five computer players on the smallest map with v3 skill levels Expert, Good, Average, Passable, and Novice represented by players 1-5, uses a fixed default seed of `424242`, and advances turns until the win condition or the 250-turn max-turn guard. Event presentation windows are hidden by default for unattended runs; add `--show-event-windows` to display lab/stardock overlays, which are held briefly before the next autoplay turn. AI intent overlays are shown by default in this observer; add `--hide-ai-intent` or `--no-ai-intent` for a clean map.

The experimental matrix trainer can be launched with:

```bash
./gad4 tools/ai-genetic-trainer.js --generations=20 --max-turns=250 --target-turns=100
```

It gives each of five AI players a unique matrix genome, scores a fixed-seed smallest-map match, keeps the top two genomes, and replaces the other three with blended children that each receive at least one mutation. This is a v4 tuning tool, not a v3 parity requirement.

Use only the pinned PDG runtime (`./gad4`) for the full suite; the project relies on PDG globals such as `pdg.res`, `pdg.srand()`, and `pdg.rand()`.
