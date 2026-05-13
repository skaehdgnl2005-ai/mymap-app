# Phase 6 Handoff
Date: 2026-05-13
Phase: 6 — Onboarding + Auth Flow
Duration: <1 working day (implementation only — runtime verification gates
remain open in parallel with Phase 7 start, mirroring Phase 5's Track A/B
pattern)

## What was completed

- [x] Task 1: AuthScreen (Apple Sign In native module wired via
      `expo-apple-authentication` + `supabase.auth.signInWithIdToken`;
      Google still stubbed → Phase 10 dashboard config gate; email + password
      functional via `signInWithPassword`/`signUp` toggle; privacy/ToS links
      to placeholder URLs until Phase 10 hosting)
- [x] Task 2: Navigation — state-based router in `App.tsx` (no
      `expo-router` / React Navigation dep added; the 3-screen surface
      doesn't justify a router today, see mid-phase decision below)
- [x] Task 3: OnboardingStepHome (HOME address search via Naver Local
      Search + skip top-right)
- [x] Task 4: OnboardingStepWorkSchool (WORK/SCHOOL/BOTH radio toggle +
      multi-add staging + skip / 완료 right-end button label transitions)
- [x] Task 5: ProgressDots (2-dot indicator, no "Step 1 of 2" text per
      D8 anti-pattern)
- [x] Task 6: HintCard (persistent above-FAB hint, AsyncStorage flag
      `hint_card_dismissed:<userId>`, dismisses on FAB tap OR explicit X)
- [x] Task 7: MyLocationButton (bottom-right 16px inset, 44pt tap target,
      single-shot foreground location request, denied → in-screen toast
      + `Linking.openSettings()` deep-link)
- [x] Task 8: Zero permissions during onboarding (location + clipboard +
      notifications all deferred to natural-moment requests, per D8 lock)
- [x] Task 9: Wire auth user_id — `ensureDevSession` removed from
      `App.tsx`; replaced with `useSession()` hook listening on
      `supabase.auth.onAuthStateChange`. All places/repo calls now route
      through the real authenticated session.

## What was NOT completed (and why)

- [ ] Task 10: Fresh-user E2E walk-through — reason: runtime gate that
      needs an actual device + signup. Mirrors Phase 5's Track A/B/
      validation-gate split. Recorded as OPEN sub-track in PROJECT_STATE.
      Includes: emulator E2E, iOS EAS build with new
      `expo-apple-authentication` + `expo-location` native modules,
      friend or founder fresh-user smoke test.
- [ ] Supabase dashboard Apple Sign In provider enable (Apple Service ID +
      return URL config) — reason: this is the Phase 10 cross-phase issue
      remaining work. The native-module side is now Phase 6-complete; the
      Supabase-side enable is the unblock. Without it, tapping Apple
      Sign In shows verbatim Supabase error "Unsupported provider" — fail
      loud, useful diagnostic.
- [ ] Google Sign In — reason: native module + Supabase dashboard config
      both still gated on Phase 10 (needs SHA-1 keystore from production
      EAS keystore + Google Cloud OAuth client). Button is stub-only via
      Alert at v1 Phase 6.
- [ ] Dong-centroid auto-save (phase doc envisaged "성수동" → dong centroid
      via Kakao geocoder) — reason: Naver Open API has no geocoder
      endpoint (D5b constraint), and Kakao Local API access still gated on
      사업자 등록 per D5b. User-perceived behavior: typing "성수동" returns
      a list of cafes/restaurants in 성수동; user picks the most familiar
      result and saves it as their anchor. Acceptable signal for v1 anchor
      purpose (distance gauge) — full dong centroid revisited at Phase 10
      if friend feedback flags it.
- [ ] Privacy policy + ToS hosted pages — reason: required for App Store
      submission (Phase 10). v1 Phase 6 ships `https://jaguk.app/privacy`
      and `/terms` placeholders; links exist so the layout is final.
- [ ] Onboarding E2E time measurement — reason: requires runtime
      verification (above). To be recorded when validation gate closes.
- [ ] String copy divergences (phase doc § handoff item) — none diverged;
      Korean copy matches phase doc exactly except where the doc said
      Kakao (D5b makes that Naver) and where the doc's "Step X of Y"
      anti-pattern called for 2-dot ProgressDots (built per anti-pattern,
      no text).

## Mid-phase decisions

- **State-based router instead of expo-router / React Navigation**:
  the v1 surface is 3 screens (Auth → Onboarding stack → MapScreen).
  expo-router demands a file-system reorganization (`app/` directory,
  layouts). React Navigation adds 4-5 transitive deps for a single
  back-stack we don't use (onboarding is one-way; the user can't go
  back from MapScreen to AuthScreen except via sign-out which is a
  Phase 10 feature). State-based routing in `App.tsx` keeps the
  Phase 6 install surface to just `expo-location` + `expo-apple-
  authentication`. Trade-off: when Phase 8 needs a bottom-sheet OR
  Phase 9 wants a settings screen, revisit. The unwind cost is small
  — wrapping in `<NavigationContainer>` with a `<Stack.Navigator>` is
  a ~20-line change.
