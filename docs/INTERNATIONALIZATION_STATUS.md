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

- `strings.txt`: 363 IDs
- localized files: 363 IDs each

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

Current expected full-suite result: 934 passed, 0 failed.

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

Grid visibility uses ID 765 in all six languages. Settings shows the localized label with the F3 shortcut; native clicking, keyboard toggling and persistence were verified in every language. Current resources contain 302 IDs per language; full suite: 783 passed.

Map-name visibility uses ID 766 in all six languages. Settings offers the localized label and F2 shortcut. Native toggling and new-game persistence passed in every language; existing chart-alias and comparison naming resources are unchanged. Current resource counts: 303 IDs per language. Full suite: 783 passed.

Ship visibility uses ID 767 in every supported language. Settings shows the localized label with F1, and preferences persist independently of map names/grid. Browser checks cover ship/fleet hiding, selected-object exceptions and new-game persistence in all six languages. Resource count: 304 IDs per language. Full suite: 783 passed.

Course-visibility controls use IDs 768–769 for ordinary and courier routes, localized in all six languages. Native Settings/F4/F5, independent preferences and selected-course exceptions were verified with translated screenshots. Current resources: 306 IDs per language; full suite: 783 passed.

Scanner-range visibility uses ID 770 in all six languages. Native Settings/F6, selected scanner exceptions, influence-mask cache reuse and new-game persistence were checked in each language. Current resources: 307 IDs per language. Full suite: 783 passed.

Fullscreen uses IDs 771–772 for the menu control and failure feedback in every supported language. Trusted browser clicks, rejected requests/retry, translated menu screenshots and wider-screen click accuracy passed in all six languages. Current resources: 309 IDs per language. Full suite: 788 passed. Native monitor transition validation remains pending because GLFW reports zero monitors in this session.

Map display controls and brightness legends use IDs 773–784 in all six languages. Chooser labels, active state, known-system range, no-known-values message and allocation hint are resource driven. Actual browser clicks selected every mode; translated chooser/map/legend screenshots were inspected, including a smaller Russian viewport. Current resources: 321 IDs per language. Full suite: 795 passed.

The persisted Show nebula background setting uses ID 785 in all six languages. Its label, active state, on/off map rendering and remembered new-game choices were checked with native browser clicks and translated screenshots. The taller settings panel fits the logical 800×600 viewport and was also inspected at a 640×480 CSS viewport. Current resources: 322 IDs per language. Full suite: 799 passed.

Camera commands use IDs 786–790 for View, Zoom in/out, Reset view and Center selected item in en/de/es/fr/ja/ru. Help ID 547 now describes zero as Fit. Native browser clicks and screenshots verify all six translated dialogs. Current resources: 327 IDs per language; current full suite: 803 passed.

Map scroll bars use IDs 791–792 for horizontal/vertical hover hints in all six supported languages. Help ID 548 now includes Alt dragging and retains middle dragging/wheel zoom. Browser interactions and translated hint/help screenshots passed in en/de/es/fr/ja/ru. Current resources: 329 IDs per language; full suite: 815 passed.

The overlapping-map-object chooser uses IDs 793–794 for its heading and selection/cancel help in en/de/es/fr/ja/ru. Previous/Next, unknown Ship/Fleet labels and marked-for-scrap status reuse translated resources. Object names remain user content; hidden enemy names are never substituted into chooser rows/tooltips. Actual translated chooser/page/target screenshots and interactions passed in all six languages. Current resources: 331 IDs per language; full suite: 830 passed.

Fleet inspector privacy uses existing translated Fleet, ships, power, speed, technology, composition and member labels in all six languages. Speed uses localized decimal drive units, composition counts/power/technology use grouped integers, and label columns measure translated text widths. Native browser before/after fleet panels at Speed/Tech/Class and owned states passed and were inspected in all six languages. No new resource IDs; 331 IDs per language. Current full suite: 836 passed.

