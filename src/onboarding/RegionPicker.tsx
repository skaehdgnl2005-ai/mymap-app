// RegionPicker — Step 1 (HOME) 시/구/동 cascade selector.
//
// Replaces the free-form AddressSearchInput approach for Step 1. The Step 1
// question "주로 어느 동네에서 지내세요?" is dong-level by intent; forcing a
// specific POI pick (cafe/landmark) was a mismatch. This cascade matches
// the natural Korean way of describing where you live: 서울특별시 →
// 성동구 → 성수1가동.
//
// v1 scope: Seoul only. 시 is a fixed display row, 구 opens a Modal,
// 동 opens a second Modal (sourced from SEOUL_DONGS_BY_GU). Non-Seoul
// beta users trigger Phase 10 expansion to full Korea.
//
// Centroid sourcing: 동주민센터 / 행정복지센터 buildings sit at each
// 동's administrative anchor (roughly the geographic center). We query
// Naver Local Search for "{dong} {gu} 행정복지센터" at pick time → use
// the first result's coordinates as the dong centroid. Fallback to the
// hardcoded 구 centroid (SEOUL_GU_CENTROIDS) only when Naver returns 0
// results (rare; happens for very small/recently-restructured 동).
//
// The picker calls onPick with a synthetic KakaoPlaceResult so the
// caller (OnboardingStepHome) can use its existing savePlace insert
// payload without branching on cascade-vs-place flow.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { KakaoPlaceResult } from '../../spec/data-shapes';
import { naverSearchByKeyword } from '../naver/client';
import {
  SEOUL_DISTRICTS,
  SEOUL_DONGS_BY_GU,
  SEOUL_GU_CENTROIDS,
  type SeoulDistrict,
} from '../data/seoul-districts';

interface Props {
  onPick: (result: KakaoPlaceResult, gu: SeoulDistrict, dong: string) => void;
}

