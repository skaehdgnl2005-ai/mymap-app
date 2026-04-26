# Phase 2: Asset Hosting

**Detail level:** Medium (expand at kickoff if you want full detail)
**Estimated duration:** 1-2 working days

## Project context

Spec is locked, project scaffolded. Now we host the runtime assets
(sprite + Pretendard glyph PBFs) on a CDN and update the Style JSON
URL placeholders. Per the D10 portability lock: nothing Mapbox-hosted
in production. Self-host on R2 (recommended) or Supabase Storage.

## Locked decisions referenced

- DESIGN.md § D10 Sprite pipeline: 9 SVG canonical sources →
  spreet → self-hosted sprite sheet
- `sprites/build-sprites.sh`: spreet invocation pattern
- `fonts/BUILD-PBF.md`: fontnik commands for Pretendard glyphs
- README.md § Migration checklist: keep all asset URLs portable

## Prerequisites from previous phases

- Phase 1 complete: project scaffolded, project root writable
- Mapbox Downloads token in `~/.gradle/gradle.properties` (Phase 1
  Step 8) for Android Mapbox SDK download

## This phase's goal

`spec/style-light.json` and `spec/style-dark.json` reference sprite +
glyph URLs at a self-hosted CDN. Both URLs respond 200 to HTTPS
requests. Map renders icons + Korean labels correctly when loaded in
Phase 4.

## Concrete tasks

1. **Decide CDN provider** — Cloudflare R2 (recommended; cheapest
   egress, fast global CDN) or Supabase Storage (one-vendor if Phase 3
   commits to Supabase). Lock decision in PROJECT_STATE.md → Open
   decisions.

2. **Provision bucket** with public read access. URL pattern:
   - R2: `https://<custom-domain>/sprites/v1/sprite` and
     `https://<custom-domain>/fonts/v1/{fontstack}/{range}.pbf`
   - Supabase Storage: `https://<project>.supabase.co/storage/v1/object/public/<bucket>/sprites/v1/sprite`

3. **Build sprite** — run `bash sprites/build-sprites.sh`. Output:
   `build/sprite.json`, `build/sprite.png`, `build/sprite@2x.{json,png}`,
   `build/sprite@3x.{json,png}`. Verify all 9 icons appear in
   `sprite.json`.

4. **Generate Pretendard PBFs** — follow `fonts/BUILD-PBF.md`. Install
   fontnik, download Pretendard TTFs, generate per font weight:
   - Pretendard Regular (400) — 256 PBF files
   - Pretendard Medium (500) — 256 PBF files
   - Pretendard Bold (700) — 256 PBF files

5. **Upload to CDN.** Use rclone or wrangler. Set
   `Cache-Control: public, max-age=31536000, immutable` on every file.

6. **Update Style JSON URLs.** Replace `__SPRITE_URL__` and
   `__GLYPHS_URL__` placeholders in:
   - `spec/style-light.json`
   - `spec/style-dark.json`
   With the CDN base URLs (no extension; Mapbox auto-appends).

7. **Verify** by hitting URLs in a browser:
   - `https://<cdn>/sprites/v1/sprite.json` returns the sprite manifest
   - `https://<cdn>/sprites/v1/sprite.png` returns the sprite atlas
   - `https://<cdn>/fonts/v1/Pretendard%20Regular/0-255.pbf` returns
     binary PBF (not 404)

8. **Commit Style JSON updates** — `spec/style-*.json` are decision
   artifacts, but URL substitutions are part of project setup. Commit
   with message `chore: wire up self-hosted sprite + glyph URLs`.

## Verification

- [ ] Both sprite.json + sprite.png URLs return 200 OK
- [ ] At least one Pretendard glyph PBF URL returns 200 OK with
      content-type `application/x-protobuf`
- [ ] `style-light.json` and `style-dark.json` no longer contain
      `__SPRITE_URL__` or `__GLYPHS_URL__` placeholders
- [ ] CDN bucket cache headers verified (use `curl -I`)
- [ ] Total hosted asset size logged in PROJECT_STATE.md (should be
      ~21MB per fonts/BUILD-PBF.md estimate)

## Anti-patterns

- Do NOT host on Mapbox infrastructure (defeats D10 portability lock)
- Do NOT skip the version path segment (`/v1/`) — it's the cache-busting
  mechanism for asset updates
- Do NOT commit sprite/font binaries to git (use `.gitignore`)

## Handoff

When complete, update PROJECT_STATE.md with:
- CDN provider chosen
- Bucket name + custom domain (if any)
- Hosted asset URLs (root, not full paths)
- Total hosting size
- Estimated monthly cost (should be effectively free at v1 scale)

Then: `ln -sf phase-3-backend.md phases/CURRENT_PHASE.md`

## Expansion hints (when expanding to full detail)

If you want full-detail expansion, focus on:
- Exact rclone / wrangler commands for upload
- R2 custom domain setup vs default `*.r2.dev` URLs
- Supabase Storage bucket policy SQL (RLS for public read)
- Cache-Control header verification commands
- Sprite atlas visual verification (open `sprite.png` in an image viewer
  and confirm 9 icons are present and recognizable)
