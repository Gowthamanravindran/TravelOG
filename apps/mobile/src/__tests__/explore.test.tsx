import { fireEvent, render, screen } from '@testing-library/react-native';

import ExploreScreen from '@/app/(home)/explore';
import { makeDb, withData } from '@/testing/test-utils';

let mockParams: Record<string, string | undefined> = {};
const mockSetParams = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), navigate: jest.fn(), setParams: mockSetParams }),
  useLocalSearchParams: () => mockParams,
  useGlobalSearchParams: () => mockParams,
}));
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));

beforeEach(() => {
  mockParams = {};
  mockSetParams.mockClear();
});

describe('Explore (Plan 70)', () => {
  it('on its own it is the Explore page as before', async () => {
    await render(withData(makeDb(), <ExploreScreen />));
    expect(screen.getByText('Explore')).toBeTruthy();
    expect(screen.getByText('Ready-made trips are on the way')).toBeTruthy();
  });

  it('for a country tapped on the globe it is "Exploring {Country}", with sample trips and its cities', async () => {
    mockParams = { country: 'JPN' };
    await render(withData(makeDb(), <ExploreScreen />));
    expect(screen.getByText('Exploring Japan')).toBeTruthy();
    expect(screen.getByText('Curated trips')).toBeTruthy();
    // Placeholders until the real content is decided, and they say so.
    expect(screen.getAllByText(/Sample · coming soon/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Cities')).toBeTruthy();
    for (const city of ['Tokyo', 'Osaka', 'Sapporo']) expect(screen.getByText(city)).toBeTruthy();
    expect(screen.queryByText('Ready-made trips are on the way')).toBeNull();
  });

  it('goes back to all of Explore', async () => {
    mockParams = { country: 'JPN' };
    await render(withData(makeDb(), <ExploreScreen />));
    await fireEvent.press(screen.getByRole('button', { name: 'All of Explore' }));
    expect(mockSetParams).toHaveBeenCalledWith({ country: undefined });
  });

  it('a place with no cities listed still gets its page', async () => {
    mockParams = { country: 'ATA' }; // Antarctica
    await render(withData(makeDb(), <ExploreScreen />));
    expect(screen.getByText('Exploring Antarctica')).toBeTruthy();
    expect(screen.getByText('No cities listed here yet.')).toBeTruthy();
  });

  it('an unknown country code falls back to Explore', async () => {
    mockParams = { country: 'ZZZ' };
    await render(withData(makeDb(), <ExploreScreen />));
    expect(screen.getByText('Explore')).toBeTruthy();
  });
});
