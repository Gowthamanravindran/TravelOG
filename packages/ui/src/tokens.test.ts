import { describe, expect, it } from 'vitest';

import { font, THEME_NAMES, themeFor, type, type Mode } from './tokens';

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

describe('fonts', () => {
  it('names one family per weight', () => {
    expect(font('display', 800).fontFamily).toBe('PlusJakartaSans_800ExtraBold');
    expect(font('display', 700).fontFamily).toBe('PlusJakartaSans_700Bold');
    expect(font('text', 600).fontFamily).toBe('Figtree_600SemiBold');
    expect(font('text', 400).fontFamily).toBe('Figtree_400Regular');
  });

  it('snaps to the nearest loaded weight', () => {
    expect(font('display', 400).fontFamily).toBe('PlusJakartaSans_700Bold');
    expect(font('text', 800).fontFamily).toBe('Figtree_600SemiBold');
  });

  it('never sets fontWeight in type styles (Android ignores it with custom fonts)', () => {
    for (const style of Object.values(type)) expect(style).not.toHaveProperty('fontWeight');
  });
});
