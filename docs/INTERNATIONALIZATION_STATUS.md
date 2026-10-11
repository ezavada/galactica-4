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

- `strings.txt`: 494 IDs
- localized files: 494 IDs each

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
- Future v3 systems that have not been ported yet, such as tutorial/manual text, multiplayer chat, and richer event/result windows, will need new resource IDs when implemented.
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

Current expected full-suite result: 1086 passed, 0 failed.

## Future work

- Decide whether battleship class names should stay stable asset identifiers or become fully translated display names separate from artwork.
- Add tutorial/manual, multiplayer, and richer event/result text resources when those v3 systems are ported.

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

Computer-opponent setup adds IDs 829–831 and updates shortcut hint 525 in en/de/es/fr/ja/ru. Count prompts and errors format the available opponent limit; Save/Cancel reuse existing translations. Actual browser editor, invalid input, cancellation, twelve-opponent and solo launches/turns passed in every language. Translated normal/smaller layouts were inspected. Current resources: 366 IDs per language; full suites: 941 passed on release/current native PDG.

The startup skill popup reuses IDs 301–305, 522 and 683 for all five native-language skill names, heading and Cancel. No new string IDs are needed (366 per language). Actual pointer selection of every choice, cancellation, keyboard selection, modal isolation and smaller layouts passed in all six languages; screenshots were inspected. Full suites: 947 passed on release/current native PDG.

The Fast Game setup checkbox uses existing label 505 and shortcut hint 527 in all six languages; the neighboring fog description keeps its existing translations and measured font fitting. No new resources (366 IDs per language). Inspected checked/unchecked and smaller layouts and six before/after setup comparisons; actual checkbox/F/reset/modal/launch flows passed in en/de/es/fr/ja/ru. Full suites: 952 passed on release/current native PDG.

The Fog of War checkbox reuses label 508 and shortcut hint 527 in en/de/es/fr/ja/ru. It remains labeled Fog of War in either state; clearing it enables all-visible mode. Shared checkbox rendering measures both native-language labels. No new resources (366 IDs per language). Inspected six translated before/after setup and smaller checked/unchecked layouts, plus actual fog/all-visible enemy windows. Browser flows passed in all six languages; full suites: 957 passed on release/current native PDG.

Victory/defeat conclusion reports add IDs 832–835 in all six languages: three-paragraph victory and defeat narratives, Continue, and View report. Player substitution preserves literal Unicode names and punctuation. Existing outcome titles, summaries, hints and paging labels are reused. Browser narratives, controls, replay and small drawing-area layouts were inspected in en/de/es/fr/ja/ru. Current resources: 370 IDs per language; full suites: 969 passed on release/current native PDG.

Local game documents add IDs 836–837 for New Game and Open Games in en/de/es/fr/ja/ru. Setup Cancel and chooser paging reuse existing translations. New/retained document titles preserve Unicode and the chooser uses the current language for Turn. Inspected translated setup, normal/smaller menus, chooser pages and restored game screenshots. Current resources: 372 IDs per language; full suites: 979 passed on release/current native PDG.

Local Save/Save As/Open/Revert adds IDs 838–855 in en/de/es/fr/ja/ru. Commands, filename/path prompts, confirmation, progress, success and failure messages use localized resources; user filenames retain native Unicode. Browser download/upload, existing-file Save, cancellation, revert, malformed-file rejection and startup import after a fresh-page reload passed in every language. Translated file menus, filename editors, confirmations, errors and restored games were inspected under `/private/tmp/galactica-parity/save-after`. Native file/controller integration and six-language bounds checks pass. Current resources: 390 IDs per language; full suites: 992 passed on release/current native PDG.

New-colony setup reports add ID 856 in all six languages. The private report and inspector guidance ask the owner to name the new colony and adjust production, matching v3 STR#500/45. Actual browser End Turn, Tab navigation, Unicode Rename/Save, production clicks, report Go to and recapture suppression pass in every language. Before/after inspectors and reports, translated naming dialogs and recaptured-system screens were inspected under `/private/tmp/galactica-parity/colony-setup-{before,after}`. Current resources: 391 IDs per language; full suites: 1001 passed on release/current native PDG.

