// PersonalMap — base map renderer (Phase 4) + interaction layer (Phase 7).
//
// Adapted from spec/implementation.tsx. Production differences from the
// reference:
//   - Style JSONs are bundled (resolveJsonModule) and passed via styleJSON,
//     not styleURL. Avoids a hosted-style round-trip and lets style edits
//     ship in normal app updates. The Style JSONs themselves still reference
//     self-hosted sprite + glyph URLs internally (Phase 2 → R2).
//   - Each pin layer is a CircleLayer + SymbolLayer pair. The sprite atlas
//     contains only white outline glyphs (no background); the colored pin
//     body is rendered at runtime by the CircleLayer underneath.
//   - Mapbox.setAccessToken is called from App.tsx at app start, NOT here
//     (importing this file should not have token-side-effects).
//
// Phase 4/7 deviations from the locked D10 marker spec (carry-over —
// sprite-pipeline expansion descoped from Phase 7, see PROJECT_STATE.md
// "D10 marker-shape deviations" cross-phase issue for the resolution
// path. Phase 7 ships the interaction layer over the existing 9-glyph
// atlas; the spec-perfect visual lands on a future polish slot once
// beta evidence justifies the 2-4hr sprite SVG + R2 v2 + style JSON bump):
//   - Anchors render as larger circles in brand_indigo_soft. The locked
//     "rounded square" anchor shape needs a separate sprite atlas entry
//     (background composite per HOME/WORK/SCHOOL).
//   - Visited pins render as a donut: surface_base fill + 2.0px indigo
//     stroke + no glyph. The locked "outlined indigo glyph" treatment
//     needs SDF sprites or per-category outlined variants. The white
//     glyph cannot be recolored at runtime against the current rasterized
//     sprite atlas — so it's hidden on visited pins.
//
// Phase 7 interaction props (NEW):
//   - selectedPinId: drives the tap-to-expand morph (1.5× scale on the
//     selected pin's geometry via Mapbox expressions; no Reanimated
//     because pins live in Mapbox's native canvas, not the RN view tree).
//   - colorFilter: dims non-matching saved pins to 30% opacity; matching
//     pins keep full opacity. Anchors are never dimmed (per D10 R3 lock).
//   - onMapPress: emitted when the user taps an empty area of the map
//     (no pin or cluster hit) — App clears selection on this.
//   - Cluster tap is now self-driving: PersonalMap reads the cluster's
//     expansion zoom from the source and animates camera at 350ms ease-
//     out per D10 cluster spec.

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Appearance, Pressable, StyleSheet, Text, View, type ColorSchemeName } from 'react-native';
import Mapbox, { Camera, CircleLayer, MapView, ShapeSource, SymbolLayer } from '@rnmapbox/maps';

import {
  type SavedPlace,
  type ColorTag,
  type KakaoPlaceResult,
  type PinFeatureProperties,
  type GeoJSONFeature,
  type GeoJSONFeatureCollection,
  isAnchor,
  kakaoResultToFeature,
  savedPlaceToGeoJSONFeature,
} from '../../spec/data-shapes';
import styleDarkJson from '../../spec/style-dark.json';
import styleLightJson from '../../spec/style-light.json';

// Stringify once at module load — Mapbox MapView's styleJSON prop wants a
// string, not an object. The spec JSONs are stable across renders.
const STYLE_JSON_LIGHT = JSON.stringify(styleLightJson);
const STYLE_JSON_DARK = JSON.stringify(styleDarkJson);

// Seoul City Hall — default camera center per implementation.tsx.
const SEOUL_CENTER: [number, number] = [126.978, 37.5665];

// Layer IDs that long-press should query against. Module-scope constant so
// the array reference is stable across renders (queryRenderedFeaturesAtPoint
// argument). Long-press only fires over actual pins, never clusters.
const PIN_LAYER_IDS = ['saved-pins-bg', 'saved-pins-icon', 'anchors-bg', 'anchors-icon'] as const;

