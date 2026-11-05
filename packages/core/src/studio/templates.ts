import { collageLayout, type CollageTemplate } from '../collage';
import { fillEmptyPhotos } from './edit';
import {
  DEFAULT_CROP,
  DEFAULT_FRAME,
  MAX_SLIDES,
  STUDIO_VERSION,
  canvasSize,
  clampSlides,
  slideSize,
  type Background,
  type Frame,
  type Layer,
  type PhotoLayer,
  type StudioDoc,
  type StudioFormat,
  type TextLayer,
} from './model';

/**
 * Starting layouts. "Seamless" ones put photos across the slide seams, which is
 * what makes a carousel scroll as one picture. Classic ones reuse the Plan 13
 * one-page layouts on every slide.
 */

export const STUDIO_TEMPLATES = [
  { id: 'panorama', name: 'Panorama', seamless: true, hint: 'One photo across every slide' },
  { id: 'bridge', name: 'Bridge', seamless: true, hint: 'A photo per slide, more over the seams' },
  { id: 'scatter', name: 'Polaroids', seamless: true, hint: 'Tilted prints scattered across' },
  { id: 'film', name: 'Film roll', seamless: true, hint: 'A strip of frames running through' },
  { id: 'split', name: 'Split grid', seamless: true, hint: 'A grid that ignores the seams' },
  { id: 'grid', name: 'Grid', seamless: false, hint: 'A neat grid on each slide' },
  { id: 'hero', name: 'Big + small', seamless: false, hint: 'One big photo and a row below' },
  { id: 'polaroid', name: 'Prints', seamless: false, hint: 'Four prints on each slide' },
  { id: 'stats', name: 'Trip stats', seamless: false, hint: 'Photos and your trip numbers' },
  { id: 'blank', name: 'Blank', seamless: false, hint: 'Start from nothing' },
] as const;
export type StudioTemplateId = (typeof STUDIO_TEMPLATES)[number]['id'];

const LIGHT = '#FAF7F2';
const DARK = '#0F1020';
const INK = '#1B1A3A';
const PAPER = '#EFE7DA';

interface Built {
  background: Background;
  layers: Layer[];
}

type IdMaker = () => string;

function photo(
  id: string,
  r: { x: number; y: number; w: number; h: number },
  rotation = 0,
  frame: Partial<Frame> = {},
): PhotoLayer {
  return {
    id,
    kind: 'photo',
    ...r,
    rotation,
    photoId: null,
    crop: DEFAULT_CROP,
    frame: { ...DEFAULT_FRAME, ...frame },
  };
}

function title(
  id: string,
  text: string,
  r: { x: number; y: number; w: number; h: number },
  color: string,
  size: number,
  background: string | null = null,
): TextLayer {
  return {
    id,
    kind: 'text',
    ...r,
    rotation: 0,
    text,
    font: 'sans',
    size,
    color,
    align: 'left',
    bold: true,
    background,
  };
}

