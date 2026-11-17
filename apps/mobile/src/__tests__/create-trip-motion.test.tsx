import { monthOf, shiftMonth, localDateIn } from '@travelog/core';
import { saveLocalProfile } from '@travelog/db';
import * as Haptics from 'expo-haptics';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import HomeLayout from '@/app/(home)/_layout';
import { closeCreateFlow } from '@/lib/create-flow';
import { hasGlobe } from '@/lib/runtime';
import { makeDb, withData } from '@/testing/test-utils';
import { haptic } from '@/ui/motion';
import { prettyDay } from '@/ui/range-calendar';

let mockReduced = false;
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  ...jest.requireActual('react-native-reanimated'),
  useReducedMotion: () => mockReduced,
}));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));
let mockPath = '/';
let mockParams: Record<string, string | undefined> = {};
const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockSetParams = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
    replace: jest.fn(),
    navigate: mockNavigate,
    setParams: mockSetParams,
  }),
  usePathname: () => mockPath,
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
  Redirect: () => null,
}));
// The tab navigator is replaced by something that only draws the layout's own tab bar; the
// globe stage and its panels are drawn by the layout itself.
jest.mock('expo-router/tabs', () => {
  const Tabs = ({ tabBar }: { tabBar: (p: unknown) => React.ReactNode }) =>
    tabBar({
      state: { index: 0, routes: [{ name: 'index', key: 'index' }] },
      navigateToTab: jest.fn(),
    });
  Tabs.Screen = () => null;
  return { Tabs };
});
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));
jest.mock('@/lib/runtime', () => ({
  ...jest.requireActual('@/lib/runtime'),
  hasGlobe: jest.fn(() => true),
}));
(hasGlobe as jest.Mock).mockReturnValue(true);

const announce = jest
  .spyOn(AccessibilityInfo, 'announceForAccessibility')
  .mockImplementation(() => {});
const notified = (kind: string) =>
  (Haptics.notificationAsync as jest.Mock).mock.calls.filter(([k]) => k === kind).length;

const next = shiftMonth(monthOf(localDateIn('Asia/Kolkata')), 1);
const day = (d: number) =>
  `${next.year}-${String(next.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

/** Tokyo, the 12th to the 14th (3 days), on the days step. */
async function toDaysStep() {
  const d = makeDb();
  saveLocalProfile(d, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
  await render(withData(d, <HomeLayout />));
  await press('Create a trip');
  await fireEvent.changeText(screen.getByLabelText('Search a country or city'), 'tok');
  await press('Add Tokyo, Japan');
  await press('Let’s go →');
  await press('Next month');
  await press(prettyDay(day(12)));
  await press(prettyDay(day(14)));
  await press('Next →');
  await press('Next →');
}

beforeEach(() => {
  mockReduced = false;
  closeCreateFlow();
  jest.clearAllMocks();
});

describe('feedback while creating a trip (Plan 67)', () => {
  it('says what was added, for people who cannot see the globe', async () => {
    await toDaysStep();
    expect(announce).toHaveBeenCalledWith('Tokyo added, stop 1');
    expect(announce).toHaveBeenCalledWith('Japan added');
  });

  it('a pick gives a light tap', async () => {
    await toDaysStep();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('matching the days gives one success tap; going over gives one warning each time', async () => {
    await toDaysStep();
    expect(screen.getByText('2 days left to place')).toBeTruthy();
    expect(notified('success')).toBe(0);
    await press('One day more in Tokyo');
    expect(notified('success')).toBe(0);
    await press('One day more in Tokyo');
    expect(screen.getByText('All days placed')).toBeTruthy();
    expect(notified('success')).toBe(1);

    await press('One day more in Tokyo');
    expect(screen.getByText('1 day too many')).toBeTruthy();
    expect(notified('warning')).toBe(1);
    await press('One day more in Tokyo');
    expect(notified('warning')).toBe(1); // still over: no second warning
    await press('One day less in Tokyo');
    await press('One day less in Tokyo');
    expect(notified('success')).toBe(2);
    await press('One day more in Tokyo');
    expect(notified('warning')).toBe(2);
    expect(Haptics.selectionAsync).toHaveBeenCalled();
  });

  it('with Reduce motion on, the flow works the same and still says and taps', async () => {
    mockReduced = true;
    await toDaysStep();
    expect(screen.getByLabelText('Trip name').props.value).toBe('Tokyo trip');
    for (let i = 0; i < 3; i++) await press('One day more in Tokyo');
    expect(screen.getByText('1 day too many')).toBeTruthy();
    expect(notified('warning')).toBe(1);
  });

  it('a warning haptic never throws', () => {
    (Haptics.notificationAsync as jest.Mock).mockImplementationOnce(() => {
      throw new Error('no motor');
    });
    expect(() => haptic('warning')).not.toThrow();
  });
});
