import { beforeEach, describe, expect, it } from 'vitest';

import { setClock, type Db } from './db';
import {
  addChecklistItem,
  addItem,
  checkIn,
  createTrip,
  deleteChecklistItem,
  ensureMainVariant,
  listChecklist,
  listTripCheckIns,
  reminderSources,
  seedChecklist,
  setChecklistDone,
  updateChecklistItem,
  updateItem,
} from './index';
import { testDb } from './test-db';

let db: Db;
beforeEach(() => {
  db = testDb();
  setClock(() => new Date('2026-11-15T10:00:00Z'));
});

function bali() {
  return createTrip(
    db,
    { title: 'Bali', timeZone: 'Asia/Makassar', startDate: '2026-12-12', endDate: '2026-12-18' },
    { displayName: 'A' },
  ).id;
}

/** Plans 61–62: checklists and Must-do stars. */
describe('checklists', () => {
  it('adds, orders, edits, ticks and removes items', () => {
    const t = bali();
    const visa = addChecklistItem(db, t, 'ready', { title: ' Visa ', section: 'documents' });
    addChecklistItem(db, t, 'ready', { title: 'Insurance', section: 'documents' });
    addChecklistItem(db, t, 'mustdo', { title: 'Try kopi luwak' });
    expect(listChecklist(db, t, 'ready').map((i) => i.title)).toEqual(['Visa', 'Insurance']);
    expect(listChecklist(db, t, 'mustdo')).toHaveLength(1);
    expect(updateChecklistItem(db, visa.id, { dueDate: '2026-11-28', remind: true }).dueDate).toBe(
      '2026-11-28',
    );
    expect(() => updateChecklistItem(db, visa.id, { dueDate: '28/11' })).toThrow();
    expect(setChecklistDone(db, visa.id, true).doneAt).toBe('2026-11-15T10:00:00.000Z');
    expect(setChecklistDone(db, visa.id, false).doneAt).toBeNull();
    deleteChecklistItem(db, visa.id);
    expect(listChecklist(db, t, 'ready').map((i) => i.title)).toEqual(['Insurance']);
  });

  it('a starting list skips what is already there', () => {
    const t = bali();
    addChecklistItem(db, t, 'ready', { title: 'Visa' });
    const n = seedChecklist(db, t, 'ready', [
      { title: 'visa', section: 'documents' },
      { title: 'Sunscreen', section: 'packing' },
    ]);
    expect(n).toBe(1);
    expect(listChecklist(db, t, 'ready').map((i) => i.title)).toEqual(['Visa', 'Sunscreen']);
  });

  it('items with a due date and Remind me feed reminders', () => {
    const t = bali();
    const visa = addChecklistItem(db, t, 'ready', {
      title: 'Visa',
      dueDate: '2026-11-28',
      remind: true,
    });
    addChecklistItem(db, t, 'ready', { title: 'No reminder', dueDate: '2026-11-28' });
    expect(reminderSources(db).checklist).toEqual([
      { id: visa.id, tripId: t, title: 'Visa', dueDate: '2026-11-28' },
    ]);
    setChecklistDone(db, visa.id, true);
    expect(reminderSources(db).checklist).toEqual([]);
  });

  it('stops can be starred, and a trip lists all its check-ins', () => {
    const t = bali();
    const v = ensureMainVariant(db, t, '2026-12-13');
    const item = addItem(db, v.id, { type: 'place', title: 'Tirta Empul' });
    expect(item.mustDo).toBe(false);
    expect(updateItem(db, item.id, { mustDo: true }).mustDo).toBe(true);
    setClock(() => new Date('2026-12-13T02:00:00Z'));
    checkIn(db, { tripId: t, title: 'Tirta Empul', itemId: item.id });
    setClock(() => new Date('2026-12-14T02:00:00Z'));
    checkIn(db, { tripId: t, title: 'Beach' });
    expect(listTripCheckIns(db, t).map((c) => c.title)).toEqual(['Tirta Empul', 'Beach']);
  });
});
