// OnboardingStepWorkSchool — Phase 6 Step 2 of 2.
//
// Per Phase 6 doc § task 4:
//   - Title: "학교나 직장은 어디인가요?"
//   - Toggle: 학교 추가 / 직장 추가 / 둘 다 추가
//   - Address search; on pick, save as SCHOOL or WORK based on toggle
//   - Skip → go to map (handled by parent via onDone(null))
//
// Multi-add ("둘 다 추가") flow per D7 lock: when active, picking a result
// saves as the *currently selected* role (default WORK), then locally
// flips the role to SCHOOL so the next pick saves under that role.
// User can pick zero, one, or two. "완료" advances when ≥1 is saved or
// the user is in single-add mode and has saved their one.
//
// Visual: 3 radio chips. Default = WORK (slightly more common at 20s
// Korean Gen-Z than SCHOOL, per founder's market read).

import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { KakaoPlaceResult, SavedPlace } from '../../spec/data-shapes';
import { savePlace, type NewSavedPlace } from '../places/repo';
import { AddressSearchInput } from './AddressSearchInput';
import { ProgressDots } from './ProgressDots';

type AddMode = 'WORK' | 'SCHOOL' | 'BOTH';

interface Props {
  userId: string;
  onDone: (saved: SavedPlace[]) => void;
}

const MODE_LABELS: Record<AddMode, string> = {
  WORK: '직장 추가',
  SCHOOL: '학교 추가',
  BOTH: '둘 다 추가',
};

export const OnboardingStepWorkSchool: React.FC<Props> = ({ userId, onDone }) => {
  const [mode, setMode] = useState<AddMode>('WORK');
  // For BOTH mode: which role the next pick saves under. Flips after each
  // successful save. Starts WORK; after saving WORK, flips to SCHOOL.
  const [nextBothRole, setNextBothRole] = useState<'WORK' | 'SCHOOL'>('WORK');
  const [saving, setSaving] = useState(false);
  const [savedSoFar, setSavedSoFar] = useState<SavedPlace[]>([]);

  const handlePick = async (result: KakaoPlaceResult): Promise<void> => {
    const role: 'WORK' | 'SCHOOL' = mode === 'BOTH' ? nextBothRole : mode;
    setSaving(true);
    const insert: NewSavedPlace = {
      user_id: userId,
      name: result.place_name,
      lat: parseFloat(result.y),
      lng: parseFloat(result.x),
      category: role,
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
    const updated = [...savedSoFar, r.data];
    setSavedSoFar(updated);
    if (mode === 'BOTH' && nextBothRole === 'WORK') {
      // Successfully saved WORK in BOTH mode — flip to SCHOOL for next pick.
      // User can also tap 완료 here if they only wanted to add WORK.
      setNextBothRole('SCHOOL');
      return;
    }
    // Single-add mode (WORK or SCHOOL only) OR BOTH mode after both saved.
    onDone(updated);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <ProgressDots total={2} current={1} />
        <Pressable onPress={() => onDone(savedSoFar)} hitSlop={8} disabled={saving}>
          <Text style={styles.skip}>{savedSoFar.length === 0 ? '건너뛰기' : '완료'}</Text>
        </Pressable>
      </View>

      <Text style={styles.title}>학교나 직장은 어디인가요?</Text>
      <Text style={styles.subtitle}>두 곳을 한 번에 추가할 수도 있어요</Text>

      <View style={styles.modeRow}>
        {(Object.keys(MODE_LABELS) as AddMode[]).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              style={[styles.modeChip, active && styles.modeChipActive]}
              onPress={() => {
                setMode(m);
                // Reset BOTH staging if user re-picks BOTH after a partial save.
                if (m === 'BOTH') setNextBothRole('WORK');
              }}
              hitSlop={4}
              disabled={saving}
            >
              <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                {MODE_LABELS[m]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mode === 'BOTH' && savedSoFar.length > 0 && (
        <Text style={styles.bothHint}>
          {nextBothRole === 'SCHOOL'
            ? '직장을 저장했어요. 다음은 학교를 골라주세요.'
            : '학교를 저장했어요. 다음은 직장을 골라주세요.'}
        </Text>
      )}

      <View style={styles.searchWrap}>
        <AddressSearchInput
          // Narrow Naver results to schools when picking SCHOOL (or when
          // the next BOTH-mode save will be SCHOOL — `nextBothRole`
          // already encodes that). WORK stays free-form: jobs are too
          // varied for a single keyword to help (회사, 직장, 사옥, 등
          // none of these consistently narrow).
          placeholder={
            mode === 'SCHOOL' || (mode === 'BOTH' && nextBothRole === 'SCHOOL')
              ? '예: 한양대학교, 성수고등학교'
              : '예: 강남역, 회사 이름'
          }
          categoryKeyword={
            mode === 'SCHOOL' || (mode === 'BOTH' && nextBothRole === 'SCHOOL') ? '학교' : undefined
          }
          onPick={handlePick}
        />
      </View>

      {saving && (
        <View style={styles.overlay}>
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
    marginBottom: 16,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9999,
    backgroundColor: '#F0EEE7',
    borderWidth: 1,
    borderColor: '#E0DED7',
  },
  modeChipActive: {
    backgroundColor: '#2D2A6B',
    borderColor: '#2D2A6B',
  },
  modeChipText: {
    fontSize: 13,
    color: '#6B6B6B',
    fontWeight: '500',
  },
  modeChipTextActive: {
    color: '#FFFFFF',
  },
  bothHint: {
    fontSize: 12,
    color: '#2D2A6B',
    marginBottom: 12,
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
