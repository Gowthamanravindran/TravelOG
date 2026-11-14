import type { Place } from '@travelog/core';
import {
  addItem,
  createTrip,
  ensureMainVariant,
  listItems,
  listSaved,
  savePlace,
  savePlaces,
} from '@travelog/db';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SavedScreen from '@/app/(home)/saved';
import ItemEditor from '@/app/trip/[id]/item';
import { IDEAS_DAY, ItineraryView } from '@/components/itinerary-view';
import { makeDb, withData } from '@/testing/test-utils';

jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
let mockParams: Record<string, string> = {};
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => ({}),
}));

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

const artjuna = { lat: 15.5791, lng: 73.7402 };
const chapora = { lat: 15.6058, lng: 73.7364 };
const fontainhas = { lat: 15.4989, lng: 73.8294 };
const kochi = { lat: 9.9658, lng: 76.2421 };

function setup() {
  const db = makeDb();
  savePlaces(db, [
    place({ id: 'ctry:IN', name: 'India', kind: 'country', countryCode: 'IN' }),
    place({ id: 'gn:goa', name: 'Goa', kind: 'city', countryCode: 'IN', lat: 15.49, lng: 73.83 }),
  ]);
  const { id: tripId } = createTrip(
    db,
    {
      title: 'Goa with friends',
      destination: 'Goa',
      destinationPlaceId: 'gn:goa',
      timeZone: 'Asia/Kolkata',
      startDate: '2026-11-14',
      endDate: '2026-11-16',
    },
    { displayName: 'A' },
  );
  return { db, tripId };
}

/** Plan 58: places you want to go, across trips. */
describe('the Saved tab', () => {
  it('starts empty with a way to save a place', async () => {
    const { db } = setup();
    await render(withData(db, <SavedScreen />));
    expect(screen.getByText('Places you want to go')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Save a place' }));
    expect(mockPush).toHaveBeenCalledWith('/saved-place');
  });

  it('groups places by country and area, filters them, and adds one to a trip', async () => {
    const { db, tripId } = setup();
    savePlace(db, {
      title: 'Artjuna',
      type: 'food',
      area: 'Anjuna',
      countryCode: 'IN',
      ...artjuna,
    });
    savePlace(db, { title: 'Chapora Fort', area: 'Vagator', countryCode: 'IN', ...chapora });
    savePlace(db, {
      title: 'Kashi Art Café',
      type: 'food',
      area: 'Fort Kochi',
      countryCode: 'IN',
      ...kochi,
    });
    await render(withData(db, <SavedScreen />));
    expect(screen.getByText('India')).toBeTruthy();
    expect(screen.getByText('3 places')).toBeTruthy();
    expect(screen.getByText('Fort Kochi')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Search saved'), 'kochi');
    expect(screen.queryByText('Artjuna')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Search saved'), '');
    await fireEvent.press(screen.getByRole('button', { name: 'Food 2' }));
    expect(screen.queryByText('Chapora Fort')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Add Artjuna to a trip' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Goa with friends' }));
    expect(screen.getByText("Artjuna is in Goa with friends's ideas")).toBeTruthy();
    const ideas = ensureMainVariant(db, tripId, IDEAS_DAY);
    expect(listItems(db, ideas.id).map((i) => i.title)).toEqual(['Artjuna']);
  });

  it('removes a place', async () => {
    const { db } = setup();
    savePlace(db, { title: 'Artjuna', countryCode: 'IN', ...artjuna });
    await render(withData(db, <SavedScreen />));
    await fireEvent.press(screen.getByLabelText('Artjuna'));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove from Saved' }));
    expect(listSaved(db)).toHaveLength(0);
  });
});

describe('saving from a trip', () => {
  it('a stop’s place can be saved from the stop editor', async () => {
    const { db, tripId } = setup();
    const v = ensureMainVariant(db, tripId, '2026-11-15');
    const item = addItem(db, v.id, {
      type: 'food',
      title: 'Breakfast',
      placeName: 'Artjuna',
      address: 'Market Road, Anjuna, Bardez',
      ...artjuna,
    });
    mockParams = { id: tripId, variantId: v.id, itemId: item.id };
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        {withData(db, <ItemEditor />, 'plan')}
      </SafeAreaProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Save to Saved' }));
    expect(listSaved(db)[0]).toMatchObject({
      title: 'Artjuna',
      type: 'food',
      area: 'Anjuna',
      countryCode: 'IN',
      source: 'stop',
    });
    expect(screen.getByRole('button', { name: 'In Saved' })).toBeTruthy();
  });

  it('the Ideas day offers saved places near the trip, and plans ideas over the days', async () => {
    const { db, tripId } = setup();
    savePlace(db, { title: 'Artjuna', countryCode: 'IN', ...artjuna });
    savePlace(db, { title: 'Chapora Fort', countryCode: 'IN', ...chapora });
    savePlace(db, { title: 'Fontainhas walk', countryCode: 'IN', ...fontainhas });
    savePlace(db, { title: 'Kashi Art Café', countryCode: 'IN', ...kochi });
    await render(withData(db, <ItineraryView tripId={tripId} initialDay={IDEAS_DAY} />, 'plan'));
    expect(screen.getByText('3 saved places near Goa')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Fontainhas walk' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add 2 to Ideas' }));
    const ideas = ensureMainVariant(db, tripId, IDEAS_DAY);
    expect(
      listItems(db, ideas.id)
        .map((i) => i.title)
        .sort(),
    ).toEqual(['Artjuna', 'Chapora Fort']);
    expect(screen.getByText('1 saved place near Goa')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Plan these ideas' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add 2 to days' }));
    expect(listItems(db, ideas.id)).toHaveLength(0);
    // Artjuna and Chapora are minutes apart: the same day.
    const first = ensureMainVariant(db, tripId, '2026-11-14');
    expect(
      listItems(db, first.id)
        .map((i) => i.title)
        .sort(),
    ).toEqual(['Artjuna', 'Chapora Fort']);
    expect(within(screen.getByTestId('day-strip')).getByText('Ideas')).toBeTruthy();
  });
});
