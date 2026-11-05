import { addPhotos, createProject, createTrip, getProject } from '@travelog/db';
import { render, screen, waitFor } from '@testing-library/react-native';

import StudioExport from '@/app/trip/[id]/studio/export';
import { makeDb, withData } from '@/testing/test-utils';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
let mockShot = 0;
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => `file:///tmp/shot-${mockShot++}.jpg`),
}));
const mockKeep = jest.fn(async (_id: string, uris: string[]) =>
  uris.map((_, i) => `file:///docs/exports/slide-${i + 1}.jpg`),
);
jest.mock('@/lib/studio-export', () => ({
  ...jest.requireActual('@/lib/studio-export'),
  IMAGE_WAIT_MS: 0,
  keepSlides: (id: string, uris: string[]) => mockKeep(id, uris),
}));

it('exports every slide in order, remembers the export and offers sharing', async () => {
  const db = makeDb();
  const trip = createTrip(
    db,
    { title: 'Goa', startDate: '2026-07-12', endDate: '2026-07-14', timeZone: 'Asia/Kolkata' },
    { displayName: 'You' },
  );
  addPhotos(db, trip.id, [{ localUri: 'file:///a.jpg', takenAt: '2026-07-12T06:00:00Z' }]);
  const project = createProject(db, {
    tripId: trip.id,
    format: 'post',
    slides: 3,
    template: 'panorama',
  });
  mockParams = { id: trip.id, projectId: project.id };

  await render(withData(db, <StudioExport />, 'trip'));
  await waitFor(() => expect(screen.getByText('3 slides ready')).toBeTruthy());

  expect(mockKeep).toHaveBeenCalledWith(project.id, [
    'file:///tmp/shot-0.jpg',
    'file:///tmp/shot-1.jpg',
    'file:///tmp/shot-2.jpg',
  ]);
  expect(getProject(db, project.id)?.project).toMatchObject({
    thumbnailUri: 'file:///docs/exports/slide-1.jpg',
  });
  expect(getProject(db, project.id)?.project.exportedAt).toBeTruthy();
  // The watermark is on the last slide only.
  expect(screen.getAllByText('Made with TravelOG')).toHaveLength(1);
});
