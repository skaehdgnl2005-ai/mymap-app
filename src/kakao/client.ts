// ============================================================================
// ARCHIVED 2026-05-07 per DESIGN.md D5b. Kept in repo, not deleted.
// ============================================================================
//
// This client is the intended PRODUCTION POI provider per D5 (the
// original locked decision). It is currently NOT IMPORTED ANYWHERE —
// `src/save-flow/SaveModal.tsx` imports `src/naver/client.ts` instead.
//
// Why archived (not deleted): D5b is a transitional fallback forced by
// the Kakao Developer Console's 사업자 등록 (business registration)
// requirement to activate the 카카오맵 product. The founder cannot
// obtain biz-reg at v1. When biz-reg becomes viable (or someone with
// biz-reg onboards as the Kakao app admin), this file is the migration
// target back to D5:
//
//   1. Activate 카카오맵 product in Kakao Developer Console for the app.
//   2. Set EXPO_PUBLIC_KAKAO_REST_API_KEY in .env (key is already
//      issued; just needs the service to be turned on Kakao-side).
//   3. In src/save-flow/SaveModal.tsx, swap the import:
//        from '../naver/client'  →  from '../kakao/client'
//      and the function call:
//        naverSearchByKeyword → kakaoSearchByKeyword
//   4. Swap the attribution string back: "Powered by Naver" →
//      "Powered by Kakao".
//   5. Remove EXPO_PUBLIC_NAVER_CLIENT_ID/_SECRET from .env (optional —
//      harmless to leave).
//   6. Re-run smoke tests; the kakao client is otherwise unchanged
//      from when it was the active provider.
//
// While archived, this module is parsed by tsc (included by
// tsconfig.json) but never imported at runtime, so the import-time
// `console.warn` about missing REST_KEY never fires.
//
// Below this archive header, the original Phase 5 implementation
// comment + code is preserved verbatim — DO NOT MODIFY without
// re-evaluating D5b migration path.
//
// ============================================================================
// Original Phase 5 implementation comment:
// ============================================================================
//
// Kakao Local API client (Phase 5).
//
// Two endpoints used in v1:
// - search/keyword.json: feeds the manual-resolve search list AND the
//   auto-resolve top-result picker (after we extract a place title from
//   OG metadata via the og-resolver Edge Function).
// - geo/coord2address.json: reverse-geocode lng/lat → region (dong-level)
//   used to populate SavedPlace.region for cluster filtering. v1 callers
//   set address from kakao result directly; this is provided for future
//   use when adding a "drop pin on map" save path.
//
// API key surface: EXPO_PUBLIC_KAKAO_REST_API_KEY is bundled into the JS
// blob → readable by anyone who unzips the .apk / .ipa. Acceptable for
// v1 (Kakao quota is per-app not per-user; abuse caps the dev's own
// quota). Phase 10 should move to an Edge Function proxy if the v1
// public-key surface area becomes a concern (logged as a Phase-10
// hardening line item in PROJECT_STATE).
//
// Result<T> tagged union mirrors src/places/repo.ts so callers can
// branch on `.error` without try/catch.

import type { KakaoPlaceResult } from '../../spec/data-shapes';
import { resolveOgMetadata } from '../places/repo';

const KAKAO_BASE = 'https://dapi.kakao.com/v2/local';
const REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY ?? '';

if (!REST_KEY) {
  // Soft-warn instead of throwing at import time — Phase 5 dev environments
  // without the key set can still run map view + share-intent wiring; the
  // key only matters when the modal calls the API. Throws at first network
  // call below, which surfaces in the modal's error path with actionable
  // copy.
  console.warn(
    '[kakao] EXPO_PUBLIC_KAKAO_REST_API_KEY not set. ' +
      'Kakao search will fail until set in .env. See .env.example.',
  );
}

export type Result<T, E = Error> = { data: T; error: null } | { data: null; error: E };

function kakaoHeaders(): HeadersInit {
  if (!REST_KEY) {
    throw new Error('EXPO_PUBLIC_KAKAO_REST_API_KEY is not set in .env');
  }
  return {
    Authorization: `KakaoAK ${REST_KEY}`,
    Accept: 'application/json',
  };
}

// ---- /search/keyword.json -------------------------------------------------

interface KakaoSearchApiDoc {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code?: string;
  category_group_name?: string;
  phone?: string;
  address_name: string;
  road_address_name: string;
  x: string; // lng (string!)
  y: string; // lat (string!)
  place_url?: string;
  distance?: string;
}

interface KakaoSearchApiResponse {
  documents: KakaoSearchApiDoc[];
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
}

