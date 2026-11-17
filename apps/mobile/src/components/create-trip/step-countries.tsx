import {
  countryByCode,
  countryCodeOnGlobe,
  getFlag,
  searchCities,
  searchCountries,
  type City,
  type CountryInfo,
} from '@travelog/globe';
import { useState, type Dispatch } from 'react';
import { View } from 'react-native';

import type { DraftAction, DraftState } from '@/lib/trip-draft-state';
import { Body, Field } from '@/ui/kit';

import { Chips, PickChip, ResultRow } from './parts';

/** The name of the country a city counts under, as the globe names it. */
export const countryNameOf = (city: City) =>
  countryByCode(countryCodeOnGlobe(city.countryCode))?.name ?? city.countryCode;

/**
 * Step 1, "Where to?": pick countries by tapping the globe or by search. Typing a city adds
 * the city and its country in one go.
 */
export function StepCountries({
  draft,
  dispatch,
  onPickCountry,
  onPickCity,
  onSearching,
}: {
  draft: DraftState;
  dispatch: Dispatch<DraftAction>;
  /** A country was added from search: show it on the globe. */
  onPickCountry: (country: CountryInfo) => void;
  onPickCity: (city: City) => void;
  /** The search field has focus: the panel makes room above the keyboard. */
  onSearching: (searching: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim();
  const countries = q ? searchCountries(q).filter((c) => c.countryCode) : [];
  const cities = q ? searchCities(q, 8) : [];

  return (
    <View style={{ gap: 12 }}>
      <Field
        label="Search a country or city"
        value={query}
        onChangeText={setQuery}
        placeholder="Japan, Tokyo…"
        autoCorrect={false}
        returnKeyType="search"
        onFocus={() => onSearching(true)}
        onBlur={() => onSearching(false)}
      />
      {q ? (
        <View>
          {countries.map((c) => {
            const added = draft.countries.includes(c.countryCode!);
            return (
              <ResultRow
                key={c.iso}
                title={c.name}
                tag={added ? 'Added' : 'Country'}
                flag={c.flag}
                accessibilityLabel={added ? `${c.name}, added` : `Add ${c.name}`}
                onPress={() => {
                  setQuery('');
                  if (added) return;
                  dispatch({ type: 'toggleCountry', code: c.countryCode! });
                  onPickCountry(c);
                }}
              />
            );
          })}
          {cities.map((city) => {
            const added = draft.cities.some((c) => c.id === city.id);
            const where = countryNameOf(city);
            return (
              <ResultRow
                key={city.id}
                title={city.name}
                subtitle={[city.region, where].filter(Boolean).join(', ')}
                tag={added ? 'Added' : 'City'}
                flag={getFlag(countryCodeOnGlobe(city.countryCode))}
                accessibilityLabel={added ? `${city.name}, added` : `Add ${city.name}, ${where}`}
                onPress={() => {
                  setQuery('');
                  if (added) return;
                  dispatch({ type: 'addCity', city });
                  onPickCity(city);
                }}
              />
            );
          })}
          {!countries.length && !cities.length ? (
            <Body muted>No country or city matches “{q}”.</Body>
          ) : null}
        </View>
      ) : draft.countries.length ? (
        <Chips>
          {draft.countries.map((code) => {
            const c = countryByCode(code);
            return (
              <PickChip
                key={code}
                label={c?.name ?? code}
                flag={c?.flag}
                onRemove={() => dispatch({ type: 'toggleCountry', code })}
              />
            );
          })}
        </Chips>
      ) : (
        <Body muted>
          Tap a country on the globe, or type one. Typing a city adds it straight away.
        </Body>
      )}
    </View>
  );
}
