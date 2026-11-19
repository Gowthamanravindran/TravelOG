import type { City } from '@travelog/globe';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useReducer } from 'react';
import { State } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { StepCities } from '@/components/create-trip/step-cities';
import { StepDays } from '@/components/create-trip/step-days';
import { draftReducer, emptyDraft, type DraftState } from '@/lib/trip-draft-state';
import { REORDER_ROW } from '@/ui/reorder-list';
import { makeDb, withData } from '@/testing/test-utils';

// Picking stops and splitting days: the stops can be put in a new order by dragging them by
// their handle, or with a screen reader's Move up / Move down (Plan 86).

const tokyo: City = { id: '1850147', name: 'Tokyo', countryCode: 'JP', lat: 35.69, lng: 139.69 };
const kyoto: City = { id: '1857910', name: 'Kyoto', countryCode: 'JP', lat: 35.02, lng: 135.75 };
const osaka: City = { id: '1853909', name: 'Osaka', countryCode: 'JP', lat: 34.69, lng: 135.5 };

const start = (step: DraftState['step']): DraftState => ({
  ...emptyDraft,
  step,
  countries: ['JP'],
  cities: [tokyo, kyoto, osaka],
  startDate: '2026-12-12',
  endDate: '2026-12-18',
  days: { [tokyo.id]: 2, [kyoto.id]: 3, [osaka.id]: 1 },
});

let order: () => string[] = () => [];
function Host({ step }: { step: DraftState['step'] }) {
  const [draft, dispatch] = useReducer(draftReducer, start(step));
  order = () => draft.cities.map((c) => c.name);
  return step === 'cities' ? (
    <StepCities
      draft={draft}
      dispatch={dispatch}
      onPickCity={() => {}}
      onShowCountry={() => {}}
      onSearching={() => {}}
    />
  ) : (
    <StepDays draft={draft} dispatch={dispatch} />
  );
}

const drag = (name: string, dy: number) =>
  act(async () =>
    fireGestureHandler(getByGestureTestId(`reorder-${name}`), [
      { state: State.BEGAN, translationY: 0 },
      { state: State.ACTIVE, translationY: 0 },
      { translationY: dy / 2 },
      { translationY: dy },
      { state: State.END, translationY: dy },
    ]),
  );

describe.each(['cities', 'days'] as const)('the stops on the %s step', (step) => {
  it('are a numbered list in visit order, each with a handle to drag it by', async () => {
    await render(withData(makeDb(), <Host step={step} />));
    for (const name of ['Tokyo', 'Kyoto', 'Osaka'])
      expect(screen.getByLabelText(`Drag to reorder ${name}`)).toBeTruthy();
    expect(order()).toEqual(['Tokyo', 'Kyoto', 'Osaka']);
  });

  it('dragging a stop down two rows puts it there', async () => {
    await render(withData(makeDb(), <Host step={step} />));
    await drag('Tokyo', REORDER_ROW * 2 + 6);
    expect(order()).toEqual(['Kyoto', 'Osaka', 'Tokyo']);
  });

  it('dragging up one row, and a short drag changes nothing', async () => {
    await render(withData(makeDb(), <Host step={step} />));
    await drag('Osaka', -REORDER_ROW);
    expect(order()).toEqual(['Tokyo', 'Osaka', 'Kyoto']);
    await drag('Tokyo', REORDER_ROW * 0.3);
    expect(order()).toEqual(['Tokyo', 'Osaka', 'Kyoto']);
  });

  it('dragging past the end stops at the end', async () => {
    await render(withData(makeDb(), <Host step={step} />));
    await drag('Kyoto', REORDER_ROW * 9);
    expect(order()).toEqual(['Tokyo', 'Osaka', 'Kyoto']);
  });

  it('a screen reader can move a stop up and down', async () => {
    await render(withData(makeDb(), <Host step={step} />));
    const row = screen.getByLabelText(new RegExp(`^Stop 1, Tokyo`));
    expect(row.props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual([
      'moveDown',
    ]);
    await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'moveDown' } });
    expect(order()).toEqual(['Kyoto', 'Tokyo', 'Osaka']);
    const moved = screen.getByLabelText(new RegExp(`^Stop 2, Tokyo`));
    expect(moved.props.accessibilityActions.map((a: { name: string }) => a.name)).toEqual([
      'moveUp',
      'moveDown',
    ]);
  });
});

describe('the cities step list', () => {
  it('still removes a stop', async () => {
    await render(withData(makeDb(), <Host step="cities" />));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove Kyoto' }));
    expect(order()).toEqual(['Tokyo', 'Osaka']);
  });
});

describe('the days step list', () => {
  it('a stop keeps its days when it is dragged', async () => {
    await render(withData(makeDb(), <Host step="days" />));
    await drag('Kyoto', -REORDER_ROW);
    expect(screen.getByLabelText('3 days in Kyoto')).toBeTruthy();
    expect(order()).toEqual(['Kyoto', 'Tokyo', 'Osaka']);
  });
});