Technology-transfer repricing uses the existing localized technology, construction completion, ETA, Production and Pause/Resume controls. Actual browser delivery and inspector/pause/resume flows pass in all six languages; before/after screenshots were inspected under `/private/tmp/galactica-parity/transfer-{before,after}`. Resource counts remain 391 per language. Full suites: 1006 passed on release/current native PDG.

Highest-container arrivals retain existing localized inspector, docking, fleet-content, order and combat-summary resources. Actual browser nested arrivals, satellite docking and planetary interception/report flows pass in all six languages; translated group/report screenshots were inspected under `/private/tmp/galactica-parity/arrival-{before,after}`. Resource counts remain 391 per language. Full suites: 1018 passed on release/current native PDG.

Control flyby help adds IDs 857–920 in English, German, Spanish, French, Japanese and Russian, bringing each resource file to 455 IDs. Explanations cover runtime controls, actual/target allocation semantics, system default destinations, all startup options, text editors and action-specific local file commands/confirmations. Measured Unicode wrapping retains every character without truncation; language switching updates descriptions immediately, while native-script language names remain unchanged. Actual browser help, Settings, persistence/reload, file editors, course commands, resumed games and smaller-window checks pass in all six languages; before/after and translated screenshots were inspected under `/private/tmp/galactica-parity/help-{before,after}`. Full suites: 1029 passed on release/current native PDG. Manual/tutorial, multiplayer and richer report translations remain future port work.

Hull-role explanations add IDs 921–924 in all six languages (459 IDs per file). Build choices and new-colony default hull choices explain satellite immobility/mandatory patrol, scout scanning and technology delivery, colony reuse and escort needs, and battleship combat/class progression. Existing build-credit and future-colony explanations are retained. All translated descriptions wrap completely at smaller test widths without changing production on hover. Actual browser before/after screenshots and build/default click-through checks pass in en/de/es/fr/ja/ru; reviewed artifacts: `/private/tmp/galactica-parity/hull-help-{before,after}`. Full suites: 1032 passed on release/current native PDG.

First-built hull presentations add ID 925 in all six languages (460 IDs per file), with literal hull/class and source-system names preserved through substitution. The report reuses role explanations 921–924; Stardock titles/footer reuse 571/572. Satellites, scouts and colony ships now use their own existing artwork. Reports and overlays are owner-only, including with fog disabled. Actual browser before/after checks and reviewed translated Stardock/report screenshots pass in every supported language under `/private/tmp/galactica-parity/first-hulls-{before,after}`. Full suites: 1036 passed on release/current native PDG.

Participant combat reports add IDs 926–928 in all six languages (494 IDs per file). Winner, loser and inconclusive messages retain literal force/location names and distinguish own ship losses from destroyed enemy ships. Count labels avoid singular/plural agreement problems; Japanese uses native counters. Reports reuse existing Events, complete-text wrapping and Go to controls. Before/after browser checks and reviewed winner/loser reports pass in all six languages under `/private/tmp/galactica-parity/battle-reports-{before,after}`. Full suites: 1040 passed on release/current native PDG. Observer reports, automatic message presentation/replay and the remaining recipient-relative event variants are still pending.

Automatic battle message windows reuse existing translated combat, Continue, Go to, View report and paging resources; resource counts remain 463 per language. Complete Unicode wrapping and measured control rows retain all text without overlap at 320×340 in unit checks. Actual browser automatic winner/loser dialogs, Events replay and smaller paged messages pass in all six languages; final screenshots were inspected under `/private/tmp/galactica-parity/message-windows-{before,after}`. Full suites: 1045 passed on release/current native PDG. Observer and other recipient-relative narrative variants remain pending.

System resistance/capture reports add IDs 929–932 in all six languages (467 IDs per file). Winner and loser narratives retain literal system/faction names and distinguish defeating resistance from taking ownership. Reports use existing translated modal, navigation and replay controls. Unicode unit layouts and actual browser winner/loser invasions, Events replay and smaller dialogs pass in en/de/es/fr/ja/ru; final screenshots inspected under `/private/tmp/galactica-parity/occupation-{before,after}`. Full suites: 1052 passed on release/current native PDG. Observer variants remain pending.

