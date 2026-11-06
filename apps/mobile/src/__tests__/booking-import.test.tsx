import { createTrip, listAttachments, listBookings, listExpenses } from '@travelog/db';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import BookingEditor from '@/app/trip/[id]/booking';
import { BookingsView } from '@/components/bookings-view';
import { buildImport, stashImport } from '@/lib/booking-import';
import { makeDb, withData } from '@/testing/test-utils';
import { emptyDraft, type BookingDraft } from '@travelog/core';

// The ticket PDF used by the core tests: printed by a browser, so it's laid out
// like a real e-ticket.
const TICKET = readFileSync(
  path.join(
    path.dirname(require.resolve('@travelog/core/package.json')),
    'src/pdf/__fixtures__/chromium-ticket.pdf',
  ),
);

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
}));

const mockPick = jest.fn();
jest.mock('@/lib/files', () => ({
  pickAttachment: () => mockPick(),
  // Several files at once (Plan 39): the mock returns one file or a list.
  pickAttachments: async () => {
    const f = await mockPick();
    if (!f) return null;
    const all = Array.isArray(f) ? f : [f];
    return { files: all.slice(0, 10), truncated: all.length > 10 };
  },
  MAX_UPLOADS: 10,
  openAttachment: jest.fn(),
}));

const mockBytes = jest.fn();
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({ bytes: () => mockBytes() })),
}));

function setup() {
  const db = makeDb();
  const trip = createTrip(
    db,
    {
      title: 'Goa',
      emoji: 'beach',
      timeZone: 'Asia/Kolkata',
      currency: 'INR',
      startDate: '2026-07-12',
      endDate: '2026-07-15',
    },
    { displayName: 'Gowtham' },
  );
  return { db, tripId: trip.id };
}

