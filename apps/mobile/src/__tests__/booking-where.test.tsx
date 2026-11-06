import type { Place } from '@travelog/core';
import {
  addBooking,
  createTrip,
  getBooking,
  getPlace,
  listBookings,
  savePlaces,
} from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import BookingEditor from '@/app/trip/[id]/booking';
import { makeDb, withData } from '@/testing/test-utils';

let mockParams: Record<string, string> = {};
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
}));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));

const place = (id: string, name: string, countryName: string, timeZone: string): Place => ({
  id,
  name,
  kind: 'city',
  countryCode: null,
  countryName,
  region: null,
  continent: null,
  lat: null,
  lng: null,
  timeZone,
  currency: null,
  population: 1000,
  boost: 0,
  aliases: [],
  source: 'geonames',
});

function setup() {
  const db = makeDb();
  savePlaces(db, [
    place('gn:blr', 'Bengaluru', 'India', 'Asia/Kolkata'),
    place('gn:tyo', 'Tokyo', 'Japan', 'Asia/Tokyo'),
  ]);
  const trip = createTrip(
    db,
    { title: 'Japan', timeZone: 'Asia/Tokyo', startDate: '2026-04-02', endDate: '2026-04-10' },
    { displayName: 'Gowtham' },
  );
  return { db, tripId: trip.id };
}

beforeEach(() => {
  mockBack.mockReset();
  mockParams = {};
});

describe('where a booking happens (Plan 35)', () => {
  it('shows a flight’s times in each place’s own time zone', async () => {
    const { db, tripId } = setup();
    const b = addBooking(db, {
      tripId,
      type: 'flight',
      title: 'BLR → NRT',
      // 23:00 in Bengaluru on 2 Apr; lands 07:30 on 3 Apr in Tokyo.
      startsAt: '2026-04-02T17:30:00.000Z',
      endsAt: '2026-04-02T22:30:00.000Z',
      fromPlaceId: 'gn:blr',
      toPlaceId: 'gn:tyo',
    });
    mockParams = { id: tripId, bookingId: b.id };
    await render(withData(db, <BookingEditor />, 'plan'));
    expect(screen.getByLabelText('From').props.value).toBe('Bengaluru, India');
    expect(screen.getByLabelText('To').props.value).toBe('Tokyo, Japan');
    expect(screen.getByLabelText('Departs: 23:00')).toBeTruthy();
    expect(screen.getByLabelText('Arrives: 07:30')).toBeTruthy();
    expect(screen.getByLabelText('Departs – arrives: 2 Apr 2026 – 3 Apr 2026')).toBeTruthy();
    expect(screen.getByText('Times are local to each place.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    // Saving without changes keeps the same instants.
    expect(getBooking(db, b.id)).toMatchObject({
      startsAt: '2026-04-02T17:30:00.000Z',
      endsAt: '2026-04-02T22:30:00.000Z',
    });
  });

  it('a stay in a place we don’t know keeps the place as typed, and opens in Maps', async () => {
    const { db, tripId } = setup();
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mockParams = { id: tripId };
    await render(withData(db, <BookingEditor />, 'plan'));
    await fireEvent.press(screen.getByRole('button', { name: 'Stay' }));
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Ryokan Sakura');
    await fireEvent.changeText(screen.getByLabelText('City'), 'Hakone Yumoto');
    await fireEvent.changeText(screen.getByLabelText('Address'), '1-2 Yumoto, Hakone');
    await fireEvent.press(screen.getByRole('button', { name: 'Open in Maps' }));
    expect(open).toHaveBeenCalledWith(
      'https://www.google.com/maps/search/?api=1&query=Ryokan%20Sakura%2C%201-2%20Yumoto%2C%20Hakone%2C%20Hakone%20Yumoto',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Add booking' }));
    const [b] = listBookings(db, tripId);
    expect(b).toMatchObject({ type: 'stay', address: '1-2 Yumoto, Hakone' });
    expect(getPlace(db, b!.placeId!)).toMatchObject({
      name: 'Hakone Yumoto',
      timeZone: 'Asia/Tokyo',
    });
  });

  it('a stay needs no name: it saves as "<City> stay" at 12:00 / 13:00 (Plan 38)', async () => {
    const { db, tripId } = setup();
    mockParams = { id: tripId, type: 'stay', start: '2026-04-03', end: '2026-04-06' };
    await render(withData(db, <BookingEditor />, 'plan'));
    // Stays show a confirmation number, not PNR or Provider.
    expect(screen.getByLabelText('Confirmation no.')).toBeTruthy();
    expect(screen.queryByLabelText('PNR')).toBeNull();
    expect(screen.queryByLabelText('Provider')).toBeNull();
    expect(screen.getByLabelText('Check-in: 12:00')).toBeTruthy();
    expect(screen.getByLabelText('Check-out: 13:00')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('City'), 'Tokyo');
    expect(screen.getByLabelText('Name').props.placeholder).toBe('Tokyo stay');
    await fireEvent.press(screen.getByRole('button', { name: 'Add booking' }));
    const [b] = listBookings(db, tripId);
    expect(b).toMatchObject({
      title: 'Tokyo stay',
      provider: null,
      // 12:00 and 13:00 in Tokyo (the trip's time zone) are 03:00 and 04:00 UTC.
      startsAt: '2026-04-03T03:00:00.000Z',
      endsAt: '2026-04-06T04:00:00.000Z',
    });
  });

  it('a journey is named from its places when the name is left empty', async () => {
    const { db, tripId } = setup();
    mockParams = { id: tripId, type: 'flight', start: '2026-04-02', end: '2026-04-02' };
    await render(withData(db, <BookingEditor />, 'plan'));
    await fireEvent.changeText(screen.getByLabelText('From'), 'Bengaluru');
    await fireEvent.changeText(screen.getByLabelText('To'), 'Tokyo');
    await fireEvent.press(screen.getByRole('button', { name: 'Add booking' }));
    expect(listBookings(db, tripId)[0]!.title).toBe('Bengaluru → Tokyo');
  });
});
