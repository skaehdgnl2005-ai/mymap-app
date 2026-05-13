// PersonalMap — base map renderer (Phase 4).
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
// Phase 4 deviations from the locked D10 marker spec (revisit at Phase 7,
// which already owns visited-state + anchor-shape concerns):
//   - Anchors render as larger circles in brand_indigo_soft. The locked
//     "rounded square" anchor shape needs a separate sprite atlas entry
//     (background composite per HOME/WORK/SCHOOL); not in the Phase 2
//     deliverable. Color difference (indigo_soft vs indigo) carries the
//     "anchor vs saved" distinction in the meantime.
//   - Visited pins render as a donut: surface_base fill + 2.0px indigo
//     stroke + no glyph. The locked "outlined indigo glyph" treatment
//     needs SDF sprites or per-category outlined variants. The white
//     glyph cannot be recolored at runtime against the current rasterized
//     sprite atlas — so it's hidden on visited pins until the sprite
//     pipeline produces the indigo variants.

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Appearance, type ColorSchemeName } from 'react-native';
import Mapbox, { Camera, CircleLayer, MapView, ShapeSource, SymbolLayer } from '@rnmapbox/maps';

import {
  type SavedPlace,
  type KakaoPlaceResult,
  kakaoResultToFeature,
  partitionPlaces,
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
// argument).
const PIN_LAYER_IDS = ['saved-pins-icon', 'anchors-icon'] as const;

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

interface Props {
  savedPlaces: SavedPlace[];
  searchResults?: KakaoPlaceResult[];
  /** Initial camera center as [lng, lat]. Defaults to Seoul City Hall. */
  initialCenter?: [number, number];
  /** Initial zoom level. Defaults to 14. */
  initialZoom?: number;
  onPinTap?: (placeId: string) => void;
  onPinLongPress?: (placeId: string) => void;
  onClusterTap?: (clusterId: number) => void;
  onSearchResultTap?: (resultId: string) => void;
}

// Imperative handle exposed via forwardRef. Used by App.tsx to fly the
// camera to a freshly-saved pin so the user can visually confirm the
// save (D7 polish surfaced during Phase 5 Track A founder smoke-test).
export interface PersonalMapHandle {
  flyTo: (coords: [number, number], opts?: { zoom?: number; duration?: number }) => void;
}

export const PersonalMap = forwardRef<PersonalMapHandle, Props>(({
  savedPlaces,
  searchResults,
  initialCenter = SEOUL_CENTER,
  initialZoom = 14,
  onPinTap,
  onPinLongPress,
  onClusterTap,
  onSearchResultTap,
}, ref) => {
  // ----- Light/dark style switching (D8 lock: two separate JSONs) --------
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme: cs }) => setColorScheme(cs));
    return () => sub.remove();
  }, []);
  const isDark = colorScheme === 'dark';
  const styleJSON = isDark ? STYLE_JSON_DARK : STYLE_JSON_LIGHT;
  const palette = isDark ? COLORS.dark : COLORS.light;

  // ----- Partition saved pins from anchors (anchors don't cluster) -------
  const { anchorsCollection, savedCollection } = useMemo(
    () => partitionPlaces(savedPlaces),
    [savedPlaces],
  );

  // ----- Search overlay collection (Kakao results, transient) ------------
  const searchCollection = useMemo(() => {
    if (!searchResults || searchResults.length === 0) return null;
    return {
      type: 'FeatureCollection' as const,
      features: searchResults.map(kakaoResultToFeature),
    };
  }, [searchResults]);

  // ----- Long-press → query rendered features for pin id -----------------
  const mapRef = useRef<MapView>(null);
  const cameraRef = useRef<Camera>(null);

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
    }),
    [],
  );

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

  return (
    <MapView
      ref={mapRef}
      style={{ flex: 1 }}
      styleJSON={styleJSON}
      logoEnabled={false}
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
            Phase 4 placeholder for the locked rounded-square shape. */}
        <CircleLayer
          id="anchors-bg"
          minZoomLevel={12}
          style={{
            circleColor: palette.brand_indigo_soft,
            circleRadius: ['interpolate', ['linear'], ['zoom'], 12, 10, 16, 12],
            circleStrokeColor: palette.brand_indigo_dark,
            circleStrokeWidth: 1.5,
          }}
        />
        {/* White role glyph on top */}
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
            iconSize: ['interpolate', ['linear'], ['zoom'], 12, 0.55, 16, 0.65],
          }}
        />
      </ShapeSource>

      {/* ----- SAVED PINS + CLUSTERS ------------------------------------ */}
      <ShapeSource
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
            onClusterTap?.(props['cluster_id']);
          } else {
            const id = props?.['id'];
            if (typeof id === 'string') onPinTap?.(id);
          }
        }}
      >
        {/* Cluster bubble — D10 spec: 18px @ 80% opacity at zoom 12-13 */}
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
        {/* Individual saved-pin background — filled indigo for unvisited;
            surface_base "donut" for visited per Phase 4 deviation note. */}
        <CircleLayer
          id="saved-pins-bg"
          filter={['!', ['has', 'point_count']]}
          minZoomLevel={10}
          style={{
            circleColor: ['case', ['get', 'visited'], palette.surface_base, palette.brand_indigo],
            circleRadius: ['interpolate', ['linear'], ['zoom'], 10, 5, 12, 7, 14, 9, 18, 11],
            circleStrokeColor: palette.brand_indigo,
            circleStrokeWidth: ['case', ['get', 'visited'], 2.0, 1.5],
          }}
        />
        {/* White category glyph — only on unvisited (sprite is white-only;
            visited needs an indigo variant we don't have yet). */}
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
            iconSize: ['interpolate', ['linear'], ['zoom'], 10, 0.22, 12, 0.32, 14, 0.45, 16, 0.5, 18, 0.55],
          }}
        />
      </ShapeSource>

      {/* ----- SEARCH OVERLAY (Kakao results, no pulse animation v1) ---- */}
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
              circleRadius: 8,
              circleOpacity: 0.6,
              circleStrokeColor: palette.brand_indigo_dark,
              circleStrokeWidth: 1.5,
            }}
          />
        </ShapeSource>
      )}
    </MapView>
  );
});

PersonalMap.displayName = 'PersonalMap';

// Re-export Mapbox so callers don't need to import @rnmapbox/maps directly
// just to call setAccessToken at app boot.
export { Mapbox };
