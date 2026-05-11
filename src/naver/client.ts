// Naver Open API Local Search client (Phase 5, per DESIGN.md D5b).
//
// Single endpoint used in v1:
// - /v1/search/local.json: keyword search. Feeds the manual-resolve
//   search list AND the auto-resolve top-result picker (after we
//   extract a place title from OG metadata via the og-resolver Edge
//   Function).
//
// What Kakao Local API has that Naver Open API does NOT:
// - Reverse geocoding (coord → address). Phase 6 anchors will need
//   this — when we get there, evaluate Naver NCP Geocoding (requires
//   biz reg, so probably not), OSM Nominatim, or skip server-side
//   reverse-geocoding entirely (use jibun address from search at
//   save time, no per-pin geocode lookup).
// - Stable per-place id. v1 SavedPlace.id is our Supabase uuid, so
//   we don't need external id today. If a future feature needs
//   dedup-by-provider-id, synthesize: hash(name + jibun_address).
// - distance from query center. Not used today.
// - phone number. Naver returns empty string ("값을 반환하지 않는
//   요소. 하위 호환성을 유지하기 위해 있는 요소"). Phase 8 popover
//   defers cleanly.
// - 15 results / query. Naver max is 5 (display ≤ 5, start ≤ 1).
//
// What's in the response and how we convert it:
// - mapx, mapy: WGS84 × 10⁷ integer (string). lng = mapx / 1e7,
//   lat = mapy / 1e7. Verified empirically 2026-05-07 against real
//   query "어니언 성수" → 127.0581051, 37.5446909 (성수동 정확
//   매칭). The Naver doc has a stale 2016 KATECH sample alongside
//   the WGS84 text — trust the empirical evidence + doc text.
// - title: contains <b>matched</b> tags. Strip with a regex before
//   showing to the user.
// - address: jibun-style 지번 주소.
// - roadAddress: 도로명 주소.
// - category: ">"-separated, no spaces around ">", e.g.
//   "음식점>카페,디저트".
// - telephone: ALWAYS empty string by API design.
// - link: business homepage URL, or empty. Different semantic from
//   Kakao's place_url (which links to Kakao Map's place page).
//
// API key surface: EXPO_PUBLIC_NAVER_CLIENT_ID + _CLIENT_SECRET are
// bundled into the JS blob → readable by anyone who unzips the
// .apk / .ipa. Acceptable for v1 (Naver quota is per-app, 25k/day;
// abuse caps the dev's own quota). Phase 10 should move to an Edge
// Function proxy if the v1 public-secret surface becomes a concern.
// Same v1 trade-off the Kakao client was making.
//
// Result<T> tagged union mirrors src/places/repo.ts so callers can
// branch on `.error` without try/catch. Function exports are named
// `naver*` (distinct from kakao's `kakao*`) so the SaveModal import
// swap during D5b ↔ D5 migration is grep-able.

import type { KakaoPlaceResult } from '../../spec/data-shapes';
import { resolveOgMetadata } from '../places/repo';

const NAVER_BASE = 'https://openapi.naver.com/v1/search';
const CLIENT_ID = process.env.EXPO_PUBLIC_NAVER_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.EXPO_PUBLIC_NAVER_CLIENT_SECRET ?? '';

if (!CLIENT_ID || !CLIENT_SECRET) {
  // Soft-warn at import — same pattern as Kakao client. Phase 5 dev
  // can boot the map view + share-intent wiring without these set;
  // they only matter when the modal makes a search call. Throws at
  // first network call below, surfaces in the SaveModal error banner.
  console.warn(
    '[naver] EXPO_PUBLIC_NAVER_CLIENT_ID or _CLIENT_SECRET not set. ' +
      'Naver search will fail until both are set in .env. See .env.example.',
  );
}

export type Result<T, E = Error> = { data: T; error: null } | { data: null; error: E };

function naverHeaders(): HeadersInit {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      'EXPO_PUBLIC_NAVER_CLIENT_ID or EXPO_PUBLIC_NAVER_CLIENT_SECRET is not set in .env',
    );
  }
  return {
    'X-Naver-Client-Id': CLIENT_ID,
    'X-Naver-Client-Secret': CLIENT_SECRET,
    Accept: 'application/json',
  };
}

// ---- /v1/search/local.json -----------------------------------------------

interface NaverSearchApiItem {
  title: string; // contains <b>matched</b> tags
  link: string; // business homepage URL or ""
  category: string; // e.g. "음식점>카페,디저트"
  description: string;
  telephone: string; // ALWAYS "" by API design
  address: string; // jibun
  roadAddress: string; // 도로명
  mapx: string; // WGS84 longitude × 10⁷, as integer string
  mapy: string; // WGS84 latitude × 10⁷, as integer string
}

interface NaverSearchApiResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverSearchApiItem[];
}

