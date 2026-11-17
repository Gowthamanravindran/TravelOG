import { describe, expect, it } from 'vitest';

import { buildGlobeHtml, defaultTheme, globePageScript } from './globeHtml';

describe('the map page', () => {
  it('is valid JavaScript', () => {
    expect(() => new Function(globePageScript)).not.toThrow();
  });

  it('queues every call the app can make before the map is ready', () => {
    const calls: string[] = [];
    const page = { globe: undefined as Record<string, (...a: unknown[]) => void> | undefined };
    // The page draws stars and starts the map after this point; only the queue is under test.
    const head = globePageScript.slice(0, globePageScript.indexOf('// Star field.'));
    new Function('window', 'console', head)(page, { log: (s: string) => calls.push(s) });
    const sandbox = { window: page };
    for (const name of [
      'setData',
      'flyTo',
      'setSpin',
      'setQuality',
      'focusCountry',
      'clearSelection',
      'setCountryTap',
      'setReduceMotion',
      'fitPoints',
      'fitCountries',
    ])
      expect(typeof sandbox.window.globe?.[name]).toBe('function');
  });

  it('carries the theme, including tag colours, into the page', () => {
    const html = buildGlobeHtml(
      { countries: { type: 'FeatureCollection', features: [] }, tiny: [] },
      {
        theme: { ...defaultTheme, tag: '#111111', tagText: '#EEEEEE' },
        quality: 'auto',
        imageryUrl: '',
        imageryMaxZoom: 5,
        imageryAttribution: '',
        benchmark: false,
        focusOnTap: true,
        flags: {},
      },
    );
    // Booleans, not toContain: a failure would print the whole 1 MB page.
    expect(html.includes('#111111')).toBe(true);
    expect(html.includes('#EEEEEE')).toBe(true);
    expect(html.includes('#0b2239')).toBe(false);
  });
});
