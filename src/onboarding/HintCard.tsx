// HintCard — first-session above-the-FAB hint per Phase 6 § task 6.
//
// Copy: "+ 인스타에서 본 카페를 저장해보세요"
// Behavior:
//   - Shown only when AsyncStorage flag `hint_card_dismissed:<userId>` is null.
//   - Dismisses on either explicit X tap OR first `+` (FAB) tap. Parent
//     drives the dismissal — calls dismissHintCard(userId) when the FAB
//     fires for the first time.
//   - Per-user keyed so multi-account on one device doesn't share state.
//
// Empty-state visual statement (per D8): the map renders empty for a new
// user — this card carries the "what do I do here" comprehension that the
// cut 3-favorite-pin step would have done.

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const flagKey = (userId: string): string => `hint_card_dismissed:${userId}`;

export async function dismissHintCard(userId: string): Promise<void> {
  await AsyncStorage.setItem(flagKey(userId), '1');
}

export function useHintCardVisible(userId: string | null): {
  visible: boolean;
  dismiss: () => void;
} {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!userId) {
      setVisible(false);
      return;
    }
    let cancelled = false;
    void AsyncStorage.getItem(flagKey(userId)).then((v) => {
      if (cancelled) return;
      setVisible(v !== '1');
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    visible,
    // Optimistically hide + persist; failure to persist re-shows on next
    // boot, which is acceptable (worst case: user dismisses twice).
    dismiss: () => {
      setVisible(false);
      if (userId) void dismissHintCard(userId);
    },
  };
}

interface Props {
  onDismiss: () => void;
}

export const HintCard: React.FC<Props> = ({ onDismiss }) => (
  <View style={styles.card} pointerEvents="box-none">
    <Text style={styles.text}>+ 인스타에서 본 카페를 저장해보세요</Text>
    <Pressable onPress={onDismiss} hitSlop={10} style={styles.close}>
      <Text style={styles.closeText}>×</Text>
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 20,
    right: 88, // leave room for the bottom-right FAB
    bottom: 36 + 56 + 12, // FAB bottom (36) + FAB height (56) + gap (12)
    backgroundColor: '#1A1850', // brand_indigo_dark per D9 (high contrast on map)
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  text: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  close: {
    position: 'absolute',
    right: 8,
    top: 6,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 22,
  },
});
