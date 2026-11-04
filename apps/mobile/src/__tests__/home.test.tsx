import { render, screen } from '@testing-library/react-native';

import HomeScreen from '@/app/index';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

describe('HomeScreen', () => {
  it('shows the trips heading and the shared money helper result', async () => {
    await render(<HomeScreen />);
    expect(await screen.findByText('Your trips')).toBeTruthy();
    expect(screen.getByText(/₹710, ₹710, ₹710, ₹710/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open Plan mode' })).toBeTruthy();
  });
});
