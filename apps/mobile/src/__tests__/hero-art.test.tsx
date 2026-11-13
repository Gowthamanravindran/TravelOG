import fs from 'node:fs';
import path from 'node:path';

import { createTrip, listTrips } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';

import Licenses from '@/app/licenses';
import { TripCard } from '@/components/trip-card';
import { TRIP_ICONS, tripArt, tripIcon } from '@/lib/labels';
import { greeting } from '@/lib/today';
import { Empty } from '@/ui/kit';
import { makeDb, withData } from '@/testing/test-utils';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
}));

const app = path.join(__dirname, '../..');

/** Plan 52: 3D art across the app, and its licences. */
describe('3D art', () => {
  it('gives every trip icon its own object, and anything unknown the suitcase', () => {
    for (const { icon } of TRIP_ICONS)
      if (icon !== 'trips') expect(tripArt(icon)).not.toBe('luggage');
    expect(tripArt('trips')).toBe('luggage');
    expect(tripArt(tripIcon('not-an-icon'))).toBe('luggage');
    expect(tripArt(tripIcon('🏖️'))).toBe('beach');
    expect(tripArt('desert')).toBe('desert');
  });

  it('shows the trip’s object on its card', async () => {
    const db = makeDb();
    createTrip(
      db,
      { title: 'Spiti', emoji: 'mountain', timeZone: 'Asia/Kolkata' },
      { displayName: 'A' },
    );
    const trip = listTrips(db)[0]!;
    await render(withData(db, <TripCard trip={trip} onPress={() => {}} />));
    expect(screen.getByTestId('art-mountain', { includeHiddenElements: true })).toBeTruthy();
  });

  it('empty screens show their object when given one, else the icon as before', async () => {
    const db = makeDb();
    await render(withData(db, <Empty icon="bookings" art="ticket" title="No bookings yet" />));
    expect(screen.getByTestId('art-ticket', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('No bookings yet')).toBeTruthy();
    await render(withData(db, <Empty icon="bookings" title="Nothing" />));
    expect(screen.queryByTestId('art-ticket', { includeHiddenElements: true })).toBeNull();
  });

  it('greets by the trip’s local time', () => {
    expect(greeting('07:30')).toBe('Good morning');
    expect(greeting('13:05')).toBe('Good afternoon');
    expect(greeting('21:40')).toBe('Good evening');
    expect(greeting('02:00')).toBe('Good evening');
  });
});

describe('licences', () => {
  it('ships Microsoft’s licence next to the art, and every art file is listed in SOURCE.md', () => {
    const dir = path.join(app, 'assets/art');
    expect(fs.readFileSync(path.join(dir, 'LICENSE'), 'utf8')).toMatch(
      /MIT License[\s\S]*Copyright \(c\) Microsoft Corporation/,
    );
    const source = fs.readFileSync(path.join(dir, 'SOURCE.md'), 'utf8');
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.png')))
      expect(source).toContain(`\`${f}\``);
  });

  it('lists every package the app depends on (run pnpm licenses:build after adding one)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(app, 'package.json'), 'utf8'));
    const listed = new Set(
      (
        JSON.parse(fs.readFileSync(path.join(app, 'assets/licenses.json'), 'utf8')) as {
          packages: { name: string }[];
        }
      ).packages.map((p) => p.name),
    );
    const missing = Object.keys(pkg.dependencies).filter(
      (d) => !d.startsWith('@travelog/') && !listed.has(d),
    );
    expect(missing).toEqual([]);
  });

  it('the Licences screen shows the art, fonts, icons and place data, with full texts', async () => {
    await render(withData(makeDb(), <Licenses />));
    expect(screen.getByText('Microsoft Fluent Emoji 3D')).toBeTruthy();
    expect(screen.getByText('Plus Jakarta Sans')).toBeTruthy();
    expect(screen.getByText('Figtree')).toBeTruthy();
    expect(screen.getByText('Material Symbols (Google)')).toBeTruthy();
    expect(screen.getByText('GeoNames')).toBeTruthy();
    expect(screen.getByText('OpenStreetMap')).toBeTruthy();
    expect(screen.getByText(/OPEN-SOURCE PACKAGES · \d+/)).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Show licence' })[0]!);
    expect(screen.getByText(/Copyright \(c\) Microsoft Corporation/)).toBeTruthy();
  });
});