function build(
  template: StudioTemplateId,
  format: StudioFormat,
  slides: number,
  id: IdMaker,
  heading: string,
): Built {
  const { width: W, height: H } = slideSize(format);
  const total = W * slides;
  const m = 64; // outer margin

  switch (template) {
    case 'panorama':
      return {
        background: { kind: 'color', color: DARK },
        layers: [
          photo(id(), { x: 0, y: 0, w: total, h: H }),
          title(
            id(),
            heading,
            { x: m, y: H - m - 200, w: W - 2 * m, h: 200 },
            '#FFFFFF',
            84,
            '#00000066',
          ),
        ],
      };

    case 'bridge': {
      const layers: Layer[] = [];
      const mainH = Math.round(H * 0.58);
      for (let i = 0; i < slides; i++)
        layers.push(photo(id(), { x: i * W + m, y: m, w: W - 2 * m, h: mainH }, 0, { radius: 28 }));
      const bw = Math.round(W * 0.62);
      const bh = Math.round(H * 0.34);
      for (let j = 1; j < slides; j++)
        layers.push(
          photo(
            id(),
            { x: j * W - bw / 2, y: Math.round(H * 0.56), w: bw, h: bh },
            j % 2 ? -3 : 3,
            { border: 20, borderColor: '#FFFFFF', shadow: true, radius: 6 },
          ),
        );
      layers.push(
        title(
          id(),
          heading,
          { x: m, y: m + mainH + 40, w: Math.round(W * 0.6) - m, h: H - mainH - 2 * m - 40 },
          INK,
          88,
        ),
      );
      return { background: { kind: 'color', color: LIGHT }, layers };
    }

    case 'scatter': {
      const n = slides * 2;
      const pw = Math.round(W * 0.5);
      const ph = Math.min(Math.round(pw * 1.2), Math.round(H * 0.62));
      const spacing = total / n;
      const tilts = [-6, 4, -3, 5];
      const layers: Layer[] = [];
      for (let k = 0; k < n; k++) {
        // Every other print is pushed sideways so it lands on a seam.
        const cx = spacing * (k + 0.5) + (k % 2 ? 0.14 * W : -0.08 * W);
        const top = k % 2 ? Math.round(H * 0.38) : Math.round(H * 0.1);
        const y = Math.min(top, H - ph - m);
        const x = Math.max(m, Math.min(total - pw - m, cx - pw / 2));
        layers.push(
          photo(id(), { x, y, w: pw, h: ph }, tilts[k % tilts.length] ?? 0, {
            border: 22,
            borderColor: '#FFFFFF',
            shadow: true,
            radius: 4,
          }),
        );
      }
      layers.push(title(id(), heading, { x: m, y: H - m - 150, w: W - 2 * m, h: 150 }, INK, 80));
      return { background: { kind: 'color', color: PAPER }, layers };
    }

    case 'film': {
      const n = Math.max(2, Math.round(slides * 1.5));
      const gap = 24;
      const fh = Math.round(H * 0.5);
      const fw = (total - 2 * m - gap * (n - 1)) / n;
      const y = Math.round((H - fh) / 2);
      const layers: Layer[] = [];
      for (let k = 0; k < n; k++)
        layers.push(photo(id(), { x: m + k * (fw + gap), y, w: fw, h: fh }, 0, { radius: 8 }));
      layers.push(title(id(), heading, { x: m, y: m, w: W - 2 * m, h: y - m - 20 }, '#FFFFFF', 80));
      return { background: { kind: 'color', color: DARK }, layers };
    }

    case 'split': {
      const cols = Math.max(2, Math.round(slides * 1.5));
      const rows = format === 'story' ? 3 : 2;
      const gap = 16;
      const top = 220;
      const cw = (total - 2 * m - gap * (cols - 1)) / cols;
      const ch = (H - top - m - gap * (rows - 1)) / rows;
      const layers: Layer[] = [];
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          layers.push(
            photo(id(), { x: m + c * (cw + gap), y: top + r * (ch + gap), w: cw, h: ch }, 0, {
              radius: 12,
            }),
          );
      layers.push(title(id(), heading, { x: m, y: 60, w: W - 2 * m, h: 140 }, INK, 84));
      return { background: { kind: 'color', color: LIGHT }, layers };
    }

    case 'grid':
    case 'hero':
    case 'polaroid':
    case 'stats': {
      const layers: Layer[] = [];
      const dark = template === 'stats';
      for (let i = 0; i < slides; i++) {
        // The stats card goes on the first slide only; later slides use the grid.
        const kind: CollageTemplate = template === 'stats' && i > 0 ? 'grid' : template;
        const layout = collageLayout(kind, format, kind === 'grid' ? 4 : 9);
        const frame: Partial<Frame> =
          template === 'polaroid'
            ? { border: 18, borderColor: '#FFFFFF', shadow: true, radius: 4 }
            : { radius: 22 };
        for (const s of layout.slots)
          layers.push(
            photo(
              id(),
              { x: i * W + s.x * W, y: s.y * H, w: s.w * W, h: s.h * H },
              s.rotate ?? 0,
              frame,
            ),
          );
        if (i === 0) {
          const t = layout.title;
          layers.push(
            title(
              id(),
              heading,
              { x: t.x * W, y: t.y * H, w: t.w * W, h: t.h * H },
              dark ? '#FFFFFF' : INK,
              80,
            ),
          );
          if (layout.stats)
            layers.push({
              id: id(),
              kind: 'stats',
              x: layout.stats.x * W,
              y: layout.stats.y * H,
              w: layout.stats.w * W,
              h: layout.stats.h * H,
              rotation: 0,
              color: '#FF6B5B',
            });
        }
      }
      return { background: { kind: 'color', color: dark ? DARK : LIGHT }, layers };
    }

    case 'blank':
      return { background: { kind: 'color', color: LIGHT }, layers: [] };
  }
}

/** Number of photo slots a template has for a format and slide count. */
export function templatePhotoCount(
  template: StudioTemplateId,
  format: StudioFormat,
  slides: number,
): number {
  let n = 0;
  return build(template, format, clampSlides(slides), () => `t${n++}`, '').layers.filter(
    (l) => l.kind === 'photo',
  ).length;
}

/**
 * A new project document from a template, with photo slots filled in order from
 * `photoIds` (pass them already spread across the trip, e.g. with pickForCollage).
 */
export function docFromTemplate(
  template: StudioTemplateId,
  format: StudioFormat,
  slides: number,
  photoIds: readonly string[],
  makeId: IdMaker,
  heading = '',
): StudioDoc {
  const n = clampSlides(slides);
  const built = build(template, format, n, makeId, heading);
  const doc: StudioDoc = {
    version: STUDIO_VERSION,
    format,
    slides: n,
    background: built.background,
    // An empty title would just be an invisible box.
    layers: built.layers.filter((l) => l.kind !== 'text' || l.text.trim()),
  };
  return fillEmptyPhotos(doc, photoIds);
}

/** Canvas width check used by tests and the editor. */
export function fitsCanvas(doc: StudioDoc, layer: Layer): boolean {
  const { width, height } = canvasSize(doc);
  return (
    layer.x >= -1 &&
    layer.y >= -1 &&
    layer.x + layer.w <= width + 1 &&
    layer.y + layer.h <= height + 1
  );
}

/**
 * A template laid out for exactly these photos (Plan 22): the fewest slides
 * whose frames hold them all (up to 10), photos in order, and frames left empty
 * removed so there are no blank holes. Photos beyond 10 slides' worth are left
 * out.
 */
export function fitTemplate(
  template: StudioTemplateId,
  format: StudioFormat,
  photoIds: readonly string[],
  makeId: IdMaker,
  heading = '',
): StudioDoc {
  const most = templatePhotoCount(template, format, MAX_SLIDES);
  let slides = MAX_SLIDES;
  if (templatePhotoCount(template, format, 1) === most) {
    // Frames don't grow with slides (e.g. one panorama photo): a 3-slide strip.
    slides = 3;
  } else {
    const target = Math.min(photoIds.length, most);
    for (let s = 1; s <= MAX_SLIDES; s++) {
      if (templatePhotoCount(template, format, s) >= target) {
        slides = s;
        break;
      }
    }
  }
  const doc = docFromTemplate(template, format, slides, photoIds, makeId, heading);
  return { ...doc, layers: doc.layers.filter((l) => l.kind !== 'photo' || l.photoId) };
}
