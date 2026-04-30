// Phase 3 — OG metadata resolver Edge Function.
//
// POST /functions/v1/og-resolver
// Body:    { url: string }
// Returns: { og_title, og_image_url, og_description, og_fetch_status }
//
// og_fetch_status:
//   "OK"     — at least one of title/image/description came back
//   "FAILED" — fetch errored, timed out, or HTML had no usable OG
//   "GATED"  — public Instagram pages return logged-out shells; mark so the
//             client can route through Kakao keyword search per DESIGN.md D7
//
// Auth: Supabase API gateway verifies the JWT before invocation (verify_jwt
// is true by default for Edge Functions). The user.id is derived from the JWT
// inside the rate-limit SQL function via auth.uid() — never from a request
// body field — to prevent rate-limit bypass via spoofed user_id.
//
// Caching is the CALLER's responsibility (the places repo checks
// og_fetched_at < 30 days before invoking us). This function is stateless on
// the OG cache itself, which keeps it testable and reusable.
//
// Spec refs: DESIGN.md D7, spec/data-shapes.ts OgFetchStatus.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.104.1';

const FETCH_TIMEOUT_MS = 4000;
const MAX_HTML_BYTES = 1_000_000;

const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, apikey',
  'access-control-allow-methods': 'POST, OPTIONS',
};

type OgFetchStatus = 'OK' | 'FAILED' | 'GATED';

interface OgResult {
  og_title: string | null;
  og_image_url: string | null;
  og_description: string | null;
  og_fetch_status: OgFetchStatus;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  });

// ---- URL safety (SSRF prevention) -----------------------------------------

function isSafePublicUrl(rawUrl: string): boolean {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  if (!host || host === 'localhost' || host === '0.0.0.0') return false;

  const v4 = host.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (v4) {
    const a = parseInt(v4[1]!, 10);
    const b = parseInt(v4[2]!, 10);
    if (a === 0) return false;
    if (a === 10) return false;
    if (a === 127) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
  }
  if (host.includes(':')) return false; // coarse IPv6 reject
  return true;
}

// ---- HTML / OG parsing ----------------------------------------------------

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x2F;/g, '/')
    .replace(/&amp;/g, '&');
}

function extractMeta(html: string, key: string, attr: 'property' | 'name'): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(
      `<meta[^>]*?\\b${attr}\\s*=\\s*["']${escaped}["'][^>]*?\\bcontent\\s*=\\s*["']([^"']*)["']`,
      'i',
    ),
    new RegExp(
      `<meta[^>]*?\\bcontent\\s*=\\s*["']([^"']*)["'][^>]*?\\b${attr}\\s*=\\s*["']${escaped}["']`,
      'i',
    ),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) return decodeEntities(m[1].trim()) || null;
  }
  return null;
}

function extractTitleTag(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m && m[1] ? decodeEntities(m[1].trim()) || null : null;
}

function extractOg(html: string): {
  title: string | null;
  image: string | null;
  desc: string | null;
} {
  return {
    title: extractMeta(html, 'og:title', 'property') ?? extractTitleTag(html),
    image: extractMeta(html, 'og:image', 'property'),
    desc:
      extractMeta(html, 'og:description', 'property') ?? extractMeta(html, 'description', 'name'),
  };
}

function isInstagramGated(
  rawUrl: string,
  og: { title: string | null; desc: string | null },
): boolean {
  if (!/^https?:\/\/(?:www\.)?instagram\.com\//i.test(rawUrl)) return false;
  if (!og.title || og.title === 'Instagram') return true;
  if (!og.desc) return true;
  if (/Login\s*•\s*Instagram/i.test(og.desc)) return true;
  return false;
}

// ---- Fetch with 4s timeout + 1MB cap --------------------------------------

async function fetchHtml(url: string): Promise<string | null> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: ac.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; MyMapBot/1.0; +https://mymap.app/bot)',
        accept: 'text/html,*/*;q=0.5',
      },
    });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = '';
    let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        bytes += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (bytes >= MAX_HTML_BYTES) {
          await reader.cancel();
          break;
        }
      }
    }
    return html;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ---- Handler --------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let url: string;
  try {
    const body = await req.json();
    if (typeof body?.url !== 'string') return json({ error: 'Missing url' }, 400);
    if (!isSafePublicUrl(body.url)) {
      return json({ error: 'Unsafe or invalid url' }, 400);
    }
    url = body.url;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { data: allowed, error: rlErr } = await userClient.rpc('check_og_rate_limit');
  if (rlErr) {
    return json({ error: 'rate-limit RPC failed', detail: rlErr.message }, 500);
  }
  if (allowed === false) {
    return json({ error: 'Rate limit exceeded (60/min)' }, 429);
  }

  const html = await fetchHtml(url);
  if (!html) {
    const result: OgResult = {
      og_title: null,
      og_image_url: null,
      og_description: null,
      og_fetch_status: 'FAILED',
    };
    return json(result);
  }

  const og = extractOg(html);
  const gated = isInstagramGated(url, { title: og.title, desc: og.desc });

  const status: OgFetchStatus = gated ? 'GATED' : og.title || og.image || og.desc ? 'OK' : 'FAILED';

  const result: OgResult = {
    og_title: og.title,
    og_image_url: og.image,
    og_description: og.desc,
    og_fetch_status: status,
  };
  return json(result);
});
