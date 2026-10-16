#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUTPUT_DIR=${GALACTICA_WEB_OUTPUT:-"$PROJECT_DIR/dist"}
PDG_CACHE_DIR=${PDG_CACHE_DIR:-"$PROJECT_DIR/.pdg"}
REFRESH_PDG=0

if [ "${1:-}" = "--refresh-pdg" ]; then
    REFRESH_PDG=1
    shift
fi

if [ "$#" -ne 0 ]; then
    echo "Usage: $0 [--refresh-pdg]" >&2
    exit 2
fi

PDG_SOURCE=${PDG_SOURCE:-release}
case "$PDG_SOURCE" in
    release|devel) ;;
    *) echo "PDG_SOURCE must be release or devel" >&2; exit 2 ;;
esac
if [ "$PDG_SOURCE" = devel ] && [ "$REFRESH_PDG" -eq 1 ]; then
    echo "--refresh-pdg requires PDG_SOURCE=release" >&2
    exit 2
fi
if [ -z "${PDG_WASM_DIR:-}" ] && [ "$PDG_SOURCE" = devel ]; then
    PDG_DEVEL_DIR=${PDG_DEVEL_DIR:-"$PROJECT_DIR/../pdg-devel"}
    PDG_WASM_DIR="$PDG_DEVEL_DIR/build/wasm/wasm32/release"
fi

if [ -z "${PDG_WASM_DIR:-}" ]; then
    # shellcheck disable=SC1091
    . "$PROJECT_DIR/tools/pdg-release.env"

    PDG_WASM_DIR="$PDG_CACHE_DIR/$PDG_VERSION/emscripten-wasm32"
    PDG_HASH_FILE="$PDG_WASM_DIR/.asset-sha256"
    CACHED_HASH=""
    if [ -f "$PDG_HASH_FILE" ]; then
        CACHED_HASH=$(sed -n '1p' "$PDG_HASH_FILE")
    fi

    if [ "$REFRESH_PDG" -eq 1 ] ||
       [ ! -f "$PDG_WASM_DIR/libpdg.js" ] ||
       [ ! -f "$PDG_WASM_DIR/libpdg.wasm" ] ||
       [ "$CACHED_HASH" != "$PDG_EMSCRIPTEN_WASM32_SHA256" ]; then
        command -v curl >/dev/null 2>&1 || {
            echo "curl is required to download PDG" >&2
            exit 1
        }
        command -v unzip >/dev/null 2>&1 || {
            echo "unzip is required to unpack PDG" >&2
            exit 1
        }

        TEMP_DIR=$(mktemp -d "${TMPDIR:-/tmp}/pdg-web.XXXXXX")
        trap 'rm -rf "$TEMP_DIR"' EXIT HUP INT TERM
        PDG_ARCHIVE="$TEMP_DIR/$PDG_EMSCRIPTEN_WASM32_ASSET"
        PDG_DOWNLOAD_URL="$PDG_REPOSITORY/releases/download/$PDG_TAG/$PDG_EMSCRIPTEN_WASM32_ASSET"

        echo "Downloading PDG $PDG_TAG Emscripten/Wasm32 runtime..."
        curl --fail --location --silent --show-error \
            --output "$PDG_ARCHIVE" "$PDG_DOWNLOAD_URL"

        if command -v shasum >/dev/null 2>&1; then
            ACTUAL_HASH=$(shasum -a 256 "$PDG_ARCHIVE" | awk '{print $1}')
        elif command -v sha256sum >/dev/null 2>&1; then
            ACTUAL_HASH=$(sha256sum "$PDG_ARCHIVE" | awk '{print $1}')
        else
            echo "shasum or sha256sum is required to verify PDG" >&2
            exit 1
        fi

        if [ "$ACTUAL_HASH" != "$PDG_EMSCRIPTEN_WASM32_SHA256" ]; then
            echo "PDG archive SHA-256 mismatch" >&2
            echo "Expected: $PDG_EMSCRIPTEN_WASM32_SHA256" >&2
            echo "Actual:   $ACTUAL_HASH" >&2
            exit 1
        fi

        unzip -q "$PDG_ARCHIVE" -d "$TEMP_DIR/unpacked"
        EXTRACTED_DIR="$TEMP_DIR/unpacked/${PDG_EMSCRIPTEN_WASM32_ASSET%.zip}"
        if [ ! -f "$EXTRACTED_DIR/libpdg.js" ] ||
           [ ! -f "$EXTRACTED_DIR/libpdg.wasm" ] ||
           [ ! -f "$EXTRACTED_DIR/VERSION" ] ||
           [ "$(sed -n '1p' "$EXTRACTED_DIR/VERSION")" != "$PDG_VERSION" ]; then
            echo "PDG archive does not contain the expected $PDG_VERSION web runtime" >&2
            exit 1
        fi

        mkdir -p "$PDG_WASM_DIR"
        cp -R "$EXTRACTED_DIR/." "$PDG_WASM_DIR/"
        printf '%s\n' "$PDG_EMSCRIPTEN_WASM32_SHA256" > "$PDG_HASH_FILE"
    fi
fi

if [ ! -f "$PDG_WASM_DIR/libpdg.js" ] || [ ! -f "$PDG_WASM_DIR/libpdg.wasm" ]; then
    echo "PDG WebAssembly artifacts were not found in $PDG_WASM_DIR" >&2
    echo "Set PDG_WASM_DIR to a directory containing libpdg.js and libpdg.wasm" >&2
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
node "$PROJECT_DIR/tools/build-art-gallery.cjs"
# Remove superseded art copies from an earlier build before copying the active layout.
for style in anime anime-v1 realistic realistic-v1 realistic-v2 realistic-v3 classic; do
    rm -rf "$OUTPUT_DIR/data/art-styles/$style"
done
rm -f "$OUTPUT_DIR/src/js/art-styles.js" "$OUTPUT_DIR/data/events/layers/provenance.json"
for hull in avenger banshee valkyrie wolven; do
    rm -f "$OUTPUT_DIR/data/ships/$hull-alpha.png"
done
cp -R "$PROJECT_DIR/data" "$OUTPUT_DIR/"
mkdir -p "$OUTPUT_DIR/old-art"
cp -R "$PROJECT_DIR/old-art/art-styles" "$PROJECT_DIR/old-art/original-default" "$OUTPUT_DIR/old-art/"

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
