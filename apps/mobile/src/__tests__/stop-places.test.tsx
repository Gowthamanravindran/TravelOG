import { addItem, createTrip, ensureMainVariant, listItems } from '@travelog/db';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import ItemEditor from '@/app/trip/[id]/item';
import { ItineraryView } from '@/components/itinerary-view';
import { makeDb, withData } from '@/testing/test-utils';

let mockExtra: Record<string, string | null> = {};
jest.mock('expo-constants', () => ({
  expoConfig: {
    get extra() {
      return mockExtra;
    },
  },
}));
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => ({}),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

// Real places in North Goa.
const artjuna = { lat: 15.5791, lng: 73.7402 };
const market = { lat: 15.5763, lng: 73.7414 };
const aguada = { lat: 15.4925, lng: 73.7733 };
const chapora = { lat: 15.6058, lng: 73.7364 };

function goa() {
  const db = makeDb();
  const { id: tripId } = createTrip(
    db,
    { title: 'Goa', timeZone: 'Asia/Kolkata', startDate: '2026-11-14', endDate: '2026-11-16' },
    { displayName: 'A' },
  );
  const v = ensureMainVariant(db, tripId, '2026-11-15');
  return { db, tripId, v };
}

afterEach(() => {
  mockExtra = {};
  jest.restoreAllMocks();
});

/** Plan 57: stops have a real place; travel time and Best order follow from it. */
describe('a stop’s place', () => {
  it('searches places near the trip and fills the stop from the one picked', async () => {
    const { db, tripId, v } = goa();
    mockParams = { id: tripId, variantId: v.id };
    mockExtra = { supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'public-anon-key' };
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        attribution: 'openstreetmap',
        pois: [
          { id: 'osm:N42', name: 'Artjuna', address: 'Anjuna, Bardez', kind: 'food', ...artjuna },
        ],
      }),
    } as Response);
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        {withData(db, <ItemEditor />, 'plan')}
      </SafeAreaProvider>,
    );
    await fireEvent.changeText(screen.getByLabelText('Place'), 'artj');
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Artjuna, Anjuna, Bardez' })).toBeTruthy(),
    );
    expect(String(fetchSpy.mock.calls[0]![0])).toContain('scope=poi');
    await fireEvent.press(screen.getByRole('button', { name: 'Artjuna, Anjuna, Bardez' }));
    expect(screen.getByTestId('stop-place')).toBeTruthy();
    expect(screen.getByLabelText('Name').props.value).toBe('Artjuna');
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(listItems(db, v.id)[0]).toMatchObject({
      title: 'Artjuna',
      type: 'food',
      placeName: 'Artjuna',
      poiId: 'osm:N42',
      lat: artjuna.lat,
    });
  });

  it('offline, the name as typed is kept without a map spot', async () => {
    const { db, tripId, v } = goa();
    mockParams = { id: tripId, variantId: v.id };
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        {withData(db, <ItemEditor />, 'plan')}
      </SafeAreaProvider>,
    );
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Sunset');
    await fireEvent.changeText(screen.getByLabelText('Place'), 'Vagator beach');
    await fireEvent.press(screen.getByRole('button', { name: 'Use "Vagator beach" as typed' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(listItems(db, v.id)[0]).toMatchObject({ placeName: 'Vagator beach', lat: null });
  });
});

describe('travel time and best order', () => {
  function day() {
    const { db, tripId, v } = goa();
    const add = (title: string, p: { lat: number; lng: number }, startTime?: string) =>
      addItem(db, v.id, { type: 'place', title, placeName: title, ...p, startTime });
    add('Artjuna', artjuna, '09:00');
    add('Fort Aguada', aguada);
    add('Flea Market', market);
    add('Chapora Fort', chapora);
    return { db, tripId, v };
  }

  it('shows the estimated trip between stops that have places', async () => {
    const { db, tripId } = day();
    await render(withData(db, <ItineraryView tripId={tripId} initialDay="2026-11-15" />, 'plan'));
    const legs = screen.getAllByTestId('travel-leg');
    expect(legs).toHaveLength(3);
    expect(within(legs[0]!).getByText(/≈ \d+ min drive · \d+ km/)).toBeTruthy();
  });

  it('suggests a shorter order, applies it on request, and can undo it', async () => {
    const { db, tripId, v } = day();
    const before = listItems(db, v.id).map((i) => i.title);
    await render(withData(db, <ItineraryView tripId={tripId} initialDay="2026-11-15" />, 'plan'));
    await fireEvent.press(screen.getByRole('button', { name: 'Best order' }));
    expect(screen.getByText(/^Best order for /)).toBeTruthy();
    expect(screen.getByText(/^Saves about/)).toBeTruthy();
    expect(listItems(db, v.id).map((i) => i.title)).toEqual(before);
    await fireEvent.press(screen.getByRole('button', { name: 'Use this order' }));
    const after = listItems(db, v.id).map((i) => i.title);
    expect(after[0]).toBe('Artjuna');
    expect(after[1]).toBe('Flea Market');
    expect(screen.getByText('New order saved')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Best order' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(listItems(db, v.id).map((i) => i.title)).toEqual(before);
  });

  it('no Best order when the order is already good or stops have no places', async () => {
    const { db, tripId, v } = goa();
    addItem(db, v.id, { type: 'place', title: 'A', ...artjuna });
    addItem(db, v.id, { type: 'place', title: 'B', ...market });
    addItem(db, v.id, { type: 'note', title: 'Call home' });
    await render(withData(db, <ItineraryView tripId={tripId} initialDay="2026-11-15" />, 'plan'));
    expect(screen.queryByRole('button', { name: 'Best order' })).toBeNull();
    expect(screen.getAllByTestId('travel-leg')).toHaveLength(1);
  });
});
