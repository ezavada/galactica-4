# galactica-4

A space exploration and empire game built in JavaScript using the PDG game engine.

The port is actively moving toward Galactica v3 parity, but it is not feature-complete yet. See [V3 to V4 Feature Status](docs/V3_V4_FEATURE_STATUS.md) for the current parity inventory.

The game pins the public PDG `v1.2.0` runtime. API documentation and examples
are available in the [public PDG repository](https://github.com/ezavada/pdg).

The original C++ Galactica v3 source is in `../galactica-anno-dominari-3/Classes`.

## Running the Game

```bash
# macOS (Apple silicon): downloads and verifies PDG v1.2.0 on first run
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

## Running in a Browser

Galactica-4 can also run against PDG's Emscripten/WebAssembly build.

```bash
# Uses ../pdg/build/wasm by default; override with PDG_WASM_DIR if needed.
./tools/build-web.sh
python3 -m http.server --bind 127.0.0.1 --directory dist 8080
```

Then open `http://localhost:8080/`. Browser launch options are query
parameters, for example:

```text
http://localhost:8080/?lang=es
http://localhost:8080/?ai-autoplay=1&seed=424242&autoplay-max-turns=250
```

The web build preloads the `data/` resource directory into Emscripten's virtual
filesystem before starting `main.js`, so localized strings and image resources
use the same paths as the desktop launcher.

## Features

- **Map generation**: Procedurally generated star maps using v3-style algorithms.
- **Local setup dialog**: Startup configuration for AI count, skill, the full −3 through +3 computer-advantage range, map size, density, fast-game, and fog/all-visible mode. Advantage choices are clickable or cycled with A.
- **Turn-based core**: Build ships, colonize stars, move ships/fleets, resolve v3-style combat/capture, repair docked ships/fleets, and update fog-of-war state.
- **AI players**: Computer opponents participate in turns, use v3-backed economy/build rules, and send ships/fleets to destinations with v3-style decision scoring.
- **Command UI**: Startup player-name dialog with remembered Unicode names, runtime windows, event list, full v3 player comparison with production/power and system/ship technology statistics, best/worst highlighting, paged rosters, permanent map buttons, popup action buttons, and production sliders.
- **Subtle visual effects**: Occasional star twinkles, gentle background parallax, shaded and outlined controls, known-owner system tint, brief window transitions, and familiar icons with localized hints. Browser reduced-motion preferences are respected.
- **Internationalization**: Current runtime UI/event strings are resource-driven for English, German, Spanish, French, Japanese, and Russian. Menu → Settings → Language switches the UI immediately and remembers the choice; language names always appear in their native scripts.
- **WebAssembly build**: Browser bootstrap and build script for running the game with PDG's Emscripten runtime.

## Documentation

- [V3 to V4 Feature Status](docs/V3_V4_FEATURE_STATUS.md) - Current feature/UI parity inventory
- [Map Generation Port Status](docs/MAP_GENERATION_PORT_STATUS.md) - Current map generation implementation status
- [Visual Style](docs/VISUAL_STYLE.md) - Presentation choices and reduced motion
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

Current expected result: 928 passed, 0 failed.

AI-only parity observer:

```bash
./gad4 -- --ai-autoplay
```

The observer uses seed `424242` and a 250-turn default cap. Event presentation windows are hidden by default for unattended runs; add `--show-event-windows` to see lab/stardock overlays, with `--autoplay-event-ms=1000` controlling the hold time.

In game, Tab visits the next ship or fleet needing attention. Enter ends the turn;
unreviewed requests or presentations require confirmation. Call in <C> in the
course editor keeps a request active each turn until canceled.

## Licensing and assets

Source code, documentation, and localization files are MIT licensed. Visual
assets are not yet cleared for unrestricted redistribution; see
[ASSET_RIGHTS.md](ASSET_RIGHTS.md) before making the repository public.
