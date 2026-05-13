// OnboardingStepHome — Phase 6 Step 1 of 2.
//
// Per Phase 6 doc § task 3:
//   - Title: "주로 어느 동네에서 지내세요?"
//   - Subtitle: "홈이 지도에 표시되면 거리 가늠이 쉬워져요"
//   - Address search (Naver per D5b)
//   - 건너뛰기 link top-right (non-penalty per D7 R7)
//   - On result tap: save as HOME via places/repo, advance to Step 2
//
// Skip path: advance to Step 2 without saving an anchor. The user can
// still pick a SCHOOL/WORK on the next step OR skip everything; both
// outcomes mark onboarding_complete=true and land them on the map.

import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { KakaoPlaceResult, SavedPlace } from '../../spec/data-shapes';
import { savePlace, type NewSavedPlace } from '../places/repo';
import { ProgressDots } from './ProgressDots';
import { RegionPicker } from './RegionPicker';

interface Props {
  userId: string;
  onNext: (savedHome: SavedPlace | null) => void;
}

export const OnboardingStepHome: React.FC<Props> = ({ userId, onNext }) => {
  const [saving, setSaving] = useState(false);

  const handlePick = async (result: KakaoPlaceResult): Promise<void> => {
    setSaving(true);
    const insert: NewSavedPlace = {
      user_id: userId,
      name: result.place_name,
      lat: parseFloat(result.y),
      lng: parseFloat(result.x),
      category: 'HOME',
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
    const r = await savePlace(insert);
    setSaving(false);
    if (r.error) {
      Alert.alert('저장 실패', r.error.message);
      return;
    }
    onNext(r.data);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ProgressDots total={2} current={0} />
        <Pressable onPress={() => onNext(null)} hitSlop={8} disabled={saving}>
          <Text style={styles.skip}>건너뛰기</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>주로 어느 동네에서 지내세요?</Text>
      <Text style={styles.subtitle}>홈이 지도에 표시되면 거리 가늠이 쉬워져요</Text>

      <View style={styles.searchWrap}>
        <RegionPicker onPick={(result, _gu) => void handlePick(result)} />
      </View>

      {saving && (
        <View style={styles.overlay} pointerEvents="auto">
          <ActivityIndicator />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    backgroundColor: '#FAFAFA',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  skip: {
    fontSize: 14,
    color: '#6B6B6B',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1850',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B6B6B',
    marginBottom: 24,
  },
  searchWrap: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250,250,250,0.6)',
  },
});
