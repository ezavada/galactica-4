# Internationalization Status

Last reviewed: 2026-08-25

Galactica-4 uses the PDG `ResourceManager` for localized string resources. Current user-visible runtime strings are routed through resources and covered by tests for required IDs, localized file parity, and formatted placeholder compatibility.

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

- `strings.txt`: 166 IDs
- localized files: 166 IDs each

Every supported localized file currently has the same string ID set as the default English resource, including ID `800`, the battleship class/art-name list. ID `800` intentionally keeps the English class/art names in localized files for now so it continues to line up with existing ship artwork.

## Runtime loading

`main.js` opens the `data/` directory with `pdg.res.openResourceFile()` before game setup. Language can be selected on the command line by passing app arguments after the `gad4` launcher separator:

```bash
./gad4 -- --lang=es
./gad4 -- --lang=fr
./gad4 -- --lang=de
./gad4 -- --lang=ja
./gad4 -- --lang=ru
```

The `--` separator keeps application arguments distinct from launcher options
and works consistently in the macOS and Windows launchers.

The code then calls `pdg.res.setLanguage(languageCode)`.

## Localized areas

The current resources cover:

- core map/system/ship labels used by `Display`;
- startup setup dialog text and option labels;
- command, production, event-list, and empire-comparison windows;
- permanent map buttons and selected-object popup action labels;
- event titles/messages currently emitted by the runtime;
- lab/stardock overlay titles and dismissal text;
- AI autoplay observer, combat summaries, and victory/stalemate result text;
- star names and roman numerals;
- computer player name templates and faction group names;
- player type and skill labels;
- map size/density labels;
- setup/config description fragments;
- basic ship type/build labels;
- battleship class/art names.

## Known gaps

- There is no in-game language switcher.
- Debug and diagnostic console output remains English by design for now.
- Future v3 systems that have not been ported yet, such as tutorial/help text, save/load dialogs, multiplayer chat, and richer event/result windows, will need new resource IDs when implemented.
- Generated proper names and ship class/art names currently remain English-style names in every language.

## Adding or changing strings

When adding user-visible strings:

1. Add the ID to `data/strings.txt`.
2. Add corresponding entries to every supported localized file.
3. Use `I18n.getString(id, "Fallback")` or `I18n.formatString(id, "Fallback {0}", value)` in code.
4. Add the ID to the required runtime string list in `tests/string-resources.test.js` when the string is required for runtime behavior.
5. Run:

   ```bash
   ./gad4 tests/run-tests.js
   ```

Current expected full-suite result: 327 passed, 0 failed.

## Future work

- Add an in-game language selector.
- Decide whether battleship class names should stay stable asset identifiers or become fully translated display names separate from artwork.
- Add tutorial/help, save/load, multiplayer, and richer event/result text resources when those v3 systems are ported.
