import { createTrip, listTrips } from '@travelog/db';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import Licenses from '@/app/licenses';
import { TripCard } from '@/components/trip-card';
import { coverFor, type DestinationPhoto } from '@/lib/destinations';
import { mediaUrlFrom, stepWidth } from '@/lib/media';
import { RemoteImage } from '@/ui/remote-image';
import { makeDb, withData } from '@/testing/test-utils';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useGlobalSearchParams: () => ({}),
}));
jest.mock('expo-constants', () => ({
  expoConfig: { extra: { mediaUrl: 'https://media.example.com/' } },
}));
/** A sample photo. A function, because Jest runs the mock below before this file's body. */
function mockGoa(): DestinationPhoto {
  return {
    key: 'destinations/goa.jpg',
    names: ['goa', 'panaji'],
    placeIds: ['gn:1271157'],
    country: 'IN',
    blurhash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
    width: 2048,
    height: 1365,
    credit: 'Asha Rao',
    license: 'Own photo',
    source: null,
  };
}
jest.mock('@/lib/destinations', () => {
  const actual = jest.requireActual('@/lib/destinations');
  const photos = [mockGoa()];
  return {
    ...actual,
    PHOTOS: photos,
    coverFor: (t: any, c: any, p = photos) => actual.coverFor(t, c, p),
  };
});

/** Plan 53: photos from the media bucket, never empty and never broken. */
describe('media URLs', () => {
  it('asks Cloudflare for a right-sized copy, rounded up to shared steps', () => {
    expect(
      mediaUrlFrom('https://media.example.com/', 'destinations/goa.jpg', { width: 1000 }),
    ).toBe(
      'https://media.example.com/cdn-cgi/image/width=1080,quality=75,format=auto/destinations/goa.jpg',
    );
    expect(stepWidth(100)).toBe(320);
    expect(stepWidth(5000)).toBe(1440);
    expect(mediaUrlFrom(null, 'destinations/goa.jpg', { width: 300 })).toBeNull();
  });
});

describe('which photo a trip gets', () => {
  const india: DestinationPhoto = {
    ...mockGoa(),
    key: 'destinations/india.jpg',
    names: [],
    placeIds: [],
  };
  const photos = [mockGoa(), india];
  it('its exact place, then its name, then its country, else none', () => {
    expect(
      coverFor({ destination: 'Somewhere', destinationPlaceId: 'gn:1271157' }, null, photos)?.key,
    ).toBe('destinations/goa.jpg');
    expect(
      coverFor({ destination: 'Panaji, India', destinationPlaceId: null }, null, photos)?.key,
    ).toBe('destinations/goa.jpg');
    expect(
      coverFor({ destination: 'Hampi, India', destinationPlaceId: 'gn:1' }, 'IN', photos)?.key,
    ).toBe('destinations/india.jpg');
    expect(coverFor({ destination: 'Paris', destinationPlaceId: null }, 'FR', photos)).toBeNull();
  });
});

describe('RemoteImage', () => {
  it('shows the fallback at once and the photo over it; a failed photo leaves the fallback', async () => {
    await render(
      withData(
        makeDb(),
        <RemoteImage uri="https://x/y.jpg" blurhash="L" fallback={<Text>Art</Text>} />,
      ),
    );
    expect(screen.getByText('Art')).toBeTruthy();
    const img = screen.getByTestId('remote-image');
    await act(async () => img.props.onError({ nativeEvent: { error: 'offline' } }));
    expect(screen.queryByTestId('remote-image')).toBeNull();
    expect(screen.getByText('Art')).toBeTruthy();
  });

  it('with no photo, only the fallback', async () => {
    await render(withData(makeDb(), <RemoteImage uri={null} fallback={<Text>Art</Text>} />));
    expect(screen.queryByTestId('remote-image')).toBeNull();
  });
});

describe('trip covers', () => {
  it('a trip to a place with a photo shows it over its art, with the credit', async () => {
    const db = makeDb();
    createTrip(
      db,
      { title: 'Goa', destination: 'Goa, India', emoji: 'beach', timeZone: 'Asia/Kolkata' },
      { displayName: 'A' },
    );
    await render(withData(db, <TripCard trip={listTrips(db)[0]!} onPress={() => {}} />));
    expect(screen.getByTestId('remote-image')).toBeTruthy();
    expect(screen.getByTestId('art-beach', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText('Photo: Asha Rao')).toBeTruthy();
  });

  it('a trip without a photo looks as before', async () => {
    const db = makeDb();
    createTrip(
      db,
      { title: 'Spiti', destination: 'Spiti Valley', emoji: 'mountain', timeZone: 'Asia/Kolkata' },
      { displayName: 'A' },
    );
    await render(withData(db, <TripCard trip={listTrips(db)[0]!} onPress={() => {}} />));
    expect(screen.queryByTestId('remote-image')).toBeNull();
    expect(screen.queryByText(/Photo:/)).toBeNull();
  });

  it('photo credits are listed in Licences and credits', async () => {
    await render(withData(makeDb(), <Licenses />));
    expect(screen.getByText('DESTINATION PHOTOS')).toBeTruthy();
    expect(screen.getByText('Goa: Asha Rao · Own photo')).toBeTruthy();
  });
});
