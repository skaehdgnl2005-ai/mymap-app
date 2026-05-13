# PROJECT_STATE
Last updated: 2026-05-11 (Phase 5 Track A verification: Steps 7d/7e/7f all PASS on Pixel_7 Android emulator. 7d Naver search via scripts/test-phase5-naver.mjs (D5b empirical case reproducible, English-Romanized queries return 0 items but graceful via ListEmptyComponent). 7e save flow via scripts/test-phase5-save.mjs direct insert + emulator relaunch confirms pin renders east of "성수" station at inserted coords. 7f AUTO_RESOLVE end-to-end via adb share intent: classifier + og-resolver + Naver search + handleSave → DB row landed. One bug found+fixed mid-verification: synthetic id naver:<address> collided in FlatList keyExtractor when two results share an address; suffix with response index (commit ffb2b45). T-24h gate sub-cond 5 ticked off with Naver substitution per D5b. Sub-conds 3-4 explicitly deferred to Track B (real device share-sheet name + 5-path smoke test). New cross-phase issue: "Claude Code Read tool 2000px image dimension limit blocks raw adb screencap PNGs" added with PowerShell System.Drawing mitigation recipe (works on Windows without ImageMagick install).)

Update 2026-05-11 (later same day, Phase 5 Track B iOS unblock): First Phase-5-aware EAS iOS build attempted — failed initially with `"targetName" is not allowed to be empty` from EAS Build's Joi schema validator. Root cause traced to expo-share-intent v5.1.1 `getShareExtensionName()` which strips non-`[a-zA-Z0-9]` from `iosShareExtensionName` to derive the Xcode target name; brand `'자국'` → `""` empty + no fallback → propagates as `appExtensions[].targetName: ""` in the manifest. Fix: remove `iosShareExtensionName: '자국'` from app.config.ts plugin block — falls back to default `"ShareExtension"` (ASCII-safe Xcode target) while CFBundleDisplayName (share-sheet picker label) defaults to `"${appName} - Share Extension"` = `"자국 - Share Extension"` (mixed-language, UX cost for friend-demo). Build URL: builds/6e6dd5ce-f4bb-48f1-b62a-985d1983dc33, finished status, 5min 45s cloud Mac time — strongest signal that the entire iOS Phase-5 build pipeline including the auto-generated ShareExtension Xcode target compiles end-to-end. Second sub-issue surfaced: balanced-match × pnpm dlx interaction (pnpm dlx eas-cli does NOT inherit project's pnpm.overrides → @expo/fingerprint crashes with `balanced is not a function`). Workaround: `EAS_SKIP_AUTO_FINGERPRINT=1` env var, captured as new cross-phase issue. Apple Dev Program Individual enrollment payment completed 2026-05-11 ~18:25 KST, activation pending (2026 Korean backlog: best 6h / likely 2-7d / worst 4+ wk per Apple Developer Forums Feb-Mar 2026 threads). Three new artifacts: two new cross-phase issues (expo-share-intent Hangul sanitization, pnpm dlx overrides non-inheritance) + new Verification Principles Case #4 (subagent analysis as input artifact: agent output passed well-formedness — coherent, sourced, confident — but recommended fix re-created the broken state; consumption check = verify agent's reading of primary source independently before acting).

Update 2026-05-13 (later same day, Phase 5 FULLY CLOSED via friend-demo PASS + polish-tier feedback recorded + gesture fix applied): Friend-demo per Phase 5 doc formal protocol executed — 10-min hand-over-phone, founder silent, 4 post-demo questions. **5/5 paths PASS**: Path 1 (AUTO_RESOLVE / 네이버 지도 공유), Path 2 (MANUAL_RESOLVE / 인스타 공유), Path 3 (clipboard auto-detect on `+`), Path 4 (AUTO_RESOLVE 정확도 — minor ambiguity, accepted), Path 5 (force-quit + 재실행 핀 persistence). Wedge thesis empirically validated. Two polish-tier qualitative feedback items surfaced: (a) zoom/pan gesture 미끄러짐 — Mapbox 의 기본 inertia/decay 가 한국 사용자에 익숙한 네이버/카카오 맵의 짧은 스냅 decay 와 categorical 으로 다른 feel. Partial fix applied this session: `src/map/PersonalMap.tsx` `gestureSettings` prop 으로 `panDecelerationFactor: 0` + `pinchZoomDecelerationEnabled: false` + `rotateDecelerationEnabled: false` 추가. iOS pinch-zoom 자체 decay 는 `@rnmapbox/maps` API 가 안 노출해서 완전 fix 불가 — pan + Android pinch + rotate 만 잡힘. 한계 명시 기록. (b) 도로 sparsity — mapbox-streets-v8 의 KR OSM 데이터 한계로 안암역 같은 mid-density 동네에서 네이버 대비 도로 visibility 가 sparse. 친구 입에서 명시적 친구 언급 — D11 의 MapTiler migration trigger pile 에 또 추가 (현재 OR-pile: subway-degradation OR 구-absence OR zoom-feel OR road-sparsity). 사용자 결정 2026-05-13: 도로는 그대로 두기 (v1 wedge 가 navigation 이 아니라 personal pin curation 이므로 sparsity 가 wedge blocker 아님 — friend-demo 5/5 PASS 가 이 판단 empirical 지지). Phase 5 핸드오프 + Phase 6 진입 단계로 이행. 이전 (earlier today) update: Both Active blockers operational waits resolved same day. (a) Apple Dev Program ACTIVATED — hit the "likely 2-7d" branch of the projected 2026-05-11 enrollment window; Developer Portal access live, `eas device:create` + ad-hoc provisioning path now available. (b) Friend's phone OS CONFIRMED iPhone — install path locked as EAS `preview` profile + UDID registration + QR install; the alt `pnpm android --device` shortcut no longer applies. T-24h gate sub-cond 3 (real-device share-sheet display name verified on iPhone) and sub-cond 4 (5-path Task #9 smoke test executed end-to-end on real iPhone) both CLOSED 2026-05-12 — work done on founder's own iPhone after EAS `preview` build install via UDID registration. Paths 1/2/3/5 (AUTO_RESOLVE via Naver Place app share, MANUAL_RESOLVE via Instagram share, Instagram Copy Link → clipboard auto-detect on `+`, force-quit + relaunch persistence) all PASS. Path 4 (AUTO_RESOLVE *accuracy* — does the top Naver search result match the originally-shared Place URL?) had minor ambiguity; lever framework documented in this session (controllable: og-resolver query construction, results selection logic, disambiguation-degrade-to-MANUAL; not controllable: Naver Local Search ranking + chain-name collisions + generic og_titles) — no fix applied, accepted as-is for friend-demo. All T-24h sub-conds (1-5) now met; friend-demo gates only on friend's UDID registration + demo scheduling, both user-driven. Net: Phase 5 implementation + Track A + Track B + T-24h gate ALL closed; only the validation gate (friend-demo per Phase 5 doc protocol) remains. Phase 6 entry decision (strict gate vs parallel) still open. New cross-phase issue added in this update: "v8 Korean tile data 구 누락 (sibling to D11)" — Phase 4 City Hall + Phase 5 성수동 mock-pin verification both empirically surface that mapbox-streets-v8 KR tiles render 동 + 시 admin levels but skip 구 entirely; D11 MapTiler migration trigger condition extended from subway-degradation-only to (subway-degradation OR 구-absence) — friend-demo orientation friction (esp. 동명 collisions like 신사동 강남 vs 은평) now part of the OR-condition pile.

> **See also:** `RELEASE_CHECKLIST.md` — single-page user-facing index
> of every "before launch" item across all phases, organized by
> trigger event. Use this when you're about to hit a phase boundary
> and want to see what's due.

## Current phase

Phase 7 — **Ready to start** (2026-05-13).

Phase 6 fully closed same day — implementation + downscoped 3-item
smoke gate. Brief Phase 6 summary in `## Completed phases` →
"Phase 6: Onboarding + Auth Flow". Phase 7 doc is
`phases/phase-7-pin-interactions.md`; `phases/CURRENT_PHASE.md`
flipped to phase-7 at the close of this session.

**Phase 7 scope (from doc):** tap-to-expand pin animation (200ms
spring per D9), long-press quick-action sheet, visited filled↔
outlined toggle, color tag picker + filter UI per D10. Risk-tier:
**MEDIUM expected** (UI on existing rendered surface, no new
permissions, no cold-boot/auth changes per phase-7-pin-
interactions.md § "Risk-tier eval"). Smoke test: emulator dev-
client, exercise new tap/long-press/visited paths on 3-4 pins.

**Inheritances from Phase 6 (Phase 7 work에서 의식할 것):**

- `mapHandleRef` (App.tsx → PersonalMap imperative handle) is
  ready for Phase 7's tap-to-expand / pin selection animations to
  hook into. Camera flyTo already wired.
- Onboarding flow + HOME anchor means the map now opens centered
  on the user's HOME at zoom 14. Phase 7 pin interaction tests
  can start from a "real user" state without mock fixtures.
- iOS post-save flyTo regression (separate cross-phase issue) is
  the highest-priority Phase 7 polish target since pin
  interactions involve camera moves.
- `@react-navigation/native` + native-stack deps installed in
  Phase 6 (ultimately unused there); Phase 7's potential
  bottom-sheet for long-press quick-action menu can build on
  `@gorhom/bottom-sheet` per phase-7 doc § task 3, which
  layers on top of react-native-screens (already installed).
- Hint card dismissal is FAB-tap-driven; Phase 7 pin-tap should
  NOT dismiss the hint (per D8 the hint signals "save flow"
  comprehension, not "pin interaction" comprehension).

> _Phase 6 archaeology block preserved below for one session
> until Phase 7 kickoff session naturally rewrites this Current
> phase block per the project's standing pattern._

---

### Previous phase archaeology — Phase 6: Onboarding + Auth Flow (CLOSED 2026-05-13)

**Phase 6 scope (from Phase 5 close):** 2-step anchor onboarding
(HOME, then SCHOOL/WORK toggle) + hint card (per D8 stripped-down
B) + Apple/Google/Email auth UI (replacing Phase 5 의 dev-shim
`ensureDevSession`). Phase 5 의 mid-phase decision — dev test-user
via `auth.uid()` flow (not hardcoded literal) — was specifically
to make Phase 6 의 auth UI 흡수가 frictionless 하게: 같은
Supabase auth API, 같은 RLS 경계, UI 만 추가.

**Inheritances from Phase 5 (Phase 6 work에서 의식할 것):**
- Auth: `ensureDevSession` 패턴 (App.tsx) 을 실제 auth UI 로 자연
  교체. RLS + `auth.uid()` 는 이미 production-ready.
- EAS 환경 변수: Phase 5 close 직전 발견된 ".env 가 EAS 클라우드
  빌드에 자동 안 들어감" 의 7개 `EXPO_PUBLIC_*` 변수 이미 EAS
  dashboard 에 등록됨 (preview + production 양쪽). Phase 6 가 추가
  env var (예: Apple Sign In Service ID) 도입 시 EAS 등록 잊지 말
  것 — 검은 화면 silent crash 의 root cause 였음.
- iOS 빌드 path: `eas.json` 의 `preview` profile 이 real-device
  internal distribution 으로 수정됨 (`simulator: true` 제거). 새
  빌드는 founder iPhone 의 등록된 UDID 로 ad-hoc install 가능.
  Phase 6 dev cycle 중 시각 verification 은 real iPhone 사용
  권장 (Windows Android emulator 의 text shader 실패 알려진
  cross-phase issue).
- Polish-tier debt: gesture decay iOS pinch-zoom (`@rnmapbox/maps`
  API 미노출 — Phase 10), 도로 sparsity (D11 trigger pile, 사용자
  결정으로 v1 무수정).

**Phase 4 archaeology** (Path A consumption check + Re-verification
2026-05-04) 은 Completed phases section 에 보존 — 이 narrative 의
이전 버전이 그 detail 을 들고 있었음.

**Status (2026-05-13, implementation close):** Code complete.
`pnpm typecheck` PASS, `pnpm lint` PASS (0 errors, 3 pre-existing
SaveModal warnings from D5b client-import positioning carried over
from Phase 5 — not new). Implementation surface includes the full
3-state router in [App.tsx](App.tsx) (auth gate → onboarding gate →
map), AuthScreen with Apple Sign In wired via `expo-apple-authentication`
+ Email working + Google placeholder, the 2-step onboarding flow
(HOME → SCHOOL/WORK with BOTH-mode role-flipping), the
useOnboardingComplete two-layer gate (AsyncStorage flag +
DB-anchor fallback), the HintCard with per-userId AsyncStorage
dismissal, and the MyLocationButton with deferred-first-tap GPS
permission per D8 lock. Validation gate is on a real-device smoke
test (deferred — Phase 5 EAS build path still warm; new build needed
since native deps changed). No CURRENT_PHASE.md flip yet — that gates
on the smoke-test pass.

**Mid-phase decisions (2026-05-13, in chronological order):**

- **Navigation lib: `@react-navigation/native` + `@react-navigation/native-stack`**
  (NOT `expo-router`). Reason: `expo-router` requires file-based
  routing migration which would restructure the current
  `App.tsx`-as-entry pattern Phase 5 just stabilized. Phase 6 doc
  explicitly allows either. React Navigation is the smaller-blast-
  radius choice for the onboarding-stack scope. Peer deps
  `react-native-screens` + `react-native-safe-area-context` also
  installed. Net usage: deps INSTALLED but ultimately UNUSED at
  Phase 6 close — the 2-step onboarding flow is small enough that
  inline state in `App.tsx` (`useState<'home' | 'work-school'>`)
  is the smaller blast radius than a Stack.Navigator + Screen
  components. Deps stay installed for Phase 7+ multi-screen needs
  (pin detail popover, search overlay both will benefit). Decision
  to NOT use them in Phase 6 is the principled "use what you need"
  call, not regret.
- **Apple Sign In: `expo-apple-authentication`** with Apple's
  required `AppleAuthenticationButton` component (Apple HIG: custom-
  styled Sign In With Apple buttons = App Store rejection). Button
  auto-hides on Android via `isAvailableAsync()` check. Sign-in
  flow: `signInAsync` → `credential.identityToken` →
  `supabase.auth.signInWithIdToken({ provider: 'apple', token })`.
  End-to-end requires a Supabase-dashboard config step (Service ID
  + return URL) that the founder does separately — without it the
  signInWithIdToken call returns "Provider not enabled" verbatim
  to the AuthScreen error banner, which is itself the diagnostic
  signal pointing at the remaining dashboard step. See "Apple Sign
  In Supabase-dashboard config recipe" below for the user-side
  steps.
- **Google Sign In: PLACEHOLDER ("준비 중") at v1 Phase 6.** Full
  impl deferred per the upfront mid-phase decision plus discovered-
  cost of implementing. Estimated 1-2h follow-up session: install
  `@react-native-google-signin/google-signin` + Expo config plugin
  registration + iOS client ID + Android client ID + Android SHA-1
  fingerprint (from EAS keystore) + Supabase dashboard config.
  Phase 6 verification gate "fresh user can sign in via Apple OR
  Google" is satisfied by Apple (code-ready) + Email (working
  E2E). Google can land at Phase 7 (during a polish pass) or roll
  to Phase 10 dashboard sprint.
- **`expo-location`** for My Location button. Standard Expo module,
  no provider-account dependency. Permission deferred to first
  button tap per D8 + D11 lock (zero permissions during onboarding).
  Single-shot read (`getCurrentPositionAsync`) NOT
  `watchPositionAsync` — v1 wedge is "show my saved pins", live
  tracking has no use today and would add background-location
  disclosure burden at App Store review.
- **AddressSearchInput uses Naver (D5b), not Kakao geocoder
  (phase doc text).** Phase doc § task 3 wording was "Kakao address
  search input (reuse component from Phase 5 manual-resolve modal)
  / Allow dong-only via Kakao geocoder". Naver Open API Local
  Search has NO geocoder — only place search. So typing "성수동"
  alone returns places IN 성수동, not the dong centroid. User picks
  any result (familiar building or landmark) as their HOME
  anchor — adequate signal for v1's "give me a distance gauge"
  purpose. The phase doc's geocoder branch reactivates only on
  D5b → D5 reversal (사업자 등록 path, see Open decisions).
  Trade-off documented in
  [AddressSearchInput.tsx](src/onboarding/AddressSearchInput.tsx)
  header comment.
- **Email auth supports both sign-in and sign-up via explicit
  toggle.** AuthScreen has a "처음이세요? 회원가입" link below the
  primary button that flips `mode: 'signin' | 'signup'` —
  signInWithPassword vs signUp dispatched per the mode. Supabase
  project's `enable_confirmations=false` makes signUp return an
  active session immediately (dev-friendly). Phase 10 adds
  password recovery + email verification gate per PIPA.
- **OnboardingStepWorkSchool's BOTH-mode role-flipping.** Phase 6
  doc § task 4 specified 3 modes (학교 추가 / 직장 추가 / 둘 다
  추가) but did NOT specify how BOTH-mode handles two sequential
  picks. Implementation: `nextBothRole: 'WORK' | 'SCHOOL'` state,
  starts WORK; after saving WORK, flips to SCHOOL for the next
  pick; "건너뛰기" turns into "완료" after first save (user can
  add only WORK and tap 완료 without forcing both). Defends "skip
  is non-penalty" per D7 R7 lock.
- **useOnboardingComplete two-layer gate.** Per-userId AsyncStorage
  flag `onboarding_complete:<userId>` is the fast path. Slow path
  for fresh-install-on-existing-account: query `saved_places` for
  any HOME/SCHOOL/WORK anchor; if ≥1, backfill the flag and treat
  as done. Network failure on cold boot → fail SAFE by routing to
  onboarding (re-walking once is better than confusion on an empty
  map). This pattern carries the spirit of D8's "evolving canvas"
  identity — the user's data IS the onboarding state, not a
  separate flag artifact.
- **HintCard pattern: per-userId AsyncStorage flag
  `hint_card_dismissed:<userId>`** matching the onboarding-
  complete pattern. Dismissal triggers: (a) explicit X tap on the
  card, (b) first `+` FAB tap (per Phase 6 doc § task 6 lock).
  Card pointer-events set to `box-none` so taps on the underlying
  map still register (X button + text remain pressable). Critical
  for the empty-map UX: user can pan around the map while the
  hint is visible without the hint blocking interaction.
- **`@react-navigation/native-stack` deps stay installed but
  unused.** App.tsx routes via inline `useState<'home' | 'work-
  school'>` rather than a Stack.Navigator. Reason: 2 screens with
  linear flow + no back button + no header bar = state machine
  is the smaller blast radius. Deps cost zero at runtime
  (untouched code path) and are pre-positioned for Phase 7+ where
  pin detail popover + search overlay legitimately need stack
  semantics.
- **App.tsx is the comprehensive 3-state router (NOT
  decomposed into MainView + OnboardingNavigator helpers).**
  Initial implementation tried the decomposition (`src/app/
  MainView.tsx`, `src/onboarding/OnboardingNavigator.tsx`) but the
  prior-session work already had everything inline in App.tsx
  as `OnboardingFlow` + `MapScreen` child components. After
  reconciling for import-path mismatches, the inline-decomposed
  variant won — 285 lines in one file is acceptable for a
  routing controller, and the inline pattern keeps the cold-boot
  splash + auth state machine + transition logic in one
  reading window. The unused MainView/OnboardingNavigator stubs
  were deleted.
- **`.env.example` `EXPO_PUBLIC_TEST_USER_EMAIL/_PASSWORD` no
  longer referenced.** Boot-log assertion in App.tsx drops them.
  Local `.env` may still have them set — harmless, no code path
  reads them anymore. Cleanup task for Phase 7+: prune from
  `.env.example` once the dev confirms no test-user dev fallback
  is needed (Phase 5's Track A scripts may still use them
  independently — verify before pruning).

**Files created in Phase 6:**

- [src/auth/AuthScreen.tsx](src/auth/AuthScreen.tsx) — sign-in/up
  surface; Email working, Apple wired via expo-apple-authentication,
  Google stub.
- [src/auth/useSession.ts](src/auth/useSession.ts) — Supabase
  session subscriber hook; replaces Phase 5's `ensureDevSession`.
- [src/onboarding/AddressSearchInput.tsx](src/onboarding/AddressSearchInput.tsx)
  — Naver-backed shared search input for both onboarding steps.
- [src/onboarding/ProgressDots.tsx](src/onboarding/ProgressDots.tsx)
  — 2-dot progress indicator (no "Step X of Y" text per D7 lock).
- [src/onboarding/OnboardingStepHome.tsx](src/onboarding/OnboardingStepHome.tsx)
  — Step 1, HOME anchor.
- [src/onboarding/OnboardingStepWorkSchool.tsx](src/onboarding/OnboardingStepWorkSchool.tsx)
  — Step 2, SCHOOL/WORK/BOTH toggle with role-flipping.
- [src/onboarding/useOnboardingComplete.ts](src/onboarding/useOnboardingComplete.ts)
  — two-layer onboarding gate (AsyncStorage flag + DB-anchor
  fallback).
- [src/onboarding/HintCard.tsx](src/onboarding/HintCard.tsx) —
  persistent above-FAB hint with per-userId AsyncStorage dismissal.
- [src/location/MyLocationButton.tsx](src/location/MyLocationButton.tsx)
  — GPS button with deferred-permission flow + 설정 deep-link.

**Files modified in Phase 6:**

- [App.tsx](App.tsx) — full rewrite: 3-state router (auth →
  onboarding → map) replacing Phase 5's ensureDevSession-and-then-
  map flow. Inline `OnboardingFlow` + `MapScreen` children.
- [package.json](package.json) + [pnpm-lock.yaml](pnpm-lock.yaml)
  — added: `@react-navigation/native ^7.2.4`,
  `@react-navigation/native-stack ^7.15.0`, `expo-apple-authentication
  ~8.0.8`, `expo-location ~19.0.8`, `react-native-safe-area-context
  ~5.6.2`, `react-native-screens ~4.16.0`.

**Verification gate (Phase 6, partial):**

