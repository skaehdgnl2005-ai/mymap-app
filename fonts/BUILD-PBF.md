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

Pretendard is MIT-licensed. Get the latest release:

```bash
# Option A: from GitHub releases
curl -L -o Pretendard.zip \
  https://github.com/orioncactus/pretendard/releases/latest/download/Pretendard-Web.zip
unzip Pretendard.zip -d ./pretendard-source

# Option B: via npm
npm install pretendard
# Then copy node_modules/pretendard/dist/web/static/pretendard-*.ttf
```

You only need these weights for v1:

| Weight | File | Used for |
|---|---|---|
| 400 (Regular) | `Pretendard-Regular.ttf` | Body, most map labels |
| 500 (Medium) | `Pretendard-Medium.ttf` | Emphasized labels (구, 동, subway stations) |
| 700 (Bold) | `Pretendard-Bold.ttf` | UI headings, primary CTA text |
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

```bash
npm install -g fontnik
```

Or use the build-glyphs CLI it ships with:

```bash
npm install -g @mapbox/build-glyphs
```

---

## Step 3 — Generate PBFs

```bash
mkdir -p ./build/glyphs/Pretendard\ Regular
mkdir -p ./build/glyphs/Pretendard\ Medium
mkdir -p ./build/glyphs/Pretendard\ Bold

build-glyphs ./pretendard-source/Pretendard-Regular.ttf \
  "./build/glyphs/Pretendard Regular"

build-glyphs ./pretendard-source/Pretendard-Medium.ttf \
  "./build/glyphs/Pretendard Medium"

build-glyphs ./pretendard-source/Pretendard-Bold.ttf \
  "./build/glyphs/Pretendard Bold"
```

This generates 256 PBF files per font, one per Unicode range
(`0-255.pbf`, `256-511.pbf`, etc., up to `65280-65535.pbf`).

Total disk: ~6-8 MB per font weight after building (Korean glyphs are
heavier than Latin).

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

| Asset | Approx size |
|---|---|
| sprite.json + sprite.png + @2x + @3x | ~80 KB |
| Pretendard Regular PBFs | ~7 MB |
| Pretendard Medium PBFs | ~7 MB |
| Pretendard Bold PBFs | ~7 MB |
| **Total** | **~21 MB** |

Cloudflare R2 storage: $0.015/GB/month. v1 hosting cost for assets:
**~$0.0003/month.** Effectively free.
