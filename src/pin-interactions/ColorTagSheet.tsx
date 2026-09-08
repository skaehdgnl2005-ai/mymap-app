// Phase 7 — color picker bottom sheet.
//
// Two modes (shared UI surface):
//   - 'tag': pick a color for the long-pressed pin. NONE = no tag set.
//   - 'filter': pick a color to activate the map-wide filter. "필터 끄기"
//     row clears the filter.
//
// Controlled by parent: pass `mode` non-null to present, null to dismiss.

import { useEffect, useMemo, useRef } from 'react';
import type { ElementRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';

import type { ColorTag } from '../../spec/data-shapes';

export type ColorSheetMode = 'tag' | 'filter';

interface Props {
  mode: ColorSheetMode | null;
  current: ColorTag | null;
  onPick: (color: ColorTag | null) => void;
  onClose: () => void;
}

// Exported so PinDetailPopover (Phase 8) shares the same canonical
// color → label/hex mapping. NONE is not in this list because it's
// the absence-of-tag sentinel, not a pickable color (each consumer
// renders NONE differently — chip "없음" text vs filter-off row).
export const COLOR_OPTIONS: { tag: ColorTag; label: string; hex: string }[] = [
  { tag: 'RED', label: '빨강', hex: '#E5484D' },
  { tag: 'ORANGE', label: '주황', hex: '#F76808' },
  { tag: 'YELLOW', label: '노랑', hex: '#F1B100' },
  { tag: 'GREEN', label: '초록', hex: '#46A758' },
  { tag: 'BLUE', label: '파랑', hex: '#3B82F6' },
  { tag: 'PURPLE', label: '보라', hex: '#8E4EC6' },
];

export function ColorTagSheet({ mode, current, onPick, onClose }: Props) {
  const ref = useRef<ElementRef<typeof BottomSheet>>(null);

  useEffect(() => {
    if (mode) {
      ref.current?.expand();
    } else {
      ref.current?.close();
    }
  }, [mode]);

  const renderBackdrop = useMemo(
    () =>
      function Backdrop(props: BottomSheetBackdropProps) {
        return (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            pressBehavior="close"
            opacity={0.35}
          />
        );
      },
    [],
  );

  const handlePick = (color: ColorTag | null) => {
    void Haptics.selectionAsync();
    onPick(color);
  };

  const title = mode === 'filter' ? '색상으로 필터' : '색상 태그';
  const noneLabel = mode === 'filter' ? '필터 끄기' : '태그 없음';
  // In filter mode, "no current filter" === current === null; in tag mode,
  // NONE is a valid stored value. Normalize for selection highlighting.
  const isNoneActive = mode === 'filter' ? current == null : current === 'NONE';

  return (
    <BottomSheet
      ref={ref}
      snapPoints={['65%']}
      index={-1}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.content}>
        {/* Phase 9 fix: wrap content in `mode &&` so the closed-state
            sheet doesn't render the title row + first grid row as a
            ~167px peek at the bottom of the screen. The gorhom v5
            inline BottomSheet at `index={-1}` shows handle indicator
            (~63px) + the first content row regardless of close state;
            null-mode content collapses the peek to handle-only.
            Mirrors PinDetailPopover + QuickActionSheet conditional
            render pattern. */}
        {mode && (
          <>
            <Text style={styles.title}>{title}</Text>

            <View style={styles.grid}>
              {COLOR_OPTIONS.map((opt) => {
                const isActive = current === opt.tag;
                return (
                  <Pressable
                    key={opt.tag}
                    onPress={() => handlePick(opt.tag)}
                    style={styles.swatchPressable}
                    accessibilityRole="button"
                    accessibilityLabel={opt.label}
                  >
                    <View
                      style={[
                        styles.swatch,
                        { backgroundColor: opt.hex },
                        isActive && styles.swatchActive,
                      ]}
                    />
                    <Text style={[styles.swatchLabel, isActive && styles.swatchLabelActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => handlePick(mode === 'filter' ? null : 'NONE')}
              style={[styles.noneRow, isNoneActive && styles.noneRowActive]}
              accessibilityRole="button"
            >
              <Text style={[styles.noneLabel, isNoneActive && styles.noneLabelActive]}>
                {noneLabel}
              </Text>
            </Pressable>

            <View style={styles.spacer} />
          </>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

const SWATCH_SIZE = 44;

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FAFAFA',
  },
  handleIndicator: {
    backgroundColor: '#C7C7CC',
    width: 36,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0E0E0E',
    paddingVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 12,
    rowGap: 14,
  },
  swatchPressable: {
    width: '30%',
    alignItems: 'center',
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: '#0E0E0E',
  },
  swatchLabel: {
    fontSize: 13,
    color: '#6E6E73',
    marginTop: 6,
  },
  swatchLabelActive: {
    color: '#0E0E0E',
    fontWeight: '600',
  },
  noneRow: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  noneRowActive: {
    backgroundColor: '#E0E0E5',
  },
  noneLabel: {
    fontSize: 15,
    color: '#6E6E73',
  },
  noneLabelActive: {
    color: '#0E0E0E',
    fontWeight: '600',
  },
  spacer: {
    height: 8,
  },
});
