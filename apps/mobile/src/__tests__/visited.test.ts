import { setSetting } from '@travelog/db';

import { addVisited, parseVisited, readVisited, removeVisited, VISITED_KEY } from '@/lib/visited';
import { makeDb } from '@/testing/test-utils';

describe('countries visited, as saved on this phone (Plan 74)', () => {
  it('anything that is not a list of codes reads as nothing', () => {
    expect(parseVisited(null)).toEqual([]);
    expect(parseVisited('')).toEqual([]);
    expect(parseVisited('nope')).toEqual([]);
    expect(parseVisited('{"a":1}')).toEqual([]);
    expect(parseVisited('[1, null, {}]')).toEqual([]);
  });

  it('keeps the order added; drops unknown codes and repeats; territories count as their parent', () => {
    expect(parseVisited('["IN","ZZ","JP","IN","RE","fr"]')).toEqual(['IN', 'JP', 'FR']);
  });

  it('adds, keeps the order, and never twice', () => {
    const db = makeDb();
    expect(readVisited(db)).toEqual([]);
    addVisited(db, 'IN');
    addVisited(db, 'JP');
    addVisited(db, 'IN');
    expect(readVisited(db)).toEqual(['IN', 'JP']);
  });

  it('an unknown country is not added', () => {
    const db = makeDb();
    addVisited(db, 'ZZ');
    expect(readVisited(db)).toEqual([]);
  });

  it('removes', () => {
    const db = makeDb();
    addVisited(db, 'IN');
    addVisited(db, 'JP');
    removeVisited(db, 'IN');
    removeVisited(db, 'FR');
    expect(readVisited(db)).toEqual(['JP']);
  });

  it('recovers from a broken saved value', () => {
    const db = makeDb();
    setSetting(db, VISITED_KEY, 'broken');
    expect(readVisited(db)).toEqual([]);
    addVisited(db, 'IN');
    expect(readVisited(db)).toEqual(['IN']);
  });
});