export const RegionPicker: React.FC<Props> = ({ onPick }) => {
  const [gu, setGu] = useState<SeoulDistrict | null>(null);
  const [dong, setDong] = useState<string | null>(null);
  const [showGuModal, setShowGuModal] = useState(false);
  const [showDongModal, setShowDongModal] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGuPick = (picked: SeoulDistrict): void => {
    setGu(picked);
    // Clear the previous 동 — selecting a new 구 invalidates any prior
    // 동 pick since 동 names are scoped to their parent 구.
    setDong(null);
    setError(null);
    setShowGuModal(false);
  };

  const handleDongPick = async (pickedDong: string): Promise<void> => {
    if (!gu) return; // defensive — UI prevents this
    setDong(pickedDong);
    setShowDongModal(false);
    setResolving(true);
    setError(null);

    // Centroid sourcing: query Naver for the 행정복지센터 building of the
    // picked dong. That building is the official administrative anchor
    // and sits at the geographic center of the dong, giving us an
    // accurate centroid. Strip the "행정복지센터" suffix logic isn't
    // needed — Naver returns the building's coords regardless of how the
    // result's display name reads.
    const query = `${pickedDong} ${gu} 행정복지센터`;
    const r = await naverSearchByKeyword(query);

    let coords: [number, number] | null = null;
    if (!r.error && r.data.length > 0) {
      const first = r.data[0];
      if (first) {
        const lng = parseFloat(first.x);
        const lat = parseFloat(first.y);
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
          coords = [lng, lat];
        }
      }
    }

    // Fallback: hardcoded 구 centroid. Logs the fallback path so we can
    // see in dev which 동s consistently miss the Naver lookup and add
    // explicit centroids later if needed.
    if (!coords) {
      console.warn(
        `[RegionPicker] no Naver result for "${query}" — falling back to ${gu} centroid`,
      );
      coords = [...SEOUL_GU_CENTROIDS[gu]] as [number, number];
    }

    setResolving(false);

    // Synthesize a KakaoPlaceResult so the caller's existing
    // savePlace insert payload doesn't need to branch on cascade vs.
    // place-pick flow. The synthetic id is unique to this dong + gu;
    // address fields reflect the cascade picks.
    const synthetic: KakaoPlaceResult = {
      id: `seoul-dong:${gu}-${pickedDong}`,
      place_name: pickedDong,
      category_name: '행정동',
      address_name: `서울특별시 ${gu} ${pickedDong}`,
      road_address_name: null,
      x: String(coords[0]),
      y: String(coords[1]),
    };
    onPick(synthetic, gu, pickedDong);
  };

  return (
    <View style={styles.wrap}>
      {/* 시/도 row — fixed for v1; non-tappable visual placeholder so the
          user understands the cascade hierarchy. */}
      <View style={styles.fixedRow}>
        <Text style={styles.rowLabel}>시/도</Text>
        <Text style={styles.rowValue}>서울특별시</Text>
      </View>

      {/* 구 row — opens Modal picker on tap. */}
      <Pressable style={styles.pressableRow} onPress={() => setShowGuModal(true)}>
        <Text style={styles.rowLabel}>구</Text>
        <Text style={[styles.rowValue, !gu && styles.rowValuePlaceholder]}>
          {gu ?? '선택하세요'}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      {/* 동 row — opens Modal picker once 구 is set. */}
      <Pressable
        style={[styles.pressableRow, !gu && styles.pressableRowDisabled]}
        onPress={() => gu && setShowDongModal(true)}
        disabled={!gu}
      >
        <Text style={styles.rowLabel}>동</Text>
        <Text style={[styles.rowValue, !dong && styles.rowValuePlaceholder]}>
          {dong ?? (gu ? '선택하세요' : '구를 먼저 선택하세요')}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      {resolving && (
        <View style={styles.resolvingRow}>
          <ActivityIndicator />
          <Text style={styles.resolvingText}>위치를 확인하는 중…</Text>
        </View>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* 구 picker Modal */}
      <Modal
        visible={showGuModal}
        animationType="slide"
        onRequestClose={() => setShowGuModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>구 선택</Text>
            <Pressable onPress={() => setShowGuModal(false)} hitSlop={12}>
              <Text style={styles.modalClose}>닫기</Text>
            </Pressable>
          </View>
          <FlatList
            data={SEOUL_DISTRICTS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const selected = item === gu;
              return (
                <Pressable style={styles.row} onPress={() => handleGuPick(item)}>
                  <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{item}</Text>
                  {selected && <Text style={styles.rowCheck}>✓</Text>}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>

      {/* 동 picker Modal — populated from SEOUL_DONGS_BY_GU[selected gu] */}
      <Modal
        visible={showDongModal && gu !== null}
        animationType="slide"
        onRequestClose={() => setShowDongModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{gu ?? ''} 동 선택</Text>
            <Pressable onPress={() => setShowDongModal(false)} hitSlop={12}>
              <Text style={styles.modalClose}>닫기</Text>
            </Pressable>
          </View>
          <FlatList
            data={gu ? SEOUL_DONGS_BY_GU[gu] : []}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const selected = item === dong;
              return (
                <Pressable style={styles.row} onPress={() => void handleDongPick(item)}>
                  <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{item}</Text>
                  {selected && <Text style={styles.rowCheck}>✓</Text>}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  fixedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E0DED7',
    borderRadius: 8,
    backgroundColor: '#F0EEE7', // muted — non-interactive hint
    marginBottom: 8,
  },
  pressableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E0DED7',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  pressableRowDisabled: {
    backgroundColor: '#F8F7F4',
    opacity: 0.7,
  },
  rowLabel: {
    fontSize: 13,
    color: '#9A9A95',
    width: 48,
  },
  rowValue: {
    flex: 1,
    fontSize: 15,
    color: '#1A1850',
  },
  rowValuePlaceholder: {
    color: '#9A9A95',
  },
  chevron: {
    fontSize: 20,
    color: '#9A9A95',
    marginLeft: 8,
  },
  resolvingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  resolvingText: {
    fontSize: 13,
    color: '#6B6B6B',
  },
  error: {
    fontSize: 12,
    color: '#C04545',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    paddingTop: 56,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1850',
  },
  modalClose: {
    fontSize: 14,
    color: '#6B6B6B',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0EEE7',
  },
  rowText: {
    fontSize: 16,
    color: '#1A1850',
  },
  rowTextSelected: {
    fontWeight: '600',
    color: '#2D2A6B',
  },
  rowCheck: {
    fontSize: 16,
    color: '#2D2A6B',
    fontWeight: '700',
  },
});
