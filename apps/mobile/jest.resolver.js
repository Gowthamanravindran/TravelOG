/**
 * Jest resolver (Plan 28): Reanimated 4 and worklets pick their JS (web) builds in tests,
 * then the React Native preset's resolver handles everything as before.
 */
const reactNative = require('@react-native/jest-preset/jest/resolver.js');
const reanimated = require('react-native-reanimated/jest/resolver');

module.exports = (request, options) =>
  reanimated(request, {
    ...options,
    // The preset's resolver falls back to Jest's own default, not back into this chain.
    defaultResolver: (r, o) => reactNative(r, { ...o, defaultResolver: options.defaultResolver }),
  });
