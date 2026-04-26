# Phase 6: Onboarding + Auth Flow

**Detail level:** Medium (expand at kickoff if you want full detail)
**Estimated duration:** 3-4 working days
**Pre-condition:** Phase 5 validation passed (3+/4 pass criteria)

## Project context

Phase 5 validated the save flow with the friend. The product thesis
holds. Now we build proper onboarding so a stranger off the App Store
can become a working user.

Per DESIGN.md § D8, onboarding is intentionally minimal: 2 steps
(HOME, then SCHOOL/WORK toggle), all skippable, ~30 seconds total.
Empty map afterward is intentional product statement, carried by a
persistent hint card.

This phase ALSO wires up real authentication (replacing the hardcoded
test user from Phase 5).

## Locked decisions referenced

- DESIGN.md § D8 Cold-Start Onboarding: 2-step anchor, no favorite-pin
  seeding, hint card carries comprehension
- DESIGN.md § D7 Save Flow R5: clipboard auto-detect on `+` tap only,
  never on app foreground
- DESIGN.md § D11 Mobile interactions: My Location button bottom-right
  16px inset, permission-denied toast + settings deep-link
- Phase 3 auth providers (Apple + Google + optional KakaoTalk)

## Prerequisites from previous phases

- Phase 5 validation PASSED (verify in PROJECT_STATE.md before starting)
- Phase 3 backend complete: auth providers configured, Supabase
  saved_places table accepts inserts under user RLS

## This phase's goal

A new user can:
1. Open the app fresh, see auth screen
2. Sign in with Apple, Google, or email (or KakaoTalk if implemented)
3. Land on Step 1: "주로 어느 동네에서 지내세요?" (HOME address search)
4. Search → save HOME pin (or skip)
5. Land on Step 2: "학교나 직장은 어디인가요?" (toggle: 학교 / 직장 /
   둘 다 추가)
6. Search → save SCHOOL or WORK pin (or skip)
7. Land on map view with HOME (and SCHOOL/WORK if set) visible
8. See persistent hint card: "+ 인스타에서 본 카페를 저장해보세요"
9. Hint card dismisses on first `+` tap, never returns

## Concrete tasks

1. **Auth screen** — minimal:
   - App name/logo
   - Apple Sign In button (required for iOS)
   - Google Sign In button (required for Android)
   - "이메일로 시작하기" link (fallback)
   - KakaoTalk button (if implemented in Phase 3)
   - Privacy policy + ToS links (required for App Store)

2. **Onboarding navigation** — use `expo-router` or React Navigation
   stack. Onboarding is a separate stack from the main app; new
   users go through it, returning users skip directly to map.

3. **Step 1 component** — `OnboardingStepHome.tsx`:
   - Title: "주로 어느 동네에서 지내세요?"
   - Subtitle: "홈이 지도에 표시되면 거리 가늠이 쉬워져요"
   - Kakao address search input (reuse component from Phase 5
     manual-resolve modal)
   - Allow dong-only ("성수동" → save with dong centroid via Kakao
     geocoder) OR full address
   - "건너뛰기" link (top-right, non-penalty framing per D7 R7 lock)
   - On result tap: save as HOME via `places/repo.ts`, go to Step 2

4. **Step 2 component** — `OnboardingStepWorkSchool.tsx`:
   - Title: "학교나 직장은 어디인가요?"
   - Toggle at top: "+ 학교 추가" / "+ 직장 추가" / "둘 다 추가"
     (radio-group OR multi-add per D7 lock)
   - Kakao address search input
   - On result tap: save as SCHOOL or WORK based on toggle, advance
     or stay on step (if user chose "둘 다 추가")
   - Skip → go to map

5. **Progress indicator** — 2 dots, filled/unfilled. NO "Step X of Y"
   text per D7 lock.

6. **First-session hint card** —
   - Persistent above `+` button at bottom of map
   - Copy: "+ 인스타에서 본 카페를 저장해보세요"
   - AsyncStorage flag `hint_card_dismissed` — once true, never
     show again
   - Dismisses on first `+` tap (set flag) OR explicit X dismiss button

7. **My Location button** — per D11 lock:
   - Bottom-right of map, 16px inset, 44pt tap target
   - First tap → triggers GPS permission request
   - Granted → animate camera to user position at zoom 16
   - Denied → toast "위치를 보려면 설정에서 권한을 켜주세요" with
     "설정 열기" action via `expo-linking openSettings()`

8. **Permissions: zero asked during onboarding.** Location, notifications,
   clipboard all deferred to natural points of use later (per D8 lock).

9. **Wire up auth user_id** — replace Phase 5's hardcoded test user
   with `supabase.auth.getUser().data.user.id`. All `places/repo`
   calls now use real user_id.

10. **Test new-user flow end-to-end** — sign out, force fresh state,
    walk through Steps 1-2, verify HOME pin appears on map.

## Verification

- [ ] Fresh user can sign in via Apple OR Google
- [ ] After auth, lands on Step 1 (not on map directly)
- [ ] Returning user skips onboarding (lands directly on map)
- [ ] Step 1: address search returns Korean dong-level results
- [ ] HOME pin saves correctly with `category: 'HOME'`
- [ ] Step 2: toggle works, can add SCHOOL + WORK both
- [ ] Both step skips work without penalty
- [ ] Hint card visible on first map view
- [ ] Hint card dismisses on first `+` tap
- [ ] Hint card never re-appears after dismissal
- [ ] My Location button works (granted + denied paths both)
- [ ] Onboarding completion <30 seconds for fast user (skipping)
- [ ] Onboarding completion <2 minutes for thorough user

## Anti-patterns

- Do NOT add a "favorite places" step — that was explicitly cut in
  D8 with reasoning (Foursquare-shaped, contradicts evolving-canvas
  identity)
- Do NOT use guilt language ("이건 나중에 할게요") for skip — use
  "건너뛰기" or "나중에"
- Do NOT show "Step 1 of 2" text — use 2 dots indicator only
- Do NOT ask for location permission during onboarding (deferred to
  My Location button tap)
- Do NOT ask for notification permission anywhere in v1 (deferred
  entirely to v1.5+ when push notifications have a use)

## Handoff

When complete, update PROJECT_STATE.md with:
- Auth providers implemented (Apple, Google, +/- KakaoTalk)
- Onboarding flow E2E time measured (fastest skip path)
- Any string copy that diverged from spec (record exact Korean used)
- Privacy policy + ToS URLs (required for App Store submission later)

Then: `ln -sf phase-7-pin-interactions.md phases/CURRENT_PHASE.md`

## Expansion hints

For full detail:
- Apple Sign In service ID + redirect URL setup in Apple Developer
- Google OAuth client setup with bundle ID + SHA-1 fingerprint
- KakaoTalk login — `@react-native-seoul/kakao-login` integration
  (native module link, redirect URI registered in Kakao Developers
  console)
- Korean copy review with the friend (validation user) before locking
- Empty-state design (when HOME/SCHOOL/WORK skipped + no saved places)
- Privacy policy template appropriate for Korean PIPA + GDPR + App
  Store
