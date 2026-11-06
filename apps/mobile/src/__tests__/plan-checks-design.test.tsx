import type { Where } from '@/lib/where';
import { PlanChecks } from '@/components/plan-checks';
import { makeDb, withData } from '@/testing/test-utils';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), navigate: jest.fn() }),
}));

const where: Where = {
  w: { nights: [], days: [], journeys: [] },
  route: [],
  places: new Map([
    ['goa', { id: 'goa', name: 'Panaji', kind: 'city', timeZone: 'Asia/Kolkata' }],
    ['gok', { id: 'gok', name: 'Gokarna', kind: 'city', timeZone: 'Asia/Kolkata' }],
  ]),
  stopIds: new Set(),
  checks: [
    { key: 'a', kind: 'noStay', startDate: '2026-07-14', endDate: '2026-07-16', placeId: 'goa' },
    {
      key: 'b',
      kind: 'arrivalMismatch',
      bookingId: 'b1',
      date: '2026-07-12',
      arrivePlaceId: 'goa',
      stayPlaceId: 'gok',
    },
    { key: 'c', kind: 'doubleStay', date: '2026-07-12', sourceIds: ['s1', 's2'] },
  ],
};

describe('Check your plan, designed (Plan 37)', () => {
  it('actions are outlined pills, never bare links, and each question has a title', async () => {
    await render(withData(makeDb(), <PlanChecks tripId="t" where={where} />, 'plan'));
    expect(screen.getByText('Check your plan · 3 questions')).toBeTruthy();
    expect(screen.getByText('Landing in Panaji, sleeping in Gokarna')).toBeTruthy();
    expect(screen.getByText('Two stays on 12 Jul')).toBeTruthy();
    for (const name of ['Add stay', "I'm sorted", "That's right", 'Open booking', 'Open first']) {
      const style = StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
      // Small pills: 36 pt tall with an outline (links have neither).
      expect([name, style.minHeight, style.borderWidth]).toEqual([name, 36, 1]);
    }
  });

  it('Dismiss is a ✕ with a 44 pt tap area, apart from the actions', async () => {
    await render(withData(makeDb(), <PlanChecks tripId="t" where={where} />, 'plan'));
    const dismiss = screen.getAllByRole('button', { name: 'Dismiss' });
    // Not on "landing elsewhere": "That's right" answers it.
    expect(dismiss).toHaveLength(2);
    for (const d of dismiss) {
      const style = StyleSheet.flatten(d.props.style);
      expect(style.width + 2 * d.props.hitSlop).toBeGreaterThanOrEqual(44);
    }
  });
});