First-detection ownership rendering reuses existing translated inspectors and controls (467 IDs per language). Actual browser star selection, all knowledge thresholds, lost detection, allied and all-visible views pass in en/de/es/fr/ja/ru; first-detection/lost-detection layouts and before/after comparisons were inspected under `/private/tmp/galactica-parity/star-ownership-{before,after}`. Full suites: 1055 passed on release/current native PDG.

Destruction effects introduce no new strings or bitmap assets. Existing participant battle/resistance messages and report controls remain translated (467 IDs per language). Actual browser eight-frame winner/loser playback, completed messages, Events replay and ground resistance pass in en/de/es/fr/ja/ru. Frame sequences and translated final dialogs were inspected under `/private/tmp/galactica-parity/destruction-{before,after}`. Full suites: 1061 passed on release/current native PDG. Individual destruction narrative variants and sound remain separate parity work.

Individual ship/fleet destruction notices add IDs 933–936 in all six languages (471 IDs per file). Separate winner/loser narratives preserve literal ship/fleet/faction names and localize coordinate decimals. Existing translated Events, replay and navigation controls are reused. Actual browser ship/fleet/nested winner and loser report layouts were inspected in en/de/es/fr/ja/ru alongside before/after comparisons and automatic animation peaks. Evidence: /private/tmp/galactica-parity/destruction-notices-{before,after}; both native suites pass (1073 tests). Other event variants and sound remain pending.

Observer capture narrative ID 937 is translated in en/de/es/fr/ja/ru (472 IDs per file). It preserves literal system and attacker/previous-owner names, reusing translated Events, replay and navigation controls. Complete layouts at 320×340 pass unit checks; actual browser hidden/detected/all-visible capture, Events replay, Go to and lost-detection flows pass in all languages. Before/after, event lists and complete translated reports were inspected under /private/tmp/galactica-parity/capture-observers-{before,after}. Both native suites pass (1079 tests). Enemy-move playback and other event variants remain pending.

Enemy-event playback adds label/help IDs 938–939 in all six languages (474 IDs per file). Settings preserves native-script language names; paging reuses translated Previous/Next and help. Complete Settings, explanatory hover text and automatic observer capture reports were inspected in en/de/es/fr/ja/ru alongside before/after comparisons. All short-layout pages are reachable through real browser clicks and keyboard input in a 320×340 logical-layout fixture (without resizing the native port). Evidence: /private/tmp/galactica-parity/enemy-events-{before,after}. Full native suites pass (1086 tests); other enemy event types remain pending.

## Drive discovery broadcasts

Owner and observer discovery narratives use IDs 958–959 in English, German, Spanish, French, Japanese and Russian. All six manuals explain private Lab artwork, detection, automatic observer playback and manual replay. Each language has 494 resource IDs.


Colony reuse correction: resource 923 and the colony hull description in all six manuals now state that colony ships survive colonization and capture and can establish further colonies. No new resource IDs were introduced (494 per language). Actual two-colony browser flows pass and translated system screens were inspected in en/de/es/fr/ja/ru.


## Public Join game information

Resources 1229–1244 add the public information panel, map/AI/game options,
configured/current turn limits, admission status, Back and localized day plurals
in en/de/es/fr/ja/ru. Existing Yes/No, skill, countdown/error and paging strings
are reused. Native regression coverage verifies complete wrapped/paged captions,
and actual browser input checks all six languages at 800×600, 640×340 and
320×340 against real host settings/turn/countdown updates and malformed-response
recovery. Long user-supplied titles remain literal; optional legacy host fields
are omitted rather than assigned invented defaults. Both full native suites
pass 1,759 tests. Evidence shares `/private/tmp/galactica-lobby-information`.


