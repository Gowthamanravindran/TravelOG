const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Drizzle migrations are .sql files imported by packages/db/drizzle/migrations.js.
config.resolver.sourceExts.push('sql');
// The phone's basic places list (Plan 29) ships as a data asset, not JavaScript.
config.resolver.assetExts.push('places');

module.exports = config;
