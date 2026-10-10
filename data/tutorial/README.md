# Fixed tutorial starting galaxy

`galaxy.json` is decoded from the data fork of the shipped Galactica tutorial
plugin, not from a procedural v4 map. It supplies the future guided controller
through `src/js/tutorial-game.js`; the normal startup path does not use it yet.

```sh
python3 tools/import-v3-tutorial-game.py '/path/to/v3/release/shareware/Galactica.app/Contents/MacOS/Plug-ins/Galactica Tutorial'
python3 tools/test-import-v3-tutorial-game.py '/path/to/v3/release/shareware/Galactica.app/Contents/MacOS/Plug-ins/Galactica Tutorial'
```

Both shipped shareware and CD plugins have the same 6,184-byte fixture:
SHA-256 `56ff62f6dfdf2336ea4a3efa8c0a7c64c9c9aef05a970f3aceb5ad53530aad5d`.
Their conversions are byte-identical. The development `Tutorial/Tutorial game`
copy differs: its fast-game flag is off and its system ID 9 is S-9. The shipped
fixture enables fast game and names that system S-20, matching the lesson text.
The converter intentionally uses the shipped version.

Stream layout follows v3 `GalacticaSingleDoc.cp::ReadSavedTurnFile`,
`GalacticaPanes.cp::CStarMapView::ReadStream`, `AGalacticThingy::ReadStream`,
`ANamedThingy::ReadNameStream`, `CStar::ReadStarStream`, and the Waypoint and
SettingT readers in `GalacticaUtils.cpp`. The legacy packed structures are in
`GalacticaTypes.h` and `Database/DatabaseTypes.h`. This is a fixed-fixture
converter, not an arbitrary-save importer. Unknown versions, non-star objects,
completed ships, unexpected orders/arrays/messages, truncated fields, duplicate
IDs, invalid homeworlds and trailing bytes fail instead of silently producing
an incomplete galaxy.

All 42 stars retain coordinates, names, IDs, owners, technology, population,
research credit, four hull payment banks, current hull/cost and allocations.
Each record has its source offset, byte length and SHA-256. Coordinates are
already in the same units as v4; population remains thousands of people.
Allocation values, targets and rates convert from 0–1000 units to percentages
by dividing by ten. Per-unit benefits remain unchanged. Float construction
payments retain their source precision rather than being rounded to 99%.

Homeworlds are Andromeda (ID 2), Merjia (18) and Catambay (28), each with one
billion people and a colony hull at approximately 99% completion. There are no
completed ships, fleets, rendezvous points or messages. The human owns
Andromeda; its colony target S-20 is ID 9 and S-7 is ID 7. Source proper names
are retained as game data. The future instruction UI and tutorial title must
use all six supported languages rather than displaying the source lesson text.

`createTutorialGame(fixture, options)` builds a fresh game without generating a
random map, assigning a file, modifying existing sessions/preferences or
reseeding the global generator. It accepts caller-supplied title/player name.
It assigns original IDs before spatial registration, preserves allocator
monotonicity, restores player milestones and initializes visibility/selection.
The future session controller must seed a new tutorial with 101, preserve the
previous game and wire the original sixty action-driven lessons. Those pieces
are still missing; this fixture does not constitute a completed tutorial.


The builder attaches `TutorialSimulation`, which follows the source's early
production safeguards. Before processing turns 2–13 it restores the original
homeworld's current and target allocations to 33.4/33.3/33.3. Positive effort
on processing turns 3, 4 and 8 guarantees the selected home hull; processing
turn 8 does the same for New Terra (ID 9). The source adds 0.1 credit beyond
the cost rather than inventing ships outside normal commissioning. Computer
systems choose battleships after completing a hull. Paused/zero-effort builds
are not guaranteed, and ordinary games do not attach these rules. Turn numbers
here refer to the turn being processed, before v4 increments the displayed turn.

This component has no new user-facing text or startup entry. Session lifetime,
restoring the previous game and preserving a complete tutorial across saves must
be implemented by the pending session owner; restoring the galaxy through the
ordinary save API currently restores a normal game without the tutorial helper.


`TutorialRuntime` can explicitly bind a constructed tutorial game to the
progression model. It drives lessons from real game actions and remembers
original actors; its snapshots retain actor IDs and model progress. It is not
installed automatically by the builder or ordinary save restoration. Startup
entry, six-language instructions and previous-session preservation are still
missing. See `docs/reference/TUTORIAL_CONTROLLER.md`.
