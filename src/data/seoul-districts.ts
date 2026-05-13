// Seoul 25 자치구 (gu) list. Used by Step 1 onboarding's RegionPicker.
//
// v1 scope decision (2026-05-13): Seoul-only hardcoded list. Phase 5
// validation persona (founder + friend) are both Seoul-based; v1 success
// criteria target cohort (30 users by week 4) likely overlaps heavily with
// Seoul Gen-Z. Non-Seoul beta users surface as the trigger for a Phase 10
// expansion to full Korea (행정안전부 행정구역 dataset bundled OR
// Supabase-hosted on-demand fetch).
//
// 동 (dong) intentionally NOT hardcoded here. Seoul has ~467 동 with
// non-trivial centroid data sourcing. Instead, the picker uses Naver
// Local Search with the selected 구 as a query prefix — user types "성수"
// → search "성수 성동구" → Naver returns places in 성수동, user picks any
// to anchor the HOME pin to a recognizable spot (역, 카페, 학교, etc).
// This sidesteps the 동-centroid data problem while matching the wedge
// purpose (anchor's job is "distance gauge", not exact dong polygon).

export const SEOUL_DISTRICTS = [
  '강남구',
  '강동구',
  '강북구',
  '강서구',
  '관악구',
  '광진구',
  '구로구',
  '금천구',
  '노원구',
  '도봉구',
  '동대문구',
  '동작구',
  '마포구',
  '서대문구',
  '서초구',
  '성동구',
  '성북구',
  '송파구',
  '양천구',
  '영등포구',
  '용산구',
  '은평구',
  '종로구',
  '중구',
  '중랑구',
] as const;

export type SeoulDistrict = (typeof SEOUL_DISTRICTS)[number];
