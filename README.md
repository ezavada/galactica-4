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

On a new installation, closing the introduction starts the tutorial automatically.
You can also press **T** or click the triangle in the introduction/About window, click **Tutorial** on the start screen, or open the in-game menu and choose
**Tutorial**. Settings → Tutorial/T is another entry point. Close a blocking dialog first, then acknowledge the tutorial’s recovery instruction. Follow the instruction window and use the indicated game controls.
**Close tutorial** cancels practice and restores your previous game; **Finish**
keeps the practice game open for further play.

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
- **Local setup dialog**: Editable Unicode game titles (up to 27 characters), followed by player-name entry. Click the player-count row or press C to edit 0–98 AI opponents, including solo exploration. Click the AI-skill row for the five localized v3 choices, or use keys 1–5. Startup configuration for the full −3 through +3 computer-advantage range, map size, density, fast-game, and fog/all-visible mode. Advantage choices are clickable or cycled with A; Fast Game and Fog of War have clickable checkboxes and F/O shortcuts.
- **Turn-based core**: Build ships, colonize stars, move ships/fleets, resolve v3-style combat/capture, repair docked ships/fleets, and update fog-of-war state.
- **AI players**: Computer opponents participate in turns, use v3-backed economy/build rules, and send ships/fleets to destinations with v3-style decision scoring.
- **Interactive tutorial**: Launch from startup, Menu → Tutorial, or Settings → Tutorial/T for an illustrated sixty-lesson practice game in any supported language. Close tutorial restores your previous game; Finish keeps practice open for further play. Practice games can be saved; saves do not preserve the instruction step.
- **Introduction and About**: A saved startup setting controls the original-art introduction. Settings opens About independently; both show localized content, offer manual paging, and preserve your setup/game. About identifies the development build for problem reports.
- **New game defaults**: Startup Settings or Menu → Settings → New game defaults remembers map size, density, AI skill/advantage, fast game and fog of war for future games. Save applies the defaults; Cancel leaves them unchanged. Current games and the tutorial keep their own configuration.
- **Control help**: Rest the pointer over a control for a translated explanation, including startup options, allocation targets, course commands and saved-game dialogs. Settings → Control help enables or disables it; the choice persists.
- **Command UI**: Startup player-name dialog with remembered Unicode names, runtime windows, event list, full v3 player comparison with production/power and system/ship technology statistics, best/worst highlighting, paged rosters, permanent map buttons, popup action buttons, and production sliders.
- **New colony defaults**: Settings and the game menu remember the hull and coupled production allocations for future colonies and games. Existing systems keep their allocations; fixed tutorial practice is isolated.
- **New-colony guidance**: Neutral human colonies request attention to name the colony and set production. Tab or report Go to centers the colony and shows the instruction beside its existing controls. Settings → Tutorial/T also starts the lesson; modal recovery waits for Settings to close before continuing.
- **Multiple local games**: Menu → New Game reopens setup without discarding your current game. Cancel returns to it; Menu → Open Games switches among retained games, preserving each turn, selection and camera. Menu → File provides Save, Save As, Open and Revert for versioned `.gad4.json` documents. File → Close game offers Save and close, Discard and Cancel for unsaved changes; other games stay open, and closing the last game returns to setup. Native saves use atomic file replacement; browsers use file handles where available, or downloads/uploads. Open Game and Quit are also available on the startup screen. File → Quit checks all open games and waits for successful saves; Cancel preserves remaining games. Browsers warn before leaving unsaved games and offer a restart screen after Quit. Native window-close/OS Quit integration remains pending.
- **Conclusion reports**: Localized v3 victory and defeat narratives, opponent defeat notices, and stalemate reports. Acknowledge without advancing the turn; reopen a retained outcome from the event list.
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

## Network hosting and joining

Use startup **Join** (J), or **File → Join** while a game is open. Enter the
host address (hostname/IP and optional port), inspect its player slots, and
enter your name and optional password. Select a claimed player to rejoin.
**Saved games** in the Join dialog stores hostname/IP bookmarks and remembers
the game title and player or administrator identity after successful login.
Select an entry to inspect and rejoin it, or add/remove addresses in the paged
list. Removing an entry leaves the host and remembered passwords intact.
Desktop **Find LAN games** browses automatically advertised hosts on the local
IPv4 network. The list updates titles, turns and open slots, removes stale hosts,
and supports paging, Refresh/R and selection followed by public inspection.
Hosting and dedicated hosts advertise while listening; a failed save does not
stop the listener or its advertisement. LAN announcements contain public game
metadata, and a successful join is remembered separately in Saved games.
Browsers show an explicit desktop-only message and retain direct address entry.

