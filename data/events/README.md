# Event artwork

Hull illustrations, lab scenes, victory/defeat and stardock layers use the latest anime artwork. `../artwork.json` records active hashes and sources; generation prompts are retained in `../../old-art/art-styles/anime/generation.json`. The previous default and its original provenance records are preserved under `../../old-art/original-default/`.

`explosions.png` is an unchanged copy of `old-art/PICT_1000_explosions.png`.
`explosion-art.json` records its provenance/hash. CDestructionMsg loads
PICT_Explosions (1000), splits it into eight subimages and displays each at
its original fixed size. The retained strip is 208×26, or eight 26×26 frames;
white is the source transparent color. V4 uses the source tick cadence and
keeps the procedural burst only as an unavailable-image/backend fallback.
The original art copyright notice above also applies to this strip.
