# Phase 9: Search Overlay

**Detail level:** Medium (expand at kickoff if you want full detail)
**Estimated duration:** 3-4 working days

## Project context

Add a "search nearby" surface for users who want to find a place by
keyword (not from Instagram/blog) and save it. The Phase 5 manual-
resolve modal handles save-from-URL search; Phase 9 adds the
free-form search-while-on-map flow.

This is the "search → save" entry path that complements share-sheet
+ clipboard. Important: this is NOT a search engine for browsing all
of Korea — it's a save-flow alternative entry. The product is still
the personal-curated-map; search is just another way to get something
into the map.

## Locked decisions referenced

- DESIGN.md § D11 Search-Overlay Layer: pulsing 16px circles at 60%
  opacity, all zooms ≥12, above base/anchors/saved layers; tap result
  → expand + preview card with "Save to MyMap" CTA
- DESIGN.md § D7 Save Flow: Kakao keyword search infrastructure
  already built in Phase 5
- spec/tokens.json § motion: search_pulse 1200ms ease-in-out alternate

## Prerequisites from previous phases

- Phase 5 complete: Kakao Local API client + manual-resolve modal
  exist (reuse search code)
- Phase 7 complete: pin tap/expand behavior available for reuse

## This phase's goal

User can:
1. Tap search input (top of map view)
2. Type Korean place name
3. See pulsing 16px result pins overlaid on map at all zooms ≥12
4. Tap a result → result expands to teardrop, preview card opens
5. Preview card shows place name + address + Kakao attribution +
   "저장" CTA
6. Tap 저장 → place saves, search overlay dismisses, new pin renders
   in normal hierarchy
7. Search dismissable via X or empty input

## Concrete tasks

1. **Search input bar** at top of map (or floating below status bar):
   - Pretendard Regular 14px, placeholder "장소 검색"
   - Search icon left, X icon right (dismiss)
   - Tap → input gains focus, keyboard appears
   - Korean IME support tested

2. **Live Kakao keyword search** — reuse `kakaoSearchByKeyword()` from
   Phase 5. Debounce 300ms to avoid rate limiting.

3. **Search result overlay layer** — new ShapeSource above existing
   layers:
   ```tsx
   <ShapeSource id="search-source" shape={searchCollection}>
     <CircleLayer
       id="search-results"
       minZoomLevel={12}
       style={{
         circleColor: brand_indigo,
         circleRadius: 8,
         circleOpacity: 0.6,
         circleStrokeColor: brand_indigo_dark,
         circleStrokeWidth: 1.5,
       }}
     />
   </ShapeSource>
   ```

4. **Pulse animation** — 1200ms ease-in-out alternate per
   tokens.json. Implementation via JS timer mutating
   `circleOpacity` between 0.4 and 0.8 (~30fps via setInterval, see
   `useSearchPulse` hook in spec/implementation.tsx).

5. **Result tap handler:**
   - Animate tapped result → expanded teardrop (reuse Phase 7
     animation)
   - Open preview card (similar to Phase 8 popover but with "저장" CTA
     instead of edit fields)
   - Show Kakao attribution

6. **Save from search:**
   - Tap 저장 → call `places/repo savePlace()` with the result data
   - Animate result pin → permanent saved pin (no animation gap)
   - Dismiss search overlay
   - Pin appears as normal saved pin in next render

7. **Search dismissal:**
   - Tap X in search input
   - Empty search input
   - Tap outside search overlay area
   - Any of these → search results layer removes, normal map hierarchy
     restored

8. **Results-list mode (optional):**
   - If user prefers list to map, swipe-up on search input opens
     bottom sheet with text list of results
   - Each list item: place name + address + tap-to-save
   - Mirrors map overlay behavior

9. **Empty state:** if Kakao returns 0 results, show "검색 결과가
   없어요" inline.

10. **Test with realistic queries:**
    - "강남역" (popular landmark)
    - "성수동 카페" (district + category)
    - "스타벅스" (chain — many results)
    - "잘못된이름" (no results)

## Verification

- [ ] Search input opens keyboard, accepts Korean text
- [ ] Live search fires after 300ms debounce
- [ ] Result pins appear with pulse animation
- [ ] Pulse animation alternates smoothly without flicker
- [ ] Tap result → expand + preview card
- [ ] 저장 CTA saves to DB and adds to user's pins
- [ ] Search dismissal returns map to normal hierarchy
- [ ] Kakao attribution visible in result preview card
- [ ] No memory leak from pulse animation when overlay dismissed

## Anti-patterns

- Do NOT use brand_indigo for search input field background (reserved
  for pins/CTAs per D8)
- Do NOT cache Kakao search results long-term (TOS — see DESIGN.md
  § D5; 24h cache OK, longer is violation)
- Do NOT show search overlay below zoom 12 (overlay would clutter
  district view per D11 minzoom)
- Do NOT auto-save on result tap — explicit "저장" CTA required (user
  intent must be unambiguous)

## Handoff

When complete, update PROJECT_STATE.md with:
- Pulse animation perceived performance (smooth on iOS + Android?)
- Kakao search response time at p50/p95
- Empty state copy locked

Then: `ln -sf phase-10-polish.md phases/CURRENT_PHASE.md`

## Expansion hints

For full detail:
- Pulse animation alternatives if JS-driven setInterval feels janky
  (Reanimated 3 worklet or native shader)
- Korean IME edge cases (composing characters mid-search shouldn't
  trigger debounced fetch)
- Search history / recent searches (deferred to v1.5 unless trivially
  cheap)
- "Search nearby my location" toggle (deferred unless trivial)
