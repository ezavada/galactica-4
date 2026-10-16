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
- Would require extending the AI decision matrices to include combat evaluation factors
- Could add combat odds display for human players as well
- Should maintain the original game's balance where combat is automatic on arrival

## Computer Player Enhancements Beyond v3

These are intentionally listed as possible Galactica-4 improvements, not missing v3 parity. The audited v3 C++ computer-player paths are mostly mechanical weighted movement, expert tech-star allocation, satellite production, patrol toggles, and production advantage.

### AI Intent and Diagnostics
**Priority: Low**

- Optional player/debug overlay explaining why an AI chose a destination, fleet action, or build.
- Autoplay summaries that highlight stalled players, repeated no-op decisions, or unchanged front lines.

### Richer Defensive Coordination
**Priority: Medium**

- Reinforcement planning that sends mobile defenders toward threatened systems.
- Threat scoring that considers enemy trajectories, nearby friendly fleets, and expected arrival timing.
- Defensive fleet rally behavior beyond v3's satellite/patrol mechanics.

### Strategic Advantage Modifiers
**Priority: Low**

- Optional uses of computer advantage outside production, such as AI risk tolerance or target search breadth.
- These should be balance options rather than v3 parity requirements unless new v3 evidence is found.

## Remembered Fog-of-War Snapshots Beyond v3

**Priority: Low**

An optional map mode could retain an object's last observed position, ownership and knowledge, show a distinct stale marker and label the last observed turn. It must retain an actual observation snapshot rather than reveal the live hidden object. The v3 source stores last-seen/scanner history but its star/ship drawing uses current visibility; a separate remembered-object rendering mode was not confirmed. This is a future enhancement, rather than missing shipped v3 UI. Private event reports already navigate to remembered event coordinates after a subject is lost.
