import { describe, expect, it } from 'vitest';

import { THEME_NAMES, themeFor, type Mode } from './tokens';

describe('themeFor', () => {
  it('uses each theme’s background', () => {
    expect(themeFor('sunset', 'home', 'light').bg).toBe('#FFF4EC');
    expect(themeFor('block', 'plan', 'light').bg).toBe('#C6D9FF');
  });

  it('lets Trip mode follow the scheme', () => {
    const t = themeFor('sunset', 'trip', 'light');
    expect(t.scheme).toBe('light');
    expect(t.accent).toBe('#9A5600');
  });

  it('themeFor with null scheme is light', () => {
    expect(themeFor('sunset', 'home', null).scheme).toBe('light');
  });

  it('gives each mode its own accent in every theme', () => {
    for (const name of THEME_NAMES) {
      const accents = new Set(
        (['home', 'plan', 'trip'] as Mode[]).map((m) => themeFor(name, m, 'light').accent),
      );
      expect(accents.size).toBe(3);
    }
  });

  it('draws Colour block’s tab bar in black', () => {
    expect(themeFor('block', 'home', 'dark').tabBar.bg).toBe('#141414');
  });
});