// ColorTag → hex mapping for the color filter mode. Drives the matching-
// pin fill color when a filter is active. NONE is the absence-of-tag
// sentinel; filtering on NONE matches pins with no tag set.
const COLOR_TAG_HEX: Record<ColorTag, string> = {
  NONE: '#9E9E9E',
  RED: '#E5484D',
  ORANGE: '#F76808',
  YELLOW: '#F1B100',
  GREEN: '#46A758',
  BLUE: '#3B82F6',
  PURPLE: '#8E4EC6',
};

// Brand palette extracted from spec/tokens.json. Repeated here as inline
// constants instead of imported from tokens.json so the layer style
// expressions stay literal — Mapbox compiles them once on style load.
const COLORS = {
  light: {
    surface_base: '#FAFAFA',
    brand_indigo: '#2D2A6B',
    brand_indigo_soft: '#6B68A8',
    brand_indigo_dark: '#1A1850',
  },
  dark: {
    surface_base: '#1B1A18',
    brand_indigo: '#6B68C8',
    brand_indigo_soft: '#8E8BD8',
    brand_indigo_dark: '#1B1A18',
  },
} as const;

// Phase 7 layer IDs that pin-hit queries (tap, long-press, empty-map
// detection) need to span. Module scope so the array ref is stable.
const HITTABLE_LAYER_IDS = [
  'saved-pins-bg',
  'saved-pins-icon',
  'saved-clusters',
  'anchors-bg',
  'anchors-icon',
] as const;

interface Props {
  savedPlaces: SavedPlace[];
  searchResults?: KakaoPlaceResult[] | null;
  /** Initial camera center as [lng, lat]. Defaults to Seoul City Hall. */
  initialCenter?: [number, number];
  /** Initial zoom level. Defaults to 14. */
  initialZoom?: number;
  /** Phase 7: id of the currently-selected pin (drives the morph). */
  selectedPinId?: string | null;
  /**
   * Phase 7: active color filter. When non-null, saved pins whose color_tag
   * matches render with normal opacity in the tag color; non-matching pins
   * fade to 0.3 opacity. Anchors always full opacity per D10 R3 lock.
   */
  colorFilter?: ColorTag | null;
  onPinTap?: (placeId: string) => void;
  onPinLongPress?: (placeId: string) => void;
  /** Phase 7: cluster-tap is internal-zoom; this callback is a notification. */
  onClusterTap?: () => void;
  /** Phase 7: emitted when the user taps an empty area (no pin / cluster hit). */
  onMapPress?: () => void;
  onSearchResultTap?: (resultId: string) => void;
}

// Imperative handle exposed via forwardRef. Used by App.tsx to fly the
// camera to a freshly-saved pin so the user can visually confirm the
// save (D7 polish surfaced during Phase 5 Track A founder smoke-test).
// Phase 8 adds getZoom(): the popover open path is gated on zoom ≥ 16
// per D11 ("tap-to-preview at zoom ≥ 16"); App.tsx asks the map for
// current zoom on each tap rather than tracking it reactively (no
// onCameraChanged churn for a value we only need at the moment of tap).
export interface PersonalMapHandle {
  flyTo: (coords: [number, number], opts?: { zoom?: number; duration?: number }) => void;
  getZoom: () => Promise<number>;
}

// Phase 7 enriched-feature properties — PinFeatureProperties + selection
// state + filter-match state. These extra booleans drive the Mapbox style
// expressions; the spec/data-shapes.ts contract stays untouched (locked).
type EnrichedPinProps = PinFeatureProperties & {
  selected: boolean;
  dimmed: boolean;
};

const enrichFeature = (
  base: GeoJSONFeature<PinFeatureProperties>,
  selectedPinId: string | null | undefined,
  colorFilter: ColorTag | null | undefined,
): GeoJSONFeature<EnrichedPinProps> => {
  const selected = base.properties.id === selectedPinId;
  const dimmed = colorFilter != null && base.properties.color_tag !== colorFilter;
  return {
    ...base,
    properties: { ...base.properties, selected, dimmed },
  };
};

