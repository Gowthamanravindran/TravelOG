// Pure helpers and types only. The component itself is imported from '@travelog/globe/src/GlobeMap',
// and only where the web view's native module exists: importing it elsewhere throws (Plan 66).
export * from './cities';
export * from './countries';
export type { GlobeMapHandle, GlobeMapProps, Place, CountryTap } from './GlobeMap';
export type { GlobeQuality } from './globeHtml';
export { defaultTheme, type GlobeTheme } from './theme';
