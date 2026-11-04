const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Drizzle migrations are .sql files imported by packages/db/drizzle/migrations.js.
config.resolver.sourceExts.push('sql');

module.exports = config;
