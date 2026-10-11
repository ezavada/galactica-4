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
source hashes. All three cues are now installed: 1004 for the affected player's
defeat, 1005 for the winner, and 1006 for observers of a defeat. Observer wins
and draws have no source cue. Cue 1005 preserves its original unsigned 8-bit
PCM; MACE 6:1 cues 1004/1006 use the decoder's full signed 16-bit PCM output.
`outcome-manifest.json` records their source/resource/PCM/WAV hashes, sample
counts, widths and decoder version separately from the application-bundle set.
Their absence from the application bundle is not an unavailable-asset blocker.

Regenerate these three cues from an original release ZIP with an FFmpeg build
that supports AIFF-C/MACE6 decoding and PCM WAV output:

```sh
python3 tools/import-v3-outcome-sounds.py /path/to/gad-3.0.2-cdrom.zip data/sounds --ffmpeg /path/to/ffmpeg
```

The compressed cue importer validates the shipped buffer/codec header and
packet count before wrapping the unchanged compressed bytes in AIFF-C.
FFmpeg decodes those bytes; canonical WAV output preserves all decoded samples.
The standard victory cue is copied byte-for-byte. This does not yet convert
the separate note-based startup/About music track.

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

The note-based startup/About composition can now be exported to standard MIDI:

```sh
python3 tools/export-v3-startup-midi.py /path/to/gad-3.0.2-cdrom.zip /tmp/galactica-startup.mid
python3 tools/test-export-v3-startup-midi.py
```

The exporter decodes the original QuickTime NoteRequest, note, extended note,
volume and sustain events using Apple's QuickTimeMusic.h definitions. Its two
parts request General MIDI instruments 1 and 45 (MIDI programs 0 and 44).
It retains all 967 notes and 15 controllers without quantization. The MIDI
uses 600 ticks per quarter note at one quarter note per second, matching the
movie's media clock. All six original editions export identically.

The source movie loops after 58007 ticks (96.678333 seconds), while its final
notes extend to 58721 ticks. MIDI preserves those complete note durations;
audio rendering must use the movie's shorter loop boundary. This export is
an intermediate conversion, not a finished playback asset. Instrument synthesis,
looped startup/About playback and the original five-second dismissal fade
remain to be implemented. No new asset license is granted; see ASSET_RIGHTS.md.
