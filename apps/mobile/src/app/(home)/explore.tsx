import { countryByIso, topCities, type CountryInfo } from '@travelog/globe';
import { useLocalSearchParams, useRouter } from 'expo-router';

import type { IconName } from '@/ui/icon';
import { Body, Button, Card, Empty, H1, H2, Screen, Strong, WithIcon } from '@/ui/kit';

const IDEAS = [
  ['beach', 'Goa long weekend', 'Beaches, cafés, a sunset cruise'],
  ['mountain', 'Spiti road trip', '8 days via Kinnaur'],
  ['flower', 'Japan in Sakura season', 'Tokyo → Kyoto → Osaka, 10 days'],
] as const satisfies readonly (readonly [IconName, string, string])[];

/**
 * Explore. Opened from a country tapped on the home globe (Plan 70) it is that country's page,
 * `?country=<ISO alpha-3>`; on its own it is the general page.
 */
export default function ExploreScreen() {
  const router = useRouter();
  const { country } = useLocalSearchParams<{ country?: string }>();
  const info = country ? countryByIso(country.toUpperCase()) : undefined;
  if (info) {
    return (
      <ExploreCountry country={info} onBack={() => router.setParams({ country: undefined })} />
    );
  }
  return (
    <Screen>
      <H1>Explore</H1>
      <Empty
        icon="explore"
        art="globe"
        artFamily="leaf"
        title="Ready-made trips are on the way"
        body="Templates you can copy into your own trip, and plans from real travellers."
      />
      {IDEAS.map(([icon, title, body]) => (
        <Card key={title}>
          <WithIcon icon={icon}>
            <Strong>{title}</Strong>
          </WithIcon>
          <Body muted small>
            {body} · coming soon
          </Body>
        </Card>
      ))}
    </Screen>
  );
}

/**
 * Placeholder trips for a country until the real content is decided (the owner's call, Plan 70).
 * They are made up from the country's largest cities and are labelled as samples on screen.
 */
function sampleTrips(country: CountryInfo, cities: readonly string[]): [string, string][] {
  const [a, b, c] = cities;
  return [
    ...(a && b && c ? ([[`${a} → ${b} → ${c}`, '7 days']] as [string, string][]) : []),
    ...(a ? ([[`${a} long weekend`, '3 days']] as [string, string][]) : []),
    [`${country.name} highlights`, '10 days'],
    [`A week in ${country.name}`, '7 days'],
  ];
}

function ExploreCountry({ country, onBack }: { country: CountryInfo; onBack: () => void }) {
  const cities = country.countryCode ? topCities(country.countryCode).map((c) => c.name) : [];
  return (
    <Screen>
      <Button label="All of Explore" icon="back" variant="link" onPress={onBack} />
      <H1>{`Exploring ${country.name}`}</H1>

      <H2>Curated trips</H2>
      {sampleTrips(country, cities).map(([title, length]) => (
        <Card key={title}>
          <WithIcon icon="trips">
            <Strong>{title}</Strong>
          </WithIcon>
          <Body muted small>
            {length} · Sample · coming soon
          </Body>
        </Card>
      ))}

      <H2>Cities</H2>
      {cities.length ? (
        <Card>
          {cities.map((name) => (
            <Body key={name}>{name}</Body>
          ))}
        </Card>
      ) : (
        <Body muted>No cities listed here yet.</Body>
      )}
    </Screen>
  );
}
