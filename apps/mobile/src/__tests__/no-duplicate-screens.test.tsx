import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { createTrip, getLocalProfile, saveLocalProfile } from '@travelog/db';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';

import ReadyScreen from '@/app/trip/[id]/ready';
import Welcome from '@/app/welcome';
import { useReminders } from '@/lib/reminders';
import { tripHref } from '@/lib/trip-route';
import { makeDb, withData } from '@/testing/test-utils';

// Going to a screen that is already open further back goes back to it, instead of stacking a
// second copy on top (Plan 91, after Plan 90's "Back to trips"). Expo Router's navigate and push
// both put a new screen on top; dismissTo goes back to one already there, or opens it if not.

const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockDismissTo = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    replace: mockReplace,
    navigate: mockNavigate,
    dismissTo: mockDismissTo,
  }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
}));
let mockTap: ((r: unknown) => void) | null = null;
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: (f: (r: unknown) => void) => {
    mockTap = f;
    return { remove: jest.fn() };
  },
  getPermissionsAsync: jest.fn(async () => ({ granted: false })),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

beforeEach(() => {
  for (const f of [mockPush, mockNavigate, mockReplace, mockBack, mockDismissTo]) f.mockReset();
  mockParams = {};
});
const forward = () =>
  [mockPush, mockNavigate, mockReplace].flatMap((f) => f.mock.calls.map((c) => String(c[0])));

describe('the profile form', () => {
  it('editing your profile goes back to where you were, not to a new Trips screen', async () => {
    const db = makeDb();
    saveLocalProfile(db, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
    await render(withData(db, <Welcome />));
    await fireEvent.changeText(screen.getByDisplayValue('Gowtham'), 'Gowtham R');
    await fireEvent.press(screen.getByRole('button', { name: /^(Save|Let's go)$/ }));
    expect(getLocalProfile(db)?.displayName).toBe('Gowtham R');
    expect(mockBack).toHaveBeenCalled();
    expect(forward()).toEqual([]);
  });

  it('the first time, it opens Trips (there is none yet)', async () => {
    const db = makeDb();
    await render(withData(db, <Welcome />));
    await fireEvent.changeText(screen.getByLabelText(/name/i), 'Gowtham');
    await fireEvent.press(screen.getByRole('button', { name: /^(Save|Let's go)$/ }));
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});

describe('Get ready', () => {
  function trip() {
    const db = makeDb();
    saveLocalProfile(db, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
    const t = createTrip(
      db,
      {
        title: 'Goa',
        emoji: 'beach',
        timeZone: 'Asia/Kolkata',
        currency: 'INR',
        startDate: '2026-12-12',
        endDate: '2026-12-18',
      },
      { displayName: 'Gowtham' },
    );
    mockParams = { id: t.id };
    return { db, id: t.id };
  }

  it.each([
    ['Budget set', 'plan/budget?edit=1'],
    ['Getting there and back', 'plan/bookings'],
    ['A stay every night', 'plan/bookings'],
  ])('“%s” goes back to the trip’s tab underneath, not a second trip on top', async (title, to) => {
    const { db, id } = trip();
    await render(withData(db, <ReadyScreen />, 'plan'));
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${title}`) }));
    expect(mockDismissTo).toHaveBeenCalledWith(`/trip/${id}/${to}`);
    expect(forward()).toEqual([]);
  });
});

describe('tapping a reminder', () => {
  it('goes to the trip, or back to it if it is already open', async () => {
    const db = makeDb();
    const t = createTrip(
      db,
      { title: 'Goa', emoji: 'beach', timeZone: 'Asia/Kolkata', currency: 'INR' },
      { displayName: 'Gowtham' },
    );
    await renderHook(() => useReminders(), {
      wrapper: ({ children }) => withData(db, children as React.ReactElement),
    });
    await act(async () =>
      mockTap!({ notification: { request: { content: { data: { tripId: t.id } } } } }),
    );
    expect(mockDismissTo).toHaveBeenCalledWith(tripHref(t));
    expect(forward()).toEqual([]);
  });
});

describe('a guard for the future', () => {
  // Every source file of the app, outside the tests.
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = path.join(dir, f);
      if (statSync(p).isDirectory()) return f === '__tests__' ? [] : files(p);
      return /\.(ts|tsx)$/.test(f) ? [p] : [];
    });

  it('nothing pushes, navigates or replaces to the Trips screen; going back there is dismissTo', () => {
    // Allowed: switching tabs inside the home screen, and the first-run welcome (no Trips yet).
    const allowed = [path.join('app', '(home)', '_layout.tsx'), path.join('app', 'welcome.tsx')];
    const src = path.join(__dirname, '..');
    const found = files(src)
      .filter((f) => !allowed.some((a) => f.endsWith(a)))
      .flatMap((f) =>
        readFileSync(f, 'utf8')
          .split('\n')
          .map((line, i) => ({ line, at: `${path.relative(src, f)}:${i + 1}` }))
          .filter(({ line }) => /router\.(push|navigate|replace)\(\s*['"`]\/['"`]\s*\)/.test(line))
          .map(({ at }) => at),
      );
    expect(found).toEqual([]);
  });
});
