import { STUDIO_TEMPLATES } from '@travelog/core';
import { addPhotos, createProject, createTrip, getProject, type Db } from '@travelog/db';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import StudioEditorScreen from '@/app/trip/[id]/studio/[projectId]';
import { drag } from '@/testing/touch';
import { makeDb, withData } from '@/testing/test-utils';

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: () => null }));

/**
 * Plan 23 stress test: the owner saw crashes while editing collages. Every
 * control and every handle is exercised on every kind of item; any error fails,
 * and the saved collage must never contain NaN/Infinity.
 */
async function open(template: 'bridge' | 'blank' = 'bridge', extra: Record<string, string> = {}) {
  const db = makeDb();
  const trip = createTrip(
    db,
    {
      title: 'Europe',
      destination: 'Europe',
      startDate: '2026-11-15',
      endDate: '2026-12-15',
      timeZone: 'Asia/Kolkata',
    },
    { displayName: 'You' },
  );
  addPhotos(
    db,
    trip.id,
    Array.from({ length: 6 }, (_, i) => ({
      localUri: `file:///p${i}.jpg`,
      takenAt: `2026-11-1${5 + (i % 3)}T06:00:00Z`,
      width: i % 2 ? 3000 : 4000,
      height: i % 2 ? 4000 : 3000,
    })),
  );
  const project = createProject(db, { tripId: trip.id, format: 'post', slides: 3, template });
  mockParams = { id: trip.id, projectId: project.id, ...extra };
  await render(withData(db, <StudioEditorScreen />, 'trip'));
  await act(async () => {
    fireEvent(screen.getByTestId('studio-area'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 520 } },
    });
  });
  return { db, project };
}

const press = (name: string | RegExp) =>
  fireEvent.press(screen.getAllByRole('button', { name })[0]!);
const doc = (db: Db, id: string) => getProject(db, id)!.doc;
const close = () => press('Close');

function expectFinite(value: unknown) {
  const bad: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (typeof v === 'number' && !Number.isFinite(v)) bad.push(path);
    else if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, `${path}.${k}`);
  };
  walk(value, 'doc');
  expect(bad).toEqual([]);
}

let errors: jest.SpyInstance;
beforeEach(() => {
  errors = jest.spyOn(console, 'error');
});
afterEach(() => {
  // React render errors and failed prop types show up here.
  const real = errors.mock.calls.filter((c) => !String(c[0]).includes('not wrapped in act'));
  errors.mockRestore();
  expect(real).toEqual([]);
});

