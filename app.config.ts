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
  name: '자국',
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
    // LOCKED 2026-05-04 — Trigger 4, IRREVERSIBLE at first TestFlight
    // upload. Pivoted from placeholder `com.gachi2026.mymap` after
    // /office-hours session locked brand `자국`. See PROJECT_STATE.md
    // "Open decisions" → bundleIdentifier entry for full rationale.
    bundleIdentifier: 'com.jaguk.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    // LOCKED 2026-05-04 — Trigger 4, IRREVERSIBLE once any version
    // is published to Play Store. Pivoted from placeholder
    // `com.gachi2026.mymap` after /office-hours session locked
    // brand `자국`. Mirrors `ios.bundleIdentifier` above.
    package: 'com.jaguk.app',
  },
  web: {
    favicon: './assets/favicon.png',
  },
  // Deep-link scheme for redirects. Share-extension lifecycle on iOS uses
  // `<scheme>://dataUrl` to bridge from the extension process back into
  // the main app — see expo-share-intent docs.
  scheme: 'jaguk',
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
    [
      'expo-share-intent',
      {
        // Display name shown in iOS share-sheet picker. Brand-locked 2026-05-04
        // — see PROJECT_STATE.md "Open decisions". Android picker reads the
        // app's `name` (also `자국`) automatically from this same config.
        iosShareExtensionName: '자국',
        // Accept web URLs (Naver/Kakao Place links) and plain text (which
        // covers Instagram/Threads/blog URLs that ship as text/plain).
        iosActivationRules: {
          NSExtensionActivationSupportsWebURLWithMaxCount: 1,
          NSExtensionActivationSupportsText: true,
        },
        // v5 plugin schema accepts MIME types only — per-host filtering
        // (the phase doc's `androidIntentFiltersData`) isn't exposed on
        // this version. text/* covers all primary save-flow paths
        // (Naver / Kakao / Instagram / Threads / blog URLs all share as
        // text/plain). v1 trade-off: broader picker presence than ideal,
        // narrowable later via custom androidManifestExtras patch.
        androidIntentFilters: ['text/*'],
      },
    ],
  ],
  extra: {
    // EAS project link — written manually because `eas init` cannot
    // automatically modify dynamic config (app.config.ts/js); it only
    // auto-writes to static app.json. Created 2026-05-03 via
    // `pnpm exec eas init` against @gachi2026/mymap-app.
    eas: {
      projectId: 'f12523a1-8c26-48a5-8aa9-e1e8e5e705f5',
    },
  },
};

export default config;
