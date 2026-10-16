# Shipped layer fallback artwork

Decoded without content edits from the AppleDouble art resource fork in the
original `gad-3.0.2-cdrom.zip`. PICT100 (the No Image fallback) is recovered from
`Resources/gal-non-module.r`. Regenerate with `tools/make-v3-layer-runtime.py`.
`provenance.json` identifies original PICT and exported PNG hashes and bounds.

The v3 README states: “The art assets are copyright Claudio Berni, and must
not be used without his permission.” These retained original assets carry
no new license grant. Existing startup/About credits remain in place.

The Lab continues to use its existing backdrop, foreground and blueprint PNGs;
these extra pictures supply the original decimal lookup fallback at research
levels outside the available Lab entries. Mode36 uses the resource's exact
transparent background color; mode33 uses additive blending.
