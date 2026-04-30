-- Phase 3 — initial schema
--
-- Schema source of truth: spec/data-shapes.ts (15-field SavedPlace).
-- See DESIGN.md § D6 for the data model decision.
--
-- When changing this file: also update spec/data-shapes.ts in the same commit.
-- The TS file is the canonical shape; this migration is the storage realization.

-- =============================================================================
-- saved_places — the canonical user-data table
-- =============================================================================

CREATE TABLE public.saved_places (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- core
  name            TEXT NOT NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  category        TEXT NOT NULL
                  CHECK (category IN ('CAFE','RESTAURANT','BAR','SHOP',
                                      'LANDMARK','HOME','SCHOOL','WORK','OTHER')),

  -- memory: source URL + OG cache (the "magic" per D6)
  source_url      TEXT,
  og_title        TEXT,
  og_image_url    TEXT,
  og_description  TEXT,
  og_fetched_at   TIMESTAMPTZ,
  og_fetch_status TEXT
                  CHECK (og_fetch_status IN ('OK','FAILED','GATED')),

  -- user state
  note            TEXT,
  visited         BOOLEAN NOT NULL DEFAULT false,
  color_tag       TEXT NOT NULL DEFAULT 'NONE'
                  CHECK (color_tag IN ('NONE','RED','ORANGE','YELLOW',
                                       'GREEN','BLUE','PURPLE')),

  -- location context (cached from Kakao reverse-geocode)
  address         TEXT,
  region          TEXT,

  -- timestamps
  saved_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  visited_at      TIMESTAMPTZ
);

-- Indexes (per Phase 3 doc):
--   - per-user list query is the dominant access pattern (every map load)
--   - (user_id, region) supports D8 dong-level filtering ("성수동 only")
CREATE INDEX saved_places_user_idx
  ON public.saved_places (user_id);

CREATE INDEX saved_places_user_region_idx
  ON public.saved_places (user_id, region);

-- =============================================================================
-- Row-Level Security — per-user data isolation
-- =============================================================================
-- DESIGN.md P2': the moat is user-data lock-in. Cross-user reads must fail at
-- the DB layer regardless of client trust. Two-layer defense:
--   1. RLS policy: authenticated callers see only auth.uid() = user_id rows.
--   2. REVOKE on anon: unauthenticated callers can't even reach the policy
--      check; PostgREST returns a permission error.

ALTER TABLE public.saved_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_places: own rows only"
  ON public.saved_places
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Belt-and-suspenders: deny anon at the GRANT layer too. Supabase's PostgREST
-- otherwise default-grants anon table privileges, which would fall back on the
-- absent-policy = empty-result behavior. REVOKE makes anon access fail loudly
-- (permission denied) instead of returning [].
REVOKE ALL ON public.saved_places FROM anon;

-- =============================================================================
-- Notes for future migrations
-- =============================================================================
-- - Adding columns: alter this table AND spec/data-shapes.ts in the same
--   commit. Keep src/types/database.ts in sync (it derives from data-shapes).
-- - PostGIS intentionally NOT enabled at v1: clients render all of a user's
--   places (small N) from a single SELECT; no server-side geo queries. Revisit
--   at Phase 4+ if the renderer needs viewport-bbox queries server-side.
-- - Photos table: deferred to v2 per D6 (adds 6-8 weeks for upload UX + CDN).
-- - visited_at is set by app logic, not a DB trigger, to keep the storage
--   layer transparent. Phase 7 (pin interactions) wires the toggle.