export const PersonalMap = forwardRef<PersonalMapHandle, Props>(
  (
    {
      savedPlaces,
      searchResults,
      initialCenter = SEOUL_CENTER,
      initialZoom = 14,
      selectedPinId = null,
      colorFilter = null,
      onPinTap,
      onPinLongPress,
      onClusterTap,
      onMapPress,
      onSearchResultTap,
    },
    ref,
  ) => {
    // ----- Light/dark style switching (D8 lock: two separate JSONs) --------
    const [colorScheme, setColorScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());
    useEffect(() => {
      const sub = Appearance.addChangeListener(({ colorScheme: cs }) => setColorScheme(cs));
      return () => sub.remove();
    }, []);
    const isDark = colorScheme === 'dark';
    const styleJSON = isDark ? STYLE_JSON_DARK : STYLE_JSON_LIGHT;
    const palette = isDark ? COLORS.dark : COLORS.light;

    // ----- Partition + enrich features (anchors don't cluster) -------------
    // Anchors are never dimmed by color filter (D10 R3 lock: anchors carry
    // the "infrastructure" role and stay visually authoritative regardless
    // of which color the user is filtering on). Selected morph applies to
    // both anchors and saved pins.
    const { anchorsCollection, savedCollection } = useMemo(() => {
      const anchors: GeoJSONFeature<EnrichedPinProps>[] = [];
      const saved: GeoJSONFeature<EnrichedPinProps>[] = [];
      for (const p of savedPlaces) {
        const base = savedPlaceToGeoJSONFeature(p);
        if (isAnchor(p)) {
          anchors.push(enrichFeature(base, selectedPinId, null));
        } else {
          saved.push(enrichFeature(base, selectedPinId, colorFilter));
        }
      }
      const anchorsCol: GeoJSONFeatureCollection<EnrichedPinProps> = {
        type: 'FeatureCollection',
        features: anchors,
      };
      const savedCol: GeoJSONFeatureCollection<EnrichedPinProps> = {
        type: 'FeatureCollection',
        features: saved,
      };
      return { anchorsCollection: anchorsCol, savedCollection: savedCol };
    }, [savedPlaces, selectedPinId, colorFilter]);

    // ----- Search overlay collection (Naver results, transient) ------------
    const searchCollection = useMemo(() => {
      if (!searchResults || searchResults.length === 0) return null;
      return {
        type: 'FeatureCollection' as const,
        features: searchResults.map(kakaoResultToFeature),
      };
    }, [searchResults]);

    // ----- Search pulse (Phase 9, D11/tokens.json: 1200ms ease-in-out) -----
    // Two-keyframe opacity toggle every 600ms + Mapbox circle-opacity-
    // transition of 600ms = a smooth 1200ms full alternate cycle. The
    // interval only runs while a search-collection is rendered; cleared
    // on unmount or when results clear, so dismissed-search doesn't leak
    // a timer. Driving opacity via state (not setInterval-direct on the
    // CircleLayer paint props) lets Mapbox's native transition smooth
    // each step — the alternative ~30fps setInterval mentioned in the
    // phase doc would re-render the entire ShapeSource at frame-rate.
    const [pulseHigh, setPulseHigh] = useState(true);
    const hasSearch = searchCollection !== null;
    useEffect(() => {
      if (!hasSearch) return;
      const handle = setInterval(() => setPulseHigh((p) => !p), 600);
      return () => clearInterval(handle);
    }, [hasSearch]);
    const searchOpacity = pulseHigh ? 0.75 : 0.45;
    const searchRadius = pulseHigh ? 9 : 7;

    const mapRef = useRef<MapView>(null);
    const cameraRef = useRef<Camera>(null);
    const savedSourceRef = useRef<ShapeSource>(null);

    // ----- Tile-load error banner (Phase 10) -------------------------------
    // @rnmapbox/maps v10 onMapLoadingError can fire repeatedly on background
    // tile fetch failures (offline, Mapbox API hiccup). We surface a single
    // banner — first error in the session shows the banner; user dismisses
    // via the close button, or onDidFinishLoadingMap clears it implicitly
    // when the map recovers (a complete style/tile load = the failure is
    // no longer current). The banner does NOT force a remount of MapView;
    // Mapbox retries tile fetches internally. The banner is a user signal,
    // not a forced re-load mechanism.
    //
    // `errorMutedRef` is a ref (not state) — once the user explicitly
    // dismisses, we suppress further auto-show in the same session to
    // avoid banner spam on a flaky connection. A successful map load
    // resets the mute (next disconnect can re-banner).
    const [tileError, setTileError] = useState(false);
    const errorMutedRef = useRef(false);
    const handleMapLoadingError = () => {
      if (errorMutedRef.current) return;
      setTileError(true);
    };
    const handleDidFinishLoadingMap = () => {
      // Implicit clear: a complete style/tile load == no current failure.
      // Also resets the mute so the next failure can re-banner.
      if (tileError) setTileError(false);
      errorMutedRef.current = false;
    };
    const dismissTileError = () => {
      setTileError(false);
      errorMutedRef.current = true;
    };

    useImperativeHandle(
      ref,
      () => ({
        flyTo: (coords, opts) => {
          cameraRef.current?.setCamera({
            centerCoordinate: coords,
            zoomLevel: opts?.zoom ?? 16,
            animationDuration: opts?.duration ?? 800,
            animationMode: 'flyTo',
          });
        },
        getZoom: async () => {
          // Falls back to initialZoom if the MapView ref hasn't attached
          // yet (would only happen for a pre-mount tap which can't fire
          // anyway). Mapbox returns NaN in rare edge cases; coerce.
          const z = (await mapRef.current?.getZoom()) ?? initialZoom;
          return Number.isFinite(z) ? z : initialZoom;
        },
      }),
      [initialZoom],
    );

    // ----- Long-press → query rendered features for pin id -----------------
    const handleLongPress = async (
      feature: GeoJSON.Feature<GeoJSON.Point, { screenPointX: number; screenPointY: number }>,
    ) => {
      const map = mapRef.current;
      if (!map || !onPinLongPress) return;
      const { screenPointX, screenPointY } = feature.properties;
      const hit = await map.queryRenderedFeaturesAtPoint([screenPointX, screenPointY], undefined, [
        ...PIN_LAYER_IDS,
      ]);
      const first = hit?.features?.[0];
      const id = first?.properties?.['id'];
      if (typeof id === 'string') onPinLongPress(id);
    };

    // ----- Single tap → empty-map detection (clear selection) --------------
    // ShapeSource onPress handlers fire synchronously for source taps;
    // this MapView.onPress runs the async query and only fires onMapPress
    // when nothing was hit. Race-safe: if a pin was tapped, the source
    // onPress already set selection upstream; this query also finds the
    // pin and skips the clear path.
    const handleMapPress = async (
      feature: GeoJSON.Feature<GeoJSON.Point, { screenPointX: number; screenPointY: number }>,
    ) => {
      const map = mapRef.current;
      if (!map || !onMapPress) return;
      const { screenPointX, screenPointY } = feature.properties;
      const hit = await map.queryRenderedFeaturesAtPoint([screenPointX, screenPointY], undefined, [
        ...HITTABLE_LAYER_IDS,
      ]);
      if (!hit?.features?.length) onMapPress();
    };

    // ----- Cluster tap → smooth zoom-in via getClusterExpansionZoom --------
    // D10 spec: 350ms ease-out animation to the zoom at which the cluster
    // un-clusters. getClusterExpansionZoom returns the canonical Mapbox
    // value for that zoom; we add a small bump (+0.25) to ensure children
    // visibly separate after the animation.
    const handleClusterTap = async (
      feature: GeoJSON.Feature<GeoJSON.Point, Record<string, unknown>>,
    ) => {
      const src = savedSourceRef.current;
      const cam = cameraRef.current;
      if (!src || !cam) return;
      try {
        const expansionZoom = await src.getClusterExpansionZoom(feature);
        cam.setCamera({
          centerCoordinate: feature.geometry.coordinates as [number, number],
          zoomLevel: typeof expansionZoom === 'number' ? expansionZoom + 0.25 : 14,
          animationDuration: 350,
          animationMode: 'easeTo',
        });
      } catch {
        // Defensive — getClusterExpansionZoom can reject if the cluster
        // is no longer in the source after a re-shape. Fall back to a
        // 1-zoom bump on the tap point.
        cam.setCamera({
          centerCoordinate: feature.geometry.coordinates as [number, number],
          zoomLevel: 14,
          animationDuration: 350,
          animationMode: 'easeTo',
        });
      }
      onClusterTap?.();
    };

    // Color-filter active flag — pulled out for expression building below
    // so anchors don't accidentally inherit dimming and the saved-pins
    // expressions stay readable.
    const filterActive = colorFilter != null;

    return (
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          styleJSON={styleJSON}
          onMapLoadingError={handleMapLoadingError}
          onDidFinishLoadingMap={handleDidFinishLoadingMap}
          // Mapbox TOS audit 2026-05-17: Android requires the wordmark
          // unconditionally; iOS permits text-only substitute only if the
          // text includes a click-through link to mapbox.com (which the
          // @rnmapbox/maps v10 attribution renderer does not guarantee).
          // Cross-platform compliance → logo enabled on both. Resolves
          // the `[maps-android\MbxLogo]` runtime warning that fired 3×
          // per boot through Phase 1-9. See PROJECT_STATE.md cross-phase
          // entry "Mapbox MbxLogo".
          logoEnabled={true}
          attributionEnabled={true}
          compassEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
          gestureSettings={{
            panDecelerationFactor: 0,
            pinchZoomDecelerationEnabled: false,
            rotateDecelerationEnabled: false,
          }}
          onLongPress={handleLongPress}
          onPress={handleMapPress}
        >
          <Camera
            ref={cameraRef}
            zoomLevel={initialZoom}
            centerCoordinate={initialCenter}
            animationMode="flyTo"
            animationDuration={350}
          />

          {/* ----- ANCHOR PINS (own layer, never cluster) ------------------- */}
          <ShapeSource
            id="anchors-source"
            shape={anchorsCollection}
            cluster={false}
            onPress={(e) => {
              const f = e.features[0];
              const id = f?.properties?.['id'];
              if (typeof id === 'string') onPinTap?.(id);
            }}
          >
            {/* Background circle — indigo_soft for the "anchor" identity.
            Phase 4 placeholder for the locked rounded-square shape.
            Phase 7: 1.3× scale when selected (smaller bump than saved
            pins — anchors are reference points, not the user's content). */}
            <CircleLayer
              id="anchors-bg"
              minZoomLevel={12}
              style={{
                circleColor: palette.brand_indigo_soft,
                // Mapbox spec: [zoom] must be input to a TOP-LEVEL interpolate;
                // wrap selected-factor inside each stop output.
                circleRadius: [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  12,
                  ['case', ['==', ['get', 'selected'], true], 13, 10],
                  16,
                  ['case', ['==', ['get', 'selected'], true], 15.6, 12],
                ],
                circleStrokeColor: palette.brand_indigo_dark,
                circleStrokeWidth: ['case', ['==', ['get', 'selected'], true], 2.5, 1.5],
              }}
            />
            {/* White role glyph on top — scale up on select for symmetry */}
            <SymbolLayer
              id="anchors-icon"
              minZoomLevel={12}
              style={{
                iconImage: [
                  'match',
                  ['get', 'category'],
                  'HOME',
                  'home',
                  'WORK',
                  'work',
                  'SCHOOL',
                  'school',
                  'home',
                ],
                iconAllowOverlap: true,
                iconIgnorePlacement: true,
                iconSize: [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  12,
                  ['case', ['==', ['get', 'selected'], true], 0.715, 0.55],
                  16,
                  ['case', ['==', ['get', 'selected'], true], 0.845, 0.65],
                ],
              }}
            />
          </ShapeSource>

          {/* ----- SAVED PINS + CLUSTERS ------------------------------------ */}
          <ShapeSource
            ref={savedSourceRef}
            id="saved-source"
            shape={savedCollection}
            cluster={true}
            clusterRadius={30}
            clusterMaxZoomLevel={13}
            onPress={(e) => {
              const f = e.features[0];
              if (!f) return;
              const props = f.properties;
              if (props && typeof props['cluster_id'] === 'number') {
                void handleClusterTap(
                  f as unknown as GeoJSON.Feature<GeoJSON.Point, Record<string, unknown>>,
                );
              } else {
                const id = props?.['id'];
                if (typeof id === 'string') onPinTap?.(id);
              }
            }}
          >
            {/* Cluster bubble — D10 spec: 18px @ 80% opacity at zoom 12-13.
            Untouched by Phase 7 (clusters don't participate in select or
            filter — they're aggregates, not user content). */}
            <CircleLayer
              id="saved-clusters"
              filter={['has', 'point_count']}
              style={{
                circleColor: palette.brand_indigo,
                circleRadius: ['interpolate', ['linear'], ['zoom'], 12, 9, 13, 9, 14, 12],
                circleOpacity: ['interpolate', ['linear'], ['zoom'], 12, 0.8, 14, 1.0],
                circleStrokeColor: palette.brand_indigo_dark,
                circleStrokeWidth: 1.5,
              }}
            />
            <SymbolLayer
              id="saved-cluster-count"
              filter={['has', 'point_count']}
              style={{
                textField: ['get', 'point_count_abbreviated'],
                textFont: ['Pretendard Medium'],
                textSize: 11,
                textColor: '#FFFFFF',
                textAllowOverlap: true,
                textIgnorePlacement: true,
              }}
            />
            {/* Individual saved-pin background.
            Color: when filter active and pin matches → use tag color
              (or stay indigo for NONE-tag matches); else default indigo
              for unvisited, surface_base donut for visited.
            Opacity: 0.3 when dimmed (filter active + pin doesn't match);
              full otherwise.
            Radius: 1.5× when selected per D9 tap-to-expand. */}
            <CircleLayer
              id="saved-pins-bg"
              filter={['!', ['has', 'point_count']]}
              minZoomLevel={10}
              style={{
                circleColor: filterActive
                  ? [
                      'case',
                      ['==', ['get', 'dimmed'], true],
                      palette.brand_indigo,
                      [
                        'match',
                        ['get', 'color_tag'],
                        'RED',
                        COLOR_TAG_HEX.RED,
                        'ORANGE',
                        COLOR_TAG_HEX.ORANGE,
                        'YELLOW',
                        COLOR_TAG_HEX.YELLOW,
                        'GREEN',
                        COLOR_TAG_HEX.GREEN,
                        'BLUE',
                        COLOR_TAG_HEX.BLUE,
                        'PURPLE',
                        COLOR_TAG_HEX.PURPLE,
                        palette.brand_indigo,
                      ],
                    ]
                  : ['case', ['get', 'visited'], palette.surface_base, palette.brand_indigo],
                circleRadius: [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10,
                  ['case', ['==', ['get', 'selected'], true], 7.5, 5],
                  12,
                  ['case', ['==', ['get', 'selected'], true], 10.5, 7],
                  14,
                  ['case', ['==', ['get', 'selected'], true], 13.5, 9],
                  18,
                  ['case', ['==', ['get', 'selected'], true], 16.5, 11],
                ],
                circleOpacity: ['case', ['==', ['get', 'dimmed'], true], 0.3, 1.0],
                circleStrokeColor: palette.brand_indigo,
                circleStrokeWidth: [
                  'case',
                  ['==', ['get', 'selected'], true],
                  3.0,
                  ['get', 'visited'],
                  2.0,
                  1.5,
                ],
                circleStrokeOpacity: ['case', ['==', ['get', 'dimmed'], true], 0.3, 1.0],
              }}
            />
            {/* White category glyph — only on unvisited (sprite is white-only;
            visited "outlined indigo glyph" sprite variant descoped from
            Phase 7 — see header comment). Scales 1.5× on select. Dims
            with the rest of the pin via iconOpacity. */}
            <SymbolLayer
              id="saved-pins-icon"
              filter={['all', ['!', ['has', 'point_count']], ['!', ['get', 'visited']]]}
              minZoomLevel={12}
              style={{
                iconImage: [
                  'match',
                  ['get', 'category'],
                  'CAFE',
                  'cafe',
                  'RESTAURANT',
                  'restaurant',
                  'BAR',
                  'bar',
                  'SHOP',
                  'shop',
                  'LANDMARK',
                  'landmark',
                  'OTHER',
                  'other',
                  'other',
                ],
                iconAllowOverlap: true,
                iconIgnorePlacement: false,
                iconSize: [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10,
                  ['case', ['==', ['get', 'selected'], true], 0.33, 0.22],
                  12,
                  ['case', ['==', ['get', 'selected'], true], 0.48, 0.32],
                  14,
                  ['case', ['==', ['get', 'selected'], true], 0.675, 0.45],
                  16,
                  ['case', ['==', ['get', 'selected'], true], 0.75, 0.5],
                  18,
                  ['case', ['==', ['get', 'selected'], true], 0.825, 0.55],
                ],
                iconOpacity: ['case', ['==', ['get', 'dimmed'], true], 0.3, 1.0],
              }}
            />
          </ShapeSource>

          {/* ----- SEARCH OVERLAY (Naver results, pulsing per D11) ---------- */}
          {/* Phase 9: 1200ms ease-in-out alternate pulse on circleRadius +
            circleOpacity. Implementation toggles the values every 600ms;
            Mapbox's native paint transition smooths each step over 600ms
            so the perceived motion is a continuous ease. minZoomLevel
            12 honors D11 "search overlay hidden below district view". */}
          {searchCollection && (
            <ShapeSource
              id="search-source"
              shape={searchCollection}
              onPress={(e) => {
                const f = e.features[0];
                const id = f?.properties?.['id'];
                if (typeof id === 'string') onSearchResultTap?.(id);
              }}
            >
              <CircleLayer
                id="search-results"
                minZoomLevel={12}
                style={{
                  circleColor: palette.brand_indigo,
                  circleRadius: searchRadius,
                  circleRadiusTransition: { duration: 600, delay: 0 },
                  circleOpacity: searchOpacity,
                  circleOpacityTransition: { duration: 600, delay: 0 },
                  circleStrokeColor: palette.brand_indigo_dark,
                  circleStrokeWidth: 1.5,
                  circleStrokeOpacity: searchOpacity,
                  circleStrokeOpacityTransition: { duration: 600, delay: 0 },
                }}
              />
            </ShapeSource>
          )}
        </MapView>
        {tileError && (
          <View style={tileErrorStyles.banner} pointerEvents="box-none">
            <View style={tileErrorStyles.card}>
              <Text style={tileErrorStyles.title}>지도를 불러올 수 없어요</Text>
              <Text style={tileErrorStyles.message}>
                인터넷 연결을 확인하고 잠시 후 다시 시도해주세요.
              </Text>
              <Pressable
                onPress={dismissTileError}
                hitSlop={12}
                accessibilityLabel="닫기"
                style={tileErrorStyles.closeButton}
              >
                <Text style={tileErrorStyles.closeIcon}>✕</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  },
);

const tileErrorStyles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 120, // below the Phase 9 SearchBar at top: 56 (≈ 36px tall + margin)
    left: 16,
    right: 16,
  },
  card: {
    backgroundColor: '#FCE7E5',
    borderLeftWidth: 3,
    borderLeftColor: '#C04545',
    paddingVertical: 10,
    paddingHorizontal: 12,
    paddingRight: 36, // room for the absolute-positioned close button
    borderRadius: 4,
  },
  title: {
    color: '#7A2828',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    color: '#7A2828',
    fontSize: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 10,
  },
  closeIcon: {
    color: '#7A2828',
    fontSize: 14,
    fontWeight: '600',
  },
});

PersonalMap.displayName = 'PersonalMap';

// Re-export Mapbox so callers don't need to import @rnmapbox/maps directly
// just to call setAccessToken at app boot.
export { Mapbox };
