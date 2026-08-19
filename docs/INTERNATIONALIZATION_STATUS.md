# Internationalization Status

Last reviewed: 2026-08-19

Galactica-4 uses the PDG `ResourceManager` for localized string resources. The system is active and useful, but it is not yet a guarantee that every visible runtime string is localized.

## Resource files

String resources live in `data/`:

```text
data/
├── strings.txt      # Default English strings
├── strings-de.txt   # German
├── strings-es.txt   # Spanish
├── strings-fr.txt   # French
├── strings-ja.txt   # Japanese
└── strings-ru.txt   # Russian
```

Current resource counts:

- `strings.txt`: 62 IDs
- localized files: 61 IDs each

The localized files currently omit ID `800`, the battleship class/art-name list. The default English resource contains that list, and runtime code has a fallback path for class/art lookup.

## Runtime loading

`main.js` opens the `data/` directory with `pdg.res.openResourceFile()` before game setup. Language can be selected on the command line:

```bash
./gad4 --lang=es
./gad4 --lang=fr
./gad4 --lang=de
./gad4 --lang=ja
./gad4 --lang=ru
```

The code then calls `pdg.res.setLanguage(languageCode)`.

## Localized areas

The current resources cover:

- core map/system/ship labels used by `Display`;
- star names and roman numerals;
- computer player name templates and faction group names;
- player type and skill labels;
- map size/density labels;
- setup/config description fragments;
- basic ship type/build labels.

## Known gaps

- There is no in-game language switcher.
- Several visible strings are still hard-coded in English, including parts of the startup dialog, event messages, overlay titles, some button labels, and fog/all-visible description text.
- Debug and diagnostic console output remains English by design for now.
- `tests/string-resources.test.js` validates the default resource file, not full parity across every localized file.

## Adding or changing strings

When adding user-visible strings:

1. Add the ID to `data/strings.txt`.
2. Add corresponding entries to every supported localized file.
3. Use `pdg.res.getString(id) || "Fallback"` in code.
4. Add or update tests when the string is required for runtime behavior.
5. Run:

   ```bash
   ./gad4 tests/run-tests.js
   ```

Current expected full-suite result: 280 passed, 0 failed.

## Future work

- Localize remaining hard-coded UI/event strings.
- Add a small resource-parity test for all localized files.
- Add an in-game language selector.
- Decide whether battleship class names should be localizable or remain stable asset identifiers.
- Add tutorial/help text resources when those v3 systems are ported.
