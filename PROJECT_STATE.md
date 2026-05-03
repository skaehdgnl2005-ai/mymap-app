# PROJECT_STATE
Last updated: 2026-04-30 (Phase 3 backend foundation completed: schema + RLS + OG resolver Edge Function deployed to cloud; Apple/Google OAuth config deferred to Phase 10; `expo-system-ui` installed early as Trigger 2 item; Phase 4 ready to start)

> **See also:** `RELEASE_CHECKLIST.md` — single-page user-facing index
> of every "before launch" item across all phases, organized by
> trigger event. Use this when you're about to hit a phase boundary
> and want to see what's due.

## Current phase

Phase 3 — Completed (12/12 local E2E PASS verifying RLS isolation, anon
deny via `permission denied`, OG resolver Naver/Instagram/example.com
classification, SSRF guard rejecting 127.0.0.1; cloud round-trip gate
passed via `supabase link` + `db push` (both migrations applied) +
`functions deploy og-resolver`). Active `phases/CURRENT_PHASE.md` →
`phase-4-renderer.md`. Phase 4 ready to start.

Apple Sign In + Google Sign In configuration deferred from Phase 3 to
Phase 10 — the *decision* (Apple + Google + Email at v1) stays locked,
only the *configuration timing* shifts (depends on Apple Developer
Program enrollment + locked bundleIdentifier + EAS SHA-1 fingerprint,
all Phase 10 artifacts). See Cross-phase issues for full rationale.

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

## Pending phases

- [ ] Phase 4: Map renderer integration (PersonalMap component + dark mode)
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

### First EAS iOS Build deferred to end of Phase 4

iOS verification cannot be done locally on Windows (no Xcode); the
opening Phase 1 decision was to defer iOS verification to "first EAS
Build" rather than borrow a Mac. Decision **2026-04-27**: actually
trigger that first EAS iOS build at the **end of Phase 4 (Map renderer
integration)**, not now.

**Why not at Phase 1 close:** the iOS code today is just the vanilla
Expo template + `@rnmapbox/maps` native config — no app-specific iOS
behavior. The first EAS iOS build is most diagnostic when actual
Mapbox iOS bindings get exercised by `PersonalMap`, so any failure is
unambiguously attributable.

**To run when Phase 4 closes:**

```bash
pnpm add -D eas-cli
pnpm exec eas login                 # free Expo account, one-time
pnpm exec eas init                  # links project to EAS
pnpm exec eas build --platform ios --profile development --simulator
# Simulator profile = no Apple Developer Program needed.
# Output is a .app for iOS Simulator (Mac required to actually launch;
# the build succeeding/failing is itself the verification we want here).
```

Apple Developer Program ($99/yr) becomes required at **Phase 10** for
TestFlight + App Store, NOT for this build.

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

## Active blockers

(empty — Phase 4 ready to start)
