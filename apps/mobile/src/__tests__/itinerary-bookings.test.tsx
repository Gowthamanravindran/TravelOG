import type { Place } from '@travelog/core';
import {
  addAttachment,
  addBooking,
  addItem,
  createTrip,
  ensureMainVariant,
  savePlaces,
} from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ItineraryView } from '@/components/itinerary-view';
import { makeDb, withData } from '@/testing/test-utils';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
}));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
const mockOpen = jest.fn();
jest.mock('@/lib/files', () => ({ openAttachment: (a: unknown) => mockOpen(a) }));

const city = (id: string, name: string, timeZone: string): Place => ({
  id,
  name,
  kind: 'city',
  countryCode: null,
  countryName: null,
  region: null,
  continent: null,
  lat: null,
  lng: null,
  timeZone,
  currency: null,
  population: 1,
  boost: 0,
  aliases: [],
  source: 'geonames',
});

function setup() {
  const db = makeDb();
  savePlaces(db, [city('maa', 'Chennai', 'Asia/Kolkata'), city('par', 'Paris', 'Europe/Paris')]);
  const { id: tripId } = createTrip(
    db,
    { title: 'Europe', timeZone: 'Europe/Paris', startDate: '2024-12-20', endDate: '2024-12-24' },
    { displayName: 'Gowtham' },
  );
  const flight = addBooking(db, {
    tripId,
    type: 'flight',
    title: 'Chennai → Paris · AI 143',
    reference: 'QW7RTA',
    startsAt: '2024-12-20T02:30:00.000Z', // 08:00 in Chennai
    endsAt: '2024-12-20T13:00:00.000Z', // 14:00 in Paris
    fromPlaceId: 'maa',
    toPlaceId: 'par',
  });
  addAttachment(db, {
    tripId,
    bookingId: flight.id,
    name: 'eticket.pdf',
    localUri: 'file:///e.pdf',
  });
  const hotel = addBooking(db, {
    tripId,
    type: 'stay',
    title: 'Garden Saint Martin',
    reference: '4100.200.301',
    startsAt: '2024-12-20T14:00:00.000Z', // 15:00 in Paris
    endsAt: '2024-12-23T10:30:00.000Z', // 11:30 in Paris
    placeId: 'par',
  });
  const v = ensureMainVariant(db, tripId, '2024-12-20', null);
  addItem(db, v.id, {
    type: 'place',
    title: 'Coffee at the airport',
    startTime: '07:00',
  });
  addItem(db, v.id, { type: 'food', title: 'Dinner', startTime: '20:00' });
  return { db, tripId, flight, hotel };
}

beforeEach(() => {
  mockPush.mockReset();
  mockOpen.mockReset().mockResolvedValue(undefined);
});

const order = () =>
  screen
    .getAllByRole('button')
    .map((b) => b.props.accessibilityLabel as string)
    .filter((l) => /booked$|^Coffee|^Dinner/.test(l ?? ''));

describe('bookings on the itinerary (Plan 42)', () => {
  it('a travel day shows the flight and check-in among the stops, in time order', async () => {
    const { db, tripId, flight } = setup();
    await render(withData(db, <ItineraryView tripId={tripId} initialDay="2024-12-20" />, 'plan'));
    expect(order()).toEqual([
      'Coffee at the airport',
      'Flight · AI 143, Chennai → Paris, booked',
      'Check in, Garden Saint Martin, booked',
      'Dinner',
    ]);
    expect(screen.getByText('08:00 – 14:00 Paris time · 10 h 30 min')).toBeTruthy();
    expect(screen.getByText('PNR QW7RTA')).toBeTruthy();
    expect(screen.getByText('Check-in from 15:00 · 3 nights')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open ticket eticket.pdf' }));
    expect(mockOpen).toHaveBeenCalledWith(expect.objectContaining({ localUri: 'file:///e.pdf' }));
    await fireEvent.press(
      screen.getByRole('button', { name: 'Flight · AI 143, Chennai → Paris, booked' }),
    );
    expect(mockPush).toHaveBeenCalledWith(`/trip/${tripId}/booking?bookingId=${flight.id}`);
  });

  it('a middle day of a stay shows the strip; a day with only bookings offers Add stop', async () => {
    const { db, tripId, hotel } = setup();
    const view = await render(
      withData(db, <ItineraryView tripId={tripId} initialDay="2024-12-21" />, 'plan'),
    );
    expect(screen.getByText('Staying at Garden Saint Martin')).toBeTruthy();
    expect(screen.getByText('Night 2 of 3 · check-out Mon 23 Dec, 11:30')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Staying at Garden Saint Martin, night 2 of 3' }),
    );
    expect(mockPush).toHaveBeenCalledWith(`/trip/${tripId}/booking?bookingId=${hotel.id}`);
    await view.unmount();

    await render(withData(db, <ItineraryView tripId={tripId} initialDay="2024-12-23" />, 'plan'));
    expect(
      screen.getByRole('button', { name: 'Check out, Garden Saint Martin, booked' }),
    ).toBeTruthy();
    expect(screen.getByText('By 11:30')).toBeTruthy();
    expect(screen.queryByText('Nothing planned for this day')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add stop' })).toBeTruthy();
  });
});
