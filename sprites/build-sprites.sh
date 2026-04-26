#!/usr/bin/env bash
# Build the Mapbox/MapLibre sprite sheet from the 9 SVG sources.
#
# Output: sprite.json + sprite.png + sprite@2x.png + sprite@3x.png
# (and sprite@2x.json / sprite@3x.json for retina manifests)
#
# Upload the output to your self-hosted bucket (R2, Supabase Storage, S3),
# then update __SPRITE_URL__ in spec/style-light.json and spec/style-dark.json
# to match.

set -euo pipefail

# ----- Install spreet (one-time) -----------------------------------------
# Spreet is a Rust-based sprite generator that produces Mapbox-compatible
# sprite sheets. Faster + more reliable than Node alternatives.
#
#   cargo install spreet
#
# Or download a release binary from https://github.com/flother/spreet/releases
# Or via Homebrew on macOS:
#   brew install flother/taps/spreet

# ----- Build sprite ------------------------------------------------------

OUT_DIR="./build"
mkdir -p "$OUT_DIR"

# 1× (normal density)
spreet --unique \
  ./sprites \
  "$OUT_DIR/sprite"

# 2× (retina iOS / Android xxhdpi)
spreet --unique --retina \
  ./sprites \
  "$OUT_DIR/sprite@2x"

# 3× — Mapbox uses @2x as the highest tier by default; @3x is optional
# but improves crispness on iOS Plus/Pro models.
# Spreet 0.10+ supports @3x via --ratio 3:
spreet --unique --ratio 3 \
  ./sprites \
  "$OUT_DIR/sprite@3x" 2>/dev/null || echo "spreet --ratio not supported; skipping @3x (acceptable)"

echo ""
echo "Sprite output:"
ls -la "$OUT_DIR/"
echo ""

# ----- Upload to self-hosted CDN -----------------------------------------
# Example: Cloudflare R2 via wrangler (recommended for static assets —
# zero egress fees, fast CDN). Adapt to Supabase Storage or S3 as needed.
#
# Versioning: include a version in the URL path (sprites/v1/) so cache
# invalidation works across CDN edge nodes when icons are tuned later.

# wrangler r2 object put your-bucket/sprites/v1/sprite.json    --file="$OUT_DIR/sprite.json"
# wrangler r2 object put your-bucket/sprites/v1/sprite.png     --file="$OUT_DIR/sprite.png"
# wrangler r2 object put your-bucket/sprites/v1/sprite@2x.json --file="$OUT_DIR/sprite@2x.json"
# wrangler r2 object put your-bucket/sprites/v1/sprite@2x.png  --file="$OUT_DIR/sprite@2x.png"
# wrangler r2 object put your-bucket/sprites/v1/sprite@3x.json --file="$OUT_DIR/sprite@3x.json"
# wrangler r2 object put your-bucket/sprites/v1/sprite@3x.png  --file="$OUT_DIR/sprite@3x.png"

# ----- Cache headers (recommended) ---------------------------------------
# Set Cache-Control: public, max-age=31536000, immutable on each sprite file.
# The /v1/ in the URL path means we never need to invalidate; bumping to /v2/
# is the cache-busting mechanism on icon updates.

echo "After uploading, update __SPRITE_URL__ in spec/style-{light,dark}.json"
echo "with the base URL (no extension), e.g.:"
echo "  \"sprite\": \"https://cdn.yourapp.com/sprites/v1/sprite\""
echo ""
echo "Mapbox/MapLibre will auto-append .json, .png, @2x.png, @3x.png."
