#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUTPUT_DIR=${GALACTICA_WEB_OUTPUT:-"$PROJECT_DIR/dist"}
PDG_WASM_DIR=${PDG_WASM_DIR:-"$PROJECT_DIR/../pdg/build/wasm"}

if [ ! -f "$PDG_WASM_DIR/libpdg.js" ] || [ ! -f "$PDG_WASM_DIR/libpdg.wasm" ]; then
    echo "PDG WebAssembly artifacts were not found in $PDG_WASM_DIR" >&2
    echo "Set PDG_WASM_DIR or build PDG's Emscripten target first." >&2
    exit 1
fi

# Snapshot identity before generating files in a potentially unignored output dir.
app_revision=
app_dirty=false
if command -v git >/dev/null 2>&1 &&
   app_revision=$(git -C "$PROJECT_DIR" rev-parse --verify HEAD 2>/dev/null) &&
   app_status=$(git -C "$PROJECT_DIR" status --porcelain --untracked-files=normal 2>/dev/null); then
    if [ -n "$app_status" ]; then app_dirty=true; fi
else
    app_revision=
fi

# Only a canonical object ID may be embedded in executable JavaScript.
case "$app_revision" in *[!0123456789abcdefABCDEF]*) app_revision= ;; esac
if [ "${#app_revision}" -ne 40 ]; then app_revision=; fi

mkdir -p "$OUTPUT_DIR"
cp "$PROJECT_DIR/web/index.html" "$PROJECT_DIR/web/galactica-web.js" "$PROJECT_DIR/web/favicon.svg" "$OUTPUT_DIR/"
cp "$PDG_WASM_DIR/libpdg.js" "$PDG_WASM_DIR/libpdg.wasm" "$OUTPUT_DIR/"
cp "$PROJECT_DIR/main.js" "$OUTPUT_DIR/"
cp "$PROJECT_DIR/LICENSE" "$PROJECT_DIR/ASSET_RIGHTS.md" "$OUTPUT_DIR/"
cp -R "$PROJECT_DIR/src" "$OUTPUT_DIR/"
cp -R "$PROJECT_DIR/data" "$OUTPUT_DIR/"

ASSET_MANIFEST="$OUTPUT_DIR/galactica-assets.js"
PROJECT_PREFIX="$PROJECT_DIR/"
{
    if [ -n "$app_revision" ]; then
        printf 'window.GALACTICA_BUILD_INFO = {revision:"%s",dirty:%s};\n' "$app_revision" "$app_dirty"
    else
        printf 'window.GALACTICA_BUILD_INFO = null;\n'
    fi
    printf 'window.GALACTICA_ASSETS = [\n'
    find "$PROJECT_DIR/data" -type f | sort | while IFS= read -r file; do
        relative=${file#$PROJECT_PREFIX}
        printf '  "%s",\n' "$relative"
    done
    printf '];\n'
} > "$ASSET_MANIFEST"

echo "Built Galactica-4 web app in $OUTPUT_DIR"
echo "Serve it over HTTP, for example: python3 -m http.server --bind 127.0.0.1 --directory '$OUTPUT_DIR' 8080"
echo "Use query parameters for launch options, for example: http://localhost:8080/?lang=es&ai-autoplay=1&seed=424242"
