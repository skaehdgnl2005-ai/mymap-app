# Pretendard Glyph PBF Generation

The Style JSON references font names like `["Pretendard Regular"]`,
`["Pretendard Medium"]`, `["Pretendard Italic"]` in `text-font` properties.
Mapbox/MapLibre needs glyphs as PBF protobuf files (one PBF per Unicode
range, per font weight), not raw TTF files.

You generate these once, host them on the same self-hosted bucket as your
sprite, and reference via `__GLYPHS_URL__/{fontstack}/{range}.pbf` in the
Style JSON.

This keeps everything off Mapbox-hosted infrastructure (per the D10 sprite
portability lock — same principle).

---

## Step 1 — Get Pretendard

Pretendard ships under SIL OFL 1.1 (license file in the release zip).
Pull from the official upstream release — npm mirror packages strip the
license file and have unverified maintainer trust:

```bash
mkdir -p ./pretendard-source
curl -fsSL -o ./pretendard-source/Pretendard.zip \
  https://github.com/orioncactus/pretendard/releases/download/v1.3.9/Pretendard-1.3.9.zip
```

**Zip layout note (Pretendard 1.3.x):** The canonical static fonts ship as
**OTF** under `public/static/Pretendard-{weight}.otf`. There ARE static
TTFs in the zip but only under `public/static/alternative/` — that is the
*alternative numeral style* (different default `1`/`0` glyphs), wrong for
this app's number-heavy address rendering. Use the canonical OTFs:

```bash
unzip -j -o ./pretendard-source/Pretendard.zip \
  "public/static/Pretendard-Regular.otf" \
  "public/static/Pretendard-Medium.otf" \
  "public/static/Pretendard-Bold.otf" \
  "LICENSE.txt" \
  -d ./pretendard-source/
```

`fontnik` accepts OTF identically to TTF (both routed through freetype).
Record the per-file SHA256 in PROJECT_STATE.md for future rebuild
reproducibility — the upstream release predates GitHub's per-asset digest
field, so verification is local-only.

You only need these weights for v1:

| Weight | File | Used for |
|---|---|---|
| 400 (Regular) | `Pretendard-Regular.otf` | Body, most map labels |
| 500 (Medium) | `Pretendard-Medium.otf` | Emphasized labels (구, 동, subway stations) |
| 700 (Bold) | `Pretendard-Bold.otf` | UI headings, primary CTA text |
| 400 italic | (see below) | Park / water labels (D11 lock — italic = natural features) |

**Note on italic:** Pretendard does NOT ship an italic style — it's a
geometric sans-serif. For the italic park labels, options are:

1. **Apply CSS-style italic transform** at runtime in the symbol layer
   (`text-rotation` is NOT the same as italic; you want oblique).
   Mapbox doesn't natively support oblique text — workaround is to ship
   a separate font face. Skip for v1.
2. **Use a different italic font for park labels only** — e.g.,
   `IBM Plex Sans KR Italic` or `Noto Serif KR Italic`. Adds one more PBF
   set to host but solves the visual differentiation cleanly.
