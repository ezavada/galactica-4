# Asset rights audit

Status: **not cleared for an unrestricted public release**.

The repository contains 33 runtime PNG files under `data/` and 245 legacy
files under `old-art/`. Git history shows that the legacy collection entered
the repository in commits `e8a7d07bfeeac7a13c7386e3e0e7b4cc52eb2e56` and
`bb18efa73aa1d06d0bce233532755b3154b53f31`. The runtime art was subsequently
converted or copied from that collection, including an exact copy relationship
between `data/background.png` and
`old-art/Art/sources/coloradjusted_background-0.png`.

No embedded license, source URL, artist credit, or written rights statement
was found in the current tree or Git history. The filenames identify several
items that need explicit verification:

| Asset group | Files | Current evidence | Required action |
|---|---:|---|---|
| Galactica ships, event panels, and blueprints | 32 runtime PNGs plus legacy sources | Derived from the historical Galactica art archive; no artist/license record in this repository | Confirm ownership or obtain written permission, then record author and license |
| Space background | `data/background.png` and `besthubble_keyhole_02.jpg` derivatives | Filenames suggest Hubble imagery, but the precise NASA/ESA source and transformation chain are not documented | Identify the original image and add its authoritative credit/usage statement |
| VendorNation and STS logos | `vn-logo*`, `VN_logo*`, `PICT_135*`, `PICT_136*` | Trademark/logo files with no redistribution grant | Confirm trademark ownership and intended public use, or remove them |
| Legacy screenshots and product/CD artwork | `old-art/screenshots/`, `old-art/Art/Galactica CD label/` | Historical product materials, including layered Adobe files and archives | Confirm all constituent art/font rights, or omit the entire legacy tree |
| Extra astronomy/planet images | `old-art/Art/Extra Art/`, `Astronomy gifs.sit` | No provenance found | Identify and license each original, or remove them |

Until those checks are complete, no license is granted here for the visual
assets. The safest public-release path is to publish code and localization
without `old-art/`, and either clear or replace every runtime image under
`data/`. Merely deleting files from the current branch does not remove them
from existing Git objects; use a coordinated history rewrite before changing
repository visibility if any file is not redistributable.

The PDG runtime downloaded by the launchers is independently licensed and
includes its own third-party notices in its release archive.
