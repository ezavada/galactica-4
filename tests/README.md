# Galactica-4 Test Suite

Run the full suite from the project root with the PDG runtime:

```bash
./gad4 tests/run-tests.js
```

Current expected result: 284 passed, 0 failed.

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
- Command UI
- Fleet formation
- Ship naming and events

## Notes

The tests use PDG APIs directly, including seeded random numbers:

```javascript
pdg.srand(42);
pdg.rand();
```

Use `docs/TESTING_GUIDE.md` for details on adding or debugging tests.