Joined and local games remain available through **Open Games**. A joined game
refreshes automatically; rejoining the same player reuses its document.

End Turn submits your orders to the host, locks the posted turn, and waits for
the other living human players. When everyone posts an untimed turn, the host
resolves it and the client refreshes automatically. Retry posting resends the
same submission after a connection failure.

The native host service now supports timed turns after the untimed first turn,
including pause/resume and saved time remaining across reopening. Joined games
show a localized countdown that stays visible after posting and waits for the
host to announce the next turn.

Desktop **Host** (H), on startup or in File, creates a durable hosted game.
Choose human/AI counts, map options, a host filename, port (0 selects an
available port), and an optional minutes/hours/days/weeks turn limit. The status
window offers Join, Pause/Resume game, End turn now, Host settings, Change player, Admission, Edit initial state, Stop hosting, and Host
another game. Pausing holds both the timer and automatic turn advancement and
survives reopening. End turn now warns about assigned living humans who have
not posted; Keep waiting cancels, and a confirmation for an already-advanced
turn cannot skip another turn. Forced turns retain the paused state. A failed
save leaves the turn unchanged and keeps the confirmation available for retry. Hosting continues when
you dismiss that window or close a client game; accepted Quit saves and stops
all hosts before exiting. A failed save keeps the application and listener open.
Host settings edits AI skill/advantage, fast mode, fog, turn limit and endEarly.
The title, roster and map stay fixed. AI changes apply to every computer player.
Changing a positive limit preserves the current turn's deadline and applies the
new budget next turn, including after reopening. Disabling clears the timer;
enabling starts a fresh limit and retains the paused state. Existing second-based
limits are preserved exactly. Cancel leaves the host unchanged; failed saves keep
the draft for retry, and stale drafts must be reopened. Joined clients refresh
settings and visibility while keeping unposted orders.

**Change player** lists the fixed player IDs with human/AI, assigned, alive and online
status. Rename an assigned player, switch human/AI control, free a human slot,
eliminate a player, or eject an online human. Role changes keep the same territory and player IDs.
Making an AI human opens its slot; making a human AI releases its claim. Freeing
a slot removes its password and posted-turn receipt so a replacement can join.
Renaming a human keeps its password; that player must rejoin with the new name.
Affected connections are revoked only after the change saves successfully.
Elimination neutralizes all owned territory and reports defeat at turn end.
Cancel preserves the host; failed saves retain the selected action/name for retry,
and stale actions require reopening the player list.
Eject disconnects the selected player while preserving their name, password,
territory and posted orders. They receive a translated notice and can rejoin
the same slot. Completed games still permit ejection; other player edits are
disabled.

**Admission** edits the host’s allowed and blocked admission-code lists.
Codes are 1–64 characters, case-sensitive, with up to 100 entries per list.
An allowed list makes new-slot joining private: only listed codes can join,
and that list takes priority over blocked codes. Without an allowed list,
blocked codes are rejected and **Join without a code** controls code-free
joining. These codes replace v3’s registration-code checks; they do not identify
or permanently ban a person. Existing connections and password rejoining are
unaffected. Cancel leaves the rules unchanged; failed saves retain the draft.

Dedicated hosts can load the same rules before listening:

```bash
./gad4 tools/host-game.js --new friends.gad4.json --admission admission.json
./gad4 tools/host-game.js --load friends.gad4.json --admission admission.json
```

Example `admission.json`:

```json
{"allowWithoutCode": false, "allowed": ["friends-code"], "banned": []}
```

Omit `--admission` when reopening to retain saved rules. Lists remain private
host data; admission codes are never saved in client connection preferences.

Browsers can join games but require the desktop application to host.

Use **File → Open as host**, or **Open as host** in the startup Host form, to
resume an existing hosted `.gad4.json` file. The host keeps its galaxy, turn,
claimed players/passwords and remaining time; stopped time does not consume the
countdown. You may leave it running without joining a local player.

