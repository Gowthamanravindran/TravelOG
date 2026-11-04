import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorScreen } from '@/components/error-screen';

it('explains the error and retries', async () => {
  const retry = jest.fn(async () => {});
  await render(<ErrorScreen error={new Error('boom')} retry={retry} />);
  expect(screen.getByText('Something went wrong')).toBeTruthy();
  expect(screen.getByText('boom')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  expect(retry).toHaveBeenCalled();
});
