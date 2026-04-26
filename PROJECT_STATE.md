# PROJECT_STATE
Last updated: 2026-04-26 (Phase 0 complete; setup scripts added; ready for Phase 1)

## Current phase
Phase 0 — Completed (spec finalized via /office-hours). Phase 1 ready to
start. Active `phases/CURRENT_PHASE.md` → `phase-1-scaffolding.md`.

## Environment & setup decisions

- **Development OS: Windows.** Phase transition uses file-copy mechanism
  (no admin or Developer Mode required). Switch active phase via:
  - Git Bash: `bash phases/set-current-phase.sh N`
  - PowerShell: `.\phases\set-current-phase.ps1 N`
  - macOS/Linux equivalents preserved in CLAUDE.md for reference if the
    dev environment changes
- **CURRENT_PHASE.md initialized** as a copy of `phase-1-scaffolding.md`
  on 2026-04-26.
- **Setup scripts added:**
  - `phases/set-current-phase.sh` (Bash, Git Bash compatible)
  - `phases/set-current-phase.ps1` (PowerShell native)

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

## Pending phases

- [ ] Phase 1: Project scaffolding (Expo + TypeScript + Mapbox + Kakao + git + lint)
- [ ] Phase 2: Asset hosting (sprite + Pretendard PBFs uploaded to R2)
- [ ] Phase 3: Backend foundation (Supabase + schema + auth + OG fetcher)
- [ ] Phase 4: Map renderer integration (PersonalMap component + dark mode)
- [ ] Phase 5: Save-flow MVP — VALIDATION GATE (share-ext + URL classifier + Kakao auto-resolve)
- [ ] Phase 6: Onboarding + auth flow (2-step anchor, hint card)
- [ ] Phase 7: Pin interactions + states (tap-to-expand, long-press menu, visited, color filter)
- [ ] Phase 8: Pin detail popover (bottom sheet, OG card, edit fields)
- [ ] Phase 9: Search overlay (Kakao keyword search + pulsing results + save-from-result)
- [ ] Phase 10: Polish + beta (perf, errors, App Store assets, TestFlight)

## Open decisions (not yet locked)

- **Backend choice (Phase 3):** Supabase recommended over Firestore for
  Postgres + Edge Functions + Auth in one stack, but final lock pending
  Phase 3 kickoff. If push comes to shove, schema in `spec/data-shapes.ts`
  is provider-agnostic.
- **Authentication provider (Phase 3/6):** Apple Sign In + Google Sign In
  required for App Store policy. KakaoTalk login optional — adds Kakao
  SDK dependency but matches Korean Gen Z habit. Decide at Phase 3.
- **App Store branded display name (pre-Phase 5):** the iOS share menu
  and Android intent picker both display the app's localized name.
  Pick before Phase 5 ships.
- **CDN provider (Phase 2):** Cloudflare R2 (recommended for cost +
  egress) vs Supabase Storage (one-vendor simplicity if Phase 3 picks
  Supabase). Decide at Phase 2.

## Cross-phase issues / drift

(empty — no drift detected yet)

## Active blockers

(empty — Phase 1 ready to start)
