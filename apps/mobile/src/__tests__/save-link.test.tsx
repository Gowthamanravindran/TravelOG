import { createTrip, ensureMainVariant, listItems, listSaved } from '@travelog/db';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SaveLinkScreen from '@/app/save-link';
import { IDEAS_DAY } from '@/components/itinerary-view';
import { firstLink, linkSource, readMeta } from '@/lib/link-preview';
import { makeDb, withData } from '@/testing/test-utils';

jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
let mockParams: Record<string, string> = {};
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: mockBack, replace: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => ({}),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

afterEach(() => {
  jest.restoreAllMocks();
  mockParams = {};
});

/** Plan 59: links and what's in them. */
describe('reading a link', () => {
  it('finds the link in shared text and knows the site', () => {
    expect(firstLink('Look! https://youtu.be/abc123?si=x).')).toBe('https://youtu.be/abc123?si=x');
    expect(firstLink('no link here')).toBeNull();
    expect(linkSource('https://www.instagram.com/reel/C1/')).toBe('instagram');
    expect(linkSource('https://m.youtube.com/shorts/x')).toBe('youtube');
    expect(linkSource('https://vm.tiktok.com/x')).toBe('tiktok');
    expect(linkSource('https://goafoodguide.in/cafes')).toBe('web');
  });

  it("reads a page's title, description and picture", () => {
    expect(
      readMeta(
        '<head><title>Ignored</title><meta property="og:title" content="Goa&#39;s best caf&eacute;s"><meta content="📍 Artjuna" name="description"><meta property="og:image" content="https://x/y.jpg"></head>',
      ),
    ).toEqual({
      title: "Goa's best caf&eacute;s",
      description: '📍 Artjuna',
      image: 'https://x/y.jpg',
    });
  });
});

function setup() {
  const db = makeDb();
  const { id: tripId } = createTrip(
    db,
    { title: 'Goa', timeZone: 'Asia/Kolkata', startDate: '2026-11-14', endDate: '2026-11-16' },
    { displayName: 'A' },
  );
  return { db, tripId };
}

const open = (db: ReturnType<typeof makeDb>) =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      {withData(db, <SaveLinkScreen />)}
    </SafeAreaProvider>,
  );

describe('Save from a link', () => {
  it('reads a video, finds the places in its caption, and saves the ticked ones', async () => {
    const { db } = setup();
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        title: '10 hidden cafés in North Goa',
        author_name: 'slowtravelgoa',
        thumbnail_url: 'https://i.ytimg.com/vi/abc/hq.jpg',
      }),
    } as Response);
    await open(db);
    await fireEvent.changeText(screen.getByLabelText('Link'), 'https://youtu.be/abc');
    await waitFor(() => expect(screen.getByText('10 hidden cafés in North Goa')).toBeTruthy());
    expect(String(fetchSpy.mock.calls[0]![0])).toContain('youtube.com/oembed');

    await fireEvent.changeText(
      screen.getByLabelText('Caption or notes'),
      '📍 Gunpowder, Assagao\n📍 Bean Me Up, Vagator\nWe also loved sunset at Chapora Fort',
    );
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Gunpowder' })).toBeTruthy(), {
      timeout: 3000,
    });
    // Sure ones start ticked; guesses don't.
    expect(
      screen.getByRole('checkbox', { name: 'Gunpowder' }).props.accessibilityState.checked,
    ).toBe(true);
    expect(
      screen.getByRole('checkbox', { name: 'Chapora Fort' }).props.accessibilityState.checked,
    ).toBe(false);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Chapora Fort' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Only Saved' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save 3 places' }));
    const saved = listSaved(db);
    expect(saved.map((s) => s.title).sort()).toEqual(['Bean Me Up', 'Chapora Fort', 'Gunpowder']);
    expect(saved.find((s) => s.title === 'Gunpowder')).toMatchObject({
      area: 'Assagao',
      source: 'youtube',
      url: 'https://youtu.be/abc',
      sourceTitle: '10 hidden cafés in North Goa',
      thumbUrl: 'https://i.ytimg.com/vi/abc/hq.jpg',
    });
    expect(mockBack).toHaveBeenCalled();
  });

  it("Instagram: asks for the caption, and saves into the trip's Ideas", async () => {
    const { db, tripId } = setup();
    mockParams = { tripId };
    const fetchSpy = jest.spyOn(global, 'fetch');
    await open(db);
    await fireEvent.changeText(
      screen.getByLabelText('Link'),
      'https://www.instagram.com/reel/C1x/',
    );
    await waitFor(() =>
      expect(screen.getByText('Instagram doesn’t share captions with apps')).toBeTruthy(),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText('Caption or notes'), '📍 Mojigao, Assagao');
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Mojigao' })).toBeTruthy(), {
      timeout: 3000,
    });
    await fireEvent.changeText(screen.getByLabelText('Add a place yourself'), 'Café Ida');
    await fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save 2 places' }));
    const ideas = ensureMainVariant(db, tripId, IDEAS_DAY);
    expect(
      listItems(db, ideas.id)
        .map((i) => i.title)
        .sort(),
    ).toEqual(['Café Ida', 'Mojigao']);
    expect(listSaved(db)[0]!.source).toBe('instagram');
  });
});
