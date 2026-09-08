# Spec Changelog

Track tunings to the spec post-launch. The first thing that gets tuned is
almost always `brand_indigo` — log it here so the next person knows what
shifted.

Format: `## YYYY-MM-DD — {Author}` followed by a bullet list of changes
with rationale.

---

## 2026-05-17 — Mapbox `logoEnabled` flipped to `true` (TOS compliance)

Phase 10 kickoff TOS audit (research agent fetched Mapbox's attribution
docs). Verbatim findings:

- **Android (Maps SDK):** "By default, the Mapbox logo and information
  button are located on the bottom left of the map. You may move these
  elements to a different position, but they must stay on the map view."
  → wordmark required unconditionally.
- **iOS (Maps SDK):** info button optional, but if disabled "you must
  include attribution on the map in a text format. The attribution must
  include `© Mapbox` as a link to `https://www.mapbox.com/`." The
  `@rnmapbox/maps` v10 attribution renderer does not guarantee the
  click-through link, so the iOS carve-out is not safely usable.

The 3× boot warning `[maps-android\MbxLogo]: The Mapbox logo wordmark
must remain enabled in accordance with our Terms of Service` was an
accurate compliance signal from the SDK runtime, not cosmetic noise.

Changes:

- `spec/implementation.tsx` line 88: `logoEnabled={false}` →
  `logoEnabled={true}`; comment updated.
- Production code mirror in `src/map/PersonalMap.tsx` flipped in the
  same commit.

PROJECT_STATE.md cross-phase entry "Mapbox `MbxLogo`" reclassified from
ACTIVE compliance gate to RESOLVED.

---

## 2026-05-03 — Path A patch: align with mapbox-streets-v8 schema

Phase 4 visual verification revealed that the initial spec was authored
against OpenMapTiles schema conventions (`source-layer: "transportation"`,
`class=transit`, `ref` per-line metadata) but deployed against
`mapbox://mapbox.mapbox-streets-v8` which uses different schema
(`source-layer: "road"`, `class=major_rail`, no per-line ref for Korean
subway). Plus the park-label layer referenced a `Pretendard Italic` font
that doesn't exist in Phase 2's PBF set (Pretendard has no italic variant).

Changes (light + dark, mirrored):

- 4 road layers (`road-minor`, `road-collector`, `road-major`,
  `road-highway`): `source-layer` `transportation` → `road`. `class`
  filter values (`motorway`/`trunk`/`primary`/`secondary`/`tertiary`/
  `service`/`track`) unchanged — match v8 schema as-is.
- `subway-line-hub` + `subway-line-all` collapsed into single
  `subway-line` layer. Filter `class=transit` + `ref in [...]` →
  `class=major_rail`. Per-line color match expression dropped
  (`ref` field doesn't exist in v8 for Korean subway). Single grey
  `#888888` light / `#A0A0A0` dark. Z13+ visibility (z13/z14 hub-vs-all
  distinction not possible with v8 data — all rail is `major_rail`).
- `subway-station-regular` + `subway-station-transfer` collapsed into
  single `subway-station-dot` layer. Filter `mode=rail` + `transfer=*`
  → `stop_type=station OR !has stop_type` (v8 transit_stop_label has
  `stop_type` as stable field; `mode` and `transfer` not consistently
  populated for KR data). Transfer-station differentiation lost
  (v8 lacks `transfer` field).
- `subway-station-label-transfer` + `subway-station-label-regular`
  collapsed into single `subway-station-label` layer. Same filter
  rationale as station-dot. Font `Pretendard Medium` → `Pretendard
  Regular` for visual hierarchy parity with other place labels;
  text-halo-width tightened from 1.5 to 1.0.
- `park-label`: `text-font` `Pretendard Italic` → `Pretendard Regular`
  (Pretendard has no italic variant — Phase 2 PBF set is Regular/
  Medium/Bold only). Sage `#6B7561` text color preserved → still
  visually distinguishable from other place labels via color.
- `metadata` field `compatibility` split into `syntax_compatibility`
  + `source_schema` to make the JSON-syntax / vector-tile-schema
  distinction lexically explicit (the conflation that misled the
  Phase 0 spec author).

Two D11 deviations result, both deferred to v1.5 / MapLibre + MapTiler
migration trigger:

1. Subway lines display as single grey, no per-line color
   differentiation. The "한국 사용자가 환승역으로 길찾기" intent of D11
   degrades to "subway visible as background context" only.
2. Subway stations rendered without transfer-vs-regular size
   differentiation (D11's transfer-station spatial-anchor explicit
   intent). All stations same dot size, same label weight.

See PROJECT_STATE.md "D11 spec ↔ mapbox-streets-v8 schema mismatch"
cross-phase issue for the full deviation framing + visibility-timeline
guardrail + resolution path.

Spec metadata `syntax_compatibility` remains true (Style Spec v8 JSON
form is unchanged); `source_schema` now explicitly documents the
Mapbox-specific binding so future readers do not interpret "MapLibre
compatible" as portability claim.

---

## 2026-04-26 — Initial spec from /office-hours

- Locked all D1-D11 decisions (see `../DESIGN.md` for rationale)
- 13-color light + 13-color dark palette, brand_indigo `#2D2A6B`
- 9-glyph single-outline icon set, dark-stroke halo
- Mapbox Style Spec v8, MapLibre-compatible
