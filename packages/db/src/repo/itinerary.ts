import { and, eq } from 'drizzle-orm';

import { deleteRow, getRow, insertRow, liveRows, tx, updateRow, type Db } from '../db';
import { itineraryItems, planVariants, type ItemType } from '../schema';

export type Variant = typeof planVariants.$inferSelect;
export type Item = typeof itineraryItems.$inferSelect;

export function listVariants(db: Db, tripId: string, dayDate: string): Variant[] {
  return liveRows(
    db,
    'plan_variants',
    and(eq(planVariants.tripId, tripId), eq(planVariants.dayDate, dayDate)),
  ).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** The day's main plan, created as "Plan A" the first time it's needed. */
export function ensureMainVariant(
  db: Db,
  tripId: string,
  dayDate: string,
  authorMemberId?: string | null,
): Variant {
  const existing = listVariants(db, tripId, dayDate);
  const main = existing.find((v) => v.isMain) ?? existing[0];
  if (main) return main;
  return insertRow(db, 'plan_variants', {
    tripId,
    dayDate,
    name: 'Plan A',
    isMain: true,
    sortOrder: 0,
    authorMemberId: authorMemberId ?? null,
  });
}

/** Adds Plan B, C… for a day, optionally copying another plan's items. */
export function addVariant(
  db: Db,
  tripId: string,
  dayDate: string,
  opts: { copyFromVariantId?: string; authorMemberId?: string | null } = {},
): Variant {
  return tx(db, (db) => {
    ensureMainVariant(db, tripId, dayDate, opts.authorMemberId);
    const existing = listVariants(db, tripId, dayDate);
    if (existing.length >= 6) throw new RangeError('a day can have up to 6 plans');
    const letter = String.fromCharCode(65 + existing.length);
    const variant = insertRow(db, 'plan_variants', {
      tripId,
      dayDate,
      name: `Plan ${letter}`,
      isMain: false,
      sortOrder: existing.length,
      authorMemberId: opts.authorMemberId ?? null,
    });
    if (opts.copyFromVariantId) {
      for (const item of listItems(db, opts.copyFromVariantId)) {
        insertRow(db, 'itinerary_items', {
          tripId,
          variantId: variant.id,
          type: item.type,
          title: item.title,
          startTime: item.startTime,
          durationMin: item.durationMin,
          estCostMinor: item.estCostMinor,
          currency: item.currency,
          notes: item.notes,
          sortOrder: item.sortOrder,
          placeName: item.placeName,
          address: item.address,
          lat: item.lat,
          lng: item.lng,
          poiId: item.poiId,
          url: item.url,
          savedPlaceId: item.savedPlaceId,
        });
      }
    }
    return variant;
  });
}

export function renameVariant(db: Db, id: string, name: string): Variant {
  if (!name.trim()) throw new RangeError('please give the plan a name');
  return updateRow(db, 'plan_variants', id, { name: name.trim().slice(0, 40) });
}

/** Makes this the day's main plan (e.g. after a vote). Other plans are kept. */
export function setMainVariant(db: Db, id: string): Variant {
  return tx(db, (db) => {
    const v = getRow(db, 'plan_variants', id);
    if (!v) throw new Error('plan not found');
    for (const other of listVariants(db, v.tripId, v.dayDate)) {
      if (other.isMain && other.id !== id)
        updateRow(db, 'plan_variants', other.id, { isMain: false });
    }
    return updateRow(db, 'plan_variants', id, { isMain: true });
  });
}

export function deleteVariant(db: Db, id: string): void {
  tx(db, (db) => {
    const v = getRow(db, 'plan_variants', id);
    if (!v) return;
    if (v.isMain)
      throw new RangeError("the main plan can't be deleted; make another plan the main one first");
    for (const item of listItems(db, id)) deleteRow(db, 'itinerary_items', item.id);
    deleteRow(db, 'plan_variants', id);
  });
}

// Items ----------------------------------------------------------------------

export interface ItemInput {
  type: ItemType;
  title: string;
  startTime?: string | null;
  durationMin?: number | null;
  estCostMinor?: number | null;
  currency?: string | null;
  notes?: string | null;
  /** Plan 57: the stop's place. */
  placeName?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  poiId?: string | null;
  url?: string | null;
  savedPlaceId?: string | null;
}

function validateItem(input: Partial<ItemInput>) {
  if (input.title !== undefined && !input.title.trim())
    throw new RangeError('please give it a name');
  if (input.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.startTime)) {
    throw new RangeError('time must look like 09:30');
  }
  if (
    input.durationMin != null &&
    (!Number.isInteger(input.durationMin) || input.durationMin < 0)
  ) {
    throw new RangeError('duration must be whole minutes');
  }
  if (
    input.estCostMinor != null &&
    (!Number.isSafeInteger(input.estCostMinor) || input.estCostMinor < 0)
  ) {
    throw new RangeError('cost must be a positive amount');
  }
  if (
    (input.lat == null) !== (input.lng == null) &&
    (input.lat !== undefined || input.lng !== undefined)
  )
    throw new RangeError('a place needs both latitude and longitude');
  if (input.lat != null && (Math.abs(input.lat) > 90 || Math.abs(input.lng!) > 180))
    throw new RangeError('that place is off the map');
}

