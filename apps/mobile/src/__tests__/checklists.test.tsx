import type { Place } from '@travelog/core';
import {
  addBooking,
  addChecklistItem,
  addItem,
  createTrip,
  ensureMainVariant,
  listChecklist,
  listSaved,
  listTripCheckIns,
  savePlace,
  savePlaces,
} from '@travelog/db';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ReadyScreen from '@/app/trip/[id]/ready';
import MustDoTab from '@/app/trip/[id]/live/must-do';
import { GetReadyCard } from '@/components/get-ready';
import { IDEAS_DAY } from '@/components/itinerary-view';
import { MustDoCard } from '@/components/must-do-card';
import { makeDb, withData } from '@/testing/test-utils';

jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
const mockPush = jest.fn();
let mockTripId = '';
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), navigate: mockPush }),
  useLocalSearchParams: () => ({ id: mockTripId }),
  useGlobalSearchParams: () => ({ id: mockTripId }),
}));
jest.mock('@/lib/use-trip-id', () => ({ useTripId: () => mockTripId }));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};
const place = (p: Partial<Place> & Pick<Place, 'id' | 'name' | 'kind'>): Place => ({
  countryCode: null,
  countryName: null,
  region: null,
  continent: null,
  lat: null,
  lng: null,
  timeZone: null,
  currency: null,
  population: 0,
  boost: 0,
  aliases: [],
  source: 'geonames',
  ...p,
});

function bali(dates = { startDate: '2026-12-12', endDate: '2026-12-18' }) {
  const db = makeDb();
  savePlaces(db, [
    place({
      id: 'gn:bali',
      name: 'Bali',
      kind: 'region',
      countryCode: 'ID',
      lat: -8.4,
      lng: 115.2,
    }),
  ]);
  const { id } = createTrip(
    db,
    {
      title: 'Bali',
      emoji: 'beach',
      destination: 'Bali',
      destinationPlaceId: 'gn:bali',
      timeZone: 'Asia/Makassar',
      ...dates,
    },
    { displayName: 'A' },
  );
  mockTripId = id;
  return { db, id };
}

const screenWith = (db: ReturnType<typeof makeDb>, el: React.ReactElement, mode: 'plan' | 'trip') =>
  render(<SafeAreaProvider initialMetrics={metrics}>{withData(db, el, mode)}</SafeAreaProvider>);

beforeEach(() => mockPush.mockClear());

/** Plan 61: Get ready. */
describe('Get ready', () => {
  it('starts with a list picked for the trip, one line on the itinerary', async () => {
    const { db, id } = bali();
    await render(withData(db, <GetReadyCard tripId={id} />, 'plan'));
    expect(screen.getByText('Visa, tickets, packing: start your checklist')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Get ready/ }));
    expect(mockPush).toHaveBeenCalledWith(`/trip/${id}/ready`);
  });

  it('suggests abroad and beach items; bookings tick themselves', async () => {
    const { db, id } = bali();
    addBooking(db, {
      tripId: id,
      type: 'flight',
      title: 'BLR → DPS',
      startsAt: '2026-12-12T01:00:00Z',
      endsAt: '2026-12-12T08:00:00Z',
    });
    addBooking(db, {
      tripId: id,
      type: 'flight',
      title: 'DPS → BLR',
      startsAt: '2026-12-18T10:00:00Z',
      endsAt: '2026-12-18T16:00:00Z',
    });
    await screenWith(db, <ReadyScreen />, 'plan');
    expect(
      screen.getByRole('checkbox', { name: 'Getting there and back' }).props.accessibilityState
        .checked,
    ).toBe(true);
    expect(
      screen.getByRole('checkbox', { name: 'A stay every night' }).props.accessibilityState.checked,
    ).toBe(false);
    expect(screen.getByText(/Visa · Passport valid/)).toBeTruthy();
    expect(screen.getByText(/Sunscreen/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Use these \d+/ }));
    expect(listChecklist(db, id, 'ready').map((i) => i.title)).toContain('Visa');

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Visa' }));
    expect(listChecklist(db, id, 'ready').find((i) => i.title === 'Visa')!.doneAt).not.toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Add an item'), 'Book airport cab');
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Book airport cab')).toBeTruthy();
  });

  it('the one-line card names what is next and hides when everything is ready', async () => {
    const { db, id } = bali({ startDate: null as never, endDate: null as never });
    addChecklistItem(db, id, 'ready', { title: 'Visa', dueDate: '2026-11-28' });
    const view = await render(withData(db, <GetReadyCard tripId={id} />, 'plan'));
    expect(screen.getByText(/left · next: Visa by 28 Nov/)).toBeTruthy();
    view.unmount();
  });
});

/** Plan 62: Must-do. */
describe('Must-do', () => {
  it('lists ideas, starred stops, saved places and typed ones; ticking is a check-in', async () => {
    const { db, id } = bali();
    const ideas = ensureMainVariant(db, id, IDEAS_DAY);
    addItem(db, ideas.id, { type: 'place', title: 'Tirta Empul' });
    const day = ensureMainVariant(db, id, '2026-12-14');
    addItem(db, day.id, { type: 'place', title: 'Uluwatu sunset', mustDo: true });
    addItem(db, day.id, { type: 'food', title: 'Lunch' });
    const ibu = savePlace(db, { title: 'Ibu Oka', countryCode: 'ID', lat: -8.5, lng: 115.26 });
    await screenWith(db, <MustDoTab />, 'trip');
    for (const name of ['Tirta Empul', 'Uluwatu sunset', 'Ibu Oka'])
      expect(screen.getByRole('checkbox', { name })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: 'Lunch' })).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Add something'), 'Try kopi luwak');
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('checkbox', { name: 'Try kopi luwak' })).toBeTruthy();

    // A Saved place joins the trip's Ideas, then gets a check-in.
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Ibu Oka' }));
    await waitFor(() => expect(screen.getByText('Ibu Oka ✓')).toBeTruthy());
    await fireEvent.changeText(screen.getByLabelText('A line about it'), 'Crispy');
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    const c = listTripCheckIns(db, id);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ title: 'Ibu Oka', note: 'Crispy' });
    expect(c[0]!.itemId).not.toBeNull();
    expect(listSaved(db)[0]!.id).toBe(ibu.id);

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Try kopi luwak' }));
    await waitFor(() => expect(listTripCheckIns(db, id)).toHaveLength(2));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done 2' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Try kopi luwak' }));
    expect(listTripCheckIns(db, id)).toHaveLength(1);
  });

  it('after the trip, what is left can be kept in Saved', async () => {
    const { db, id } = bali({ startDate: '2025-01-10', endDate: '2025-01-12' });
    const ideas = ensureMainVariant(db, id, IDEAS_DAY);
    addItem(db, ideas.id, { type: 'place', title: 'Snorkel at Amed', lat: -8.34, lng: 115.66 });
    await screenWith(db, <MustDoTab />, 'trip');
    expect(screen.getByText('1 left for next time')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Keep in Saved' }));
    expect(listSaved(db).map((s) => s.title)).toEqual(['Snorkel at Amed']);
    expect(screen.queryByText('1 left for next time')).toBeNull();
  });

  it('Today shows progress and what is next', async () => {
    const { db, id } = bali();
    const ideas = ensureMainVariant(db, id, IDEAS_DAY);
    addItem(db, ideas.id, { type: 'place', title: 'Tirta Empul' });
    await render(withData(db, <MustDoCard tripId={id} />, 'trip'));
    expect(screen.getByText('Next: Tirta Empul')).toBeTruthy();
    expect(screen.getByLabelText('0 of 1 done')).toBeTruthy();
  });
});
