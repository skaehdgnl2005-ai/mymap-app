// Phase 3 E2E verification.
//
// Boots from the local Supabase stack (assumes `supabase start` is running).
// Creates two test users, inserts places as user A, then verifies:
//   1. RLS isolation — user B sees zero of A's rows
//   2. Anon access — denied (REVOKE) or empty
//   3. OG resolver — returns valid status for Naver / Instagram / example.com
//   4. SSRF guard  — 127.0.0.1 rejected before fetch
//
// Run after `supabase start` and `pnpm db:gen-types` succeed.

import { createClient } from '@supabase/supabase-js';

const URL_BASE = 'http://127.0.0.1:54321';
// Keys from `supabase status`; also stable defaults across local boots.
const PUBLISHABLE = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const SECRET = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz';

const admin = createClient(URL_BASE, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let pass = 0;
let fail = 0;
function report(name, ok, detail) {
  const icon = ok ? 'PASS' : 'FAIL';
  const tail = detail ? ` — ${detail}` : '';
  console.log(`[${icon}] ${name}${tail}`);
  if (ok) pass++;
  else fail++;
}

async function deleteTestUsers() {
  const { data } = await admin.auth.admin.listUsers();
  for (const u of data?.users ?? []) {
    if (u.email?.endsWith('@phase3.local')) {
      await admin.auth.admin.deleteUser(u.id);
    }
  }
}

async function main() {
  await deleteTestUsers();

  // ---- Create users ------------------------------------------------------
  const { data: createA, error: createAErr } = await admin.auth.admin.createUser({
    email: 'testA@phase3.local',
    password: 'phase3-rls-test-pw-A',
    email_confirm: true,
  });
  report('Create user A', !createAErr && !!createA?.user, createAErr?.message);
  if (!createA?.user) return;

  const { data: createB, error: createBErr } = await admin.auth.admin.createUser({
    email: 'testB@phase3.local',
    password: 'phase3-rls-test-pw-B',
    email_confirm: true,
  });
  report('Create user B', !createBErr && !!createB?.user, createBErr?.message);
  if (!createB?.user) return;

  const userAId = createA.user.id;

  // ---- Sign in as user A -------------------------------------------------
  const clientA = createClient(URL_BASE, PUBLISHABLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInAErr } = await clientA.auth.signInWithPassword({
    email: 'testA@phase3.local',
    password: 'phase3-rls-test-pw-A',
  });
  report('Sign in user A', !signInAErr, signInAErr?.message);
  if (signInAErr) return;

  // ---- Insert 3 places as user A -----------------------------------------
  const places = [
    {
      user_id: userAId,
      name: '에이코프 성수',
      lat: 37.5447,
      lng: 127.0557,
      category: 'CAFE',
      region: '성수동',
    },
    {
      user_id: userAId,
      name: '망원 시장',
      lat: 37.5562,
      lng: 126.902,
      category: 'LANDMARK',
      region: '망원동',
    },
    { user_id: userAId, name: '집', lat: 37.54, lng: 127.07, category: 'HOME' },
  ];
  for (const p of places) {
    const { error } = await clientA.from('saved_places').insert(p);
    if (error) {
      report(`Insert "${p.name}"`, false, error.message);
      return;
    }
  }
  report('User A inserted 3 places', true);

  // ---- User A reads -> 3 rows --------------------------------------------
  const { data: aRows, error: aReadErr } = await clientA.from('saved_places').select('*');
  report(
    'User A reads own rows (count = 3)',
    !aReadErr && aRows?.length === 3,
    aReadErr?.message ?? `count=${aRows?.length}`,
  );

  // ---- User B reads -> 0 rows (RLS isolation) ----------------------------
  const clientB = createClient(URL_BASE, PUBLISHABLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInBErr } = await clientB.auth.signInWithPassword({
    email: 'testB@phase3.local',
    password: 'phase3-rls-test-pw-B',
  });
  if (signInBErr) {
    report('Sign in user B', false, signInBErr.message);
    return;
  }
  const { data: bRows, error: bReadErr } = await clientB.from('saved_places').select('*');
  report(
    "RLS isolation: user B sees 0 of A's rows",
    !bReadErr && bRows?.length === 0,
    bReadErr?.message ?? `count=${bRows?.length}`,
  );

  // ---- User B can't insert with A's user_id (RLS WITH CHECK) -------------
  const { error: bInsertErr } = await clientB.from('saved_places').insert({
    user_id: userAId,
    name: 'spoofed',
    lat: 0,
    lng: 0,
    category: 'OTHER',
  });
  report(
    "RLS WITH CHECK: user B cannot insert with A's user_id",
    !!bInsertErr,
    bInsertErr?.message ?? 'no error (BUG)',
  );

  // ---- Anon client -> denied or empty ------------------------------------
  const anon = createClient(URL_BASE, PUBLISHABLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: anonRows, error: anonErr } = await anon.from('saved_places').select('*');
  // REVOKE on anon makes PostgREST return a permission error; we accept either
  // an explicit error OR an empty rowset (RLS no-policy fallback) as PASS.
  const anonDenied = !!anonErr || (anonRows?.length ?? 0) === 0;
  report(
    'Anon client: denied or empty',
    anonDenied,
    anonErr ? `error: ${anonErr.message}` : `count=${anonRows?.length}`,
  );

  // ---- OG resolver smoke -------------------------------------------------
  const ogTests = [
    { url: 'https://www.naver.com', label: 'Naver landing' },
    { url: 'https://www.instagram.com/p/Cabc123fakepost/', label: 'Instagram (expect GATED)' },
    { url: 'https://example.com', label: 'example.com' },
  ];
  for (const { url, label } of ogTests) {
    const { data, error } = await clientA.functions.invoke('og-resolver', {
      body: { url },
    });
    if (error) {
      report(`OG resolver: ${label}`, false, error.message);
      continue;
    }
    const status = data?.og_fetch_status;
    const titleSnip = data?.og_title?.slice(0, 60) ?? 'null';
    report(
      `OG resolver: ${label}`,
      ['OK', 'FAILED', 'GATED'].includes(status),
      `status=${status}, title=${titleSnip}`,
    );
  }

  // ---- SSRF guard --------------------------------------------------------
  const { data: ssrfData, error: ssrfErr } = await clientA.functions.invoke('og-resolver', {
    body: { url: 'http://127.0.0.1:8080/admin' },
  });
  // Function returns 400 with { error: 'Unsafe or invalid url' }; supabase-js
  // surfaces non-2xx via { error } and may also include a body.
  const ssrfRejected = !!ssrfErr || (ssrfData && /unsafe|invalid/i.test(JSON.stringify(ssrfData)));
  report(
    'SSRF guard: 127.0.0.1 rejected',
    !!ssrfRejected,
    ssrfErr?.message ?? JSON.stringify(ssrfData),
  );

  // ---- Cleanup -----------------------------------------------------------
  await deleteTestUsers();

  console.log(`\n${pass} pass, ${fail} fail`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(2);
});
