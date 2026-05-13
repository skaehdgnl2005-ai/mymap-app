# INTEGRATION.md

Stack and module reference for embedding `자국` (`mymap-app`) — a Korean
personal-curated-map — into a separate host application.

This is **not** an end-user README and not a full architecture doc. It
exists to answer one question: *"What do I need to keep, replace, and
re-host to fold this app's capabilities into another app?"*

For locked product/design decisions and project history, see
`DESIGN.md`, `PROJECT_STATE.md`, and `phases/`.

---

## 1. Overview

The app provides three user-facing capabilities:

1. **Map render** — a Toss-style minimal map of Korea with the user's
   saved places as indigo pins (Mapbox v8 vector tiles, Korean labels,
   light/dark mode).
2. **Save flow** — receive a URL (Naver/Kakao/Instagram/blog) via iOS
   share-extension or Android `ACTION_SEND` (or clipboard), classify
   it, resolve the place via Kakao Local API, persist.
3. **Persistence** — per-user `saved_places` rows in Postgres, secured
   by RLS (`auth.uid() = user_id`).

Phases 1-4 ship the renderer + backend + R2 asset hosting; Phase 5
ships the save flow as the validation gate. Onboarding, pin
interactions, search, and polish are Phases 6-10.

---

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | React Native 0.81 + Expo SDK 54 | New Architecture on, TS strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` |
| Map | `@rnmapbox/maps@^10.3` (Mapbox v10 SDK) | Migrates to MapLibre + MapTiler post-PMF (DESIGN.md D4); Style JSON kept portable |
| Tiles | `mapbox://mapbox.mapbox-streets-v8` | Schema mismatch with original spec — Path A patch in `spec/style-{light,dark}.json` |
| Backend | Supabase (Postgres 17 + Auth + Edge Functions) | Region `ap-northeast-2`; free tier auto-pauses after 7 days idle |
| POI | Kakao Local API (REST) | Free 100k req/day; Naver excluded (DESIGN.md D5) |
| Assets | Cloudflare R2 (`mymap-assets` bucket) | Sprites + Pretendard PBF glyphs; URL-versioned `/sprites/v1/`, `/fonts/v1/` |
| Auth | Email/password (Phase 5 dev shim); Apple + Google planned for Phase 10 | Kakao OAuth deferred to v1.5 |
| Native deps | `expo-share-intent@~5.1` (iOS extension + Android intent), `expo-clipboard`, `expo-system-ui`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill` | |
| Build | `pnpm@10.33`, EAS Build for iOS, Expo prebuild CNG for Android | `android/` + `ios/` are gitignored; native config lives in `app.config.ts` plugins |

**Locked toolchain**: Node ≥20, JDK 21 (Android Studio JBR),
TypeScript 5.9, ESLint 9 + `eslint-config-expo@10`, Prettier 3.

---

## 3. Module map

```
App.tsx                          # Phase 5 entry: wires share-intent + clipboard → SaveModal
├── src/map/PersonalMap.tsx      # MapView + ShapeSources (anchors / saved / search overlay)
│   └── spec/style-{light,dark}.json   # Bundled, runtime-config style; references R2 sprite + glyph URLs
├── src/save-flow/SaveModal.tsx  # Modal: AUTO_RESOLVE card OR MANUAL_RESOLVE search
│   ├── src/save-flow/url-classifier.ts   # Pure URL → strategy router
│   ├── src/kakao/client.ts              # Kakao Local API client (search + reverse-geocode + URL→place)
│   └── src/places/repo.ts               # CRUD + og-resolver invocation
├── src/places/repo.ts           # → src/supabase.ts (typed client, AsyncStorage session)
└── src/supabase.ts              # → src/types/database.ts → spec/data-shapes.ts (single source of truth)

spec/                            # Approval-required (CLAUDE.md):
├── data-shapes.ts               # SavedPlace + GeoJSON helpers — schema source of truth
├── style-light.json / style-dark.json   # Mapbox Style Spec v8 (portable to MapLibre)
└── tokens.json                  # Design tokens