- **Apple Sign In wired now, not deferred to Phase 10**: original
  plan (from cross-phase issue) was "Phase 3-9 dev runs on email/
  password only" and "Apple/Google at Phase 10." Apple Dev Program
  activated 2026-05-12 unblocked the Service ID side, so the
  native-module wire-up landed in this phase. Remaining Phase 10
  work narrowed to one item: Supabase dashboard provider enable
  (Apple Service ID + return URL). The button surface is now
  immediately useful for any iOS user who has a Supabase project
  with Apple provider enabled. Failure path is fail-loud (Supabase
  returns "Unsupported provider" verbatim).
- **Address search uses Naver place search, not dong-centroid
  geocoder**: phase doc § 3 envisaged a dong centroid path (Kakao
  geocoder). Naver Open API has no geocoder; Kakao still gated on
  사업자 등록 per D5b. User picks a specific place near home
  (역 / 아파트 / 카페 / etc.). Acceptable for the anchor's purpose
  ("distance gauge", not "lat/lng of the dong polygon center").
- **Email auth is signUp+signIn toggle, not magic-link OTP**: magic
  links require checking email on phone, clicking link, returning to
  app — broken for friend-demo where the friend hands the phone back
  immediately. Password flow gives synchronous in-app completion;
  Supabase project's `auth.config.enable_confirmations=false`
  (Phase 3 verified) means signUp returns a session immediately.
  Phase 10 adds password recovery + email verification gate per PIPA.
- **`OnboardingFlow` / `MapScreen` as function declarations, not
  `React.FC`**: `React.FC` requires importing `React` as a value
  (or `import type * as React from 'react'`), and the hooks we use
  already destructure from `react` without the namespace. Function
  declarations keep the import list minimal.
- **Two-layer onboarding completion gate**: AsyncStorage flag
  `onboarding_complete:<userId>` is the fast path; fallback queries
  `saved_places` for any HOME/SCHOOL/WORK anchor (covers
  reinstall-on-new-device case where AsyncStorage is empty but
  account already has anchors). Network failure on cold boot
  fail-safes to "pending" (re-walking onboarding is worse-case rare
  cost vs. silently landing on empty map).
- **Hint card positioned above the FAB, dismisses on FAB tap**:
  per Phase 6 doc § 6 verbatim. Implementation choice: dismissal
  also fires from the explicit × button in the card itself
  (accessibility + user agency). Both paths set the same flag.

## Cross-phase drift detected

- **Phase 10 cross-phase entry "Apple Sign In + Google Sign In
  configuration deferred to Phase 10" narrows**: Apple Sign In
  native-module side now Phase 6-complete; remaining Phase 10 work
  for Apple is one item (Supabase dashboard provider enable). Google
  Sign In all-deferred to Phase 10 unchanged. Entry should be
  updated to reflect the narrower remaining surface.
- **Phase doc's "Kakao geocoder for dong centroid" assumption
  conflicts with D5b**: phase doc § task 3 references a geocoder
  capability Naver Open API doesn't provide. Resolved by switching
  to place-search semantics for onboarding (user picks a familiar
  landmark). If the dong-centroid intent is load-bearing for some
  Phase 10 feature, re-evaluate alongside Kakao migration trigger.
- **Privacy / ToS URLs are placeholder**: `https://jaguk.app/privacy`
  and `/terms` don't resolve. The hosted-page work belongs in
  Phase 10 (App Store submission gate). Recording here so the
  Phase 10 task list catches it.

## Verification result

- **Method**:
  - `pnpm typecheck` (tsc --noEmit, strict + extra-strict flags)
  - `pnpm lint` (eslint flat config)
  - `pnpm format` (prettier auto-format)
- **Result**:
  - typecheck: PASS (clean exit, no errors)
  - lint: PASS (0 errors, 3 pre-existing import/first warnings in
    `src/save-flow/SaveModal.tsx` — unchanged from Phase 5 close;
    these intentionally place the Naver provider import after a
    swap-back-to-Kakao comment block per D5b migration tracking)
  - Runtime verification: NOT YET RUN (Track A/B + validation gate
    open in parallel with Phase 7 — see PROJECT_STATE Active blockers
    and Phase 6 entry)

## Files created/modified

