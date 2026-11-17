import type { Place } from '@travelog/core';
import { saveLocalProfile } from '@travelog/db';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useReducer } from 'react';

import { StepCities } from '@/components/create-trip/step-cities';
import { draftReducer, emptyDraft } from '@/lib/trip-draft-state';
import { makeDb, withData } from '@/testing/test-utils';

const hampi: Place = {
  id: 'osm:n245612345',
  kind: 'city',
  name: 'Hampi',
  countryCode: 'IN',
  countryName: 'India',
  region: 'Karnataka',
  continent: 'Asia',
  lat: 15.335,
  lng: 76.46,
  timeZone: 'Asia/Kolkata',
  currency: 'INR',
  population: 2800,
  boost: 0,
  aliases: [],
  source: 'osm',
};
jest.mock('@/lib/places', () => ({
  usePlaceSearch: (query: string) =>
    query
      ? { places: [hampi], searching: false, attribution: '© OpenStreetMap contributors' }
      : { places: [], searching: false, attribution: null },
}));
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));

function Harness() {
  const [draft, dispatch] = useReducer(draftReducer, { ...emptyDraft, step: 'cities' });
  return (
    <StepCities
      draft={draft}
      dispatch={dispatch}
      onPickCity={() => {}}
      onShowCountry={() => {}}
      onSearching={() => {}}
    />
  );
}

describe('finding a small town that is not in the bundled list (Plan 67)', () => {
  it('shows it from the app’s own search, with the data’s credit, and adds it as a stop', async () => {
    const db = makeDb();
    saveLocalProfile(db, { displayName: 'Gowtham', homeCurrency: 'INR', upiId: null });
    await render(withData(db, <Harness />));
    await fireEvent.changeText(screen.getByLabelText('Search a city'), 'hampi');
    expect(screen.getByText('© OpenStreetMap contributors')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add Hampi, India' }));
    expect(screen.getByRole('button', { name: 'Remove Hampi' })).toBeTruthy();
  });
});
