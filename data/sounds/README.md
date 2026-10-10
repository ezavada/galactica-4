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

The event table references outcome sounds 1004–1006, but neither shipped
edition contains those resources. They have no confirmed sample to port.

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
