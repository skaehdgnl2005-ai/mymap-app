# Phase 5 Handoff
Date: 2026-05-13
Phase: 5 — Save-flow MVP — VALIDATION GATE
Duration: 7 working days (2026-05-06 implementation start → 2026-05-13 validation gate close)

## What was completed
- [x] Task 1: `expo-share-intent` install + plugin config + prebuild
- [x] Task 2: iOS share-extension activation rules + Android intent filter
      (MIME-only — host-filter granularity deferred per cross-phase issue)
- [x] Task 3: URL classifier (`src/save-flow/url-classifier.ts`) +
      unit tests covering Naver / Kakao / Instagram / Threads / blog /
      invalid input
- [x] Task 4: POI client — Naver Open API Local Search
      (`src/naver/client.ts`) per D5b reopen of D5; Kakao client
      archived as reverse-path
- [x] Task 5: `SaveModal` UI + state machine (idle → resolving →
      auto-resolved | manual → saving)
- [x] Task 6: `App.tsx` share-intent + clipboard wiring + dev sign-in
      shim (`ensureDevSession` via `auth.uid()` flow, not hardcoded
      literal — Phase 6 absorbs cleanly)
- [x] Task 7: `+` floating button + clipboard auto-detect (on tap,
      never on app foreground per D7 R1)
- [x] Task 8: Real-device build path — EAS preview profile internal
      distribution build, founder UDID registered
- [x] Task 9: Manual 5-path smoke test on founder iPhone
- [x] **Validation gate (THE critical gate): friend-demo per Phase 5
      doc protocol — 5/5 paths PASS.** Wedge thesis empirically
      confirmed.
- [x] T-24h gate sub-conditions 1-5 all closed

## What was NOT completed (and why)
- [ ] iOS pinch-zoom decay complete fix — reason: `@rnmapbox/maps`
      API doesn't expose iOS pinch-zoom deceleration toggle. Partial
      fix applied (`gestureSettings.panDecelerationFactor: 0` +
      `pinchZoomDecelerationEnabled: false` for Android + rotate
      decel disabled). Full fix deferred to Phase 10 polish or
      MapLibre + MapTiler migration evaluation.
- [ ] Road sparsity (안암역 example) — reason: user decision
      2026-05-13 to leave as-is. Structural limitation of
      mapbox-streets-v8 KR OSM data (Naver/Kakao proprietary data
      not licensable for our render path per D5b). Added to D11
      MapTiler migration trigger pile.
- [ ] AUTO_RESOLVE Path 4 accuracy edge cases — reason: lever
      framework documented (controllable: query construction,
      selection logic, disambiguation degrade), but no fix applied
      for v1; friend-demo accepted with minor ambiguity.

## Mid-phase decisions
- **D5 reopen → D5b (Naver Open API Local Search substitution for v1)**:
  Kakao Developer Console requires 사업자 등록증 to activate 카카오맵
  product. Discovered during Phase 5 Track A on 2026-05-07. Founder
  is Individual, no 사업자 등록 at v1. Naver Open API Local Search
  has no 사업자 등록 requirement; transitional fallback for v1, Phase
  10 evaluation gate for reverse migration to D5. Full rationale +
  migration paths in DESIGN.md D5b additive amendment.
- **eas.json `preview` profile correction**: shipped with
  `simulator: true` (carried over from Phase 1 default), which made
  EAS produce simulator-only `.app` instead of real-device `.ipa`.
  Discovered 2026-05-13 just before validation gate. Fixed by removing
  the `simulator: true` line; subsequent builds produce ad-hoc-signed
  real-device `.ipa`.
- **EAS environment variable injection**: local `.env` is gitignored
  and EAS Build creates an isolated git checkout, so `EXPO_PUBLIC_*`
  vars are not auto-included. Symptom: production-mode app crashes
  silently as black screen (throw at module load not surfaced by RN
  error overlay outside dev mode). Fix: register 7 `EXPO_PUBLIC_*` env
  vars on EAS dashboard for both `preview` and `production`
  environments before rebuilding.
