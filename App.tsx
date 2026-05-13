// Phase 5 entry point — wires share-intent + clipboard into the SaveModal
// and feeds the resulting saved_places into PersonalMap.
//
// Auth: Phase 5 hardcodes a test user via EXPO_PUBLIC_TEST_USER_EMAIL /
// EXPO_PUBLIC_TEST_USER_PASSWORD. The credentials are sign-in only — no UI
// for sign-up at v1 Phase 5. Phase 6 ships real onboarding + auth UI.
//
// Map fallback: if Supabase session is not available, fall back to the
// Phase 4 mock fixture so the map view still has something to render
// during dev (e.g. when EXPO_PUBLIC_SUPABASE_URL is missing). This keeps
// the renderer's diagnostic value during pre-auth integration work.

import { useShareIntent } from 'expo-share-intent';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Mapbox, PersonalMap, type PersonalMapHandle } from './src/map/PersonalMap';
import { MOCK_PLACES } from './src/dev/mock-places';
import { listPlaces } from './src/places/repo';
import { SaveModal } from './src/save-flow/SaveModal';
import { classifyUrl, type ClassifiedUrl } from './src/save-flow/url-classifier';
import { supabase } from './src/supabase';
import type { SavedPlace } from './spec/data-shapes';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (!MAPBOX_TOKEN) {
  throw new Error('EXPO_PUBLIC_MAPBOX_TOKEN is missing. Set it in .env.');
}
Mapbox.setAccessToken(MAPBOX_TOKEN);

const TEST_EMAIL = process.env.EXPO_PUBLIC_TEST_USER_EMAIL ?? '';
const TEST_PASSWORD = process.env.EXPO_PUBLIC_TEST_USER_PASSWORD ?? '';

// T-24h gate sub-condition 5: print env-var presence flags at boot so a
// missing `.env` value gets caught BEFORE the friend-demo (otherwise the
// symptom — "검색 실패" or no-session banner — looks like a save-flow bug
// during the 10-min observation). All ✓ in console = friend-demo ready.
// Phase 6 auth UI will subsume this; remove after friend-demo close.
//
// Naver replaces Kakao as POI provider at v1 per DESIGN.md D5b (사업자
// 등록 access constraint). The `naver` flag is true only when BOTH
// CLIENT_ID and CLIENT_SECRET are set; either alone is non-functional.
console.log('[boot]', {
  naver: !!process.env.EXPO_PUBLIC_NAVER_CLIENT_ID && !!process.env.EXPO_PUBLIC_NAVER_CLIENT_SECRET,
  email: !!TEST_EMAIL,
  password: !!TEST_PASSWORD,
});

// Dev sign-in: try the existing persisted session first; otherwise sign in
// with the .env-provided test credentials. If both fail, the map renders
// from MOCK_PLACES so Phase 4 visual signal still works during this layer's
// development.
async function ensureDevSession(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user.id) return session.user.id;
  if (!TEST_EMAIL || !TEST_PASSWORD) return null;
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error || !data.session) {
    console.warn('[auth] dev sign-in failed:', error?.message ?? 'no session');
    return null;
  }
  return data.session.user.id;
}

export default function App() {
  const [userId, setUserId] = useState<string | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  // Imperative handle to PersonalMap for post-save camera flyTo. Set up
  // during Phase 5 Track A founder smoke-test feedback: saving a place
  // without visual camera response left the user uncertain whether the
  // save landed and where. flyTo confirms the save geographically.
  const mapHandleRef = useRef<PersonalMapHandle>(null);

  // Boot: sign in (or restore session), then load that user's saved places.
  useEffect(() => {
    let cancelled = false;
    ensureDevSession().then(async (uid) => {
      if (cancelled) return;
      setUserId(uid);
      if (!uid) {
        setAuthError('No Supabase session. Set EXPO_PUBLIC_TEST_USER_EMAIL/PASSWORD in .env.');
        return;
      }
      const r = await listPlaces();
      if (cancelled) return;
      if (r.error) {
        console.warn('[places] load failed:', r.error.message);
        return;
      }
      setSavedPlaces(r.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Share-intent surface (iOS share-extension + Android ACTION_SEND).
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  // Clipboard surface (Instagram primary path per D7 R1: peek on `+` tap,
  // never on app foreground).
  const [clipboardUrl, setClipboardUrl] = useState<ClassifiedUrl | null>(null);

  const checkClipboard = useCallback(async () => {
    const text = await Clipboard.getStringAsync();
    const classified = text ? classifyUrl(text) : null;
    if (classified) {
      setClipboardUrl(classified);
    } else {
      // No URL on clipboard — open an empty manual-search modal anchored
      // at the clipboard string (or empty) so the user can still type.
      setClipboardUrl({
        raw: '',
        hostname: '',
        strategy: 'MANUAL_RESOLVE',
        domain_kind: 'other',
        place_id_hint: null,
      });
    }
  }, []);

  // Resolve which URL to show in SaveModal: share-intent takes precedence
  // over clipboard if both fire (rare but possible).
  const activeUrl: ClassifiedUrl | null = useMemo(() => {
    if (hasShareIntent && shareIntent.webUrl) {
      return classifyUrl(shareIntent.webUrl);
    }
    return clipboardUrl;
  }, [hasShareIntent, shareIntent, clipboardUrl]);

  const handleClose = useCallback(() => {
    if (hasShareIntent) resetShareIntent();
    setClipboardUrl(null);
  }, [hasShareIntent, resetShareIntent]);

  const handleSaved = useCallback((place: SavedPlace) => {
    setSavedPlaces((prev) => [place, ...prev]);
    // Fly camera to the new pin so the user sees what they just saved.
    // zoom 16 = close enough for the pin to be visually obvious but
    // still shows surrounding context (street + neighborhood).
    mapHandleRef.current?.flyTo([place.lng, place.lat], { zoom: 16, duration: 800 });
  }, []);

  // Pick the place set to render: real saved places when authed, otherwise
  // the Phase 4 mock fixture (so the map still renders during dev).
  const placesForMap = userId ? savedPlaces : MOCK_PLACES;

  return (
    <View style={styles.container}>
      <PersonalMap
        ref={mapHandleRef}
        savedPlaces={placesForMap}
        initialCenter={[127.055, 37.5446]}
        initialZoom={15}
        onPinTap={(id) => console.log('[pin tap]', id)}
        onPinLongPress={(id) => console.log('[pin long-press]', id)}
        onClusterTap={(id) => console.log('[cluster tap]', id)}
      />

      <Pressable
        style={styles.fab}
        onPress={checkClipboard}
        accessibilityLabel="장소 추가"
        hitSlop={8}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {authError && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{authError}</Text>
        </View>
      )}

      {activeUrl && userId && (
        <SaveModal
          visible={true}
          url={activeUrl}
          userId={userId}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 36,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2D2A6B', // brand_indigo per D9
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 30,
  },
  banner: {
    position: 'absolute',
    top: 56,
    left: 16,
    right: 16,
    backgroundColor: '#FFF4D6',
    padding: 12,
    borderRadius: 6,
  },
  bannerText: {
    fontSize: 12,
    color: '#5C4400',
  },
});
