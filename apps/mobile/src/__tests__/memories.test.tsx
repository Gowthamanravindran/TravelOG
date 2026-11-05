import { addPhotos, createProject, createTrip, listPhotos, listProjects } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import ComposeCollage from '@/app/trip/[id]/studio/compose';
import { MemoriesView } from '@/components/memories-view';
import { exifTakenAt } from '@/lib/photos';
import { makeDb, withData } from '@/testing/test-utils';

let mockParams: Record<string, string> = {};
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));

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

describe('Memories tab', () => {
  it('lists collages and groups photos by trip day', async () => {
    const { db, trip } = tripWithPhotos(5);
    const project = createProject(db, {
      tripId: trip.id,
      format: 'post',
      slides: 3,
      template: 'bridge',
    });
    await render(withData(db, <MemoriesView tripId={trip.id} />, 'plan'));
    expect(screen.getByText(/trip is done/)).toBeTruthy();
    expect(screen.getByText('Day 1 · 12 Jul · 2')).toBeTruthy();
    expect(screen.getByText('3 slides · 4:5')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /^Goa, 3 slides/ }));
    expect(mockPush).toHaveBeenCalledWith(`/trip/${trip.id}/studio/${project.id}`);
  });

  it('select photos, then make a collage from them in the order taken', async () => {
    const { db, trip } = tripWithPhotos(4);
    await render(withData(db, <MemoriesView tripId={trip.id} />, 'plan'));
    expect(screen.queryByText(/selected/)).toBeNull();
    const tiles = screen.getAllByRole('checkbox', { name: 'Trip photo' });
    await fireEvent.press(tiles[2]!);
    await fireEvent.press(tiles[0]!);
    expect(screen.getByText('2 selected')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Make a collage (2)' }));
    const ids = listPhotos(db, trip.id).map((p) => p.id);
    const [url] = mockPush.mock.lastCall!;
    expect(url).toMatch(new RegExp(`^/trip/${trip.id}/studio/compose\\?photos=`));
    const sent = String(url).split('photos=')[1]!.split(',');
    // In the order the photos were taken, not the order tapped.
    expect(sent).toEqual(ids.filter((id) => sent.includes(id)));
    expect(sent).toHaveLength(2);
  });

  it('selects a whole day and deletes the selection', async () => {
    const { db, trip } = tripWithPhotos(4);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => {
      buttons?.find((b) => b.style === 'destructive')?.onPress?.();
    });
    await render(withData(db, <MemoriesView tripId={trip.id} />, 'plan'));
    await fireEvent.press(screen.getAllByRole('button', { name: 'Select all' })[0]!);
    expect(screen.getByText('2 selected')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(listPhotos(db, trip.id)).toHaveLength(2);
    alert.mockRestore();
  });

  it('shows empty states without photos', async () => {
    const { db, trip } = tripWithPhotos(0);
    await render(withData(db, <MemoriesView tripId={trip.id} />, 'plan'));
    expect(screen.getByText('No photos yet')).toBeTruthy();
  });
});

describe('Make a collage', () => {
  it('previews layouts live and saves "Trip · n" then opens sharing', async () => {
    const { db, trip } = tripWithPhotos(3);
    const ids = listPhotos(db, trip.id).map((p) => p.id);
    mockParams = { id: trip.id, photos: ids.join(',') };
    await render(withData(db, <ComposeCollage />, 'trip'));
    expect(screen.getByText('3 photos')).toBeTruthy();
    // Bridge: 2 slides fit 3 photos.
    expect(screen.getByText(/^2 slides/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'Layout Panorama' }));
    expect(screen.getByText(/^3 slides/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'Layout Film roll' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save & share' }));
    const [project] = listProjects(db, trip.id);
    expect(project).toMatchObject({ title: 'Goa Monsoon Escape · 1' });
    expect(mockReplace).toHaveBeenCalledWith(
      `/trip/${trip.id}/studio/export?projectId=${project!.id}`,
    );
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
