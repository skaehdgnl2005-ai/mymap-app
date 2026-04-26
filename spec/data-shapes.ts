/**
 * Data shapes for the personal-curated-map app (v1).
 *
 * - SavedPlace: the canonical user-data type from D6.
 *               15 fields, provider-agnostic (Supabase Postgres or Firestore).
 * - savedPlaceToGeoJSONFeature: mechanical mapping into a GeoJSON Feature
 *                               for Mapbox/MapLibre source consumption.
 * - GeoJSON FeatureCollection helpers for cluster sources and anchor sources.
 *
 * Critical correctness note: GeoJSON coordinates are [lng, lat] order.
 * Inverting them is the most common silent bug in map integration code —
 * pins render in the wrong country with no error message. Codify the
 * conversion here to remove the failure mode entirely.
 */

// ----- Domain types ------------------------------------------------------

export type SavedPlaceCategory =
  | 'CAFE'
  | 'RESTAURANT'
  | 'BAR'
  | 'SHOP'
  | 'LANDMARK'
  | 'HOME'
  | 'SCHOOL'
  | 'WORK'
  | 'OTHER';

export type ColorTag =
  | 'NONE'
  | 'RED'
  | 'ORANGE'
  | 'YELLOW'
  | 'GREEN'
  | 'BLUE'
  | 'PURPLE';

export type OgFetchStatus = 'OK' | 'FAILED' | 'GATED' | null;

export interface SavedPlace {
  id: string;                       // uuid
  user_id: string;                  // uuid

  // core
  name: string;                     // KR primary; "스타벅스 성수점"
  lat: number;
  lng: number;
  category: SavedPlaceCategory;

  // memory (the source_url + OG cache fields are the v1 magic)
  source_url: string | null;        // the Instagram/blog/Naver-Place URL
  og_title: string | null;
  og_image_url: string | null;
  og_description: string | null;
  og_fetched_at: string | null;     // ISO timestamp; null = never tried
  og_fetch_status: OgFetchStatus;
  note: string | null;              // user note, ~200 char client-enforced
  visited: boolean;                 // default false
  color_tag: ColorTag;              // default NONE

  // location context
  address: string | null;           // cached from Kakao reverse-geocode
  region: string | null;            // dong-level: "성수동", "망원동"

  // timestamps
  saved_at: string;                 // ISO
  visited_at: string | null;        // ISO
}

// ----- Anchor convenience type -------------------------------------------
// HOME / SCHOOL / WORK are SavedPlace records with anchor categories.
// This is a type-narrowing helper for the renderer, NOT a separate table.

export type AnchorCategory = 'HOME' | 'SCHOOL' | 'WORK';
export const ANCHOR_CATEGORIES: AnchorCategory[] = ['HOME', 'SCHOOL', 'WORK'];

export const isAnchor = (p: SavedPlace): p is SavedPlace & { category: AnchorCategory } =>
  ANCHOR_CATEGORIES.includes(p.category as AnchorCategory);

// ----- GeoJSON shapes (subset of geojson types we need) ------------------

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat] — see correctness note above
}

export interface GeoJSONFeature<P = Record<string, unknown>> {
  type: 'Feature';
  geometry: GeoJSONPoint;
  properties: P;
}

export interface GeoJSONFeatureCollection<P = Record<string, unknown>> {
  type: 'FeatureCollection';
  features: GeoJSONFeature<P>[];
}

// ----- Mapping: SavedPlace -> GeoJSONFeature -----------------------------

/**
 * Properties exposed to the Mapbox/MapLibre symbol layer.
 * Use these for data-driven styling expressions in the Style JSON.
 *
 * Example expression: ["case", ["get", "visited"], "outlined-pin", "filled-pin"]
 */
export interface PinFeatureProperties {
  id: string;
  name: string;
  category: SavedPlaceCategory;
  visited: boolean;
  color_tag: ColorTag;
  region: string | null;
  // og_image_url is not exposed to the map renderer (popover-only data)
  // source_url is not exposed to the map renderer (popover-only data)
}

export const savedPlaceToGeoJSONFeature = (
  place: SavedPlace,
): GeoJSONFeature<PinFeatureProperties> => ({
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [place.lng, place.lat], // CORRECT ORDER: lng first
  },
  properties: {
    id: place.id,
    name: place.name,
    category: place.category,
    visited: place.visited,
    color_tag: place.color_tag,
    region: place.region,
  },
});

export const savedPlacesToFeatureCollection = (
  places: SavedPlace[],
): GeoJSONFeatureCollection<PinFeatureProperties> => ({
  type: 'FeatureCollection',
  features: places.map(savedPlaceToGeoJSONFeature),
});

// ----- Splitter: separate anchors from regular saved pins ----------------
// The renderer uses two ShapeSources (anchors don't cluster per D10);
// this splitter produces both feature collections from a single SavedPlace[].

export const partitionPlaces = (places: SavedPlace[]) => {
  const anchors: SavedPlace[] = [];
  const saved: SavedPlace[] = [];
  for (const p of places) {
    if (isAnchor(p)) anchors.push(p);
    else saved.push(p);
  }
  return {
    anchorsCollection: savedPlacesToFeatureCollection(anchors),
    savedCollection: savedPlacesToFeatureCollection(saved),
  };
};

// ----- Kakao search result -> temporary overlay feature ------------------
// Search results from Kakao are NOT SavedPlace records yet; they're transient.
// Render them via a separate ShapeSource and remove on dismiss.

export interface KakaoPlaceResult {
  id: string;            // Kakao place id
  place_name: string;
  category_name: string; // Kakao category text, e.g., "음식점 > 한식 > 곱창"
  x: string;             // Kakao returns coords as strings; lng
  y: string;             // lat
  address_name: string;
  road_address_name: string | null;
}

export const kakaoResultToFeature = (
  result: KakaoPlaceResult,
): GeoJSONFeature<{ id: string; name: string; category_text: string }> => ({
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [parseFloat(result.x), parseFloat(result.y)], // [lng, lat]
  },
  properties: {
    id: result.id,
    name: result.place_name,
    category_text: result.category_name,
  },
});

// ----- Map Kakao category text to SavedPlaceCategory ---------------------
// Kakao returns hierarchical category strings like "음식점 > 카페 > 커피전문점".
// Best-effort heuristic mapping; user can override category at save time.

export const inferCategoryFromKakao = (
  kakaoCategory: string,
): SavedPlaceCategory => {
  const c = kakaoCategory.toLowerCase();
  if (c.includes('카페') || c.includes('coffee') || c.includes('cafe')) return 'CAFE';
  if (c.includes('술집') || c.includes('주점') || c.includes('바') || c.includes('펍')) return 'BAR';
  if (c.includes('음식점') || c.includes('식당') || c.includes('레스토랑')) return 'RESTAURANT';
  if (c.includes('쇼핑') || c.includes('상점') || c.includes('매장') || c.includes('편의점')) return 'SHOP';
  if (c.includes('관광') || c.includes('명소') || c.includes('문화')) return 'LANDMARK';
  return 'OTHER';
};
