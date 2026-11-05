import type { Place } from '@travelog/core';
import { getPlace, listTrips, saveLocalProfile, savePlaces, seedPlaces } from '@travelog/db';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import NewTripScreen from '@/app/new-trip';
import { makeDb, withData } from '@/testing/test-utils';

let mockExtra: Record<string, string | null> = {};
jest.mock('expo-constants', () => ({
  expoConfig: {
    get extra() {
      return mockExtra;
    },
  },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
}));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

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
const TOKYO = place({
  id: 'gn:1850147',
  name: 'Tokyo',
  kind: 'city',
  countryCode: 'JP',
  countryName: 'Japan',
  continent: 'Asia',
  timeZone: 'Asia/Tokyo',
  currency: 'JPY',
  population: 8_336_599,
});
const JAPAN = place({
  id: 'ctry:JP',
  name: 'Japan',
  kind: 'country',
  countryCode: 'JP',
  countryName: 'Japan',
  continent: 'Asia',
  timeZone: 'Asia/Tokyo',
  currency: 'JPY',
});

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

async function openNewTrip() {
  const db = makeDb();
  saveLocalProfile(db, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
  seedPlaces(db, [TOKYO, JAPAN], 'test');
  await render(
    <SafeAreaProvider initialMetrics={metrics}>{withData(db, <NewTripScreen />)}</SafeAreaProvider>,
  );
  await fireEvent.changeText(screen.getByLabelText('Trip name'), 'Japan trip');
  return db;
}

afterEach(() => {
  mockExtra = {};
  jest.restoreAllMocks();
});

describe('destination autocomplete (Plan 29)', () => {
  it('pick "Tokyo · Japan": the trip saves the place, its time zone and currency', async () => {
    const db = await openNewTrip();
    await fireEvent.changeText(screen.getByLabelText('Where'), 'Tok');
    await fireEvent.press(screen.getByRole('button', { name: 'Tokyo, Japan' }));
    expect(screen.getByText('Japan time (GMT+9)', { exact: false })).toBeTruthy();
    expect(screen.getByText('Japanese Yen (JPY)')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    expect(listTrips(db)[0]).toMatchObject({
      destination: 'Tokyo, Japan',
      destinationPlaceId: 'gn:1850147',
      timeZone: 'Asia/Tokyo',
      currency: 'JPY',
    });
  });

  it('countries show their continent', async () => {
    await openNewTrip();
    await fireEvent.changeText(screen.getByLabelText('Where'), 'japan');
    expect(screen.getByRole('button', { name: 'Japan, Asia' })).toBeTruthy();
  });

  it('no match offline: "Use as typed" keeps the text and no place', async () => {
    const db = await openNewTrip();
    await fireEvent.changeText(screen.getByLabelText('Where'), 'Hampi');
    await fireEvent.press(screen.getByRole('button', { name: 'Use "Hampi" as typed' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Create trip' }));
    expect(listTrips(db)[0]).toMatchObject({ destination: 'Hampi', destinationPlaceId: null });
  });

  it('a place our server finds is offered and saved on the phone', async () => {
    mockExtra = { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-anon-key' };
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        attribution: 'openstreetmap',
        places: [
          {
            id: 'osm:N245678',
            kind: 'city',
            name: 'Hampi',
            country_code: 'IN',
            country_name: 'India',
            region: 'Karnataka',
            continent: 'Asia',
            lat: 15.335,
            lng: 76.46,
            time_zone: 'Asia/Kolkata',
            currency: 'INR',
            population: 0,
            boost: 0,
            aliases: [],
            source: 'osm',
          },
        ],
      }),
    } as Response);
    const db = await openNewTrip();
    await fireEvent.changeText(screen.getByLabelText('Where'), 'Hampi');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Hampi, India' })).toBeTruthy());
    expect(fetchSpy.mock.calls[0]![0]).toBe(
      'https://example.supabase.co/functions/v1/place-search?q=Hampi',
    );
    expect(screen.getByText('Place data © OpenStreetMap contributors')).toBeTruthy();
    expect(getPlace(db, 'osm:N245678')?.name).toBe('Hampi');
  });

  it('asks our server for cities even when the phone has matches of its own', async () => {
    mockExtra = { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-anon-key' };
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ attribution: null, places: [] }),
    } as Response);
    const db = await openNewTrip();
    // Three phone matches used to be enough to skip the server.
    savePlaces(db, [
      place({
        id: 'ours:j1',
        name: 'Japan Alps',
        kind: 'region',
        countryCode: 'JP',
        countryName: 'Japan',
      }),
      place({
        id: 'ours:j2',
        name: 'Japanese Garden',
        kind: 'city',
        countryCode: 'JP',
        countryName: 'Japan',
      }),
    ]);
    await fireEvent.changeText(screen.getByLabelText('Where'), 'japan');
    expect(screen.getByRole('button', { name: 'Japan, Asia' })).toBeTruthy();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
  });
});
