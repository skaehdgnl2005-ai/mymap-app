// RegionPicker — Step 1 (HOME) 시/구/동 cascade selector.
//
// Replaces the free-form AddressSearchInput approach for Step 1. The Step 1
// question "주로 어느 동네에서 지내세요?" is dong-level by intent; forcing a
// specific POI pick (cafe/landmark) was a mismatch. This cascade matches
// the natural Korean way of describing where you live: 서울특별시 →
// 성동구 → 성수동.
//
// v1 scope (per src/data/seoul-districts.ts header): Seoul only. 시 is a
// fixed display row, 구 opens a Modal picker, 동 is the existing
// AddressSearchInput scoped to the chosen 구 via categoryKeyword.
// Non-Seoul beta users trigger Phase 10 expansion to full Korea.
//
// On pick: the AddressSearchInput returns a KakaoPlaceResult shape; we
// pass that up to OnboardingStepHome unchanged so the existing
// savePlace() insert payload logic stays intact.

import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import type { KakaoPlaceResult } from '../../spec/data-shapes';
import { SEOUL_DISTRICTS, type SeoulDistrict } from '../data/seoul-districts';
import { AddressSearchInput } from './AddressSearchInput';

interface Props {
  onPick: (result: KakaoPlaceResult, gu: SeoulDistrict) => void;
}

export const RegionPicker: React.FC<Props> = ({ onPick }) => {
  const [gu, setGu] = useState<SeoulDistrict | null>(null);
  const [showGuModal, setShowGuModal] = useState(false);

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

      {/* 동 — Naver-backed search, narrowed by the chosen 구 via the
          existing categoryKeyword prefix mechanism. Only enabled after a
          구 has been picked (otherwise the search would span all of Korea
          and lose the cascade benefit). */}
      {gu && (
        <View style={styles.dongWrap}>
          <Text style={styles.dongHeader}>동/장소</Text>
          <AddressSearchInput
            placeholder={`${gu} 안에서 검색 (예: 성수동, 역삼역)`}
            categoryKeyword={gu}
            onPick={(result) => onPick(result, gu)}
          />
        </View>
      )}

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
                <Pressable
                  style={styles.guRow}
                  onPress={() => {
                    setGu(item);
                    setShowGuModal(false);
                  }}
                >
                  <Text style={[styles.guRowText, selected && styles.guRowTextSelected]}>
                    {item}
                  </Text>
                  {selected && <Text style={styles.guRowCheck}>✓</Text>}
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
    marginBottom: 12,
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
  dongWrap: {
    flex: 1,
  },
  dongHeader: {
    fontSize: 13,
    color: '#9A9A95',
    marginBottom: 8,
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
  guRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0EEE7',
  },
  guRowText: {
    fontSize: 16,
    color: '#1A1850',
  },
  guRowTextSelected: {
    fontWeight: '600',
    color: '#2D2A6B',
  },
  guRowCheck: {
    fontSize: 16,
    color: '#2D2A6B',
    fontWeight: '700',
  },
});