- **Dev test-user authentication via `auth.uid()` flow**:
  rejected the Phase 5 doc's allowance for hardcoded `user_id` literal.
  Reason: hardcoding bypasses RLS, leaves Phase 6 inheriting unproven
  RLS surface. Cost: 2 env vars + 1 Supabase dashboard test-user.
  Benefit: zero auth-boundary debt at Phase 6 entry.
- **Phase doc sketches treated as guidance, not contract**:
  reconciled 2 cases where phase doc sketches diverged from locked
  upstream (og-resolver field name, KakaoPlaceResult shape). Generalized
  practice: verify field names against locked source before treating
  doc snippets as code-ready.
- **expo-share-intent Hangul plugin bug Option A workaround**:
  v5.1.1 `getShareExtensionName()` regex strips non-`[a-zA-Z0-9]`
  from `iosShareExtensionName`, yielding `""` for pure-Hangul brand
  `'자국'`. Option A: remove the param, accept default ASCII Xcode
  target name + `"자국 - Share Extension"` mixed-language picker
  label. Option C custom plugin deferred (friend-demo evidence-gated).
- **Gesture decay partial fix at Phase 5 close**: friend-demo
  qualitative feedback "미끄럽다" triggered investigation of
  `@rnmapbox/maps` gesture API. Applied what's exposed (pan + Android
  pinch + rotate decel). iOS pinch-zoom decay left as known
  limitation.

## Cross-phase drift detected
- **D5 → D5b POI provider amendment**: Kakao Local API access blocked
  by 사업자 등록 requirement. Recorded as DESIGN.md D5b additive
  (D5 본문 unchanged, D5b explicit fallback record).
- **Spec ↔ codebase divergences**: phase doc sketches diverged from
  locked spec in 2 places (resolved by reading locked source first).
- **v8 Korean tile data 구 누락 (sibling to D11)**: empirical
  evidence from Phase 4 City Hall + Phase 5 성수동 mock-pin
  verification. Added as cross-phase issue, extended D11 MapTiler
  migration trigger condition.
- **Gesture decay friction (zoom/pan slippery feel)**: friend-demo
  qualitative feedback. Added to D11 trigger pile (4th item).
- **Road sparsity friction (안암역 example)**: friend-demo
  qualitative feedback. Added to D11 trigger pile (5th item — though
  MapTiler doesn't fundamentally solve, it's marked as additional
  signal).
- **6 new cross-phase issues during Phase 5**: D5b POI substitution,
  expo-share-intent Hangul plugin bug, pnpm dlx eas-cli pnpm.overrides
  non-inheritance, Claude Code Read tool 2000px image limit, v8
  Korean tile data 구 누락, Android share-sheet host-filter
  granularity deferred.
