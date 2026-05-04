# PROJECT_STATE
Last updated: 2026-05-03 (Phase 4 INVALIDATED + reopened — manual visual checks at Phase 4 close revealed roads / subway lines / park labels all silently failing because spec was authored against OpenMapTiles schema but deployed against mapbox-streets-v8; Path A spec patch applied — single grey rail + best-effort station layers + park-label font + metadata field split; new "Verification Principles" section promoted from Phase 2 + Phase 4 lessons mandates consumption check on every future verification gate; new D11 cross-phase deviation entry; Phase 5 kickoff BLOCKED on three gates — first EAS iOS build attempt + Phase 4 re-verification (10-item visual check list) + dark mode toggle as final isolation step)

> **See also:** `RELEASE_CHECKLIST.md` — single-page user-facing index
> of every "before launch" item across all phases, organized by
> trigger event. Use this when you're about to hit a phase boundary
> and want to see what's due.

## Current phase

Phase 4 — Completed on Android (PersonalMap renders the locked Style
JSONs end-to-end on Pixel 7 emulator: cool warm-shifted base #F5F4F0,
muted sage parks, cool soft 한강 water, Korean labels via Pretendard
PBFs from R2, deep indigo saved pins with white category glyphs via
runtime CircleLayer + SymbolLayer pairs, lighter indigo_soft anchor
pins, surface_base "donut" visited pins, brand indigo NOT on any
base-map label or road). Mapbox renderer initialized cleanly (OpenGL
backend, EGLContext created, no JS exceptions); Metro bundled all 832
modules in 6.5s. iOS verification still deferred per the standing
"first EAS iOS Build deferred to end of Phase 4" cross-phase issue —
this phase end is the trigger to actually run that EAS build.
Active `phases/CURRENT_PHASE.md` → `phase-5-save-flow-validation.md`,
but **Phase 5 is BLOCKED** until three gates resolve (see Active
blockers section):

(a) first EAS iOS build attempted (the existing
    "deferred to end of Phase 4" cross-phase issue, hardened from
    "convenient" to a Phase 5 kickoff gate);

(b) **Phase 4 RE-verification** — 10-item visual check list (Path A
    patch consumption check, replacing the original 8-item list which
    the spec patch invalidated/restructured); results pasted into the
    blocker entry per item;

(c) **app full kill + relaunch** before re-verification (Style JSON
    changes do not propagate via Metro hot reload — `@rnmapbox/maps`
    parses + caches styleJSON on prop receive). Visual check #6 (dark
    mode toggle) MUST be the last item in the cycle so dark-transition
    failures can be isolated from Path A patch failures.

The Phase 4 entry below is annotated **VERIFICATION INVALIDATED
2026-05-03** — original gate only checked well-formedness, not
consumption (does the rendered map match spec?). See "Verification
Principles" section for the cross-phase generalization of this
lesson.

Two D10 marker-shape deviations from the locked spec were taken in
Phase 4 — both deferred to Phase 7 (which already owns visited-state
+ pin-interactions) because they need sprite-pipeline work that
Phase 2 didn't deliver. See Cross-phase issues for the full deferral
+ resolution path.

Apple Sign In + Google Sign In configuration remains deferred to
Phase 10 (existing entry — depends on Apple Developer Program
enrollment + locked bundleIdentifier + EAS SHA-1 fingerprint).

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

This principle is not abstract. Two cases in this project's history both
passed well-formedness gates and silently failed consumption checks; both
required reopening a closed phase:

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

## Pending phases

- [ ] Phase 5: Save-flow MVP — VALIDATION GATE (share-ext + URL classifier + Kakao auto-resolve)
- [ ] Phase 6: Onboarding + auth flow (2-step anchor, hint card)
- [ ] Phase 7: Pin interactions + states (tap-to-expand, long-press menu, visited, color filter)
- [ ] Phase 8: Pin detail popover (bottom sheet, OG card, edit fields)
- [ ] Phase 9: Search overlay (Kakao keyword search + pulsing results + save-from-result)
- [ ] Phase 10: Polish + beta (perf, errors, App Store assets, TestFlight)

## Open decisions (not yet locked)

- **App Store branded display name (pre-Phase 5):** the iOS share menu
  and Android intent picker both display the app's localized name.
  Pick before Phase 5 ships.
- **iOS `bundleIdentifier` + Android `package` (Phase 10):** currently
  set to PLACEHOLDER `com.gachi2026.mymap` in `app.config.ts`. Both
  are **immutable** once any version is published to App Store /
  Play Store. Final reverse-DNS identifier (likely tied to the final
  product name — see "App Store branded display name" decision above)
  must be locked before first TestFlight / Play Internal upload at
  Phase 10. Changing it later requires a new app listing from scratch.
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

**Audit command** (run before any major dep bump or quarterly):

```bash
pnpm why brace-expansion@1.1 2>/dev/null | head -3
# Empty output (or only deduped references) → drop the override:
#   1. Remove `balanced-match` from `pnpm.overrides` in package.json
#   2. rm -rf node_modules pnpm-lock.yaml && pnpm install
#   3. pnpm lint && pnpm typecheck must still pass
```

**Last verified active:** 2026-04-27 (both chains live; override required).

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

### Apple Sign In + Google Sign In configuration deferred to Phase 10

Phase 3 doc step 5 originally included "Configure auth providers:
Apple Sign In + Google Sign In" alongside Email/password.
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
DESIGN.md success criteria) AND subway-context degradation cited as
friction point in user feedback." Do NOT trigger on "MapLibre is
shinier" — the migration is non-trivial (2-3 working days + new
licensing surface + new tile-quota management). Worth doing only
when product-validation evidence justifies it.

**What did NOT change (Path A scope):**

- The 9-glyph sprite atlas, brand-indigo pin styling, anchor
  treatment, cluster behavior, dark mode toggle, Korean labels via
  Pretendard PBFs — all unaffected. Path A is purely base-map
  alignment with v8 schema.
- src/map/PersonalMap.tsx — no changes. The component consumes
  styleJSON as opaque string; spec patches alone fix rendering.
- spec/data-shapes.ts, spec/tokens.json, sprite SVGs — all
  unchanged. Path A touches only the two style JSONs + spec/CHANGELOG.

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

## Active blockers

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
