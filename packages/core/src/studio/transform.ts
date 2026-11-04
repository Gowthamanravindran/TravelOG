import { photoPlacement, snapPosition } from './geometry';
import type { Layer, StudioDoc } from './model';

/** What two fingers did since the gesture started, in canvas units. */
export interface GestureDelta {
  /** Movement in canvas px. */
  dx: number;
  dy: number;
  /** Pinch factor (1 = unchanged). */
  scale: number;
  /** Twist in degrees. */
  rotation: number;
}

export interface TransformResult {
  patch: Partial<Layer>;
  guides: { vertical: number[]; horizontal: number[] };
}

const MIN_SIZE = 40;
const ROTATION_SNAP = 3;

function snapAngle(deg: number): number {
  const nearest = Math.round(deg / 90) * 90;
  return Math.abs(deg - nearest) <= ROTATION_SNAP ? nearest : Math.round(deg * 10) / 10;
}

/**
 * Moves, resizes and rotates a layer around its centre ("move" mode), or pans and
 * zooms the photo inside its frame ("crop" mode). Pure, so the editor can call it
 * on every gesture frame and tests can check it.
 */
export function transformLayer(
  doc: StudioDoc,
  start: Layer,
  d: GestureDelta,
  opts: { mode: 'move' | 'crop'; snapThreshold: number; photoSize?: { w: number; h: number } },
): TransformResult {
  const none = { vertical: [], horizontal: [] };

  if (opts.mode === 'crop' && start.kind === 'photo') {
    const b = start.frame.border;
    const fw = Math.max(1, start.w - 2 * b);
    const fh = Math.max(1, start.h - 2 * b);
    const scale = Math.max(1, Math.min(8, start.crop.scale * d.scale));
    const place = photoPlacement(fw, fh, opts.photoSize?.w || fw, opts.photoSize?.h || fh, {
      ...start.crop,
      scale,
    });
    const overflowX = place.w - fw;
    const overflowY = place.h - fh;
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    return {
      patch: {
        crop: {
          scale,
          // Dragging right shows more of the left side of the photo.
          x: overflowX > 0 ? clamp(start.crop.x - d.dx / overflowX) : 0.5,
          y: overflowY > 0 ? clamp(start.crop.y - d.dy / overflowY) : 0.5,
        },
      } as Partial<Layer>,
      guides: none,
    };
  }

  const s = Math.max(MIN_SIZE / Math.min(start.w, start.h), d.scale);
  const w = start.w * s;
  const h = start.h * s;
  const cx = start.x + start.w / 2 + d.dx;
  const cy = start.y + start.h / 2 + d.dy;
  let x = cx - w / 2;
  let y = cy - h / 2;
  let guides: TransformResult['guides'] = none;
  // Snap only plain moves; snapping while resizing fights the fingers.
  if (Math.abs(s - 1) < 0.01) {
    const snapped = snapPosition(doc, { ...start, w, h }, { x, y }, opts.snapThreshold);
    x = snapped.x;
    y = snapped.y;
    guides = snapped.guides;
  }
  const patch: Partial<Layer> = { x, y, w, h, rotation: snapAngle(start.rotation + d.rotation) };
  if (start.kind === 'text')
    (patch as { size?: number }).size = Math.max(12, Math.min(600, start.size * s));
  return { patch, guides };
}
