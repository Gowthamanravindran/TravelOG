import { addPhotos, createTrip } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';

import CollageScreen from '@/app/trip/[id]/collage';
import MemoriesScreen from '@/app/trip/[id]/memories';
import { exifTakenAt } from '@/lib/photos';
import { makeDb, withData } from '@/testing/test-utils';

let mockParams: Record<string, string> = {};
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn() }));

function tripWithPhotos(count: number) {
  const db = makeDb();
  const trip = createTrip(
    db,
    {
      title: 'Goa Monsoon Escape',
      destination: 'Goa',
      startDate: '2026-07-12',
      endDate: '2026-07-14',
      timeZone: 'Asia/Kolkata',
    },
    { displayName: 'You' },
  );
  addPhotos(
    db,
    trip.id,
    Array.from({ length: count }, (_, i) => ({
      localUri: `file:///p${i}.jpg`,
      takenAt: `2026-07-1${2 + (i % 3)}T06:00:00Z`,
    })),
  );
  mockParams = { id: trip.id };
  return { db, trip };
}

describe('memories', () => {
  it('groups photos by trip day and opens the collage editor', async () => {
    const { db, trip } = tripWithPhotos(5);
    await render(withData(db, <MemoriesScreen />));
    expect(screen.getByText(/trip is done/)).toBeTruthy();
    expect(screen.getByText('Day 1 · 12 Jul')).toBeTruthy();
    expect(screen.getByText('Day 3 · 14 Jul')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Make a collage' }));
    expect(mockPush).toHaveBeenCalledWith(`/trip/${trip.id}/collage`);
  });

  it('shows an empty state without photos', async () => {
    const { db } = tripWithPhotos(0);
    await render(withData(db, <MemoriesScreen />));
    expect(screen.getByText('No photos yet')).toBeTruthy();
  });

  it('collage editor fills the template with auto-picked photos and switches templates', async () => {
    const { db } = tripWithPhotos(6);
    await render(withData(db, <CollageScreen />));
    expect(screen.getAllByLabelText(/^Photo \d, tap to change$/)).toHaveLength(6);
    await fireEvent.press(screen.getByText('Trip stats'));
    expect(screen.getAllByLabelText(/^Photo \d, tap to change$/)).toHaveLength(2);
    expect(screen.getByText('stops')).toBeTruthy();
  });
});

describe('exifTakenAt', () => {
  it('uses the photo offset when present, else the trip time zone', () => {
    expect(exifTakenAt({ DateTimeOriginal: '2026:07:12 10:00:00' }, 'Asia/Kolkata')).toBe(
      '2026-07-12T04:30:00.000Z',
    );
    expect(
      exifTakenAt(
        { DateTimeOriginal: '2026:07:12 10:00:00', OffsetTimeOriginal: '+09:00' },
        'Asia/Kolkata',
      ),
    ).toBe('2026-07-12T01:00:00.000Z');
    expect(exifTakenAt({}, 'Asia/Kolkata')).toBeNull();
    expect(exifTakenAt(null, 'Asia/Kolkata')).toBeNull();
  });
});
