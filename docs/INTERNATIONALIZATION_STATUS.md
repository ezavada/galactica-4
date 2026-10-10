# Internationalization Status

Last reviewed: 2026-10-09

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

- `strings.txt`: 301 IDs
- localized files: 301 IDs each

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

Menu → Settings → Language offers English, Deutsch, Español, Français, 日本語 and Русский. These native names are fixed and independent of the current UI language. Settings/Language headings are localized (IDs 759–760).

A click switches `pdg.res` and refreshes cached display labels immediately, including numeric formatting and retained inspector text. The current language is highlighted. Esc closes the window; Enter/Tab and outside clicks do not advance the turn or change selection. Existing proper names and previously generated event narratives retain their original text; future events use the new language.

The choice is remembered through browser localStorage (`galactica.language`) or the native PDG ConfigManager (`Galactica`, item `language`). Blocked storage leaves live switching usable. On startup an explicit `--lang=`/web `lang=` overrides the saved choice; unsupported/missing saved values fall back to English. Explicit launch overrides do not overwrite the saved preference.

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

Current expected full-suite result: 757 passed, 0 failed.

## Future work

- Decide whether battleship class names should stay stable asset identifiers or become fully translated display names separate from artwork.
- Add tutorial/help, save/load, multiplayer, and richer event/result text resources when those v3 systems are ported.

The Your Star Systems table adds localized titles, nine column headers, population units, row-opening guidance and the empty state (IDs 708–719). The shared class names in ID 800 remain unchanged. Browser sorting, paging and row navigation were verified in every supported language.

System diagnostics adds IDs 720–725 for locale-specific integer grouping, coordinates, defense labels and unidentified system designations. English/Japanese use commas, German/Spanish periods, French narrow nonbreaking spaces and Russian nonbreaking spaces. Light-year coordinates retain two decimal places with each language’s decimal separator. All six browser layouts and native numeric resources were verified.

Universal Menu, Home and Fit icons retain their existing localized labels as hover hints; the colony-defaults gear keeps its localized text. No new string IDs are needed for the presentation effects. Browser controls and labels were verified in all six supported languages.

Language switching adds 11 regressions covering fixed autonyms in all UI languages, cached labels/numeric formatting, active selection, unsupported codes, modal click/keyboard routing, observer access, startup precedence, browser/native preference adapters and denied storage. Full suite: 717 passed. Real browser clicks from each of the six starting languages switched to all six destinations, preserved native names and game state, restored the saved preference after reload and honored an explicit override. Compared 12 before/after scenes: six system views were pixel-identical and six menus intentionally gained Settings.

Computer-advantage setup adds localized heading, A-shortcut help and production percentage (IDs 761–763). The seven signed numeric choices are shared across languages. Real browser choices, shortcuts, reset and launch passed in all six languages; English/Russian smaller-window layouts were also inspected.

Stellar-density setup now uses a localized numeric label (ID 764) in all six languages, with the same 1–10 choices in every locale. Browser input/reset/launch checks and setup screenshot comparisons passed in all six languages; the full suite has 725 passing tests. Translated star-name lists are deduplicated before generation and suffix exhaustion falls back to unique numbered names.

Sector-size setup restores the v3 Tiny/Small/Average/Large/Huge scale in IDs 350–354 across all six languages. ID 523 now labels map size alone, alongside a separate density row. All five dimension choices, S cycling/reset, launch and screenshot checks passed in all six languages; the smaller Russian layout was inspected. Resource counts remain 301 per language; the full unit suite has 737 passing tests.

Public yellow-star chart names and undiscovered-homeworld aliases reuse existing localized star-name/numeral/catalog resources; no IDs were added (301 per language). Aliases retain their proper names across language changes. Player comparison keeps actual home-derived faction names, while map labels use different aliases until discovery. Chart/inspector/detection/history/no-fog screenshots and browser checks passed in all six languages. Full suite: 748 passed.
