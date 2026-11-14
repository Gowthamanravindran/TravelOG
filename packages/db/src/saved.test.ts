import { beforeEach, describe, expect, it } from 'vitest';

import { setClock, type Db } from './db';
import {
  addItem,
  addSavedToTrip,
  createTrip,
  deleteSaved,
  ensureMainVariant,
  listItems,
  listSaved,
  moveItemsToDays,
  savedForItem,
  savedNear,
  savedOnTrip,
  savePlace,
} from './index';
import { testDb } from './test-db';

let db: Db;
beforeEach(() => {
  db = testDb();
  let n = 0;
  setClock(() => new Date(Date.UTC(2026, 10, 14, 10, 0, n++)));
});

const artjuna = { lat: 15.5791, lng: 73.7402 };
const kochi = { lat: 9.9658, lng: 76.2421 };

function goa() {
  return createTrip(
    db,
    { title: 'Goa', timeZone: 'Asia/Kolkata', startDate: '2026-11-14', endDate: '2026-11-16' },
    { displayName: 'A' },
  );
}

/** Plan 58: places you want to go, across trips. */
describe('saved places', () => {
  it('saves a place once, however often it is saved', () => {
    const a = savePlace(db, { title: 'Artjuna', type: 'food', poiId: 'osm:N1', ...artjuna });
    const again = savePlace(db, {
      title: 'Artjuna Café',
      poiId: 'osm:N1',
      ...artjuna,
      area: 'Anjuna',
    });
    expect(again.id).toBe(a.id);
    expect(again).toMatchObject({ title: 'Artjuna Café', area: 'Anjuna', type: 'food' });
    savePlace(db, { title: 'Kashi Art Café', countryCode: 'in', ...kochi });
    expect(listSaved(db).map((s) => s.title)).toEqual(['Kashi Art Café', 'Artjuna Café']);
    expect(listSaved(db)[0]!.countryCode).toBe('IN');
    expect(() => savePlace(db, { title: ' ' })).toThrow();
    deleteSaved(db, a.id);
    expect(listSaved(db)).toHaveLength(1);
  });

  it('finds the ones near a trip, and by country when there is no point', () => {
    savePlace(db, { title: 'Artjuna', ...artjuna, countryCode: 'IN' });
    savePlace(db, { title: 'Kashi Art Café', ...kochi, countryCode: 'IN' });
    savePlace(db, { title: 'Somewhere typed', countryCode: 'IN' });
    expect(savedNear(db, { centre: { lat: 15.49, lng: 73.83 } }).map((s) => s.title)).toEqual([
      'Artjuna',
    ]);
    expect(savedNear(db, { centre: null, countryCode: 'in' })).toHaveLength(3);
  });

  it('adds saved places to a trip once, keeping where they are', () => {
    const t = goa();
    const a = savePlace(db, { title: 'Artjuna', type: 'food', ...artjuna });
    expect(addSavedToTrip(db, [a.id], t.id, 'ideas')).toBe(1);
    expect(addSavedToTrip(db, [a.id], t.id, 'ideas')).toBe(0);
    const v = ensureMainVariant(db, t.id, 'ideas');
    const [item] = listItems(db, v.id);
    expect(item).toMatchObject({
      title: 'Artjuna',
      type: 'food',
      lat: artjuna.lat,
      savedPlaceId: a.id,
    });
    expect(savedOnTrip(db, t.id).has(a.id)).toBe(true);
    expect(savedForItem(db, item!)?.id).toBe(a.id);
  });

  it('moves ideas to days, at the end of each day', () => {
    const t = goa();
    const ideas = ensureMainVariant(db, t.id, 'ideas');
    const day = ensureMainVariant(db, t.id, '2026-11-15');
    addItem(db, day.id, { type: 'note', title: 'Already there' });
    const x = addItem(db, ideas.id, { type: 'place', title: 'Fort' });
    const y = addItem(db, ideas.id, { type: 'place', title: 'Beach' });
    expect(moveItemsToDays(db, t.id, [{ day: '2026-11-15', ids: [x.id, y.id] }])).toBe(2);
    expect(listItems(db, day.id).map((i) => i.title)).toEqual(['Already there', 'Fort', 'Beach']);
    expect(listItems(db, ideas.id)).toHaveLength(0);
  });
});
