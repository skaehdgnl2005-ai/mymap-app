#!/usr/bin/env bash
# Upload Phase 2 assets (sprite + Pretendard glyph PBFs) to Cloudflare R2.
#
# Usage:
#   bash scripts/upload-assets.sh             # live upload to R2
#   bash scripts/upload-assets.sh --dry-run   # echo wrangler commands only
#
# Path mapping (build/ -> R2 key):
#   build/sprite.json                    -> sprites/v1/sprite.json
#   build/sprite.png                     -> sprites/v1/sprite.png
#   build/sprite@2x.{json,png}           -> sprites/v1/sprite@2x.{json,png}
#   build/sprite@3x.{json,png}           -> sprites/v1/sprite@3x.{json,png}
#   build/glyphs/<fontstack>/<range>.pbf -> fonts/v1/<fontstack>/<range>.pbf
#
# Prerequisites for live mode:
#   1. wrangler installed locally:  pnpm add -D wrangler
#   2. Authenticated:               pnpm exec wrangler login
#                                   (or set CLOUDFLARE_API_TOKEN env var)
#   3. Bucket exists:               mymap-assets (configurable via BUCKET env)
#
# Idempotent — wrangler r2 object put overwrites on conflict, so re-running
# after a partial failure is safe.
#
# Reproducibility — version-specific behavior is captured at the top
# (BUCKET, SPRITE_VERSION, FONT_VERSION). Bump the *_VERSION vars when
# uploading a new generation of assets to a different URL path.

set -euo pipefail

# ----- Config ------------------------------------------------------------
BUCKET="${BUCKET:-mymap-assets}"
SPRITE_VERSION="${SPRITE_VERSION:-v1}"
FONT_VERSION="${FONT_VERSION:-v1}"
CACHE_CONTROL="public, max-age=31536000, immutable"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="${BUILD_DIR:-$PROJECT_ROOT/build}"

# Git Bash MSYS rewrites Unix-looking paths in args passed to win32 .exe
# binaries. wrangler.exe is one such target; without this the R2 key would
# get mangled to e.g. C:/Program Files/Git/sprites/v1/sprite.json.
export MSYS_NO_PATHCONV=1

DRY_RUN=0
case "${1:-}" in
  --dry-run) DRY_RUN=1 ;;
  "")        DRY_RUN=0 ;;
  *)
    echo "ERROR: unknown argument '$1' — expected --dry-run or no args" >&2
    exit 2
    ;;
esac

# ----- Prereqs (live mode only) -----------------------------------------
WRANGLER=""
if [ "$DRY_RUN" -eq 0 ]; then
  if pnpm exec wrangler --version >/dev/null 2>&1; then
    WRANGLER="pnpm exec wrangler"
  elif command -v wrangler >/dev/null 2>&1; then
    WRANGLER="wrangler"
  else
    echo "ERROR: wrangler not installed." >&2
    echo "  install: pnpm add -D wrangler" >&2
    echo "  authenticate: pnpm exec wrangler login" >&2
    echo "  (or set CLOUDFLARE_API_TOKEN env var)" >&2
    exit 1
  fi
fi

if [ ! -d "$BUILD_DIR" ]; then
  echo "ERROR: build dir not found: $BUILD_DIR" >&2
  echo "  run sprites/build-sprites.sh and fonts/BUILD-PBF.md steps first" >&2
  exit 1
fi

# ----- Helpers -----------------------------------------------------------
content_type_for() {
  case "$1" in
    *.json) echo "application/json" ;;
    *.png)  echo "image/png" ;;
    *.pbf)  echo "application/x-protobuf" ;;
    *)      echo "application/octet-stream" ;;
  esac
}

human_bytes() {
  if command -v numfmt >/dev/null 2>&1; then
    numfmt --to=iec --suffix=B --format='%.2f' "$1"
  else
    echo "${1}B"
  fi
}

# ----- Build manifest ----------------------------------------------------
# Pair arrays: LOCAL_PATHS[i] uploads to REMOTE_KEYS[i].
LOCAL_PATHS=()
REMOTE_KEYS=()

# Sprite files: build/sprite*.{json,png} -> sprites/<ver>/sprite*.{json,png}
shopt -s nullglob
for f in "$BUILD_DIR"/sprite*.json "$BUILD_DIR"/sprite*.png; do
  LOCAL_PATHS+=("$f")
  REMOTE_KEYS+=("sprites/$SPRITE_VERSION/$(basename "$f")")
