import { eq } from 'drizzle-orm';

import { deleteRow, getRow, insertRow, liveRows, tx, updateRow, type Db } from '../db';
import { attachments, bookings, type BookingType } from '../schema';

export type Booking = typeof bookings.$inferSelect;
export type Attachment = typeof attachments.$inferSelect;

export interface BookingInput {
  tripId: string;
  type: BookingType;
  title: string;
  provider?: string | null;
  reference?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  costMinor?: number | null;
  currency?: string | null;
  notes?: string | null;
}

function validate(input: Partial<BookingInput>) {
  if (input.title !== undefined && !input.title.trim())
    throw new RangeError('please give the booking a name');
  if (input.startsAt && input.endsAt && input.endsAt < input.startsAt) {
    throw new RangeError('the booking ends before it starts');
  }
  if (input.costMinor != null && (!Number.isSafeInteger(input.costMinor) || input.costMinor < 0)) {
    throw new RangeError('cost must be a positive amount');
  }
}

export function addBooking(db: Db, input: BookingInput): Booking {
  validate(input);
  return insertRow(db, 'bookings', {
    ...input,
    title: input.title.trim().slice(0, 100),
    reference: input.reference?.trim() || null,
  });
}

export function updateBooking(db: Db, id: string, patch: Partial<BookingInput>): Booking {
  validate(patch);
  return updateRow(db, 'bookings', id, patch);
}

export function deleteBooking(db: Db, id: string): void {
  tx(db, (db) => {
    for (const a of listAttachments(db, id)) deleteRow(db, 'attachments', a.id);
    deleteRow(db, 'bookings', id);
  });
}

/** Bookings by start time; undated ones last. */
export function listBookings(db: Db, tripId: string): Booking[] {
  return liveRows(db, 'bookings', eq(bookings.tripId, tripId)).sort((a, b) => {
    if (!a.startsAt) return 1;
    if (!b.startsAt) return -1;
    return a.startsAt.localeCompare(b.startsAt);
  });
}

export function getBooking(db: Db, id: string): Booking | undefined {
  return getRow(db, 'bookings', id);
}

export function addAttachment(
  db: Db,
  input: {
    tripId: string;
    bookingId: string;
    name: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
    localUri: string;
  },
): Attachment {
  return insertRow(db, 'attachments', { ...input, remoteKey: null });
}

export function listAttachments(db: Db, bookingId: string): Attachment[] {
  return liveRows(db, 'attachments', eq(attachments.bookingId, bookingId));
}

export function deleteAttachment(db: Db, id: string): void {
  deleteRow(db, 'attachments', id);
}
