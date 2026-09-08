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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

import { Mapbox, PersonalMap, type PersonalMapHandle } from './src/map/PersonalMap';
import {
  listPlaces,
  updatePlace,
  deletePlace,
  savePlace,
  type NewSavedPlace,
  type SavedPlacePatch,
} from './src/places/repo';
import { isOgCacheStale, refreshOgMetadata } from './src/places/og-cache';
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
import { QuickActionSheet } from './src/pin-interactions/QuickActionSheet';
import { ColorTagSheet, type ColorSheetMode } from './src/pin-interactions/ColorTagSheet';
import { ColorFilterButton } from './src/pin-interactions/ColorFilterButton';
import { PinDetailPopover } from './src/pin-interactions/PinDetailPopover';
import { SearchBar } from './src/search/SearchBar';
import { SearchResultPreview } from './src/search/SearchResultPreview';
import type { ColorTag, KakaoPlaceResult, SavedPlace } from './spec/data-shapes';
import { inferCategoryFromKakao } from './spec/data-shapes';

// Phase 8 (D11 lock): the pin-detail popover opens on tap only at
// zoom ≥ 16. Below that, a pin tap just selects (no popover).
const POPOVER_MIN_ZOOM = 16;

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
  return (
    <GestureHandlerRootView style={styles.root}>
      <BottomSheetModalProvider>
        <AppRouter />
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}