3. **Skip italic for v1.** Park labels render as Pretendard Regular at
   `parks_dark` color (#6B7561 light / #7A8472 dark). Color carries the
   "natural feature" signal even without italic. Re-evaluate post-launch.

Recommended for v1: **option 3** (skip italic, color carries the signal).
If you want strict spec fidelity, do option 2 with IBM Plex Sans KR Italic
as the natural-feature font. Update `style-{light,dark}.json` `park-label`
layer's `text-font` to `["IBM Plex Sans KR Italic"]` if you go that route.

---

## Step 2 — Install fontnik

`fontnik` is the canonical Mapbox tool for generating PBF glyph ranges.
It ships the `build-glyphs` CLI as a binary.

```bash
npm install -g fontnik
```

**Windows note:** fontnik 0.7.x ships prebuilt binaries for darwin and
linux only — Windows installs fall back to compiling from source via
node-gyp, which requires Visual Studio Build Tools (~5 GB install). The
clean fallback that preserves the doc-stated tool exactly is to run
fontnik in a Linux container; PBF output is deterministic regardless of
host OS. See "Step 3 alt — fontnik in Docker (Windows)" below.

---

## Step 3 — Generate PBFs (macOS / Linux)

```bash
mkdir -p ./build/glyphs/Pretendard\ Regular
mkdir -p ./build/glyphs/Pretendard\ Medium
mkdir -p ./build/glyphs/Pretendard\ Bold

build-glyphs ./pretendard-source/Pretendard-Regular.otf \
  "./build/glyphs/Pretendard Regular"

build-glyphs ./pretendard-source/Pretendard-Medium.otf \
  "./build/glyphs/Pretendard Medium"

build-glyphs ./pretendard-source/Pretendard-Bold.otf \
  "./build/glyphs/Pretendard Bold"
```

This generates 256 PBF files per font, one per Unicode range
(`0-255.pbf`, `256-511.pbf`, etc., up to `65280-65535.pbf`).

Total disk: ~6-9 MB per font weight after building (Korean glyphs are
heavier than Latin — Hangul ranges hit ~170 KB per PBF).

---

## Step 3 alt — fontnik in Docker (Windows)

Use any Linux-glibc Node base image. PBF output is deterministic, so
build artifacts produced in the container are byte-identical to what a
host install would produce.

```bash
# From repo root. MSYS_NO_PATHCONV=1 is required in Git Bash to stop
# MSYS from rewriting /work/... → C:/Program Files/Git/work/... in the
# arguments docker.exe receives.
export MSYS_NO_PATHCONV=1

docker run --rm \
  -v "/c/dev/mymap-app/build:/work/out" \
  -v "/c/Users/skaeh/pretendard-source/extracted:/work/fonts:ro" \
  node:24-slim bash -c '
    set -e
    npm install -g fontnik
    mkdir -p "/work/out/glyphs/Pretendard Regular" \
             "/work/out/glyphs/Pretendard Medium" \
             "/work/out/glyphs/Pretendard Bold"
    for w in Regular Medium Bold; do
      build-glyphs "/work/fonts/Pretendard-$w.otf" "/work/out/glyphs/Pretendard $w"
    done
  '
```

Adjust the two `-v` paths to your host layout. The container drops the
PBFs to your host `build/glyphs/` directory via the bind mount.

---

## Step 4 — Upload to your CDN

Same self-hosted bucket as the sprite (R2, Supabase Storage, S3).

```bash
# Example: Cloudflare R2 with rclone
rclone sync ./build/glyphs/ r2:your-bucket/fonts/v1/ --progress
```

URL pattern after upload (Mapbox auto-substitutes `{fontstack}` and `{range}`):

```
https://cdn.yourapp.com/fonts/v1/Pretendard%20Regular/0-255.pbf
https://cdn.yourapp.com/fonts/v1/Pretendard%20Regular/256-511.pbf
...
https://cdn.yourapp.com/fonts/v1/Pretendard%20Medium/0-255.pbf
...
```

---

## Step 5 — Update Style JSON

In both `spec/style-light.json` and `spec/style-dark.json`, replace the
`__GLYPHS_URL__` placeholder with your CDN base URL:

```jsonc
{
  "glyphs": "https://cdn.yourapp.com/fonts/v1/{fontstack}/{range}.pbf"
}
```

Mapbox/MapLibre handles the URL encoding of font names internally.

---

## Cache headers

Set `Cache-Control: public, max-age=31536000, immutable` on every PBF.
The `/v1/` in the URL path is the cache-busting mechanism — bump to
`/v2/` when you update Pretendard or change the font family.

---

## Total v1 hosting footprint

Measured against Pretendard 1.3.9 (canonical OTFs):

| Asset | Measured size |
|---|---|
| sprite.json + sprite.png + @2x + @3x | ~6 KB |
| Pretendard Regular PBFs (256 files) | 8.7 MB |
| Pretendard Medium PBFs (256 files) | 8.7 MB |
| Pretendard Bold PBFs (256 files) | 8.9 MB |
| **Total** | **~26 MB** |

Cloudflare R2 storage: $0.015/GB/month. v1 hosting cost for assets:
**~$0.0004/month.** Effectively free.
