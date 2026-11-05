import {
  addPhotos,
  createProject,
  createTrip,
  getProject,
  listPhotos,
  listProjects,
} from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

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

  it('select photos, then make a collage: saved as "Trip · 1" and opened on its layouts', async () => {
    const { db, trip } = tripWithPhotos(4);
    await render(withData(db, <MemoriesView tripId={trip.id} />, 'plan'));
    expect(screen.queryByText(/selected/)).toBeNull();
    const tiles = screen.getAllByRole('checkbox', { name: 'Trip photo' });
    await fireEvent.press(tiles[2]!);
    await fireEvent.press(tiles[0]!);
    expect(screen.getByText('2 selected')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Make a collage (2)' }));
    const [project] = listProjects(db, trip.id);
    expect(project).toMatchObject({ title: 'Goa Monsoon Escape · 1' });
    expect(mockPush).toHaveBeenLastCalledWith(
      `/trip/${trip.id}/studio/${project!.id}?start=layouts`,
    );
    // In the order the photos were taken, not the order tapped.
    const ids = listPhotos(db, trip.id).map((p) => p.id);
    const used = getProject(db, project!.id)!.doc.layers.flatMap((l) =>
      l.kind === 'photo' && l.photoId ? [l.photoId] : [],
    );
    expect(used).toEqual(ids.filter((id) => used.includes(id)));
    expect(used).toHaveLength(2);
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
