import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { Mapbox, PersonalMap } from './src/map/PersonalMap';
import { MOCK_PLACES } from './src/dev/mock-places';

// Mapbox runtime token — public, restricted at account.mapbox.com.
// EXPO_PUBLIC_* is inlined into the JS bundle at build time. Asserted
// non-null because the app cannot start without it; missing token should
// surface loud at boot, not as a confusing tiles-fail-to-load symptom.
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (!MAPBOX_TOKEN) {
  throw new Error('EXPO_PUBLIC_MAPBOX_TOKEN is missing. Set it in .env.');
}
Mapbox.setAccessToken(MAPBOX_TOKEN);

export default function App() {
  return (
    <View style={styles.container}>
      <PersonalMap
        savedPlaces={MOCK_PLACES}
        // Phase 4 dev fixture lives in 성수동; center the camera there so
        // mock pins are visible without panning. Production callers can
        // omit this and the spec's Seoul City Hall default applies.
        initialCenter={[127.055, 37.5446]}
        initialZoom={15}
        onPinTap={(id) => console.log('[pin tap]', id)}
        onPinLongPress={(id) => console.log('[pin long-press]', id)}
        onClusterTap={(id) => console.log('[cluster tap]', id)}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
