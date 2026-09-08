// Phase 7 — long-press quick-action sheet.
//
// Shown when the user long-presses a saved pin (D11 lock). 4 rows:
//   1. 다녀왔어요 toggle (visited)
//   2. 색상 태그 (opens ColorTagSheet)
//   3. 공유 (native share-sheet)
//   4. 삭제 (confirm + delete)
//
// Controlled by parent: pass `place` to present, pass `null` to dismiss.
// All write actions are optimistic — parent updates local state first,
// rollback on DB error.

import { useEffect, useMemo, useRef } from 'react';
import { Alert, Pressable, Share, StyleSheet, Switch, Text, View } from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { ElementRef } from 'react';
import * as Haptics from 'expo-haptics';

import type { SavedPlace } from '../../spec/data-shapes';

interface Props {
  place: SavedPlace | null;
  onClose: () => void;
  onToggleVisited: (place: SavedPlace) => void;
  onOpenColorPicker: (place: SavedPlace) => void;
  onDelete: (place: SavedPlace) => void;
}

const ColorChip = ({ tag }: { tag: SavedPlace['color_tag'] }) => {
  if (tag === 'NONE') return <Text style={styles.chipNone}>없음</Text>;
  const fill = {
    RED: '#E5484D',
    ORANGE: '#F76808',
    YELLOW: '#F1B100',
    GREEN: '#46A758',
    BLUE: '#3B82F6',
    PURPLE: '#8E4EC6',
  }[tag];
  return <View style={[styles.chip, { backgroundColor: fill }]} />;
};

export function QuickActionSheet({
  place,
  onClose,
  onToggleVisited,
  onOpenColorPicker,
  onDelete,
}: Props) {
  const ref = useRef<ElementRef<typeof BottomSheet>>(null);

  useEffect(() => {
    if (place) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      ref.current?.expand();
    } else {
      ref.current?.close();
    }
  }, [place]);

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

  const handleShare = async () => {
    if (!place) return;
    try {
      await Share.share({
        message: `${place.name}${place.source_url ? `\n${place.source_url}` : ''}`,
        title: place.name,
      });
    } catch {
      // User cancelled or share unavailable — silent
    }
  };

  const handleDelete = () => {
    if (!place) return;
    Alert.alert('삭제하시겠어요?', `"${place.name}" 핀이 삭제됩니다.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => onDelete(place),
      },
    ]);
  };

  return (
    <BottomSheet
      ref={ref}
      snapPoints={['50%']}
      index={-1}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.content}>
        {place && (
          <>
            <View style={styles.header}>
              <Text style={styles.placeName} numberOfLines={1}>
                {place.name}
              </Text>
              {place.region && <Text style={styles.region}>{place.region}</Text>}
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <Text style={styles.rowLabel}>다녀왔어요</Text>
              <Switch
                value={place.visited}
                onValueChange={() => {
                  void Haptics.selectionAsync();
                  onToggleVisited(place);
                }}
                trackColor={{ false: '#D1D1D6', true: '#2D2A6B' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <Pressable
              style={styles.rowPressable}
              onPress={() => onOpenColorPicker(place)}
              accessibilityRole="button"
            >
              <Text style={styles.rowLabel}>색상 태그</Text>
              <View style={styles.rowRight}>
                <ColorChip tag={place.color_tag} />
                <Text style={styles.chevron}>›</Text>
              </View>
            </Pressable>

            <Pressable style={styles.rowPressable} onPress={handleShare} accessibilityRole="button">
              <Text style={styles.rowLabel}>공유</Text>
              <Text style={styles.chevron}>›</Text>
            </Pressable>

            <Pressable
              style={styles.rowPressable}
              onPress={handleDelete}
              accessibilityRole="button"
            >
              <Text style={[styles.rowLabel, styles.destructive]}>삭제</Text>
            </Pressable>

            <View style={styles.spacer} />
          </>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}

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
  header: {
    paddingVertical: 8,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0E0E0E',
  },
  region: {
    fontSize: 13,
    color: '#6E6E73',
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#D1D1D6',
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 16,
    color: '#0E0E0E',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chip: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  chipNone: {
    fontSize: 14,
    color: '#8E8E93',
  },
  chevron: {
    fontSize: 22,
    color: '#C7C7CC',
    marginLeft: 4,
  },
  destructive: {
    color: '#E5484D',
  },
  spacer: {
    height: 8,
  },
});
