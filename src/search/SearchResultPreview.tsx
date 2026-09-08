// Phase 9 — search result preview sheet.
//
// Opens on tap of a pulsing search overlay pin. Read-only variant of
// PinDetailPopover (no edit fields) with a single primary CTA: "저장".
// Tap save → parent's onSave fires → savePlace + camera flyTo + sheet
// dismiss. Pan-down or backdrop tap dismisses without save.
//
// Inline BottomSheet per Phase 7 Fabric + Reanimated 4 portal constraint
// (same reason PinDetailPopover skips BottomSheetModal). Snap points
// 35/70% — search preview is less data-rich than the saved-pin popover
// (no OG card, no edit surfaces), so the smaller default snap is enough.
//
// Attribution "Powered by Naver" per D5b. Same string Phase 5 SaveModal
// + Phase 8 PinDetailPopover use.

import { useEffect, useMemo, useRef } from 'react';
import type { ElementRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';

import type { KakaoPlaceResult } from '../../spec/data-shapes';

interface Props {
  result: KakaoPlaceResult | null;
  onClose: () => void;
  onSave: (result: KakaoPlaceResult) => void;
}

export function SearchResultPreview({ result, onClose, onSave }: Props) {
  const ref = useRef<ElementRef<typeof BottomSheet>>(null);

  useEffect(() => {
    if (result) {
      void Haptics.selectionAsync();
      ref.current?.snapToIndex(0); // open at 35%
    } else {
      ref.current?.close();
    }
  }, [result]);

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

  // Naver's category text is ">"-separated without spaces, e.g.
  // "음식점>카페,디저트". Display the rightmost segment for terseness —
  // the leftmost ("음식점") is too generic to add information at preview
  // time. If only one segment, show it as-is.
  const categoryLabel = useMemo(() => {
    if (!result) return null;
    const segments = result.category_name.split('>').map((s) => s.trim());
    const last = segments[segments.length - 1];
    return last && last.length > 0 ? last : null;
  }, [result]);

  const handleSave = () => {
    if (!result) return;
    void Haptics.selectionAsync();
    onSave(result);
  };

  return (
    <BottomSheet
      ref={ref}
      snapPoints={['35%', '70%']}
      index={-1}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {result && (
          <>
            <Text style={styles.name} numberOfLines={2}>
              {result.place_name}
            </Text>
            {categoryLabel && <Text style={styles.category}>{categoryLabel}</Text>}
            <View style={styles.addressBlock}>
              <Text style={styles.addressLabel}>주소</Text>
              <Text style={styles.address}>{result.address_name}</Text>
              {result.road_address_name && (
                <Text style={styles.addressRoad}>{result.road_address_name}</Text>
              )}
            </View>

            <Pressable
              style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel="이 장소 저장하기"
            >
              <Text style={styles.saveButtonText}>저장</Text>
            </Pressable>

            <Text style={styles.attribution}>Powered by Naver</Text>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#FAFAFA',
  },
  handleIndicator: {
    backgroundColor: '#D4D2CC',
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1850',
    marginBottom: 4,
  },
  category: {
    fontSize: 13,
    color: '#6B6B6B',
    marginBottom: 16,
  },
  addressBlock: {
    marginBottom: 24,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9A9A95',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  address: {
    fontSize: 14,
    color: '#1A1850',
  },
  addressRoad: {
    fontSize: 13,
    color: '#6B6B6B',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#2D2A6B', // brand_indigo — primary CTA per D8
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonPressed: {
    backgroundColor: '#1A1850',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  attribution: {
    marginTop: 16,
    fontSize: 10,
    color: '#9A9A95',
    textAlign: 'center',
  },
});