export interface KakaoSearchOpts {
  // Bias results toward this lng/lat with optional radius (meters, max 20000).
  // When the modal eventually knows the user's location (Phase 6+ anchors),
  // pass the HOME anchor's coords here so 성수동 cafe queries don't return
  // cafes nationwide.
  x?: number;
  y?: number;
  radius?: number;
  size?: number; // default 15, max 15
}

export async function kakaoSearchByKeyword(
  query: string,
  opts: KakaoSearchOpts = {},
): Promise<Result<KakaoPlaceResult[]>> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { data: [], error: null };
  }
  const params = new URLSearchParams({ query: trimmed, size: String(opts.size ?? 15) });
  if (opts.x != null) params.set('x', String(opts.x));
  if (opts.y != null) params.set('y', String(opts.y));
  if (opts.radius != null) params.set('radius', String(opts.radius));

  let res: Response;
  try {
    res = await fetch(`${KAKAO_BASE}/search/keyword.json?${params.toString()}`, {
      headers: kakaoHeaders(),
    });
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
  if (!res.ok) {
    return { data: null, error: new Error(`Kakao search HTTP ${res.status}`) };
  }
  const json = (await res.json()) as KakaoSearchApiResponse;
  // Narrow the wider API response to the spec's KakaoPlaceResult shape.
  // road_address_name is empty string ("") for some places — coerce to null
  // so the Phase 8 popover can render a "no road address" branch cleanly.
  const docs: KakaoPlaceResult[] = json.documents.map((d) => ({
    id: d.id,
    place_name: d.place_name,
    category_name: d.category_name,
    address_name: d.address_name,
    road_address_name: d.road_address_name === '' ? null : d.road_address_name,
    x: d.x,
    y: d.y,
  }));
  return { data: docs, error: null };
}

// ---- /geo/coord2address.json ---------------------------------------------

export interface ReverseGeocode {
  address: string; // jibun-style address_name
  region_3depth: string; // dong-level, e.g. "성수동" (X가 collapsed per D5 R3)
}

interface KakaoCoord2AddressDoc {
  address?: {
    address_name?: string;
    region_3depth_name?: string;
  };
  road_address?: {
    address_name?: string;
  };
}

export async function kakaoCoordToAddress(
  lng: number,
  lat: number,
): Promise<Result<ReverseGeocode | null>> {
  const params = new URLSearchParams({ x: String(lng), y: String(lat) });
  let res: Response;
  try {
    res = await fetch(`${KAKAO_BASE}/geo/coord2address.json?${params.toString()}`, {
      headers: kakaoHeaders(),
    });
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
  if (!res.ok) {
    return { data: null, error: new Error(`Kakao coord2address HTTP ${res.status}`) };
  }
  const json = (await res.json()) as { documents: KakaoCoord2AddressDoc[] };
  const doc = json.documents[0];
  if (!doc?.address) {
    return { data: null, error: null };
  }
  // D5 R3 lock: collapse 성수동1가 → 성수동 by stripping a trailing
  // single-or-multi-digit + "가" segment.
  const region3 = doc.address.region_3depth_name ?? '';
  const region_3depth = region3.replace(/\d+가$/, '');
  return {
    data: {
      address: doc.address.address_name ?? '',
      region_3depth,
    },
    error: null,
  };
}

// ---- Auto-resolve helper --------------------------------------------------
//
// Bridge for AUTO_RESOLVE strategy: Kakao Local API has no "fetch place
// by external (Naver) place_id" endpoint, so we go via OG metadata:
//   1. Edge Function fetches the URL, returns og_title.
//   2. We feed og_title into kakaoSearchByKeyword and pick the top result.
//
// This same path covers Kakao Place URLs too (the URL → og_title → keyword
// search round-trip is uniform). Slower than a direct id lookup would be
// but correct for both providers without per-provider scraping.
//
// Returns null in `data` (no error) when:
// - OG fetch failed → no title to query with
// - OG status is GATED (Instagram logged-out shell) → caller should
//   fall through to MANUAL_RESOLVE
// - Kakao keyword search returned zero results

export async function resolvePlaceFromUrl(url: string): Promise<Result<KakaoPlaceResult | null>> {
  const og = await resolveOgMetadata(url);
  if (og.error || !og.data) {
    return { data: null, error: null }; // soft fail → manual fallback
  }
  if (og.data.og_fetch_status !== 'OK' || !og.data.og_title) {
    return { data: null, error: null };
  }
  const search = await kakaoSearchByKeyword(og.data.og_title);
  if (search.error) {
    return { data: null, error: search.error };
  }
  return { data: search.data[0] ?? null, error: null };
}
