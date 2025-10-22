# Galactica-4 Test Suite

Comprehensive unit tests for map generation, movement, and player systems.

## Quick Start

```bash
# Run tests with PDG runtime (recommended)
./gad4 tests/run-all-tests.js

# Or with pdg executable
pdg tests/run-all-tests.js
```

## Test Files

- `test-framework.js` - Assertion library and test organization
- `map-generation.test.js` - Map generation system tests
- `coordinate-movement.test.js` - Coordinate system and ship movement tests
- `player-config.test.js` - Player info and game configuration tests
- `run-all-tests.js` - PDG runtime test runner (use this!)
- `run-tests.js` - Node.js runner (requires PDG node module)

## Deterministic Testing

Uses PDG's built-in random number generator:

```javascript
pdg.srand(42);  // Set seed for reproducible results
```

All tests use seed `42` to ensure identical results on every run.

## Test Coverage

- ✅ Map generation algorithms
- ✅ Star placement and naming
- ✅ Computer player naming  
- ✅ Coordinate conversions
- ✅ Ship movement mechanics
- ✅ Speed calculations
- ✅ Player tracking
- ✅ Configuration validation

**Total: 40+ tests**

## Expected Output

```
✅ All tests passed!
```

If tests fail, check the TESTING_GUIDE.md for debugging help.

