# Personal-Curated-Map Spec — v1

A Toss-style minimal map for Korean Gen Z users to save and revisit places
they discover on Instagram, Threads, and Naver/Kakao Place pages.

This folder is the **implementation-ready spec** produced by `/office-hours`
on 2026-04-26. It is *configuration and design tokens*, not a working app —
drop it into your React Native project, host the assets, and your map renders
with all v1 visual + interaction decisions intact.

---

## Stack (v1)

| Layer | Choice | Why |
|---|---|---|
| Renderer | `@rnmapbox/maps` + Mapbox tiles | Most mature RN map library; free tier covers v1 (≤50k MAU); Mapbox Studio is the best designer tool |
| POI / search / geocode | Kakao Local API | Licensing permits custom-rendered display with attribution; 100k requests/day free |
| Typography | Pretendard (MIT) | Modern Korean-first sans-serif, optical sizing for small map labels |
| Backend | TBD (Supabase or Firestore) | Schema is provider-agnostic |
| Mobile | React Native + Expo | Cross-platform, Expo handles share-extension complexity |

**Post-PMF (v2): migrate to MapLibre + MapTiler** — Style JSON is written to
Mapbox Style Spec v8 which MapLibre v3+ supports natively. See migration
checklist below.

---

## What's in this folder

```
.
├── DESIGN.md                    Full design doc with D1-D11 rationale
├── README.md                    This file
│
├── spec/
│   ├── style-light.json         Mapbox Style Spec v8 (light mode)
│   ├── style-dark.json          Mapbox Style Spec v8 (dark mode)
│   ├── tokens.json              Color + typography + spacing tokens
│   ├── data-shapes.ts           SavedPlace TypeScript type + GeoJSON helper
│   ├── implementation.tsx       @rnmapbox/maps integration reference
│   └── CHANGELOG.md             Versioning placeholder
│
├── sprites/
│   ├── *.svg                    9 single-outline geometric icons
│   └── build-sprites.sh         spreet command + R2 upload reference
│
└── fonts/
    └── BUILD-PBF.md             fontnik commands for Pretendard PBFs
```

---

## Setup (one-time)

1. **Generate Pretendard glyph PBFs.** See `fonts/BUILD-PBF.md`. Output: a
   directory of `.pbf` files per font weight + Unicode range.

2. **Build the sprite sheet.** See `sprites/build-sprites.sh`. Output:
   `sprite.json`, `sprite.png`, `sprite@2x.png`, `sprite@3x.png`.

3. **Self-host the assets.** Recommended: Cloudflare R2 (cheapest egress
   for static assets) or Supabase Storage. URL pattern:
   ```
   https://cdn.yourapp.com/sprites/v1/sprite        (Mapbox auto-appends extensions)
   https://cdn.yourapp.com/fonts/v1/{fontstack}/{range}.pbf
   ```

4. **Update sprite + glyph URLs** in `spec/style-light.json` and
   `spec/style-dark.json`. Search for `__SPRITE_URL__` and `__GLYPHS_URL__`
   placeholders and replace with your actual hosted URLs.

5. **Add to your RN project.** Copy `spec/` to your project, follow the
   integration pattern in `spec/implementation.tsx`.

6. **Set Mapbox public token** in your RN app initialization. Get one from
   `account.mapbox.com/access-tokens/`.

7. **Set Kakao REST API key** as an env var. Get one from
   `developers.kakao.com`.

---

## Migration checklist (Mapbox runtime → MapLibre + MapTiler post-PMF)

When you cross ~50k MAU and Mapbox economics change, migrate:

- [ ] **Provision MapTiler account.** Get an API key at `cloud.maptiler.com`.
      Pick the "Streets v2" tile source (closest visual parity to Mapbox).
- [ ] **Replace tile source URL** in `style-light.json` and `style-dark.json`.
      Mapbox: `mapbox://mapbox.mapbox-streets-v8`. MapTiler:
      `https://api.maptiler.com/tiles/v3/tiles.json?key=YOUR_KEY`.
- [ ] **Update `sources.{...}.attribution`** to credit MapTiler + OpenStreetMap.
- [ ] **Sprite URL: no change** — already self-hosted per D10 portability lock.
- [ ] **Glyph URL: no change** — already self-hosted.
- [ ] **Run feature compat check** against MapLibre v3 spec. The locked spec
      avoids `model` layers and `terrain` 3D extrusions, so v1 should be
      compatible. Verify with `npx @maplibre/maplibre-gl-style-spec validate
      style-light.json`.
- [ ] **Replace RN library:** `@rnmapbox/maps` → `@maplibre/maplibre-react-native`.
      Component names mostly match (`MapView`, `Camera`, `ShapeSource`,
      `SymbolLayer`); update import paths in `implementation.tsx`.
- [ ] **Test on device.** Verify zoom rules, pin rendering, cluster behavior,
      transfer-station highlighting, search overlay all carry over.
- [ ] **Update Mapbox attribution** — remove Mapbox logo from app UI, add
      MapTiler logo + OpenStreetMap attribution per their TOS.

Estimated effort if all decisions hold: **2-3 days end-to-end**, half of which
is on-device testing across Korean cities.

---

## Decision log

See `DESIGN.md` for the full D1-D11 decision rationale, including what was
considered and rejected at each step.

If you're tuning a token (most likely `brand_indigo` post-launch — it always
gets tuned), log the change in `spec/CHANGELOG.md` so the next person to
touch this spec knows what shifted.

---

## Recommended next skills (after this spec)

Run via `/`-prefix in this Claude Code session:

1. **`/plan-eng-review`** — engineering review of architecture before
   implementation. Catches edge cases, perf concerns, sync conflicts.
2. **`/design-html`** — generate UI mockups for save flow + onboarding
   screens (the surfaces NOT covered by this map spec).
3. **Build v1** against this spec. Estimate: 4-6 weeks for a single founder
   working full time, assuming the save-flow validation prototype (see
   `DESIGN.md` § The Assignment) holds up.
