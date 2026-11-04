import { COLLAGE_FORMATS, type CollageFormat, type Rect } from '../collage';

export type { Rect };

/**
 * Studio project document (Plan 15): a wide canvas cut into carousel slides.
 * Units are export pixels: every slide is 1080 wide, so layers can sit across
 * the seams and the post scrolls seamlessly. Layers are drawn in array order
 * (last = on top).
 */

export const STUDIO_VERSION = 1;
export const MAX_SLIDES = 10;
export type StudioFormat = CollageFormat;
export const SLIDE_WIDTH = 1080;

export interface Frame {
  /** Corner radius in px. */
  radius: number;
  /** Border width in px (0 = none). */
  border: number;
  borderColor: string;
  shadow: boolean;
}

export interface Crop {
  /** Zoom inside the frame; 1 = photo just covers the frame. */
  scale: number;
  /** Where the visible part sits in the zoomed photo, 0–1 on each axis (0.5 = centred). */
  x: number;
  y: number;
}

interface LayerBase {
  id: string;
  /** Top-left corner of the unrotated box, in canvas px. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, clockwise, around the box centre. */
  rotation: number;
}

export interface PhotoLayer extends LayerBase {
  kind: 'photo';
  /** Trip photo id; null = empty slot waiting for a photo. */
  photoId: string | null;
  crop: Crop;
  frame: Frame;
}

export const STUDIO_FONTS = ['sans', 'serif', 'mono', 'hand'] as const;
export type StudioFont = (typeof STUDIO_FONTS)[number];

export interface TextLayer extends LayerBase {
  kind: 'text';
  text: string;
  font: StudioFont;
  /** Font size in px. */
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
  bold: boolean;
  /** Pill behind the text, or null. */
  background: string | null;
}

export interface StickerLayer extends LayerBase {
  kind: 'sticker';
  emoji: string;
}

/** Trip numbers (days, stops, people, spent), filled in by the app when drawn. */
export interface StatsLayer extends LayerBase {
  kind: 'stats';
  color: string;
}

export type Layer = PhotoLayer | TextLayer | StickerLayer | StatsLayer;
export type LayerKind = Layer['kind'];

export type Background =
  | { kind: 'color'; color: string }
  | { kind: 'gradient'; from: string; to: string; /** degrees */ angle: number };

export interface StudioDoc {
  version: number;
  format: StudioFormat;
  slides: number;
  background: Background;
  layers: Layer[];
}

export const DEFAULT_FRAME: Frame = { radius: 0, border: 0, borderColor: '#FFFFFF', shadow: false };
export const DEFAULT_CROP: Crop = { scale: 1, x: 0.5, y: 0.5 };
export const DEFAULT_BACKGROUND: Background = { kind: 'color', color: '#FAF7F2' };

export function slideSize(format: StudioFormat): { width: number; height: number } {
  return { width: SLIDE_WIDTH, height: COLLAGE_FORMATS[format].height };
}

export function canvasSize(doc: Pick<StudioDoc, 'format' | 'slides'>): {
  width: number;
  height: number;
} {
  const { width, height } = slideSize(doc.format);
  return { width: width * doc.slides, height };
}

export function clampSlides(n: number): number {
  return Math.max(1, Math.min(MAX_SLIDES, Math.round(Number.isFinite(n) ? n : 1)));
}

export function newDoc(format: StudioFormat, slides: number): StudioDoc {
  return {
    version: STUDIO_VERSION,
    format,
    slides: clampSlides(slides),
    background: DEFAULT_BACKGROUND,
    layers: [],
  };
}

// Parsing ---------------------------------------------------------------------
// Documents come from the database (and later from other devices), so anything
// unexpected is repaired or dropped instead of crashing the editor.

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
const str = (v: unknown, fallback: string, max = 500) =>
  typeof v === 'string' ? v.slice(0, max) : fallback;
const color = (v: unknown, fallback: string) =>
  typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : fallback;