supabase/
├── migrations/2026...initial_schema.sql       # saved_places + RLS
├── migrations/2026...og_resolver_rate.sql     # og_resolver_rate + check_og_rate_limit RPC
└── functions/og-resolver/index.ts             # Deno Edge Function: URL → OG metadata
```

Top-down dependency direction: `App.tsx` is the only file that reaches
into all others; `spec/data-shapes.ts` has no dependencies.

---

## 4. Public API per module

### `spec/data-shapes.ts` — schema + GeoJSON helpers

| Export | Purpose |
|---|---|
| `SavedPlace` | 15-user-field interface (`id`, `user_id`, `name`, `lat`, `lng`, `category`, `source_url`, OG cache ×4, `note`, `visited`, `color_tag`, `address`, `region`, `saved_at`, `visited_at`) |
| `SavedPlaceCategory` | `'CAFE' \| 'RESTAURANT' \| 'BAR' \| 'SHOP' \| 'LANDMARK' \| 'HOME' \| 'SCHOOL' \| 'WORK' \| 'OTHER'` |
| `ColorTag` | `'NONE' \| 'RED' \| 'ORANGE' \| 'YELLOW' \| 'GREEN' \| 'BLUE' \| 'PURPLE'` |
| `OgFetchStatus` | `'OK' \| 'FAILED' \| 'GATED' \| null` |
| `KakaoPlaceResult` | Narrowed Kakao response (`id`, `place_name`, `category_name`, `address_name`, `road_address_name`, `x`, `y`) |
| `AnchorCategory`, `ANCHOR_CATEGORIES`, `isAnchor(p)` | Type-narrowing helpers for HOME/WORK/SCHOOL |
| `savedPlaceToGeoJSONFeature(p)` | `SavedPlace → Feature<Point, PinFeatureProperties>`, codifies `[lng, lat]` order |
| `savedPlacesToFeatureCollection(ps)` | Bulk variant |
| `partitionPlaces(ps)` | Returns `{ anchorsCollection, savedCollection }` — anchors don't cluster |
| `kakaoResultToFeature(r)` | Kakao search result → transient overlay Feature |
| `inferCategoryFromKakao(catText)` | Heuristic Kakao category-text → `SavedPlaceCategory` |

### `src/supabase.ts`

Exports `supabase: SupabaseClient<Database>`. Reads
`EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY`; throws at
import if either is missing. Uses `AsyncStorage` for session
persistence — **swap this for any host with a different storage
primitive**.

### `src/types/database.ts`

Hand-derived `Database` type for the Supabase generic. `spec/data-shapes.ts` is the source of truth; this file maps `SavedPlace` into the `Row/Insert/Update` shape supabase-js expects (Pattern A; `pnpm db:gen-types` is the drift gate).

### `src/places/repo.ts` — CRUD + Edge Function client

All functions return `Result<T, E> = { data: T; error: null } | { data: null; error: E }`.

| Export | Signature | Notes |
|---|---|---|
| `listPlaces()` | `→ Promise<Result<SavedPlace[]>>` | Ordered by `saved_at desc`; RLS filters to own rows |
| `listPlacesByRegion(region)` | `→ Promise<Result<SavedPlace[]>>` | `region` is dong-level (e.g. `"성수동"`) |
| `getPlace(id)` | `→ Promise<Result<SavedPlace \| null>>` | |
| `savePlace(p: NewSavedPlace)` | `→ Promise<Result<SavedPlace>>` | `user_id` required (RLS WITH CHECK); `id`/`saved_at`/`visited`/`color_tag` DB-defaulted |
| `updatePlace(id, patch)` | `→ Promise<Result<SavedPlace>>` | `id`/`user_id`/`saved_at` immutable |
| `deletePlace(id)` | `→ Promise<Result<true>>` | |
| `resolveOgMetadata(url)` | `→ Promise<Result<OgResolverResult, FunctionsError \| Error>>` | Stateless on cache; caller checks `og_fetched_at < 30 days` |

`OgResolverResult = { og_title, og_image_url, og_description, og_fetch_status }`.

### `src/kakao/client.ts` — Kakao Local API

Reads `EXPO_PUBLIC_KAKAO_REST_API_KEY` (soft-warns at import; throws at first call). All functions return `Result<T>`.

| Export | Signature | Notes |
|---|---|---|
| `kakaoSearchByKeyword(query, opts?)` | `query: string, opts?: { x?, y?, radius?, size? } → Promise<Result<KakaoPlaceResult[]>>` | Pass user's HOME anchor as `x/y` to bias results regionally |
| `kakaoCoordToAddress(lng, lat)` | `→ Promise<Result<{ address, region_3depth } \| null>>` | Collapses `성수동1가 → 성수동` per D5 R3 |
| `resolvePlaceFromUrl(url)` | `→ Promise<Result<KakaoPlaceResult \| null>>` | URL → og-resolver Edge Function → `og_title` → `kakaoSearchByKeyword` → top result |
| `Result<T, E>` | Tagged union, mirrors `src/places/repo.ts` | |

### `src/save-flow/url-classifier.ts` — pure URL routing

No IO, no React. Safe to lift into any JS environment.

| Export | Signature |
|---|---|
| `classifyUrl(raw: string)` | `→ ClassifiedUrl \| null` |
| `ClassifiedUrl` | `{ raw, hostname, strategy: 'AUTO_RESOLVE' \| 'MANUAL_RESOLVE', domain_kind, place_id_hint: string \| null }` |
| `DomainKind` | `'kakao_place' \| 'naver_place' \| 'instagram' \| 'threads' \| 'naver_blog' \| 'tistory' \| 'other'` |
| `ResolveStrategy` | `'AUTO_RESOLVE' \| 'MANUAL_RESOLVE'` |

Naver/Kakao Place URLs route AUTO; Instagram/Threads/blog URLs route MANUAL. Misclassification falls through to MANUAL (safe default).

### `src/save-flow/SaveModal.tsx` — RN modal UI

```ts
<SaveModal
  visible={boolean}
  url={ClassifiedUrl}
  userId={string}                 // host must provide authenticated user.id
  onClose={() => void}
  onSaved={(place: SavedPlace) => void}
