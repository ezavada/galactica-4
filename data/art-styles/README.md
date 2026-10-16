# Galactica-4 artwork

The latest anime set is the default game artwork at the standard `data/events/` and `data/ships/` paths. There is no launch-time art selector. All previous sets, generation prompts and component layers are retained in `../../old-art/art-styles/`; the previous default artwork and provenance are in `../../old-art/original-default/`.

Build the browser version with `PDG_WASM_DIR=../pdg-devel/build/wasm/wasm32/release ./tools/build-web.sh`, then serve `dist` and open `http://localhost:8080/`.

## Side-by-side comparison

Open `http://localhost:8080/data/art-styles/` while serving the project or `dist`. The page compares anime, realistic and classic in three columns, includes every generated image, and composites stardock, research and movement scenes using the game’s original layer definitions. Choose hulls, research classes and space backgrounds, toggle layers, inspect full-resolution images and download composites. The page supports English, German, Spanish, French, Japanese and Russian.

The realistic hulls and lab were generated anew from engineering and architectural briefs. The fourth hull revision corrects Valkyrie's six wing roots around the aft ring, Avenger's cage symmetry, Scout's structural attachments, Raven's nested concentric rings, Riviel's continuous curved cup wing, and Banshee's upward nose angle. Original propulsion-effect textures remain unchanged in both game and gallery; hull framing preserves their alignment. Earlier realistic sets are preserved in `old-art/art-styles/realistic-v1/`, `old-art/art-styles/realistic-v2/` and `old-art/art-styles/realistic-v3/`. The lab and photographic victory/defeat scenes are retained.

The anime stardock background is simplified, darker and softer to give the ship more emphasis. Anime victory/defeat skin tones are subtly browner and less orange; the previous anime set is preserved in `old-art/art-styles/anime-v1/`. Classic is unchanged. Each set’s `generation.json` records the selected prompts, source/reference roles, export method and checksums.

`node tools/build-art-gallery.cjs` refreshes the gallery’s layer manifest when the game’s shipped layer definitions change; the web build also runs it.

## Previews and prompts

| Style | Hull preview | Generation prompts |
| --- | --- | --- |
| Anime | [Preview](../../old-art/art-styles/anime/hulls-preview.jpg) | [Prompts](../../old-art/art-styles/anime/generation.json) |
| Realistic | [Preview](../../old-art/art-styles/realistic/hulls-preview.jpg) | [Prompts](../../old-art/art-styles/realistic/generation.json) |
| Classic | [Preview](../../old-art/art-styles/classic/hulls-preview.jpg) | [Prompts](../../old-art/art-styles/classic/generation.json) |

## Layout

Each style has its own `events/`, `events/layers/` and `ships/` directories. Thirteen hull sprites correspond to PICT 3000–3012: satellite, scout, colony, traveller, rama, falcon, hawk, raven, riviel, wolven, valkyrie, avenger and banshee. Named `ships/` copies are provided for inspection/reuse; the current game renders the `events/layers/` copies.

Hull and scene layer frames are 1632×960 (four times the source width/height); outcomes are 1500×1296 (three times). Hulls and foregrounds have true alpha. Existing class-specific additive blueprints/effects stay in the layer stack, and the original class fallback rules are preserved.

These are AI-generated redraws, not lossless upscales; small surface details can differ. The classic set aims to retain the original design and palette. `generation.json` records the final prompts, source files and output checksums. The original artwork's attribution and rights are documented in `../../ASSET_RIGHTS.md` (from the repository root) and `../events/README.md`.

## Verification

`node tools/test-art-resources.cjs` verifies active and archived hashes, alpha roles and preservation of the previous default.
`./gad4 tools/test-art-style-images.js` verifies PDG decoding, alpha transparency,
cache reuse, alpha-safe loading and the archived Riviel interior surface.

`node tools/test-web-art-gallery.cjs dist /tmp/galactica-gallery-check` verifies
all artwork, scene selectors and layer toggles, image viewing/export and six languages
in headless Chrome.

Riviel's cup wing and central core were generated as separate transparent components and composited. Its lower inner rim is a smooth continuous curve without a nodule, and the wing-tip braces are removed; connections remain at the central hub. Component PNGs, their prompts and the previous composite are saved in `old-art/art-styles/realistic/ships/riviel-layers/`. The realistic archive keeps the flattened composite; the propulsion effects remain the originals.