function parseBackground(v: unknown): Background {
  if (isObj(v) && v.kind === 'gradient') {
    return {
      kind: 'gradient',
      from: color(v.from, '#FF6B5B'),
      to: color(v.to, '#5B5BD6'),
      angle: num(v.angle, 90, 0, 360),
    };
  }
  if (isObj(v) && v.kind === 'color') return { kind: 'color', color: color(v.color, '#FAF7F2') };
  return DEFAULT_BACKGROUND;
}

function parseLayer(v: unknown, index: number): Layer | null {
  if (!isObj(v)) return null;
  const base = {
    id: str(v.id, `layer-${index}`, 64) || `layer-${index}`,
    x: num(v.x, 0, -20000, 20000),
    y: num(v.y, 0, -20000, 20000),
    w: num(v.w, 100, 1, 20000),
    h: num(v.h, 100, 1, 20000),
    rotation: num(v.rotation, 0, -360, 360),
  };
  switch (v.kind) {
    case 'photo': {
      const crop = isObj(v.crop) ? v.crop : {};
      const frame = isObj(v.frame) ? v.frame : {};
      return {
        ...base,
        kind: 'photo',
        photoId: typeof v.photoId === 'string' ? v.photoId : null,
        crop: {
          scale: num(crop.scale, 1, 1, 8),
          x: num(crop.x, 0.5, 0, 1),
          y: num(crop.y, 0.5, 0, 1),
        },
        frame: {
          radius: num(frame.radius, 0, 0, 2000),
          border: num(frame.border, 0, 0, 200),
          borderColor: color(frame.borderColor, '#FFFFFF'),
          shadow: frame.shadow === true,
        },
      };
    }
    case 'text':
      return {
        ...base,
        kind: 'text',
        text: str(v.text, '', 200),
        font: STUDIO_FONTS.includes(v.font as StudioFont) ? (v.font as StudioFont) : 'sans',
        size: num(v.size, 72, 12, 600),
        color: color(v.color, '#1B1A3A'),
        align: v.align === 'left' || v.align === 'right' ? v.align : 'center',
        bold: v.bold === true,
        background: v.background == null ? null : color(v.background, '#FFFFFF'),
      };
    case 'sticker':
      return { ...base, kind: 'sticker', emoji: str(v.emoji, '✨', 16) || '✨' };
    case 'stats':
      return { ...base, kind: 'stats', color: color(v.color, '#FF6B5B') };
    default:
      return null;
  }
}

/** Reads a stored document (JSON string or object); never throws. */
export function parseDoc(input: unknown, fallbackFormat: StudioFormat = 'post'): StudioDoc {
  let raw: unknown = input;
  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input);
    } catch {
      raw = null;
    }
  }
  if (!isObj(raw)) return newDoc(fallbackFormat, 3);
  const format: StudioFormat =
    raw.format === 'post' || raw.format === 'story' || raw.format === 'square'
      ? raw.format
      : fallbackFormat;
  const layers = Array.isArray(raw.layers) ? raw.layers : [];
  const seen = new Set<string>();
  const parsed: Layer[] = [];
  layers.slice(0, 200).forEach((l, i) => {
    const layer = parseLayer(l, i);
    if (!layer) return;
    if (seen.has(layer.id)) layer.id = `${layer.id}-${i}`;
    seen.add(layer.id);
    parsed.push(layer);
  });
  return {
    version: STUDIO_VERSION,
    format,
    slides: clampSlides(num(raw.slides, 3)),
    background: parseBackground(raw.background),
    layers: parsed,
  };
}

export function serializeDoc(doc: StudioDoc): string {
  return JSON.stringify(doc);
}

/** Photo ids used in a document, in drawing order, without repeats. */
export function photosInDoc(doc: StudioDoc): string[] {
  const out: string[] = [];
  for (const l of doc.layers)
    if (l.kind === 'photo' && l.photoId && !out.includes(l.photoId)) out.push(l.photoId);
  return out;
}
