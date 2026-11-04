export {
  STUDIO_VERSION,
  MAX_SLIDES,
  SLIDE_WIDTH,
  STUDIO_FONTS,
  DEFAULT_FRAME,
  DEFAULT_CROP,
  DEFAULT_BACKGROUND,
  slideSize,
  canvasSize,
  clampSlides,
  newDoc,
  parseDoc,
  serializeDoc,
  photosInDoc,
} from './model';
export type {
  StudioFormat,
  Frame,
  Crop,
  PhotoLayer,
  StudioFont,
  TextLayer,
  StickerLayer,
  StatsLayer,
  Layer,
  LayerKind,
  Background,
  StudioDoc,
} from './model';
export * from './geometry';
export * from './edit';
export * from './templates';