describe('editing a collage', () => {
  it('finger drags alone move, resize and rotate (no buttons)', async () => {
    const { db, project } = await open();
    const first = () => doc(db, project.id).layers.find((l) => l.kind === 'photo')!;
    const before = first();
    await press('Photo');
    await drag(screen.getByLabelText('Selected item'), [[{ x: 30, y: 0 }]]);
    await press('Undo');
    await press('Redo');
    await drag(screen.getByLabelText('Resize br'), [[{ x: 25, y: 25 }]]);
    await drag(screen.getByLabelText('Rotate'), [[{ x: 80, y: 40 }]]);
    await close();
    const after = first();
    expect(after.x).toBeGreaterThan(before.x);
    expect(after.w).toBeGreaterThan(before.w);
    expect(after.rotation).not.toBe(0);
  });

  it('photo: move, resize by corner, rotate by handle, buttons, crop with pan and pinch', async () => {
    const { db, project } = await open();
    const before = doc(db, project.id).layers.find((l) => l.kind === 'photo')!;
    await press('Photo');

    await drag(screen.getByLabelText('Selected item'), [[{ x: 20, y: 10 }], [{ x: 20, y: 10 }]]);
    await drag(screen.getByLabelText('Resize br'), [[{ x: 30, y: 30 }]]);
    await drag(screen.getByLabelText('Rotate'), [[{ x: 60, y: 0 }], [{ x: 40, y: 20 }]]);
    // Two fingers: pinch out and twist.
    await drag(
      screen.getByLabelText('Selected item'),
      [
        [
          { x: -10, y: 0 },
          { x: 10, y: 0 },
        ],
        [
          { x: -10, y: -5 },
          { x: 10, y: 5 },
        ],
      ],
      [
        { x: 100, y: 100 },
        { x: 160, y: 100 },
      ],
    );
    for (const b of ['Bigger', 'Smaller', 'Rotate left', 'Rotate right', 'Rotate right'])
      await press(b);
    for (const f of ['Rounded', 'Border', 'Print', 'Plain']) await press(f);

    await press('Crop');
    await drag(screen.getByLabelText('Cropping photo'), [[{ x: 30, y: -20 }]]);
    await drag(
      screen.getByLabelText('Cropping photo'),
      [
        [
          { x: -20, y: 0 },
          { x: 20, y: 0 },
        ],
      ],
      [
        { x: 100, y: 100 },
        { x: 140, y: 100 },
      ],
    );
    await press('Zoom in');
    await press('Zoom out');
    await press('Done cropping');
    await press('Replace');
    await fireEvent.press(screen.getAllByRole('imagebutton')[3]!);
    for (const b of ['Forward', 'Back', 'Duplicate']) await press(b);
    await press('Undo');
    await press('Redo');
    await close();

    const saved = doc(db, project.id);
    expectFinite(saved);
    const after = saved.layers.find((l) => l.id === before.id)!;
    expect(after.x).not.toBe(before.x);
    expect(after.rotation).not.toBe(0);
  });

  it('text: the template title can be edited, resized, rotated and deleted', async () => {
    const { db, project } = await open();
    await press(/^Text: Europe/);
    await fireEvent.changeText(screen.getByLabelText('Text'), 'Europe 2026');
    await drag(screen.getByLabelText('Resize br'), [[{ x: 40, y: 10 }]]);
    await drag(screen.getByLabelText('Rotate'), [[{ x: 30, y: 0 }]]);
    for (const b of ['Bigger', 'Smaller', 'Bold', 'Label', 'Classic']) await press(b);
    await press('Text colour #E11D48');
    await press('Delete');
    await press('Text');
    await press('Heading');
    await close();
    const saved = doc(db, project.id);
    expectFinite(saved);
    expect(
      saved.layers.filter((l) => l.kind === 'text').map((l) => l.kind === 'text' && l.text),
    ).toEqual(['Europe']);
  });

  it('stickers, stats card, background colours and gradients, slides', async () => {
    const { db, project } = await open('blank');
    await press('Stickers');
    await press('Sticker beach');
    await press('Sticker colour #0EA5E9');
    await drag(screen.getByLabelText('Resize tl'), [[{ x: -20, y: -20 }]]);
    await drag(screen.getByLabelText('Rotate'), [[{ x: -50, y: 30 }]]);
    await press('Done');
    await press('Stickers');
    await press('Trip stats card');
    await press('Card colour #22C55E');
    await press('Done');
    await press('Background');
    await press('Background #000000');
    await press(/^Gradient #0EA5E9/);
    await press('Slides');
    await press('Add slide');
    await press('Move right');
    await close();
    const saved = doc(db, project.id);
    expectFinite(saved);
    expect(saved.slides).toBe(4);
    expect(saved.background).toMatchObject({ kind: 'gradient', from: '#0EA5E9' });
  });

  it('layouts stay visible while a photo is selected or cropped, and apply from there', async () => {
    const { db, project } = await open();
    const layout = (name: string) => screen.getByRole('radio', { name: `Layout ${name}` });
    expect(layout('Film roll')).toBeTruthy();
    await press('Photo');
    expect(screen.getByLabelText('Selected item')).toBeTruthy();
    expect(layout('Film roll')).toBeTruthy();
    await press('Crop');
    expect(screen.getByLabelText('Cropping photo')).toBeTruthy();
    await fireEvent.press(layout('Film roll'));
    // Applied, and the old selection is gone (its item may no longer exist).
    expect(screen.queryByLabelText('Cropping photo')).toBeNull();
    expect(layout('Film roll').props.accessibilityState).toMatchObject({ selected: true });
    await press('Photo');
    await fireEvent.press(screen.getByRole('tab', { name: 'Square' }));
    expect(screen.queryByLabelText('Selected item')).toBeNull();
    await close();
    expect(doc(db, project.id).format).toBe('square');
    expectFinite(doc(db, project.id));
  });

  it('two-finger twist ignores fingers swapping order between events', async () => {
    const { db, project } = await open();
    const before = doc(db, project.id).layers.find((l) => l.kind === 'photo')!;
    await press('Photo');
    const el = screen.getByLabelText('Selected item');
    const touch = (id: number, x: number, y: number) => ({
      identifier: id,
      pageX: x,
      pageY: y,
      locationX: x,
      locationY: y,
    });
    const ev = (touches: ReturnType<typeof touch>[]) => ({
      touchHistory: {
        numberActiveTouches: touches.length,
        indexOfSingleActiveTouch: 0,
        mostRecentTimeStamp: 3,
        touchBank: [],
      },
      nativeEvent: { touches, changedTouches: touches, pageX: 0, pageY: 0, timestamp: 3 },
    });
    await fireEvent(el, 'responderGrant', ev([touch(0, 100, 100), touch(1, 200, 100)]));
    await fireEvent(el, 'responderMove', ev([touch(0, 100, 100), touch(1, 200, 100)]));
    // Same fingers, listed the other way round: no 180° flip.
    await fireEvent(el, 'responderMove', ev([touch(1, 200, 100), touch(0, 100, 100)]));
    await fireEvent(el, 'responderRelease', ev([]));
    await close();
    const after = doc(db, project.id).layers.find((l) => l.id === before.id)!;
    expect(after.rotation).toBe(before.rotation);
  });

  it('layouts: every layout and format applies live, undo works', async () => {
    const { db, project } = await open('bridge', { start: 'layouts' });
    for (const tpl of STUDIO_TEMPLATES.filter((t) => t.id !== 'blank')) {
      await fireEvent.press(screen.getByRole('radio', { name: `Layout ${tpl.name}` }));
    }
    for (const f of ['Square', '9:16', '4:5'])
      await fireEvent.press(screen.getByRole('tab', { name: f }));
    await press('Undo');
    await close();
    expectFinite(doc(db, project.id));
  });
});
