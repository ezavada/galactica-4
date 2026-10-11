# Galactica v3 sound samples

These WAV files preserve the unsigned 8-bit mono PCM samples from the shipped
Galactica v3 resource bundle. They are a format conversion of legacy assets,
not newly licensed recordings. The repository's `ASSET_RIGHTS.md` applies.

Source: `galactica-anno-dominari-3/release/shareware/Galactica.app/Contents/Resources/Galactica.rsrc`.
The CD edition contains the same twelve sound payloads. Resource declarations
and names are also present in v3 `Resources/gal-sounds.r`.

| Resource ID | Legacy name |
|---|---|
| 1000 | Explosion |
| 1001 | Attention |
| 1002 | Warning |
| 1003 | Message (TNG doorbell) |
| 1007 | Won Battle |
| 1008 | Lost Battle |
| 1009 | Won Planet |
| 1010 | Lost Planet |
| 1011 | New Colony |
| 1012 | No more |
| 1013 | Discovery |
| 1014 | Enemy Move |

The event table references outcome sounds 1004–1006. They are stored in the
separate Galactica Music resource fork, recovered from AppleDouble entries
in all six release ZIPs. `docs/reference/v3-music-resources.json` records their
source hashes. Cue 1005 is standard PCM; 1004/1006 have compressed sound
headers and still need conversion before they can be added to this WAV set.
Their absence from the application bundle is not an unavailable-asset blocker.

Regenerate with:

```sh
python3 tools/import-v3-sounds.py /path/to/shipped/Galactica.rsrc
```

`manifest.json` records source, resource, PCM and WAV hashes, frame counts and
sample rates. WAV requires an integer rate; the conversion rounds the original
16.16 rate to the nearest integer, changing playback speed by less than 0.003%.
All PCM bytes are copied unchanged. Discovery has two commands before its
sample data; the importer finds its buffer command rather than assuming a fixed
header position.