/>
```

Internally manages a `Phase` state machine: `idle → resolving → auto-resolved → saving | manual → saving`. Surfaces errors above phase-conditional UI. Brand copy is hardcoded to `자국에 저장하기`.

### `src/map/PersonalMap.tsx` — RN map component

```ts
<PersonalMap
  savedPlaces={SavedPlace[]}
  searchResults?={KakaoPlaceResult[]}
  initialCenter?={[lng, lat]}     // default Seoul City Hall [126.978, 37.5665]
  initialZoom?={number}           // default 14
  onPinTap?={(placeId: string) => void}
  onPinLongPress?={(placeId: string) => void}
  onClusterTap?={(clusterId: number) => void}
  onSearchResultTap?={(resultId: string) => void}
/>

// Re-exports `Mapbox` so the host can call `Mapbox.setAccessToken(...)` at boot.
export { Mapbox };
```

Internally subscribes to `Appearance` for dark/light style swap. Bundles both Style JSONs via `resolveJsonModule`. Anchors (HOME/WORK/SCHOOL) render in their own non-clustered ShapeSource; saved pins cluster up to zoom 13.

### `supabase/functions/og-resolver/index.ts` — Edge Function

```
POST /functions/v1/og-resolver
  Authorization: Bearer <user JWT>      # verify_jwt = true (default)
  Body:    { url: string }
  Returns: { og_title, og_image_url, og_description, og_fetch_status }
