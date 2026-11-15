import { render } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import { redirectSystemPath } from '@/app/+native-intent';
import { loadShareIntent, makeShareIntentHandler, sharedText } from '@/lib/share-intent';

/** Plan 60: shares from other apps open Save from a link; without the native part, nothing. */
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
}));

beforeEach(() => mockPush.mockClear());

it('without the native part (Expo Go, older builds) it does nothing', async () => {
  expect(loadShareIntent()).toBeNull();
  const Handler = makeShareIntentHandler(null);
  const view = await render(<Handler />);
  expect(view.toJSON()).toBeNull();
});

it('a shared link opens Save from a link with it, then clears the share; the hook runs on every render', async () => {
  const reset = jest.fn();
  let intent = { hasShareIntent: false, shareIntent: {} as Record<string, unknown> };
  const calls = jest.fn();
  // A real hook inside, like the package's: hook order must hold across renders.
  const useIntent = (() => {
    calls();
    useState(0);
    return { ...intent, resetShareIntent: reset };
  }) as never;
  const Handler = makeShareIntentHandler(useIntent);
  function Host() {
    const [n, setN] = useState(0);
    return (
      <>
        <Handler />
        <Pressable accessibilityRole="button" onPress={() => setN(n + 1)}>
          <Text>{`again ${n}`}</Text>
        </Pressable>
      </>
    );
  }
  await render(<Host />);
  await fireEvent.press(screen.getByRole('button'));
  expect(mockPush).not.toHaveBeenCalled();
  intent = {
    hasShareIntent: true,
    shareIntent: { type: 'weburl', webUrl: 'https://youtu.be/abc', text: 'Goa cafés' },
  };
  await fireEvent.press(screen.getByRole('button'));
  expect(calls.mock.calls.length).toBeGreaterThanOrEqual(3);
  expect(mockPush).toHaveBeenCalledWith(
    `/save-link?text=${encodeURIComponent('https://youtu.be/abc\nGoa cafés')}`,
  );
  expect(reset).toHaveBeenCalled();
});

it('shared text that already has the link is passed as it is', () => {
  expect(sharedText({ text: 'See https://x.y/z', webUrl: 'https://x.y/z' })).toBe(
    'See https://x.y/z',
  );
  expect(sharedText({ text: null, webUrl: null })).toBe('');
});

it("the share extension's link goes home instead of Not found", () => {
  expect(redirectSystemPath({ path: 'travelog://dataUrl=travelogShareKey', initial: true })).toBe(
    '/',
  );
  expect(redirectSystemPath({ path: '/trip/1', initial: false })).toBe('/trip/1');
});
