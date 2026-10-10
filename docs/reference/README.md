# Original tutorial port reference

`v3-tutorial.json` is generated source evidence for the still-unimplemented
interactive tutorial. It is not loaded by the game and is not localized v4 UI.
The source English and German text is retained verbatim apart from converting
Mac carriage-return paragraph separators to newlines. All runtime instructions
will need English, German, Spanish, French, Japanese and Russian resources.

Regenerate from the peer v3 checkout:

```sh
python3 tools/import-v3-tutorial.py /path/to/galactica-anno-dominari-3
python3 tools/test-import-v3-tutorial.py
```

The importer decodes hexadecimal Rez payloads from
`Resources/gal-tutorial-{en,de}.r` using the packed `pageResT` in
`Classes/GalacticaTutorial.h`. Each language has sixty ordinary lessons,
recovery pages 100/101/103, and macOS alternatives 1001/1002/1060. The resource
7000 named Tutorial Window has an invalid page variant and is an editor/template
artifact; the game never requests it through the lesson loader. Its hash is
retained, without treating it as a lesson. Resource hashes retain the distinction
between source bytes and readable text.

`GalacticaTutorial.cp::LoadPage` prefers the macOS alternate resource but keeps
the logical lesson number. Next page 0 increments the logical lesson; -1 ends
the tutorial. Exceptions route according to the frontmost window, taking the
first match (including -1 as a wildcard). Blank button resources hide the button:
those lessons advance through actual gameplay hooks, rather than a Next button.
Title/button index 0 reads STR; positive indices read the one-based STR# list.
Recovery title references STR# 7000/1 are absent in both source dumps and appear
as null with their original reference; the importer does not invent titles.

`GalacticaSingleDoc.cp::DoNewGame` loads the tutorial plugin data fork as a saved
turn instead of generating a random galaxy, then seeds the random generator with
101. The shipped shareware plugin is a 6,184-byte game file; its source path and
hash are recorded. The saved fixture must still be converted to the v4 graph.
The original tutorial also modifies production during turns: home allocations
are reset on turns 2–13, and CStar forces particular hull completions. These
interventions must be confined to a tutorial session when ported.

Controller work still required:

- Preserve an existing game while opening/exiting the tutorial, as recovery page
  100 promises; a tutorial must not overwrite normal saves or preferences.
- Convert the fixed galaxy and its initial ship, ownership, names and economy.
- Adapt all sixty lessons to current controls and require the corresponding
  actions. Cover setup, pan/select, target-versus-actual production, end turns,
  colony orders and naming, satellite/scout/battleship builds, attention, patrol,
  courier tech transfer, rendezvous naming, system auto-destinations, player
  comparison, fleet inspection/exchange, health and repair.
- Wire the original progression hooks distributed across GalacticaDoc,
  GalacticaSingleDoc, CMessage, CStar, CShip, fleet/map controls and comparison.
  Integrate measured localized instruction panels with the normal input path.
- Audit the tutorial picture/sound resources recorded in the manifest for the
  specific lessons that use them. Add native/browser complete walkthrough tests,
  cancellation/resume tests and before/after visual checks in all six languages.

No unavailable external dependency has been established for the tutorial.
Decoding and integration work remain to be done; this reference does not close
the tutorial checklist item.
