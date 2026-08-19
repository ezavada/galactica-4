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
