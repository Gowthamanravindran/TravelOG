import { and, eq } from 'drizzle-orm';

import { deleteRow, getRow, insertRow, liveRows, now, tx, updateRow, type Db } from '../db';
import { checklistItems, type ChecklistList, type ChecklistSection } from '../schema';

/**
 * Plan 61 (Get ready) and Plan 62 (Must-do): checklist items added by hand. Items the app
 * ticks from the trip (bookings, stays, budget) are worked out in @travelog/core, not stored.
 */
export type ChecklistItem = typeof checklistItems.$inferSelect;

export interface ChecklistInput {
  title: string;
  section?: ChecklistSection;
  dueDate?: string | null;
  remind?: boolean;
  note?: string | null;
}

function validate(input: Partial<ChecklistInput>) {
  if (input.title !== undefined && !input.title.trim())
    throw new RangeError('please give it a name');
  if (input.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate))
    throw new RangeError('due date must look like 2026-11-28');
}

/** A trip's items on one list, in their order. */
export function listChecklist(db: Db, tripId: string, list: ChecklistList): ChecklistItem[] {
  return liveRows(
    db,
    'checklist_items',
    and(eq(checklistItems.tripId, tripId), eq(checklistItems.list, list)),
  ).sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

export function addChecklistItem(
  db: Db,
  tripId: string,
  list: ChecklistList,
  input: ChecklistInput,
): ChecklistItem {
  validate(input);
  const items = listChecklist(db, tripId, list);
  return insertRow(db, 'checklist_items', {
    tripId,
    list,
    title: input.title.trim().slice(0, 120),
    section: input.section ?? 'other',
    dueDate: input.dueDate ?? null,
    remind: input.remind ?? false,
    note: input.note?.trim() || null,
    sortOrder: items.reduce((m, i) => Math.max(m, i.sortOrder + 1), 0),
  });
}

export function updateChecklistItem(
  db: Db,
  id: string,
  patch: Partial<ChecklistInput>,
): ChecklistItem {
  validate(patch);
  return updateRow(db, 'checklist_items', id, {
    ...patch,
    title: patch.title?.trim().slice(0, 120),
    note: patch.note === undefined ? undefined : patch.note?.trim() || null,
  });
}

/** Ticks or unticks an item; `checkInId` links a Must-do to the check-in it made. */
export function setChecklistDone(
  db: Db,
  id: string,
  done: boolean,
  checkInId: string | null = null,
): ChecklistItem {
  return updateRow(db, 'checklist_items', id, {
    doneAt: done ? now().toISOString() : null,
    checkInId: done ? checkInId : null,
  });
}

export function getChecklistItem(db: Db, id: string): ChecklistItem | undefined {
  return getRow(db, 'checklist_items', id);
}

export function deleteChecklistItem(db: Db, id: string): void {
  deleteRow(db, 'checklist_items', id);
}

/** Adds a starting list (Get ready's suggestions), skipping titles already there. */
export function seedChecklist(
  db: Db,
  tripId: string,
  list: ChecklistList,
  items: readonly { title: string; section: ChecklistSection }[],
): number {
  return tx(db, (db) => {
    const have = new Set(listChecklist(db, tripId, list).map((i) => i.title.toLowerCase()));
    let added = 0;
    for (const it of items) {
      if (have.has(it.title.toLowerCase())) continue;
      addChecklistItem(db, tripId, list, it);
      have.add(it.title.toLowerCase());
      added += 1;
    }
    return added;
  });
}
