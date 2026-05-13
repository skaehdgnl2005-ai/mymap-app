// Save modal for the share-intent / clipboard save flow (Phase 5).
//
// Bare-bones intentionally — Phase 8 ships the Toss-style polish. Phase 5's
// job is "do all paths work end-to-end?" so the friend-demo can validate
// the wedge thesis without polish hiding a bug.
//
// Two branches per DESIGN.md § D7:
// - AUTO_RESOLVE: try resolvePlaceFromUrl on mount; if it returns a place,
//   show a single big save card. If it fails or returns null, fall through
//   to the manual search UI.
// - MANUAL_RESOLVE: open a search field; live Kakao keyword search with
//   300ms debounce; user picks; save.
//
// The "fall through" is important — Naver Place URLs that don't OG-resolve
// cleanly (e.g. SPA shells, redirects) shouldn't dead-end the user.
//
// Korean copy locked per phase-5-save-flow-validation.md. Modal title
// uses "자국" brand per the 2026-05-04 brand lock.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { KakaoPlaceResult, SavedPlace, SavedPlaceCategory } from '../../spec/data-shapes';
import { inferCategoryFromKakao } from '../../spec/data-shapes';

// User-selectable categories in the save-flow modal (non-anchor only — anchors
// are set in Phase 6 onboarding, not via share-flow). Order = visual chip
// order. CAFE first because Instagram-cafe-screenshot is the wedge primary.
const SAVE_FLOW_CATEGORIES: SavedPlaceCategory[] = [
  'CAFE',
  'RESTAURANT',
  'BAR',
  'SHOP',
  'LANDMARK',
  'OTHER',
];

// Korean label rendered on each chip.
const CATEGORY_LABELS: Record<SavedPlaceCategory, string> = {
  CAFE: '카페',
  RESTAURANT: '식당',
  BAR: '술집',
  SHOP: '가게',
  LANDMARK: '명소',
  OTHER: '기타',
  HOME: '집',
  SCHOOL: '학교',
  WORK: '회사',
};

// Keyword appended to the Naver search query to narrow results by category.
// Empty string = don't append (LANDMARK and OTHER have no specific Korean
// keyword that helps Naver narrow; for those the chip only affects the
// saved place's category, not the search).
const CATEGORY_SEARCH_KEYWORDS: Record<SavedPlaceCategory, string> = {
  CAFE: '카페',
  RESTAURANT: '식당',
  BAR: '술집',
  SHOP: '가게',
  LANDMARK: '',
  OTHER: '',
  HOME: '',
  SCHOOL: '',
  WORK: '',
};
// Provider client swap per DESIGN.md D5b (Kakao Local API blocked by
// 사업자 등록 access constraint at v1; Naver Open API used as v1
// fallback). When biz-reg becomes viable, swap this line back to
// '../kakao/client' (kakao client preserved in repo for that path)
// and revert function calls below: naverSearchByKeyword →
// kakaoSearchByKeyword.
import { naverSearchByKeyword, resolvePlaceFromUrl } from '../naver/client';
import { savePlace, type NewSavedPlace } from '../places/repo';
import type { ClassifiedUrl } from './url-classifier';

interface Props {
  visible: boolean;
  url: ClassifiedUrl;
  userId: string;
  onClose: () => void;
  onSaved: (place: SavedPlace) => void;
}

type Phase = 'idle' | 'resolving' | 'auto-resolved' | 'manual' | 'saving';

