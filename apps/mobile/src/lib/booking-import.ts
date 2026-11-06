import { emptyDraft, extractPdfLayout, parseBookingPages, type BookingDraft } from '@travelog/core';
import { File } from 'expo-file-system';

import type { PickedFile } from './files';

/**
 * Add a booking from its document (Plan 31): the picked PDF is read on the phone,
 * with no AI and no network, and its details fill the booking form for checking.
 * Scans and photos can't be read offline; they are still attached, with an empty form.
 */

export type { PickedFile };

/** What one file gave: its bookings, or an empty one when it couldn't be read. */
export interface FileRead {
  file: PickedFile;
  drafts: BookingDraft[];
  /** False when nothing could be read (a scan, a photo, a locked PDF). */
  readable: boolean;
}

/** One booking to check in the form, with the file it came from. */
export interface ImportStep {
  file: PickedFile;
  draft: BookingDraft;
  readable: boolean;
}

/** Everything picked at once (Plan 39): one step per booking, in date order. */
export interface BookingImport {
  steps: ImportStep[];
  /** Bookings found twice (the same file saved twice, or two copies of a voucher). */
  skipped: number;
  /** More than the maximum number of files were picked; the rest were left out. */
  truncated: boolean;
}

const sameBooking = (a: BookingDraft, b: BookingDraft) =>
  !!a.reference &&
  a.reference === b.reference &&
  a.type === b.type &&
  a.startDate === b.startDate &&
  a.startTime === b.startTime;

/**
 * Turns what each file gave into steps: one per booking, duplicates dropped
 * (same type, reference and start), sorted by start, undated ones last.
 */
export function buildImport(reads: FileRead[], truncated = false): BookingImport {
  const steps: ImportStep[] = [];
  let skipped = 0;
  for (const r of reads)
    for (const draft of r.drafts) {
      if (r.readable && steps.some((s) => s.readable && sameBooking(s.draft, draft))) {
        skipped++;
        continue;
      }
      steps.push({ file: r.file, draft, readable: r.readable });
    }
  const key = (s: ImportStep) =>
    s.draft.startDate ? `${s.draft.startDate} ${s.draft.startTime ?? ''}` : '\uffff';
  // A stable sort keeps a file's own order (its legs) for equal starts.
  steps.sort((a, b) => key(a).localeCompare(key(b)));
  return { steps, skipped, truncated };
}

const looksLikePdf = (file: PickedFile) =>
  file.mimeType === 'application/pdf' || /\.pdf$/i.test(file.name) || !file.mimeType;

/** Reads a picked file's booking details; never throws. */
export async function readBookingDocument(
  file: PickedFile,
  trip: { currency: string; startDate?: string | null },
): Promise<Omit<FileRead, 'file'>> {
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
