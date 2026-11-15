const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Drizzle migrations are .sql files imported by packages/db/drizzle/migrations.js.
config.resolver.sourceExts.push('sql');
// The phone's basic places list (Plan 29) ships as a data asset, not JavaScript.
config.resolver.assetExts.push('places');
// expo-sqlite on web loads its engine from a .wasm file (Plan 63: the dev server's web page).
config.resolver.assetExts.push('wasm');

module.exports = config;
