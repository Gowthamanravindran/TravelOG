import { describe, expect, it } from 'vitest';

import { findPlaceCandidates, hashtagWords, sameName } from './place-finder';

const names = (text: string) => findPlaceCandidates(text).map((c) => c.name);

/** Plan 59: place names in captions, the way travel posts write them. */
describe('place finder', () => {
  it('reads 📍 lines, with the area after a comma', () => {
    const c = findPlaceCandidates(
      'Our favourite North Goa cafés ☕\n📍 Gunpowder, Assagao\n📍 Artjuna Café – Anjuna (₹600 for two)\n📍Bean Me Up, Vagator',
    );
    expect(c.filter((x) => x.sure)).toEqual([
      { name: 'Gunpowder', area: 'Assagao', sure: true },
      { name: 'Artjuna Café', area: null, sure: true },
      { name: 'Bean Me Up', area: 'Vagator', sure: true },
    ]);
  });

  it('reads numbered lists and labelled lines', () => {
    expect(
      names(
        '10 hidden cafés in North Goa\n1. Café Ida - Assagao\n2) Bomra’s: Candolim\n3. Mojigao\nLocation: Fontainhas, Panaji',
      ),
    ).toEqual(expect.arrayContaining(['Café Ida', 'Bomra’s', 'Mojigao', 'Fontainhas']));
  });

  it('guesses names in prose and hashtags, after the sure ones', () => {
    const c = findPlaceCandidates(
      'We watched the sunset at Chapora Fort and then walked to Thalassa. Loved it!\n#goa #travel #ArtjunaCafe #hidden_gems',
    );
    expect(c.map((x) => x.name)).toEqual(
      expect.arrayContaining(['Chapora Fort', 'Thalassa', 'Artjuna Cafe']),
    );
    expect(c.every((x) => !x.sure)).toBe(true);
    expect(c.map((x) => x.name)).not.toContain('Goa');
    expect(c.map((x) => x.name)).not.toContain('Hidden Gems');
  });

  it('ignores handles, prices and generic words', () => {
    expect(names('Follow @slowtravelgoa for more! Save this reel ✨ #fyp #wanderlust')).toEqual([]);
  });

  it('splits hashtags into words and compares names loosely', () => {
    expect(hashtagWords('#ArtjunaCafe')).toBe('Artjuna Cafe');
    expect(hashtagWords('#chapora_fort')).toBe('Chapora Fort');
    expect(sameName('Artjuna Cafe', 'Artjuna')).toBe(true);
    expect(sameName('Chapora Fort', 'Fort Aguada')).toBe(false);
  });
});