Desktop document status captions now preserve complete literal paths through
measured wrapping and paging. Existing Previous/Next and acknowledgment
resources are reused in en/de/es/fr/ja/ru; no new strings are required. Native
coverage reconstructs the exact caption, including double spaces and Unicode,
and checks that text stays clear of controls. Actual browser/native-I/O
before/after runs pass in all six languages at 800×600, 640×340 and 320×340,
including localized save, corrupt-file and missing-file errors and canceled
late reads. Compact/narrow first/final pages were visually inspected. Both
full native suites pass 1,761 tests. Evidence:
`/private/tmp/galactica-document-message/verified` and the corresponding
`galactica-document-message-*` logs/comparison report.


Remote-administrator connection feedback now remains visible inside its host
modal instead of being hidden by the ordinary map status bar. The panel uses
its own session's existing localized error; no strings are added. Native
regressions cover en/de/es/fr/ja/ru and isolate unrelated/local host feedback.
Actual password revocation, disabled mutation controls and complete drawn
captions pass in all six languages at 800×600 and 640×340; both sizes were
visually reviewed. Both full native suites pass 1,763 tests. Evidence:
`/private/tmp/galactica-remote-admin-status/verified`. Minor disabled-label
intensity variation in short-window screenshots was separately repeated; it
also occurs on the unchanged preceding build. See the feature-status audit
for the retained comparison evidence and remaining runtime investigation.


Join admission feedback retains its existing en/de/es/fr/ja/ru resources,
including code rejection and duplicate-name guidance. Oversized captions wrap
without losing literal characters, while background lobby refresh no longer
erases an unresolved failed-login message. Temporary metadata errors recover
to the underlying feedback; editing still clears it. Both native suites pass
1,764 tests, plus actual six-language native wrong-password/metadata recovery
and asynchronous cancellation checks. Thirty-six actual-input before/after
runs pass across three viewport sizes; six extra browser runs check 810
message/mode/size layouts with actual font metrics. All six narrow and short
feedback layouts were visually reviewed. Evidence:
`/private/tmp/galactica-join-status/{verified,measured}`. Pre-existing narrow
footer/summary crowding remains a separate compact Join layout item.


### Compact direct Join controls

Join/Rejoin/Administrator retain their existing six-language resources while
measured button rows include shortcut hints and complete title/count summaries
wrap inside the scrollable body. Feedback and footer commands remain visible.
No new strings were introduced; scroll arrows are universal symbols.
All six narrow before/after error, Rejoin and Administrator forms, plus scrolled
summary/final-checkbox views, were visually inspected. Actual native-backed
wheel/arrow/PageDown/Tab, role changes and admission recovery pass in every
language. Full native suites pass 1,765 tests; 36 matched browser runs pass
across three sizes. Evidence: `/private/tmp/galactica-join-layout/verified`.
The direct narrow form item is complete; saved-host/LAN/information control
bars and broader compact/hosting/busy/error audits remain open.


### Compact saved-host browser

Saved-host Add address, direct address, paging, remove, Open/Enter, Cancel/Esc
and persistence guidance retain their existing six-language resources.
Measured button rows preserve complete captions/hints; fixed wrapped feedback
and the scrollable list remain usable at 320×340. No strings were added.
All six narrow before/after persistence-failure layouts, saved-game descriptor
rows and scrolled paging/removal views were visually inspected. Thirty-six
matched native-backed UI workflows pass across three sizes; both native
suites pass 1,766 tests. Evidence:
`/private/tmp/galactica-saved-hosts/verified`. This completes compact saved
hosts; LAN/information bars and broader hosting/error/gameplay audits remain.


### Compact LAN discovery window

LAN refresh, saved hosts, paging, Cancel/Esc, direct entry, Open/Enter and
feedback retain their existing six-language resources. Measured button rows
fit their complete captions/hints at 320×340; list content scrolls while footer
commands and wrapped feedback remain fixed. No new strings were introduced.
All six narrow initial lists, last pages, browser fallback messages and
scrolled lists were visually inspected. All 36 native-backed before/after
browser workflows pass across three sizes; both full native suites pass
1,767 tests. Evidence: `/private/tmp/galactica-lan-layout/verified`.
This completes compact LAN controls, with information bars and broader
hosting/error/gameplay and physical-network audits still open.
