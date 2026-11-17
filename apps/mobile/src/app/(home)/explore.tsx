import { countryByIso } from '@travelog/globe';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ExploreCountry } from '@/components/explore/country';
import { ExploreGeneral } from '@/components/explore/general';
import { hasGlobe } from '@/lib/runtime';
import { Button, H1, Screen } from '@/ui/kit';

/**
 * Explore. With the globe, the tabs layout draws it on the shared globe stage (Plans 72, 73)
 * and this route draws nothing. Where the globe cannot run it is a plain page with the same
 * content: `?country=<ISO alpha-3>` is a country's page, otherwise the general one.
 */
export default function ExploreScreen() {
  const router = useRouter();
  const { country: param } = useLocalSearchParams<{ country?: string }>();
  if (hasGlobe()) return null;
  const country = param ? countryByIso(param.toUpperCase()) : undefined;
  if (!country) {
    return (
      <Screen>
        <H1>Explore</H1>
        <ExploreGeneral onPickCountry={(c) => router.setParams({ country: c.iso })} />
      </Screen>
    );
  }
  return (
    <Screen>
      <Button
        label="All of Explore"
        icon="back"
        variant="link"
        onPress={() => router.setParams({ country: undefined })}
      />
      <H1>{`Exploring ${country.name}`}</H1>
      {/* There is no globe to fly on here, so picking a city does nothing yet. */}
      <ExploreCountry country={country} onCity={() => {}} />
    </Screen>
  );
}
