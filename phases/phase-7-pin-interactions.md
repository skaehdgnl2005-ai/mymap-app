# Phase 7: Pin Interactions + States

**Detail level:** Medium (expand at kickoff if you want full detail)
**Estimated duration:** 3-4 working days

## Project context

Make pins fully interactive per the locked D9/D10/D11 spec. After
this phase, users can mark places visited, change color tags, filter
by color, and the pin animations match the 200ms spring spec.

Phase 5 had a basic "tap → console.log" handler. Phase 7 makes it
real: tap-to-expand circle→teardrop, long-press for quick-action menu,
visited toggle, color tag picker, color filter activation.

## Locked decisions referenced

- DESIGN.md § D9 Marker Shapes: tap-to-expand 200ms spring; visited =
  outlined indigo; color_tag default hidden, activates as fill on
  filter
- DESIGN.md § D11 Mobile Interactions: long-press = quick-action menu
- `spec/tokens.json` § motion: spring_default = 200ms, tension 300,
  friction 24

## Prerequisites from previous phases

- Phase 4 complete: PersonalMap component renders pins
- Phase 6 complete: real auth user, real saved places in DB

## Risk-tier eval (do this FIRST at kickoff)

Per PROJECT_STATE.md § Verification Principles → Risk-tier triage,
size the smoke test to the actual risk surface, not a fixed protocol.

**Phase 7 expected tier: MEDIUM.** Justification:
- New native modules? Likely YES — `react-native-reanimated` (if not
  already there), `@gorhom/bottom-sheet`, possibly `react-native-gesture-
  handler` upgrade. Triggers HIGH-baseline.
- But: existing rendered surface (just adding interactions), no new
  permissions, no cold-boot/auth changes, no new external API.
  Downgrade-one-tier qualifier applies.
- Final: MEDIUM. Smoke test = emulator dev-client, exercise the new
  surface (tap-to-expand, long-press menu, visited toggle, color
  filter) on 3-4 representative pins. ~10 min total.

**If during implementation any of these conditions change**,
upgrade to HIGH and plan EAS rebuild + real-device:
- Adding a permission string (currently no plan to)
- Touching auth or cold-boot routing
- Discovering a Reanimated 3 native crash that needs real-device repro

Record the actual tier in the Status block when the phase wraps.

## This phase's goal

All pin interactions per D9/D11 work end-to-end:
- Single tap on saved pin: animate circle → teardrop (200ms spring),
  expanded state visible until tap elsewhere
- Single tap on cluster: smooth zoom-in 350ms
- Long-press on saved pin: quick-action menu (visited toggle, color
  tag picker, delete, share)
- Visited toggle: pin animates from filled → outlined (or vice versa)
- Color filter: bottom-sheet filter UI; matching pins use tag color
  as fill, non-matching fade to 30% opacity
- Anchors don't morph on tap (per D9 lock — address IS position)

## Concrete tasks

1. **Tap-to-expand animation** for saved pins:
   - Use Reanimated 3 worklets for 200ms spring
   - Default state: 18×18 circle, indigo fill
   - Expanded state: 28×34 teardrop, indigo fill, halo widens to 2px
   - Anchor pins: scale 24→36 only, no shape morph

2. **Cluster zoom-in animation:**
   - 350ms ease-out per D10 lock
   - Camera fits cluster bounds at new zoom
   - If still clustered after 3 successive taps → fitBounds to all
     children at viewport zoom

3. **Long-press handler** — wrap MapView in `LongPressGestureHandler`
   from react-native-gesture-handler. On long-press, query rendered
   features at point, find the pin, show quick-action sheet:

   ```
   ┌────────────────────────┐
   │  스타벅스 성수점         │
   │  ─────────────────     │
   │  ☐ 다녀왔어요  (toggle) │
   │  🎨 색상 태그           │
   │  📤 공유               │
   │  🗑  삭제               │
   └────────────────────────┘
   ```

   Use a bottom sheet library (`@gorhom/bottom-sheet` recommended).

4. **Visited toggle:**
   - Updates `visited: true/false` + `visited_at` timestamp via
     `places/repo.ts updatePlace()`
   - Pin animates from filled (filled-pin sprite) → outlined
     (outlined-pin sprite); see Phase 4 SymbolLayer expression
   - Optimistic UI update — animate immediately, sync to backend in
     background, rollback on error

5. **Color tag picker:**
   - 7-color row (RED through PURPLE) plus NONE
   - Tap → updates `color_tag`
   - Default view: pins still render in indigo (no visual change yet)
   - "변경됨" toast on save

6. **Color filter UI:**
   - Floating filter button bottom-left of map (mirror to My Location
     bottom-right)
   - Tap → bottom sheet with same 7 colors
   - Tap a color → activates filter:
     - Matching pins render with tag color as fill
     - Non-matching pins fade to 30% opacity
     - Anchors unaffected (always full opacity)
   - Tap same color again → de-activates filter, returns to default
     all-indigo

7. **Color tag indicator in popover only** (per D10 R3 lock):
   - When pin tapped → popover shows 12×12 color chip next to place
     name (indicates tag exists)
   - NO 4px dot on the pin itself

8. **Selected state persistence:** if pin selected then user zooms
   out below pin's layer minzoom, pin stays rendered (smaller size at
   far-out zooms)

9. **Test all interactions** at multiple zoom levels.

## Verification

- [ ] Tap saved pin → expand animation runs at 200ms, smooth
- [ ] Tap anchor pin → scale only, no shape morph
- [ ] Tap empty map → all selections clear
- [ ] Long-press → quick-action sheet appears with 4 actions
- [ ] Visited toggle: filled ↔ outlined transition
- [ ] Color tag set: persists across app restart (DB write confirmed)
- [ ] Color filter: matching pins colored, non-matching faded
- [ ] Filter de-activates correctly
- [ ] No 4px dot on pin (popover-only color indicator per lock)
- [ ] Cluster tap zooms in 350ms ease-out
- [ ] Selected pin stays rendered when zooming out

## Anti-patterns

- Do NOT use opacity for visited state (reads as broken per D9 R2)
- Do NOT use color_tag as default pin fill (violates D8 quiet-base
  thesis per D10 R3 lock)
- Do NOT animate cluster bubble size based on count (variable size
  competes with anchors-vs-saved hierarchy per D10 lock)
- Do NOT add hover states (mobile-only per D11)
- Do NOT enable rotate (disabled per D11 lock)

## Handoff

When complete, update PROJECT_STATE.md with:
- Animation library used (Reanimated 3 recommended)
- Bottom sheet library used
- Spring timing verified at 200ms across all transitions
- Performance baseline at this phase (FPS during animations)

Then: `ln -sf phase-8-pin-popover.md phases/CURRENT_PHASE.md`

## Expansion hints

For full detail:
- Reanimated 3 worklet patterns for spring animation
- Optimistic UI rollback patterns when DB write fails
- Color tag accessibility (color-blind users need a non-color
  affordance — text label in popover handles this)
- Hit-testing pin tap at small sizes (18px circle is below Apple's
  44pt minimum tap target — extend hitSlop)