### Created
- `src/auth/useSession.ts` — Supabase session listener hook (replaces
  Phase 5's `ensureDevSession`)
- `src/auth/AuthScreen.tsx` — Apple (wired) + Google (stub) + email
  signup/signin form + privacy/ToS links
- `src/onboarding/AddressSearchInput.tsx` — Naver-search input shared
  by both onboarding steps (300ms debounce, autoFocus on mount,
  ListEmptyComponent + "Powered by Naver" attribution)
- `src/onboarding/ProgressDots.tsx` — 2-dot indicator (6px dots,
  8px gap, brand_indigo active / D0CEC7 inactive)
- `src/onboarding/OnboardingStepHome.tsx` — Step 1/2 (HOME)
- `src/onboarding/OnboardingStepWorkSchool.tsx` — Step 2/2 (WORK +
  SCHOOL + BOTH multi-add)
- `src/onboarding/useOnboardingComplete.ts` — two-layer onboarding
  status hook (AsyncStorage flag + saved_places anchor fallback) +
  `markOnboardingComplete(userId)` setter
- `src/onboarding/HintCard.tsx` — persistent above-FAB hint card +
  `useHintCardVisible(userId)` hook + `dismissHintCard` setter
- `src/location/MyLocationButton.tsx` — GPS button with permission
  flow + denied toast + settings deep-link
- `phases/handoffs/phase-6-handoff.md` — this document

### Modified
- `App.tsx` — three-state router (loading splash → AuthScreen →
  OnboardingFlow → MapScreen); Phase 5's `ensureDevSession` +
  MOCK_PLACES fallback both removed; HintCard + MyLocationButton
  wired; FAB tap auto-dismisses hint card
- `app.config.ts` — `expo-location` plugin entry with Korean
  permission string; `ios.usesAppleSignIn: true` for the Apple
  capability entitlement
- `package.json` + `pnpm-lock.yaml` — `expo-location@~19.0.8` +
  `expo-apple-authentication@~8.0.8` added as dependencies
- `PROJECT_STATE.md` — Phase 6 entry + cross-phase drift updates +
  Active blockers update + Pending phases update

## Recommended modifications to upcoming phase docs

- **Phase 7 doc (pin interactions + states)**:
  - The `onPinTap` / `onPinLongPress` / `onClusterTap` callbacks in
    `PersonalMap` are still console.log placeholders in `App.tsx`.
    Phase 7 wires these to the bottom-sheet popover (Phase 8) once
    that's introduced. For Phase 7's tap-to-expand work, the
    handlers in `MapScreen` are the integration point.
  - The hint card dismisses on FAB tap; Phase 7's pin interactions
    should consider whether tapping a pin (not the FAB) should also
    dismiss the hint, OR whether the hint stays until the explicit
    save flow is exercised. D8's "carries comprehension" framing
    suggests the FAB tap is the right trigger (signals user
    understood the save flow), so a pin tap should NOT dismiss it.
  - Sprite-pipeline expansion for D10 deviations (visited state
    outlined-indigo glyph + anchor rounded-square backgrounds) was
    already on the Phase 7 docket per cross-phase entry "D10 marker
    -shape deviations deferred to Phase 7" — unchanged by Phase 6.
- **Phase 8 doc (pin detail popover)**:
  - The Phase 6 hint card occupies the bottom band of the map at
    position (left:20, right:88, bottom:104). Phase 8's bottom sheet
    will likely collide with this — design needs to either dismiss
    the hint when the sheet opens OR position the hint above the
    sheet's collapsed state.
- **Phase 9 doc (search overlay)**:
  - `PersonalMap` already accepts `searchResults` + `onSearchResultTap`
    props from Phase 5's groundwork. Phase 9 builds the search
    overlay UI and feeds those props.
- **Phase 10 doc (polish + beta)**:
  - Remaining Apple Sign In work: Supabase dashboard provider enable
    (Apple Service ID + return URL). Native module + capability +
    button + token flow all done in Phase 6.
  - Google Sign In: still both sides (native module + dashboard)
    deferred. Use `@react-native-google-signin/google-signin` per
    cross-phase entry's recipe.
  - Privacy / ToS hosted pages — `https://jaguk.app/privacy` and
    `/terms` placeholders shipping in Phase 6. Required for App Store
    submission.
  - Onboarding string copy review with friend (validation user) —
    Phase 6 doc § Expansion hints item. Worth running once before
    App Store submission to catch any KR copy that feels stiff.
  - EAS env var registration: when Phase 10 adds new env vars (e.g.,
    Google client IDs), follow the Phase 5 pattern of registering on
    EAS dashboard BEFORE rebuilding to avoid silent-crash repeats.
