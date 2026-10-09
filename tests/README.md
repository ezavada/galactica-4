# Galactica-4 Test Suite

Run the full suite from the project root with the PDG runtime:

```bash
./gad4 tests/run-tests.js
```

Current expected result: 382 passed, 0 failed.

The launcher downloads the checksum-pinned public PDG release on first use;
no sibling `pdg` or `pdg-devel` checkout is required.

## Runner

- `run-tests.js` - main PDG runtime test runner.
- `test-framework.js` - lightweight assertion/test grouping helpers.

## Suites

- String resources
- Map generation
- Coordinate conversion and movement
- Player/config models
- AI systems
- Zoom and camera behavior
- Entity fog of war
- Visibility calculator
- Spatial partitioning and performance
- Fleet mechanics
- Combat
- V3 game rule parity
- Command UI
- Fleet formation
- Rendezvous and fleet UI
- Ship naming and events
- AI skill autoplay
- PDG v1.2 camera, retained panel text, and selection scripts

## Notes

The tests use PDG APIs directly, including seeded random numbers:

```javascript
pdg.srand(42);
pdg.rand();
```

Use `docs/TESTING_GUIDE.md` for details on adding or debugging tests.
