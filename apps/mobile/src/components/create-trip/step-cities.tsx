import type { Place } from '@travelog/core';
import {
  countryByCode,
  countryCodeOnGlobe,
  getFlag,
  searchCities,
  type City,
} from '@travelog/globe';
import { useState, type Dispatch } from 'react';
import { View } from 'react-native';

import { usePlaceSearch } from '@/lib/places';
import type { DraftAction, DraftState } from '@/lib/trip-draft-state';
import { Body, Chip, ChipRow, Field } from '@/ui/kit';

import { Chips, PickChip, ResultRow } from './parts';
import { countryNameOf } from './step-countries';

/**
 * A city from the app's own search, as the flow holds cities. A GeoNames place gets its bare
 * id, so it is the same city as one tapped on the globe; anything else keeps its place id.
 */
function cityFromPlace(p: Place): City | null {
  if (p.kind !== 'city' || p.lat == null || p.lng == null || !p.countryCode) return null;
  return {
    id: p.id.startsWith('gn:') ? p.id.slice(3) : p.id,
    name: p.name,
    countryCode: p.countryCode,
    lat: p.lat,
    lng: p.lng,
  };
}

/**
 * Step 3, "Pick your stops": cities are tapped on the globe in the order they will be
 * visited. Search covers what the globe does not show: the bundled list at once, then the
 * app's own place search for smaller towns.
 */
export function StepCities({
  draft,
  dispatch,
  onPickCity,
  onShowCountry,
  onSearching,
}: {
  draft: DraftState;
  dispatch: Dispatch<DraftAction>;
  onPickCity: (city: City) => void;
  /** Move the globe to one of the picked countries (shown when there are several). */
  onShowCountry: (code: string) => void;
  onSearching: (searching: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim();
  const bundled = q ? searchCities(q, 8) : [];
  const server = usePlaceSearch(q);
  const seen = new Set(bundled.map((c) => c.id));
  const more = q
    ? server.places
        .map(cityFromPlace)
        .filter((c): c is City => !!c && !seen.has(c.id))
        .slice(0, 4)
    : [];
  const results = [...bundled, ...more];

  return (
    <View style={{ gap: 12 }}>
      <Field
        label="Search a city"
        value={query}
        onChangeText={setQuery}
        placeholder="Kyoto, Busan…"
        autoCorrect={false}
        returnKeyType="search"
        onFocus={() => onSearching(true)}
        onBlur={() => onSearching(false)}
      />
      {!q && draft.countries.length > 1 ? (
        <ChipRow>
          {draft.countries.map((code) => (
            <Chip
              key={code}
              label={countryByCode(code)?.name ?? code}
              onPress={() => onShowCountry(code)}
            />
          ))}
        </ChipRow>
      ) : null}
      {q ? (
        <View>
          {results.map((city) => {
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
          {!results.length ? (
            <Body muted>{server.searching ? 'Searching…' : `No city matches “${q}”.`}</Body>
          ) : null}
        </View>
      ) : draft.cities.length ? (
        <Chips>
          {draft.cities.map((city, i) => (
            <PickChip
              key={city.id}
              label={city.name}
              number={i + 1}
              onRemove={() => dispatch({ type: 'toggleCity', city })}
            />
          ))}
        </Chips>
      ) : (
        <Body muted>Tap the cities on the map. Can’t see one? Search for it.</Body>
      )}
    </View>
  );
}
