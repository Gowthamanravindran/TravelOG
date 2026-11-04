/**
 * Memories collages (docs/01 §6): which photos to use and where they go.
 * Pure geometry; the app draws it and captures the picture.
 * All rectangles are fractions (0–1) of the canvas, so any size can be exported.
 */

export const COLLAGE_FORMATS = {
  post: { label: 'Post 4:5', width: 1080, height: 1350 },
  story: { label: 'Story 9:16', width: 1080, height: 1920 },
  square: { label: 'Square', width: 1080, height: 1080 },
} as const;
export type CollageFormat = keyof typeof COLLAGE_FORMATS;

export const COLLAGE_TEMPLATES = ['grid', 'hero', 'polaroid', 'film', 'stats'] as const;
export type CollageTemplate = (typeof COLLAGE_TEMPLATES)[number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Degrees, for polaroids. */
  rotate?: number;
}

export interface CollageLayout {
  slots: Rect[];
  title: Rect;
  footer: Rect;
  /** Where the trip-stats card goes (stats template only). */
  stats?: Rect;
  dark: boolean;
  /** Photo slots get a white border (polaroid) or sprocket strip (film). */
  frame: 'none' | 'polaroid' | 'film';
}

/** How many photos each template uses at most. */
export const TEMPLATE_CAPACITY: Record<CollageTemplate, number> = {
  grid: 9,
  hero: 4,
  polaroid: 4,
  film: 4,
  stats: 2,
};

export interface PhotoForPick {
  id: string;
  takenAt: string;
  dayDate: string | null;
}

/**
 * Picks up to `count` photos spread across the trip's days: one from each day in
 * turn (earliest day first), so a collage isn't all from the first afternoon.
 * Within a day, photos are taken evenly spaced through the day.
 */
export function pickForCollage<T extends PhotoForPick>(photos: readonly T[], count: number): T[] {
  if (count <= 0) return [];
  const byDay = new Map<string, T[]>();
  for (const p of [...photos].sort((a, b) => a.takenAt.localeCompare(b.takenAt))) {
    const day = p.dayDate ?? p.takenAt.slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(p);
    byDay.set(day, list);
  }
  const days = [...byDay.keys()].sort();
  // How many to take from each day, round-robin.
  const quota = new Map(days.map((d) => [d, 0]));
  let left = Math.min(count, photos.length);
  while (left > 0) {
    for (const d of days) {
      if (left === 0) break;
      if ((quota.get(d) ?? 0) < (byDay.get(d)?.length ?? 0)) {
        quota.set(d, (quota.get(d) ?? 0) + 1);
        left -= 1;
      }
    }
  }
  const out: T[] = [];
  for (const d of days) {
    const list = byDay.get(d) ?? [];
    const n = quota.get(d) ?? 0;
    for (let i = 0; i < n; i++) {
      const at =
        n === 1 ? Math.floor(list.length / 2) : Math.round((i * (list.length - 1)) / (n - 1));
      const photo = list[at];
      if (photo) out.push(photo);
    }
  }
  return out;
}

function gridDims(count: number, portrait: boolean): [cols: number, rows: number] {
  if (count <= 1) return [1, 1];
  if (count === 2) return portrait ? [1, 2] : [2, 1];
  if (count <= 4) return [2, 2];
  if (count <= 6) return [2, 3];
  return [3, 3];
}

/** Splits `area` into a cols×rows grid with `gap` between cells. */
function grid(
  area: Rect,
  cols: number,
  rows: number,
  gapX: number,
  gapY: number,
  count: number,
): Rect[] {
  const w = (area.w - gapX * (cols - 1)) / cols;
  const h = (area.h - gapY * (rows - 1)) / rows;
  const out: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (out.length === count) return out;
      out.push({ x: area.x + c * (w + gapX), y: area.y + r * (h + gapY), w, h });
    }
  }
  return out;
}

/**
 * Layout for a template and format with `count` photos (clamped to the template's capacity).
 * Gaps are equal in pixels horizontally and vertically.
 */
export function collageLayout(
  template: CollageTemplate,
  format: CollageFormat,
  count: number,
): CollageLayout {
  const { width, height } = COLLAGE_FORMATS[format];
  const aspect = height / width;
  const n = Math.max(1, Math.min(count, TEMPLATE_CAPACITY[template]));
  const pad = 0.045;
  const padY = pad / aspect;
  const gap = 0.02;
  const gapY = gap / aspect;
  const titleH = 0.13 / aspect + (format === 'story' ? 0.04 : 0);
  const footerH = 0.05 / aspect;
  const title: Rect = { x: pad, y: padY, w: 1 - 2 * pad, h: titleH };
  const footer: Rect = { x: pad, y: 1 - padY - footerH, w: 1 - 2 * pad, h: footerH };
  const body: Rect = {
    x: pad,
    y: title.y + title.h + gapY,
    w: 1 - 2 * pad,
    h: footer.y - gapY - (title.y + title.h + gapY),
  };

  switch (template) {
    case 'grid': {
      const [cols, rows] = gridDims(n, aspect >= 1);
      return {
        slots: grid(body, cols, rows, gap, gapY, n),
        title,
        footer,
        dark: false,
        frame: 'none',
      };
    }
    case 'hero': {
      if (n === 1) return { slots: [body], title, footer, dark: false, frame: 'none' };
      const heroH = body.h * 0.62;
      const hero: Rect = { x: body.x, y: body.y, w: body.w, h: heroH };
      const rest: Rect = {
        x: body.x,
        y: body.y + heroH + gapY,
        w: body.w,
        h: body.h - heroH - gapY,
      };
      return {
        slots: [hero, ...grid(rest, n - 1, 1, gap, gapY, n - 1)],
        title,
        footer,
        dark: false,
        frame: 'none',
      };
    }
    case 'polaroid': {
      const [cols, rows] = n === 1 ? [1, 1] : n === 2 ? (aspect >= 1 ? [1, 2] : [2, 1]) : [2, 2];
      const cells = grid(body, cols, rows, gap, gapY, n);
      const tilts = [-4, 3, 2.5, -3];
      // Shrink each cell so tilted frames stay inside the canvas.
      const slots = cells.map((c, i) => {
        const s = 0.88;
        return {
          x: c.x + (c.w * (1 - s)) / 2,
          y: c.y + (c.h * (1 - s)) / 2,
          w: c.w * s,
          h: c.h * s,
          rotate: tilts[i % tilts.length],
        };
      });
      return { slots, title, footer, dark: false, frame: 'polaroid' };
    }
    case 'film': {
      const strip: Rect = { x: 0.16, y: body.y, w: 0.68, h: body.h };
      return {
        slots: grid(strip, 1, n, gap, gapY * 0.6, n),
        title,
        footer,
        dark: true,
        frame: 'film',
      };
    }
    case 'stats': {
      const statsH = body.h * 0.3;
      const photosArea: Rect = { x: body.x, y: body.y, w: body.w, h: body.h - statsH - gapY };
      const stats: Rect = {
        x: body.x,
        y: photosArea.y + photosArea.h + gapY,
        w: body.w,
        h: statsH,
      };
      const [cols, rows] = n === 1 ? [1, 1] : aspect >= 1.3 ? [1, 2] : [2, 1];
      return {
        slots: grid(photosArea, cols, rows, gap, gapY, n),
        title,
        footer,
        stats,
        dark: true,
        frame: 'none',
      };
    }
  }
}