export interface NaverSearchOpts {
  // Naver Open API Local Search has no x/y/radius location bias.
  // Kept here for callsite parity with Kakao client's KakaoSearchOpts
  // so Phase 6 anchors can pass them through harmlessly. They are
  // silently ignored against this provider.
  x?: number;
  y?: number;
  radius?: number;
  // Maps to Naver's `display` param. Clamped to [1, 5]. Default 5.
  size?: number;
  // Naver's sort: "random" (default, accuracy desc) or "comment"
  // (review count desc). Default unchanged from Naver.
  sort?: 'random' | 'comment';
}

// Strip HTML <b>/</b> tags Naver wraps around the matched substring
// in the `title` field. Defensive: also handle the rare <B>/</B>
// uppercase variant if Naver ever emits it.
function stripBoldTags(s: string): string {
  return s.replace(/<\/?b>/gi, '');
}

// Korea bounding box sanity check. If WGS84 conversion of mapx/mapy
// lands outside Korea, fail fast — that means Naver changed format
// (e.g. reverted to KATECH) and the client needs a doc + fix, not a
// silent bad pin in Antarctica.
function inKorea(lng: number, lat: number): boolean {
  return lng >= 124 && lng <= 132 && lat >= 33 && lat <= 39;
}

export async function naverSearchByKeyword(
  query: string,
  opts: NaverSearchOpts = {},
): Promise<Result<KakaoPlaceResult[]>> {
  const trimmed = query.trim();
  if (!trimmed) {
    return { data: [], error: null };
  }
  const display = Math.min(Math.max(opts.size ?? 5, 1), 5);
  const params = new URLSearchParams({
    query: trimmed,
    display: String(display),
    sort: opts.sort ?? 'random',
  });

  let res: Response;
  try {
    res = await fetch(`${NAVER_BASE}/local.json?${params.toString()}`, {
      headers: naverHeaders(),
    });
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
  if (!res.ok) {
    return { data: null, error: new Error(`Naver search HTTP ${res.status}`) };
  }
  const json = (await res.json()) as NaverSearchApiResponse;

  // Map Naver's item shape to the spec's KakaoPlaceResult, applying:
  // - <b> tag strip on title
  // - mapx/mapy WGS84×10⁷ integer → decimal string (matches Kakao's
  //   string-typed x/y on the canonical KakaoPlaceResult)
  // - Korea-bbox sanity skip: items outside Korea are dropped (defensive
  //   against silent Naver format regression; logged for diagnostic).
  // - Synthetic id since Naver returns no stable place_id:
  //   `naver:<address>` is stable enough for v1 (used only for React
  //   list keys in SaveModal; SavedPlace.id is our Supabase uuid).
  // - roadAddress empty string → null, matching the kakao client's
  //   coercion for Phase 8 popover branch-cleanly behavior.
  const docs: KakaoPlaceResult[] = [];
  // Naver can return multiple results at the same address (single building
  // hosting multiple businesses) → naive `naver:<address>` synthetic id
  // collided in SaveModal's FlatList keyExtractor. Suffix with response
  // index for guaranteed uniqueness within a single search call. SavedPlace.id
  // is still our Supabase uuid; this id is FlatList-key-only.
  let idx = 0;
  for (const item of json.items) {
    const i = idx++;
    const lngNum = parseInt(item.mapx, 10) / 1e7;
    const latNum = parseInt(item.mapy, 10) / 1e7;
    if (!Number.isFinite(lngNum) || !Number.isFinite(latNum) || !inKorea(lngNum, latNum)) {
      console.warn(
        `[naver] dropped item with out-of-Korea coords: lng=${lngNum} lat=${latNum} title=${item.title}`,
      );
      continue;
    }
    const name = stripBoldTags(item.title);
    docs.push({
      id: `naver:${i}:${item.address || name}`,
      place_name: name,
      category_name: item.category,
      address_name: item.address,
      road_address_name: item.roadAddress === '' ? null : item.roadAddress,
      x: String(lngNum),
      y: String(latNum),
    });
  }
  return { data: docs, error: null };
}

// ---- Auto-resolve helper -------------------------------------------------
//
// Bridge for AUTO_RESOLVE strategy. Same shape as the Kakao version:
//   1. Edge Function fetches the URL, returns og_title.
//   2. We feed og_title into naverSearchByKeyword and pick the top result.
//
// Returns null in `data` (no error) when:
// - OG fetch failed → no title to query with
// - OG status is GATED (Instagram logged-out shell) → caller should
//   fall through to MANUAL_RESOLVE
// - Naver keyword search returned zero results

export async function resolvePlaceFromUrl(url: string): Promise<Result<KakaoPlaceResult | null>> {
  const og = await resolveOgMetadata(url);
  if (og.error || !og.data) {
    return { data: null, error: null }; // soft fail → manual fallback
  }
  if (og.data.og_fetch_status !== 'OK' || !og.data.og_title) {
    return { data: null, error: null };
  }
  const search = await naverSearchByKeyword(og.data.og_title);
  if (search.error) {
    return { data: null, error: search.error };
  }
  return { data: search.data[0] ?? null, error: null };
}
