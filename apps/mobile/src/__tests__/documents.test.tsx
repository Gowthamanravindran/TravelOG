import { addAttachment, addBooking, createTrip, listTripAttachments } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';

import BookingsTab from '@/app/trip/[id]/plan/bookings';
import { DocumentsView } from '@/components/documents-view';
import { TripHeader } from '@/components/trip-header';
import { makeDb, withData } from '@/testing/test-utils';

const mockPush = jest.fn();
const mockNavigate = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    replace: jest.fn(),
    navigate: mockNavigate,
  }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
}));

const mockOpen = jest.fn();
const mockPickMany = jest.fn();
let mockOnPhone = true;
jest.mock('@/lib/files', () => ({
  openAttachment: (a: unknown) => mockOpen(a),
  pickAttachments: () => mockPickMany(),
  pickAttachment: jest.fn(),
  fileOnPhone: () => mockOnPhone,
  MAX_UPLOADS: 10,
}));

function setup() {
  const db = makeDb();
  const { id: tripId } = createTrip(
    db,
    { title: 'Europe', timeZone: 'Europe/Paris', startDate: '2024-12-20', endDate: '2025-01-06' },
    { displayName: 'Gowtham' },
  );
  const hotel = addBooking(db, {
    tripId,
    type: 'stay',
    title: 'Paris stay',
    startsAt: '2024-12-20T14:00:00.000Z',
  });
  addAttachment(db, {
    tripId,
    bookingId: hotel.id,
    name: 'hotel.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 150_000,
    localUri: 'file:///docs/hotel.pdf',
  });
  addAttachment(db, {
    tripId,
    bookingId: null,
    name: 'passport.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 2_500_000,
    localUri: 'file:///docs/passport.jpg',
  });
  return { db, tripId };
}

beforeEach(() => {
  mockPush.mockReset();
  mockNavigate.mockReset();
  mockOpen.mockReset().mockResolvedValue(undefined);
  mockPickMany.mockReset();
  mockOnPhone = true;
  mockParams = {};
});

describe('Documents (Plan 40)', () => {
  it('lists trip documents first, then each booking’s files, and opens one with a tap', async () => {
    const { db, tripId } = setup();
    await render(withData(db, <DocumentsView tripId={tripId} timeZone="Europe/Paris" />, 'plan'));
    expect(screen.getByText('Saved on this phone · opens without signal')).toBeTruthy();
    const titles = ['Trip documents', 'Paris stay'].map((t) => screen.getByText(t));
    expect(titles).toHaveLength(2);
    expect(screen.getByText('2.4 MB · tap to open')).toBeTruthy();
    expect(screen.getByText('146 KB · tap to open')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open hotel.pdf' }));
    expect(mockOpen).toHaveBeenCalledWith({
      localUri: 'file:///docs/hotel.pdf',
      mimeType: 'application/pdf',
      name: 'hotel.pdf',
    });
  });

  it('a file not on this phone says so and does not try to open', async () => {
    const { db, tripId } = setup();
    mockOnPhone = false;
    await render(withData(db, <DocumentsView tripId={tripId} timeZone="Europe/Paris" />, 'plan'));
    expect(screen.getAllByText('Not on this phone yet')).toHaveLength(2);
    await fireEvent.press(screen.getByRole('button', { name: 'hotel.pdf, not on this phone yet' }));
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it('Add documents keeps files as trip documents', async () => {
    const db = makeDb();
    const { id: tripId } = createTrip(
      db,
      { title: 'Goa', timeZone: 'Asia/Kolkata' },
      { displayName: 'G' },
    );
    mockPickMany.mockResolvedValue({
      files: [
        {
          name: 'insurance.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 9,
          localUri: 'file:///i.pdf',
        },
      ],
      truncated: false,
    });
    await render(withData(db, <DocumentsView tripId={tripId} timeZone="Asia/Kolkata" />, 'plan'));
    expect(screen.getByText('No documents yet')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add documents' }));
    expect(listTripAttachments(db, tripId)).toMatchObject([
      { name: 'insurance.pdf', bookingId: null },
    ]);
  });

  it('Bookings opens on Documents when asked, and switches between the two', async () => {
    const { db, tripId } = setup();
    mockParams = { id: tripId, view: 'documents' };
    await render(withData(db, <BookingsTab />, 'plan'));
    expect(screen.getByText('Trip documents')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'All bookings' }));
    expect(screen.queryByText('Trip documents')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add booking' })).toBeTruthy();
  });

  it('the header’s Documents button goes to Documents in Plan and in Trip mode', async () => {
    const { db, tripId } = setup();
    mockParams = { id: tripId };
    const view = await render(withData(db, <TripHeader />, 'plan'));
    await fireEvent.press(screen.getByRole('button', { name: 'Documents' }));
    expect(mockNavigate).toHaveBeenCalledWith(`/trip/${tripId}/plan/bookings?view=documents`);
    await view.unmount();
    await render(withData(db, <TripHeader />, 'trip'));
    await fireEvent.press(screen.getByRole('button', { name: 'Documents' }));
    expect(mockPush).toHaveBeenCalledWith(`/trip/${tripId}/documents?mode=trip`);
  });
});