- **1 new Verification Principles Case (Case #4)**: subagent
  analysis as input artifact — well-formedness of agent output
  doesn't imply consumption-check pass.

## Verification result
- **Method**:
  - Track A: `pnpm typecheck` + `pnpm lint` + Android Pixel_7 emulator
    via `scripts/test-phase5-naver.mjs` + `scripts/test-phase5-save.mjs`
    + adb share intent E2E for Step 7f
  - Track B: EAS preview profile iOS build → ad-hoc install on founder
    iPhone → manual 5-path smoke test
  - Validation gate: formal friend-demo per Phase 5 doc protocol
    (10-min hand-over-phone, founder silent, 4 post-demo questions)
- **Result**:
  - Track A: PASS (7d/7e/7f, one mid-verification bug fixed: synthetic
    id FlatList keyExtractor collision, commit ffb2b45)
  - Track B: PASS (5-path smoke test on founder iPhone 2026-05-12 +
    formal friend-demo 2026-05-13)
  - **Validation gate: 5/5 PASS, wedge thesis CONFIRMED**
    - Path 1 (AUTO_RESOLVE / 네이버 지도 → 공유 → 자국) ✅
    - Path 2 (MANUAL_RESOLVE / 인스타 → 공유 → 자국 → 검색) ✅
    - Path 3 (인스타 Copy Link → 자국 + 버튼 → clipboard auto-detect) ✅
    - Path 4 (AUTO_RESOLVE 정확도) ✅ minor ambiguity accepted
    - Path 5 (force-quit + 재실행 핀 persistence) ✅
  - Qualitative feedback (polish-tier, not blockers):
    - 친구: zoom/pan "미끄러지는 느낌"
    - 친구: 도로 sparsity (안암역 비교)

## Files created/modified
- `src/save-flow/url-classifier.ts` + `.test.ts`: URL routing
- `src/save-flow/SaveModal.tsx`: save modal UI + state machine
- `src/naver/client.ts`: Naver Open API Local Search client (D5b)
- `src/kakao/client.ts`: ARCHIVED (reverse-path to D5 reserved)
- `src/map/PersonalMap.tsx`: `forwardRef` + `PersonalMapHandle` +
  `searchResults` overlay + `gestureSettings` polish (2026-05-13)
- `App.tsx`: full production entry — share-intent + clipboard +
  ensureDevSession + mapHandleRef + SaveModal wiring
- `scripts/test-phase5-naver.mjs` + `scripts/test-phase5-save.mjs`:
  Track A verification scripts
- `app.config.ts`: `expo-share-intent` plugin + name/bundleIdentifier
  brand lock + `iosShareExtensionName` removal (Hangul bug Option A)
- `eas.json`: `preview.ios.simulator: true` removal (real-device fix)
- `.env.example`: Naver + test-user env vars documented
- `package.json` + `pnpm-lock.yaml`: `expo-share-intent` + `expo-clipboard`
- `DESIGN.md`: D5b additive amendment (Naver substitution + reverse
  path)
- `PROJECT_STATE.md`: this phase close + multiple cross-phase issues +
  Verification Principles Case #4

## Recommended modifications to upcoming phase docs
- **Phase 6 doc (onboarding + auth flow)**: 
  - dev-shim `ensureDevSession` (App.tsx) → real auth UI 자연 교체
    가능. Same `supabase.auth` API, same RLS boundary.
  - When introducing new env vars (e.g., Apple Sign In Service ID,
    Google OAuth client IDs), remember to register on EAS dashboard
    for both `preview` and `production` environments BEFORE rebuilding
    — Phase 5 close 직전 silent-crash 의 root cause 였음.
  - Visual verification: use real iPhone (founder's). Windows Android
    emulator GPU 가 text shader 실패함 — known cross-phase issue.
- **Phase 7 doc (pin interactions + states)**:
  - sprite-pipeline 확장 task (D10 deviation 해결) 이 이미 추가됨.
    그 cycle 에 visited state UI 도 같이 wire up.
  - Friend-demo 의 polish-tier 피드백 (zoom/pan slippery, 도로
    sparsity) 은 Phase 7 의 시각 polish 와 인접 — 진단 시 같이 참조.
- **Phase 10 doc (polish + beta)**:
  - iOS pinch-zoom decay 완전 fix — `@rnmapbox/maps` 의 향후 API
    노출 확인 또는 custom gesture wrapper 평가.
  - Apple Sign In + Google Sign In 등 Phase 10 deferred 항목들
    (기존 cross-phase 엔트리 참조).
  - expo-share-intent v6 + Expo SDK 55 업그레이드 — Option A
    Hangul mixed-language picker label fix 시도 (Option C custom
    plugin 대안).
  - MapTiler migration trigger condition 재평가 — wedge passed +
    5개 신호 누적 상태. v1 launch 후 베타 사용자 피드백 보고 결정.
