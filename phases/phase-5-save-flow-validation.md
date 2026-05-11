# Phase 5: Save-Flow MVP — VALIDATION GATE

**Detail level:** Full
**Estimated duration:** 5-7 working days
**Critical gate:** YES. Stop here. Test with the user (founder's friend)
before proceeding to Phase 6.

## Project context

This is THE validation phase. Every decision in DESIGN.md assumes the
save flow IS the product. If the save flow doesn't feel fast in real
use with a real user, the entire product premise is wrong and we need
to know NOW — before investing 6 more phases of work that build on top
of a flawed foundation.

The save flow is what happens when the user is on Instagram (or
Threads, or a Korean blog), sees a cafe, wants to remember it, and
gets it onto their personal map. The full design is in DESIGN.md § D7.

This phase implements the *minimum viable* save flow with Kakao Local
API auto-resolve for Naver/Kakao Place URLs, manual-resolve via Kakao
keyword search for Instagram/blog URLs, and a share-sheet entry point
on iOS + Android. It does NOT implement: full polish, OG metadata
caching (Phase 8 stub OK), pin detail popover, color tags, search
overlay, onboarding (use a hardcoded test user). Those are later
phases — and Phase 5 might invalidate them.

**Intentional sequencing:** the save flow ships before onboarding
(Phase 6) because validation is more important than onboarding. We'd
rather discover the save flow is wrong with a hardcoded user than
delay validation by 1-2 weeks building onboarding for a flow that
doesn't work.

## Locked decisions referenced

- DESIGN.md § D5 POI Provider: Kakao Local API only
- DESIGN.md § D6 Data Model: SavedPlace 15-field schema (use full
  schema from `spec/data-shapes.ts`, but OG fields can be null in v1
  Phase 5 — we'll backfill in Phase 8)
- DESIGN.md § D7 Save Flow Architecture: share-sheet primary for
  Naver/Kakao/blog URLs, clipboard primary for Instagram, smart
  resolve by URL type, OCR explicitly deferred to v2
- CLAUDE.md § Locked principles: Korean labels, brand color discipline

## Prerequisites from previous phases

- Phase 1 (Scaffolding) complete: project boots, RN + Expo + @rnmapbox/maps
  + Kakao SDK installed
- Phase 2 (Asset hosting) complete: sprite + Pretendard PBFs uploaded
  and referenced in `spec/style-light.json` / `spec/style-dark.json`
- Phase 3 (Backend foundation) complete: Supabase set up, schema
  matching `spec/data-shapes.ts` deployed, auth working enough that
  you can create a test user
- Phase 4 (Map renderer) complete: PersonalMap component renders mock
  pins from a hardcoded SavedPlace[]

If any prerequisites are not met, do NOT proceed. Phase 5's diagnostic
value depends on isolating "is the SAVE FLOW wrong" from "is some
upstream piece broken." A flaky map renderer or broken backend muddles
the validation result.

## This phase's goal

A working end-to-end save flow with these test paths working:

1. **Auto-resolve path:** User shares a Naver Place URL (e.g.,
   `m.place.naver.com/restaurant/12345678`) from any app to MyMap
   via the share sheet. The app opens, Kakao Local API resolves the
   place, the user sees a prefilled save card, taps Save, the place
   appears as a pin on the map within 5 seconds total.

2. **Manual-resolve path:** User shares an Instagram URL (e.g.,
   `www.instagram.com/p/AbCdEf/`) from Instagram via the share sheet
   (or pastes via clipboard auto-detect on `+` tap). The app opens
   with a search modal: search field empty, OG preview card at top
   (or "View on Instagram" fallback if Instagram gates OG). User
   types the place name (~10-15 sec), picks from Kakao keyword
   search results, taps Save. Place appears as a pin on the map.

3. **Both paths persist** to Supabase and reload correctly across
   app restarts.

4. **Map view** shows all saved places with the locked visual
   treatment from D9/D10 (circles for non-anchors, indigo brand
   color, halo correct).

What this phase explicitly DOES NOT include:
- OG metadata fetcher (stub — set og_fetch_status to null)
- Pin detail popover (Phase 8) — tap shows place name in a basic toast
- Color tags (Phase 7) — leave as 'NONE'
- Visited toggle (Phase 7) — leave as false
- Onboarding (Phase 6) — hardcode a test user_id
- Anchor pins (Phase 6) — empty for v1 Phase 5
- Search overlay (Phase 9) — manual-resolve modal is its own surface
- Polished error states (Phase 10) — basic toast on error is fine

## Concrete tasks

### 1. Install share-extension dependencies

`expo-share-intent` should be installed from Phase 1. Verify:

```bash
pnpm list expo-share-intent
```

If not, install:
```bash
pnpm add expo-share-intent
pnpm expo prebuild --no-install   # regenerate native projects
cd ios && pod install && cd ..
```

`expo-share-intent` handles both iOS ShareExtension and Android
ACTION_SEND under one API. Without it you'd be writing two different
native targets.

### 2. Configure share-extension in app.json

Edit `app.json`:

```json
{
  "expo": {
    "scheme": "mymap",
    "plugins": [
      [
        "expo-share-intent",
        {
          "iosActivationRules": {
            "NSExtensionActivationSupportsWebURLWithMaxCount": 1,
            "NSExtensionActivationSupportsText": true
          },
          "androidIntentFilters": ["text/plain"],
          "androidIntentFiltersData": [
            { "scheme": "https", "host": "m.place.naver.com" },
            { "scheme": "https", "host": "place.map.kakao.com" },
            { "scheme": "https", "host": "www.instagram.com" },
            { "scheme": "https", "host": "www.threads.net" }
          ]
        }
      ]
    ]
  }
}
```

Then regenerate native:
```bash
pnpm expo prebuild --no-install
cd ios && pod install && cd ..
```

The `iosActivationRules` tells iOS which share types the extension
accepts; `androidIntentFiltersData` whitelists specific hosts on
Android (Android allows more granular filtering than iOS).

### 3. Implement URL classifier

Create `src/save-flow/url-classifier.ts`:

```ts
export type ResolveStrategy = 'AUTO_RESOLVE' | 'MANUAL_RESOLVE';

export interface ClassifiedUrl {
  raw: string;
  hostname: string;
  strategy: ResolveStrategy;
  domain_kind: 'kakao_place' | 'naver_place' | 'instagram' | 'threads' | 'naver_blog' | 'tistory' | 'other';
  // For auto-resolve: extract place_id when possible
  place_id_hint: string | null;
}

const HOSTNAME_RULES: Array<{ match: RegExp; kind: ClassifiedUrl['domain_kind']; strategy: ResolveStrategy }> = [
  { match: /^place\.map\.kakao\.com$/i,    kind: 'kakao_place', strategy: 'AUTO_RESOLVE' },
  { match: /^m\.place\.naver\.com$/i,       kind: 'naver_place', strategy: 'AUTO_RESOLVE' },
  { match: /^place\.naver\.com$/i,          kind: 'naver_place', strategy: 'AUTO_RESOLVE' },
  { match: /^(www\.)?instagram\.com$/i,     kind: 'instagram',   strategy: 'MANUAL_RESOLVE' },
  { match: /^(www\.)?threads\.net$/i,       kind: 'threads',     strategy: 'MANUAL_RESOLVE' },
  { match: /\.blog\.naver\.com$|^blog\.naver\.com$/i, kind: 'naver_blog', strategy: 'MANUAL_RESOLVE' },
  { match: /\.tistory\.com$/i,              kind: 'tistory',     strategy: 'MANUAL_RESOLVE' },
];

export const classifyUrl = (raw: string): ClassifiedUrl | null => {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null; // not a URL
  }
  const hostname = url.hostname.toLowerCase();
  const rule = HOSTNAME_RULES.find((r) => r.match.test(hostname));

  return {
    raw,
    hostname,
    strategy: rule?.strategy ?? 'MANUAL_RESOLVE',
    domain_kind: rule?.kind ?? 'other',
    place_id_hint: extractPlaceIdHint(url, rule?.kind),
  };
};

const extractPlaceIdHint = (url: URL, kind: ClassifiedUrl['domain_kind'] | undefined): string | null => {
  if (kind === 'kakao_place') {
    // place.map.kakao.com/12345678
    const m = url.pathname.match(/\/(\d+)/);
    return m ? m[1] : null;
  }
  if (kind === 'naver_place') {
    // m.place.naver.com/restaurant/12345678/...
    const m = url.pathname.match(/\/(?:restaurant|cafe|place|attraction|hotel)\/(\d+)/);
    return m ? m[1] : null;
  }
  return null;
};
```

Add unit tests in `src/save-flow/url-classifier.test.ts` covering:
- Naver Place URL with restaurant prefix → AUTO_RESOLVE, place_id extracted
- Naver Place URL with cafe prefix → AUTO_RESOLVE
- Kakao Place URL → AUTO_RESOLVE, place_id extracted
- Instagram URL → MANUAL_RESOLVE, no place_id
- Threads URL → MANUAL_RESOLVE
- Naver blog URL → MANUAL_RESOLVE
- Random URL → MANUAL_RESOLVE, kind='other'
- Invalid string → null

### 4. Implement Kakao Local API client

Create `src/kakao/client.ts`:

```ts
const KAKAO_BASE = 'https://dapi.kakao.com/v2/local';
const REST_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY!;

const headers = {
  Authorization: `KakaoAK ${REST_KEY}`,
  'Content-Type': 'application/json',
};

export interface KakaoPlaceResult {
  id: string;
  place_name: string;
  category_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string; // lng (string!)
  y: string; // lat (string!)
  place_url: string;
  distance: string;
}

interface KakaoSearchResponse {
  documents: KakaoPlaceResult[];
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
}

export const kakaoSearchByKeyword = async (
  query: string,
  opts: { x?: number; y?: number; radius?: number } = {},
): Promise<KakaoPlaceResult[]> => {
  const params = new URLSearchParams({ query, size: '15' });
  if (opts.x != null) params.set('x', String(opts.x));
  if (opts.y != null) params.set('y', String(opts.y));
  if (opts.radius != null) params.set('radius', String(opts.radius));

  const res = await fetch(`${KAKAO_BASE}/search/keyword.json?${params}`, { headers });
  if (!res.ok) throw new Error(`Kakao search failed: ${res.status}`);
  const data = (await res.json()) as KakaoSearchResponse;
  return data.documents;
};

export const kakaoCoordToAddress = async (
  lng: number,
  lat: number,
): Promise<{ address: string; region_3depth: string } | null> => {
  const params = new URLSearchParams({ x: String(lng), y: String(lat) });
  const res = await fetch(`${KAKAO_BASE}/geo/coord2address.json?${params}`, { headers });
  if (!res.ok) return null;
  const data = await res.json();
  const doc = data.documents?.[0];
  if (!doc) return null;
  const region3 = doc.address?.region_3depth_name as string | undefined;
  // Strip trailing X가 to collapse 성수동1가 → 성수동 (D5 R3 lock)
  const region_3depth = region3?.replace(/\d+가$/, '') ?? '';
  return {
    address: doc.address?.address_name ?? '',
    region_3depth,
  };
};

// AUTO_RESOLVE for Naver/Kakao Place URLs:
// Kakao doesn't have a "fetch by external place_id" — for v1, we strategize:
// - Kakao Place URL: extract place_id, call kakaoSearchByCategory or fall back to keyword search
// - Naver Place URL: scrape or use a thin server-side resolver Edge Function (Phase 3 should provision one)
//
// For Phase 5 simplicity: when AUTO_RESOLVE detected, fetch the URL on the server
// (Edge Function), parse OG meta to extract place name, then run kakaoSearchByKeyword
// and pick the top result. This pattern handles both Naver and Kakao Place URLs uniformly.

export const resolvePlaceFromUrl = async (
  url: string,
): Promise<KakaoPlaceResult | null> => {
  // Phase 3 should have provisioned an Edge Function:
  //   /functions/v1/og-resolver?url=<encoded>
  // Returns: { title: string, image_url: string|null, ... }
  const supabase = require('../supabase').supabase;
  const { data, error } = await supabase.functions.invoke('og-resolver', {
    body: { url },
  });
  if (error || !data?.title) return null;

  // Use OG title as Kakao keyword search query
  const results = await kakaoSearchByKeyword(data.title);
  return results[0] ?? null;
};
```

### 5. Implement save-flow modal UI

Create `src/save-flow/SaveModal.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, FlatList, Pressable } from 'react-native';
import { ClassifiedUrl } from './url-classifier';
import { kakaoSearchByKeyword, resolvePlaceFromUrl, KakaoPlaceResult } from '../kakao/client';
import { savePlace } from '../places/repo';

interface Props {
  visible: boolean;
  url: ClassifiedUrl;
  onClose: () => void;
  onSaved: (placeId: string) => void;
}

export const SaveModal: React.FC<Props> = ({ visible, url, onClose, onSaved }) => {
  const [resolved, setResolved] = useState<KakaoPlaceResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<KakaoPlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AUTO_RESOLVE: try to resolve immediately on mount
  useEffect(() => {
    if (url.strategy !== 'AUTO_RESOLVE') return;
    setLoading(true);
    resolvePlaceFromUrl(url.raw)
      .then((r) => {
        if (r) setResolved(r);
        else setError('AUTO_RESOLVE failed; fall back to manual.');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [url]);

  // MANUAL_RESOLVE: live search as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      kakaoSearchByKeyword(searchQuery).then(setResults).catch(() => setResults([]));
    }, 300); // debounce
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const handleSave = async (place: KakaoPlaceResult) => {
    try {
      const id = await savePlace({
        name: place.place_name,
        lat: parseFloat(place.y),
        lng: parseFloat(place.x),
        source_url: url.raw,
        kakao_address: place.address_name,
        kakao_category: place.category_name,
      });
      onSaved(id);
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
          {url.strategy === 'AUTO_RESOLVE' ? '저장하기' : '이 장소의 이름을 입력해주세요'}
        </Text>

        {url.strategy === 'AUTO_RESOLVE' && resolved && (
          <Pressable style={{ padding: 12, backgroundColor: '#F5F4F0' }} onPress={() => handleSave(resolved)}>
            <Text style={{ fontSize: 16 }}>{resolved.place_name}</Text>
            <Text style={{ fontSize: 12, color: '#6B6B6B' }}>{resolved.address_name}</Text>
            <Text style={{ marginTop: 8, color: '#2D2A6B' }}>저장</Text>
          </Pressable>
        )}

        {url.strategy === 'MANUAL_RESOLVE' && (
          <>
            <View style={{ padding: 12, backgroundColor: '#F5F4F0', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: '#6B6B6B' }}>{url.raw}</Text>
              {/* OG preview card lives here in Phase 8 */}
            </View>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="이 장소의 이름을 입력해주세요"
              style={{ borderBottomWidth: 1, paddingVertical: 8 }}
            />
            <FlatList
              data={results}
              keyExtractor={(r) => r.id}
              renderItem={({ item }) => (
                <Pressable style={{ padding: 12 }} onPress={() => handleSave(item)}>
                  <Text style={{ fontSize: 16 }}>{item.place_name}</Text>
                  <Text style={{ fontSize: 12, color: '#6B6B6B' }}>{item.address_name}</Text>
                </Pressable>
              )}
              ListFooterComponent={
                <Text style={{ padding: 12, fontSize: 10, color: '#9A9A95' }}>
                  Powered by Kakao
                </Text>
              }
            />
          </>
        )}

        {error && <Text style={{ color: 'red' }}>{error}</Text>}
      </View>
    </Modal>
  );
};
```

This is intentionally bare-bones (no styling polish). Phase 8 makes it
look like Toss; Phase 5's job is just to make it work.

### 6. Wire up share-intent → SaveModal

In your root `App.tsx`:

```tsx
import { useShareIntent } from 'expo-share-intent';
import { classifyUrl } from './src/save-flow/url-classifier';
import { SaveModal } from './src/save-flow/SaveModal';
import { PersonalMap } from './spec/implementation';

export default function App() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);

  // Trigger save modal when share intent received
  const classifiedUrl = useMemo(() => {
    if (!hasShareIntent || !shareIntent.webUrl) return null;
    return classifyUrl(shareIntent.webUrl);
  }, [hasShareIntent, shareIntent]);

  return (
    <View style={{ flex: 1 }}>
      <PersonalMap savedPlaces={savedPlaces} />
      {classifiedUrl && (
        <SaveModal
          visible={true}
          url={classifiedUrl}
          onClose={resetShareIntent}
          onSaved={(id) => {
            // Reload saved places from Supabase
            loadSavedPlaces().then(setSavedPlaces);
            resetShareIntent();
          }}
        />
      )}
    </View>
  );
}
```

### 7. Add clipboard auto-detect on `+` tap

(For the Instagram primary path per D7.)

Add a floating `+` button to the map view:

```tsx
import * as Clipboard from 'expo-clipboard';

const handlePlusButton = async () => {
  const text = await Clipboard.getStringAsync();
  if (!text) return;
  const classified = classifyUrl(text);
  if (classified) {
    // Show save modal, like share-intent flow
    setManualClassifiedUrl(classified);
  } else {
    // Show empty Kakao search modal
    setShowEmptySearch(true);
  }
};
```

Note: iOS 14+ shows "Pasted from <app>" banner when reading clipboard.
Per D7 R1, this fires on `+` tap (user-initiated), NEVER on app
foreground. Verify behavior in iOS Simulator and a real iOS 16+ device.

### 8. Build and run on real iOS + Android devices

The save flow MUST be tested on real devices, not simulators only:

- iOS Simulator can show the share sheet UI but doesn't perfectly
  emulate share-extension lifecycle
- Android Emulator's share intent picker behavior differs from real
  devices in subtle ways

```bash
pnpm ios --device              # connect iPhone, run on real hardware
pnpm android --device          # connect Android, run on real hardware
```

### 9. Manual smoke test all paths before user testing

Before involving the friend, verify YOU can do each path:

1. Open Naver Map → search for any cafe → tap Share → MyMap appears
   in share sheet → tap → AUTO_RESOLVE flow → place saved → returns
   to map → pin visible
2. Open Instagram → tap Share on any post → MyMap appears → tap →
   MANUAL_RESOLVE modal appears → search a real cafe → tap result →
   saved → pin visible
3. Open Instagram → tap "..." → Copy Link → switch to MyMap → tap
   `+` → modal pre-populated with URL → flow continues
4. Naver Place auto-resolve picks the right place (not just the
   top of generic search)
5. Saved pins persist across app force-quit + relaunch

If any path fails, fix before validation testing.

## T-24h brand-lock gate

The friend demo is the first time the product is presented to a real
user under its identity. The app icon she sees and the share-sheet
entry she taps in 0.5 sec both hang on the brand name. Showing her
placeholder `mymap-app` contaminates the validation signal —
hesitation at the share-sheet picker would not be cleanly attributable
to *save-flow friction* (the thing we're validating) vs.
*unfamiliar app name* (a known confounder).

The brand-name decision is heavy enough to warrant its own
/office-hours session and is intentionally **NOT made inside Phase 5
implementation work** — the decision cascades into bundleIdentifier
(Trigger 4, IRREVERSIBLE), custom domain (Trigger 4), and marketing
surfaces, so it gets fully separated from save-flow code. This gate
is the synchronization point between the parallel brand track and the
implementation track.

### Gate condition (all must be true 24 hours before scheduled demo)

- [x] Brand name decision LOCKED in PROJECT_STATE.md → "Open
      decisions" → "App Store branded display name" entry — moved
      from PENDING to **LOCKED 2026-05-04: 자국** (English slug
      `jaguk`); pivot from `자리` candidate after KIPRIS 9류/42류
      block + App Store collision; full reasoning in /office-hours
      session 2026-05-04
- [x] `app.config.ts` `name` field updated 2026-05-04 to
      `name: '자국'` (line 15); `ios.bundleIdentifier` +
      `android.package` simultaneously updated to `com.jaguk.app`
      (Trigger 4, IRREVERSIBLE at first TestFlight / Play Internal
      upload — see PROJECT_STATE.md "Open decisions")
- [ ] Share-extension display name applied + verified on real device
      via the share sheet:
  - iOS: share-sheet entry reads the brand name (not the bundle slug)
  - Android: intent picker reads the brand name

  **DEFERRED to Track B (real device testing).** Track A
  (emulator) cannot exercise the iOS share sheet at all (no iOS
  emulator on Windows host) and the Android emulator's intent
  picker behavior diverges from real-device per the Phase 5
  cross-phase entry "Android share-sheet host-filter granularity."
  Verified 2026-05-11 that the in-app modal title renders `자국`
  correctly (`자국에 저장하기` headline) on the Android emulator —
  this is the strongest signal Track A can provide for brand-on-app
  rendering. Real-device share-sheet entry name verification gates
  with Track B's first real-device build.

- [ ] Task #9 smoke-test re-run (all 5 paths) on real device with
      rename applied — confirms no share-extension wiring regression
      from the rename + that the new display name is what actually
      surfaces in both platforms' picker

  **DEFERRED to Track B (real device testing).** Same reason as
  sub-cond 3: emulator-only verification is insufficient for this
  sub-condition's stated purpose. Track A's 2026-05-11 verification
  exercised paths 2 (clipboard → manual modal open via FAB) and 4
  (Naver Place URL share intent → AUTO_RESOLVE → save → DB persist
  → pin render) end-to-end on the Android emulator with the
  rename applied; no wiring regression observed. Real-device picker
  cosmetics + iOS-specific share extension activation gate with
  Track B.

- [x] `.env` boot-time verification: all three required vars present
      and the app actually authenticates against Supabase before the
      friend-demo. Required:
  - `EXPO_PUBLIC_NAVER_CLIENT_ID` + `EXPO_PUBLIC_NAVER_CLIENT_SECRET`
    (per D5b — was `EXPO_PUBLIC_KAKAO_REST_API_KEY` pre-D5b; both
    required because either-alone is non-functional)
  - `EXPO_PUBLIC_TEST_USER_EMAIL`
  - `EXPO_PUBLIC_TEST_USER_PASSWORD`
  - corresponding test-user account exists in Supabase dashboard
    with the same email + password (otherwise `auth.signInWithPassword`
    fails silently → app shows the yellow "No Supabase session"
    banner + falls back to `MOCK_PLACES`, which means the friend
    saves into a fixture nobody can read post-demo)

  Failure mode for this gate sub-condition is high-impact + late-
  surfacing: the symptoms hide as "Naver 검색이 안 돼요" /
  "저장은 됐는데 다시 보면 사라져요", easily mistaken for save-flow
  bugs during the 10-min observation. Preempt via a one-time boot
  log: temporarily add `console.log('[boot]', { naver: !!CLIENT_ID
  && !!CLIENT_SECRET, email: !!TEST_EMAIL, password: !!TEST_PASSWORD })`
  to App.tsx near the existing token assertion; verify "all true"
  in Metro before handing the phone to the friend; remove the log
  post-demo (or roll into Phase 6's auth UI which subsumes the check).

  **Verified 2026-05-11:** boot log assertion `[boot] { naver: true,
  email: true, password: true }` confirmed in Metro on emulator
  relaunch; test user f0b880d2-f4f8-4fef-90b2-8fe2a612d97a
  authenticates against cloud Supabase and reads its 4 saved_places
  rows via RLS; the assertion lives in App.tsx (lines 45-49) per the
  doc's recipe.

### Failure mode

If the gate is not met 24h before the demo, **reschedule the demo.**
Do NOT run validation on a placeholder-named build. The cost of
rescheduling (a few days) is far smaller than a contaminated
validation result that could send the project into Phase 6+ on a
wrong premise.

If brand decision is genuinely stuck (>4 days past planned lock
date), pause Phase 5 entirely and run a focused /office-hours
session on naming exclusively. Prep checklist already lives in
PROJECT_STATE.md → Open decisions → "App Store branded display name."

### Out of scope for this gate (defer to later triggers)

- iOS `bundleIdentifier` / Android `package` rename — IRREVERSIBLE,
  belongs at Trigger 4 (Phase 10, before TestFlight). Stays as
  placeholder `com.gachi2026.mymap` through the Phase 5 demo.
- App Store / Play Store name reservation — Trigger 5
- Custom domain (`<brand>.app`), app icon redesign, privacy
  policy / ToS at brand domain — all post-validation polish

## The validation test (the actual gate)

This is the most important task in the project. Do not skip, rush, or
soften the criteria.

### Setup

- Recruit the founder's friend (the named user from DESIGN.md § Demand
  Evidence). Specifically: she with 40+ places in Notes, weekly 성수동
  cafe rotation.
- Schedule ~1 hour with her. Coffee somewhere. In person, NOT video.
- Bring a real iPhone or Android with the build pre-installed.
- Ask permission to record audio of the session (NOT video). Have a
  notebook for observations.

### Protocol

Hand her the phone with MyMap installed. Map shows zero pins (no
onboarding yet). Tell her ONLY this:

> "이 앱은 인스타에서 본 장소를 저장하는 앱이야. 한 번 써봐. 평소에
> 인스타에서 카페나 식당 저장할 때처럼."

(*"This app saves places you see on Instagram. Try it out. Like you
normally save cafes or restaurants from Instagram."*)

Then: **say nothing for the next 10 minutes.** Do not coach. Do not
explain UI elements. Do not point at things. Watch only. If she asks
"how do I save?" answer ONLY "어떻게 할 것 같아?" *("how would you
expect to?")* and write down what she tries.

After 10 minutes (or when she says she's done), ask:
1. "How did that feel?"
2. "Did anything confuse you?"
3. "Compared to your Notes app + Naver Map workflow, is this faster
   or slower? By how much?"
4. "If this app existed in the App Store today and your friend
   recommended it to you, would you install it?"

### Pass criteria

The phase passes if **at least 3 of 4** of these hold:

- ✅ She saved 3+ places from Instagram in the 10-minute test
- ✅ Average save time (URL share → place on map) was under 30 seconds
  for Instagram URLs and under 15 seconds for Naver/Kakao URLs
- ✅ She used the share sheet without prompting (didn't have to be
  taught)
- ✅ Her answer to question 4 was an unambiguous yes (not "maybe,"
  not "I'd try it")

If only 2 of 4 pass: borderline. Rerun with a second user (a different
friend matching the demographic) before deciding.

If 0-1 of 4 pass: **STOP. The product thesis is wrong.** Do not start
Phase 6. Open a planning session to figure out which assumption broke
(was it the wedge? the user? the share sheet? the Kakao auto-resolve?).
Run `/office-hours` again to redesign or `/plan-eng-review` to
diagnose.

### What to capture during the session

In your notebook, write down:

- **Each tap she made before saving the first place.** This is a
  literal interaction log: "tap share, scroll down, tap MyMap, modal
  opens, tap result, tap save." If the count is high, the friction is
  too high.
- **Each moment of confusion.** Even 1-second pauses count. "She
  scrolled past MyMap in the share sheet twice before tapping it."
  These pauses become the next round of UX work.
- **What she said out loud unprompted.** Verbatim. "어 이거 좀 빠른데"
  or "왜 이게 안 보이지" — both data, regardless of valence.
- **Surprise moments.** Anything she did that you didn't anticipate.
  These are usually the gold — the real product hiding in actual usage.

## Anti-patterns (do NOT do these)

- **Don't help her during the 10-minute test.** The whole point is to
  watch what happens without your help. Coaching contaminates the data.
- **Don't ship the polished UI before testing.** Phase 8 is when this
  becomes Toss-pretty. If she struggles with bare-bones Phase 5 UI,
  that's a UX problem; if she struggles with polished Phase 8 UI,
  you've lost the diagnostic signal because polish hides bugs.
- **Don't treat partial pass as full pass.** "She saved 1 place but
  said it was confusing" is NOT a pass. The bar is 3+ saves AND
  unprompted yes on the install question.
- **Don't recruit a software engineer or designer as the test user.**
  They'll figure it out regardless of UX quality. The named user is
  the right user; substitute only with a similar demographic
  (Korean Gen Z, Instagram-cafe-screenshot habit).

## Verification

The phase is done when ALL of the following hold:

- [ ] All 5 manual smoke tests pass (you can do every save path on a
      real device)
- [ ] Auto-resolve and manual-resolve paths both produce correctly-
      saved SavedPlace records in Supabase (verify with SQL inspection)
- [ ] Saved pins render on map after save (no need to restart app)
- [ ] Pins persist across app restart
- [ ] Validation test with the named user has been completed
- [ ] Pass criteria evaluated: 3+/4 = continue, 2/4 = retest with
      second user, 0-1/4 = STOP and replan

## Handoff

When complete (regardless of validation result), update
`PROJECT_STATE.md`:

1. Move "Phase 5: Save-flow MVP" from "Pending" to "Completed" OR
   "Blocked" depending on validation result
2. Record validation outcome explicitly:
   - Pass criteria results (4/4, 3/4, etc.)
   - Quotes from user (verbatim observations)
   - Recommendation: continue to Phase 6, retest, or stop
3. Note any architectural decisions that came up during implementation
   (e.g., "decided to put OG resolver on Cloudflare Worker instead of
   Supabase Edge Function because cold starts on Supabase were >2s")

If validation passes, advance the symlink:
```bash
ln -sf phase-6-onboarding.md phases/CURRENT_PHASE.md
```

If validation fails, do NOT advance. Add to "Active blockers" in
PROJECT_STATE.md and consult the user before continuing.

The diagnostic value of Phase 5 IS the gate. Honoring it — even when
it says stop — is the entire point.
