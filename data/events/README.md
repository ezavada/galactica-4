# Event artwork

`victory.png` and `defeat.png` are unchanged copies of the final large outcome
images already retained in `old-art/Art/-final`. Source paths, SHA-256 hashes,
dimensions and v3 picture roles are recorded in `outcome-art.json`.

V3 PPob4000/4001 reference PICT4000/4001 for the affected player's victory and
defeat. The restored final images supply those roles in v4. The original Art
resource-fork files in the available v3 checkout are empty placeholders, so
this provenance identifies the retained final assets rather than claiming a
byte-for-byte match to the missing shipped resource forks.

The v3 repository README states: “The art assets are copyright Claudio Berni,
and must not be used without his permission.” The existing startup/About art
credits remain. These files retain the original artwork; they carry no new
license grant.

`explosions.png` is an unchanged copy of `old-art/PICT_1000_explosions.png`.
`explosion-art.json` records its provenance/hash. CDestructionMsg loads
PICT_Explosions (1000), splits it into eight subimages and displays each at
its original fixed size. The retained strip is 208×26, or eight 26×26 frames;
white is the source transparent color. V4 uses the source tick cadence and
keeps the procedural burst only as an unavailable-image/backend fallback.
The original art copyright notice above also applies to this strip.
