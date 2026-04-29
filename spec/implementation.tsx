/**
 * Reference @rnmapbox/maps integration for the v1 spec.
 *
 * This is INTEGRATION DOCUMENTATION — declarative, not application code.
 * Drop into a React Native project, replace placeholders, and the map
 * renders with all locked decisions intact.
 *
 * Placeholders to replace before runtime:
 *   __MAPBOX_PUBLIC_TOKEN__   → from account.mapbox.com/access-tokens
 *   __STYLE_LIGHT_URL__       → URL to style-light.json (after upload to R2/Supabase)
 *   __STYLE_DARK_URL__        → URL to style-dark.json
 *
 * Style JSONs already reference self-hosted sprite + glyph URLs internally
 * (Phase 2 wired these to the R2 public bucket; see PROJECT_STATE.md
 * "Phase 2: Asset hosting" entry for the bucket + URL convention).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import Mapbox, {
  Camera,
  MapView,
  ShapeSource,
  SymbolLayer,
  CircleLayer,
} from '@rnmapbox/maps';

import {
  SavedPlace,
  partitionPlaces,
  KakaoPlaceResult,
  kakaoResultToFeature,
} from './data-shapes';

Mapbox.setAccessToken('__MAPBOX_PUBLIC_TOKEN__');

const STYLE_URL_LIGHT = '__STYLE_LIGHT_URL__';
const STYLE_URL_DARK = '__STYLE_DARK_URL__';

const SEOUL_CENTER: [number, number] = [126.9780, 37.5665]; // [lng, lat]

interface Props {
  savedPlaces: SavedPlace[];
  searchResults?: KakaoPlaceResult[]; // optional Kakao overlay
  onPinTap?: (placeId: string) => void;
  onPinLongPress?: (placeId: string) => void;
  onClusterTap?: (clusterId: number) => void;
  onSearchResultTap?: (resultId: string) => void;
}

export const PersonalMap: React.FC<Props> = ({
  savedPlaces,
  searchResults,
  onPinTap,
  onPinLongPress,
  onClusterTap,
  onSearchResultTap,
}) => {
  // ----- Light/dark style switching (D11 lock: two separate JSONs) -------
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme(),
  );
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme: cs }) => setColorScheme(cs));
    return () => sub.remove();
  }, []);
  const styleURL = colorScheme === 'dark' ? STYLE_URL_DARK : STYLE_URL_LIGHT;

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

  return (
    <MapView
      style={{ flex: 1 }}
      styleURL={styleURL}
      logoEnabled={false}        // Mapbox logo handled per attribution rules
      attributionEnabled={true}  // legally required; positioned bottom-right by default
      compassEnabled={false}
      pitchEnabled={false}        // 2D only in v1 per D9
      rotateEnabled={false}       // disabled per D11 lock (re-enable in settings v1.5)
    >
      <Camera
        zoomLevel={14}
        centerCoordinate={SEOUL_CENTER}
        animationMode="flyTo"
        animationDuration={350}
      />

      {/* ----- ANCHOR PINS (own layer, never cluster, z-order above saved) ----- */}
      <ShapeSource
        id="anchors-source"
        shape={anchorsCollection}
        cluster={false}
      >
        <SymbolLayer
          id="anchors-layer"
          minZoomLevel={12}
          style={{
            iconImage: [
              'match',
              ['get', 'category'],
              'HOME', 'home',
              'WORK', 'work',
              'SCHOOL', 'school',
              'home',
            ],
            iconAllowOverlap: true,
            iconIgnorePlacement: true,
            iconSize: [
              'interpolate',
              ['linear'],
              ['zoom'],
              12, 0.85,
              16, 1.0,
            ],
          }}
        />
      </ShapeSource>

      {/* ----- SAVED PIN CLUSTERS (zoom 12-13 only) ----- */}
      <ShapeSource
        id="saved-source"
        shape={savedCollection}
        cluster={true}
        clusterRadius={30}
        clusterMaxZoomLevel={13}
        onPress={(e) => {
          const f = e.features[0];
          if (!f) return;
          if (f.properties?.cluster) {
            onClusterTap?.(f.properties.cluster_id as number);
          } else {
            onPinTap?.(f.properties?.id as string);
          }
        }}
      >
        {/* Cluster bubbles — D10 spec: 18px @ 80% opacity at zoom 12-13 */}
        <CircleLayer
          id="saved-clusters"
          filter={['has', 'point_count']}
          style={{
            circleColor: colorScheme === 'dark' ? '#6B68C8' : '#2D2A6B',
            circleRadius: [
              'interpolate',
              ['linear'],
              ['zoom'],
              12, 9,
              13, 9,
              14, 12, // 24px diameter at zoom 14+ if any clusters survive
            ],
            circleOpacity: [
              'interpolate',
              ['linear'],
              ['zoom'],
              12, 0.8,
              14, 1.0,
            ],
            circleStrokeColor: colorScheme === 'dark' ? '#1B1A18' : '#1A1850',
            circleStrokeWidth: 1.5,
          }}
        />
        {/* Cluster count text */}
        <SymbolLayer
          id="saved-cluster-count"
          filter={['has', 'point_count']}
          style={{
            textField: ['get', 'point_count_abbreviated'], // Mapbox auto-abbreviates
            textFont: ['Pretendard Medium'],
            textSize: 11,
            textColor: '#FFFFFF',
            textAllowOverlap: true,
            textIgnorePlacement: true,
          }}
        />
        {/* Individual saved pins (zoom 14+) */}
        <SymbolLayer
          id="saved-pins"
          filter={['!', ['has', 'point_count']]}
          minZoomLevel={14}
          style={{
            iconImage: [
              'case',
              ['get', 'visited'],
              ['concat', ['get', 'category'], '-outlined'],
              ['get', 'category'],
            ],
            iconAllowOverlap: true,
            iconIgnorePlacement: false,
            iconSize: [
              'interpolate',
              ['linear'],
              ['zoom'],
              14, 0.85,
              16, 1.0,
              18, 1.1,
            ],
          }}
        />
      </ShapeSource>

      {/* ----- SEARCH OVERLAY (Kakao results, pulsing) ----- */}
      {searchCollection && (
        <ShapeSource
          id="search-source"
          shape={searchCollection}
          onPress={(e) => {
            const f = e.features[0];
            if (f) onSearchResultTap?.(f.properties?.id as string);
          }}
        >
          <CircleLayer
            id="search-results"
            minZoomLevel={12}
            style={{
              circleColor: colorScheme === 'dark' ? '#6B68C8' : '#2D2A6B',
              circleRadius: 8,
              circleOpacity: 0.6,
              circleStrokeColor: colorScheme === 'dark' ? '#1B1A18' : '#1A1850',
              circleStrokeWidth: 1.5,
              // NOTE: pulse animation is achieved via a paint property animation
              // loop driven from JS — see useSearchPulse() hook below
            }}
          />
        </ShapeSource>
      )}
    </MapView>
  );
};