/** Items of a plan in display order: timed items by time, then untimed in their saved order. */
export function listItems(db: Db, variantId: string): Item[] {
  return liveRows(db, 'itinerary_items', eq(itineraryItems.variantId, variantId)).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt),
  );
}

/** Every live item on a trip, in any plan or day (Plan 57: places used on the trip). */
export function liveTripItems(db: Db, tripId: string): Item[] {
  return liveRows(db, 'itinerary_items', eq(itineraryItems.tripId, tripId));
}

/**
 * Puts a plan's items in the given order (Plan 57: Best order, and its Undo). Ids missing from
 * the list keep their relative order after the listed ones.
 */
export function setItemOrder(db: Db, variantId: string, ids: readonly string[]): Item[] {
  return tx(db, (db) => {
    const items = listItems(db, variantId);
    const rank = new Map(ids.map((id, i) => [id, i]));
    const ordered = [
      ...items.filter((i) => rank.has(i.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!),
      ...items.filter((i) => !rank.has(i.id)),
    ];
    ordered.forEach((it, index) => {
      if (it.sortOrder !== index) updateRow(db, 'itinerary_items', it.id, { sortOrder: index });
    });
    return listItems(db, variantId);
  });
}

export function addItem(db: Db, variantId: string, input: ItemInput): Item {
  validateItem(input);
  const variant = getRow(db, 'plan_variants', variantId);
  if (!variant) throw new Error('plan not found');
  const items = listItems(db, variantId);
  const sortOrder = items.length ? Math.max(...items.map((i) => i.sortOrder)) + 1 : 0;
  return insertRow(db, 'itinerary_items', {
    tripId: variant.tripId,
    variantId,
    type: input.type,
    title: input.title.trim().slice(0, 120),
    startTime: input.startTime ?? null,
    durationMin: input.durationMin ?? null,
    estCostMinor: input.estCostMinor ?? null,
    currency: input.currency ?? null,
    notes: input.notes ?? null,
    placeName: input.placeName?.trim().slice(0, 160) || null,
    address: input.address?.trim().slice(0, 300) || null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    poiId: input.poiId ?? null,
    url: input.url ?? null,
    savedPlaceId: input.savedPlaceId ?? null,
    sortOrder,
  });
}

export function updateItem(db: Db, id: string, patch: Partial<ItemInput>): Item {
  validateItem(patch);
  const clean = (v: string | null | undefined, max: number) =>
    v === undefined ? undefined : v?.trim().slice(0, max) || null;
  return updateRow(db, 'itinerary_items', id, {
    ...patch,
    title: patch.title?.trim(),
    placeName: clean(patch.placeName, 160),
    address: clean(patch.address, 300),
  });
}

export function deleteItem(db: Db, id: string): void {
  deleteRow(db, 'itinerary_items', id);
}

/** Moves an item to position `toIndex` in its plan and renumbers the plan. */
export function moveItem(db: Db, id: string, toIndex: number): Item[] {
  return tx(db, (db) => {
    const item = getRow(db, 'itinerary_items', id);
    if (!item) throw new Error('item not found');
    const ordered = listItems(db, item.variantId).filter((i) => i.id !== id);
    const clamped = Math.max(0, Math.min(toIndex, ordered.length));
    ordered.splice(clamped, 0, item);
    ordered.forEach((it, index) => {
      if (it.sortOrder !== index) updateRow(db, 'itinerary_items', it.id, { sortOrder: index });
    });
    return listItems(db, item.variantId);
  });
}

/**
 * Plan 58: moves items to other days of the same trip (Plan these ideas): each goes to the end
 * of that day's main plan, which is made if needed.
 */
export function moveItemsToDays(
  db: Db,
  tripId: string,
  plan: readonly { day: string; ids: readonly string[] }[],
  memberId?: string | null,
): number {
  return tx(db, (db) => {
    let moved = 0;
    for (const { day, ids } of plan) {
      if (!ids.length) continue;
      const v = ensureMainVariant(db, tripId, day, memberId);
      let order = listItems(db, v.id).reduce((m, i) => Math.max(m, i.sortOrder + 1), 0);
      for (const id of ids) {
        const item = getRow(db, 'itinerary_items', id);
        if (!item || item.tripId !== tripId || item.variantId === v.id) continue;
        updateRow(db, 'itinerary_items', id, { variantId: v.id, sortOrder: order++ });
        moved += 1;
      }
    }
    return moved;
  });
}

export interface VariantSummary {
  itemCount: number;
  estCostMinor: number;
  firstStart: string | null;
}

export function summarizeItems(items: readonly Item[]): VariantSummary {
  const timed = items
    .map((i) => i.startTime)
    .filter((t): t is string => !!t)
    .sort();
  return {
    itemCount: items.length,
    estCostMinor: items.reduce((sum, i) => sum + (i.estCostMinor ?? 0), 0),
    firstStart: timed[0] ?? null,
  };
}
