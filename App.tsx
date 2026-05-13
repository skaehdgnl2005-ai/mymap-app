// Phase 6 entry point — three-state router:
//   1. !session         → AuthScreen          (Phase 6 sign-in/up)
//   2. session, !onboarded → Onboarding flow (HOME → SCHOOL/WORK)
//   3. session, onboarded → MapScreen        (Phase 5 save flow + Phase 6 hint card + my-location)
//
// Replaces Phase 5's ensureDevSession boot-time test-user sign-in. The
// session is observed via supabase.auth.onAuthStateChange in useSession;
// state transitions are reactive — no manual refetch on sign-in/out.
//
// Phase 5 fallback to MOCK_PLACES when no session is REMOVED — Phase 6's
// auth screen ensures the map only ever renders for a real authenticated
// user. The MOCK_PLACES fixture remains in src/dev for any Phase 7+
// renderer-only dev work (import it into a throwaway screen if needed).

import { useShareIntent } from 'expo-share-intent';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Mapbox, PersonalMap, type PersonalMapHandle } from './src/map/PersonalMap';
import { listPlaces } from './src/places/repo';
import { SaveModal } from './src/save-flow/SaveModal';
import { classifyUrl, type ClassifiedUrl } from './src/save-flow/url-classifier';
import { AuthScreen } from './src/auth/AuthScreen';
import { useSession } from './src/auth/useSession';
import { OnboardingStepHome } from './src/onboarding/OnboardingStepHome';
import { OnboardingStepWorkSchool } from './src/onboarding/OnboardingStepWorkSchool';
import {
  markOnboardingComplete,
  useOnboardingComplete,
} from './src/onboarding/useOnboardingComplete';
import { HintCard, useHintCardVisible } from './src/onboarding/HintCard';
import { MyLocationButton } from './src/location/MyLocationButton';
import type { SavedPlace } from './spec/data-shapes';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (!MAPBOX_TOKEN) {
  throw new Error('EXPO_PUBLIC_MAPBOX_TOKEN is missing. Set it in .env.');
}
Mapbox.setAccessToken(MAPBOX_TOKEN);

// Boot-time env-var presence flags — same diagnostic as Phase 5 but with
// the test-user creds dropped (Phase 6 auth UI subsumes them). Useful
// when a friend-demo build silently lacks Naver creds: console line tells
// you immediately rather than waiting for the search-result empty state.
console.log('[boot]', {
  naver: !!process.env.EXPO_PUBLIC_NAVER_CLIENT_ID && !!process.env.EXPO_PUBLIC_NAVER_CLIENT_SECRET,
  supabase: !!process.env.EXPO_PUBLIC_SUPABASE_URL && !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

export default function App() {
  const { userId, loading: sessionLoading } = useSession();
  const { status: onboardingStatus, setDone: setOnboardingDone } = useOnboardingComplete(userId);

  // Cold-boot loading window: AsyncStorage session restore + onboarding
  // status query both async. Showing AuthScreen during this window would
  // flash for returning users; showing nothing for >100ms feels broken.
  // A neutral splash matching the auth-screen background covers the gap.
  if (sessionLoading || (userId && onboardingStatus === 'loading')) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator />
        <StatusBar style="auto" />
      </View>
    );
  }

  if (!userId) {
    return (
      <>
        <AuthScreen />
        <StatusBar style="auto" />
      </>
    );
  }

  if (onboardingStatus === 'pending') {
    return (
      <OnboardingFlow
        userId={userId}
        onDone={async () => {
          await markOnboardingComplete(userId);
          setOnboardingDone();
        }}
      />
    );
  }

  return <MapScreen userId={userId} />;
}

// -- Onboarding flow ---------------------------------------------------------

interface OnboardingFlowProps {
  userId: string;
  onDone: () => Promise<void>;
}

function OnboardingFlow({ userId, onDone }: OnboardingFlowProps) {
  const [step, setStep] = useState<'home' | 'work-school'>('home');

  if (step === 'home') {
    return (
      <>
        <OnboardingStepHome userId={userId} onNext={() => setStep('work-school')} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <>
      <OnboardingStepWorkSchool
        userId={userId}
        onDone={() => {
          void onDone();
        }}
      />
      <StatusBar style="auto" />
    </>
  );
}

// -- Map screen --------------------------------------------------------------
//
// Renders the canonical post-onboarding surface: PersonalMap with the user's
// saved_places, the FAB save trigger (share-intent / clipboard), the hint
// card on first session, and the My Location button.

interface MapScreenProps {
  userId: string;
}

function MapScreen({ userId }: MapScreenProps) {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const mapHandleRef = useRef<PersonalMapHandle>(null);
  const { visible: hintVisible, dismiss: dismissHint } = useHintCardVisible(userId);

  // Initial load of this user's saved places — after Phase 6 onboarding
  // there will be ≥1 anchor for a non-skipping user; for skip-everything
  // users the list is empty and the hint card carries comprehension.
  useEffect(() => {
    let cancelled = false;
    void listPlaces().then((r) => {
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
    // Dismiss the hint on first FAB interaction (per Phase 6 § task 6).
    if (hintVisible) dismissHint();

    const text = await Clipboard.getStringAsync();
    const classified = text ? classifyUrl(text) : null;
    if (classified) {
      setClipboardUrl(classified);
    } else {
      setClipboardUrl({
        raw: '',
        hostname: '',
        strategy: 'MANUAL_RESOLVE',
        domain_kind: 'other',
        place_id_hint: null,
      });
    }
  }, [hintVisible, dismissHint]);

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
    mapHandleRef.current?.flyTo([place.lng, place.lat], { zoom: 16, duration: 800 });
  }, []);

  const handleLocate = useCallback((coords: [number, number]) => {
    // GPS-resolved fly: tighter zoom than save-flow flyTo (the user is
    // looking for "where am I", not "did my save land near X street").
    mapHandleRef.current?.flyTo(coords, { zoom: 16, duration: 600 });
  }, []);

  return (
    <View style={styles.container}>
      <PersonalMap
        ref={mapHandleRef}
        savedPlaces={savedPlaces}
        initialCenter={[127.055, 37.5446]}
        initialZoom={15}
        onPinTap={(id) => console.log('[pin tap]', id)}
        onPinLongPress={(id) => console.log('[pin long-press]', id)}
        onClusterTap={(id) => console.log('[cluster tap]', id)}
      />

      <MyLocationButton onLocate={handleLocate} />

      <Pressable
        style={styles.fab}
        onPress={checkClipboard}
        accessibilityLabel="장소 추가"
        hitSlop={8}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {hintVisible && <HintCard onDismiss={dismissHint} />}

      {activeUrl && (
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
  splash: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
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
});
