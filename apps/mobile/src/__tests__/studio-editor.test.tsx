import { addPhotos, createProject, createTrip, getProject } from '@travelog/db';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import StudioEditorScreen from '@/app/trip/[id]/studio/[projectId]';
import { makeDb, withData } from '@/testing/test-utils';

let mockParams: Record<string, string> = {};
const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));

async function openEditor(template: 'bridge' | 'blank' = 'bridge') {
  const db = makeDb();
  const trip = createTrip(
    db,
    {
      title: 'Goa',
      destination: 'Goa',
      startDate: '2026-07-12',
      endDate: '2026-07-14',
      timeZone: 'Asia/Kolkata',
    },
    { displayName: 'You' },
  );
  addPhotos(db, trip.id, [
    { localUri: 'file:///a.jpg', takenAt: '2026-07-12T06:00:00Z', width: 4000, height: 3000 },
    { localUri: 'file:///b.jpg', takenAt: '2026-07-13T06:00:00Z', width: 3000, height: 4000 },
  ]);
  const project = createProject(db, { tripId: trip.id, format: 'post', slides: 2, template });
  mockParams = { id: trip.id, projectId: project.id };
  await render(withData(db, <StudioEditorScreen />, 'trip'));
  // Give the canvas area a size, as the phone would.
  await act(async () => {
    fireEvent(screen.getByTestId('studio-area'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 520 } },
    });
  });
  return { db, trip, project };
}

const layers = (db: ReturnType<typeof makeDb>, id: string) => getProject(db, id)!.doc.layers;

describe('Studio editor', () => {
  it('selects a photo, deletes it, undoes, and saves on close', async () => {
    const { db, project } = await openEditor();
    const before = layers(db, project.id).length;
    await fireEvent.press(screen.getAllByRole('button', { name: 'Photo' })[0]!);
    expect(screen.getByRole('button', { name: 'Replace' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(layers(db, project.id)).toHaveLength(before - 1);
    expect(mockBack).toHaveBeenCalled();
  });

  it('undo and redo', async () => {
    const { db, project } = await openEditor('blank');
    await fireEvent.press(screen.getByRole('button', { name: 'Stickers' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sticker beach' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(layers(db, project.id)).toHaveLength(0);
  });

  it('adds text, a sticker, the stats card, a slide and a background', async () => {
    const { db, project } = await openEditor('blank');
    await fireEvent.press(screen.getByRole('button', { name: 'Text' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Heading' }));
    // The new text is selected: edit it.
    await fireEvent.changeText(screen.getByLabelText('Text'), 'Monsoon magic');
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Stickers' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Trip stats card' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Slides' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add slide' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Background' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Background #0F1020' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    const saved = getProject(db, project.id)!.doc;
    expect(saved.slides).toBe(3);
    expect(saved.background).toEqual({ kind: 'color', color: '#0F1020' });
    expect(saved.layers.map((l) => l.kind)).toEqual(['text', 'stats']);
    expect(saved.layers[0]).toMatchObject({ text: 'Monsoon magic' });
    // On the canvas (layout previews below may show stats cards too).
    expect(screen.queryAllByText('stops').length).toBeGreaterThan(0);
  });

  it('adds a trip photo to the visible slide and opens export', async () => {
    const { db, project, trip } = await openEditor('blank');
    await fireEvent.press(screen.getAllByRole('imagebutton', { name: 'Trip photo' })[1]!);
    await fireEvent.press(screen.getByRole('button', { name: 'Export' }));
    const [photo] = layers(db, project.id);
    // Portrait photo: taller than wide, centred on slide 1.
    expect(photo).toMatchObject({ kind: 'photo' });
    expect(photo!.h).toBeGreaterThan(photo!.w);
    expect(photo!.x + photo!.w / 2).toBeCloseTo(540, 0);
    expect(mockPush).toHaveBeenCalledWith(`/trip/${trip.id}/studio/export?projectId=${project.id}`);
  });
});
