# Phase 8: Pin Detail Popover

**Detail level:** Medium (expand at kickoff if you want full detail)
**Estimated duration:** 3-4 working days

## Project context

When user taps a saved pin at zoom 16+, a detail popover opens with
the OG card preview, place metadata, edit fields, and Kakao
attribution. This is the surface that delivers on the D6 "source_url
+ OG cache = the magic" thesis — tap a pin from 3 months ago and
instantly remember WHY you saved it.

Phase 8 also wires up the OG fetcher Edge Function from Phase 3 to
actually populate `og_title`, `og_image_url`, etc. on saved places.

## Locked decisions referenced

- DESIGN.md § D6 Data Model: SavedPlace 15-field schema with OG cache
- DESIGN.md § D7 Refinement R1: source_url powers preview card, not
  bare deep link; OG fetch async + graceful degrade
- DESIGN.md § D7 Refinement R2: OG fetch domain matrix (Instagram
  GATED → platform logo + "View on Instagram" button)
- DESIGN.md § D11 Tap-to-preview at zoom ≥ 16
- spec/tokens.json: typography + spacing + radius for popover

## Prerequisites from previous phases

- Phase 3 complete: OG fetcher Edge Function deployed
- Phase 7 complete: pin tap interaction works, visited/color_tag
  edit works at the data layer

## This phase's goal

Tapping a saved pin at zoom 16+ opens a bottom sheet popover with:
- OG image preview (or domain-logo fallback for GATED Instagram)
- Place name (editable)
- Source URL (tap to open in browser)
- Note field (editable, 200 char limit)
- Category picker
- Color tag chip + picker
- Visited toggle (matches Phase 7 logic)
- Address (read-only, from Kakao geocode)
- Save_at timestamp
- "삭제" button (with confirmation)
- Kakao attribution footer ("Powered by Kakao")

OG cache populates on save (background async) and refreshes if older
than 30 days when popover opens.

## Concrete tasks

1. **Bottom sheet component** using `@gorhom/bottom-sheet`. Snap
   points: 25% (peek), 60% (default), 95% (full). Dismiss on swipe-
   down or tap outside.

2. **OG card display logic:**
   ```ts
   if (og_fetch_status === 'OK' && og_image_url) {
     // Show og_image_url as background, og_title as title
   } else if (og_fetch_status === 'GATED') {
     // Show platform logo (Instagram/Threads) + "View on Instagram" button
   } else if (og_fetch_status === 'FAILED' || null) {
     // Show domain favicon + bare URL
   }
   ```

3. **Wire OG fetcher** — when a place saves WITHOUT cached OG, call
   the Edge Function from Phase 3. Update SavedPlace record with
   result. Refresh popover if open.

4. **OG cache refresh** — when popover opens, if `og_fetched_at` >
   30 days old, kick off a background refetch (don't block UI).

5. **Edit fields** — name, note, category, color_tag all editable
   inline in the popover. Save on blur or "완료" tap. Optimistic
   updates per Phase 7 pattern.

6. **Source URL link out** — tap → `expo-linking openURL()` opens
   the URL in browser/Instagram/Naver app via deep link.

7. **Visited toggle** — same UI as Phase 7 quick-action menu (large
   checkbox or toggle), updates same field.

8. **Delete confirmation** — alert dialog "정말 삭제할까요?", confirm
   → soft delete (set deleted_at) or hard delete based on backend
   choice. Animate pin out of map view.

9. **Kakao attribution** — "Powered by Kakao" footer text in
   `text_tertiary` color, 10px Pretendard Regular. Required by Kakao
   Local API TOS per DESIGN.md § D5.

10. **Image caching** — use `expo-image` for OG image with disk cache
    enabled. Avoid re-downloading the same image on every popover open.

11. **Test edge cases:**
    - Pin with `source_url: null` (no source — onboarding-set HOME)
    - Pin with `og_fetch_status: 'GATED'` (Instagram)
    - Pin with `og_fetch_status: 'FAILED'` (random URL)
    - Pin with `og_fetch_status: null` (never tried — should trigger
      fetch on popover open)
    - Pin with very long Korean name (truncation)
    - Pin with very long note (200 char limit enforcement)

## Verification

- [ ] Tap pin at zoom 16+ → popover opens
- [ ] Tap pin at zoom <16 → just selects (no popover) per D11
- [ ] OG image renders for Naver Place URLs
- [ ] Instagram URL shows platform logo + "View on Instagram" button
- [ ] Random URL shows domain favicon + bare URL
- [ ] Editing name persists across app restart
- [ ] Visited toggle in popover matches Phase 7 quick-action behavior
- [ ] Delete confirmation works, pin removed from map
- [ ] Kakao attribution visible
- [ ] Image cache persists (no re-download on second popover open)
- [ ] Long Korean names truncate gracefully

## Anti-patterns

- Do NOT block save UX on OG fetch — async only
- Do NOT prefill Kakao search field with raw OG title (per D7 R4
  lock — Korean OG titles too noisy)
- Do NOT show source_url indicator on pin itself if `source_url`
  null (anchor pins have no source)
- Do NOT use brand_indigo for popover headers — use text_primary
  (brand color reserved for pins/CTAs only per D8)

## Handoff

When complete, update PROJECT_STATE.md with:
- Bottom sheet library + version
- Image caching library (expo-image)
- OG fetcher response time (p50 + p95) — affects perceived
  responsiveness
- Any UX tweaks discovered during real-data testing

Then: `ln -sf phase-9-search.md phases/CURRENT_PHASE.md`

## Expansion hints

For full detail:
- @gorhom/bottom-sheet snap point tuning + keyboard handling for
  edit fields
- expo-image cache size limits and eviction policy
- OG fetcher error handling matrix (network failure, parse failure,
  timeout, etc.)
- Korean text input gotchas (IME composition events, autocorrect
  behavior)
- Accessibility (VoiceOver labels for popover sections)
