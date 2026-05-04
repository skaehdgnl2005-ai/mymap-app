// Phase 4 dev fixture — drives PersonalMap before Phase 5 wires up the
// real save flow + Phase 6 wires up auth. Coordinates are real Seoul
// locations so the rendering verification matches what a user would see.
//
// Composition (matches Phase 4 doc step 5):
//   3 anchors  (HOME 강남, WORK 성수, SCHOOL 신촌)
//   5 saved    (cafes / restaurants / a bar in 성수동)
//   2 visited  (one cafe, one restaurant — exercises the donut state)
//
// All 9 categories appear at least once across the set so the sprite
// rendering verification can hit every glyph.

import type { SavedPlace } from '../../spec/data-shapes';

const NOW = '2026-05-03T00:00:00.000Z';
const MOCK_USER = '00000000-0000-0000-0000-000000000001';

const place = (
  overrides: Partial<SavedPlace> & Pick<SavedPlace, 'id' | 'name' | 'lat' | 'lng' | 'category'>,
): SavedPlace => ({
  user_id: MOCK_USER,
  source_url: null,
  og_title: null,
  og_image_url: null,
  og_description: null,
  og_fetched_at: null,
  og_fetch_status: null,
  note: null,
  visited: false,
  color_tag: 'NONE',
  address: null,
  region: null,
  saved_at: NOW,
  visited_at: null,
  ...overrides,
});

export const MOCK_PLACES: SavedPlace[] = [
  // ----- Anchors -----------------------------------------------------------
  place({
    id: 'anchor-home',
    name: '집 (강남)',
    lat: 37.498,
    lng: 127.0276,
    category: 'HOME',
    region: '강남구',
  }),
  place({
    id: 'anchor-work',
    name: '회사 (성수)',
    lat: 37.5446,
    lng: 127.0557,
    category: 'WORK',
    region: '성수동',
  }),
  place({
    id: 'anchor-school',
    name: '학교 (신촌)',
    lat: 37.5594,
    lng: 126.9425,
    category: 'SCHOOL',
    region: '신촌동',
  }),

  // ----- Saved places in 성수동 -------------------------------------------
  place({
    id: 'saved-cafe-1',
    name: '대림창고',
    lat: 37.5435,
    lng: 127.0556,
    category: 'CAFE',
    region: '성수동',
  }),
  place({
    id: 'saved-rest-1',
    name: '소문난성수감자탕',
    lat: 37.5447,
    lng: 127.0588,
    category: 'RESTAURANT',
    region: '성수동',
  }),
  place({
    id: 'saved-bar-1',
    name: '성수동 펍',
    lat: 37.5462,
    lng: 127.0601,
    category: 'BAR',
    region: '성수동',
  }),
  place({
    id: 'saved-shop-1',
    name: '아더에러 성수',
    lat: 37.5429,
    lng: 127.0566,
    category: 'SHOP',
    region: '성수동',
  }),
  place({
    id: 'saved-landmark-1',
    name: '서울숲',
    lat: 37.5446,
    lng: 127.0376,
    category: 'LANDMARK',
    region: '성수동',
  }),
  place({
    id: 'saved-other-1',
    name: '기타 장소',
    lat: 37.5419,
    lng: 127.0531,
    category: 'OTHER',
    region: '성수동',
  }),

  // ----- Visited (donut state) --------------------------------------------
  place({
    id: 'visited-cafe-1',
    name: '블루보틀 성수',
    lat: 37.5421,
    lng: 127.0518,
    category: 'CAFE',
    region: '성수동',
    visited: true,
    visited_at: '2026-04-20T15:00:00.000Z',
  }),
  place({
    id: 'visited-rest-1',
    name: '성수족발',
    lat: 37.5453,
    lng: 127.0573,
    category: 'RESTAURANT',
    region: '성수동',
    visited: true,
    visited_at: '2026-04-15T19:30:00.000Z',
  }),
];
