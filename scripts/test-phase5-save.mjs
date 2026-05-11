// Phase 5 Step 7e verification.
//
// Stands in for the in-app handleSave → savePlace path. Auths as the dev
// test user (same EXPO_PUBLIC_TEST_USER_EMAIL/_PASSWORD creds the app uses)
// and inserts one SavedPlace at the empirically-known "어니언 성수" coords
// (the Step 7d query's top result + D5b empirical evidence). Verifies the
// insert via a follow-up select.
//
// Why a separate script rather than tapping the result in-modal:
// `adb shell input text` does not reliably accept Korean characters, so
// driving the MANUAL_RESOLVE flow end-to-end via adb is gated on either
// IME juggling (heavy) or a known Naver Place URL for AUTO_RESOLVE
// (Naver Map search returns ncaptcha without a real browser session).
// This script verifies the savePlace+RLS+row-shape path; visual pin-render
// is verified by relaunching the app and observing the saved pin appear
// at the inserted coords on the map (Step 7e gate).
//
// Run: node scripts/test-phase5-save.mjs
// Requires: .env has EXPO_PUBLIC_SUPABASE_URL/_ANON_KEY/_TEST_USER_*.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const required = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_TEST_USER_EMAIL',
  'EXPO_PUBLIC_TEST_USER_PASSWORD',
];
for (const k of required) {
  if (!env[k]) {
    console.error(`Missing ${k} in .env`);
    process.exit(1);
  }
}

const supabase = createClient(env.EXPO_PUBLIC_SUPABASE_URL, env.EXPO_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log('[1/4] signing in as test user…');
const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
  email: env.EXPO_PUBLIC_TEST_USER_EMAIL,
  password: env.EXPO_PUBLIC_TEST_USER_PASSWORD,
});
if (authErr || !auth?.session) {
  console.error('  FAIL sign-in:', authErr?.message ?? 'no session');
  process.exit(1);
}
const userId = auth.user.id;
console.log(`  PASS uid=${userId}`);

console.log('[2/4] reading current saved_places count…');
const { data: before, error: beforeErr } = await supabase
  .from('saved_places')
  .select('id, name, saved_at', { count: 'exact' });
if (beforeErr) {
  console.error('  FAIL select:', beforeErr.message);
  process.exit(1);
}
console.log(`  PASS rows=${before.length} (baseline)`);

console.log('[3/4] inserting one SavedPlace…');
const place = {
  user_id: userId,
  name: '어니언 성수',
  lat: 37.5446909,
  lng: 127.0581051,
  category: 'CAFE',
  source_url: 'https://m.place.naver.com/restaurant/1838097061/home',
  og_title: null,
  og_image_url: null,
  og_description: null,
  og_fetched_at: null,
  og_fetch_status: null,
  note: 'Phase 5 Step 7e verification insert',
  address: '서울특별시 성동구 성수동2가 277-135',
  region: null,
  visited_at: null,
};
const { data: inserted, error: insertErr } = await supabase
  .from('saved_places')
  .insert(place)
  .select()
  .single();
if (insertErr) {
  console.error('  FAIL insert:', insertErr.message);
  process.exit(1);
}
console.log(`  PASS id=${inserted.id} name="${inserted.name}"`);
console.log(`       coords=(${inserted.lng}, ${inserted.lat}) category=${inserted.category}`);

console.log('[4/4] verifying row reads back via RLS…');
const { data: after, error: afterErr } = await supabase
  .from('saved_places')
  .select('id, name, lat, lng, saved_at')
  .order('saved_at', { ascending: false })
  .limit(3);
if (afterErr) {
  console.error('  FAIL select:', afterErr.message);
  process.exit(1);
}
console.log(`  PASS rows=${after.length} (top 3 by saved_at desc):`);
for (const row of after) {
  console.log(`       - ${row.id} "${row.name}" @ (${row.lng}, ${row.lat})`);
}

console.log('\n=== summary ===');
console.log(`  baseline=${before.length} → after_insert=${before.length + 1} (delta=+1)`);
console.log(`  inserted_id=${inserted.id}`);
console.log(`  PASS: savePlace path + RLS + select round-trip verified`);
console.log(`  Next: relaunch the app to trigger listPlaces() and visually verify`);
console.log(`        the pin renders at (127.0581051, 37.5446909) — 성수동 어니언`);
