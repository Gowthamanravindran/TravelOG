import { describe, expect, it } from 'vitest';

import {
  COLLAGE_FORMATS,
  COLLAGE_TEMPLATES,
  TEMPLATE_CAPACITY,
  collageLayout,
  pickForCollage,
  type CollageFormat,
  type Rect,
} from './collage';

const inside = (r: Rect) =>
  r.x >= 0 && r.y >= 0 && r.x + r.w <= 1 + 1e-9 && r.y + r.h <= 1 + 1e-9 && r.w > 0 && r.h > 0;
const overlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.w - 1e-9 &&
  b.x < a.x + a.w - 1e-9 &&
  a.y < b.y + b.h - 1e-9 &&
  b.y < a.y + a.h - 1e-9;

describe('collageLayout', () => {
  const formats = Object.keys(COLLAGE_FORMATS) as CollageFormat[];
  for (const template of COLLAGE_TEMPLATES) {
    for (const format of formats) {
      it(`${template} / ${format}: slots fit, don't overlap, and match the photo count`, () => {
        for (let n = 1; n <= 10; n++) {
          const l = collageLayout(template, format, n);
          expect(l.slots).toHaveLength(Math.min(n, TEMPLATE_CAPACITY[template]));
          const all = [...l.slots, l.title, l.footer, ...(l.stats ? [l.stats] : [])];
          for (const r of all) expect(inside(r)).toBe(true);
          for (let i = 0; i < all.length; i++)
            for (let j = i + 1; j < all.length; j++) expect(overlap(all[i]!, all[j]!)).toBe(false);
        }
      });
    }
  }
});

describe('pickForCollage', () => {
  const photo = (id: string, takenAt: string, dayDate: string | null = null) => ({
    id,
    takenAt,
    dayDate,
  });

  it('spreads picks across days before taking seconds from any day', () => {
    const photos = [
      photo('a1', '2026-11-12T04:00:00Z', '2026-11-12'),
      photo('a2', '2026-11-12T05:00:00Z', '2026-11-12'),
      photo('a3', '2026-11-12T06:00:00Z', '2026-11-12'),
      photo('a4', '2026-11-12T07:00:00Z', '2026-11-12'),
      photo('b1', '2026-11-13T04:00:00Z', '2026-11-13'),
      photo('c1', '2026-11-14T04:00:00Z', '2026-11-14'),
    ];
    expect(pickForCollage(photos, 3).map((p) => p.id)).toEqual(['a3', 'b1', 'c1']);
    expect(pickForCollage(photos, 4).map((p) => p.id)).toEqual(['a1', 'a4', 'b1', 'c1']);
    expect(pickForCollage(photos, 10)).toHaveLength(6);
    expect(pickForCollage(photos, 0)).toEqual([]);
  });

  it('groups by the date in takenAt when the day is unknown', () => {
    const photos = [photo('x', '2026-11-12T04:00:00Z'), photo('y', '2026-11-13T04:00:00Z')];
    expect(pickForCollage(photos, 2).map((p) => p.id)).toEqual(['x', 'y']);
  });
});
