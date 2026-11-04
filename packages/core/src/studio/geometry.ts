import { canvasSize, slideSize, type Layer, type Rect, type StudioDoc } from './model';

/** The slides as rectangles on the canvas, left to right. */
export function slideRects(doc: Pick<StudioDoc, 'format' | 'slides'>): Rect[] {
  const { width, height } = slideSize(doc.format);
  return Array.from({ length: doc.slides }, (_, i) => ({
    x: i * width,
    y: 0,
    w: width,
    h: height,
  }));
}

/** Axis-aligned box around a (possibly rotated) layer. */
export function layerBounds(layer: Pick<Layer, 'x' | 'y' | 'w' | 'h' | 'rotation'>): Rect {
  const rad = (layer.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const w = layer.w * cos + layer.h * sin;
  const h = layer.w * sin + layer.h * cos;
  const cx = layer.x + layer.w / 2;
  const cy = layer.y + layer.h / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Layers that show on slide `index` (so each exported slide draws only what it needs). */
export function layersOnSlide(doc: StudioDoc, index: number): Layer[] {
  const slide = slideRects(doc)[index];
  if (!slide) return [];
  return doc.layers.filter((l) => intersects(layerBounds(l), slide));
}

/** Slides a layer appears on, e.g. [1, 2] when it bridges the seam between slides 2 and 3. */
export function slidesOfLayer(doc: StudioDoc, layer: Layer): number[] {
  const box = layerBounds(layer);
  return slideRects(doc)
    .map((s, i) => (intersects(box, s) ? i : -1))
    .filter((i) => i >= 0);
}

export interface SnapResult {
  x: number;
  y: number;
  /** Lines to draw while snapped (canvas px). */
  guides: { vertical: number[]; horizontal: number[] };
}

/**
 * Snaps a moving layer's edges and centre to slide edges and centres, the canvas
 * middle line and other layers, within `threshold` px. Uses the layer's bounds
 * so rotated layers snap by what you see.
 */
export function snapPosition(
  doc: StudioDoc,
  moving: Layer,
  proposed: { x: number; y: number },
  threshold: number,
): SnapResult {
  const { width: slideW, height } = slideSize(doc.format);
  const { width } = canvasSize(doc);
  const vLines = new Set<number>();
  for (let i = 0; i <= doc.slides; i++) vLines.add(i * slideW);
  for (let i = 0; i < doc.slides; i++) vLines.add(i * slideW + slideW / 2);
  vLines.add(width / 2);
  const hLines = new Set<number>([0, height / 2, height]);
  for (const l of doc.layers) {
    if (l.id === moving.id) continue;
    const b = layerBounds(l);
    vLines
      .add(b.x)
      .add(b.x + b.w / 2)
      .add(b.x + b.w);
    hLines
      .add(b.y)
      .add(b.y + b.h / 2)
      .add(b.y + b.h);
  }

  const box = layerBounds({ ...moving, x: proposed.x, y: proposed.y });
  const pick = (edges: number[], lines: Set<number>) => {
    let best: { delta: number; line: number } | null = null;
    for (const e of edges) {
      for (const line of lines) {
        const delta = line - e;
        if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta)))
          best = { delta, line };
      }
    }
    return best;
  };
  const sx = pick([box.x, box.x + box.w / 2, box.x + box.w], vLines);
  const sy = pick([box.y, box.y + box.h / 2, box.y + box.h], hLines);
  return {
    x: proposed.x + (sx?.delta ?? 0),
    y: proposed.y + (sy?.delta ?? 0),
    guides: {
      vertical: sx ? [sx.line] : [],
      horizontal: sy ? [sy.line] : [],
    },
  };
}

/**
 * Where a photo of `photoW`×`photoH` is drawn inside a frame of `frameW`×`frameH`
 * for a crop: covers the frame, zoomed by crop.scale, positioned by crop.x/y.
 * Returns the photo's box relative to the frame's top-left.
 */
export function photoPlacement(
  frameW: number,
  frameH: number,
  photoW: number,
  photoH: number,
  crop: { scale: number; x: number; y: number },
): Rect {
  const cover = Math.max(frameW / photoW, frameH / photoH) * Math.max(1, crop.scale);
  const w = photoW * cover;
  const h = photoH * cover;
  return { x: -(w - frameW) * crop.x, y: -(h - frameH) * crop.y, w, h };
}
