# Release Checklist

A single-page view of everything that needs to happen between today and
v1 production launch, organized by **trigger event** (when each item is
due). Designed for the project owner to scan periodically, not for the
AI to auto-execute.

Each item has:
- **WHEN** — what triggers it
- **IRREVERSIBLE?** — `🔒 IRREVERSIBLE` (one-way door, decide
  carefully) vs `✏️ REVERSIBLE` (can fix later)
- **WHERE** — pointer to the source doc with full context. This file
  intentionally does NOT duplicate detail; it just tells you the doc to
  open when each trigger fires.

When a trigger fires, open a fresh Claude Code session and say "I'm at
trigger X — walk me through the relevant items." The AI will load
context from the source docs and guide each step.

---

## Trigger 1: Before Phase 3 starts (backend foundation)

| Item | Reversibility | Where |
|---|---|---|
| Lock backend provider (Supabase / Firestore / custom) | ✏️ schema is provider-agnostic per `spec/data-shapes.ts`, so re-platforming is possible but expensive | PROJECT_STATE.md → Open decisions |
| Lock authentication providers (Apple + Google + optional Kakao) | ✏️ can add/remove providers later | PROJECT_STATE.md → Open decisions; phases/phase-3-backend.md → Concrete tasks #5 |

---

## Trigger 2: At Phase 4 kickoff (map renderer)

| Item | Reversibility | Where |
|---|---|---|
| Install `expo-system-ui` (one command) | ✏️ trivial to install/uninstall | PROJECT_STATE.md → Cross-phase issues → "expo-system-ui not installed" |
| Run first EAS iOS Build (free Expo account, simulator profile — no Apple Developer Program needed yet) | ✏️ verification only | PROJECT_STATE.md → Cross-phase issues → "First EAS iOS Build" |

---

## Trigger 3: Before Phase 5 starts (save-flow MVP)

| Item | Reversibility | Where |
|---|---|---|
| Lock branded **display name** (shows in iOS share menu + Android intent picker) | ✏️ can change before App Store submission, hard to change after | PROJECT_STATE.md → Open decisions; DESIGN.md → Open Q3 |

---

## Trigger 4: Before FIRST TestFlight or Play Internal upload (Phase 10 prep)

This is the highest-stakes trigger. Anything `🔒 IRREVERSIBLE` here
becomes permanent the moment any version is published.

| Item | Reversibility | Where |
|---|---|---|
| Lock iOS `bundleIdentifier` + Android `package` (currently placeholder `com.gachi2026.mymap`) | 🔒 IRREVERSIBLE — changing later requires a new App Store / Play Store listing from scratch (lose all reviews, ratings, install base) | PROJECT_STATE.md → Open decisions → "iOS `bundleIdentifier` + Android `package`" |
| Sign up for Apple Developer Program ($99 / year, recurring) | ✏️ can cancel later | DESIGN.md → Dependencies; PROJECT_STATE.md → Cross-phase issues → "First EAS iOS Build" |
| Sign up for Google Play Developer ($25 one-time fee) | ✏️ can stop publishing later | DESIGN.md → Dependencies |
| Verify Mapbox account is on free tier limits (50k MAU/mo) and access token rotated if needed | ✏️ can rotate tokens, can switch tier | DESIGN.md → Dependencies |
| Verify Kakao Developers account API key is production-ready + Naver/Kakao usage staying under daily 100k quota | ✏️ can rotate, can switch tier | DESIGN.md → D5 (POI provider) |
| **Tighten R2 CORS** from current `["*"]` to explicit production origins | ✏️ takes ~1 minute via `wrangler r2 bucket cors set` | PROJECT_STATE.md → Cross-phase issues → "Phase 10 CORS tightening (R2 mymap-assets bucket)" |
| Decide on R2 custom domain (e.g., `cdn.<product>.app`) vs keep default `pub-*.r2.dev` | ✏️ can switch domains later via R2's concurrent-domain feature | PROJECT_STATE.md → "Phase 2: Asset hosting" entry → R2 hosting state |
| Configure Sentry (or alternative) for crash reporting | ✏️ can swap services | phases/phase-10-polish.md → Concrete tasks #17 |

---

## Trigger 5: Before App Store / Play Store production submission

| Item | Reversibility | Where |
|---|---|---|
| Privacy policy + ToS published at stable URL (Korean PIPA + GDPR compliant) | ✏️ can update content; URL should be stable | phases/phase-10-polish.md → Concrete tasks #10 |
| App Store privacy disclosures (Apple "Nutrition Label") | ✏️ can update on next submission | phases/phase-10-polish.md → Concrete tasks #11 |
| App Store screenshots in Korean (6.7" + 6.5" + 5.5" iPhone) | ✏️ can replace with new submission | phases/phase-10-polish.md → Concrete tasks #8 |
| App Store description + keywords in Korean | ✏️ can update with new submission | phases/phase-10-polish.md → Concrete tasks #9 |
| App icon (1024×1024 PNG, no transparency) | ✏️ can replace with new submission, but brand recognition cost | phases/phase-10-polish.md → Concrete tasks #13 |
| Age rating (4+ unless KakaoTalk login → 12+) | ✏️ can change with new submission | phases/phase-10-polish.md → Concrete tasks #12 |
| Beta tested for ≥1 week with ≥3 testers, no P0 crashes | ✏️ verification only | phases/phase-10-polish.md → Concrete tasks #16-18 |
| Critical-bug fixes (P0 only — defer P1 to v1.1) | ✏️ verification only | phases/phase-10-polish.md → Concrete tasks #19 |

---

## Recurring / quarterly checks (no trigger date)

| Item | Reversibility | Where |
|---|---|---|
| `balanced-match` pnpm override audit (drop override when both ESLint + RN chains resolve) | ✏️ override is just a cleanup item, not blocking | PROJECT_STATE.md → Cross-phase issues → "balanced-match pinned via pnpm.overrides" |

---

## Permanent dev-environment notes (no action needed; just be aware)

| Item | Where |
|---|---|
| Docker required for `fontnik` on Windows (no host install possible without VS Build Tools) | PROJECT_STATE.md → Cross-phase issues → "Docker required for fontnik on Windows" |
| Phase transitions on Windows use file-copy script (no symlinks without Developer Mode) | CLAUDE.md → Always-loaded context |
| Project root must NOT be on OneDrive (Metro file-lock + node_modules sync conflicts) | PROJECT_STATE.md → Environment & setup decisions |

---

## How to use this file

- **Periodically scan** (every 2-4 weeks, or whenever you reach a phase
  boundary) for items whose trigger has fired.
- **When a trigger fires**, open Claude Code and say something like:
  *"Trigger 4 from RELEASE_CHECKLIST.md is about to fire — I'm planning
  the first TestFlight upload. Walk me through the IRREVERSIBLE items
  one by one."* The AI will pull source-doc context and guide each.
- **One-way doors first.** When multiple items at a trigger compete for
  attention, do `🔒 IRREVERSIBLE` ones first — those have the highest
  cost-of-error.
- **This file is a navigator, not the source of truth.** Each linked
  source doc has the full context, decisions, and reasoning. If a
  source doc disagrees with this file, the source doc wins (and please
  fix this file).

---

## Maintenance

When adding a new "before launch" item to PROJECT_STATE.md or a phase
doc, also add a row here with the trigger + reversibility flag + source
pointer. The whole point of this file is *no item falls through cracks
between docs.*
