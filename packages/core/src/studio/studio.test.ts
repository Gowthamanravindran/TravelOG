import { describe, expect, it } from 'vitest';

import {
  STUDIO_TEMPLATES,
  addLayer,
  addSlide,
  canvasSize,
  commit,
  docFromTemplate,
  duplicateLayer,
  layerBounds,
  layersOnSlide,
  moveLayerZ,
  newDoc,
  parseDoc,
  photoPlacement,
  photosInDoc,
  redo,
  removeSlide,
  serializeDoc,
  setPhoto,
  slidesOfLayer,
  snapPosition,
  startHistory,
  swapSlides,
  templatePhotoCount,
  undo,
  updateLayer,
  type Layer,
  type StudioFormat,
} from '../index';

let n = 0;
const ids = () => `id${n++}`;
const sticker = (id: string, x: number, y = 100, w = 200, h = 200, rotation = 0): Layer => ({
  id,
  kind: 'sticker',
  emoji: '🌴',
  x,
  y,
  w,
  h,
  rotation,
});

describe('studio documents', () => {
  it('round-trips and repairs stored documents', () => {
    const doc = docFromTemplate('bridge', 'post', 3, ['a', 'b'], ids, 'Goa');
    expect(parseDoc(serializeDoc(doc))).toEqual(doc);

    expect(parseDoc('not json', 'story')).toEqual(newDoc('story', 3));
    const repaired = parseDoc({
      format: 'post',
      slides: 99,
      background: { kind: 'color', color: 'red' },
      layers: [
        { id: 'x', kind: 'mystery' },
        { id: 'p', kind: 'photo', x: 'oops', w: 500, h: 500, crop: { scale: 0.2 } },
        { id: 'p', kind: 'text', text: 'Hi', size: 9999, font: 'comic' },
      ],
    });
    expect(repaired.slides).toBe(10);
    expect(repaired.background).toEqual({ kind: 'color', color: '#FAF7F2' });
    expect(repaired.layers.map((l) => [l.id, l.kind])).toEqual([
      ['p', 'photo'],
      ['p-2', 'text'],
    ]);
    const [p, t] = repaired.layers;
    expect(p).toMatchObject({ x: 0, crop: { scale: 1, x: 0.5, y: 0.5 } });
    expect(t).toMatchObject({ size: 600, font: 'sans' });
  });
});

describe('templates', () => {
  const formats: StudioFormat[] = ['post', 'square', 'story'];
  for (const t of STUDIO_TEMPLATES) {
    it(`${t.id}: fits the canvas for every format and 1–10 slides`, () => {
      for (const format of formats) {
        for (let slides = 1; slides <= 10; slides++) {
          const count = templatePhotoCount(t.id, format, slides);
          const photos = Array.from({ length: count + 2 }, (_, i) => `p${i}`);
          const doc = docFromTemplate(t.id, format, slides, photos, ids, 'Our trip');
          const { width, height } = canvasSize(doc);
          for (const l of doc.layers) {
            const b = layerBounds(l);
            expect(b.x).toBeGreaterThanOrEqual(-1);
            expect(b.y).toBeGreaterThanOrEqual(-1);
            expect(b.x + b.w).toBeLessThanOrEqual(width + 1);
            expect(b.y + b.h).toBeLessThanOrEqual(height + 1);
          }
          // Every slot gets a photo when there are enough.
          expect(photosInDoc(doc)).toHaveLength(count);
          if (t.seamless && slides >= 2) {
            expect(
              doc.layers.some((l) => l.kind === 'photo' && slidesOfLayer(doc, l).length > 1),
            ).toBe(true);
          }
        }
      }
    });
  }

  it('fills slots in order and leaves the rest empty', () => {
    const doc = docFromTemplate('grid', 'post', 1, ['a', 'b'], ids);
    const slots = doc.layers.filter((l) => l.kind === 'photo');
    expect(slots.map((l) => (l.kind === 'photo' ? l.photoId : null))).toEqual([
      'a',
      'b',
      null,
      null,
    ]);
    // No heading → no empty text box.
    expect(doc.layers.some((l) => l.kind === 'text')).toBe(false);
  });
});

