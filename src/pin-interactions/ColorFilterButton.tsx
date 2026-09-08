// Phase 7 — floating color filter trigger.
//
// Bottom-left position to mirror My Location bottom-right (phase doc task 6).
// When a filter is active, the button displays the active tag color as a
// fill chip; when inactive, it renders a neutral icon. Tap opens the
// ColorTagSheet in filter mode.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ColorTag } from '../../spec/data-shapes';

interface Props {
  activeFilter: ColorTag | null;
  onPress: () => void;
}

const COLOR_HEX: Record<Exclude<ColorTag, 'NONE'>, string> = {
  RED: '#E5484D',
  ORANGE: '#F76808',
  YELLOW: '#F1B100',
  GREEN: '#46A758',
  BLUE: '#3B82F6',
  PURPLE: '#8E4EC6',
};

export function ColorFilterButton({ activeFilter, onPress }: Props) {
  const fill = activeFilter && activeFilter !== 'NONE' ? COLOR_HEX[activeFilter] : null;

  return (
    <Pressable
      style={[styles.button, fill ? styles.buttonActive : null]}
      onPress={onPress}
      accessibilityLabel="색상으로 필터"
      accessibilityRole="button"
      hitSlop={8}
    >
      {fill ? (
        <View style={[styles.chip, { backgroundColor: fill }]} />
      ) : (
        <Text style={styles.glyph}>◐</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 20,
    bottom: 36,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  buttonActive: {
    backgroundColor: '#FFFFFF',
  },
  chip: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  glyph: {
    fontSize: 22,
    color: '#2D2A6B',
    lineHeight: 22,
  },
});