```

`og_fetch_status`: `'OK' | 'FAILED' | 'GATED'` (Instagram logged-out shells → GATED). SSRF guard rejects private/loopback/link-local IPs before fetch. 4s timeout, 1MB HTML cap. Per-user rate-limit gate via `check_og_rate_limit` RPC (identity from `auth.uid()`, not request body).

---

## 5. Integration boundaries

### a) Data layer (Postgres + RLS + Supabase)

- **Portable.** Schema lives in `supabase/migrations/` and applies to any Postgres 17. `spec/data-shapes.ts` is the type-level mirror. RLS predicate is `auth.uid() = user_id` — works with any Supabase auth provider, or with any other JWT issuer if you rewrite the policy to read your own claim.
- **Coupled to Supabase only via `supabase-js`.** `src/places/repo.ts` is a thin wrapper; replacing it with PostgREST/Prisma/raw SQL is straightforward.
- **AsyncStorage in `src/supabase.ts` is RN-specific.** Web/Node hosts swap the `auth.storage` adapter; everything else is provider-agnostic.

### b) Map renderer

- **`@rnmapbox/maps` is RN-only.** For web, swap for `mapbox-gl-js` or `maplibre-gl-js` — the same Style JSON works (Style Spec v8 is shared across runtimes).
- **Style JSONs are runtime config.** Treat `spec/style-{light,dark}.json` as data, not code. They reference R2 sprite + glyph URLs internally.
- **`PersonalMap.tsx` is RN-component-coupled** but the props interface translates 1:1 to a web equivalent. The data feed (`partitionPlaces`, `savedPlacesToFeatureCollection`) is portable.

### c) Save flow

- **Pure-portable**: `url-classifier.ts` (zero deps beyond `URL` global) and `kakao/client.ts` (fetch-based, no RN imports). Both lift cleanly into Node/web.
- **RN-coupled**: `SaveModal.tsx` (React Native primitives — `Modal`, `FlatList`, `TextInput`), `expo-share-intent` (iOS extension + Android intent filter), `expo-clipboard`.
- **For a web embed**: replace SaveModal UI; reuse `url-classifier` + `kakao/client` + `places/repo` verbatim.

### d) Auth boundary

- RLS is the security perimeter — every `saved_places` query is filtered by `auth.uid() = user_id`. Anon role is `REVOKE`'d (fail-loud, not silent empty).
- Host app must propagate the user JWT to the supabase client (or move queries server-side and use the service-role key with appropriate care).
- Phase 5 ships a dev sign-in shim (`EXPO_PUBLIC_TEST_USER_EMAIL` / `_PASSWORD` → `signInWithPassword` at boot). Production auth (Apple + Google + Email) is a Phase 10 deliverable; Kakao OAuth is v1.5.

### e) Asset hosting

- R2 bucket `mymap-assets`, public-read, URL-versioned per asset type (`/sprites/v1/`, `/fonts/v1/`). Cache-Control `public, max-age=31536000, immutable`.
- v1 CORS is `["*"]` — scheduled to tighten before App Store submission (PROJECT_STATE.md "Phase 10 CORS tightening").
- Sprite atlas only carries 9 white-on-transparent glyphs today; anchor backgrounds + visited-glyph variants are deferred to Phase 7 (PROJECT_STATE.md "D10 marker-shape deviations").

---

## 6. Required environment + secrets

Host app must provision before any of this runs:

| Var | Surface | Purpose |
|---|---|---|
| `EXPO_PUBLIC_MAPBOX_TOKEN` | Public (bundled) | Tile fetch token; rotate-able, geofence-able |
| `EXPO_PUBLIC_KAKAO_REST_API_KEY` | Public (bundled) | Kakao Local API; quota is per-app, not per-user |
| `EXPO_PUBLIC_SUPABASE_URL` | Public | Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public | Anon JWT signing key |
| `MAPBOX_DOWNLOADS_TOKEN` | **Build-time only** — must NOT be `EXPO_PUBLIC_*` | `@rnmapbox/maps` SDK download from Mapbox Maven; bridged to `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` in `app.config.ts` |
| `EXPO_PUBLIC_TEST_USER_EMAIL` / `_PASSWORD` | Phase 5 only | Dev sign-in; remove once auth UI ships |

Plus:

- One Supabase project, both migrations applied, `og-resolver` Edge Function deployed
- One R2 bucket (or equivalent) hosting `/sprites/v{N}/` + `/fonts/v{N}/`
- A Mapbox account (free tier covers up to 50k MAU)
- A Kakao Developers account (free tier 100k req/day)

For iOS distribution: Apple Developer Program ($99/yr) at TestFlight time; for Android: Google Play Developer ($25 one-time).

---

## 7. Known constraints + landmines

Items the host app's plan must respect. One-line summaries; authoritative entries live in PROJECT_STATE.md.

- **GeoJSON coords are `[lng, lat]`** — codified in `savedPlaceToGeoJSONFeature` so the inversion bug can't recur.
- **Brand color `#2D2A6B` (light) / `#6B68C8` (dark) is reserved** for user pins + primary CTAs only. Never on labels, never on the base map. (CLAUDE.md locked principle.)
- **Korean labels everywhere on the map** via `["coalesce", ["get", "name:ko"], ["get", "name"]]`. Pretendard-only typography (Regular/Medium/Bold).
- **Mapbox v8 schema mismatch** with the original spec — Path A patch in spec/style-{light,dark}.json renders subway as single grey at z13+ (no per-line color, no transfer differentiation). Resolved post-PMF via MapLibre + MapTiler migration.
- **Style JSONs require app full kill+relaunch to re-parse** — `@rnmapbox/maps` caches `styleJSON` on prop receive; Metro hot-reload does not invalidate.
- **Free Supabase project auto-pauses after 7 days idle** — manual unpause from dashboard. Upgrade to Pro at production launch.
- **`balanced-match` override pinned** in `package.json` `pnpm.overrides` — required until ESLint and `@react-native/codegen` both move off `brace-expansion@1`. See PROJECT_STATE for the audit recipe.
- **Windows host quirks**: fontnik PBF rebuild requires Docker (no Windows prebuilt binary); Android emulator GPU on Windows fails Mapbox text shaders (real device works fine); `JAVA_HOME` must be exported per bash session.
- **Mapbox `MbxLogo` warning is a license-compliance signal**, not console noise — TOS audit item before first TestFlight upload.
- **`spec/` and `CLAUDE.md` require explicit user approval** to modify. They are decision artifacts, not code.

---

For deeper context: `CLAUDE.md` (project instructions) → `DESIGN.md` (locked decisions D1-D11) → `PROJECT_STATE.md` (current phase, cross-phase issues) → `phases/CURRENT_PHASE.md`.
