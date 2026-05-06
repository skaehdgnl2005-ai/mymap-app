// URL classifier for save-flow routing.
//
// Two strategies per DESIGN.md § D7:
// - AUTO_RESOLVE: Naver/Kakao Place URLs carry a place identity we can
//   reach via Kakao Local API; the modal opens, resolves, prefills, the
//   user taps Save. ~5 sec total.
// - MANUAL_RESOLVE: Instagram/Threads/blog URLs don't carry a place
//   identity (or Instagram gates OG); the modal opens with a search
//   field, the user types ~10-15 sec, picks from Kakao keyword search.
//
// classifyUrl is pure — no fetch, no IO. Routing happens before any
// network call, so misclassification falls through to MANUAL_RESOLVE
// (the safe default).
//
// Test cases (verify against these in any future test infra):
//
//   m.place.naver.com/restaurant/12345678 → AUTO, naver_place, hint=12345678
//   m.place.naver.com/cafe/87654321/home   → AUTO, naver_place, hint=87654321
//   place.naver.com/place/99999            → AUTO, naver_place, hint=99999
//   place.map.kakao.com/12345678           → AUTO, kakao_place, hint=12345678
//   www.instagram.com/p/AbCdEf/            → MANUAL, instagram, hint=null
//   www.threads.net/@user/post/abc         → MANUAL, threads, hint=null
//   blog.naver.com/foo/bar                 → MANUAL, naver_blog, hint=null
//   foo.tistory.com/bar                    → MANUAL, tistory, hint=null
//   https://example.com/                   → MANUAL, other, hint=null
//   "not a url"                            → null
//   ""                                     → null

export type ResolveStrategy = 'AUTO_RESOLVE' | 'MANUAL_RESOLVE';

export type DomainKind =
  | 'kakao_place'
  | 'naver_place'
  | 'instagram'
  | 'threads'
  | 'naver_blog'
  | 'tistory'
  | 'other';

export interface ClassifiedUrl {
  raw: string;
  hostname: string;
  strategy: ResolveStrategy;
  domain_kind: DomainKind;
  // For AUTO_RESOLVE only: the provider's internal place id pulled from
  // the URL path. Useful as a stable cache key; not currently used as
  // a Kakao API input (Kakao has no "fetch by external id" endpoint —
  // we resolve by OG-title → keyword search instead, see kakao client).
  place_id_hint: string | null;
}

interface HostnameRule {
  match: RegExp;
  kind: DomainKind;
  strategy: ResolveStrategy;
}

const HOSTNAME_RULES: readonly HostnameRule[] = [
  { match: /^place\.map\.kakao\.com$/i, kind: 'kakao_place', strategy: 'AUTO_RESOLVE' },
  { match: /^m\.place\.naver\.com$/i, kind: 'naver_place', strategy: 'AUTO_RESOLVE' },
  { match: /^place\.naver\.com$/i, kind: 'naver_place', strategy: 'AUTO_RESOLVE' },
  { match: /^(www\.)?instagram\.com$/i, kind: 'instagram', strategy: 'MANUAL_RESOLVE' },
  { match: /^(www\.)?threads\.net$/i, kind: 'threads', strategy: 'MANUAL_RESOLVE' },
  { match: /^([\w-]+\.)?blog\.naver\.com$/i, kind: 'naver_blog', strategy: 'MANUAL_RESOLVE' },
  { match: /\.tistory\.com$/i, kind: 'tistory', strategy: 'MANUAL_RESOLVE' },
];

export function classifyUrl(raw: string): ClassifiedUrl | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const hostname = url.hostname.toLowerCase();
  const rule = HOSTNAME_RULES.find((r) => r.match.test(hostname));
  const kind: DomainKind = rule?.kind ?? 'other';

  return {
    raw: trimmed,
    hostname,
    strategy: rule?.strategy ?? 'MANUAL_RESOLVE',
    domain_kind: kind,
    place_id_hint: extractPlaceIdHint(url, kind),
  };
}

function extractPlaceIdHint(url: URL, kind: DomainKind): string | null {
  if (kind === 'kakao_place') {
    // place.map.kakao.com/12345678(/anything)
    const m = url.pathname.match(/^\/(\d+)/);
    return m?.[1] ?? null;
  }
  if (kind === 'naver_place') {
    // m.place.naver.com/{restaurant|cafe|place|attraction|hotel}/12345678/...
    const m = url.pathname.match(/\/(?:restaurant|cafe|place|attraction|hotel)\/(\d+)/);
    return m?.[1] ?? null;
  }
  return null;
}