Fleet member rows reuse translated technology, speed, power and health labels, with localized member diagnostics and Previous/Next (690–691) controls. Names remain user content and fit measured Unicode text widths. Unknown values use the same `?` notation as the ship inspector. All six languages passed native browser paging, later-page operations and inspected before/after screenshots. No new resource IDs; 331 IDs per language. Current full suite: 844 passed.

Fleet transfer destination choice adds ID 795 in en/de/es/fr/ja/ru. The paged chooser reuses localized Previous/Next and Esc help; fleet names remain user content. Actual browser cancel/retry, destination choice on page two, map visibility toggle and moved-target rejection passed in all six languages. Translated before/after captures inspected; ordinary source-fleet views are pixel-identical. Current resources: 332 IDs per language; full suite: 852 passed.

Nested fleet groups add IDs 796–798 (Group action, default group name, Parent fleet) in all six languages. Native browser creation, parent navigation, nested inspection, whole-group transfer and departure passed in every language. Translated inspector controls and default names were inspected. Current resources: 335 IDs per language; full suites: 866 passed on release/current native PDG.

Fleet exchange adds IDs 801–805 (window title/action, main-list heading, destination contents heading, New fleet and Inspect) in all six languages. It reuses localized sorting, paging, health, patrol, scrap, parent navigation and close labels. Native browser exchanges in both directions, new top-level/nested fleets, intact group wrapping, parent inspection, patrol/scrap and modal keys passed in every language. Current resources: 340 IDs per language; full suites: 877 passed on release/current native PDG.

Fleet roster adds IDs 806–809 (empty roster, Yes/No colony capability and double-click help) in all six languages. It reuses localized column names, patrol, paging and close labels, with native decimal formatting for speed and coordinates. All translated columns, later pages, selected/double-click views and smaller CSS views passed actual browser checks; header layouts also fit logical 640×480/600 screens. Current resources: 344 IDs per language; full suites: 889 passed on release/current native PDG.

Roster geometry adds ID 810, a native-language title/corner drag hint, in all six languages. Actual browser move/resize, paging, Escape, release outside the canvas and fresh-page restoration passed in every language; inspected translated moved/resized/restored windows and smaller CSS views. Current resources: 345 IDs per language; full suites: 900 passed on release/current native PDG.

System comparison sorting uses existing localized headers and hull labels in all six languages. Hull order follows class/technology rather than translated spelling. Browser clicks and fresh-page preference restoration passed in en/de/es/fr/ja/ru; translated screenshots inspected. Resources remain 345 IDs per language; current full suites: 903 passed on release/current native PDG.

System comparison geometry reuses localized title/corner hints (810), close (531), paging and table guidance. No new strings; 345 resource IDs per language. Actual browser controls and full reload restoration passed in en/de/es/fr/ja/ru, with moved and smaller/restored layouts inspected. Current full suites: 909 passed on release/current native PDG.

Compare Players adds IDs 811–821 in English, German, Spanish, French, Japanese and Russian: unowned systems, compact technology subheadings, best/worst legend, defeated-name template and grouped system/ship technology headings. Integer formatting follows each language; real enemy faction/homeworld names are preserved independently of fogged map aliases. All six translated table and smaller CSS views inspected after actual paging/input/close/reopen flows. Current resources: 356 IDs per language; full suites: 919 passed on release/current native PDG.

Player-name startup adds IDs 822–824 in all six languages for the title, prompt and blank-name error; Start/Cancel use existing resources. Native-script names edit by Unicode code point and are retained in configuration/map generation/player comparison and native/browser remembered-name storage. Actual typed accented/Japanese/Cyrillic names, cancellation, blank validation, fresh-page restoration and smaller dialog layouts passed in en/de/es/fr/ja/ru, with screenshots inspected. Current resources: 359 IDs per language; full suites: 928 passed on release/current native PDG.

Game-title setup adds IDs 825–828 in all six languages for the editor title, prompt, blank-title validation and setup title button. Save/Cancel reuse existing translations. Browser typing, validation, Save/Cancel, title-limit and generated-game header flows passed in en/de/es/fr/ja/ru, with translated screenshots inspected. Current resources: 363 IDs per language; full suites: 934 passed on release/current native PDG.