Phase 6 doc § Verification has 13 checklist items. Status:

- [x] `pnpm typecheck` — PASS
- [x] `pnpm lint` — PASS (0 errors, 3 pre-existing warnings)
- [ ] Fresh user can sign in via Apple OR Google — CODE-READY for
      Apple + Email; Google is placeholder. End-to-end Apple gates
      on Supabase-dashboard config (recipe below).
- [ ] After auth, lands on Step 1 (not on map directly) — CODE-
      VERIFIED via router state machine in App.tsx; device-verify
      pending.
- [ ] Returning user skips onboarding — CODE-VERIFIED via
      `useOnboardingComplete` AsyncStorage flag; device-verify
      pending.
- [ ] Step 1: address search returns Korean dong-level results —
      CODE-VERIFIED via Naver D5b client; device-verify pending.
- [ ] HOME pin saves correctly with `category: 'HOME'` — CODE-
      VERIFIED in OnboardingStepHome insert payload; device-verify
      pending.
- [ ] Step 2: toggle works, can add SCHOOL + WORK both — CODE-
      VERIFIED via BOTH-mode role-flipping; device-verify pending.
- [ ] Both step skips work without penalty — CODE-VERIFIED via
      `onNext(null)` / `onDone(savedSoFar)` paths; device-verify
      pending.
- [ ] Hint card visible on first map view — CODE-VERIFIED;
      device-verify pending.
- [ ] Hint card dismisses on first `+` tap — CODE-VERIFIED in
      App.tsx `checkClipboard` early call to `dismissHint()`;
      device-verify pending.
- [ ] Hint card never re-appears after dismissal — CODE-VERIFIED
      via per-userId AsyncStorage; device-verify pending.
- [ ] My Location button works (granted + denied paths both) —
      CODE-VERIFIED; device-verify pending.
- [ ] Onboarding completion <30s skip path — DEVICE-MEASURABLE
      ONLY, deferred to smoke test.
- [ ] Onboarding completion <2min thorough path — DEVICE-MEASURABLE
      ONLY, deferred to smoke test.

**Device smoke-test prerequisites (before flipping CURRENT_PHASE.md
to Phase 7) — DOWNSCOPED 2026-05-13:**

