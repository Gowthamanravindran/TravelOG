import { STUDIO_TEMPLATES, type StudioFormat } from '@travelog/core';
import { addPhotos, createProject, createTrip } from '@travelog/db';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import StudioEditorScreen from '@/app/trip/[id]/studio/[projectId]';
import StudioExport from '@/app/trip/[id]/studio/export';
import { makeDb, withData } from '@/testing/test-utils';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));
jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => 'file:///tmp/s.jpg'),
}));
jest.mock('@/lib/studio-export', () => ({
  ...jest.requireActual('@/lib/studio-export'),
  IMAGE_WAIT_MS: 0,
  keepSlides: async (_id: string, uris: string[]) => uris,
}));

const FORMATS: StudioFormat[] = ['post', 'square', 'story'];

// Every layout must open in the editor and export without errors (a broken
// film-roll layout was reported from a phone).
describe.each(STUDIO_TEMPLATES.map((t) => t.id))('template %s', (template) => {
  it.each(FORMATS)('renders in the editor and exports (%s)', async (format) => {
    const db = makeDb();
    const trip = createTrip(
      db,
      { title: 'Goa', startDate: '2026-07-12', endDate: '2026-07-14', timeZone: 'Asia/Kolkata' },
      { displayName: 'You' },
    );
    addPhotos(
      db,
      trip.id,
      Array.from({ length: 8 }, (_, i) => ({
        localUri: `file:///p${i}.jpg`,
        takenAt: `2026-07-1${2 + (i % 3)}T06:00:00Z`,
        width: 4000,
        height: 3000,
      })),
    );
    const project = createProject(db, { tripId: trip.id, format, slides: 3, template });
    mockParams = { id: trip.id, projectId: project.id };

    const editor = await render(withData(db, <StudioEditorScreen />, 'trip'));
    await act(async () => {
      fireEvent(screen.getByTestId('studio-area'), 'layout', {
        nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 520 } },
      });
    });
    expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy();
    await editor.unmount();

    await render(withData(db, <StudioExport />, 'trip'));
    await waitFor(() => expect(screen.getByText('3 slides ready')).toBeTruthy());
  });
});