function AppRouter() {
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

// Seoul City Hall fallback when the user has no HOME anchor (skipped
// onboarding). Matches the Phase 4 PersonalMap default — Korea-centroid-ish
// for a Seoul-first cohort. Replaced once any HOME save lands.
const SEOUL_FALLBACK_CENTER: [number, number] = [126.978, 37.5665];

function MapScreen({ userId }: MapScreenProps) {
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const mapHandleRef = useRef<PersonalMapHandle>(null);
  const { visible: hintVisible, dismiss: dismissHint } = useHintCardVisible(userId);

  // Initial camera derived from the user's HOME anchor (Phase 6 onboarding
  // output). Zoom 14 is the dong-level comfortable view per D11; if the
  // user skipped onboarding (no HOME), fall back to Seoul City Hall at
  // the same dong-level zoom. Memoized on savedPlaces so a HOME save mid-
  // session promotes the camera to the new HOME on the next mount only —
  // we deliberately don't reposition the camera if the user's already
  // scrolled around (App.tsx flyTo handles post-save camera, not re-init).
  const initialCamera = useMemo(() => {
    const home = savedPlaces.find((p) => p.category === 'HOME');
    if (home) return { center: [home.lng, home.lat] as [number, number], zoom: 14 };
    return { center: SEOUL_FALLBACK_CENTER, zoom: 14 };
  }, [savedPlaces]);

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
    // Phase 8: kick off background OG fetch for the newly-saved pin.
    // Fire-and-forget — the save flow itself doesn't wait. When the
    // metadata lands, merge the updated row into local state so the
    // map (and popover, if the user taps the pin) see the cached OG.
    void refreshOgMetadata(place).then((updated) => {
      if (updated) {
        setSavedPlaces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
    });
  }, []);

  const handleLocate = useCallback((coords: [number, number]) => {
    // GPS-resolved fly: tighter zoom than save-flow flyTo (the user is
    // looking for "where am I", not "did my save land near X street").
    mapHandleRef.current?.flyTo(coords, { zoom: 16, duration: 600 });
  }, []);

  // ----- Phase 7 interaction state -----------------------------------------
  // selectedPinId drives the tap-to-expand morph in PersonalMap.
  // quickActionPin is the place whose long-press sheet is currently open.
  // colorPickerPlace and filterPickerMode together control the ColorTagSheet
  // (mutually exclusive — only one mode active at a time).
  // colorFilter is the active map-wide filter color (null = no filter).
  // Phase 8: popoverPinId — opened on saved-pin tap at zoom ≥ 16. We track
  // by id (not snapshot) so optimistic patches (visited toggle, color
  // change, name edit) propagate into the popover via the derived lookup
  // below without a separate sync path.
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [quickActionPin, setQuickActionPin] = useState<SavedPlace | null>(null);
  const [colorPickerPlace, setColorPickerPlace] = useState<SavedPlace | null>(null);
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);
  const [colorFilter, setColorFilter] = useState<ColorTag | null>(null);
  const [popoverPinId, setPopoverPinId] = useState<string | null>(null);

  // Phase 9 search state. searchResults null = no search active (overlay
  // hidden); empty array = search ran and returned 0 (overlay hidden,
  // SearchBar shows its own empty UX if we add it later). searchPreview
  // is the tapped result currently showing in the bottom-sheet preview.
  const [searchResults, setSearchResults] = useState<KakaoPlaceResult[] | null>(null);
  const [searchPreview, setSearchPreview] = useState<KakaoPlaceResult | null>(null);

  const popoverPin = useMemo(
    () => (popoverPinId ? (savedPlaces.find((p) => p.id === popoverPinId) ?? null) : null),
    [popoverPinId, savedPlaces],
  );

  // OG cache refresh when popover opens for a pin with stale or missing
  // OG cache. Fire-and-forget; the popover renders the stale version
  // immediately and re-renders with the fresh OG when the merged update
  // lands in savedPlaces.
  useEffect(() => {
    if (!popoverPin) return;
    if (!isOgCacheStale(popoverPin)) return;
    void refreshOgMetadata(popoverPin).then((updated) => {
      if (updated) {
        setSavedPlaces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
    });
    // Depend on id only — re-firing on every popoverPin object change
    // (e.g. when an unrelated patch bumps the reference) would cause
    // repeat OG refreshes within a single popover session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popoverPinId]);

  // Derived: which mode is the shared ColorTagSheet in (or closed)?
  const colorSheetMode: ColorSheetMode | null = colorPickerPlace
    ? 'tag'
    : filterPickerOpen
      ? 'filter'
      : null;
  const colorSheetCurrent: ColorTag | null = colorPickerPlace
    ? colorPickerPlace.color_tag
    : colorFilter;

  const handlePinTap = useCallback((id: string) => {
    setSelectedPinId(id);
    // Switching from long-press → tap dismisses any open quick-action
    // sheet so the two bottom sheets never overlap on screen.
    setQuickActionPin(null);
    // Phase 8: zoom-gated popover open per D11. We ask the map for the
    // current zoom on each tap (rather than reactively tracking it),
    // so the popover opens iff the user is already at z ≥ 16. Below
    // that, this is just a selection (existing Phase 7 morph behavior).
    void mapHandleRef.current?.getZoom().then((zoom) => {
      if (zoom >= POPOVER_MIN_ZOOM) {
        setPopoverPinId(id);
      }
    });
  }, []);

  const handleMapPress = useCallback(() => {
    setSelectedPinId(null);
    setPopoverPinId(null);
  }, []);

  const handlePinLongPress = useCallback(
    (id: string) => {
      const place = savedPlaces.find((p) => p.id === id);
      if (!place) return;
      setSelectedPinId(id);
      // Switching from tap → long-press dismisses any open popover so
      // the two sheets never overlap.
      setPopoverPinId(null);
      setQuickActionPin(place);
    },
    [savedPlaces],
  );

  // Optimistic visited toggle. Flips local state first so the pin morphs
  // immediately; rolls back if the DB write fails. The quickActionPin's
  // own state is refreshed too (it shows the new switch position in the
  // sheet without a roundtrip).
  const handleToggleVisited = useCallback((place: SavedPlace) => {
    const newVisited = !place.visited;
    const newVisitedAt = newVisited ? new Date().toISOString() : null;
    const optimistic: SavedPlace = {
      ...place,
      visited: newVisited,
      visited_at: newVisitedAt,
    };
    setSavedPlaces((prev) => prev.map((p) => (p.id === place.id ? optimistic : p)));
    setQuickActionPin(optimistic);
    void updatePlace(place.id, { visited: newVisited, visited_at: newVisitedAt }).then((r) => {
      if (r.error) {
        console.warn('[visited toggle] update failed, rolling back:', r.error.message);
        setSavedPlaces((prev) => prev.map((p) => (p.id === place.id ? place : p)));
        setQuickActionPin(place);
      }
    });
  }, []);

  const handleOpenColorPicker = useCallback((place: SavedPlace) => {
    // Two-sheet handoff: dismiss quick-action, then present color picker.
    // Setting both states sequentially is fine — gorhom queues present()
    // after dismiss() completes.
    setQuickActionPin(null);
    setColorPickerPlace(place);
  }, []);

  const handleColorTagPick = useCallback(
    (color: ColorTag | null) => {
      const place = colorPickerPlace;
      if (!place) return;
      // Tag mode: NONE is the no-tag sentinel; null shouldn't arrive here
      // but we guard anyway.
      const newTag: ColorTag = color ?? 'NONE';
      const optimistic: SavedPlace = { ...place, color_tag: newTag };
      setSavedPlaces((prev) => prev.map((p) => (p.id === place.id ? optimistic : p)));
      setColorPickerPlace(null);
      void updatePlace(place.id, { color_tag: newTag }).then((r) => {
        if (r.error) {
          console.warn('[color tag] update failed, rolling back:', r.error.message);
          setSavedPlaces((prev) => prev.map((p) => (p.id === place.id ? place : p)));
        }
      });
    },
    [colorPickerPlace],
  );

  const handleFilterPick = useCallback((color: ColorTag | null) => {
    setColorFilter(color);
    setFilterPickerOpen(false);
  }, []);

  const handleDelete = useCallback((place: SavedPlace) => {
    // Optimistic remove. If it was the selected pin, clear selection too.
    setSavedPlaces((prev) => prev.filter((p) => p.id !== place.id));
    setQuickActionPin(null);
    setPopoverPinId((prev) => (prev === place.id ? null : prev));
    setSelectedPinId((prev) => (prev === place.id ? null : prev));
    void deletePlace(place.id).then((r) => {
      if (r.error) {
        console.warn('[delete] failed, rolling back:', r.error.message);
        setSavedPlaces((prev) => [place, ...prev]);
      }
    });
  }, []);

  // Phase 9 — search result tap → open preview sheet. Look up the
  // tapped id in the current search results. Stale-tap defense: if the
  // results array was just cleared (user dismissed mid-render), the
  // lookup returns undefined and we no-op.
  const handleSearchResultTap = useCallback(
    (id: string) => {
      const hit = searchResults?.find((r) => r.id === id);
      if (hit) setSearchPreview(hit);
    },
    [searchResults],
  );

  // Phase 9 — explicit SearchBar dismiss (X tap). Clear both the overlay
  // and any preview that was open over it.
  const handleSearchDismiss = useCallback(() => {
    setSearchResults(null);
    setSearchPreview(null);
  }, []);

  // Phase 9 — save from a search result. Insert with the resolved Naver
  // fields; OG cache stays null (search-flow has no source_url, so the
  // OG resolver has nothing to fetch — popover renders the "no source"
  // variant for these pins, which is correct: the user didn't save from
  // Instagram/Naver Place, they searched and picked). Category is
  // inferred from Naver's category_name on the AUTO_RESOLVE precedent
  // in SaveModal — user can re-categorize via the popover later.
  const handleSearchSave = useCallback(
    (result: KakaoPlaceResult) => {
      const insert: NewSavedPlace = {
        user_id: userId,
        name: result.place_name,
        lat: parseFloat(result.y),
        lng: parseFloat(result.x),
        category: inferCategoryFromKakao(result.category_name),
        source_url: null,
        og_title: null,
        og_image_url: null,
        og_description: null,
        og_fetched_at: null,
        og_fetch_status: null,
        note: null,
        address: result.address_name,
        region: null,
        visited_at: null,
      };
      void savePlace(insert).then((r) => {
        if (r.error) {
          console.warn('[search save] failed:', r.error.message);
          return;
        }
        // Reuse the share-flow post-save pipeline: insert pin into the
        // local collection, fly camera to it, fire OG refresh (which
        // will no-op since source_url is null but keeps the code path
        // symmetric with handleSaved).
        handleSaved(r.data);
        // Dismiss the entire search surface — the new pin is now in
        // the user's permanent map and the overlay would just clutter.
        setSearchResults(null);
        setSearchPreview(null);
      });
    },
    [userId, handleSaved],
  );

  // Phase 8 popover patch — optimistic + DB write + rollback on error.
  // Used for every editable field in PinDetailPopover (name, note,
  // category, color_tag, visited). Mirrors Phase 7 visited-toggle
  // optimistic pattern; centralized here so the popover stays
  // presentation-only.
  const handlePopoverPatch = useCallback(
    (placeId: string, patch: SavedPlacePatch) => {
      const before = savedPlaces.find((p) => p.id === placeId);
      if (!before) return;
      const optimistic: SavedPlace = { ...before, ...patch };
      setSavedPlaces((prev) => prev.map((p) => (p.id === placeId ? optimistic : p)));
      void updatePlace(placeId, patch).then((r) => {
        if (r.error) {
          console.warn('[popover patch] update failed, rolling back:', r.error.message);
          setSavedPlaces((prev) => prev.map((p) => (p.id === placeId ? before : p)));
        }
      });
    },
    [savedPlaces],
  );

  return (
    <View style={styles.container}>
      <PersonalMap
        ref={mapHandleRef}
        savedPlaces={savedPlaces}
        searchResults={searchResults}
        initialCenter={initialCamera.center}
        initialZoom={initialCamera.zoom}
        selectedPinId={selectedPinId}
        colorFilter={colorFilter}
        onPinTap={handlePinTap}
        onPinLongPress={handlePinLongPress}
        onMapPress={handleMapPress}
        onClusterTap={() => setSelectedPinId(null)}
        onSearchResultTap={handleSearchResultTap}
      />

      <SearchBar onResults={setSearchResults} onDismiss={handleSearchDismiss} />

      <MyLocationButton onLocate={handleLocate} />

      <ColorFilterButton activeFilter={colorFilter} onPress={() => setFilterPickerOpen(true)} />

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

      <QuickActionSheet
        place={quickActionPin}
        onClose={() => setQuickActionPin(null)}
        onToggleVisited={handleToggleVisited}
        onOpenColorPicker={handleOpenColorPicker}
        onDelete={handleDelete}
      />

      <ColorTagSheet
        mode={colorSheetMode}
        current={colorSheetCurrent}
        onPick={colorSheetMode === 'tag' ? handleColorTagPick : handleFilterPick}
        onClose={() => {
          setColorPickerPlace(null);
          setFilterPickerOpen(false);
        }}
      />

      <PinDetailPopover
        place={popoverPin}
        onClose={() => setPopoverPinId(null)}
        onPatch={handlePopoverPatch}
        onDelete={handleDelete}
      />

      <SearchResultPreview
        result={searchPreview}
        onClose={() => setSearchPreview(null)}
        onSave={handleSearchSave}
      />

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
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
