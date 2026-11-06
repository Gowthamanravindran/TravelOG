import { emptyDraft, extractPdfLayout, parseBookingPages, type BookingDraft } from '@travelog/core';
import { File } from 'expo-file-system';

import type { pickAttachment } from './files';

/**
 * Add a booking from its document (Plan 31): the picked PDF is read on the phone,
 * with no AI and no network, and its details fill the booking form for checking.
 * Scans and photos can't be read offline; they are still attached, with an empty form.
 */

export type PickedFile = NonNullable<Awaited<ReturnType<typeof pickAttachment>>>;

export interface BookingImport {
  file: PickedFile;
  drafts: BookingDraft[];
  /** False when nothing could be read (a scan, a photo, a locked PDF). */
  readable: boolean;
}

const looksLikePdf = (file: PickedFile) =>
  file.mimeType === 'application/pdf' || /\.pdf$/i.test(file.name) || !file.mimeType;

/** Reads a picked file's booking details; never throws. */
export async function readBookingDocument(
  file: PickedFile,
  trip: { currency: string; startDate?: string | null },
): Promise<Omit<BookingImport, 'file'>> {
  const unreadable = { drafts: [emptyDraft()], readable: false };
  if (!looksLikePdf(file)) return unreadable;
  try {
    const bytes = await new File(file.localUri).bytes();
    // Tables are read by position (Plan 38); the trip's dates place years the ticket leaves out.
    const pages = extractPdfLayout(bytes);
    if (!pages.length) return unreadable;
    const drafts = parseBookingPages(pages, { currency: trip.currency, tripStart: trip.startDate });
    return drafts.some((d) => d.found.length) ? { drafts, readable: true } : unreadable;
  } catch {
    return unreadable;
  }
}

// The form screen picks the result up by id (too big for route params).
const pending = new Map<string, BookingImport>();
let counter = 0;

export function stashImport(value: BookingImport): string {
  const id = `import-${Date.now()}-${++counter}`;
  pending.set(id, value);
  return id;
}

export function peekImport(id: string | undefined): BookingImport | undefined {
  return id ? pending.get(id) : undefined;
}

export function clearImport(id: string | undefined): void {
  if (id) pending.delete(id);
}