done
shopt -u nullglob

# Glyph PBFs: build/glyphs/<fontstack>/<range>.pbf -> fonts/<ver>/<fontstack>/<range>.pbf
# find -print0 + read -d '' to handle spaces in "Pretendard Regular" etc.
if [ -d "$BUILD_DIR/glyphs" ]; then
  while IFS= read -r -d '' f; do
    rel="${f#"$BUILD_DIR/glyphs/"}"   # e.g. "Pretendard Regular/0-255.pbf"
    LOCAL_PATHS+=("$f")
    REMOTE_KEYS+=("fonts/$FONT_VERSION/$rel")
  done < <(find "$BUILD_DIR/glyphs" -type f -name '*.pbf' -print0 | sort -z)
fi

TOTAL=${#LOCAL_PATHS[@]}
if [ "$TOTAL" -eq 0 ]; then
  echo "ERROR: no upload candidates found under $BUILD_DIR/" >&2
  exit 1
fi

# ----- Header ------------------------------------------------------------
echo "Bucket:       $BUCKET"
echo "Sprite ver:   $SPRITE_VERSION  (R2 prefix: sprites/$SPRITE_VERSION/)"
echo "Font ver:     $FONT_VERSION  (R2 prefix: fonts/$FONT_VERSION/)"
echo "Build dir:    $BUILD_DIR"
echo "Cache-Ctrl:   $CACHE_CONTROL"
echo "Total files:  $TOTAL"
if [ "$DRY_RUN" -eq 1 ]; then
  echo "Mode:         DRY-RUN (no network calls)"
else
  echo "Mode:         LIVE upload via $WRANGLER"
fi
echo ""

# ----- Upload loop -------------------------------------------------------
START_EPOCH=$(date +%s)
TOTAL_BYTES=0
N=0

for ((i=0; i<TOTAL; i++)); do
  f="${LOCAL_PATHS[$i]}"
  key="${REMOTE_KEYS[$i]}"
  ct="$(content_type_for "$f")"
  size="$(stat -c%s "$f" 2>/dev/null || stat -f%z "$f")"
  N=$((N+1))
  TOTAL_BYTES=$((TOTAL_BYTES + size))

  printf "[%3d/%3d] %s  (%s, %s)\n" "$N" "$TOTAL" "$key" "$ct" "$(human_bytes "$size")"

  # wrangler.exe is a native Windows binary; under MSYS_NO_PATHCONV=1 the
  # /c/... path lands at the binary verbatim, which wrangler can't open.
  # Convert ONLY the file path. R2 keys ($BUCKET/$key) stay untouched so
  # MSYS can't mangle them.
  if command -v cygpath >/dev/null 2>&1; then
    file_arg="$(cygpath -w "$f")"
  else
    file_arg="$f"
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    printf "          (dry-run) wrangler r2 object put %q --file=%q --content-type=%q --cache-control=%q --remote\n" \
      "$BUCKET/$key" "$file_arg" "$ct" "$CACHE_CONTROL"
  else
    $WRANGLER r2 object put "$BUCKET/$key" \
      --file="$file_arg" \
      --content-type="$ct" \
      --cache-control="$CACHE_CONTROL" \
      --remote >/dev/null
  fi
done

ELAPSED=$(( $(date +%s) - START_EPOCH ))

# ----- Summary -----------------------------------------------------------
echo ""
echo "===== Summary ====="
echo "Files:    $N"
echo "Bytes:    $TOTAL_BYTES  ($(human_bytes "$TOTAL_BYTES"))"
echo "Elapsed:  ${ELAPSED}s"
if [ "$DRY_RUN" -eq 1 ]; then
  echo "Mode:     DRY-RUN — no objects uploaded"
  echo ""
  echo "When ready, re-run without --dry-run."
else
  echo "Mode:     LIVE"
  echo ""
  echo "Verify with:"
  echo "  curl -sI https://<r2-public-base>/sprites/$SPRITE_VERSION/sprite.json | head"
  echo "  curl -sI https://<r2-public-base>/fonts/$FONT_VERSION/Pretendard%20Regular/0-255.pbf | head"
fi