/** Opens Add booking → Upload document and returns the form route it pushed. */
async function upload(db: ReturnType<typeof makeDb>, tripId: string) {
  await render(withData(db, <BookingsView tripId={tripId} />, 'plan'));
  await fireEvent.press(screen.getByRole('button', { name: 'Add booking' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Upload documents' }));
  await waitFor(() => expect(mockPush).toHaveBeenCalled());
  const route = mockPush.mock.calls.at(-1)![0] as string;
  const importId = new URL(route, 'https://x').searchParams.get('importId')!;
  return { route, importId };
}

beforeEach(() => {
  mockPush.mockReset();
  mockBack.mockReset();
  mockPick.mockReset();
  mockBytes.mockReset();
  mockParams = {};
});

describe('adding a booking from a document (Plan 31)', () => {
  it('Add booking offers Upload document first, then Enter booking details', async () => {
    const { db, tripId } = setup();
    await render(withData(db, <BookingsView tripId={tripId} />, 'plan'));
    await fireEvent.press(screen.getByRole('button', { name: 'Add booking' }));
    const options = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel);
    expect(options.indexOf('Upload documents')).toBeLessThan(
      options.indexOf('Enter booking details'),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Enter booking details' }));
    expect(mockPush).toHaveBeenCalledWith(`/trip/${tripId}/booking`);
  });

  it('an uploaded ticket PDF fills in the form, and saving keeps the file', async () => {
    const { db, tripId } = setup();
    mockPick.mockResolvedValue({
      name: 'ticket.pdf',
      mimeType: 'application/pdf',
      sizeBytes: TICKET.length,
      localUri: 'file:///docs/attachments/1-ticket.pdf',
    });
    mockBytes.mockResolvedValue(new Uint8Array(TICKET));
    const { route, importId } = await upload(db, tripId);
    expect(route).toContain(`/trip/${tripId}/booking?importId=`);

    mockParams = { id: tripId, importId };
    await render(withData(db, <BookingEditor />, 'plan'));
    expect(screen.getByText('Flight · Check the details')).toBeTruthy();
    expect(screen.getByText('Filled in from this document: check before saving.')).toBeTruthy();
    expect(screen.getByLabelText('Name').props.value).toBe('Bengaluru → Goa · 6E 2134');
    expect(screen.getByLabelText('PNR').props.value).toBe('X7K2QP');
    expect(screen.getByLabelText('Provider').props.value).toBe('IndiGo');
    expect(screen.getByLabelText('Total cost (INR)').props.value).toBe('4567');
    expect(screen.queryByText('From your document')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Add booking' }));
    const [b] = listBookings(db, tripId);
    expect(b).toMatchObject({
      type: 'flight',
      reference: 'X7K2QP',
      costMinor: 456700,
      // 06:45 in India is 01:15 UTC.
      startsAt: '2026-07-12T01:15:00.000Z',
      endsAt: '2026-07-12T02:30:00.000Z',
    });
    expect(b!.notes).toContain('Mr Arjun Rao');
    expect(listAttachments(db, b!.id)).toMatchObject([{ name: 'ticket.pdf' }]);
    expect(listExpenses(db, tripId)).toHaveLength(1);
    expect(mockBack).toHaveBeenCalled();
  });

  it("a photo can't be read: the form opens empty with a note, and the photo is attached", async () => {
    const { db, tripId } = setup();
    mockPick.mockResolvedValue({
      name: 'IMG_2041.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1000,
      localUri: 'file:///docs/attachments/2-IMG_2041.jpg',
    });
    const { importId } = await upload(db, tripId);
    expect(mockBytes).not.toHaveBeenCalled();

    mockParams = { id: tripId, importId };
    await render(withData(db, <BookingEditor />, 'plan'));
    expect(screen.getByText(/Couldn't read this file/)).toBeTruthy();
    expect(screen.getByLabelText('Name').props.value).toBe('');
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Ferry to Havelock');
    await fireEvent.press(screen.getByRole('button', { name: 'Add booking' }));
    const [b] = listBookings(db, tripId);
    expect(b!.title).toBe('Ferry to Havelock');
    expect(listAttachments(db, b!.id)).toMatchObject([{ name: 'IMG_2041.jpg' }]);
  });

  it('cancelling the file picker keeps you on Bookings', async () => {
    const { db, tripId } = setup();
    mockPick.mockResolvedValue(null);
    await render(withData(db, <BookingsView tripId={tripId} />, 'plan'));
    await fireEvent.press(screen.getByRole('button', { name: 'Add booking' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Upload documents' }));
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Upload documents' })).toBeTruthy();
  });

  it('Enter booking details opens an empty form', async () => {
    const { db, tripId } = setup();
    mockParams = { id: tripId };
    await render(withData(db, <BookingEditor />, 'plan'));
    // The heading and the save button.
    expect(screen.getAllByText('Add booking')).toHaveLength(2);
    expect(screen.queryByText(/Filled in from/)).toBeNull();
    expect(screen.getByLabelText('PNR').props.value).toBe('');
  });

  it('a return trip is added one leg at a time, both with the ticket attached', async () => {
    const { db, tripId } = setup();
    const leg = (title: string, startDate: string): BookingDraft => ({
      ...emptyDraft(),
      type: 'flight',
      title,
      startDate,
      found: ['type', 'title', 'start'],
    });
    const importId = stashImport(
      buildImport([
        {
          file: {
            name: 'trip.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 10,
            localUri: 'file:///t.pdf',
          },
          drafts: [
            leg('BLR → GOI · 6E 2134', '2026-07-12'),
            leg('GOI → BLR · 6E 517', '2026-07-15'),
          ],
          readable: true,
        },
      ]),
    );
    mockParams = { id: tripId, importId };
    await render(withData(db, <BookingEditor />, 'plan'));
    expect(screen.getByText('Booking 1 of 2')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add and go to the next' }));
    expect(mockBack).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name').props.value).toBe('GOI → BLR · 6E 517');
    await fireEvent.press(screen.getByRole('button', { name: 'Add booking' }));
    const saved = listBookings(db, tripId);
    expect(saved.map((b) => b.title)).toEqual(['BLR → GOI · 6E 2134', 'GOI → BLR · 6E 517']);
    expect(saved.every((b) => listAttachments(db, b.id).length === 1)).toBe(true);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('several files at once: one booking per step in date order, each with its own file (Plan 39)', async () => {
    const { db, tripId } = setup();
    const pdf = (name: string) => ({
      name,
      mimeType: 'application/pdf',
      sizeBytes: TICKET.length,
      localUri: `file:///docs/attachments/${name}`,
    });
    // The same ticket twice, and a photo: the copy is skipped, the photo kept.
    mockPick.mockResolvedValue([
      { name: 'IMG_7.jpg', mimeType: 'image/jpeg', sizeBytes: 9, localUri: 'file:///p.jpg' },
      pdf('ticket.pdf'),
      pdf('ticket copy.pdf'),
    ]);
    mockBytes.mockResolvedValue(new Uint8Array(TICKET));
    await render(withData(db, <BookingsView tripId={tripId} />, 'plan'));
    await fireEvent.press(screen.getByRole('button', { name: 'Add booking' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Upload documents' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    const importId = new URL(
      mockPush.mock.calls.at(-1)![0] as string,
      'https://x',
    ).searchParams.get('importId')!;

    mockParams = { id: tripId, importId };
    await render(withData(db, <BookingEditor />, 'plan'));
    // The dated flight first, the unreadable photo last.
    expect(screen.getByText('Booking 1 of 2')).toBeTruthy();
    expect(screen.getByText('ticket.pdf')).toBeTruthy();
    expect(screen.getByText('1 duplicate skipped.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add and go to the next' }));
    expect(screen.getByText('IMG_7.jpg')).toBeTruthy();
    expect(screen.getByText(/Couldn't read this file/)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Airport taxi');
    await fireEvent.press(screen.getByRole('button', { name: 'Add booking' }));
    const saved = listBookings(db, tripId);
    expect(saved).toHaveLength(2);
    const files = Object.fromEntries(
      saved.map((b) => [b.title, listAttachments(db, b.id)[0]!.name]),
    );
    expect(files).toEqual({
      'Bengaluru → Goa · 6E 2134': 'ticket.pdf',
      'Airport taxi': 'IMG_7.jpg',
    });
  });

  it('only the first 10 of more files are used, and the form says so', async () => {
    const { db, tripId } = setup();
    mockPick.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({
        name: `photo-${i}.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 9,
        localUri: `file:///p${i}.jpg`,
      })),
    );
    const { importId } = await upload(db, tripId);
    mockParams = { id: tripId, importId };
    await render(withData(db, <BookingEditor />, 'plan'));
    expect(screen.getByText('Booking 1 of 10')).toBeTruthy();
    expect(screen.getByText('Only the first 10 files were added.')).toBeTruthy();
  });
});
