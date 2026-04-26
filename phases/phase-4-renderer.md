# Phase 4: Map Renderer Integration

**Detail level:** Medium (expand at kickoff if you want full detail)
**Estimated duration:** 3-4 working days

## Project context

Drop the locked map spec into the running Expo app. Get the base map
rendering with all D8/D11 visual decisions intact (cool warm-shifted
base, deep indigo brand reserved for user pins, Pretendard labels,
zoom-rule visibility, transfer-station differentiation). Render mock
SavedPlace + anchor pins to verify the renderer works end-to-end
*before* Phase 5 wires up the real save flow.

This phase is pure integration: no business logic, no auth, no save
flow. Just "do the locked specs render correctly?"

## Locked decisions referenced

- DESIGN.md § D8 Visual Foundation
- DESIGN.md § D9 Marker Shapes (circle saved + rounded square anchor)
- DESIGN.md § D10 Icon Set (9 single-outline glyphs)
- DESIGN.md § D11 Zoom Rules + Mobile Interactions
- `spec/style-light.json` / `spec/style-dark.json`
- `spec/implementation.tsx` (the integration reference)
- `spec/data-shapes.ts` (mock data shape)

## Prerequisites from previous phases

- Phase 1 complete: project scaffolded
- Phase 2 complete: sprite + glyphs hosted, Style JSON URLs filled in
- Phase 3 complete or in parallel: backend exists (mock data can come
  from a hardcoded array in Phase 4 if backend not ready)

## This phase's goal

The PersonalMap component renders correctly with:
- Locked base map (warm cream / dark surface depending on mode)
- All 9 icons appearing as expected on test pins
- Anchor pins (rounded square) visually distinct from saved pins
  (circle, expanding to teardrop on tap)
- Cluster behavior at zoom 12-13, individual pins at zoom 14+
- Light/dark mode auto-switches with `Appearance` API
- Korean labels rendering (subway stations, district names, parks)
- Transfer stations visibly larger than regular stations at zoom 14
- Tap and long-press handlers wired (firing alerts/console.log for
  this phase; real handlers in Phase 7+)

## Concrete tasks

1. **Drop spec/ files into project** — `data-shapes.ts`,
   `implementation.tsx`, both Style JSONs, `tokens.json`. Update import
   paths if you reorganized the folder layout in Phase 1.

2. **Configure Mapbox public token** at app start:
   ```ts
   // App.tsx or root index
   import Mapbox from '@rnmapbox/maps';
   Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN!);
   ```

3. **Implement PersonalMap component** by adapting
   `spec/implementation.tsx` to your project structure. Add the
   refinements noted in implementation.tsx comments:
   - CircleLayer + SymbolLayer pair for individual saved pins
     (CircleLayer = indigo background; SymbolLayer = white icon glyph)
   - Same pair for anchors with `indigo_soft` background
   - Cluster bubble already done in implementation.tsx reference

4. **Wire up dark/light style switching** with `Appearance.addChangeListener`
   per implementation.tsx. Test by toggling in iOS Simulator
   (Features → Toggle Appearance) and Android Emulator settings.

5. **Create mock data** — `src/dev/mock-places.ts`:
   ```ts
   export const MOCK_PLACES: SavedPlace[] = [
     // 3 anchors: HOME 강남, WORK 성수, SCHOOL 신촌
     // 5 saved: cafes/restaurants in 성수동
     // 2 visited (outlined state)
   ];
   ```
   Wire into App.tsx as `<PersonalMap savedPlaces={MOCK_PLACES} />`.

6. **Test rendering across zooms.** Manual checklist:
   - Zoom 10: only province labels visible, no pins
   - Zoom 12: 구 labels + anchors + clusters visible
   - Zoom 13: subway hub lines (1/2/3/4/9) appear
   - Zoom 14: all subway lines, station dots, transfer stations
     larger; clusters end, individual pins
   - Zoom 16: street names, station names, building footprints fade in
   - Zoom 18: alleys, full detail (no building labels per D11 lock)

7. **Test interaction** — tap and long-press on pins. Verify:
   - Single tap on saved pin → `onPinTap(id)` fires; pin "expands"
     visually (animation TBD — basic scale 1.1 fine for Phase 4;
     full circle→teardrop in Phase 7)
   - Single tap on cluster → smooth zoom-in
   - Long-press → fires `onPinLongPress(id)` (just console.log it for
     Phase 4)

8. **Verify on both platforms.** iOS Simulator + Android Emulator at
   minimum; real devices preferred.

9. **Document any deviations** from implementation.tsx in
   PROJECT_STATE.md.

## Verification

- [ ] Map loads without errors on iOS + Android
- [ ] All 9 icon types render correctly (test by including each in
      mock data)
- [ ] Anchor pins visually different from saved pins (square vs
      circle/teardrop)
- [ ] Visited state outlined treatment works (1 mock place with
      `visited: true`)
- [ ] Cluster bubble appears at zoom 12-13 with count
- [ ] Korean station labels render (e.g., 강남, 성수, 홍대입구) — NOT
      English transliterations
- [ ] Park labels in italic (or parks_dark color if italic deferred
      per fonts/BUILD-PBF.md option 3)
- [ ] Brand indigo NOWHERE on the base map (verify by inspecting any
      label, road, or POI — none should be indigo)
- [ ] Dark mode switch works without restart

## Anti-patterns

- Do NOT modify Style JSONs to debug rendering — they're locked
  artifacts. If something looks wrong, debug at the runtime layer
  (CircleLayer/SymbolLayer paint properties) or surface as a Style
  JSON issue in PROJECT_STATE.md
- Do NOT hardcode color values in components — use `tokens.json`
- Do NOT add hover states (mobile-only, no hover per D11 lock)
- Do NOT enable two-finger rotate (disabled per D11 lock)

## Handoff

When complete, update PROJECT_STATE.md with:
- Confirmed: D8/D9/D10/D11 all render as designed
- Any visual surprises or debt (e.g., "halo on highway roads still
  weak in light mode despite dark-stroke; revisit in Phase 8")
- Mock data location for future test reuse
- iOS + Android render parity confirmed (or mismatches noted)

Then: `ln -sf phase-5-save-flow-validation.md phases/CURRENT_PHASE.md`

## Expansion hints

For full detail, focus on:
- @rnmapbox/maps-specific gotchas (tile loading lifecycle, re-render
  triggers, ShapeSource update batching)
- Animation timing curves matching D9's 200ms spring spec
- Performance baseline (FPS at 50 mock pins, GC pauses, etc.)
- Korean text rendering edge cases (vertical centering at small sizes,
  fallback when name:ko missing)