export const SaveModal: React.FC<Props> = ({ visible, url, userId, onClose, onSaved }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [resolved, setResolved] = useState<KakaoPlaceResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<KakaoPlaceResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Category prefilter for MANUAL_RESOLVE — added 2026-05-11 after Phase 5
  // Track A founder smoke-test surfaced friction with Naver's 5-result hard
  // cap when place names are ambiguous (e.g. "어니언" matches cafes + bars).
  // Picking a category up-front (a) narrows Naver via keyword append, and
  // (b) sets the saved place's category in one step (Toss principle: every
  // tap does work). Default CAFE per wedge primary case.
  const [selectedCategory, setSelectedCategory] = useState<SavedPlaceCategory>('CAFE');

  // Lifecycle: when the modal becomes visible, kick off resolution per
  // the URL's strategy. Reset state when it closes so reopening with a
  // different URL doesn't show stale data.
  //
  // Dep is url.raw (a string), NOT the whole url object. The parent
  // (App.tsx) recomputes the ClassifiedUrl via useMemo when share-intent
  // ticks, so the object identity changes between renders even when the
  // raw URL is unchanged — depending on the whole object would re-fire
  // this effect mid-flow and silently clear any error/result state set
  // by a previous run (e.g. a Kakao 403 error gets wiped before the user
  // sees it). url.strategy is derived from url.raw, so url.raw is a
  // sufficient key.
  const urlRaw = url.raw;
  const urlStrategy = url.strategy;
  useEffect(() => {
    if (!visible) {
      setPhase('idle');
      setResolved(null);
      setSearchQuery('');
      setResults([]);
      setError(null);
      return;
    }
    if (urlStrategy === 'AUTO_RESOLVE') {
      setPhase('resolving');
      resolvePlaceFromUrl(urlRaw)
        .then((r) => {
          if (r.error) {
            // Hard error (network etc.) — surface, but allow fallback.
            setError(r.error.message);
            setPhase('manual');
            return;
          }
          if (r.data) {
            setResolved(r.data);
            setPhase('auto-resolved');
          } else {
            // OG fetch failed/gated or zero Kakao results — fall through.
            setPhase('manual');
          }
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : String(e));
          setPhase('manual');
        });
    } else {
      setPhase('manual');
    }
  }, [visible, urlRaw, urlStrategy]);

  // Debounced Naver keyword search for the manual path. Category keyword
  // appended to query when a narrowing keyword exists (CAFE/RESTAURANT/
  // BAR/SHOP). LANDMARK/OTHER skip the append — those don't have a single
  // Korean keyword that helps Naver disambiguate.
  useEffect(() => {
    if (phase !== 'manual') return;
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const categoryKw = CATEGORY_SEARCH_KEYWORDS[selectedCategory];
    const queryForNaver = categoryKw ? `${trimmed} ${categoryKw}` : trimmed;
    const handle = setTimeout(() => {
      naverSearchByKeyword(queryForNaver).then((r) => {
        if (r.error) {
          setError(r.error.message);
          setResults([]);
        } else {
          setResults(r.data);
        }
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [searchQuery, phase, selectedCategory]);

  const handleSave = async (place: KakaoPlaceResult): Promise<void> => {
    setPhase('saving');
    setError(null);
    const insert: NewSavedPlace = {
      user_id: userId,
      name: place.place_name,
      lat: parseFloat(place.y),
      lng: parseFloat(place.x),
      // AUTO_RESOLVE path: infer category from Naver's category_name field
      // (preserves vendor signal for share-sheet auto-resolution from
      // Naver/Kakao Place URLs). MANUAL_RESOLVE path: use the user-picked
      // chip — they already declared category in step 1 of the modal.
      category:
        url.strategy === 'AUTO_RESOLVE'
          ? inferCategoryFromKakao(place.category_name)
          : selectedCategory,
      source_url: url.raw,
      og_title: null,
      og_image_url: null,
      og_description: null,
      og_fetched_at: null,
      og_fetch_status: null,
      note: null,
      address: place.address_name,
      region: null, // Phase 6 will populate via reverse-geocode
      visited_at: null,
    };
    const r = await savePlace(insert);
    if (r.error) {
      setError(r.error.message);
      // Reopen the previous phase so the user can retry.
      setPhase(url.strategy === 'AUTO_RESOLVE' && resolved ? 'auto-resolved' : 'manual');
      return;
    }
    onSaved(r.data);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>자국에 저장하기</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>닫기</Text>
          </Pressable>
        </View>

        <SourceUrlChip url={url.raw} />

        {/* Error banner placed BEFORE phase-conditional UI so it's always
            visible. Previously rendered after <FlatList> in the manual
            phase, which the FlatList's default flex behavior pushed
            off-screen — the user could trigger a Kakao 403 / network
            failure and see no error feedback. Banner placement makes
            errors first-class regardless of save-flow phase. */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {phase === 'resolving' && (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>장소를 찾는 중…</Text>
          </View>
        )}

        {phase === 'auto-resolved' && resolved && (
          <ResolvedCard place={resolved} onSave={() => handleSave(resolved)} />
        )}

        {phase === 'saving' && (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.muted}>저장 중…</Text>
          </View>
        )}

        {phase === 'manual' && (
          <ManualSearchView
            query={searchQuery}
            onQueryChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            results={results}
            onPick={handleSave}
          />
        )}
      </View>
    </Modal>
  );
};

const SourceUrlChip: React.FC<{ url: string }> = ({ url }) => (
  <View style={styles.chip}>
    <Text style={styles.chipText} numberOfLines={1}>
      {url}
    </Text>
  </View>
);

const ResolvedCard: React.FC<{ place: KakaoPlaceResult; onSave: () => void }> = ({
  place,
  onSave,
}) => (
  <Pressable style={styles.bigCard} onPress={onSave}>
    <Text style={styles.cardName}>{place.place_name}</Text>
    <Text style={styles.cardAddr}>{place.address_name}</Text>
    <View style={styles.saveRow}>
      <Text style={styles.saveBtn}>저장</Text>
    </View>
  </Pressable>
);

interface ManualSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  selectedCategory: SavedPlaceCategory;
  onCategoryChange: (c: SavedPlaceCategory) => void;
  results: KakaoPlaceResult[];
  onPick: (p: KakaoPlaceResult) => void;
}

const ManualSearchView: React.FC<ManualSearchProps> = ({
  query,
  onQueryChange,
  selectedCategory,
  onCategoryChange,
  results,
  onPick,
}) => {
  const inputRef = useRef<TextInput>(null);
  // Auto-focus when the manual phase mounts so the user goes straight to typing.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const empty = useMemo(() => query.trim().length === 0, [query]);

  return (
    <>
      <Text style={styles.subtitle}>이 장소의 분야를 골라주세요</Text>
      <View style={styles.chipRow}>
        {SAVE_FLOW_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <Pressable
              key={cat}
              style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
              onPress={() => onCategoryChange(cat)}
              hitSlop={4}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  isSelected && styles.categoryChipTextSelected,
                ]}
              >
                {CATEGORY_LABELS[cat]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        ref={inputRef}
        value={query}
        onChangeText={onQueryChange}
        placeholder="예: 어니언 성수, 블루보틀"
        placeholderTextColor="#9A9A95"
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <FlatList
        data={results}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={styles.resultRow} onPress={() => onPick(item)}>
            <Text style={styles.resultName}>{item.place_name}</Text>
            <Text style={styles.resultAddr}>{item.address_name}</Text>
            <Text style={styles.resultCat}>{item.category_name}</Text>
          </Pressable>
        )}
        ListEmptyComponent={empty ? null : <Text style={styles.muted}>검색 결과가 없습니다.</Text>}
        ListFooterComponent={
          // Kakao TOS requires attribution when using their API output.
          <Text style={styles.attribution}>Powered by Naver</Text>
        }
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 56, // safe-area-ish; Phase 8 swaps for SafeAreaView
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1850',
  },
  close: {
    fontSize: 14,
    color: '#6B6B6B',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B6B6B',
    marginTop: 12,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#FAFAFA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 12,
  },
  chipText: {
    fontSize: 12,
    color: '#6B6B6B',
  },
  bigCard: {
    backgroundColor: '#FAFAFA',
    padding: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1850',
  },
  cardAddr: {
    fontSize: 13,
    color: '#6B6B6B',
    marginTop: 4,
  },
  saveRow: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  saveBtn: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D2A6B',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0DED7',
    paddingVertical: 10,
    fontSize: 16,
    color: '#1A1850',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 12,
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: '#F0EEE7',
    borderWidth: 1,
    borderColor: '#E0DED7',
  },
  categoryChipSelected: {
    backgroundColor: '#2D2A6B',
    borderColor: '#2D2A6B',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#6B6B6B',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  resultRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EEE7',
  },
  resultName: {
    fontSize: 16,
    color: '#1A1850',
  },
  resultAddr: {
    fontSize: 12,
    color: '#6B6B6B',
    marginTop: 2,
  },
  resultCat: {
    fontSize: 11,
    color: '#9A9A95',
    marginTop: 2,
  },
  attribution: {
    paddingVertical: 12,
    fontSize: 10,
    color: '#9A9A95',
    textAlign: 'center',
  },
  center: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  muted: {
    fontSize: 13,
    color: '#9A9A95',
    marginTop: 8,
  },
  errorBanner: {
    backgroundColor: '#FCE7E5',
    borderLeftWidth: 3,
    borderLeftColor: '#C04545',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  errorBannerText: {
    color: '#7A2828',
    fontSize: 12,
  },
});