/**
 * useSearchPulse — drives the 1.2s pulse animation on the search overlay.
 *
 * @rnmapbox/maps doesn't support keyframe animations declaratively; you
 * mutate paint properties on a timer instead. Standard pattern.
 *
 * Hook into the map ref's setLayerProperty in your parent component:
 *   useEffect(() => {
 *     const id = setInterval(() => {
 *       const opacity = 0.4 + 0.4 * Math.abs(Math.sin(Date.now() / 600));
 *       mapRef.current?.setLayerProperty('search-results', 'circleOpacity', opacity);
 *     }, 33); // ~30fps
 *     return () => clearInterval(id);
 *   }, [searchResults]);
 */

// ----- Long-press hook (quick-action menu trigger per D11) ---------------
// Mapbox doesn't expose long-press directly; wrap MapView in a Pressable
// or use react-native-gesture-handler's LongPressGestureHandler.
// Detect tapped pin via mapRef.current.queryRenderedFeaturesAtPoint(event.point).

/* Example wiring in the parent:

const handleLongPress = async (event: GestureResponderEvent) => {
  const { locationX, locationY } = event.nativeEvent;
  const features = await mapRef.current?.queryRenderedFeaturesAtPoint(
    [locationX, locationY],
    null, // any expression filter
    ['saved-pins', 'anchors-layer'],
  );
  if (features?.features[0]) {
    onPinLongPress?.(features.features[0].properties?.id);
  }
};

*/
