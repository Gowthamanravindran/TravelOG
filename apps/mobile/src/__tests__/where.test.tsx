import type { Place } from '@travelog/core';
import { addBooking, createTrip, listStops, savePlaces } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';

import StopEditor from '@/app/trip/[id]/stop';
import { ItineraryView } from '@/components/itinerary-view';
import { makeDb, withData } from '@/testing/test-utils';

const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
}));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));

const city = (id: string, name: string): Place => ({
  id,
  name,
  kind: 'city',
  countryCode: 'IN',
  countryName: 'India',
  region: null,
  continent: null,
  lat: null,
  lng: null,
  timeZone: 'Asia/Kolkata',
  currency: null,
  population: 1000,
  boost: 0,
  aliases: [],
  source: 'geonames',
});
// 06:45 in India is 01:15 UTC.
const ist = (date: string, time: string) =>
  new Date(Date.parse(`${date}T${time}:00Z`) - 330 * 60000).toISOString();

function setup() {
  const db = makeDb();
  savePlaces(db, [
    city('gn:blr', 'Bengaluru'),
    city('gn:goa', 'Panaji'),
    city('gn:gok', 'Gokarna'),
  ]);
  const trip = createTrip(
    db,
    { title: 'Goa', timeZone: 'Asia/Kolkata', startDate: '2026-07-12', endDate: '2026-07-16' },
    { displayName: 'Gowtham' },
  );
  addBooking(db, {
    tripId: trip.id,
    type: 'flight',
    title: 'BLR → GOI',
    startsAt: ist('2026-07-12', '06:45'),
    endsAt: ist('2026-07-12', '08:00'),
    fromPlaceId: 'gn:blr',
    toPlaceId: 'gn:goa',
  });
  addBooking(db, {
    tripId: trip.id,
    type: 'stay',
    title: 'Sea Breeze',
    startsAt: ist('2026-07-12', '14:00'),
    endsAt: ist('2026-07-14', '11:00'),
    placeId: 'gn:goa',
  });
  return { db, tripId: trip.id };
}

beforeEach(() => {
  mockPush.mockReset();
  mockBack.mockReset();
  mockParams = {};
});

describe('where you will be (Plan 35)', () => {
  it('shows the route and the city under each day', async () => {
    const { db, tripId } = setup();
    await render(withData(db, <ItineraryView tripId={tripId} />, 'plan'));
    expect(screen.getByLabelText('Your route')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Place' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Flight to Panaji, 06:45' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Panaji, 12–13 Jul' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Panaji, probably, 14–15 Jul' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Day 1, 12 Jul, Panaji' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Day 3, 14 Jul, Panaji?' })).toBeTruthy();
  });

  it('asks about nights with no stay, and Add stay opens the form for those nights', async () => {
    const { db, tripId } = setup();
    await render(withData(db, <ItineraryView tripId={tripId} />, 'plan'));
    expect(screen.getByText('No stay for 14–15 Jul')).toBeTruthy();
    expect(screen.getByText("You'll probably be in Panaji. Where will you sleep?")).toBeTruthy();
    expect(screen.getByText('Check your plan · 1 question')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add stay' }));
    expect(mockPush).toHaveBeenCalledWith(
      `/trip/${tripId}/booking?type=stay&start=2026-07-14&end=2026-07-16`,
    );
  });

  it("I'm sorted adds a place you set, which clears the question", async () => {
    const { db, tripId } = setup();
    mockParams = {
      id: tripId,
      kind: 'stay',
      start: '2026-07-14',
      end: '2026-07-16',
      placeId: 'gn:goa',
    };
    await render(withData(db, <StopEditor />, 'plan'));
    expect(screen.getByLabelText('City').props.value).toBe('Panaji, India');
    await fireEvent.changeText(screen.getByLabelText('Where exactly (optional)'), "Aunt's house");
    await fireEvent.press(screen.getByRole('button', { name: 'Add place' }));
    expect(listStops(db, tripId)).toMatchObject([
      {
        kind: 'stay',
        placeId: 'gn:goa',
        startDate: '2026-07-14',
        endDate: '2026-07-16',
        label: "Aunt's house",
      },
    ]);

    mockParams = {};
    await render(withData(db, <ItineraryView tripId={tripId} />, 'plan'));
    expect(screen.queryByText(/^Check your plan/)).toBeNull();
    expect(screen.getByRole('tab', { name: 'Day 3, 14 Jul, Panaji' })).toBeTruthy();
  });

  it('Dismiss hides a question for good', async () => {
    const { db, tripId } = setup();
    await render(withData(db, <ItineraryView tripId={tripId} />, 'plan'));
    await fireEvent.press(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText(/^Check your plan/)).toBeNull();
  });

  it('says nothing for a trip with no bookings', async () => {
    const db = makeDb();
    const trip = createTrip(
      db,
      { title: 'Empty', timeZone: 'Asia/Kolkata', startDate: '2026-07-12', endDate: '2026-07-14' },
      { displayName: 'Gowtham' },
    );
    await render(withData(db, <ItineraryView tripId={trip.id} />, 'plan'));
    expect(screen.queryByText(/^Check your plan/)).toBeNull();
    expect(screen.queryByLabelText('Your route')).toBeNull();
    // Places can still be added before any booking.
    await fireEvent.press(screen.getByRole('button', { name: 'Add a place' }));
    expect(mockPush).toHaveBeenCalledWith(`/trip/${trip.id}/stop`);
  });
});
