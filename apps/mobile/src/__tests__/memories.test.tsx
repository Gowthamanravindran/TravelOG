import { addPhotos, createProject, createTrip, listProjects } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';

import NewCarousel from '@/app/trip/[id]/studio/new';
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
  it('lists carousels and groups photos by trip day', async () => {
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
    await fireEvent.press(screen.getByRole('button', { name: 'New carousel' }));
    expect(mockPush).toHaveBeenCalledWith(`/trip/${trip.id}/studio/new`);
  });

  it('shows empty states without photos or carousels', async () => {
    const { db, trip } = tripWithPhotos(0);
    await render(withData(db, <MemoriesView tripId={trip.id} />, 'plan'));
    expect(screen.getByText('No photos yet')).toBeTruthy();
    expect(screen.getByText(/Add a few photos first/)).toBeTruthy();
  });
});

describe('New carousel', () => {
  it('creates a project from the chosen template and opens the editor', async () => {
    const { db, trip } = tripWithPhotos(6);
    await render(withData(db, <NewCarousel />));
    await fireEvent.press(screen.getByRole('button', { name: 'More slides' }));
    await fireEvent.press(screen.getByRole('radio', { name: /^Film roll/ }));
    await fireEvent.press(screen.getByRole('button', { name: 'Create carousel' }));

    const [project] = listProjects(db, trip.id);
    expect(project).toMatchObject({ slides: 4, format: 'post', title: 'Goa' });
    expect(mockReplace).toHaveBeenCalledWith(`/trip/${trip.id}/studio/${project!.id}`);
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
