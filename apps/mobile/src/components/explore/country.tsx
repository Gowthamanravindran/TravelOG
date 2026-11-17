import { searchCitiesIn, topCities, type City, type CountryInfo } from '@travelog/globe';
import { font, radius, spacing, type } from '@travelog/ui';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ResultRow } from '@/components/create-trip/parts';
import { Body, Button, Field, H2 } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

/** The cities a country's page offers as tiles, and the globe shows as dots. */
export function exploreCities(country: CountryInfo): City[] {
  return country.countryCode ? topCities(country.countryCode) : [];
}

/**
 * Placeholder trips for a country until the real content is decided (the owner's call, Plans
 * 70 and 73). They are made up from the country's largest cities, with no invented people or
 * numbers, and are labelled as samples on screen.
 */
function sampleTrips(country: CountryInfo, cities: readonly City[]) {
  const [a, b, c] = cities.map((x) => x.name);
  return [
    ...(a && b && c
      ? [{ title: `${a} → ${b} → ${c}`, route: 'Three cities', days: '7 days' }]
      : []),
    ...(a ? [{ title: `${a} long weekend`, route: 'One city, no rush', days: '3 days' }] : []),
    { title: `${country.name} highlights`, route: 'A first visit', days: '10 days' },
    { title: `A week in ${country.name}`, route: 'At an easy pace', days: '7 days' },
  ];
}

/**
 * A country's Explore page (Plan 73): a search over its cities, its best-known cities as
 * tiles, and sample curated trips. Picking a city, from a tile or the search, calls `onCity`
 * (on the globe that flies there). The title and the way back are drawn by whoever hosts it.
 */
export function ExploreCountry({
  country,
  onCity,
  onSearching,
}: {
  country: CountryInfo;
  onCity: (city: City) => void;
  onSearching?: (searching: boolean) => void;
}) {
  const t = useTheme();
  const [query, setQuery] = useState('');
  const [sharing, setSharing] = useState(false);
  const cities = exploreCities(country);
  const q = query.trim();
  const found = q && country.countryCode ? searchCitiesIn(country.countryCode, q) : [];

  return (
    <View style={{ gap: spacing.md }}>
      <Field
        label={`Search cities in ${country.name}`}
        value={query}
        onChangeText={setQuery}
        placeholder={`Search cities in ${country.name}`}
        autoCorrect={false}
        returnKeyType="search"
        onFocus={() => onSearching?.(true)}
        onBlur={() => onSearching?.(false)}
      />
      {q ? (
        <View>
          {found.map((city) => (
            <ResultRow
              key={city.id}
              title={city.name}
              subtitle={city.region}
              tag="City"
              accessibilityLabel={city.name}
              onPress={() => {
                setQuery('');
                onCity(city);
              }}
            />
          ))}
          {!found.length ? (
            <Body muted>
              No city in {country.name} matches “{q}”.
            </Body>
          ) : null}
        </View>
      ) : (
        <>
          <H2>Explore by city</H2>
          {cities.length ? (
            <View style={styles.tiles}>
              {cities.map((city) => (
                <Pressable
                  key={city.id}
                  accessibilityRole="button"
                  accessibilityLabel={city.name}
                  onPress={() => onCity(city)}
                  style={[styles.tile, { backgroundColor: t.surface2 }]}
                >
                  <Text
                    style={[type.body, { color: t.ink, ...font('text', 600) }]}
                    numberOfLines={2}
                  >
                    {city.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Body muted>No cities listed here yet.</Body>
          )}

          <H2>Curated trips</H2>
          <Body muted small>
            Itineraries shared by travellers. Samples for now.
          </Body>
          {sampleTrips(country, cities).map((trip) => (
            <View key={trip.title} style={[styles.trip, { borderColor: t.line }]}>
              <View style={[styles.cover, { backgroundColor: t.surface2 }]}>
                <Text
                  style={[
                    type.caption,
                    styles.days,
                    { color: t.onAccent, backgroundColor: t.accent, ...font('text', 600) },
                  ]}
                >
                  {trip.days}
                </Text>
              </View>
              <View style={styles.tripText}>
                <Text style={[type.body, { color: t.ink, ...font('text', 600) }]}>
                  {trip.title}
                </Text>
                <Text style={[type.caption, { color: t.ink2 }]}>{trip.route} · Sample</Text>
              </View>
            </View>
          ))}
          <Button
            label="Share your itinerary"
            variant="secondary"
            onPress={() => setSharing(true)}
          />
          {sharing ? (
            <Body muted small style={{ textAlign: 'center' }}>
              Coming soon
            </Body>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    // Two to a row.
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 84,
    borderRadius: radius.card,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  trip: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' },
  cover: { height: 72, justifyContent: 'flex-end', padding: spacing.sm },
  days: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tripText: { padding: spacing.md, gap: 2 },
});
