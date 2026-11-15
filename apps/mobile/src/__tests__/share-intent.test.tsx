import { render } from '@testing-library/react-native';

/** Plan 60: shares from other apps open Save from a link; without the native part, nothing. */
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
}));
let mockHasNative = false;
jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  requireOptionalNativeModule: (name: string) =>
    name === 'ExpoShareIntentModule' && mockHasNative ? {} : null,
}));
const mockReset = jest.fn();
let mockIntent: { hasShareIntent: boolean; shareIntent: Record<string, unknown> } = {
  hasShareIntent: false,
  shareIntent: {},
};
jest.mock('expo-share-intent', () => ({
  useShareIntent: () => ({ ...mockIntent, resetShareIntent: mockReset }),
}));

import * as shareIntent from '@/lib/share-intent';

const load = () => shareIntent;

beforeEach(() => {
  mockPush.mockClear();
  mockReset.mockClear();
});

it('without the native part (Expo Go, older builds) it does nothing', async () => {
  mockHasNative = false;
  const { ShareIntentHandler, loadShareIntent } = load();
  expect(loadShareIntent()).toBeNull();
  const view = await render(<ShareIntentHandler />);
  expect(view.toJSON()).toBeNull();
  expect(mockPush).not.toHaveBeenCalled();
});

it('a shared link opens Save from a link with it, then clears the share', async () => {
  mockHasNative = true;
  mockIntent = {
    hasShareIntent: true,
    shareIntent: { type: 'weburl', webUrl: 'https://youtu.be/abc', text: 'Goa cafés' },
  };
  const { ShareIntentHandler } = load();
  await render(<ShareIntentHandler />);
  expect(mockPush).toHaveBeenCalledWith(
    `/save-link?text=${encodeURIComponent('https://youtu.be/abc\nGoa cafés')}`,
  );
  expect(mockReset).toHaveBeenCalled();
});

it('shared text that already has the link is passed as it is', () => {
  const { sharedText } = load();
  expect(sharedText({ text: 'See https://x.y/z', webUrl: 'https://x.y/z' })).toBe(
    'See https://x.y/z',
  );
  expect(sharedText({ text: null, webUrl: null })).toBe('');
});

it("the share extension's link goes home instead of Not found", () => {
  const { redirectSystemPath } = require('@/app/+native-intent');
  expect(redirectSystemPath({ path: 'travelog://dataUrl=travelogShareKey', initial: true })).toBe(
    '/',
  );
  expect(redirectSystemPath({ path: '/trip/1', initial: false })).toBe('/trip/1');
});
