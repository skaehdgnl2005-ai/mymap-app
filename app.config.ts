import type { ExpoConfig } from 'expo/config';

// Single source of truth for Expo project config (replaces app.json).
// Uses dynamic config so we can read process.env (e.g. MAPBOX_DOWNLOADS_TOKEN
// is server/build-time only — must NOT be inlined as EXPO_PUBLIC_*).

// Bridge our project-internal env name -> the name @rnmapbox/maps reads from
// process.env. Keeps `.env` consistent with the rest of the project's naming
// while satisfying the plugin's expected env var.
if (process.env.MAPBOX_DOWNLOADS_TOKEN && !process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN) {
  process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN = process.env.MAPBOX_DOWNLOADS_TOKEN;
}

const config: ExpoConfig = {
  name: 'mymap-app',
  slug: 'mymap-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    // PLACEHOLDER — must be finalized before TestFlight (Phase 10).
    // Once an iOS build is uploaded to App Store Connect, this is
    // immutable. Convention: reverse-DNS, lowercase.
    bundleIdentifier: 'com.gachi2026.mymap',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    // PLACEHOLDER — must be finalized before Play Store upload (Phase 10).
    // Permanent on the Play Store side once any version is published.
    package: 'com.gachi2026.mymap',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      '@rnmapbox/maps',
      {
        // v10 Mapbox runtime per DESIGN.md § D4 (MapLibre migration post-PMF).
        RNMapboxMapsImpl: 'mapbox',
        // Note: do NOT pass RNMapboxMapsDownloadToken here — it's deprecated.
        // The plugin reads RNMAPBOX_MAPS_DOWNLOAD_TOKEN from process.env
        // (bridged from MAPBOX_DOWNLOADS_TOKEN at the top of this file).
      },
    ],
  ],
};

export default config;
