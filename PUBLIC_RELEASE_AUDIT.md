# Public release audit

Audit date: 2026-08-22

## Current tree

- No credential-shaped filenames, private keys, GitHub tokens, AWS access
  keys, populated secret assignments, or active `pdg-devel` dependency was
  found. `PlayerInfo.password` is an empty, unused game-model field rather
  than a repository credential.
- Runtime dependency URLs, version, public source commit, and release archive
  SHA-256 values are recorded in `tools/pdg-release.env`.
- The portable launchers require no sibling PDG checkout.
- Visual asset redistribution is not yet cleared; see `ASSET_RIGHTS.md`.

## Complete local Git history

All 45 reachable commits and all object names were scanned. `git fsck --full
--no-reflogs --unreachable` reported no dangling objects. No credential-like
files or secrets were found.

Historical documentation mentions `pdg-devel/gad4`; this discloses a private
repository name and prior local build arrangement, but not private PDG source.
Commit metadata contains three author email identities. Confirm all are
acceptable for public attribution before changing visibility.

The full history contains every legacy asset described in `ASSET_RIGHTS.md`.
Removing `old-art/` or replacing runtime art only in a new commit will not
remove those objects from a public clone. If any rights cannot be confirmed,
rewrite the history before publication and coordinate replacement clones and
force-pushes while the repository is still private.

## GitHub Actions

The GitHub repository is currently private. GitHub reported no Actions runs
and no retained Actions artifacts, so there were no artifact archives to
download or inspect.

## Release gate

The code is detached from `pdg-devel`, the pinned public runtime passes the
295-test suite, and an MIT source license is present. Public release remains
blocked on visual-asset provenance/permission and the related decision about
history rewriting.