Opening a local saved turn with **Open as host** offers conversion to a separate
host file. Choose how many players become human (the first N; the rest remain
AI). The default is all players. Conversion preserves the galaxy, economy and
current turn, opens fresh human slots, and starts with no turn time limit. It
uses the inspected snapshot and leaves the source file and open local game
unchanged. Cancel or a failed write creates no host; an existing filename is
never overwritten. Ordinary **Open** rejects host files; use **Open as host**.

For a dedicated host with no game window or local player:

```bash
./gad4 tools/host-game.js /path/to/host.gad4.json 0 en
```

Create a new dedicated host without a game window:

```bash
./gad4 tools/host-game.js --new /path/to/new.host.gad4.json \
  --title "My game" --players 3 --ais 1 --size 2 --density 3 \
  --skill 2 --turn-minutes 5 --end-early --port 0 --language en
```

`--players` is the total count, `--ais` the AI portion. Use `--ais` equal to
`--players` for an AI-only host that advances automatically. Skill uses the same
1 (Expert) to 5 (Novice) scale as game setup; density is 1–10 and size is 1–5.
`--advantage` accepts -3 through 3. Turn limits are minutes (0 is unlimited).
Defaults are two humans, no AIs, Tiny/lowest-density, Novice, fast game, fog on,
no time limit and no early end for timed turns. `--slow` and `--no-fog` override
speed and visibility. Existing files are never overwritten.

Named reopening is `--load FILE --port 0 --language en`; it preserves saved
setup. `--help --language CODE` lists options in any supported language.
The positional form above remains supported. Its optional port defaults to 0;
the final argument selects en/de/es/fr/ja/ru.
The command prints the bound local address. Ctrl+C or SIGTERM saves and stops
the host. Application and dedicated hosts use an exclusive `.host-lock`
sidecar directory across atomic saves; a lease from a terminated process is
retired on the next open. An incomplete or unreadable lease is retained for
manual inspection rather than risking an active host file.

Remote administration is disabled until a host administrator password is set.
Use **Administrator access** in the desktop host status window, or pass
`--admin-password-file FILE` to the dedicated host. The file contains a JSON
password string; `""` disables access. Reopening without this option retains the
saved credentials. The password is stored as salted credentials.

Choose **Administer** in the Join window to connect without taking a player slot.
The read-only full-map view has **File → Host administration** controls for
pause/resume, confirmed force turn, settings, player changes/ejection and admission.
Disconnect preserves the view for password rejoin; Close logs out and returns
to the previous document. Administrator views cannot be saved as local games.

During turn one, **Edit initial state** changes system population (in thousands),
technology and owner, or creates a completed ship without spending construction
credits. Desktop owners use the host-status dialog; remote administrators use
that dialog or a selected system’s map menu. Local games also offer the editor
in Settings and the selected-system menu. Zero denotes an unowned system.
Host ownership changes seed empty population/technology to one, as in v3; local
ownership changes preserve zeros. Editing closes after turn one. Host writes
are atomic, and failed writes keep the draft available for retry.

**Remember password on this device** is optional in Join/Rejoin, including
administrator login. It starts off for new identities. After a successful login,
checked credentials are saved in this device’s browser or native application
preferences and restored only for the same host, game, player and role. To forget
a saved password, uncheck the option and log in successfully. Failed or cancelled
logins preserve the previous preference. Password fields stay masked; connection
descriptors and game/host saves contain no remembered plaintext credentials.

Connected players and administrators use **Menu → Chat**. Choose a human player,
the administrator, or All players; the picker shows online/offline status.
Broadcasts reach connected participants; private messages stay with their
recipient, and offline human recipients receive saved reports at their next login.
Enter/Return sends up to 256 Unicode characters without posting the turn. Escape
closes chat while retaining its draft and paged history. Failed sends retain the
original draft for a retry; uncertain requests keep their text/recipient fixed.
The modal window remembers its position and stays within the viewport. Read
acknowledgments persist, and a full unread inbox refuses additional messages
rather than dropping them. Menu → Hold game reports pauses automatic reports without marking them read; Show game reports plays the pending batch while preserving Hold. Manual Events replay remains available, and each save retains its Hold choice and pending reports.

Multiplayer remains incomplete: Internet matchmaking needs an available service,
and network-game saving is still being ported. See [the parity checklist](docs/V3_V4_FEATURE_STATUS.md).

## Testing

```bash
# Run all tests
./gad4 tests/run-tests.js
```

Current expected result: 1606 passed, 0 failed.

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
