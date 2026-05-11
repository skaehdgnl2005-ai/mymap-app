// Phase 5 Step 7d verification.
//
// Standalone Naver Open API Local Search probe. Calls the same endpoint
// src/naver/client.ts uses, applies the same mapx/mapy WGS84×10⁷ → decimal
// conversion, the same <b> strip, and the same inKorea bbox sanity. Prints
// top-N items as plain text so visual verification doesn't have to round-trip
// through adb screencap (which hits the Claude Code Read tool 2000px limit
// per the Phase 5 cross-phase issue).
//
// Run: node scripts/test-phase5-naver.mjs
// Requires: .env has EXPO_PUBLIC_NAVER_CLIENT_ID and _CLIENT_SECRET.

import { readFileSync } from 'node:fs';

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

const CLIENT_ID = env.EXPO_PUBLIC_NAVER_CLIENT_ID;
const CLIENT_SECRET = env.EXPO_PUBLIC_NAVER_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing EXPO_PUBLIC_NAVER_CLIENT_ID or _CLIENT_SECRET in .env');
  process.exit(1);
}

const stripBold = (s) => s.replace(/<\/?b>/gi, '');
const inKorea = (lng, lat) =>
  Number.isFinite(lng) &&
  Number.isFinite(lat) &&
  lng >= 124 &&
  lng <= 132 &&
  lat >= 33 &&
  lat <= 39;

async function search(query) {
  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=random`;
  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': CLIENT_ID,
      'X-Naver-Client-Secret': CLIENT_SECRET,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    console.error(`HTTP ${res.status} ${res.statusText}`);
    console.error(await res.text());
    process.exit(1);
  }
  return res.json();
}

const QUERIES = [
  // 1. The empirical-evidence query from D5b (PROJECT_STATE Case #3).
  //    Re-running it here is the regression check.
  '어니언 성수',
  // 2. The user's actual Step 7d query — English, ambiguous, what the
  //    friend-demo might realistically type.
  'starbucks seongsu',
  // 3. Plain Korean cafe query, no district modifier — exercises the
  //    "name only" path Gen Z users likely use after seeing on Instagram.
  '블루보틀',
];

let totalItems = 0;
let totalDropped = 0;

for (const q of QUERIES) {
  console.log(`\n=== query: "${q}" ===`);
  const json = await search(q);
  console.log(`  total=${json.total} display=${json.display} returned=${json.items.length}`);

  let idx = 0;
  for (const item of json.items) {
    idx++;
    const lng = parseInt(item.mapx, 10) / 1e7;
    const lat = parseInt(item.mapy, 10) / 1e7;
    const ok = inKorea(lng, lat);
    const name = stripBold(item.title);
    const flag = ok ? 'OK' : 'OUT_OF_KOREA';
    console.log(`  [${idx}] ${flag} name="${name}"`);
    console.log(`       lng=${lng} lat=${lat} (raw mapx=${item.mapx} mapy=${item.mapy})`);
    console.log(`       category="${item.category}" address="${item.address}"`);
    totalItems++;
    if (!ok) totalDropped++;
  }
}

console.log(`\n=== summary ===`);
console.log(`  items=${totalItems} dropped_by_korea_filter=${totalDropped}`);
if (totalDropped > 0) {
  console.log(`  FAIL: at least one item failed Korea bbox sanity — Naver may have changed format`);
  process.exit(1);
} else if (totalItems === 0) {
  console.log(`  FAIL: zero items returned across all queries — credentials, quota, or network`);
  process.exit(1);
} else {
  console.log(`  PASS: all items pass Korea bbox sanity`);
}