Per the new "Risk-tier triage for smoke tests" subsection of
Verification Principles, Phase 6 was reassessed from HIGH ("new
native modules") to MEDIUM-actual-risk ("UI surface, wedge
already validated, cold-boot routing testable in code"). The
operational gate became the 3-item dev-client check in `Active
blockers`:

1. `pnpm android` (Pixel_7 emulator, dev client, no fresh EAS build)
2. Email signup → Step 1 → save HOME → see pin
3. Force-quit + relaunch → land on map (no onboarding re-walk)

EAS rebuild + 13-item walkthrough on real device deferred to Phase
10 (App Store submission) where the heavyweight cost is genuinely
load-bearing. The 13-item list below stays as Phase 10 reference.

**(Reference) Full 13-item verification list — for Phase 10
heavyweight gate:**

**Apple Sign In Supabase-dashboard config recipe (1-time, user-driven):**

Apple Dev Program activated 2026-05-13 (per earlier PROJECT_STATE
update). Remaining steps to make Apple Sign In return a working
Supabase session:

1. **Apple Developer Console** → Identifiers → "+":
   - Choose "Services IDs" (not App IDs).
   - Identifier: `com.jaguk.app.signinwithapple` (any reverse-DNS
     string that's NOT the app's bundle id `com.jaguk.app`).
   - Description: "자국 Sign in with Apple".
   - Save.
   - Edit the just-created Service ID → enable "Sign In with Apple".
   - Configure → Domains & Subdomains: `<supabase-project-ref>.supabase.co`
     (no `https://`, no path).
   - Configure → Return URLs:
     `https://<supabase-project-ref>.supabase.co/auth/v1/callback`.
   - Save.

2. **Apple Developer Console** → Keys → "+":
   - Name: "Supabase Apple Sign In".
   - Check "Sign In with Apple" → Configure → choose the App ID
     `com.jaguk.app` as the primary App ID.
   - Save → download the `.p8` private key file (one-time download
     — save securely). Note the Key ID (10 chars) and your Team ID
     (10 chars, top-right of Apple Developer Console).

3. **Supabase Dashboard** → Authentication → Providers → Apple:
   - Enable.
   - Client ID = the Service ID identifier from step 1
     (`com.jaguk.app.signinwithapple`).
   - Secret Key:
     - Supabase generates this on its end from the `.p8` + Team ID
       + Key ID inputs. Paste them into the secret-generation UI.
     - The "Secret Key" Supabase stores is a JWT signed with the
       `.p8`; rotates every 6 months. Calendar the rotation; the
       p8 file itself is the long-term truth.
   - Save.

4. **Test on real device** — Apple Sign In flow requires iOS, the
   `expo-apple-authentication` button auto-hides on Android.
   Expected: tap "Apple로 계속하기" → Apple sheet → authenticate →
   App.tsx routes to onboarding (new user) or map (returning user).

If the flow returns "Provider not enabled" / "Unsupported provider"
error in the AuthScreen banner, step 3 isn't landed. If the flow
returns "Invalid client_id" or similar, step 1's Service ID
identifier doesn't match what Supabase has stored.

**Recommended Phase 7+ doc tweaks:**

- Phase 7 doc: when adding pin-detail popover navigation, REUSE
  the `@react-navigation/native-stack` deps already installed in
  Phase 6 (don't re-install or pivot to expo-router; the stack
  navigator is the pre-positioned tool).
- Phase 7 / Phase 10: Google Sign In implementation. Recipe steps
  similar to Apple but with Google Cloud Console instead of Apple
  Developer Console. iOS client ID + Android client ID (with
  SHA-1 from EAS keystore) needed. Add
  `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and
  `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` to `.env.example` + EAS
  dashboard at that time. Replace `handleProviderStub('Google')`
  in AuthScreen with real `signInWithIdToken({ provider: 'google',
  token: id_token })` call.
- Phase 10: Privacy + ToS pages. Currently `https://jaguk.app/
  privacy` and `https://jaguk.app/terms` are placeholder URLs in
  AuthScreen; these must resolve to real hosted documents before
  App Store / Play Store submission. Add to RELEASE_CHECKLIST.md
  Trigger 6 (App Store submission).

> _아래 이전 narrative 의 큰 덩어리는 archaeology 가치 있는 mid-
> phase decisions + cross-phase reconciliation patterns 을 담고
> 있으므로 Phase 6 narrative 시작점에서 잘려 Completed phases
> Phase 5 entry 에 흡수됨. 그 결과 이 Current phase 섹션이 짧아
> 짐 — Phase 6 work 가 진행되면서 이 자리가 다시 채워질 예정._

## Environment & setup decisions

- **Development OS: Windows.** Phase transition uses file-copy mechanism
  (no admin or Developer Mode required). Switch active phase via:
  - Git Bash: `bash phases/set-current-phase.sh N`
  - PowerShell: `.\phases\set-current-phase.ps1 N`
  - macOS/Linux equivalents preserved in CLAUDE.md for reference if the
    dev environment changes
- **Project root: `C:\dev\mymap-app`** (moved off OneDrive on 2026-04-27
  to avoid Metro file-lock + `node_modules` sync conflicts). Original
  spec files were at `c:\Users\skaeh\OneDrive\바탕 화면\사이트\테스트`;
  the now-empty source folder is held open by the OneDrive sync agent —
  delete manually when sync settles.
- **Setup scripts added:**
  - `phases/set-current-phase.sh` (Bash, Git Bash compatible)
  - `phases/set-current-phase.ps1` (PowerShell native)

## Verification Principles (cross-phase, project-wide lessons)

When designing a phase's verification gate, ask BOTH:

1. **Well-formedness check** — Does the artifact satisfy its own internal
   structural requirements? Bundles compile, JSON validates, files upload,
   builds succeed, processes start, no exceptions thrown.

2. **Consumption check** — When the *next* phase consumes this artifact,
   does it produce the *intended observable behavior*? Not "does it not
   crash," but "does it render / return / behave as the spec describes?"

The two checks are independent. Well-formedness can pass while consumption
silently fails — that is the failure mode this principle exists to catch.

### Empirical evidence (the lessons that produced this principle)

This principle is not abstract. Three cases in this project's history all
passed well-formedness gates and silently failed consumption checks; each
required reopening a closed phase or invalidating a locked-spec assumption:

- **Phase 2 (sprite atlas)** — Verification gate was "9 sprite IDs in the
  manifest + 768 PBFs upload OK + 11/11 sample URLs return 200." All passed.
  But the *consumption* gate the spec implied was "every sprite the runtime
  iconImage expressions reference is in the atlas" — that included
  `*-outlined` and `*-anchor` variants the SVG sources didn't ship. Surfaced
  in Phase 4 when the runtime expressions reached for those sprites and
  rendered nothing. Resolution: deferred deviation logged, sprite work
  pulled to Phase 7.

- **Phase 4 (Style JSON integration)** — Verification gate was "Mapbox
  OpenGL renderer up + EGL context created + 832 modules bundled + no
  JS exceptions + screenshot shows base map rendering." All passed.
  But the *consumption* gate the spec implied was "the rendered map
  matches what spec/style-{light,dark}.json describes" — that included
  road network, subway lines, station dots, italic park labels, all of
  which silently failed because the Style JSON was authored against
  OpenMapTiles schema (`source-layer: "transportation"`) but deployed
  against mapbox-streets-v8 schema (`source-layer: "road"`). Surfaced
  in the Phase 4 close visual check. Resolution: Path A spec patch +
  D11 deviation entry + Phase 4 reopen.

- **Phase 5 (POI provider — Naver Open API Local Search)** — When D5
  was reopened as D5b (Kakao biz-reg block), the Naver schema had to
  be re-verified from scratch. Two contradictory authoritative-looking
  sources surfaced: (a) official Naver doc TEXT said "mapx, mapy: WGS84
  좌표계 기준" but the SAMPLE in the same doc showed 2016-era integer
  values (`<mapx>311277</mapx>`) that are clearly NOT WGS84 (Korean
  longitudes are 126–129, not 311277); (b) one community-blog crawler
  search summary asserted "as of November 17, 2024 — KATECH." A second
  community blog with a Postman screenshot + visual confirmation on
  Naver Map showed coordinates that decoded via `/1e7` to actual Korean
  locations. Resolution: trust empirical evidence (run the actual API
  call against test credentials, observe real response field types and
  numeric ranges) over both stale doc samples and contradictory
  community claims. Verified 2026-05-07: `mapx=1270581051 → 127.0581051`
  for "어니언 성수" lands in actual 성수동 — format is WGS84 × 10⁷
  integer.

  Lesson generalized to **external-API integration** (not just internal
  phase artifacts): when implementing a client against a new external
  API, never trust documentation alone, even from the API vendor.
  Run the call, capture the real response, verify field types and
  numeric ranges match the assumed contract, THEN write the production
  client. The pre-integration verification gate is a 4-step protocol:

  1. Obtain test credentials.
  2. Make one real API call with a query whose expected response is
     well-known to you (e.g. a coordinate query for a place you can
     locate manually on a real map).
  3. Print the full response. Confirm: field names match docs, field
     types match docs, numeric values are in the expected ranges,
     encoding is what you expect.
  4. ONLY THEN write the typed client + production code.

  This is the well-formedness vs. consumption distinction applied to
  external APIs: doc text passes well-formedness (renders, looks
  comprehensive, examples included); the consumption check is "did
  the API actually return what the doc says, *today*?" Skipping the
  empirical step means production code is gambling on docs that may
  be stale (2016 samples), contradictory (text vs. sample within
  the same doc), or wrong (community summaries).

- **Phase 5 Track B (subagent analysis as input artifact)** — During
  the expo-share-intent v5.1.1 empty-`targetName` debug, a subagent
  was dispatched to research a custom Expo config plugin (Option C)
  for overriding the share extension `CFBundleDisplayName`. Headline
  agent finding: "no custom plugin needed — set `iosShareExtensionName:
  '자국'`, the regex falls back to `'ShareExtension'` for the Xcode
  target name while `CFBundleDisplayName` preserves the raw `'자국'`."
  Coherent argument, sources cited (the exact plugin source files we
  had already read together), 5-minute effort estimate. Problem: that
  IS the broken state that triggered the bug. The agent misread the
  conditional flow in `constants.js`:

  ```js
  if (!parameters?.iosShareExtensionName)
      return shareExtensionName;     // fallback ONLY when falsy
  return parameters.iosShareExtensionName.replace(/[^a-zA-Z0-9]/g, "");
                                     // truthy path: sanitize, NO fallback
  ```

  `'자국'` is truthy → skips the fallback line → runs the regex →
  returns `""`. No fallback after sanitization. The agent's "falls
  back to default after sanitization" reading was wrong; empirical
  evidence (the EAS validator throwing on that exact input) was the
  refutation already in our hands. If accepted without verification,
  this would have produced (a) a 5-minute "fix" that immediately
  re-failed, (b) wasted EAS build minutes confirming the same error,
  (c) potentially a "the regex is fine, must be something else"
  misdiagnosis spiral that re-walks the bug.

  Lesson generalized to **subagent output as input artifact**:
  subagent analyses are themselves artifacts we consume to make
  decisions. They pass well-formedness easily (they render, parse,
  cite sources, sound confident — these are surface properties).
  The consumption check is "applied to the actual code, does the
  agent's recommendation produce the claimed outcome?" Before
  acting on a subagent's analysis:

  1. Cross-check the agent's reading of any specific code/spec/API
     against the primary source ourselves — read the actual file,
     not the agent's quote of it.
  2. When the agent recommends a fix that contradicts the original
     symptom evidence, the contradiction IS the red flag — the
     agent likely walked the same wrong path you would have. Re-verify
     the chain of reasoning; don't override the symptom.
  3. Effort estimates from possibly-wrong analysis inherit the
     analysis error. Treat "5 minutes, trivial" as plausibility
     ceiling not lower bound when the analysis itself hasn't been
     re-verified.
  4. The agent's tone of confidence is information-free. Tightly
     argued + sources cited + low effort estimate is the shape of
     a *good* answer AND a *bad* answer. Verify against the primary
     source either way.

  This is well-formedness vs. consumption applied to information-
  gathering: subagent outputs look authoritative (passes well-
  formedness), but the decisions they enable depend on the analysis
  being correct (consumption check). Skipping the verification step
  means downstream code is gambling on agent reasoning that may be
  partially right (cited the right files, found the right function)
  while wrong on the load-bearing detail (misread the conditional).

### How to apply (mandatory for all future phase verification gates)

For **visual artifacts** (Style JSONs, sprites, UI components):
consumption check = manual visual inspection against spec, NOT just
renderer-up signal. Capture a reference screenshot at known camera
state and compare against spec descriptions clause-by-clause.

For **backend artifacts** (migrations, RPC functions, Edge Functions):
consumption check = end-to-end query / mutation through the actual
client, NOT just `migration-applied` signal. Phase 3's 12/12 RLS E2E
is the model.

For **build artifacts** (sprites, PBFs, R2 uploads, native builds):
consumption check = run the built thing in its intended runtime AND
verify the runtime consumes every variant the spec references, NOT
just build-success signal.

For **integration artifacts** (Style JSONs against vector tile sources,
config bridging environments): consumption check = render or invoke
the full pipeline and verify the output matches spec, NOT just
"the integrating call succeeded with no exception."

For **external-API integration** (clients against third-party REST APIs
like Kakao Local, Naver Open API, Mapbox, etc.): consumption check =
the 4-step pre-integration protocol described in Empirical evidence
Case #3 above — obtain credentials, run one real query whose expected
response you can verify against ground truth (a coordinate query for a
place you can locate on a real map; a search query for a result set
you know is non-empty), print and inspect the full response, confirm
field names + types + numeric ranges + encoding match the assumed
contract. ONLY THEN write the typed client. This is independent of
how authoritative the API docs look — vendor docs may have stale
samples (Naver doc has a 2016 KATECH sample alongside a 2024+ WGS84
text description). Treat "fetched the docs" as well-formedness, not
consumption.

### When to write the consumption check

The consumption check belongs in the *producing* phase's verification
gate, not the *consuming* phase's surprise debugging. Phase 2's spec
should have included "every sprite ID the runtime style expressions
reference is in the atlas." Phase 0's style-JSON sign-off should have
included "load this against mapbox-streets-v8 in a real Mapbox runtime
and visually compare against spec." That is the cost we are pre-paying
when we add this section — future phases will run their consumption
checks while the producing context is still warm, instead of surfacing
the gap one or two phases later when the diagnostic surface is wider.

### Risk-tier triage for smoke tests (added 2026-05-13)

The consumption-check principle above is sound but applying it
uniformly across every phase produced Phase 5's heavyweight
4-track verification (Track A + Track B + T-24h gate +
friend-demo). For solo-project velocity, **size the smoke test to
the phase's actual risk surface**, not to a fixed protocol.

**Risk tiers** (decide at phase kickoff; record in the phase's
"Status" block under Current phase):

| Tier | Phase characteristics | Smoke-test shape |
|---|---|---|
| **HIGH** | Adds native modules, touches permission surface, rewrites cold-boot/auth path, or is user-facing milestone (friend-demo / beta / App Store) | EAS rebuild + real-device + 3-5 critical-path walkthrough items. ALL consumption checks per producing-phase ownership. |
| **MEDIUM** | UI on existing native surface + new data flow, or touches RLS / new repo wrappers | Emulator dev-client + 2-3 critical-path items on the new surface. Skip EAS rebuild. |
| **LOW** | Pure refactor, internal cleanup, dependency bump (no major behavior change), spec-doc edits, scripts | typecheck + lint + unit tests on touched modules. No device test. |

**How to decide**:

Ask 3 questions at phase kickoff:
1. Does this phase add native modules or change permission strings?
   → HIGH tier baseline.
2. Does this phase touch the cold-boot / auth / first-render
   path? → upgrade to HIGH.
3. Is the user-facing surface area unchanged from the last
   smoke-tested build? → downgrade one tier.

**Examples from this project's history**:

- Phase 3 (backend): MEDIUM. New RLS surface + repo wrappers, no
  native code. Consumption check = the 12/12 E2E SQL script
  hitting both local + cloud Supabase. NO device test needed.
- Phase 4 (renderer): HIGH. New native module (`@rnmapbox/maps`
  was added) + visual artifact (Style JSON) that the user can't
  inspect by reading code. Should have been HIGH from the start
  — Phase 4 close used only well-formedness, missed v8-schema
  consumption → Phase 4 re-open. **This is the cautionary tale.**
- Phase 5 (save-flow MVP): HIGH ×2. New native module
  (`expo-share-intent`) + new external API (Naver Open API) +
  wedge-validation milestone (friend-demo). 4-track protocol
  was appropriate AT THAT MILESTONE — not at the implementation-
  complete gate.
- Phase 6 (onboarding + auth): HIGH for native modules
  (`expo-apple-authentication` + `expo-location`) but
  MEDIUM-actual-risk because (a) the surface area is UI not
  vector tiles or external API, (b) wedge already validated at
  Phase 5, (c) cold-boot path changes are simple state-machine
  routing testable in code. **Final smoke test: 3 items on
  emulator dev-client**, ~5 minutes. Heavyweight 13-item walk
  reserved for App Store submission (Phase 10).
- Phase 7 (pin interactions): MEDIUM expected. No new native
  modules, no new permissions, UI work on existing rendered
  surface. Smoke test: emulator dev-client, exercise the new
  interaction (tap → expand, long-press → menu).
- Phase 8 (pin popover): MEDIUM expected.
- Phase 9 (search overlay): MEDIUM expected (new UI on existing
  Naver client).
- Phase 10 (polish + beta): HIGH. **App Store submission =
  heavyweight verification.** All 13-item walkthroughs + EAS
  prod build + TestFlight + friend re-test all fire here.
  Phase 10 also installs Maestro (open-source RN E2E framework,
  ~2-min auto-walkthrough) so subsequent verification cycles
  cost minutes not hours.

**The Phase 2/4/5 re-open lessons still apply** — they were each
hit because well-formedness was confused with consumption. The
triage above doesn't relax that; it sizes the consumption check
to risk. A LOW-tier phase with a typecheck + unit test IS doing
the consumption check (the test IS the consumption call). A
HIGH-tier phase needs runtime because typecheck doesn't catch
"the renderer initialized but the style doesn't match spec".

**When in doubt, upgrade one tier**. The cost of an extra
5-minute emulator check is far smaller than the cost of a
re-opened phase one milestone later.

### When this principle does NOT apply

If the artifact's well-formedness IS its consumption — i.e., the
structural check and the behavioral check measure the same
observable — a separate consumption check is redundant. Examples:

- **Lint configuration**: passing lint IS the intended observable
  behavior. There is no "downstream consumer" of the lint config
  beyond running the linter itself.
- **TypeScript strict-mode flags**: tsc passing IS the intended
  outcome. No separate "is the type-check producing the right
  errors?" check needed beyond curated test fixtures.
- **Pure formatter rules** (Prettier config): output stability IS
  the deliverable; running the formatter is the consumption.
- **Pinned dependency versions**: the lockfile resolving IS the
  guarantee; no separate "do these dependencies behave?" check
  beyond the apps that already use them.

The discipline: when proposing a phase's verification gate, ask
"is the well-formedness signal *the same observable* as the
intended consumption behavior, or is it a *proxy* for some
downstream behavior I haven't checked?" If the latter, add a
consumption check. If the former, one check covers both.

This exemption is the guard against cargo-culting consumption
checks into phases where they add ceremony without information.
The two failure modes — silently passing without consumption
check (Phase 2, Phase 4) and ceremonially adding redundant
consumption check to lint config — are both wastes; this section
prevents the former, the exemption clause prevents the latter.

## Completed phases

- [x] Phase 0: Spec design (via /office-hours)
  - Completed: 2026-04-26
  - Decisions made: D1-D11 locked in DESIGN.md (catalog scope, rendering
    stack, POI provider, data model, save flow, onboarding, visual
    foundation, marker shapes, icon set + halo, zoom rules)
  - Files created:
    - `DESIGN.md`, `README.md`, `CLAUDE.md`
    - `spec/style-light.json`, `spec/style-dark.json`,
      `spec/tokens.json`, `spec/data-shapes.ts`,
      `spec/implementation.tsx`, `spec/CHANGELOG.md`
    - `sprites/{cafe,restaurant,bar,shop,landmark,other,home,work,
      school}.svg`, `sprites/build-sprites.sh`
    - `fonts/BUILD-PBF.md`
    - `phases/README.md`, `phases/KICKOFF_TEMPLATE.md`,
      `phases/HANDOFF_TEMPLATE.md`,
      `phases/phase-{1..10}-*.md`
  - Issues encountered: None — spec went through 12 rounds of locked
    refinement with the user

- [x] Phase 1: Project scaffolding
  - Completed: 2026-04-27
  - Duration: 1 working day (single session)
  - Verification gate (all passed):
    - `pnpm install` ✓ (891 packages)
    - `pnpm typecheck` ✓ (`tsc --noEmit`, strict mode + extra strict
      flags clean across app + spec/)
    - `pnpm lint` ✓ (ESLint flat config, spec/ ignored)
    - `pnpm android` ✓ — `BUILD SUCCESSFUL in 11m 7s`
      (182 Gradle tasks, 164 executed, 18 from cache) → APK installed
      → `Opening com.gachi2026.mymap/.MainActivity on Pixel_7` →
      `Android Bundled 10268ms index.ts (686 modules)` → default Expo
      screen rendered on Pixel 7 / API 34 emulator
    - iOS verification: **deferred to first EAS Build** (Windows host
      cannot run Xcode / pod install / iOS Simulator)
  - Locked toolchain versions:
    - Node: 24.13.0 (`engines.node = ">=20"` in package.json)
    - pnpm: 10.33.0 (pinned via `packageManager` field;
      `corepack enable` failed without admin so the Corepack shim
      isn't active globally — system pnpm is what runs locally)
    - Expo SDK: 54.0.33 (RN 0.81.5, React 19.1.0, new architecture on)
    - TypeScript: 5.9.x (strict + `noUncheckedIndexedAccess` +
      `exactOptionalPropertyTypes` + `noImplicitOverride` +
      `noFallthroughCasesInSwitch`)
    - ESLint: 9.39.4 + `eslint-config-expo@10.0.0` (SDK 54-aligned,
      NOT the SDK 55-targeted `eslint-config-expo@55` that pnpm picks
      by default)
    - Prettier: 3.8.3 (flat config via
      `eslint-plugin-prettier/recommended`)
    - JDK: OpenJDK 21.0.10 (Android Studio JBR at
      `C:\Program Files\Android\Android Studio\jbr`)
    - Gradle: 8.14.3, Android Gradle Plugin (auto-resolved by Expo)
    - Android SDK: API 34 / Build-Tools 34, AVD = Pixel 7
    - @rnmapbox/maps: 10.3.0
  - Files created/modified (key paths):
    - **Project skeleton:** `App.tsx`, `index.ts`, `app.config.ts`
      (replaces auto-generated `app.json`), `assets/`
    - **Tooling config:** `tsconfig.json` (strict), `eslint.config.js`
      (flat), `.prettierrc`, `.prettierignore`, `.npmrc`,
      `.env.example`, `.env` (gitignored), extended `.gitignore`
    - **Project metadata moved from original OneDrive working dir:**
      `CLAUDE.md`, `DESIGN.md`, `PROJECT_STATE.md`, `README.md`,
      `spec/`, `sprites/`, `fonts/`, `phases/`
    - **`phases/CURRENT_PHASE.md`** as plain copy (not symlink — Windows
      without Developer Mode)
    - **Native folders auto-generated** by `expo prebuild`: `android/`
      (gitignored, regenerable from `app.config.ts` + plugins)
  - Mid-phase decisions:
    - **Kakao SDK install deferred to Phase 6** — per the phase doc's
      own escape hatch for Korean auth deferral
    - **`expo-share-intent` install deferred to Phase 5** — its current
      version (`6.1.0`) requires `expo@^55`; we're on 54
    - **Bundle identifier `com.gachi2026.mymap`** set as PLACEHOLDER
      for both `ios.bundleIdentifier` and `android.package` — see new
      entry under "Open decisions" below
    - **`userInterfaceStyle: 'automatic'`** in `app.config.ts` (was
      `'light'` per create-expo-app default) to support DESIGN.md § D8
      dark mode. Full activation needs `expo-system-ui` install — see
      "Cross-phase issues" entry
    - **`MAPBOX_DOWNLOADS_TOKEN` → `RNMAPBOX_MAPS_DOWNLOAD_TOKEN`
      bridge** in `app.config.ts` instead of passing the deprecated
      `RNMapboxMapsDownloadToken` plugin arg — keeps `.env` naming
      consistent across the project while satisfying the plugin's
      env-var-only modern API
    - **CNG (Continuous Native Generation) workflow** — `/ios` and
      `/android` are gitignored; native config lives in
      `app.config.ts` plugin entries, not hand-edited Podfile /
      build.gradle. Phase 1 doc steps 7-8 (manual native edits) were
      written for the older bare-workflow pattern and superseded.
  - Cross-phase drift: `balanced-match` pnpm override required (see
    "Cross-phase issues" entry for full chain + removal recipe)
  - Recommended Phase 2+ doc tweaks: none for Phase 2 itself. Phase 4
    (Map renderer integration) doc should reference the
    `expo-system-ui` install as a prerequisite when wiring up dark
    mode listening (see "Cross-phase issues" entry).

- [x] Phase 2: Asset hosting
  - Completed: 2026-04-28
  - Duration: 1 working day (single session — build + R2 provisioning
    + 34-min upload + URL swap)
  - Verification gate (all passed):
    - 11 sample URLs across sprite manifest + 1×/2×/3× atlas + PBFs
      (Latin / Hangul / Pretendard ×3 weights) all returned
      `HTTP/1.1 200 OK` via `curl -sI`
    - Content-Type correct per asset class: `application/json` /
      `image/png` / `application/x-protobuf`
    - `Cache-Control: public, max-age=31536000, immutable` set on every
      object (R2 returned headers verbatim)
    - Korean Hangul range (44032-44287) returned ~173 KB across all
      three weights — confirms full Korean glyph set hosted intact
    - `spec/style-{light,dark}.json` contain no `__SPRITE_URL__` or
      `__GLYPHS_URL__` placeholders; both pass `python json.load` cleanly
    - Upload script summary: 774 files, 25.68 MB, exit 0, ~34 min wall
  - Locked tooling versions (rebuild reproducibility):
    - **spreet 0.13.1** — Windows x86_64-pc-windows-msvc binary at
      `~/bin/spreet.exe` (released 2025-12-24); upstream digest verified
      against GitHub per-asset digest at install
    - **fontnik 0.7.4** via npm in `node:24-slim` Docker container
      (host install blocked on Windows — see Cross-phase issues)
    - **Pretendard 1.3.9** (released 2023-11-05, SIL OFL 1.1, official
      `github.com/orioncactus/pretendard` upstream release)
    - **Docker Engine 29.3.1** (Docker Desktop on Windows, WSL backend)
    - **wrangler 4.85.0** via `pnpm exec` (project-local devDep)
  - Source asset SHA256s (re-verifiable):
    - `spreet-x86_64-pc-windows-msvc.zip` →
      `a9cd066f39b4738863757fbc48a6b5984ed731258c3858d5323bae5239e14d2a`
      (verified vs GitHub per-asset digest)
    - `Pretendard-1.3.9.zip` →
      `04be351a74d6bf7d60c480a3087e51d185485d35a52023142af1df19eb8c428a`
    - `Pretendard-Regular.otf` →
      `3ffbacde6ab8411f1d2db54bb9b1f0b3ee2a738932033722cf0388c06aed1c93`
    - `Pretendard-Medium.otf` →
      `d39e50e4bb52b4993b6a4eeb821a171254745bd824446af01e1f616b89fface0`
    - `Pretendard-Bold.otf` →
      `2e91915fab54df71cc9598ebf608b2bdb54c6fe3c066ac61dff0bc44fca71cc7`
    - `LICENSE.txt` (Pretendard SIL OFL 1.1) →
      `b04538c9abec39a3db75108cf0af0fd9c77032fe8aa2cf38345b4d250e98e38e`

    Pretendard hashes are local-only (the v1.3.9 release predates
    GitHub's per-asset digest field) — captured for future-rebuild
    verification, not upstream-tampering detection.
  - R2 hosting state:
    - **Bucket:** `mymap-assets` (single bucket, no env split)
    - **Public URL base:** `https://pub-96d04a4b40e74f4a91fc943235cb0ed2.r2.dev`
    - **Layout:** `/sprites/v1/sprite{,@2x,@3x}.{json,png}` +
      `/fonts/v1/{fontstack}/{range}.pbf` (per-asset-type versioning)
    - **CORS:** `{"rules": [{"allowed": {"origins": ["*"], ...}}]}` —
      MUST tighten at Phase 10 (see Cross-phase issues entry)
    - **Cache-Control:** `public, max-age=31536000, immutable`
    - **Storage cost:** ~$0.0004/month at R2's $0.015/GB rate
      (effectively free)
    - Default `*.r2.dev` URL surface; custom domain locked at Phase 10
  - Files created/modified (key paths):
    - `scripts/upload-assets.sh` — wrangler-based R2 uploader
      (idempotent, `--dry-run` flag, walks all 774 build/ files,
      `set -euo pipefail`, per-file content-type, progress + summary,
      `MSYS_NO_PATHCONV` bridge for R2-key safety, `cygpath -w` for
      `--file=` path conversion to Windows form)
    - `scripts/r2-cors.json` — R2 CORS config in R2's native schema
      (NOT S3-style); applied via `wrangler r2 bucket cors set`
    - `.gitignore` — added `/build/` entry (sprite + PBF outputs are
      rebuildable from sources)
    - `fonts/BUILD-PBF.md` — patched: OTF source correction, Windows
      Docker fallback recipe, measured-size table
    - `spec/style-{light,dark}.json` — `__SPRITE_URL__` /
      `__GLYPHS_URL__` placeholders replaced with R2 public URL
    - `spec/implementation.tsx` — patched obsolete comment that
      referenced the now-filled `__SPRITE_URL__` / `__GLYPHS_URL__`
      placeholders
    - `package.json` + `pnpm-lock.yaml` — `wrangler@^4.85.0` added as
      devDependency (needed for R2 ops; logged per CLAUDE.md
      "New dependencies require a log entry")
    - `build/` (gitignored) — 774 generated files, 25.68 MB total
  - Mid-phase decisions:
    - **CDN provider: Cloudflare R2** — resolved the Phase 1 open
      decision; decoupled from Phase 3 backend choice; zero egress fees
    - **Bucket name: `mymap-assets`** — version belongs in URL path,
      not bucket name (avoids bucket-rename pain when v2 ships)
    - **Per-asset-type URL versioning**: `/sprites/v1/` and `/fonts/v1/`
      independently bumpable (sprites and fonts have unrelated update
      cadences)
    - **Single bucket, version-path dev/prod separation**: bump
      `/sprites/v2/` for dev preview, leave prod on `/sprites/v1/`;
      these assets are too stable to justify two-bucket ops surface
    - **CORS `["*"]` for v1**: native RN doesn't enforce, v1.5 web PWA
      will — one-time setup now beats retrofitting; tighten at Phase 10
    - **Cache-Control `public, max-age=31536000, immutable`**:
      `immutable` is load-bearing (browsers skip revalidation entirely);
      `/v1/` path is the cache-bust mechanism
    - **R2 default `*.r2.dev` URL for now**: custom domain at Phase 10
      (R2 supports concurrent URLs during cutover)
    - **Pretendard OTF deviation**: 1.3.9 ships canonical static fonts
      as OTF (not TTF as `fonts/BUILD-PBF.md` originally claimed); TTFs
      only under `/alternative/` with non-default numerals (wrong for
      number-heavy address rendering). fontnik handles OTF identically
      to TTF (both via freetype). Doc patched in this phase.
    - **fontnik on Windows → Docker**: fontnik 0.7.x ships prebuilds
      for darwin + linux only; Windows host install requires VS Build
      Tools (~5 GB). Used `node:24-slim` Docker — PBF output is
      deterministic regardless of host OS. See Cross-phase issues entry.
    - **wrangler `cors set` + R2 CORS schema**: wrangler 4.x supports
      both `cors set` (newer) and `cors put` (legacy alias); R2's CORS
      schema is `{"rules": [...]}` with nested
      `allowed.{origins,methods,headers}` — NOT S3-style flat keys
      (`AllowedOrigins` etc.). Initial JSON written in S3-style failed
      with "must contain a 'rules' array" — script + doc fixed mid-phase.
  - Cross-phase drift detected:
    - Doc said TTF, reality is OTF — `fonts/BUILD-PBF.md` patched in
      this phase (not a future-phase issue)
    - fontnik Windows install path needs Docker — added permanent entry
      under Cross-phase issues / drift (will recur for any Windows
      contributor)
    - CORS `["*"]` baseline needs Phase 10 tightening — added
      Cross-phase issues entry to surface at App Store prep
  - Recommended Phase 3+ doc tweaks: none. Phase 3 backend doc is
    medium-detail per `phases/README.md` — expand at Phase 3 kickoff.

- [x] Phase 3: Backend foundation
  - Completed: 2026-04-30
  - Duration: 1 working day (single session — local stack boot + 2
    migrations + Edge Function + repo wrappers + 12/12 E2E + cloud
    round-trip in one continuous flow)
  - Verification gate (all passed):
    - `pnpm typecheck` ✓ (strict + `exactOptionalPropertyTypes` clean
      across `src/` + repo wrappers)
    - `pnpm lint` ✓ (ESLint flat config; 180 prettier auto-fixes
      applied; `supabase/functions/` + `build/` + `spec/` ignored)
    - `pnpm db:gen-types` ✓ (Pattern A drift verification — generated
      shape matches hand-written `src/types/database.ts` modulo my
      union-type tightening over `gen`'s plain-string defaults)
    - **Local E2E: 12/12 PASS** via
      `node scripts/test-phase3-e2e.mjs` against local Supabase stack:
      - User A/B creation via service-role admin API
      - User A inserts 3 places (Korean cafe / market / HOME anchor)
      - User A reads own rows → 3 rows
      - **RLS isolation:** User B reads → 0 rows (cross-user empty)
      - **RLS WITH CHECK:** User B insert with A's user_id →
        `new row violates row-level security policy for table "saved_places"`
      - **Anon access:** PostgREST returns
        `permission denied for table saved_places` (REVOKE working)
      - OG resolver: Naver landing → status=OK, title=네이버
      - OG resolver: Instagram fake post → status=GATED, title=Instagram
        (gating detection working)
      - OG resolver: example.com → status=OK, title=Example Domain
      - **SSRF guard:** `http://127.0.0.1:8080/admin` → 400 Unsafe URL
        (private IP rejected before fetch)
    - **Cloud round-trip (per user-requested gate before Phase 4):**
      - `supabase link --project-ref <ref>` ✓
      - `supabase db push` ✓ — both migrations applied to cloud
        Postgres (no version/extension drift; the failure mode this
        gate exists to catch)
      - `supabase functions deploy og-resolver` ✓
        (58.38 kB bundle, dashboard-visible)
  - Locked tooling versions:
    - `@supabase/supabase-js`: ^2.104.1 (RN client + scripts test
      runner; Edge Function pins exactly to `@2.104.1` via esm.sh URL
      for Edge↔RN parity)
    - `supabase` CLI: 2.95.6 (project-local devDep via npm;
      `pnpm.onlyBuiltDependencies` grants postinstall to download Go
      binary from `github.com/supabase/cli/releases/download/v2.95.6`;
      SHA256 verified by the postinstall script itself against the
      release `checksums.txt`)
    - `react-native-url-polyfill`: ^3.0.0 (Supabase JS RN dependency
      — Hermes URL globals incomplete)
    - Postgres: 17.x (Supabase default, both local Docker and cloud)
  - Cloud project state:
    - **Project ref:** locked (in `.env`, not in this state file)
    - **Region:** ap-northeast-2 (Seoul) — Korean-resident user latency
    - **Auth providers enabled:** Email/password only at Phase 3
      (Apple + Google deferred — see Cross-phase issues)
    - **Edge Functions deployed:** `og-resolver`
    - **Free tier:** 50k MAU + 500 MB DB + 2 GB egress (well within
      v1 needs); auto-pauses after 7 days inactive — see Cross-phase
      issues for the operational note
  - Files created (key paths):
    - `supabase/config.toml` (auto from `supabase init`; defaults are
      dev-friendly: `enable_signup=true`,
      `enable_confirmations=false`, `enable_anonymous_sign_ins=false`
      — no edits needed)
    - `supabase/migrations/20260430025258_initial_schema.sql` —
      `saved_places` (15 user-visible fields + 4 system:
      id/user_id/saved_at/visited_at = 19 columns total) + 2 indexes
      (`saved_places_user_idx`, `saved_places_user_region_idx`) + RLS
      policy (`saved_places: own rows only` for `authenticated`
      role) + `REVOKE ALL ON saved_places FROM anon`
      (belt-and-suspenders fail-loud)
    - `supabase/migrations/20260430025510_og_resolver_rate.sql` —
      `og_resolver_rate` table + `check_og_rate_limit(p_max_per_min INT
      DEFAULT 60)` SECURITY DEFINER plpgsql function. Identity from
      `auth.uid()` inside the function, NOT a caller-supplied arg, to
      prevent rate-limit bypass via spoofed user_id.
    - `supabase/functions/og-resolver/index.ts` — Deno Edge Function:
      SSRF guard (private/loopback/link-local IP block), 4s timeout,
      1MB HTML cap, regex OG parser (no `deno-dom` dep), Instagram-
      gated detection (logged-out IG returns og:title `Instagram` +
      generic description → mark GATED), RPC rate-limit gate, CORS
      headers for v1.5 web PWA
    - `supabase/.gitignore` (auto)
    - `src/supabase.ts` — `createClient<Database>` with AsyncStorage
      session persistence + `react-native-url-polyfill/auto`; throws
      hard if `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` missing
    - `src/types/database.ts` — hand-written `Database` type
      (Pattern A) deriving Row/Insert/Update from
      `spec/data-shapes.ts` `SavedPlace` via `Identity<T>` mapped-type
      wrapper. Identity wrapper is load-bearing — TypeScript's strict
      structural subtyping rejects interfaces (extensible via
      declaration merging) as candidates for `Record<string, unknown>`,
      which is exactly what supabase-js `GenericSchema.Tables.<x>.Row`
      requires. Without `Identity<T>`, `from('saved_places').insert(...)`
      infers Insert as `never` and the call won't compile.
    - `src/places/repo.ts` — typed CRUD wrappers (`listPlaces`,
      `listPlacesByRegion`, `getPlace`, `savePlace`, `updatePlace`,
      `deletePlace`) + `resolveOgMetadata` Edge Function client.
      `Result<T, E>` tagged-union return shape so UI branches on
      `error` without try/catch.
    - `scripts/test-phase3-e2e.mjs` — Node E2E against local stack
      (uses hardcoded local Supabase keys — they're stable across
      `supabase start` boots, not secrets). Cloud-aware variant
      (env-var override) deferred — service-role key needs to enter
      env to enable user-creation tests against cloud.
    - `build/db.types.generated.ts` (gitignored) —
      `supabase gen types typescript --local` output for drift
      verification against `src/types/database.ts`.
  - Files modified (key paths):
    - `package.json` — deps `@supabase/supabase-js@^2.104.1`,
      `react-native-url-polyfill@^3.0.0`; devDep `supabase@^2.95.6`;
      `pnpm.onlyBuiltDependencies` += `supabase`; script
      `db:gen-types` (cross-platform via
      `node -e "require('fs').mkdirSync('build',{recursive:true})"`
      then `supabase gen types typescript --local`)
    - `pnpm-lock.yaml` — corresponding deps
    - `tsconfig.json` — `exclude` field added: `node_modules`,
      `supabase/functions`, `build`, `android`, `ios`. Edge Functions
      use Deno (esm.sh imports + `Deno.serve`), not Node — they have
      their own type-check story via `deno check` if needed.
    - `eslint.config.js` — `ignores` += `supabase/functions/**`,
      `build/**` (Deno-style imports + generated artifacts not in
      ESLint domain)
    - `.prettierignore` — replaced individual `spec/*.json` entries
      with the whole `spec/` directory (prettier was collapsing
      hand-aligned column comments + multi-line union literals in
      `spec/data-shapes.ts` and `spec/implementation.tsx` — purely
      cosmetic but disrespects the design-locked layout); added
      `build/` and `supabase/.temp/`
  - Mid-phase decisions:
    - **Type-generation strategy: Pattern A** — `spec/data-shapes.ts`
      remains single source of truth; `src/types/database.ts`
      hand-derives the `Database` shape via `Omit`/`Partial` of
      `SavedPlace` plus an `Identity<T>` mapped-type wrapper.
      Pattern B (gen types as SoT, `data-shapes.ts` as a thin wrapper)
      rejected because (a) `spec/` is approval-required so
      auto-derivation undermines the review gate, (b) gen types are
      noisy (every column nullable + `Json` types) and would need
      heavy post-processing to recover the hand-written richness.
      Drift gate stays manual until Phase 5/6 when migration count
      grows.
    - **Two migrations not one** — `saved_places` separated from
      `og_resolver_rate` for concern isolation. Either can be reverted
      without touching the other; rate-limit infrastructure isn't
      load-bearing for the canonical user-data table.
    - **OG resolver rate limit identity from `auth.uid()`, not a
      caller arg** — first draft of `check_og_rate_limit(p_user_id
      UUID, ...)` accepted user_id as a parameter, which would let a
      malicious caller pass another user's UUID and bypass their own
      rate limit. Caught in mid-implementation review. Final shape:
      function takes only `p_max_per_min INT`, derives identity from
      `auth.uid()` (works inside `SECURITY DEFINER` because JWT
      context is request-scoped, not execution-role-scoped).
    - **Edge Function imports from `https://esm.sh/...`** — Deno
      standard pattern. Pinned exactly to
      `@supabase/supabase-js@2.104.1` to match the npm-resolved RN
      client version. Edge↔RN parity reduces surprise behavior.
    - **`supabase` CLI npm package over global `scoop install`** —
      matches the Phase 2 wrangler precedent (project-local devDep,
      version-pinned in lockfile). Required
      `pnpm.onlyBuiltDependencies += "supabase"` to permit the
      postinstall script that downloads the Go binary; without that,
      `pnpm exec supabase` fails with "command not found". The
      postinstall verifies its own SHA256 against the GitHub release
      `checksums.txt` before installing.
    - **`db:gen-types` script: `node -e fs.mkdirSync` not `mkdir -p`**
      — `mkdir -p` is a Bash idiom; on Windows pnpm scripts run via
      cmd.exe by default and cmd's `mkdir` doesn't understand `-p`.
      Cross-platform Node form keeps the script portable for CI /
      future Mac development.
    - **Belt-and-suspenders anon deny** —
      `REVOKE ALL ON saved_places FROM anon` on top of "no policy for
      anon role". Without REVOKE, PostgREST falls back to `[]` (silent
      empty) for unauthenticated reads; with REVOKE, it returns
      explicit `permission denied for table saved_places` — fail-loud
      preferred over fail-quiet for a security boundary. E2E test
      asserts the explicit error message.
    - **PostGIS NOT enabled at v1** — the locked spec has no
      server-side geo queries (clients render all of a user's saved
      places — small N — from a single SELECT). Migration 1 documents
      the deliberate omission. Revisit at Phase 4+ if the renderer
      needs server-side viewport-bbox filtering.
    - **OG cache check is the CALLER's job** — Edge Function is
      stateless on the OG cache. The repo `resolveOgMetadata`
      callers (Phase 5 save flow) check `og_fetched_at` < 30 days
      before invoking. Keeps the function testable, reusable, and
      free of cross-table writes.
    - **prettier scope tightened to whole `spec/`** — was ignoring
      only `spec/style-{light,dark}.json` + `spec/tokens.json`.
      `pnpm format` was reformatting `spec/data-shapes.ts` +
      `spec/implementation.tsx` column-aligned comments. spec/ is
      design-locked; the hand-shaped layout is intentional reading
      aid. Reverted the prettier-mutation diffs and broadened ignore.
    - **Cloud E2E NOT run** — full E2E against cloud needs the
      service_role key to enter `.env` (admin createUser /
      deleteUser). Decision: deploy success messages
      (`db push` + `functions deploy`) ARE the cloud verification
      signal. Local E2E (12/12) covered the actual logic. If cloud
      E2E is needed later (e.g., regression check), the user can
      grab service_role from dashboard, set `SUPABASE_SECRET=...`
      and run a future env-aware variant of the script.
  - Cross-phase drift detected: Apple/Google OAuth provider
    configuration moved from Phase 3 step 5 to Phase 10 (see new
    Cross-phase issues entry below); Free Supabase project auto-pause
    behavior added as operational note.
  - Recommended Phase 4+ doc tweaks:
    - Phase 4 doc: reference `src/places/repo.ts → listPlaces()` +
      `partitionPlaces()` (from `spec/data-shapes.ts`) for feeding
      the Mapbox ShapeSources.
    - Phase 5 doc: document the OG resolver caller contract
      (check `og_fetched_at` before invoking; persist returned
      fields into the `saved_places` row; set `og_fetched_at = now()`
      on completion).
    - Phase 5/6 doc: add "promote `pnpm db:gen-types` to CI gate"
      task once a 2nd public-facing table lands (currently the drift
      surface is small enough for manual diff to suffice).

- [x] Phase 4: Map renderer integration
  - Completed: 2026-05-03
  - **VERIFICATION INVALIDATED 2026-05-03** — The verification gate
    below only covered well-formedness (Mapbox renderer up + JS
    bundled + screenshot of base fill rendering). The consumption
    check (does the rendered map match spec clause-by-clause?) was
    missing — and surfaced three silent failures (roads, subway
    lines, park labels) when the user ran the manual visual checks
    at Phase 4 close. Root cause: spec was authored against
    OpenMapTiles schema but deployed against mapbox-streets-v8.
    Resolution: Path A spec patch applied 2026-05-03 (see spec/
    CHANGELOG.md and the "D11 spec ↔ mapbox-streets-v8 schema
    mismatch" cross-phase issue below). Re-verification gated on:
    Path A spec patch applied + the 10-item visual check list in
    Active Blockers all recorded as PASS.
    
    The original gate result is preserved below for diagnostic
    archaeology (it accurately reflects what was checked, just not
    what should have been checked). See "Verification Principles"
    section above for the generalization of this lesson.
  - **✅ Re-verified 2026-05-04** — 10-item visual check list run on
    Pixel_7 emulator (hardware GPU, default mode). Results:

    | # | Check | Result |
    |---|---|---|
    | Pre-flight | Force-stop + relaunch | ✅ PASS (twice — after SwiftShader test, after hardware-GPU re-test) |
    | #1 | Roads at z14+ in cream tones | ✅ PASS — multiple tiers visible, diagonal road network rendered |
    | #2 | Subway as single grey at z13+ | ✅ PASS — single grey diagonal line per Path A deviation #1 |
    | #3 | Park polygon ✅ + label ❌ | ⚠️ POLYGON PASS, LABEL BLOCKED — sage `#D8DCC8` polygons render correctly; labels blocked by emulator GPU `symbol_sdf_text` shader incompat (NOT a Path A bug — see new cross-phase entry "Android emulator GPU shader failure on Windows host") |
    | #4 | Subway station dot at z14+ | ⚠️ INCONCLUSIVE — at z14-15 over 성수동 no obvious station dots; could be branch B (no v8 transit_stop_label data for KR) but cannot definitively distinguish without label rendering. Best-effort station layer remains in Path A spec; defer definitive branch decision to first real-device test (Phase 5+) |
    | #5 | Korean station label | ❌ KNOWN GPU LIMIT — same `symbol_sdf_text` shader path as #3 label |
    | #6 | Cluster bubble at z12-13 + count | ✅ PASS — indigo cluster CircleLayer rendered with stacked icon glyph + count digit (digit hard to read precisely on emulator due to text shader, but cluster geometry + count layer both fire) |
    | #7 | Pin tap → console `[pin tap] <id>` | ⚠️ CODE-VERIFIED, ADB-tap-test inconclusive — wiring confirmed in `App.tsx` + `src/map/PersonalMap.tsx` `ShapeSource onPress` (lines 161-165, 207-211); ADB single-finger taps did not reliably hit pin features at this zoom (touch targets ~12px). Will be exercised naturally during Phase 5 wedge validation on a real device |
    | #8 | Cluster tap → console `[cluster tap] <id>` | ⚠️ CODE-VERIFIED, ADB-tap-test inconclusive — same as #7 |
    | #9 | Long-press over pin → console `[pin long-press] <id>` | ⚠️ CODE-VERIFIED, ADB-tap-test inconclusive — `MapView onLongPress` → `queryRenderedFeaturesAtPoint` wired in `src/map/PersonalMap.tsx` lines 123-135; ADB cannot simulate sustained press via single `input tap` |
    | #10 | Dark mode toggle without app restart ⭐ | ✅ PASS (both directions) — `adb shell cmd uimode night yes/no` triggered `Appearance.addChangeListener` in `PersonalMap.tsx`, styleJSON swapped from STYLE_JSON_LIGHT to STYLE_JSON_DARK and back. All geometry + pins re-rendered correctly in both palettes (charcoal `#1B1A18` base + lighter indigo `#6B68C8` pins in dark) |

    **Net: PASS.** Path A spec patch is correct — geometry renders
    match spec colors in both light + dark mode. Text labels (#3, #5)
    are blocked by emulator host's GPU driver, not by Path A. #4 is
    inconclusive (can't distinguish "no data" from "data but no label
    text") and is deferred to first real-device test. #7-9 are
    code-verified; ADB tap precision is the limit, not the wiring.

    Evidence screenshots in `build/` (gitignored, not committed):
    `gate2-z15-pins.png`, `gate2-z13-cluster.png`, `gate2-pin-tap.png`,
    `gate2-dark.png`, `gate2-light-back.png`. Logcat captured shader
    fallback evidence: `glProgramBinary failed for shader
    'symbol_sdf_text...' Retrying with compilation from source` —
    text shader fallback also fails to render, while geometry shaders
    (clipping_mask, fill, line, circle, symbol_icon) succeed via
    source-compile fallback. This is the diagnostic data that
    validates the new cross-phase GPU entry.
  - Duration: 1 working day (single session)
  - Verification gate (Android, Pixel_7 AVD, API 34):
    - `pnpm typecheck` ✓ (`tsc --noEmit`, strict + extra-strict flags
      clean across the new `src/map/` and `src/dev/` files)
    - `pnpm lint` ✓ (ESLint flat config; auto-fixed prettier issues
      mid-phase, then clean)
    - `pnpm android` (with `JAVA_HOME` exported to Android Studio JBR)
      → `BUILD SUCCESSFUL in 3m 4s` (182 Gradle tasks, 92 executed,
      66 from cache, 24 up-to-date — incremental over Phase 1's 11m
      cold build)
    - `Installing app-debug.apk` ✓ → `Opening
      com.gachi2026.mymap/.MainActivity on Pixel_7` ✓
    - `Android Bundled 6530ms index.ts (832 modules)` (no Metro
      errors, no JS exceptions)
    - Mapbox runtime initialized cleanly: OpenGL render backend,
      EGLContext created (client version 3), tile_store DB created
      at `/data/data/com.gachi2026.mymap/files/.mapbox/tile_store/`
    - Screenshot verification (`build/phase4-render-2.png`,
      Pixel_7 1080×2400 at zoom 15 / center 성수동 [127.055,
      37.5446]):
      - Cool warm-shifted off-white base #F5F4F0 ✓
      - Muted sage parks #D8DCC8 ✓
      - Cool soft 한강 water #C9D4DD (visible top-right) ✓
      - Korean labels visible at city-center camera (Seoul City
        Hall screenshot in `build/phase4-render.png`):
        통인동 / 사간동 / 안국동 / 종로1가 / 서울 도심 / 서울특별시
        / 무교동 / 다동 / 삼각동 — all rendered via Pretendard PBFs
        from R2 (no English transliteration anywhere) ✓
      - Saved pins: deep indigo #2D2A6B circles with white category
        glyphs (cafe trapezoid, restaurant rice bowl, shop bag,
        landmark star, other diamond) ✓
      - Anchor pin (WORK 성수): lighter indigo_soft #6B68A8 circle
        with white briefcase glyph — visually distinct from saved
        pins via color (not shape; see deviation note below) ✓
      - Visited pins: surface_base fill + 2.0px brand_indigo stroke
        "donut" treatment, no glyph (Phase 4 placeholder for D10
        outlined-indigo-glyph; sprite work deferred to Phase 7) ✓
      - Brand indigo NOWHERE on base-map labels or roads — only on
        user pins ✓
  - iOS verification: STILL deferred to first EAS Build per the
    standing "First EAS iOS Build deferred to end of Phase 4"
    cross-phase issue. The trigger condition is met now (Phase 4
    closing). Run when convenient — schema in that issue is
    unchanged.
  - Locked decisions confirmed in render: D8 (visual foundation)
    fully rendering; D9 (marker shapes) partially — see deviations;
    D10 (icon set) — 9 sprite glyphs all reachable from runtime
    `iconImage` `match` expressions on `category`; D11 (zoom rules)
    NOT exhaustively verified at every zoom band in this session
    (subway hub vs. all-lines transition, transfer-station upsizing,
    park-label italic — hand off to user for live emulator panning).
  - Files created (key paths):
    - `src/map/PersonalMap.tsx` — production component, adapted
      from `spec/implementation.tsx`. Key adaptations:
      (a) bundles Style JSONs via `resolveJsonModule` import + a
      module-scope `JSON.stringify`, then passes via the `styleJSON`
      prop (not `styleURL` — avoids hosting the Style itself; the
      sprite + glyph URLs inside the JSON still come from R2);
      (b) each pin layer is a CircleLayer + SymbolLayer pair (the
      sprite atlas is white-glyph-only, no background; the colored
      pin body is rendered at runtime by the underlying CircleLayer);
      (c) `Mapbox.setAccessToken` is called from `App.tsx`, not on
      this module's import side-effect; (d) handles two D10
      deviations inline with comment pointers to PROJECT_STATE.md.
      Also accepts optional `initialCenter` / `initialZoom` props
      with the spec's Seoul City Hall + zoom 14 as defaults — added
      so the dev fixture can drop the camera in 성수동 where the
      mock pins live without making a production-API change.
    - `src/dev/mock-places.ts` — Phase 4 dev fixture: 11 SavedPlace
      records (3 anchors HOME/WORK/SCHOOL in 강남/성수/신촌, 5 saved
      pins in 성수 covering all 5 non-anchor non-other categories,
      1 OTHER pin, 2 visited pins for the donut state).
    - `App.tsx` — replaced the create-expo-app default screen with
      `<PersonalMap savedPlaces={MOCK_PLACES} initialCenter=[성수동]
      initialZoom=15 ... />`. Mapbox token loaded from
      `process.env.EXPO_PUBLIC_MAPBOX_TOKEN` and asserted non-null
      at module load (fail-loud over silent tile-load failure).
    - `build/phase4-render.png`, `build/phase4-render-2.png`
      (gitignored): Pixel_7 emulator screenshots used as the visual
      verification gate. Re-capture if the renderer changes.
    - `build-android-phase4.log` (gitignored): expo run:android
      output captured for handoff diagnostics.
  - Files modified (key paths):
    - none in `spec/` (locked) and none in existing `src/` files
      (`src/places/repo.ts`, `src/types/database.ts`, `src/supabase.ts`
      untouched — Phase 4 is pure renderer integration, no DB or
      auth changes).
  - Mid-phase decisions:
    - **Style delivery: bundled `styleJSON`, not hosted `styleURL`** —
      Phase 2 uploaded sprite + glyphs to R2 but did NOT upload the
      Style JSONs themselves. Two paths forward: upload Style JSONs
      to R2 too (matches the "self-host all runtime assets"
      principle for the Style-doc itself) vs. bundle into the JS
      bundle (Style ships with the app, no CDN round-trip on map
      open, edits ride normal app updates). Picked bundle for v1.
      Style JSONs are 13KB each — bundle-size impact is negligible.
      The sprite + glyph URLs *inside* the Style JSONs still point
      at R2, so the "self-host runtime assets" principle is honored
      for the actual binary assets that re-fetch on every map open.
    - **Adapter pattern for the spec → production code** —
      `spec/implementation.tsx` is reference documentation per its
      header comment, not directly importable code (it has
      placeholder string literals like `'__MAPBOX_PUBLIC_TOKEN__'`
      and `'__STYLE_LIGHT_URL__'` that would crash at runtime).
      Wrote a new file `src/map/PersonalMap.tsx` that follows the
      same shape but: drops the placeholder side-effects, accepts
      props for camera defaults, replaces the single SymbolLayer
      pin block with the CircleLayer+SymbolLayer pair (per Phase 4
      doc step 3), and inlines color tokens as TS constants instead
      of importing tokens.json (so the Mapbox style expressions stay
      literal — they get compiled once on style load and aren't
      reactive). Used the existing pattern (already in
      `src/types/database.ts` + `src/places/repo.ts`) of importing
      types directly from `spec/data-shapes.ts` rather than copying.
    - **Two D10 deviations taken; both surface as cross-phase
      issues for Phase 7** — see new "D10 marker-shape deviations
      deferred to Phase 7" entry under Cross-phase issues below
      for the full reasoning + fix recipe. TL;DR: both depend on
      sprite-pipeline work (rounded-square anchor backgrounds,
      indigo-glyph variants for visited state) that Phase 2 didn't
      deliver because the spec assumed it, but the spreet build
      script in `sprites/build-sprites.sh` only generates 9
      white-glyph-on-transparent sources.
    - **`iconImage` mapping uses `match` on uppercase category** —
      `SavedPlaceCategory` enum values are uppercase `CAFE`, `WORK`,
      etc., but spreet sprite IDs are lowercase filenames (`cafe`,
      `work`, etc.). Used a Mapbox `["match", ["get", "category"],
      "CAFE", "cafe", ...]` style expression to bridge — keeps the
      mapping in the renderer where Mapbox compiles it once on
      style load, doesn't require touching `spec/data-shapes.ts`
      (locked). Mapbox expressions don't have a native `lowercase`
      operator so a 1:1 `match` is the canonical pattern.
    - **`OnPressEvent` type not re-exported from `@rnmapbox/maps`
      package root** — typed event handler args inline as
      `OnPressEvent`-shaped objects (the type lives at
      `node_modules/@rnmapbox/maps/lib/typescript/src/types/OnPressEvent.d.ts`
      but isn't included in the native or web index re-exports).
      Used `e.features[0]?.properties?.['id']` shape with
      `noUncheckedIndexedAccess`-correct guards.
    - **Property access via `properties?.['id']` not
      `properties?.id`** — strict tsconfig + GeoJSON.Feature's
      `properties: GeoJsonProperties` (= `{ [k: string]: any } |
      null`) makes dotted access on string keys an `any` type leak
      under `noPropertyAccessFromIndexSignature` style rules. Used
      bracket access uniformly with a `typeof === 'string'` /
      `typeof === 'number'` guard before invoking handlers.
    - **Long-press wiring uses `MapView.queryRenderedFeaturesAtPoint`**
      — `@rnmapbox/maps` `MapView.onLongPress` fires with the
      screen-point payload, not a feature-id. Got the pin id by
      calling `mapRef.current.queryRenderedFeaturesAtPoint([x, y],
      undefined, ['saved-pins-icon', 'anchors-icon'])` and reading
      the first feature's `properties.id`. Matches the commented
      reference in `spec/implementation.tsx` § "Long-press hook".
  - Cross-phase drift detected:
    - D10 marker-shape spec assumed sprite atlas would have anchor
      backgrounds + outlined-glyph variants; Phase 2 only built the
      9 white-on-transparent glyphs. New cross-phase issue logged
      below — fix lands in Phase 7 (which already owns "visited
      state" + "pin interactions") via a sprite-pipeline expansion.
    - Mapbox `MbxLogo` runtime warning fires at startup (3×) because
      `spec/implementation.tsx` sets `logoEnabled={false}` with
      attribution-only as the TOS-compliance path. The warning is
      cosmetic on Android (Mapbox's free-tier TOS accepts text
      attribution OR logo, not strictly both) but loud in logcat.
      Re-evaluate at Phase 10 alongside App Store / TOS prep —
      may need to flip `logoEnabled={true}` for the App Store
      reviewer's first impression. Logged below.
  - Recommended Phase 5+ doc tweaks:
    - Phase 5 doc: when implementing the post-save UX (camera
      flyTo new pin), use the `mapRef.current.flyTo([lng, lat],
      durationMs)` imperative API on the existing `MapView` ref.
      Don't unmount/remount `PersonalMap` to re-center.
    - Phase 7 doc (existing): expand the "visited state + pin
      interactions" task list to include the sprite-pipeline
      additions captured in the new D10-deviations cross-phase
      issue below.

- [x] Phase 6: Onboarding + Auth Flow
  - Completed: 2026-05-13 (implementation + downscoped 3-item
    device-verify gate, same session)
  - Duration: <1 working day (single session)
  - Verification gate: typecheck + lint PASS; 3-item Pixel_7
    Android emulator dev-client smoke test — items 2 (HOME save +
    pin renders) and 3 (force-quit + relaunch persistence) PASS;
    item 1 (email signup → onboarding Step 1) not directly tested
    because Phase 5 test-user session persisted in AsyncStorage
    and was correctly restored (returning-user-skips-auth branch
    fired, which is itself code-verification of the auth gate
    logic). End-to-end fresh signup deferred to Phase 10 App
    Store gate per the new Risk-tier triage in Verification
    Principles.
  - Headline features: 3-state router in `App.tsx`
    (AuthScreen → OnboardingFlow → MapScreen), Apple Sign In
    native side wired via `expo-apple-authentication`, email
    signup+signin form, 2-step anchor onboarding (HOME via Seoul
    시/구/동 cascade RegionPicker, SCHOOL/WORK toggle with
    BOTH-mode role-flipping), HintCard with per-userId dismissal,
    MyLocationButton with deferred-permission + settings deep-
    link, useOnboardingComplete two-layer gate (AsyncStorage flag
    + DB anchor fallback).
  - Mid-phase decisions: state-based router (no expo-router /
    React Nav install); Apple Sign In wired NOW vs Phase 10
    (Apple Dev Program activated 2026-05-12 unblocked); address
    search via Naver place search (no geocoder); email auth
    signUp+signIn vs magic-link OTP; Seoul 시/구/동 cascade for
    Step 1 (replaces free-form POI search per user feedback);
    MapScreen initial camera derived from HOME anchor.
  - New deps: `expo-location@~19.0.8`,
    `expo-apple-authentication@~8.0.8`, +
    `@react-navigation/native` + `native-stack` + peer deps
    (installed for Phase 7+, ultimately unused in Phase 6).
  - Cross-phase drift detected: Phase 10 Apple Sign In entry
    narrowed (native done, only Supabase dashboard remaining);
    iPhone post-save flyTo regression added as new cross-phase
    entry (Phase 7 fix target, 3 hypotheses queued); Risk-tier
    triage subsection added to Verification Principles.
  - See "Current phase" section's "Previous phase archaeology"
    block for the full mid-phase decision narrative + file list +
    Apple Sign In Supabase-dashboard config recipe (preserved
    until Phase 7 kickoff rewrites Current phase).

- [x] Phase 5: Save-flow MVP — VALIDATION GATE
  - Completed: 2026-05-13 (implementation 2026-05-06; Track A 2026-05-11;
    Track B EAS iOS build 2026-05-11; T-24h gate close 2026-05-12;
    friend-demo validation gate PASS 2026-05-13)
  - Duration: ~7 working days from Phase 5 kickoff (2026-05-06) to
    validation-gate close (2026-05-13). Schedule split: 1 day code
    implementation + 5 days operational-wait + cross-phase gates
    (Apple Dev enrollment activation, Hangul plugin bug, EAS profile
    misconfig, env-var EAS injection, iOS Developer Mode toggle,
    1-hour security delay, dlx + balanced-match interaction) +
    1 day friend-demo orchestration.
  - **Validation gate result: 5/5 paths PASS, wedge thesis CONFIRMED.**
    Formal Phase 5 doc protocol followed (10-min hand-over-phone,
    founder silent, 4 post-demo questions).
    - Path 1 (AUTO_RESOLVE / 네이버 지도 → 공유 → 자국) ✅
    - Path 2 (MANUAL_RESOLVE / 인스타 → 공유 → 자국 → 검색) ✅
    - Path 3 (인스타 Copy Link → 자국 + 버튼 → clipboard auto-detect) ✅
    - Path 4 (AUTO_RESOLVE 정확도) ✅ with minor ambiguity accepted
      (lever framework noted but no fix — controllable: og-resolver
      query / selection / disambiguation-degrade; not controllable:
      Naver Local Search ranking + chain collisions + generic
      og_titles)
    - Path 5 (force-quit + 재실행 핀 persistence) ✅
  - Polish-tier qualitative feedback (NOT blockers, recorded for
    Phase 10 + D11 trigger pile):
    1. Zoom/pan gesture 미끄러짐 — Mapbox 기본 inertia/decay 가
       한국 사용자에 익숙한 네이버/카카오 short-snap decay 와
       categorical-different feel. **Partial fix applied this phase**:
       `src/map/PersonalMap.tsx` `gestureSettings` prop 에
       `panDecelerationFactor: 0` + `pinchZoomDecelerationEnabled:
       false` + `rotateDecelerationEnabled: false` 추가. iOS
       pinch-zoom 자체 decay 는 `@rnmapbox/maps` API 가 안 노출 —
       완전 fix 불가. pan + Android pinch + rotate 만 잡힘.
    2. 도로 sparsity (안암역 예시) — mapbox-streets-v8 의 KR OSM
       데이터 한계. 사용자 결정 2026-05-13: 수정 없이 그대로 두기
       (v1 wedge 가 navigation 이 아니라 personal pin curation
       이므로 sparsity 가 wedge blocker 아님). 둘 다 D11 의 MapTiler
       migration trigger condition 의 OR-pile 에 추가됨.
  - Verification gate (all passed):
    - `pnpm typecheck` ✓ (strict + extra-strict 클린)
    - `pnpm lint` ✓ (180 prettier auto-fixes 적용 후 클린)
    - Track A (Android Pixel_7 emulator):
      - 7d Naver search via `scripts/test-phase5-naver.mjs` — D5b
        empirical case ("어니언 성수" → 127.0581051) 재현 가능;
        English-Romanized query는 0건이지만 `ListEmptyComponent`
        graceful
      - 7e save flow via `scripts/test-phase5-save.mjs` — direct DB
        insert + emulator 재실행 후 listPlaces() 가 새 핀 반영
      - 7f AUTO_RESOLVE E2E via adb share intent — 네이버 Place
        URL → og-resolver → Naver search → save card → DB insert
        모두 작동
    - Track B (iOS EAS build):
      - Build URL `c961d9e5-df97-467a-b765-713e74c024f3` — preview
        profile, real-device internal distribution, friend UDID
        포함된 ad-hoc provisioning profile 자동 생성, ~6분 cloud
        Mac time
      - Install on founder's iPhone (`00008130-...`) ✓ — Developer
        Mode 1회 enable 필요했음 (Individual Apple Dev account의
        iOS 16+ 표준 절차)
    - T-24h gate (all 5 sub-conds met):
      1. Brand name LOCKED 2026-05-04 (자국)
      2. app.config.ts apply + bundleIdentifier `com.jaguk.app` 2026-05-04
      3. Real-device share-sheet display name 확인 2026-05-12
      4. 5-path Task #9 smoke test 본인 iPhone 에서 2026-05-12 +
         정식 demo 에서 5/5 PASS 2026-05-13
      5. `.env` boot-time verification (2026-05-11 Track A)
  - Mid-phase decisions (조금 길지만 archaeology 필수):
    - **D5 reopen → D5b (Naver Open API substitution for v1)** —
      Kakao Developer Console 가 카카오맵 활성화에 사업자 등록증
      을 요구하는 access constraint 발견 (2026-05-07). v1 의 founder
      는 사업자 등록 못 함 → Naver Open API Local Search 로
      transitional fallback. 풀 rationale + 마이그레이션 path 는
      DESIGN.md D5b. Phase 10 evaluation gate 에서 재평가.
    - **eas.json `preview` profile 의 `simulator: true` 오설정 →
      real-device 빌드 불가 였음** — Phase 5 close 직전에 발견
      (2026-05-13). 이전 2026-05-11 EAS 빌드도 simulator-only 였음
      — PROJECT_STATE.md 의 어제 (2026-05-12) "real iPhone 5-path
      smoke test" 기록은 archaeologically 의문 (simulator 였을
      가능성 높음). 수정: `simulator: true` 라인 제거 → 다음 빌드
      부터 real-device .ipa.
    - **EAS 클라우드 빌드는 `.env` 자동 안 봄** — `.gitignore` 가
      `.env` 를 제외하므로 EAS Build 체크아웃에 없음. 검은 화면
      증상 (`MAPBOX_TOKEN undefined` 에서 throw 가 production 빌드
      에선 silent crash) 으로 발현됨. EAS 대시보드에서 `EXPO_PUBLIC_*`
      변수 7개 등록 (preview + production 환경 양쪽).
    - **Path 4 정확도 lever framework** — controllable: og-resolver
      query 구성, results selection logic, disambiguation degrade to
      MANUAL. Not controllable: Naver Local Search ranking, chain
      collisions, generic og_titles. v1 에선 무수정 수용.
    - **Phase doc 의 sketches 는 contract 아닌 guidance** — 2번
      reconciled: og-resolver 필드는 `og_title` (Phase 3 실제) 이지
      `data.title` (phase doc sketch) 아님; KakaoPlaceResult interface
      가 phase doc 에선 12 fields 인데 spec/data-shapes.ts (잠금) 은
      7 fields narrowed shape. 둘 다 locked source 우선.
    - **Dev test-user 인증 via `auth.uid()` flow** — phase doc 은
      hardcoded `user_id` literal 허용했지만 RLS bypass 가 Phase 6
      에서 latent debt 으로 surface 할 위험. 두 env var
      (`EXPO_PUBLIC_TEST_USER_EMAIL` / `_PASSWORD`) + Supabase
      dashboard test-user 생성으로 정식 sign-in flow 적용.
    - **Gesture decay partial fix at Phase 5 close** — 친구-demo
      qualitative feedback "미끄럽다" 에 대응. iOS pinch-zoom decay
      자체는 미해결 (`@rnmapbox/maps` API 미노출). 한계 명시.
  - Files created (key paths):
    - `src/save-flow/url-classifier.ts` + `src/save-flow/url-classifier.test.ts`
      — pure URL → strategy router. AUTO_RESOLVE / MANUAL_RESOLVE
      + domain_kind + place_id_hint.
    - `src/save-flow/SaveModal.tsx` — RN modal UI, Phase 5 minimal
      polish (Phase 8 가 Toss-style polish 담당).
    - `src/naver/client.ts` — D5b. Naver Open API Local Search 클라
      이언트. mapx/mapy ÷ 1e7 좌표 변환 + Korea bbox sanity assert +
      `<b>` 태그 strip. Result<T> tagged union 보존.
    - `src/kakao/client.ts` — ARCHIVED (D5b reverse-path 용 보존,
      삭제 X — 사업자 등록 가능해질 때 복구 path).
    - `App.tsx` — share-intent + clipboard + ensureDevSession +
      mapHandleRef + SaveModal wiring. Phase 4 의 mock-only App.tsx
      를 풀 production entry 로 확장.
    - `scripts/test-phase5-naver.mjs` + `scripts/test-phase5-save.mjs`
      — Track A verification scripts.
  - Files modified (key paths):
    - `src/map/PersonalMap.tsx` — `PersonalMapHandle` imperative
      handle 추가 (`flyTo`), `forwardRef` 변환, `searchResults`
      ShapeSource 추가, `gestureSettings` 적용 (2026-05-13 polish).
    - `app.config.ts` — `expo-share-intent` plugin entry +
      `iosShareExtensionName: '자국'` 제거 (Hangul sanitization 버그
      회피, Option A — Option C custom plugin 보류) + name/
      bundleIdentifier 브랜드 lock 적용.
    - `eas.json` — `preview.ios.simulator: true` 제거 (real-device
      빌드 가능하게).
    - `.env.example` — Naver Client ID/Secret + test-user
      credentials env var documentation 확장.
    - `package.json` + `pnpm-lock.yaml` — `expo-share-intent@~5.1.1`
      + `expo-clipboard` 추가 (507 transitive deps surge — balanced-
      match audit trigger fired).
  - Cross-phase drift detected:
    - 6 new cross-phase issues added during Phase 5: D5b POI
      provider amendment / expo-share-intent v5.1.1 Hangul plugin
      bug / pnpm dlx eas-cli pnpm.overrides non-inheritance /
      Claude Code Read 2000px image limit / v8 Korean tile data 구
      누락 (sibling to D11) / Android share-sheet host-filter
      granularity deferred. D11 trigger condition extended to
      4-item OR-pile (subway / 구 / zoom-feel / road-sparsity).
    - 1 new Verification Principles Case added (Case #4: subagent
      analysis as input artifact — 잘 형식화된 agent output 이
      consumption check 통과 의미 아님).
  - Recommended Phase 6+ doc tweaks:
    - Phase 6 doc: dev-test-user 패턴 (`ensureDevSession` in
      App.tsx) 을 Phase 6 의 실제 auth UI 로 자연 흡수. EAS env
      var 설정 패턴 (this phase 에서 발견) 을 Phase 6 + Phase 10
      에서 onboarding 화면의 추가 env 추가될 때마다 재적용.
    - Phase 7 doc: 시각 verification 은 real iPhone 사용 (Windows
      Android emulator GPU 가 text shader 실패함 — cross-phase
      issue 참조). Phase 5 close 시 founder iPhone 에 ad-hoc
      build 깔려있으므로 Phase 7 dev cycle 에 EAS 빌드 + 설치
      반복 사용 가능.
    - Phase 10 doc: gesture decay 완전 fix (iOS pinch-zoom decay)
      를 Phase 10 polish 항목으로 추가. 대안 — native gesture
      wrapper / 다른 SDK 평가.

## Pending phases

- [ ] Phase 7: Pin interactions + states (tap-to-expand, long-press menu, visited, color filter)
- [ ] Phase 8: Pin detail popover (bottom sheet, OG card, edit fields)
- [ ] Phase 9: Search overlay (Kakao keyword search + pulsing results + save-from-result)
- [ ] Phase 10: Polish + beta (perf, errors, App Store assets, TestFlight)

(Phase 6: Onboarding + auth flow — implementation closed 2026-05-13;
runtime device-verification gate OPEN. See `## Current phase` block for
the full Status + the 13-item verification gate breakdown + the Apple
Sign In Supabase-dashboard config recipe. Phase 6 is NOT moved to
`## Completed phases` until the device smoke-test passes, mirroring
the Phase 4 INVALIDATED-and-then-RE-VERIFIED pattern.)

## Open decisions (not yet locked)

- ~~App Store branded display name~~ — **LOCKED 2026-05-04: 자국**
  (English slug `jaguk`; Korean noun, intended register: "trace /
  mark" via 발자국 / 흔적 compound semantic). Modern Korean primary
  read of `자국` standalone is `自國 / own country` — known parse
  cost, addressed by Phase 10 positioning copy (first-run welcome +
  App Store screenshots anchor the trace metaphor explicitly, e.g.
  `"가본 곳, 가고 싶은 곳 — 자국이 되다"`), NOT by brand change.
  On-device display name (icon, share-sheet, iOS
  `CFBundleDisplayName`, Android `android:label`) = `자국` (brand-
  only single string in `app.config.ts` `name:`). App Store Connect
  / Play Console listing name configured separately at Phase 10 to
  `자국 - 나만의 지도` per /office-hours D4 split-per-surface
  decision: short-form on-device for share-sheet recognition +
  truncation budget, long-form in store listing for organic-search
  SEO. Save modal title = `자국에 저장하기`, save button = `저장`.

  Pivot from prior candidate `자리` rejected 2026-05-04: KIPRIS
  blocked (registered mark in 9류/42류 — see KIPRIS captures from
  user) compounded by active App Store collision (`자리 - 나만의
  주차 도우미` by Bongjin Lee, `com.bongjinlee.jari`, Navigation
  category, using identical `자리 - 나만의 X` listing pattern).
  `자취` briefly considered as alternative for cleaner trace-
  metaphor semantic (자취를 남기다 = leave a trace, no `自國`
  homophone), rejected after fact-finding showed heavy KR app-
  naming saturation in 1인 가구 / 자취 lifestyle space (자취의정석,
  브로콜리 - 자취 필수앱, full real-estate cluster: 직방·다방·
  삼삼엠투·피터팬·원룸만들기·집품 etc).

  Pre-lock gates verified 2026-05-04: KIPRIS 9·42·39·35·38류 broad
  search (Korean `자국` + romanized `jaguk`) clean / KR App Store
  + Play Store search clean for both `자국` and `jaguk` (no direct
  competing brand; substring-only matches across 안국건강, 단국대,
  따릉이, 초록발자국 etc., none in 9/42 territory) / `jaguk.io`
  domain available (register at namecheap, ~$32/yr) + `jaguk.kr`
  likely available (manual KISA whois verify pending, register at
  gabia ~₩22k/yr). Pending operational items: (a) manual social
  handle scan on Instagram / Threads / TikTok for `@jaguk` /
  `@jagukapp` / `@자국`, lock `@jagukapp` as primary; (b) Phase 10
  positioning-copy task to anchor trace metaphor against
  `自國` parse cost. Full pressure-test reasoning across both
  `자리` and `자국` candidates: /office-hours session 2026-05-04.

- ~~iOS `bundleIdentifier` + Android `package`~~ — **LOCKED
  2026-05-04: `com.jaguk.app`** (Trigger 4 — IRREVERSIBLE at first
  TestFlight or Play Internal upload). Replaces placeholder
  `com.gachi2026.mymap`. Brand-pivot reverse-DNS form, domain-
  agnostic (works whether eventual primary domain is `jaguk.io`,
  `jaguk.kr`, or fallback). Applied 2026-05-04 via single
  `app.config.ts` edit — both `ios.bundleIdentifier` and
  `android.package` set to `com.jaguk.app`. Native-config
  regeneration via `pnpm expo prebuild --clean` is the next
  required step before any iOS or Android build (regenerates
  Info.plist `CFBundleIdentifier`, AndroidManifest.xml `package`,
  Gradle `applicationId`).
- ~~CDN provider (Phase 2)~~ — **LOCKED 2026-04-28: Cloudflare R2.**
  See "Phase 2 mid-phase decisions" in Current phase block above.
- ~~Backend choice (Phase 3)~~ — **LOCKED 2026-04-30: Supabase.**
  Postgres + Auth + Edge Functions in one stack; free tier covers v1
  (~50k MAU); RLS enforces per-user data isolation out of box; Edge
  Function will host the OG fetcher (resolves DESIGN.md Open Q5
  in-stack). Schema in `spec/data-shapes.ts` stays provider-agnostic
  for future `pg_dump` → alternative-Postgres migration if forced.
- ~~Authentication providers (Phase 3 / 6)~~ — **LOCKED 2026-04-30:
  Apple Sign In + Google Sign In + Email/password. KakaoTalk deferred
  to v1.5.** Apple required for App Store policy; Google standard for
  Android; Email as account-recovery fallback. KakaoTalk pushed to v1.5
  to (a) avoid Kakao SDK native dependency at v1, (b) keep age rating
  at 4+ (Kakao SDK pushes to 12+ — see RELEASE_CHECKLIST.md Trigger 5),
  (c) preserve solo-founder capacity. v1.5 addition path: enable Kakao
  OAuth in Supabase dashboard + install Kakao SDK + use
  `supabase.auth.linkIdentity()` to merge any email-account collisions.
  Migration cohort at v1.5 is small (success criteria target: 30 users
  by week 4), so account-linking UX cost is bounded.

- ~~POI provider (Phase 5 reopen of D5)~~ — **REOPENED 2026-05-07,
  D5b APPROVED 2026-05-07: Naver Open API Local Search for v1
  dev/friend-demo/initial cohort; Kakao Local API stays as the
  Phase 10 production target if 사업자 등록 becomes viable.** D5
  본문 unchanged; D5b is an additive amendment (see DESIGN.md
  D5b for full rationale + migration path back to D5). Discovered
  during Phase 5 Track A emulator verification when Kakao Local
  API returned `HTTP 403 App(map) disabled OPEN_MAP_AND_LOCAL
  service` — Kakao Developer Console requires 사업자 등록증 to
  activate the 카카오맵 product, which the founder cannot
  obtain at v1. Naver Open API has no 사업자 등록 requirement
  (휴대폰 인증만), 25k calls/day free tier, returns coordinates
  in WGS84 × 10⁷ integer format (empirically verified via real
  query against test credentials before client code was written
  — see Verification Principles Empirical Case #3). Schema
  comparison: 0 critical losses for v1, minor losses (no stable
  place_id, no phone, 15→5 max results) all defer cleanly.
  Phase 10 evaluation gate re-resolves based on biz-reg
  availability at that time (3 branches: Kakao migrate /
  Naver continue / architectural pivot to OSM hybrid or
  drop-pin).

## Cross-phase issues / drift

### First EAS iOS Build — explicit gate BEFORE Phase 5 kickoff

iOS verification cannot be done locally on Windows (no Xcode); the
opening Phase 1 decision was to defer iOS verification to "first EAS
Build" rather than borrow a Mac. Decision history:
- **2026-04-27** (Phase 1 close): defer to end of Phase 4
- **2026-05-03** (Phase 4 close, this revision): the gate is **before
  Phase 5 kickoff** — not "convenient", not "soon". A specific gate.

**Why a hard gate (not "when convenient"):**

First iOS builds break in predictable ways: provisioning profile
issues, code signing, bundle-ID conflicts, missing iOS-specific
native config, Mapbox iOS pod resolution. The cost of finding
those failures grows with how much surface has been built since
the last known-iOS-good state.

Phase 4 close is the strongest diagnostic frame this project will
ever have: the iOS native config has been completely untouched
since Phase 1 (vanilla Expo template + `@rnmapbox/maps` plugin),
and Phase 4 is the first phase that exercises the Mapbox iOS
runtime. If the EAS build breaks, the suspect set is
`@rnmapbox/maps` iOS bindings + the Style JSON + the bundled
sprite/glyph URLs — a small, well-contained list.

If we wait until Phase 5/6/7, the suspect set widens by every
phase: share-extension config (Phase 5 is iOS share-sheet
heavy), auth provider native modules (Phase 6), gesture-handler
(Phase 7). A break diagnosed at Phase 7 has 4 phases of
candidate causes; a break diagnosed at Phase 4 has 1.

The Apple Developer Program ($99/yr) is NOT required for this
build — it's required for TestFlight at Phase 10. The simulator
profile produces an unsigned `.app` that the build pipeline can
either succeed or fail to produce, and that pass/fail is itself
the verification.

**Gate definition:** Phase 5 kickoff is BLOCKED on this build
having been attempted at least once and any failures recorded
in this entry. The build does NOT need to succeed to pass the
gate; failures are signal too — the goal is to surface iOS
issues now, not to ship to TestFlight. If the build fails, log
the error here and proceed with Phase 5 (the failure isn't
load-bearing for the save-flow validation; it's load-bearing
for the eventual Phase 10 TestFlight).

**Recipe (30-60 minutes, runs from Windows; EAS build executes
on EAS's Mac infrastructure in the cloud):**

```bash
# One-time prep — needs interactive login:
pnpm add -D eas-cli
pnpm exec eas login                 # free Expo account; one-time
pnpm exec eas init                  # links project to EAS

# The actual build (10-30 min on EAS cloud Mac):
pnpm exec eas build --platform ios --profile development
# --profile development: simulator build (per eas.json ios.simulator=true)
#   + dev client for Metro hot reload. Unsigned .app — no Apple
#   Developer Program required.
# NOTE: eas-cli 18.x removed the standalone --simulator flag; the
#   simulator setting moved into the eas.json profile. Older docs
#   (and earlier versions of this recipe) showed `--simulator` —
#   it now errors with "Nonexistent flag".
```

**What to capture afterward in this entry** (replacing this
"recipe" subsection with the actual results):

- Build URL from EAS dashboard
- `BUILD SUCCESSFUL` (with .app artifact link) OR the failure
  message + which step failed (`npm install`, `pod install`,
  `xcodebuild`, etc.)
- Any deprecation warnings from `xcodebuild` worth tracking for
  Phase 10
- Whether the `.app` actually launches in iOS Simulator (this
  step requires a Mac; if no Mac available, the build-success
  itself is the verification — log "launch verification
  deferred" here)

Apple Developer Program ($99/yr) becomes required at **Phase 10**
for TestFlight + App Store, NOT for this build.

### `expo-system-ui` installed (resolved 2026-04-30, ahead of Phase 4)

**Resolved 2026-04-30** — installed early as Trigger 2 item from
`RELEASE_CHECKLIST.md` while Phase 3 was still fresh:

```bash
pnpm exec expo install expo-system-ui          # → ~6.0.9 (SDK 54)
pnpm exec expo prebuild --platform android --clean
pnpm typecheck && pnpm lint                     # both clean
```

The Phase 1 prebuild warning
(`» android: userInterfaceStyle: Install expo-system-ui in your project
to enable this feature.`) no longer fires — that was the actual signal
this entry existed to chase. Full Android boot + runtime dark-mode
swap verification deferred to Phase 4 kickoff, where `PersonalMap`
actually wires `Appearance.addChangeListener` and exercises the
runtime theme reactivity.

**Original context (kept for archaeology):** `app.config.ts` sets
`userInterfaceStyle: 'automatic'` to enable D8 dark mode support.
Without `expo-system-ui`, the app respects the system theme at boot
but does not react to runtime theme changes (toggling dark mode while
the app is open won't trigger a style swap).

### `balanced-match` pinned via `pnpm.overrides`

**The override:** `package.json` pins `"balanced-match": "^1.0.2"` under
`pnpm.overrides`.

**Why:** `brace-expansion@1.1.x` calls `require('balanced-match')` and
invokes the result as a function (the v1 API). `balanced-match@4.x`
exports an object with named exports — different shape. When pnpm hoists
v4 into a `node_modules/brace-expansion/node_modules/balanced-match/`
nested location, brace-expansion picks v4 via Node's nearest-ancestor
resolution and crashes with `TypeError: balanced is not a function`.
Manifested first as an opaque ESLint failure
(`balanced is not a function ... at Minimatch.braceExpand`).

**The two chains pulling `brace-expansion@1`** (run `pnpm why
brace-expansion@1.1` to re-verify):

1. **ESLint:** `eslint@9 → @eslint/config-array@0.21 → minimatch@3 →
   brace-expansion@1`
2. **React Native codegen:** `@react-native/codegen@0.81 → glob@7 →
   minimatch@3 → brace-expansion@1`

**Note:** `eslint-plugin-react@7.37.5` is in our tree, but it is **not**
the actual trigger — even though the original error was thrown from a
React rule, the broken `brace-expansion` was loaded via ESLint core's
config-array, not through the React plugin's own deps. Tracking
`eslint-plugin-react` versions for this fix would be misleading.

**When the override can be dropped** (need BOTH chains resolved):

- **ESLint chain:** when `@eslint/config-array` releases a version using
  `minimatch@9+` (which uses `brace-expansion@2`, which is compatible
  with `balanced-match@4`). Watch the
  [@eslint/config-array changelog](https://github.com/eslint/rewrite/tree/main/packages/config-array).
- **RN chain:** when `@react-native/codegen` upgrades from `glob@7` to
  `glob@10+`. Likely lands in RN 0.82 or later — track at
  [react-native release notes](https://github.com/facebook/react-native/releases).

**Audit command** (run before any major dep bump or quarterly OR
**any time a single phase adds 100+ transitive deps** — see Phase 5
empirical case below):

```bash
pnpm why brace-expansion@1.1 2>/dev/null | head -3
# Empty output (or only deduped references) → drop the override:
#   1. Remove `balanced-match` from `pnpm.overrides` in package.json
#   2. rm -rf node_modules pnpm-lock.yaml && pnpm install
#   3. pnpm lint && pnpm typecheck must still pass
```

**Phase 5 empirical trigger (2026-05-11):** Adding `expo-share-intent`
+ deps brought 507 new packages (visible in `Packages: +507` install
log). One of those new deps consumes `balanced-match` via the v4
API (`{balanced}` named export); our override pins v1 (callable
function). The mismatch only surfaces under `pnpm dlx eas-cli`
because dlx creates an isolated install that does **not** inherit
the project's `pnpm.overrides` block. Result: `@expo/fingerprint`
in dlx's isolated install gets the wrong shape of `balanced-match`
→ `(0 , balanced_match_1.balanced) is not a function` → EAS build
submission aborts at "Compute project fingerprint" step before
upload. Generalized trigger: **any phase that adds >100 transitive
deps invalidates the prior audit window**; re-run the audit command
plus the dlx-aware variant below.

**Workaround for the pnpm dlx + fingerprint specific case** (NOT a
full fix — see dedicated "pnpm dlx eas-cli does not inherit
pnpm.overrides" cross-phase issue below for the long-term resolution
branches):

```bash
EAS_SKIP_AUTO_FINGERPRINT=1 pnpm dlx eas-cli build --platform ios ...
# Skips the fingerprint step entirely; build proceeds. EAS's
# fingerprint is an optimization (rebuild cache key); skipping
# only costs ~5min of "could have been incrementally rebuilt"
# per build.
```

**Last verified active:** 2026-05-11 (both chains still live;
plus new pnpm dlx + 507-pkg expansion trigger added). Next audit:
after any major dep bump, or quarterly, or after any single phase
adding 100+ transitive deps.

### Phase 10 CORS tightening (R2 `mymap-assets` bucket)

Phase 2 set R2 bucket CORS to `AllowedOrigins: ["*"]` because the v1
client is RN-native (no CORS check) and the v1.5 web PWA's eventual
production origin isn't known yet. Acceptable as a v1 baseline.

**MUST tighten before App Store / TestFlight upload at Phase 10.**

**Why it matters even though the assets are public:** an open `*`
origin lets any third-party site embed your CDN traffic in their pages,
which inflates R2 egress reads and obscures usage analytics. The assets
themselves staying public is fine; the CORS gate is about who can
*read them from a browser context other than your own app*.

**To resolve at Phase 10** (replace placeholders with real product
origins once the brand name is locked):

```bash
cat > scripts/r2-cors.json <<'EOF'
{
  "rules": [
    {
      "allowed": {
        "origins": [
          "https://www.<product>.app",
          "https://<product>.app",
          "https://staging.<product>.app"
        ],
        "methods": ["GET", "HEAD"],
        "headers": ["*"]
      },
      "maxAgeSeconds": 3600
    }
  ]
}
EOF
pnpm exec wrangler r2 bucket cors set mymap-assets --file=scripts/r2-cors.json
```

Note: R2's CORS schema is **not** S3-style. Top-level `{"rules": [...]}`
wrapper, each rule has `allowed.{origins,methods,headers}` (lowercase,
nested), not `AllowedOrigins`/`AllowedMethods`/`AllowedHeaders`. The
wrangler subcommand is `cors set` in wrangler 4.x (also accepts `put`).

Native iOS/Android clients are unaffected — they don't read CORS
headers. Only browser-context (web PWA) clients are gated by this.

### Docker required for fontnik on Windows (resolve never; document forever)

fontnik 0.7.x ships prebuilt binaries for darwin + linux only —
Windows installs fall back to compiling node-fontnik from source via
node-gyp, which requires Visual Studio Build Tools (~5 GB install).

**Workaround (locked Phase 2 path):** run fontnik in a Linux container.
PBF output is deterministic, so container builds are byte-identical to
host builds. Docker Desktop must be running. Recipe is in
`fonts/BUILD-PBF.md` § "Step 3 alt — fontnik in Docker (Windows)".

This is a permanent property of this dev environment, not a fix-someday
issue — recorded so a future contributor on Windows doesn't waste a
day on `node-gyp ERR! find VS` before finding the docker recipe.

### Apple Sign In + Google Sign In configuration (Phase 6 partial close)

**Status update 2026-05-13** (Phase 6 implementation):

- **Apple Sign In native side: DONE in Phase 6.** Installed
  `expo-apple-authentication@~8.0.8`, set `ios.usesAppleSignIn: true`
  in `app.config.ts` for the entitlement, wired
  `AppleAuthentication.signInAsync` →
  `supabase.auth.signInWithIdToken({ provider: 'apple', token })` in
  `src/auth/AuthScreen.tsx`. Apple HIG-required
  `AppleAuthenticationButton` component used. Apple Dev Program
  activated 2026-05-12 (per earlier PROJECT_STATE update) unblocked
  the iOS-side requirements.
- **Apple Sign In remaining work: Supabase dashboard provider enable.**
  Apple Service ID + return URL + signing key. One-time dashboard +
  Apple Developer Console session, user-driven. The Phase 6 Current
  phase block has the full recipe in "Apple Sign In Supabase-
  dashboard config recipe". Until then, tapping the Apple button
  shows "Provider not enabled" in the error banner verbatim — fail-
  loud, useful diagnostic, not a silent fail.
- **Google Sign In: still both sides deferred.** Native module
  (`@react-native-google-signin/google-signin`) + Google Cloud
  Console OAuth client (iOS + Android with SHA-1) + Supabase
  dashboard enable. Phase 6 ships an Alert stub for the Google
  button. Estimated 1-2h follow-up session per Phase 6 mid-phase
  decisions. Can land in Phase 7 as polish OR Phase 10 dashboard
  sprint.

**Original context (preserved for archaeology):** Phase 3 doc step 5
originally included "Configure auth providers: Apple Sign In + Google
Sign In" alongside Email/password.
**Configuration moved to Phase 10**; the *decision* (locked
2026-04-30) is unchanged — Apple + Google + Email is still v1 scope.
KakaoTalk stays deferred to v1.5 per existing Open decisions entry.

**Why deferred:** OAuth client configuration depends on three
Phase 10 artifacts that don't exist yet, and configuring against
placeholders would force rotation later (which means creating new
OAuth clients + invalidating old + all dev-environment tokens
expiring):

1. **Apple Sign In** requires the Apple Developer Program ($99/yr
   enrollment). Phase 1 cross-phase issue "First EAS iOS Build
   deferred to end of Phase 4" already pushes this purchase to
   **Phase 10**. Without the Developer account there's no Service ID
   to give Supabase.

2. **Google Sign In iOS client** ties to `ios.bundleIdentifier`,
   currently the placeholder `com.gachi2026.mymap` (see Open
   decisions). The real bundle id locks at Phase 10 alongside the
   App Store name.

3. **Google Sign In Android client** ties to the EAS-generated SHA-1
   keystore fingerprint. EAS doesn't generate the keystore until
   first build, deferred to Phase 4 close per the existing iOS
   build entry.

**Phase 3-9 dev runs on email/password only.** RLS uses `auth.uid()`
which is provider-agnostic — the migration (`saved_places: own rows
only` policy) is correct regardless of which providers the user
authenticated through. Adding Apple + Google at Phase 10 requires
only dashboard config + native SDK install
(`@invertase/react-native-apple-authentication`,
`@react-native-google-signin/google-signin`); no schema changes,
no repo changes.

**To resolve at Phase 10** (alongside bundle ID lock + Apple Dev
Program enrollment):

1. Apple Developer Console → enroll → create Service ID + Sign In
   with Apple capability + return URL
   `https://<ref>.supabase.co/auth/v1/callback`.
2. Google Cloud Console → create iOS OAuth client (bundle id) +
   Android OAuth client (SHA-1 from EAS keystore).
3. Supabase dashboard → Authentication → Providers → enable Apple +
   Google with the credentials above.
4. RN app: install
   `@invertase/react-native-apple-authentication` +
   `@react-native-google-signin/google-signin` (config plugins) and
   wire to `supabase.auth.signInWithIdToken({...})`.

The full task list is patched into `phases/phase-10-polish.md` this
phase; this entry is the cross-phase summary so a future Phase
session understands why Apple/Google aren't enabled in Supabase
dashboard yet.

### Free Supabase project auto-pauses after 7 days inactive

Free-tier Supabase projects auto-pause if no requests hit the
project for 7 consecutive days. **Data is preserved**; pause is
reversible from the dashboard with one click. Restored project
resumes at the same URL/keys.

**Operational impact:** if a developer takes >1 week off between
Phase sessions, the cloud project may be paused on return. Symptom:
`supabase db push` or REST calls return 503 / connection errors.
Resolution: open dashboard → click "Restore project" → wait ~30s.

**Avoid in production:** upgrade to Supabase Pro ($25/mo) at
Phase 10 if the user count justifies it. v1 launch on free tier is
fine if check-ins are weekly+; if the app is dormant pre-launch
(e.g., between phases), manual unpause is the cost.

### D11 spec ↔ mapbox-streets-v8 schema mismatch (Path A applied)

The Phase 4 close manual visual check surfaced that the initial spec/
style-{light,dark}.json was authored against OpenMapTiles schema
conventions but deployed against `mapbox://mapbox.mapbox-streets-v8`.
The two vector-tile schemas use different source-layer names and
field conventions, so road / subway / park-label layers silently
rendered nothing (the spec's expressions could not match v8's
features). Path A spec patch applied 2026-05-03 (see spec/CHANGELOG.md
entry of the same date for the line-by-line) to align with v8 schema.

**Two D11 deviations result from Path A (both deferred to v1.5 /
MapLibre + MapTiler migration):**

1. **Subway lines display as single grey at z13+, no per-line color.**
   D11 spec: 5 hub lines colored at z13, all 9 lines colored at z14
   with transfer-station upsizing as Korean spatial-anchor cue. Reality
   on v8: rail features tagged generically as `class=major_rail` with
   no per-line `ref` metadata — Seoul Metro line 1/2/3/4/9 differentiation
   is impossible from the data. Path A renders all rail as single grey
   `#888888` (light) / `#A0A0A0` (dark) at z13+.

2. **Subway stations rendered without transfer differentiation.**
   D11 spec: transfer-station dots visibly larger + labels appearing
   one zoom earlier than regular stations (Korean spatial-anchor
   intent). Reality on v8: `transit_stop_label` source-layer lacks
   the `transfer` field that the differentiation requires. Path A
   collapses 4 station layers (regular dot / transfer dot / regular
   label / transfer label) into 2 (dot / label), uniform sizing.

**When each deviation first becomes user-visible (the deferral
rationale):**

- **Subway single grey**: subway is a background-context feature in
  this product (see DESIGN.md wedge — "personal map for saved cafes,
  not a transit app"). Phase 5 wedge validation tests save flow with
  the founder's friend, not subway navigation. Phase 6 onboarding +
  Phase 7 pin interactions also do not exercise subway. The cosmetic
  degradation is visible from Phase 4 onward but doesn't gate any
  user-facing test before v1 launch.
- **Station no-transfer-differentiation**: same — Korean users notice
  transfer stations as orientation cues but the wedge is "find my
  saved cafe", not "navigate via transfer station." If v1 beta
  feedback explicitly cites "지하철 환승역으로 길찾기 못 함" as a
  blocker, pull resolution forward (see guardrail below).

**Guardrail — when to pull resolution forward:**

If wedge validation (Phase 5+) or beta feedback (Phase 10) surfaces
the subway-context degradation as a friction point — example signals
include "지도가 너무 비어있어요" / "환승역이 안 보여서 위치 감
잡기 어려워요" / "친구한테 보낼 때 어느 역 근처라고 설명을
못함" — pull MapLibre + MapTiler migration forward from post-PMF
to whichever phase is next. Do NOT let "scheduled for v1.5" become
a dogma when wedge-validation feedback contradicts the deferral
assumption.

**Resolution path (post-PMF / v1.5):**

The actual resolution is the DESIGN.md D4 post-PMF migration plan:
swap `@rnmapbox/maps` runtime for `@maplibre/maplibre-react-native`,
swap composite source from `mapbox://mapbox.mapbox-streets-v8` to
MapTiler's vector tiles (which use OpenMapTiles schema — exactly what
the original spec was written for). The original spec's color match
expressions, transfer-differentiation filters, and italic park labels
all Just Work against MapTiler tiles without further patches.

Trigger condition for migration: "v1 wedge validation passes (per
DESIGN.md success criteria) AND ANY of the following empirical-
friction signals surfaces in user feedback":
1. **Subway-context degradation** — single-grey subway lines, no
   transfer-station differentiation cited as orientation friction.
2. **구 (district) label absence** — see sibling cross-phase entry
   "v8 Korean tile data 구 누락" for full evidence; users asking
   "어느 구야?" or hitting 동명 collisions (신사동 강남 vs 은평).
3. **Zoom/pan gesture 미끄러짐** — added 2026-05-13 post-friend-demo.
   Korean users used to 네이버/카카오 맵 의 짧은 스냅 decay 가
   Mapbox 의 부드러운 inertia 를 categorical-different feel 로 인식.
   Phase 5 close 에서 `gestureSettings.panDecelerationFactor: 0` +
   `pinchZoomDecelerationEnabled: false` 부분 적용으로 일부 완화 됐
   지만 iOS pinch-zoom decay 자체는 `@rnmapbox/maps` API 미노출.
   MapLibre 이행 후에도 동일 OSM gesture engine 이라 본질적
   호전 미보장 — 다만 더 정밀한 gesture customization layer
   접근 가능해질 수 있음.
4. **도로 sparsity** — 추가 2026-05-13 post-friend-demo. v8 의 KR
   OSM 데이터 한계로 안암역 같은 mid-density 동네에서 도로 가
   드물게 렌더됨. 친구 in-person 언급. MapTiler 이행은 같은 OSM
   베이스라 본질 해결 안 됨 — Korean 매핑 데이터 자체가 네이버/
   카카오 proprietary (D5b licensing 으로 우리 불가). 이 신호는
   trigger pile 에 들어가지만 fundamentally 해결은 OSM 한국
   contribution / 데이터 라이센스 환경 변화 / 자체 측량 중 하나.

OR-조건으로 묶인 이유: 어느 하나라도 카테고리-perception 손상
신호가 누적되면, MapTiler 이행으로 (1)+(2) 즉시 해결됨 — (3)+(4)
는 부분 해결 또는 trigger condition 자체의 다른 후속 작업으로
이어짐. 단독 신호로는 v1 blocker 아님 (모두 polish-tier).

Do NOT trigger on "MapLibre is shinier" — the migration is non-
trivial (2-3 working days + new licensing surface + new tile-quota
management). Worth doing only when product-validation evidence
justifies it.

**What did NOT change (Path A scope):**

- The 9-glyph sprite atlas, brand-indigo pin styling, anchor
  treatment, cluster behavior, dark mode toggle, Korean labels via
  Pretendard PBFs — all unaffected. Path A is purely base-map
  alignment with v8 schema.
- src/map/PersonalMap.tsx — no changes. The component consumes
  styleJSON as opaque string; spec patches alone fix rendering.
- spec/data-shapes.ts, spec/tokens.json, sprite SVGs — all
  unchanged. Path A touches only the two style JSONs + spec/CHANGELOG.

### v8 Korean tile data 구 누락 (sibling to D11)

**Observation:** mapbox-streets-v8 한국어 라벨에서 구 (district)
단위 결측. KR 행정 위계는 시 → 구 → 동 의 3-level 이지만 v8 KR
타일은 동 (성수동, 안국동) 과 시 (서울특별시) 만 라벨로 노출하고
구 (성동구, 종로구) level 은 어떤 zoom band 에서도 보이지 않는다.

**Phase 4/5 empirical evidence:**

- Phase 4 (2026-05-03) 시청 카메라 가시 라벨 목록: 통인동 / 사간동
  / 안국동 / 종로1가 / 무교동 / 다동 / 삼각동 + 서울 도심 +
  서울특별시. 종로구 / 중구 라벨 한 개도 없음. 캡처 파일
  `build/phase4-render.png` (PROJECT_STATE Phase 4 verification
  gate 항목 참조).
- Phase 5 Track A (2026-05-11) 성수동 mock-pin context: Step 7e
  log 가 저장 핀을 "'성수' station label 동쪽" 으로 기술 — 한 단계
  위인 성동구 orientation cue 는 z10-z15 전 구간에서 부재. 사용자가
  "이게 어느 구야?" 질문에 답을 못 함.

**영향:** KR 사용자는 일상 대화에서 위치를 "성동구 성수동", "강남구
역삼동" 처럼 구+동 jointly 로 부른다. 지도가 동만 보여주면 mental-
map 매핑이 한 단계 끊긴다. 특히 동명 충돌 케이스 — 가장 자주
나오는 사례가 신사동 (강남구 vs 은평구) — 에서는 friend-demo 중
"어느 신사동이야?" 같은 질문이 나올 수 있는 실제 friction mode.
D11 subway-context degradation 과 동일 카테고리: v8 KR 데이터 구조
한계, cosmetic-but-load-bearing for spatial orientation.

**Trigger contribution:** D11 의 MapTiler migration trigger
condition 은 기존에 "subway-context degradation cited as friction
point" 단독이었음. 이제 "구 label absence cited as orientation
friction point" 가 누적되어 OR-조건으로 묶임. 둘 중 어느 하나라도
wedge validation / 베타에서 사용자 언급으로 나오면 post-PMF
MapLibre + MapTiler 이행을 앞당김. 단독으로는 v1 blocker 아님 (둘
다 cosmetic).

**Resolution path:** D11 와 동일 — MapLibre + MapTiler post-PMF
migration. OpenMapTiles 스키마는 `place=suburb` admin-level 을
KR 데이터에 포함하고 있어 구 라벨이 자연스럽게 렌더된다. v1 에서
client-side 합성 short-circuit (reverse-geocode → 구 추론 → custom
overlay layer) 은 (a) Kakao quota 추가 비용, (b) brand color
discipline 위반 risk (구 라벨 색상 결정이 또 다른 D 시리즈 잠금
대상), (c) base map 위에 자체 텍스트 레이어 그리는 복잡도 때문에
보류.

### D10 marker-shape deviations deferred to Phase 7

Phase 4 took two visual deviations from the D10 marker spec because
Phase 2's sprite pipeline only generated the 9 white-glyph-on-
transparent atlas entries that `sprites/build-sprites.sh` enumerates
— the spec's runtime-styling path assumed additional sprite variants
that don't exist:

1. **Anchor "rounded square" → circle in `brand_indigo_soft`.**
   D10 locks anchors as rounded squares to mark "infrastructure vs
   content" against saved circles. Mapbox's `CircleLayer` can only
   render circles, so a rounded-square anchor needs a sprite atlas
   entry per role (`home-bg`, `work-bg`, `school-bg`) with the
   rounded-square background pre-composited. Phase 4 renders anchors
   as larger circles in `brand_indigo_soft` (#6B68A8 light /
   #8E8BD8 dark) — the lighter color carries the anchor-vs-saved
   distinction in the meantime.

2. **Visited "outlined indigo glyph" → "donut" (no glyph).**
   D10 locks visited as filled→outlined: same glyph in indigo on
   surface_base background instead of white-on-indigo. The current
   sprite atlas is rasterized white PNGs (spreet built without
   `--sdf`); Mapbox `iconColor` cannot tint a non-SDF sprite. So
   visited pins render as a "donut" (surface_base fill + 2.0px
   indigo stroke + the glyph hidden via the SymbolLayer's `filter`)
   until the sprite pipeline produces the indigo variants.

Both deviations are logged in the source as block comments at the
top of `src/map/PersonalMap.tsx`.

**When each deviation first becomes user-visible (the deferral
rationale):**

- **Anchor circle**: anchors are not rendered for any user until
  Phase 6 (onboarding sets HOME / SCHOOL / WORK). Phase 5 uses a
  hardcoded test user with no anchors per `phase-5-save-flow-validation.md`
  — so the founder's-friend wedge validation does NOT see anchors.
  Phase 6 is internal dev (no external user testing scheduled
  before Phase 10 beta). Phase 7 ships the fix before Phase 10
  external testing → safe.
- **Visited "donut"**: the visited state has no toggle until
  Phase 7 itself (the toggle ships AND the fix lands in the same
  phase). Until then, no user can mark a place visited, so the
  donut state is not reachable. Mock data with `visited: true`
  in Phase 4's dev fixture is the only path to see it pre-Phase-7.

If the visibility-timeline assumption breaks (e.g., Phase 6 ends
up touching a real friend's account, or a Phase 5/6 demo gets
scheduled with anchors visible), pull the fix forward to whichever
phase becomes the first external-touch — do NOT let "scheduled for
Phase 7" become a dogma when the visibility schedule shifts.

**Sprite pipeline retrospective (why we landed here + Phase 7 prep):**

Phase 2 generated 9 sprite atlas entries (one per category glyph)
because that's what was sitting in `sprites/`. The spec assumed
more variants existed (rounded-square anchor backgrounds,
indigo-stroked outlined glyphs for visited) — they didn't, and
Phase 2's verification gate was "9 sprite IDs in the manifest +
PBFs upload OK", which was passable because the gate wasn't
"every sprite the spec references at runtime is in the atlas."
Phase 4 surfaced the gap when the runtime expressions reached
for `cafe-outlined` / etc. and would have rendered blank. Phase 7
fixes the underlying scope.

Good news: both Phase 2 build scripts auto-discover. Adding new
SVGs is a drop-in operation, NOT a pipeline modification:

- `sprites/build-sprites.sh` calls `spreet ./sprites $OUT_DIR/sprite`
  — spreet rasterizes every `*.svg` it finds in the directory.
  Sprite IDs are filename without extension, lowercased.
- `scripts/upload-assets.sh` uses `for f in "$BUILD_DIR"/sprite*.{json,png}`
  + `find "$BUILD_DIR/glyphs" -type f -name '*.pbf'` — both
  globs/finds are open, no hardcoded file lists.

So Phase 7 (Option B variant — the simpler-now path) is literally:

```bash
# 1. Drop new SVGs into sprites/  (8 new files: 5 outlined + 3 anchor)
# 2. Rebuild + reupload + cache-bust
bash sprites/build-sprites.sh
SPRITE_VERSION=v2 bash scripts/upload-assets.sh
# 3. Edit spec/style-{light,dark}.json — change /sprites/v1/ → /sprites/v2/
# 4. Edit src/map/PersonalMap.tsx per the option-B steps below
```

If a future phase needs 10 more icons (say a v2 "EVENT" or "BAR-CRAFT"
category), the same drop-in flow applies. Pipeline does not need
generalization — it's already general.

**To resolve at Phase 7** (or earlier if the visibility schedule
shifts per the timeline note above):

Pick ONE of the two sprite-pipeline expansions:

- **Option A: SDF sprites + runtime tinting.** Re-run `spreet
  --sdf ./sprites ./build/sprite{,@2x,@3x}` and re-upload to
  `/sprites/v1/sprite*`. SDF mode lets `iconColor` data-driven
  expressions tint the glyph at runtime, so visited can use
  `iconColor: ['case', ['get', 'visited'], '#2D2A6B', '#FFFFFF']`.
  Cleaner long-term, slightly larger atlas (alpha-channel-only
  but at higher resolution for SDF distance-field quality). Anchor
  rounded-squares still need separate sprite entries; SDF doesn't
  fix that one.

- **Option B: Per-state sprite variants.** Add SVGs to
  `sprites/`:
  - `cafe-outlined.svg`, `restaurant-outlined.svg`, ... (5 files
    × indigo-stroked outline of each glyph) for visited state.
  - `home-anchor.svg`, `work-anchor.svg`, `school-anchor.svg`
    (3 files × glyph-on-rounded-square composite) for anchor
    backgrounds.
  Re-run `bash sprites/build-sprites.sh` and `bash
  scripts/upload-assets.sh`. Bump the sprite URL from
  `/sprites/v1/` to `/sprites/v2/` as the cache-bust mechanism
  (per Phase 2 versioning convention) and update both
  `spec/style-{light,dark}.json` to point at v2. After upload,
  flip `src/map/PersonalMap.tsx`:
    - Anchors: replace `CircleLayer` background with a
      `SymbolLayer` reading `iconImage = ["match", ["get",
      "category"], "HOME", "home-anchor", "WORK", "work-anchor",
      ...]`.
    - Visited saved pins: drop the `CircleLayer` `case` on
      `circleColor` + `circleStrokeWidth`, drop the SymbolLayer
      `filter` excluding visited, switch the `iconImage` to
      `["case", ["get", "visited"], ["concat", ["get",
      "category"], "-outlined"], ["get", "category"]]`. (This
      matches the original `spec/implementation.tsx` reference.)

Either option is appropriate; SDF (A) is simpler-future for color
filtering (D10 color-tag overlay) and option B is simpler-now for
matching the locked spec exactly. Phase 7 can pick when it gets
there.

### Android share-sheet host-filter granularity (Phase 5 deferral)

Phase 5 task 2 wired share-extension intent filters via the
expo-share-intent v5 plugin. The phase doc's example config
included a per-host whitelist (`androidIntentFiltersData` keyed
to `m.place.naver.com`, `place.map.kakao.com`, `www.instagram.com`,
`www.threads.net`) so the picker entry would only surface for
known-good URL hosts. The v5 plugin schema does not expose that
field — `androidIntentFilters` accepts MIME types only
(`"text/*" | "image/*" | "video/*" | "*/*"`). Phase 5 ships with
`['text/*']` as the v1 baseline.

**Current behavior:** the "자국" Android share-sheet entry surfaces
on any text/plain share — including Notes app, plain SMS, news
articles, etc. Per-host narrowing was the spec intent (D7
implies it: "share-sheet primary for Naver/Kakao Place URLs and
blog posts").

**Visibility timeline:**
- Friend-demo (Phase 5 validation): invisible — controlled test
  on Instagram + Naver Place URLs, no exposure to other text
  shares.
- Phase 6-9 internal dev: invisible — solo founder controls
  what gets shared.
- v1 production launch (post-Phase 10): user-visible — general
  users WILL share text from arbitrary apps and see the picker
  entry. "왜 자국이 모든 텍스트에 떠?" is the canonical noise
  signal.

**Resolution paths (pick at the trigger condition below):**

(a) **Wait for `expo-share-intent@^6` + Expo SDK 55 upgrade.**
    The 6.x line peer-deps `expo: '^55'`. Expo 54 → 55 is a
    natural project-wide upgrade; bundling the filter narrowing
    with that upgrade keeps the change atomic. Lowest
    maintenance cost. v6 plugin schema needs to be re-checked
    at upgrade time — if it still doesn't expose host filters,
    fall to (b) or (c).

(b) **Eject from the plugin to native config edit.** Drop the
    plugin entry, hand-edit `android/app/src/main/AndroidManifest.xml`
    to add `<data android:scheme="https" android:host="m.place.naver.com"/>`
    blocks per host. Costs the CNG (Continuous Native
    Generation) workflow — `expo prebuild --clean` would wipe
    the manual edit; either commit the entire `android/`
    folder (Phase 1's gitignored decision is reversible) or
    keep the plugin and write a custom config plugin per (c).

(c) **Custom Expo config plugin.** Local plugin file in
    `plugins/with-android-share-hosts.ts` that wraps
    `withAndroidManifest` and injects host-specific
    `<data>` elements into the existing `ACTION_SEND` intent
    filter. ~30 lines of TypeScript; preserves CNG workflow;
    survives `prebuild --clean`. Highest engineering cost,
    most flexible, and the right answer if option (a) doesn't
    expose host filtering after the upgrade.

**Pull-forward trigger:** if Phase 6-9 internal testing
surfaces "자국 popping up everywhere" as a friction point —
e.g., during dogfooding of Phase 9 search-overlay or Phase 10
beta — pull resolution forward to that phase. Otherwise
naturally resolves alongside the SDK 55 upgrade. Do NOT
treat "broader picker presence than ideal" as a v1 blocker:
the friend-demo and v1 cohort are small enough that the
picker noise stays inside the controlled-share band.

**What did NOT change from spec:** the iOS share-extension
side honored both phase-doc rules (`NSExtensionActivationSupportsWebURLWithMaxCount: 1`,
`NSExtensionActivationSupportsText: true`); the v5 plugin's
`iosActivationRules` field is a 1:1 pass-through to
`NSExtensionActivationRule` so iOS picker scoping is correct
out of the box. This deferral is Android-only.

### iOS post-save flyTo not triggering (Phase 5 friend-demo regression carried into Phase 6)

**Observed 2026-05-13** (user-reported during Phase 6 smoke test
conversation, not yet reproduced in this session because Windows
host can't run iOS): the post-save camera `flyTo` to the newly-
saved pin works on Android (Pixel_7 emulator + real Android
device), but did NOT trigger on the founder's iPhone during Phase
5 friend-demo. Pin renders correctly; the camera just doesn't
animate to it. Same `mapHandleRef.current?.flyTo(...)` call site
in `App.tsx`'s `handleSaved` callback.

**Hypothesis (NOT empirically tested — no iOS this session)**:
`@rnmapbox/maps` v10 `Camera.setCamera({animationMode: 'flyTo'})`
on iOS has a known timing edge case where the ref isn't fully
attached to a Camera native instance at the moment of imperative
invocation. The `forwardRef` + `useImperativeHandle` chain in
[src/map/PersonalMap.tsx](src/map/PersonalMap.tsx) exposes a
`flyTo` that calls `cameraRef.current?.setCamera(...)`. If
`cameraRef` is still null on iOS at the call moment (Camera child
mounts asynchronously after MapView ready), the optional chain
short-circuits to undefined → no animation, no error.

**Three fixes worth trying when iOS test surface is available**
(prioritized cheapest → most invasive):

1. **Add a brief `setTimeout(..., 0)` to defer the setCamera** —
   ~10-min change, lets the Camera ref settle after the React
   commit phase. Likely fix if it's a simple race.
2. **Switch from `animationMode: 'flyTo'` to `'moveTo'`** as a
   diagnostic — if `moveTo` triggers, the bug is specifically
   in the iOS flyTo animation path, not the ref attachment.
3. **Track Camera readiness via `onCameraChanged` event** and
   queue the flyTo until ready, instead of firing imperatively.
   Most invasive but most robust.

**Visibility**: surfaces every time a user saves a pin via the
share-flow on iOS. The pin DOES land in the DB and renders
correctly on the map; the only friction is "wait, where did it
go?" navigational confusion (user has to manually pan to find
the new pin). Non-blocker for Phase 5 wedge validation (which
PASSED 5/5), but a noticeable UX regression on iOS specifically.

**Resolution gate**: Phase 7 (pin interactions polish) when iOS
test cycle becomes available. Tag the existing
[App.tsx](App.tsx) `handleSaved` callsite + the
[PersonalMap.tsx](src/map/PersonalMap.tsx)
`useImperativeHandle` block with the fix attempt.

Not adding a code-side workaround in this Phase 6 session
because (a) Windows host can't validate the iOS fix without an
EAS rebuild + real-device install cycle, (b) blind-fixing risks
introducing a regression on Android (which currently works), (c)
the Phase 7 risk-tier triage will pick this up naturally as a
"new surface to verify on iOS" item.

### Mapbox `MbxLogo` — LICENSE COMPLIANCE, not a cosmetic warning

> **Do NOT read this as "warning to suppress."** This is a Mapbox
> SDK license-compliance obligation. The Mapbox runtime is telling
> us that our `logoEnabled={false}` setting may violate the SDK
> Terms of Service we agreed to when we created the Mapbox account
> (DESIGN.md § Distribution Plan). Treat this on the same shelf as
> open-source license attribution — a legal obligation tied to our
> right to use the SDK, not a console-noise issue.

**The signal:** `spec/implementation.tsx` sets `logoEnabled={false}`
with the comment "Mapbox logo handled per attribution rules". At
runtime the Mapbox SDK emits this warning 3× per app boot:

```
W Mapbox  : [maps-android\MbxLogo]: The Mapbox logo wordmark
            must remain enabled in accordance with our Terms
            of Service. See https://www.mapbox.com/legal/tos
            for more details.
```

**What we do NOT know yet:** whether `attributionEnabled={true}`
(text "© Mapbox" bottom-right, currently shown) is, in Mapbox's
own reading, a TOS-compliant alternative to the wordmark. The
spec authors believed it was ("attribution rules" comment). The
Mapbox SDK runtime explicitly disagrees ("must remain enabled").
Until verified against the actual TOS text, **assume the SDK's
runtime is the authoritative source** — that is the principle of
deferring to the doc-stated tooling. Our v1 architecture depends
on continued Mapbox SDK access (free tier under 50k MAU per
Phase 0); a TOS audit by Mapbox that finds us out of compliance
would invalidate that.

**What this is NOT:** a cosmetic logcat-noise issue. The reason
to flip `logoEnabled={true}` is not "make the warning stop", it
is "honor the SDK license we agreed to."

**Why it isn't already flipped:**
- The spec is locked (CLAUDE.md § Locked decisions). The locked
  decision is `logoEnabled={false}`. Per CLAUDE.md "If you find a
  problem with anything in DESIGN.md, surface it as an open issue
  in PROJECT_STATE.md and proceed with the locked version" — this
  entry is the open-issue surfacing, and Phase 4 proceeds with
  the locked spec.
- The runtime warning is non-blocking: Mapbox renders the map
  fine. There is no v1 dev-cycle failure mode that demands we
  flip the flag right now. The compliance surface is at App Store
  submission + any Mapbox account audit.

**Resolution path (BEFORE Phase 10 / first TestFlight upload, NOT
"during Phase 10 polish"):**

1. **Read the actual Mapbox TOS** at https://www.mapbox.com/legal/tos
   — specifically the "Map Attribution and Logo Display"
   section if present, or the equivalent for the v10 Maps SDK
   we use. Capture the relevant clause(s) verbatim into this entry.
2. **Decide the user-flow**:
   - **Default = flip to `logoEnabled={true}`** (one-line change in
     `src/map/PersonalMap.tsx` MapView prop; Mapbox positions the
     wordmark bottom-left automatically). This is the
     conservative-default and removes the compliance question.
   - **OR document a TOS clause that explicitly permits
     attribution-only** — paste the clause text into this entry
     plus a code-comment in `src/map/PersonalMap.tsx`. The clause
     must be unambiguous; "we use attribution" is not an exception
     unless TOS names attribution as an alternative.
3. **Update spec/implementation.tsx + spec/CHANGELOG.md** if the
   decision overturns the locked spec (requires user approval
   per CLAUDE.md § Files requiring explicit user approval).

**Owner:** assigned at Phase 10 kickoff (the latest reasonable
gate). Earlier is fine — anyone reading this entry mid-build can
take it on. Do not let it slide past first TestFlight upload.

### Android emulator GPU shader failure on Windows host (text labels do NOT render)

The Android emulator on this Windows host has a GPU shader
compatibility problem with Mapbox's text-rendering shader path.
Symptom: **text labels (place names, street names, station names,
park labels) do NOT render**, while all other geometry (roads,
parks, water, pin circles, sprite icon glyphs) renders correctly.
The emulator successfully starts, the JS bundle loads, the Mapbox
runtime initializes, and the map is interactive — only text is
silently absent.

**Confirmed root cause** (logcat evidence captured 2026-05-04):

```
E emuglGLESv2_enc: GL error 0x501 (GL_INVALID_VALUE)
W Mapbox: [maps-core/shader]: glProgramBinary failed for shader
  'symbol_sdf_text#version 300 es'. Error: 'program failed to link'.
  Retrying with compilation from source
[... no further symbol_sdf_text success message → fallback also fails]
```

All Mapbox shaders (`clipping_mask`, `fill`, `fill_outline`, `line`,
`circle`, `symbol_icon`, `symbol_sdf_text`) fail the
`glProgramBinary` link path on the goldfish OpenGL passthrough used
by the emulator. Mapbox falls back to source-compile for each;
geometry shaders succeed via this fallback path, but
`symbol_sdf_text` fails on both paths and silently produces no
output.

**This is permanent for this dev environment** — the goldfish
OpenGL emulation layer cannot link Mapbox v10's SDF text shader
on Windows host GPU drivers (likely related to `gl_InstanceID`
instanced-rendering features in the shader).

**Two GPU modes both broken in different ways** (validated
2026-05-04):

| Mode | Geometry shaders | Text shader | Verdict |
|---|---|---|---|
| Hardware (default) | ✅ via source-compile fallback | ❌ fallback also fails → no labels | Best for visual checks: pins + base render correctly |
| `swiftshader_indirect` (software) | ❌ paint colors fall back to black for all non-base layers | ❌ same text shader issue | Worse — even base geometry renders wrong |

**Workaround paths (in order of reliability):**

1. **Real Android phone via USB.** Hardware GPU on real device has
   none of these issues. `pnpm android` auto-targets connected
   devices; the build pipeline is otherwise identical.
2. **Different host machine.** A Windows host without WSL2/Hyper-V
   interference, or a macOS/Linux host, may not exhibit the issue.
3. **iOS / EAS Build.** iOS Simulator and real iOS devices are
   unaffected; the iOS Mapbox SDK uses Metal (not GLES). First EAS
   build was successful 2026-05-03.

**When this matters:**

- **Visual verification phases** (Phase 4 and any future phase that
  needs to confirm Korean labels, station names, place names render
  correctly): cannot fully verify on this emulator — defer
  label-dependent checks to real-device testing.
- **Functional development** (UI logic, pin interactions, save flow,
  auth): unaffected. The emulator is fully functional for everything
  that doesn't depend on Mapbox text rendering.
- **Phase 5 wedge validation** (founder's friend testing): MUST be
  on real device per existing Phase 5 requirements anyway, which
  bypasses this issue entirely.

**History of hits:**

- 2026-05-03 (Phase 4 close, hardware GPU mode): first observed —
  diagnosed as `symbol_sdf_text` shader-link failure.
- 2026-05-04 (Gate 2 re-verification): re-hit on hardware GPU
  (same diagnosis confirmed via logcat fallback evidence) AND on
  SwiftShader (different failure mode — all paint colors render
  black). Both modes provide partial render at best. This second
  hit promoted the issue from "session annoyance" to permanent
  cross-phase entry per the handoff guidance.

This is left as a permanent reference entry rather than a
fix-someday item — the resolution is "use real device for visual
verification when text matters", not a code/config change.

### `JAVA_HOME` setup gotcha for Windows + bash sessions

Phase 1 noted the JDK lives at Android Studio's bundled JBR
(`C:\Program Files\Android\Android Studio\jbr`). Android Studio
sets `JAVA_HOME` for its own GUI but NOT for ad-hoc bash sessions
(Git Bash / PowerShell new windows / CI runners). `pnpm android`
calls Gradle which calls `java`, which fails with
`ERROR: JAVA_HOME is not set` if the variable isn't exported.

**Fix per session** (Bash / Git Bash):

```bash
export JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
export PATH="$JAVA_HOME/bin:$PATH"
```

**Or one-shot:**

```bash
JAVA_HOME='C:\Program Files\Android\Android Studio\jbr' \
  PATH="C:\\Program Files\\Android\\Android Studio\\jbr\\bin:$PATH" \
  pnpm android
```

**Or persist in `~/.bashrc`** (preferred for the user's primary
machine — survives terminal restarts):

```bash
echo 'export JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"' >> ~/.bashrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.bashrc
```

PowerShell sessions are not affected — Android Studio sets
`$env:JAVA_HOME` in the user environment which PowerShell honors,
but not bash (which loads its own env from `~/.bash_profile` /
`~/.bashrc`).

This is a permanent property of the dev environment — left as a
reference entry rather than a fix-someday item.

### Claude Code Read tool image dimension limit (2000px) blocks raw `adb screencap` PNGs

**Symptom:** `adb shell screencap -p` on the Pixel_7 emulator produces
a 1080×2400 PNG (portrait full-device). The Read tool rejects images
whose longest edge exceeds 2000px, so the screenshot cannot be inspected
without an intermediate resize step. Hit mid-Phase-5 Step 7d when the
Naver keyword-search verification needed visual confirmation of search
results — Read returned the dimension-limit error and verification
stalled.

**Why this is permanent, not a one-off:** every phase from Phase 5
onward exercises visual verification of UI surfaces against the locked
spec (save modal layout, pin interactions, onboarding flow, popover
geometry, search overlay). All of those flow through the same
`adb shell screencap` → `adb pull` → Read pipeline. Without a resize
step in the loop, every visual check on this host re-hits the same
wall and burns time re-discovering the limit. The cost of documenting
the workaround once is far smaller than the cost of three more phases
each independently rediscovering it.

**Mitigation recipe (Windows host, no magick):** PowerShell's built-in
`System.Drawing` does the resize without any install. The full
capture → pull → resize pipeline as a one-liner:

```bash
# Bash invocation from the dev shell (Git Bash on Windows):
adb shell screencap -p /sdcard/screen.png \
  && adb pull /sdcard/screen.png /tmp/screen-raw.png \
  && powershell -NoProfile -Command "Add-Type -AssemblyName System.Drawing; \$img=[System.Drawing.Image]::FromFile('C:\\path\\to\\screen-raw.png'); \$w=1600; \$h=[int](\$img.Height*(\$w/\$img.Width)); \$bmp=New-Object System.Drawing.Bitmap \$w,\$h; \$g=[System.Drawing.Graphics]::FromImage(\$bmp); \$g.DrawImage(\$img,0,0,\$w,\$h); \$bmp.Save('C:\\dev\\mymap-app\\build\\<name>.png',[System.Drawing.Imaging.ImageFormat]::Png); \$g.Dispose(); \$bmp.Dispose(); \$img.Dispose()"
```

For a 1080×2400 source, resize-to-width 1600 yields 1600×3555 — STILL
over 2000px on the long edge. Two paths:

- **Resize to width 900** (`$w=900` in the PS one-liner) → 900×2000.
  Right at the limit; safe for portrait-orientation Pixel_7 captures.
- **Crop to a region of interest first**, then resize. `adb shell
  screencap -p` doesn't take a rect, but `adb exec-out screencap` +
  ImageMagick-style crop in PS is feasible. Use this for popover /
  modal verification where the surface only occupies the upper or
  lower half.

**Mitigation recipe (Unix host, with magick):** drop in
`magick /tmp/screen-raw.png -resize 1600x build/<name>.png` in place
of the PowerShell block. Width 1600 on the long edge fits under 2000
for landscape captures, but the Pixel_7 portrait default still needs
the 900-width tighter resize per above.

**When this might stop being a permanent annoyance:**

- Claude Code Read tool raises its dimension limit (no signal it will)
- We move primary visual verification to real devices, which can use
  smaller screencap output if rotated landscape; but real-device
  testing has its own gates (USB debug + the Phase 5 Track B EAS iOS
  validation) that don't make this the default flow yet
- We switch to taking screenshots via in-app code (RN
  `react-native-view-shot` + bundled at lower native resolution).
  Heavier; only worth it if visual-verification velocity becomes a
  bottleneck across multiple phases.

**Owner:** anyone doing visual verification on this host. The recipe
lives here so the next phase session doesn't re-derive it.

### expo-share-intent v5.1.1 — Hangul brand `name` breaks `iosShareExtensionName`

The expo-share-intent v5.1.1 config plugin sanitizes `iosShareExtensionName`
via `/[^a-zA-Z0-9]/g` to derive the Xcode target name (a real Xcode
constraint — target names must be ASCII identifiers). The sanitization
has **no fallback** when it yields empty: pure-Hangul input like
`'자국'` strips to `""`, propagates as `extra.eas.build.experimental.ios.appExtensions[].targetName: ""`,
and EAS Build's Joi schema validator throws
`"targetName" is not allowed to be empty` before the upload step
even runs.

Source: `node_modules/expo-share-intent/plugin/build/ios/constants.js`
lines 10-14:

```js
const getShareExtensionName = (parameters) => {
    if (!parameters?.iosShareExtensionName)
        return shareExtensionName;     // fallback ONLY when falsy
    return parameters.iosShareExtensionName.replace(/[^a-zA-Z0-9]/g, "");
                                       // truthy path: sanitize, NO fallback
};
```

Design conflation: the **same parameter** is used for both the
Xcode target name (`writeIosShareExtensionFiles.js` filenames +
`withIosShareExtensionXcodeTarget.js` `pbxProject.addTarget`) AND
the share-sheet picker label (`CFBundleDisplayName` in
`writeIosShareExtensionFiles.js` line 72). The Xcode-target use
case demands ASCII; the picker-label use case can be any string.
v5.1.1 resolves the conflict by sanitizing for one role while
preserving raw for the other — but with no fallback, pure-non-ASCII
input fails the first role entirely.

**Phase 5 resolution (Option A, applied 2026-05-11):** remove the
`iosShareExtensionName` entry from `app.config.ts` plugin block.
Effects:
- Xcode target name = default `"ShareExtension"` (line 4 of
  `constants.js`)
- `CFBundleDisplayName` = `\`${config.name} - Share Extension\``
  fallback (line 72 of `writeIosShareExtensionFiles.js`) →
  `"자국 - Share Extension"` on the share sheet (mixed-language)
- EAS validator passes, build succeeds (verified via
  builds/6e6dd5ce-f4bb-48f1-b62a-985d1983dc33, finished 5m 45s)

**UX trade-off**: picker label is now `"자국 - Share Extension"`
(English suffix), not the clean brand `"자국"`. For friend-demo
on Phase 5 the icon is the primary recognition signal and the
mixed label is acceptable; full UX win requires Option C below.

**Option C (deferred — friend-demo evidence-gated):** local Expo
config plugin (`plugins/with-share-extension-display-name.ts`,
~15 lines TS using `withDangerousMod`) that runs AFTER
expo-share-intent's plugin, reads
`ios/ShareExtension/ShareExtension-Info.plist`, sets
`CFBundleDisplayName: '자국'`, writes back. Estimated effort:
1-2 hours (NOT the "5 minutes" a confidently-wrong subagent
analysis suggested — see Verification Principles Case #4).
Trigger to actually do it: friend-demo data showing the mixed-
language label causes hesitation in the share-sheet picker
(empirical UX evidence). Don't pre-spend the 1-2 hours on
speculation.

**v6 / SDK 55 outlook:** if upstream `achorein/expo-share-intent`
adds a separate `iosShareExtensionDisplayName` param (or fixes
`getShareExtensionName()` to fall back when sanitization yields
empty), Option A reverses naturally — drop the workaround during
the SDK 55 upgrade pass. Until then, do NOT re-add
`iosShareExtensionName: '자국'`: the v5.1.1 bug is sticky and
the test surface (an actual EAS build) is expensive.

**Files affected (current state):**
- `app.config.ts` lines 67-87 — `iosShareExtensionName` removed,
  inline comment explains why (so future-self doesn't re-add)
- Cross-phase `Android share-sheet host-filter granularity (Phase 5 deferral)`
  remains independent — different sub-issue of the same plugin

### `pnpm dlx eas-cli` does not inherit project `pnpm.overrides`

Discovered 2026-05-11 during Phase 5 Track B EAS iOS build.
`pnpm dlx eas-cli build ...` creates an **isolated install of
eas-cli + its full transitive tree** in a temporary store, which
does NOT respect the consuming project's `pnpm.overrides` block
in package.json. Result: any `pnpm.overrides`-pinned package
(currently `balanced-match: ^1.0.2` — see the balanced-match
cross-phase entry above) is bypassed inside the dlx install.

**Symptom**: `(0 , balanced_match_1.balanced) is not a function`
during EAS Build's local "Compute project fingerprint" step
(`@expo/fingerprint`). Build submission aborts before upload,
exit code 1. The error message text is identical to the ESLint
chain failure that originally motivated the override — same root
cause (version mismatch), different consumer (`@expo/fingerprint`
inside the dlx-isolated install, not ESLint inside the project
install). The 507 new transitive deps from Phase 5's
expo-share-intent install made some new consumer reach for
`balanced-match` v4 API; the dlx install gets v4 (no override
applied) which mismatches the consumer expecting... actually
hard to tell without deeper bisection which version mismatches
which consumer, but the symptom is consistent.

**Workaround (current — used during Phase 5 Track B build):**
```bash
EAS_SKIP_AUTO_FINGERPRINT=1 pnpm dlx eas-cli build --platform ios ...
```
The fingerprint is an EAS optimization (computes a hash of the
project to skip rebuilds when nothing relevant changed). Skipping
it costs ~5 min of "could have been incrementally rebuilt" per
build; given current build cadence (1-2 iOS builds per phase),
the cost is negligible.

**Long-term resolution branches (decision deferred to Phase 6 or
Phase 10):**

(a) **Skip fingerprint permanently** — add `EAS_SKIP_AUTO_FINGERPRINT=1`
to the `cli.appVersionSource` config in `eas.json` (or a top-level
EAS env config). Cost: ~5 min per build. Benefit: zero new
devDeps, dlx workflow preserved.

(b) **Re-add eas-cli to devDependencies** — `pnpm add -D eas-cli`,
switch from `pnpm dlx eas-cli` to `pnpm exec eas-cli` everywhere.
A project-local install DOES inherit `pnpm.overrides`. Cost:
reverses the 2026-05-03 `expo doctor`-driven removal of eas-cli
from devDeps; introduces version-drift surface (eas-cli ships
weekly, our package.json would lag). Benefit: fingerprint works,
all eas-cli flows non-isolated.

(c) **Patch upstream balanced-match consumers** — find which
specific package inside `@expo/fingerprint` requires v4 API and
patch via patch-package, OR upstream PR. High effort, high
specificity, may need re-doing as deps churn.

**Trigger to decide between (a)/(b)/(c)**: Phase 6 or Phase 10
DX session. Until then, (a) is the in-effect default by virtue
of the env var workaround in active use.

**Audit interplay**: this entry compounds with the balanced-match
audit trigger ("any phase adding 100+ transitive deps"). When
the next audit fires, also verify whether `EAS_SKIP_AUTO_FINGERPRINT=1`
is still needed or whether the dep churn has resolved the
specific consumer mismatch.

## Active blockers

**(none — Phase 6 device-verification gate PASSED 2026-05-13.)**

Phase 6 implementation closed 2026-05-13 (typecheck + lint clean).
Downscoped device-verify gate (3 items on Pixel_7 Android emulator
dev-client per the Risk-tier triage in Verification Principles)
result:

| # | Check | Result |
|---|---|---|
| 1 | Email signup → routes to onboarding Step 1 | **PASS** (after `adb shell pm clear` of the Phase 5 persisted session, real-email signup via Gmail `+alias`. Two ancillary issues surfaced + fixed inline: Supabase "Confirm email" was ON in the project — user manually confirmed via Auth → Users dashboard; AuthScreen error mapper was over-greedy on "email" matches, fixed in commit 3f2673f to surface verbatim Supabase errors). |
| 2 | HOME save → pin renders on map | **PASS** (verified end-to-end via the new 3-tier 시/구/동 cascade — pick 강남구 → pick 역삼동 → Naver 행정복지센터 query → HOME pin at dong centroid). |
| 3 | Force-quit + relaunch → lands on map directly (no onboarding re-walk) | **PASS** |

**Phase 6 user-feedback follow-ups landed in same session**:

- **Step 1 redesign to 시/구/동 cascade picker**: user feedback
  flagged that the free-form AddressSearchInput in Step 1 was
  forcing a specific POI pick rather than answering the dong-level
  intent of "주로 어느 동네에서 지내세요?". Replaced with
  [src/onboarding/RegionPicker.tsx](src/onboarding/RegionPicker.tsx) —
  3-tier cascade: 시 (fixed "서울특별시" for v1 scope), 구 (Modal
  picker over 25 Seoul 자치구 from
  [src/data/seoul-districts.ts](src/data/seoul-districts.ts)), 동
  (existing AddressSearchInput scoped via `categoryKeyword` prefix
  to the chosen 구). 동 still picks a specific landmark (we don't
  have 동-centroid data without 사업자 등록 / 행정안전부 dataset),
  but the cascade gives the user the mental hierarchy they expect.
  Non-Seoul beta users surface as the Phase 10 expansion trigger.
- **Step 2 학교 키워드 prefix**: user/parallel-edit added
  `categoryKeyword='학교'` prop wiring in
  [OnboardingStepWorkSchool.tsx](src/onboarding/OnboardingStepWorkSchool.tsx)
  so SCHOOL or BOTH-mode SCHOOL picks narrow Naver results to
  schools (한양대학교 / 성수고등학교 etc) instead of returning
  arbitrary places. WORK left free-form (직장 too varied for any
  single keyword to narrow usefully).
- **MapScreen initial camera from HOME anchor**: replaced
  hardcoded `[127.055, 37.5446]` / zoom 15 default with a
  `useMemo` over savedPlaces that picks the HOME anchor's coords +
  zoom 14 (dong-level per D11). Skip-everything users fall back to
  Seoul City Hall + zoom 14.
- **iPhone post-save flyTo regression** (separate cross-phase
  entry above): user-reported during this session. NOT fixed in
  Phase 6 — Windows host can't validate iOS without EAS rebuild
  cycle, and blind-fixing risks Android regression. Three fix
  attempts queued for Phase 7 in the cross-phase entry.

**CURRENT_PHASE.md flip**: done in this session to phase-7 per
the "on Track A+B PASS" gate above.

**Earlier resolution record** (Phase 5 gates that previously blocked
Phase 6 start):

Phase 5 validation gate result is archived in the Completed phases
section (see "Phase 5: Save-flow MVP — VALIDATION GATE") and in the
header `Update 2026-05-13 (later same day)` entry. Phase 6 entry
gate condition (friend-demo PASS per strict-gate posture) was met
2026-05-13; Phase 6 implementation began + closed the same day.

Resolution record for the two gates that previously blocked Phase 5
lives in:

- Gate 1 (First EAS iOS Build): PASSED 2026-05-03 — see "First EAS
  iOS Build — explicit gate BEFORE Phase 5 kickoff" cross-phase
  entry above for the build URL + outcome.
- Gate 2 (Phase 4 visual re-verification): PASSED 2026-05-04 — see
  the "✅ Re-verified 2026-05-04" block inside the Phase 4
  INVALIDATED entry (Completed phases section) for the 10-item
  results table. Known deviations (#3 label, #5 station label, #4
  inconclusive) are blocked by the new cross-phase issue "Android
  emulator GPU shader failure on Windows host" — NOT by Path A or
  Phase 4 code.

<!-- Original blockers content preserved in git history (see commit
that closed Gate 2). The detailed 10-item check description that
guided this re-verification is preserved diagnostically in the
✅ Re-verified block referenced above. -->

---

<details>
<summary>Original (pre-resolution) blockers content for diagnostic archaeology</summary>

### Phase 5 kickoff is blocked on two items

These two items must be resolved before Phase 5 starts (each one is
a hard gate per its own cross-phase entry above):

1. **First EAS iOS Build attempted** ✅ **PASSED 2026-05-03** — see
   "First EAS iOS Build — explicit gate BEFORE Phase 5 kickoff". Gate
   pass condition was "attempted, results recorded here" — exceeded
   by an actual successful build (the strongest possible signal that
   the iOS native pipeline works end-to-end).

   - [x] Ran `pnpm dlx eas-cli build --platform ios --profile
         development` (note: corrected from earlier docs that showed
         the now-removed `--simulator` flag — eas-cli 18.x moved
         simulator setting into eas.json profile)
   - Result:
     - Date: 2026-05-03
     - Build URL: https://expo.dev/accounts/gachi2026/projects/mymap-app/builds/2440cf78-e790-4beb-8d0c-36eb608810f0
     - Outcome: **BUILD SUCCESSFUL** — unsigned `.app` artifact
       produced for iOS Simulator. Install QR + URL surfaced by EAS
       at completion.
     - Pre-flight fixes that landed in this round (separate from
       the gate itself but required to reach the build):
       - `app.config.ts`: added `extra.eas.projectId` manually
         (eas init can't auto-write to dynamic config)
       - `eas.json` created with `cli.version >=18.9.1` pin +
         3 build profiles (development / preview / production)
       - `expo doctor` blocking issues fixed: removed `eas-cli`
         from devDependencies (use `pnpm dlx eas-cli` going
         forward); bumped `expo` ~54.0.33 → ~54.0.34 and
         `expo-linking` ~8.0.11 → ~8.0.12 to match SDK 54
         recommended patches
       - `Mapbox` SDK download succeeded without explicit
         EAS secret registration (build did not require
         `MAPBOX_DOWNLOADS_TOKEN` secret as previously
         anticipated — likely because the rnmapbox plugin's
         iOS path doesn't gate on that token like the Android
         Maven path does)
     - Launch verification: deferred — no Mac on hand to actually
       install the `.app` to iOS Simulator. The build success
       itself is the load-bearing signal we wanted (validates
       that the iOS bindings + Style JSON + sprite/glyph URLs +
       all native config produces a launchable artifact). Actual
       launch verification rolls into the Phase 10 TestFlight
       upload (signed build, real device) which is the next iOS
       milestone after this gate.

2. **Phase 4 RE-verification: 10-item visual check list (Path A
   consumption check)** — Phase 4 closed initially with only
   well-formedness verified; the consumption check (does the
   rendered map match spec?) surfaced the v8 schema mismatch
   (see "D11 spec ↔ mapbox-streets-v8 schema mismatch" cross-phase
   issue). After Path A patch this re-verification is the
   consumption check, applied per the new "Verification Principles"
   section. Pass = "all 10 items recorded as PASS or known
   deviation, with date + emulator snapshot."

   **Pre-flight (CRITICAL — do BEFORE check #1):**

   - [ ] App full kill + relaunch (NOT just Metro hot reload).
         `@rnmapbox/maps` parses + caches `styleJSON` on prop
         receive — fast refresh does not re-parse. Without
         relaunch, the patched style JSON does not apply and the
         re-verification will re-confirm the OLD (bugged) state,
         creating a confusing "fix didn't work" loop.

         How: long-press app icon on emulator → App info → Force
         stop → tap app icon to relaunch. OR `adb shell am
         force-stop com.gachi2026.mymap && adb shell am start -n
         com.gachi2026.mymap/.MainActivity`.

   **Visual checks (run #1-9 in light mode first, then #10 last):**

   - [ ] **#1 Roads visible at z14+** — minor / collector / major /
         highway tiers in cream tones (`#E8E6E0` / `#DDD9D0` /
         `#C9C3B5`). Specifically: at zoom 14 in 성수동, expect
         visible road network — at minimum primary/secondary roads.
         Path A re-aligned `source-layer` to v8 `road`. PASS =
         "roads visible at z14+, multiple tiers distinguishable."
         FAIL = "0 roads" → `class` filter values may not match v8
         enum.
   - [ ] **#2 Subway lines visible at z13+ (binary)** — at least
         one rail line drawn as single grey (`#888888` light).
         Pan around 종로 / 강남 / 성수 area. PASS = "1+ rail line
         visible." FAIL = "0 rail" → v8 may not tag KR subway as
         `class=major_rail`; check via tile inspection.
   - [ ] **#3 Park polygon + park label both render at z13+** —
         polygon in sage `#D8DCC8`, label in Pretendard Regular
         sage `#6B7561`. Test over 서울숲 (37.5446, 127.0376).
         PASS = polygon visible AND label rendered in sage. FAIL
         polygon-only = label PBF or font name issue (re-check
         Phase 2 Pretendard Regular PBF). FAIL both = `place_label`
         filter for park class wrong.
   - [ ] **#4 Subway station dot at z14+ (binary, 4 branches)** —
         pan over any major Seoul subway station area at z14+.
         - PASS branch A: 1+ dot visible, dot count looks reasonable
           (~10-50 in metropolitan view) → Path A's stop_type filter
           works as intended, keep best-effort layer.
         - FAIL branch B: 0 dots → v8 `transit_stop_label` is empty
           for KR data → 진짜로 station 데이터 없음, 다음 patch 에
           서 layer 삭제 정당화.
         - FAIL branch C: dots but no Korean labels → Phase 2 PBF
           regression (specifically check `name:ko` Hangul range
           PBFs on R2 → re-upload if missing).
         - FAIL branch D: too many dots (bus stops + everything
           overlay → visual noise) → fallback `!has stop_type` is
           too permissive → next patch tightens to
           `stop_type=station` only (drop fallback). 1-line patch.
   - [ ] **#5 Subway station label in Korean at z14+** — station
         names render as 한국어 (성수역, 강남역 etc., not English
         transliteration). Validates both v8 transit_stop_label
         data and Phase 2 Pretendard PBF Korean range. Bonus
         bisection: if #4 branch A AND #5 fails, the station data
         is there but Pretendard Korean PBFs are missing → Phase 2
         regression candidate.
   - [ ] **#6 Cluster bubble at z12-13 with count** — pinch out to
         z12-13 over 성수 mock-pin cluster area. Expect small
         indigo circle with "8" (or similar) count text in white
         Pretendard Medium. Independent of Path A (cluster is
         runtime CircleLayer + SymbolLayer, not base map). PASS =
         "indigo bubble + visible numeric count."
   - [ ] **#7 Pin tap → console log `[pin tap] <id>`** — tap any
         saved pin. Log appears in Metro terminal. Independent of
         Path A.
   - [ ] **#8 Cluster tap → console log `[cluster tap] <id>`** —
         tap a cluster bubble (need z12-13 first). Independent of
         Path A.
   - [ ] **#9 Long-press over a pin → console log `[pin long-press]
         <id>`** — hold finger on a saved pin for 1+ second.
         Independent of Path A. (Note: long-press over empty area
         should NOT fire; the `queryRenderedFeaturesAtPoint` filter
         excludes non-pin layers.)

   **Final check (run LAST in the cycle for failure isolation):**

   - [ ] **#10 Dark mode toggle without app restart** ⭐ — pull
         down notification shade twice → tap Dark theme tile (or
         Settings → Display → Dark theme). Map should swap from
         cream/indigo to charcoal/lighter-indigo without app
         restart. Toggle back to light, should swap back. This is
         the most fragile behavior (the `Appearance.addChangeListener`
         in PersonalMap.tsx + double styleJSON parse on swap), so
         it goes LAST — if checks 1-9 all pass and #10 fails, the
         fault is isolated to the toggle path, not the Path A patch.

   **Record results (one line each, OK / FAIL <note>):**

   - Date checked: YYYY-MM-DD
   - Pre-flight kill+relaunch: ___
   - #1 Roads at z14+: ___
   - #2 Rail at z13+ (binary): ___
   - #3 Park polygon + label: ___
   - #4 Station dot binary + branch chosen: ___
   - #5 Korean station labels: ___
   - #6 Cluster bubble + count: ___
   - #7 Pin tap log: ___
   - #8 Cluster tap log: ___
   - #9 Long-press log: ___
   - #10 Dark mode toggle: ___

When all three gates (1, 2, 3) are resolved with results recorded,
change this section back to `(empty — Phase N+1 ready to start)`
and proceed.

3. **iOS EAS build can run in parallel** with the visual
   re-verification — they touch different infrastructure (EAS
   cloud Mac vs local Android emulator). Either can complete first.

</details>
