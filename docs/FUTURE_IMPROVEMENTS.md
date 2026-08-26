# Future Improvements for Galactica-4

This document outlines potential enhancements and improvements that could be made to Galactica-4 beyond the current implementation.

## Combat System Enhancements

### Combat Odds Estimation
**Priority: Medium**

Currently, the AI system can start ship construction and send ships toward destinations, but it does not deeply evaluate combat odds before attacking. This could be enhanced to provide:

- **Pre-combat Analysis**: AI could evaluate attack/defense ratios before moving ships
- **Risk Assessment**: Calculate probability of success based on ship types and tech levels
- **Strategic Retreat**: AI could avoid attacking when odds are unfavorable
- **Fleet Coordination**: AI could wait to form larger fleets before attacking strong targets

**Implementation Notes:**

- The AI decision matrix now has opt-in contextual rows and a genetic trainer harness, so future combat-odds work can add more rows without changing the normal v3 base table.
- Could add combat odds display for human players as well.
- Should maintain the original game's balance where combat is automatic on arrival.

## Computer Player Enhancements Beyond v3

These are intentionally listed as possible Galactica-4 improvements, not missing v3 parity. The audited v3 C++ computer-player paths are mostly mechanical weighted movement, expert tech-star allocation, satellite production, patrol toggles, and production advantage.

### AI Intent and Diagnostics
**Priority: Low**

- Richer player/debug overlay explaining why an AI chose a destination, fleet action, or build, beyond the current action/target intent overlay.
- Autoplay summaries that highlight stalled players, repeated no-op decisions, or unchanged front lines.

### Genetic Matrix Tuning
**Priority: Medium**

- Use `./gad4 tools/ai-genetic-trainer.js` to evolve per-player AI decision-matrix overlays on the smallest fixed-seed self-play map.
- Keep useful trained genomes reproducible with seed/config metadata, then decide whether to promote them into default Expert overlays.
- Add import/export once a trained genome is worth preserving across sessions.

### Richer Defensive Coordination
**Priority: Medium**

- Reinforcement planning that sends mobile defenders toward threatened systems.
- Threat scoring that considers enemy trajectories, nearby friendly fleets, expected arrival timing, and the new short-lived recent-combat memory.
- Defensive fleet rally behavior beyond v3's satellite/patrol mechanics.

### Strategic Advantage Modifiers
**Priority: Low**

- Optional uses of computer advantage outside production, such as AI risk tolerance or target search breadth.
- These should be balance options rather than v3 parity requirements unless new v3 evidence is found.
