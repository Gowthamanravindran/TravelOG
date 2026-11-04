// Config plugin for the local social-share module (Plan 15). Android needs nothing
// extra: the module's own AndroidManifest declares its FileProvider and <queries>.
const { withInfoPlist } = require('expo/config-plugins');

const SCHEMES = ['instagram', 'instagram-stories', 'fb', 'facebook-stories'];

module.exports = function withSocialShare(config, { savePhotosPermission } = {}) {
  return withInfoPlist(config, (cfg) => {
    const existing = cfg.modResults.LSApplicationQueriesSchemes ?? [];
    cfg.modResults.LSApplicationQueriesSchemes = [...new Set([...existing, ...SCHEMES])];
    cfg.modResults.NSPhotoLibraryAddUsageDescription =
      savePhotosPermission ??
      cfg.modResults.NSPhotoLibraryAddUsageDescription ??
      'TravelOG saves your carousel slides to Photos so you can post them.';
    return cfg;
  });
};
