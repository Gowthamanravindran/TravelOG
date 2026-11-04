import { layerBounds } from './geometry';
import {
  DEFAULT_CROP,
  MAX_SLIDES,
  slideSize,
  type Background,
  type Layer,
  type StudioDoc,
} from './model';

/**
 * Edits are pure functions (doc in, new doc out) so the editor can keep an undo
 * history and tests can check every change without a phone.
 */

export function addLayer(doc: StudioDoc, layer: Layer): StudioDoc {
  return { ...doc, layers: [...doc.layers, layer] };
}

/** Changes some fields of a layer; the kind can't change. */
export function updateLayer(doc: StudioDoc, id: string, patch: Partial<Layer>): StudioDoc {
  return {
    ...doc,
    layers: doc.layers.map((l) =>
      l.id === id ? ({ ...l, ...patch, id: l.id, kind: l.kind } as Layer) : l,
    ),
  };
}

export function removeLayer(doc: StudioDoc, id: string): StudioDoc {
  return { ...doc, layers: doc.layers.filter((l) => l.id !== id) };
}

/** Copies a layer just above the original, nudged so both are visible. */
export function duplicateLayer(doc: StudioDoc, id: string, newId: string): StudioDoc {
  const i = doc.layers.findIndex((l) => l.id === id);
  const original = doc.layers[i];
  if (!original) return doc;
  const copy = {
    ...structuredCloneLayer(original),
    id: newId,
    x: original.x + 40,
    y: original.y + 40,
  };
  const layers = [...doc.layers];
  layers.splice(i + 1, 0, copy);
  return { ...doc, layers };
}

function structuredCloneLayer(l: Layer): Layer {
  return JSON.parse(JSON.stringify(l)) as Layer;
}

/** Brings a layer forward/backward one step, or to the front/back. */
export function moveLayerZ(
  doc: StudioDoc,
  id: string,
  to: 'forward' | 'backward' | 'front' | 'back',
): StudioDoc {
  const i = doc.layers.findIndex((l) => l.id === id);
  const layer = doc.layers[i];
  if (!layer) return doc;
  const layers = doc.layers.filter((l) => l.id !== id);
  const target =
    to === 'front'
      ? layers.length
      : to === 'back'
        ? 0
        : to === 'forward'
          ? Math.min(layers.length, i + 1)
          : Math.max(0, i - 1);
  layers.splice(target, 0, layer);
  return { ...doc, layers };
}

export function setBackground(doc: StudioDoc, background: Background): StudioDoc {
  return { ...doc, background };
}

/** Puts a photo into a photo layer and resets its crop. */
export function setPhoto(doc: StudioDoc, layerId: string, photoId: string | null): StudioDoc {
  return {
    ...doc,
    layers: doc.layers.map((l) =>
      l.id === layerId && l.kind === 'photo' ? { ...l, photoId, crop: DEFAULT_CROP } : l,
    ),
  };
}

/** Fills empty photo slots, in drawing order, with the given photos. */
export function fillEmptyPhotos(doc: StudioDoc, photoIds: readonly string[]): StudioDoc {
  let next = 0;
  return {
    ...doc,
    layers: doc.layers.map((l) => {
      if (l.kind !== 'photo' || l.photoId || next >= photoIds.length) return l;
      return { ...l, photoId: photoIds[next++] ?? null, crop: DEFAULT_CROP };
    }),
  };
}

/** Adds a slide at the end (the canvas gets wider; nothing moves). */
export function addSlide(doc: StudioDoc): StudioDoc {
  if (doc.slides >= MAX_SLIDES) return doc;
  return { ...doc, slides: doc.slides + 1 };
}

/** Which slide a layer belongs to: the one under its centre. */
function homeSlide(doc: StudioDoc, layer: Layer): number {
  const { width } = slideSize(doc.format);
  const cx = layer.x + layer.w / 2;
  return Math.max(0, Math.min(doc.slides - 1, Math.floor(cx / width)));
}

/**
 * Removes slide `index`: layers that sit only on it are deleted, layers to its
 * right shift left by one slide, and layers bridging into it stay where they are.
 */
export function removeSlide(doc: StudioDoc, index: number): StudioDoc {
  if (doc.slides <= 1 || index < 0 || index >= doc.slides) return doc;
  const { width } = slideSize(doc.format);
  const left = index * width;
  const right = left + width;
  const layers: Layer[] = [];
  for (const l of doc.layers) {
    const b = layerBounds(l);
    const inside = b.x >= left - 1 && b.x + b.w <= right + 1;
    if (inside) continue;
    layers.push(b.x >= right - 1 ? { ...l, x: l.x - width } : l);
  }
  return { ...doc, slides: doc.slides - 1, layers };
}

/** Swaps two slides: layers move with the slide their centre is on. */
export function swapSlides(doc: StudioDoc, a: number, b: number): StudioDoc {
  if (a === b || a < 0 || b < 0 || a >= doc.slides || b >= doc.slides) return doc;
  const { width } = slideSize(doc.format);
  return {
    ...doc,
    layers: doc.layers.map((l) => {
      const home = homeSlide(doc, l);
      if (home === a) return { ...l, x: l.x + (b - a) * width };
      if (home === b) return { ...l, x: l.x + (a - b) * width };
      return l;
    }),
  };
}

// Undo / redo -----------------------------------------------------------------

export interface History {
  past: StudioDoc[];
  present: StudioDoc;
  future: StudioDoc[];
}

export const HISTORY_LIMIT = 50;

export function startHistory(doc: StudioDoc): History {
  return { past: [], present: doc, future: [] };
}

/** Records a change; doing something new clears redo. */
export function commit(h: History, next: StudioDoc): History {
  if (next === h.present) return h;
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] };
}

export function undo(h: History): History {
  const prev = h.past[h.past.length - 1];
  if (!prev) return h;
  return { past: h.past.slice(0, -1), present: prev, future: [h.present, ...h.future] };
}

export function redo(h: History): History {
  const [next, ...rest] = h.future;
  if (!next) return h;
  return { past: [...h.past, h.present], present: next, future: rest };
}
