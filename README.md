# galactica-4

A space exploration and empire game built in JavaScript using the PDG game engine.

The port is actively moving toward Galactica v3 parity, but it is not feature-complete yet. See [V3 to V4 Feature Status](docs/V3_V4_FEATURE_STATUS.md) for the current parity inventory.

Use the PDG JavaScript APIs documented at `../pdg/docs/javascript/pdg-js.h`. Other examples of JavaScript code written with PDG APIs can be found in `../pdg/test/perf/` and `../pdg/test/ui/`.

The original C++ Galactica v3 source is in `../galactica-anno-dominari-3/Classes`.

## Running the Game

```bash
# Run with default settings (English)
./gad4

# Run in a different language
./gad4 -- --lang=es   # Spanish
./gad4 -- --lang=fr   # French
./gad4 -- --lang=de   # German
./gad4 -- --lang=ja   # Japanese
./gad4 -- --lang=ru   # Russian
```

The extra `--` separates app arguments from `gad4` launcher options. Directly running `./gad4 --lang=es` will fail with `bad option: --lang=es`.

## Features

- **Map generation**: Procedurally generated star maps using v3-style algorithms.
- **Local setup dialog**: Basic startup configuration for AI count, skill, map size, density, fast-game, and fog/all-visible mode.
- **Turn-based core**: Build ships, colonize stars, move ships/fleets, and resolve a first pass of combat/capture.
- **AI players**: Computer opponents participate in turns, build ships, and send ships to destinations; several v3 AI behaviors remain partial.
- **Command UI**: Simple runtime windows, event list, comparison window, permanent map buttons, popup action buttons, and production sliders.
- **Internationalization**: Current runtime UI/event strings are resource-driven for English, German, Spanish, French, Japanese, and Russian.

## Documentation

- [V3 to V4 Feature Status](docs/V3_V4_FEATURE_STATUS.md) - Current feature/UI parity inventory
- [Map Generation Port Status](docs/MAP_GENERATION_PORT_STATUS.md) - Current map generation implementation status
- [Testing Guide](docs/TESTING_GUIDE.md) - Running and writing tests
- [AI Integration Status](docs/AI_INTEGRATION_STATUS.md) - Current AI architecture and gaps
- [AI Integration TODO](docs/AI_INTEGRATION_TODO.md) - Recommended next AI work
- [Internationalization Status](docs/INTERNATIONALIZATION_STATUS.md) - Resource localization status
- [Future Improvements](docs/FUTURE_IMPROVEMENTS.md) - Non-parity enhancement ideas

## Testing

```bash
# Run all tests
./gad4 tests/run-tests.js
```

Current expected result: 284 passed, 0 failed.
