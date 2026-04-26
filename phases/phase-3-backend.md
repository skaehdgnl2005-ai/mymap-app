# Phase 3: Backend Foundation

**Detail level:** Medium (expand at kickoff if you want full detail)
**Estimated duration:** 3-5 working days

## Project context

Set up the backend that stores SavedPlace records, authenticates users,
and exposes the OG metadata fetcher Edge Function. Schema in
`spec/data-shapes.ts` is provider-agnostic; Phase 3 commits to a
specific provider.

Recommended: **Supabase** (Postgres + Auth + Edge Functions in one
stack, free tier covers v1, RLS provides row-level security out of
box). Alternative: Firestore (mature but Google-coupled, no SQL).

Backend is the dependency for both Phase 5 (save flow needs to write
SavedPlace) and Phase 6 (onboarding needs auth). Lock the provider
decision here, do NOT defer.

## Locked decisions referenced

- DESIGN.md § D6 Data Model: 15-field SavedPlace schema
- `spec/data-shapes.ts`: TypeScript types — port to SQL DDL with same
  field names + types
- DESIGN.md § Open Questions Q1, Q2: backend + auth provider TBD
- CLAUDE.md § Reference docs: spec/data-shapes.ts is the schema source

## Prerequisites from previous phases

- Phase 1 complete: project scaffolded, `@supabase/supabase-js`
  installed
- Phase 2 in progress or complete (parallelizable — Phase 3 doesn't
  depend on asset hosting)

## This phase's goal

A working backend with:
- `saved_places` table with the full 15-field schema, RLS enabled
- Auth flow (Apple Sign In + Google Sign In; KakaoTalk login optional)
- OG metadata fetcher Edge Function (resolves a URL → `{ title, image
  _url, description, og_fetch_status }`)
- Test user creatable + can save + retrieve places

## Concrete tasks

1. **Lock backend provider** in PROJECT_STATE.md → Open decisions →
   Resolved. Default: Supabase.

2. **Provision Supabase project** at `supabase.com/dashboard`. Note
   project URL + anon key into `.env`.

3. **Translate schema** from `spec/data-shapes.ts` to SQL DDL:
   ```sql
   CREATE TABLE saved_places (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     lat DOUBLE PRECISION NOT NULL,
     lng DOUBLE PRECISION NOT NULL,
     category TEXT NOT NULL CHECK (category IN ('CAFE','RESTAURANT','BAR','SHOP','LANDMARK','HOME','SCHOOL','WORK','OTHER')),
     source_url TEXT,
     og_title TEXT, og_image_url TEXT, og_description TEXT,
     og_fetched_at TIMESTAMPTZ, og_fetch_status TEXT,
     note TEXT,
     visited BOOLEAN NOT NULL DEFAULT false,
     color_tag TEXT NOT NULL DEFAULT 'NONE' CHECK (color_tag IN ('NONE','RED','ORANGE','YELLOW','GREEN','BLUE','PURPLE')),
     address TEXT, region TEXT,
     saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     visited_at TIMESTAMPTZ
   );
   CREATE INDEX saved_places_user_idx ON saved_places(user_id);
   CREATE INDEX saved_places_user_region_idx ON saved_places(user_id, region);
   ```

4. **Enable RLS** with policy: users can only see/modify their own
   places.
   ```sql
   ALTER TABLE saved_places ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "users see own places" ON saved_places
     FOR ALL USING (auth.uid() = user_id);
   ```

5. **Configure auth providers** in Supabase dashboard:
   - Apple Sign In (required for App Store)
   - Google Sign In (Android)
   - Email/password (fallback)
   - KakaoTalk (optional v1; matches Korean Gen Z habit but adds
     Kakao SDK dependency — decide based on team capacity)

6. **Write OG fetcher Edge Function** at
   `supabase/functions/og-resolver/index.ts`:
   - Input: `{ url: string }`
   - Output: `{ title, image_url, description, og_fetch_status }`
   - Implementation: fetch the URL, parse OG meta tags, handle
     Instagram gating (return `status: 'GATED'` if Instagram returns
     no useful OG)
   - Timeout: 4 seconds max (don't block the save UX)
   - Cache: respect `og_fetched_at` if recent (<30 days)

7. **Write Supabase client wrapper** in `src/supabase.ts` with type-
   safe wrappers around `from('saved_places').*` operations. Reference
   `spec/data-shapes.ts` types — never duplicate them.

8. **Write `src/places/repo.ts`** with `savePlace()`, `getPlaces()`,
   `updatePlace()`, `deletePlace()` functions. Use the GeoJSON helpers
   from `spec/data-shapes.ts` to convert between SavedPlace and
   GeoJSON Feature.

9. **Test end-to-end** with a hardcoded test user:
   - Create user via auth API
   - Save 3 places via repo functions
   - Retrieve them
   - Verify RLS by querying with a different user_id (should return 0)

10. **Document env vars** added to `.env`:
    `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Verification

- [ ] `saved_places` table exists with 15 columns matching schema
- [ ] RLS policy verified by attempting cross-user read (should fail)
- [ ] At least 2 auth providers configured (Apple + Google or
      Apple + Email)
- [ ] OG fetcher returns valid response for test URLs:
      - Naver Place URL → returns title + image_url
      - Instagram URL → returns `og_fetch_status: 'GATED'` if no public
        OG, or `OK` if available
      - Random URL → returns best-effort or `og_fetch_status: 'FAILED'`
- [ ] `pnpm typecheck` passes after adding Supabase wrappers

## Anti-patterns

- Do NOT skip RLS — without it, any user can read all SavedPlace
  records of all users (catastrophic privacy bug)
- Do NOT hard-code Supabase URL/keys in source — use `.env` per Phase 1
- Do NOT block the save UX on OG fetch — async + cache, never sync
- Do NOT store user passwords in your DB if using Supabase Auth — auth
  is handled by Supabase's `auth.users` table, separate from your
  app schema

## Handoff

When complete, update PROJECT_STATE.md with:
- Backend provider locked: Supabase (or alternative + reason)
- Supabase project URL (without anon key — that's in .env, not state)
- Auth providers configured
- Edge Function URL pattern
- Migration approach for v1.5 (`pg_dump` → restore on alternative
  provider if forced to migrate)

Then: `ln -sf phase-4-renderer.md phases/CURRENT_PHASE.md`

## Expansion hints

For full detail, focus on:
- Supabase project provisioning step-by-step
- Apple Sign In service ID + redirect URL setup (it's annoying)
- Google OAuth client setup for both iOS (with bundle ID) and Android
  (with SHA-1 cert fingerprint)
- KakaoTalk login JS SDK vs native SDK trade-off
- OG fetcher implementation with proper Instagram fallback handling
- Migration SQL for adding fields post-launch (alembic-style up/down
  migrations as `supabase/migrations/*.sql`)
