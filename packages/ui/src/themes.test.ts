import { describe, expect, it } from 'vitest';

import { contrast, isViolet, oklch } from './color';
import { THEME_NAMES, themeFor, type Mode, type Scheme, type Theme } from './tokens';

const MODES: Mode[] = ['home', 'plan', 'trip'];
const SCHEMES: Scheme[] = ['light', 'dark'];

/** Every text-on-colour pair the app draws (spec §3–5). */
function pairs(t: Theme): [string, string, string][] {
  const out: [string, string, string][] = [];
  for (const bg of ['bg', 'surface', 'surface2'] as const)
    for (const fg of ['ink', 'ink2'] as const) out.push([`${fg} on ${bg}`, t[fg], t[bg]]);
  out.push(['label on accent', t.onAccent, t.accent], ['accent on tint', t.accent, t.accentSoft]);
  if (t.band) out.push(['ink on band', t.ink, t.band], ['ink2 on band', t.ink2, t.band]);
  for (const [k, v] of Object.entries(t.tiles)) out.push([`tile ${k}`, v.fg, v.bg]);
  out.push(
    ['tab icon', t.tabBar.fg, t.tabBar.bg],
    ['active tab icon', t.tabBar.activeFg, t.tabBar.activeBg],
    ['active tab label', t.tabBar.activeLabel, t.tabBar.bg],
  );
  // Status and accent text also sit straight on the screen background (errors, links, eyebrows).
  for (const [k, ground] of [
    ['card', t.surface],
    ['background', t.bg],
  ] as const)
    out.push(
      [`success on ${k}`, t.success, ground],
      [`danger on ${k}`, t.danger, ground],
      [`accent on ${k}`, t.accent, ground],
    );
  return out;
}

function colours(t: Theme): string[] {
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === 'string' && v.startsWith('#')) out.push(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(t);
  return out;
}

describe('themes', () => {
  it('every theme × scheme × mode passes contrast and has no violet', () => {
    const bad: string[] = [];
    for (const name of THEME_NAMES)
      for (const scheme of SCHEMES)
        for (const mode of MODES) {
          const t = themeFor(name, mode, scheme);
          for (const [what, fg, bg] of pairs(t)) {
            const c = contrast(fg, bg);
            if (c < 4.5)
              bad.push(`${name} ${scheme} ${mode}: ${what} ${fg} on ${bg} = ${c.toFixed(2)}`);
          }
          for (const x of colours(t))
            if (isViolet(x)) bad.push(`${name} ${scheme} ${mode}: violet ${x}`);
        }
    expect(bad).toEqual([]);
  });

  it('color maths', () => {
    expect(contrast('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(Math.abs(oklch('#5B5BD6').H - 278.3)).toBeLessThan(1);
    expect(isViolet('#5B5BD6')).toBe(true);
    expect(isViolet('#2457D6')).toBe(false);
  });
});
