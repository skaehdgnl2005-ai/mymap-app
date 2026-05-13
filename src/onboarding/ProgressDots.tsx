// ProgressDots — 2-dot indicator for onboarding.
//
// Per Phase 6 doc § Anti-patterns: "Do NOT show 'Step 1 of 2' text — use
// 2 dots indicator only." Dots are 6px, brand_indigo when active, neutral
// gray when inactive, 8px gap. Sized to feel like a UI cue, not a
// progress UI screaming "you have steps to do."

import React from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  total: number;
  current: number; // 0-indexed
}

export const ProgressDots: React.FC<Props> = ({ total, current }) => (
  <View style={styles.row} accessibilityRole="progressbar">
    {Array.from({ length: total }, (_, i) => (
      <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D0CEC7',
  },
  dotActive: {
    backgroundColor: '#2D2A6B',
  },
});