describe('geometry', () => {
  it('knows which slides a layer is on', () => {
    let doc = newDoc('post', 3);
    doc = addLayer(doc, sticker('a', 980)); // 980–1180 crosses the first seam
    doc = addLayer(doc, sticker('b', 1300));
    expect(slidesOfLayer(doc, doc.layers[0]!)).toEqual([0, 1]);
    expect(layersOnSlide(doc, 1).map((l) => l.id)).toEqual(['a', 'b']);
    expect(layersOnSlide(doc, 2)).toEqual([]);
  });

  it('rotation widens the bounds', () => {
    const b = layerBounds({ x: 0, y: 0, w: 100, h: 100, rotation: 45 });
    expect(b.w).toBeCloseTo(141.42, 1);
    expect(b.x).toBeCloseTo(-20.71, 1);
  });

  it('snaps to seams, slide centres and other layers', () => {
    let doc = newDoc('post', 2);
    doc = addLayer(doc, sticker('other', 100, 500));
    const moving = sticker('m', 0, 0);
    // Left edge 6 px from the seam at 1080.
    const seam = snapPosition(doc, moving, { x: 1086, y: 900 }, 10);
    expect(seam.x).toBe(1080);
    expect(seam.guides.vertical).toEqual([1080]);
    // Top edge 4 px from the other layer's top (500).
    const other = snapPosition(doc, moving, { x: 1500, y: 504 }, 10);
    expect(other.y).toBe(500);
    // Nothing near: unchanged.
    expect(snapPosition(doc, moving, { x: 1500, y: 950 }, 5)).toMatchObject({ x: 1500, y: 950 });
  });

  it('places a photo to cover its frame', () => {
    // Landscape photo in a square frame: height fits, width overflows.
    expect(photoPlacement(100, 100, 400, 200, { scale: 1, x: 0.5, y: 0.5 })).toEqual({
      x: -50,
      y: -0,
      w: 200,
      h: 100,
    });
    expect(photoPlacement(100, 100, 400, 200, { scale: 2, x: 0, y: 1 })).toEqual({
      x: -0,
      y: -100,
      w: 400,
      h: 200,
    });
  });
});

describe('edits and history', () => {
  it('removes a slide: drops its layers, shifts later ones, keeps bridges', () => {
    let doc = newDoc('post', 3);
    doc = addLayer(doc, sticker('only1', 1200)); // on slide 2 only
    doc = addLayer(doc, sticker('bridge', 980)); // slides 1–2
    doc = addLayer(doc, sticker('later', 2300)); // slide 3
    const next = removeSlide(doc, 1);
    expect(next.slides).toBe(2);
    expect(next.layers.map((l) => [l.id, l.x])).toEqual([
      ['bridge', 980],
      ['later', 1220],
    ]);
    expect(removeSlide(newDoc('post', 1), 0).slides).toBe(1);
  });

  it('swaps slides by where each layer sits', () => {
    let doc = newDoc('post', 3);
    doc = addLayer(doc, sticker('a', 100));
    doc = addLayer(doc, sticker('c', 2200));
    const next = swapSlides(doc, 0, 2);
    expect(next.layers.map((l) => l.x)).toEqual([2260, 40]);
  });

  it('duplicates, reorders and never changes a layer kind', () => {
    let doc = addLayer(addLayer(newDoc('post', 1), sticker('a', 0)), sticker('b', 10));
    doc = duplicateLayer(doc, 'a', 'a2');
    expect(doc.layers.map((l) => l.id)).toEqual(['a', 'a2', 'b']);
    expect(doc.layers[1]).toMatchObject({ x: 40, y: 140 });
    doc = moveLayerZ(doc, 'a', 'front');
    expect(doc.layers.map((l) => l.id)).toEqual(['a2', 'b', 'a']);
    doc = updateLayer(doc, 'a', { kind: 'text', x: 5 } as Partial<Layer>);
    expect(doc.layers[2]).toMatchObject({ kind: 'sticker', x: 5 });
  });

  it('setPhoto resets the crop; addSlide stops at 10', () => {
    let doc = docFromTemplate('panorama', 'post', 2, ['a'], ids);
    const slot = doc.layers.find((l) => l.kind === 'photo')!;
    doc = updateLayer(doc, slot.id, { crop: { scale: 3, x: 0, y: 0 } } as Partial<Layer>);
    doc = setPhoto(doc, slot.id, 'b');
    expect(doc.layers.find((l) => l.id === slot.id)).toMatchObject({
      photoId: 'b',
      crop: { scale: 1, x: 0.5, y: 0.5 },
    });
    let wide = newDoc('post', 9);
    wide = addSlide(addSlide(wide));
    expect(wide.slides).toBe(10);
  });

  it('undoes and redoes; a new edit clears redo', () => {
    const a = newDoc('post', 1);
    const b = addSlide(a);
    const c = addSlide(b);
    let h = commit(commit(startHistory(a), b), c);
    h = undo(undo(h));
    expect(h.present).toBe(a);
    h = redo(h);
    expect(h.present).toBe(b);
    h = commit(h, addSlide(b));
    expect(h.future).toEqual([]);
    expect(undo(startHistory(a)).present).toBe(a);
  });
});
