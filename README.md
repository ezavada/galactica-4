# galactica-4

A space exploration and empire game built in Javascript using the PDG game engine

Uses the pdg engine JavaScript APIs, located at ../pdg-devel/docs/javascript/pdg-js.h

Other examples of JavaScript code written with pdg engine apis can be found in ../pdg/test/perf/ and ../pdg/test/ui

Ported from original C++ code for Galactica, in ../galactica-anno-dominari-3/Classes

## Running the Game

```bash
# Run with default settings (English)
gad4 src/js/main.js

# Run in a different language
gad4 src/js/main.js --lang=es   # Spanish
gad4 src/js/main.js --lang=fr   # French
gad4 src/js/main.js --lang=de   # German
gad4 src/js/main.js --lang=ja   # Japanese
gad4 src/js/main.js --lang=ru   # Russian
```

## Features

- **Internationalization**: Full support for 6 languages via resource files in `/data/` directory
- **AI Players**: Computer opponents with configurable difficulty levels
- **Map Generation**: Procedurally generated star maps using original Galactica algorithms
- **Turn-Based Strategy**: Build ships, colonize stars, and expand your empire

## Documentation

- [Internationalization Guide](docs/INTERNATIONALIZATION.md) - Complete guide to localization
- [Testing Guide](docs/TESTING_GUIDE.md) - Running and writing tests
- [AI Integration](docs/AI_INTEGRATION_SUMMARY.md) - AI system documentation

## Testing

```bash
# Run all tests
gad4 tests/run-tests.js
```
