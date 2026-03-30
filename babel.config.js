/**
 * babel.config.js
 *
 * Babel configuration for the Thoughts Expo app.
 *
 * 'babel-preset-expo' handles JSX, TypeScript, and module transforms for
 * both iOS and Android.
 *
 * 'react-native-reanimated/plugin' is REQUIRED for Reanimated 3 worklets.
 * Worklets are functions that run on the UI thread (not the JS thread) to
 * produce smooth 60/120fps animations. Without this plugin, the worklet
 * transformation won't happen and animations will fall back to the JS thread.
 *
 * IMPORTANT: This plugin must be listed LAST in the plugins array.
 * Reanimated's plugin documentation explicitly states this requirement.
 *
 * DEBUG TIP: After changing this file, you must restart Metro with cache cleared:
 *   npx expo start --clear
 */

module.exports = function (api) {
  // cache(true) — Babel caches the config between compilations for speed
  api.cache(true);

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-reanimated/plugin MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
