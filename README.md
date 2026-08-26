# galactica-4

A space exploration and empire game built in JavaScript using the PDG game engine.

The port is actively moving toward Galactica v3 parity, but it is not feature-complete yet. See [V3 to V4 Feature Status](docs/V3_V4_FEATURE_STATUS.md) for the current parity inventory.

The game pins the public PDG `v1.0.0` runtime. API documentation and examples
are available in the [public PDG repository](https://github.com/ezavada/pdg).

The original C++ Galactica v3 source is in `../galactica-anno-dominari-3/Classes`.

## Running the Game

```bash
# macOS (Apple silicon): downloads and verifies PDG v1.0.0 on first run
./gad4

# Run in a different language
./gad4 -- --lang=es   # Spanish
./gad4 -- --lang=fr   # French
./gad4 -- --lang=de   # German
./gad4 -- --lang=ja   # Japanese
./gad4 -- --lang=ru   # Russian

# Windows PowerShell
.\gad4.ps1
.\gad4.ps1 -- --lang=es
```

The extra `--` separates app arguments from launcher options. The launchers
cache PDG under `.pdg/` and verify its SHA-256 before use. Set `PDG_CACHE_DIR`
to share that cache between clones, or `PDG_EXECUTABLE` to test with an
already installed runtime. Pass `--refresh-pdg` (or `-RefreshPdg` in
PowerShell) to replace the cached copy.

## Features

- **Map generation**: Procedurally generated star maps using v3-style algorithms.
- **Local setup dialog**: Basic startup configuration for AI count, skill, map size, density, fast-game, and fog/all-visible mode.
- **Turn-based core**: Build ships, colonize stars, move ships/fleets, resolve v3-style combat/capture, repair docked ships/fleets, and update fog-of-war state.
- **AI players**: Computer opponents participate in turns, use v3-backed economy/build rules, send ships/fleets to destinations with v3-style decision scoring, and include matrix-backed Expert campaign/scout/redeployment extensions.
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

Current expected result: 363 passed, 0 failed.

AI-only parity observer:

```bash
./gad4 -- --ai-autoplay
```

The observer uses seed `424242` and a 250-turn default cap. Event presentation windows are hidden by default for unattended runs; add `--show-event-windows` to see lab/stardock overlays, with `--autoplay-event-ms=1000` controlling the hold time. AI intent overlays are on by default in this mode; add `--hide-ai-intent` or `--no-ai-intent` for a clean map.

Experimental AI genetic trainer:

```bash
./gad4 tools/ai-genetic-trainer.js --generations=20 --max-turns=250 --target-turns=100
```

The trainer runs five AI players on the smallest fixed-seed map, gives each player a unique decision-matrix genome, keeps the top two genomes after each match, and replaces the other three with blended forced-mutation children.

## Licensing and assets

Source code, documentation, and localization files are MIT licensed. Visual
assets are not yet cleared for unrestricted redistribution; see
[ASSET_RIGHTS.md](ASSET_RIGHTS.md) before making the repository public.
