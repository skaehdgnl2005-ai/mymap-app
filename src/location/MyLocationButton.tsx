// MyLocationButton — Phase 6 § task 7 + D11 lock.
//
// Behavior:
//   - Bottom-right of map, 16px inset, 44pt tap target (iOS HIG min).
//   - First tap → requests foreground location permission. If granted,
//     reads current position once (high-accuracy) and calls onLocate so
//     the parent can flyTo.
//   - Permission denied → in-screen toast "위치를 보려면 설정에서
//     권한을 켜주세요" + "설정 열기" deep-link via Linking.openSettings.
//   - Subsequent taps reuse the cached permission status — no re-prompt
//     spam.
//
// Why a single-shot read (not watchPositionAsync):
//   v1 wedge is "show my saved pins"; live position tracking has no use
//   today. watchPositionAsync would burn battery and require background-
//   location disclosure on the App Store. Single-shot keeps the privacy
//   surface minimal.
//
// Why no permission ask during onboarding:
//   Per D8 lock — onboarding asks for zero permissions. The first time
//   the user taps this button IS the natural moment of consent.

import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';

interface Props {
  onLocate: (coords: [number, number]) => void;
  // Optional override for the bottom inset (e.g. above a hint card).
  // Defaults to 36 to align with the FAB inset in App.tsx.
  bottomInset?: number;
}

export const MyLocationButton: React.FC<Props> = ({ onLocate, bottomInset = 36 }) => {
  const [status, setStatus] = useState<Location.PermissionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [showDenied, setShowDenied] = useState(false);

  // On mount, read cached permission status — does NOT request. If the
  // user has previously granted, we know it; if denied, we know to show
  // the toast on next tap without re-asking.
  useEffect(() => {
    let cancelled = false;
    void Location.getForegroundPermissionsAsync().then((r) => {
      if (!cancelled) setStatus(r.status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePress = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setShowDenied(false);

    let currentStatus = status;
    if (currentStatus !== Location.PermissionStatus.GRANTED) {
      const r = await Location.requestForegroundPermissionsAsync();
      currentStatus = r.status;
      setStatus(r.status);
    }
    if (currentStatus !== Location.PermissionStatus.GRANTED) {
      setBusy(false);
      setShowDenied(true);
      return;
    }

    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      onLocate([pos.coords.longitude, pos.coords.latitude]);
    } catch {
      // Hardware failure / timeout — silent for v1 (rare in practice).
    } finally {
      setBusy(false);
    }
  }, [busy, status, onLocate]);

  return (
    <>
      <Pressable
        style={[styles.button, { bottom: bottomInset + 56 + 12 }]}
        onPress={handlePress}
        accessibilityLabel="내 위치 보기"
        hitSlop={6}
      >
        <Text style={styles.icon}>◎</Text>
      </Pressable>

      {showDenied && (
        <View style={[styles.toast, { bottom: bottomInset + 56 + 76 }]}>
          <Text style={styles.toastText}>위치를 보려면 설정에서 권한을 켜주세요.</Text>
          <Pressable onPress={() => void Linking.openSettings()} hitSlop={6}>
            <Text style={styles.toastAction}>설정 열기</Text>
          </Pressable>
          <Pressable onPress={() => setShowDenied(false)} hitSlop={6} style={styles.toastClose}>
            <Text style={styles.toastCloseText}>×</Text>
          </Pressable>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 22,
    color: '#2D2A6B',
    lineHeight: 24,
  },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: '#1A1850',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
  },
  toastAction: {
    color: '#6B68C8',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 12,
  },
  toastClose: {
    marginLeft: 8,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 18,
  },
});
