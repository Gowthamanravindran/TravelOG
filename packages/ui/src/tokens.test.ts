import { describe, expect, it } from 'vitest';
import { themeFor } from './tokens';

describe('themeFor', () => {
  it('follows the system scheme in Home and Plan modes', () => {
    expect(themeFor('home', 'light').bg).toBe('#FAF7F2');
    expect(themeFor('home', 'dark').bg).toBe('#0F1020');
    expect(themeFor('plan', 'dark').scheme).toBe('dark');
  });

  it('keeps Trip mode dark even when the system is light', () => {
    const t = themeFor('trip', 'light');
    expect(t.scheme).toBe('dark');
    expect(t.accent).toBe('#14B8A6');
  });

  it('defaults to light when the system scheme is unknown', () => {
    expect(themeFor('home', null).scheme).toBe('light');
  });

  it('gives each mode its own accent', () => {
    const accents = new Set(
      ['home', 'plan', 'trip'].map((m) => themeFor(m as 'home', 'light').accent),
    );
    expect(accents.size).toBe(3);
  });
});
