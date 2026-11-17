import { cityById, countryByIso, type City } from '@travelog/globe';
import { type } from '@travelog/ui';
import { useGlobalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Keyboard, Text, View } from 'react-native';

import { useStage, useStageScene, type GlobeScene } from '@/components/globe-stage';
import { Drawer } from '@/ui/drawer';
import { useKeyboardHidden } from '@/ui/keyboard';
import { Button, H1 } from '@/ui/kit';
import { Swap } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

import { ExploreCountry, exploreCities } from './country';
import { ExploreGeneral } from './general';

/** How much of the stage the drawer takes at rest: with no country, and on a country's page. */
const GENERAL = 0.45;
const COUNTRY = 0.72; // the globe shows in the top 28 % (the owner asked for 25–30 %)

const pin = (c: City) => ({
  id: c.id,
  name: c.name,
  lat: c.lat,
  lng: c.lng,
  countryCode: c.countryCode,
});

/**
 * Explore on the globe stage (Plan 73). With no country it is the plain globe over general
 * content. With one (`/explore?country=<ISO alpha-3>`) the globe turns and zooms to it and the
 * drawer is that country's page. Tapping a country on the globe opens it.
 */
export function ExplorePanel() {
  const t = useTheme();
  const router = useRouter();
  const { globe, height, full } = useStage();
  const { country: param } = useGlobalSearchParams<{ country?: string }>();
  // A link can repeat the key, which arrives as a list: that is no country.
  const country = typeof param === 'string' ? countryByIso(param.toUpperCase()) : undefined;
  const iso = country?.iso;

  const [raised, setRaised] = useState(false);
  const [searching, setSearching] = useState(false);
  useKeyboardHidden(useCallback(() => setSearching(false), []));
  const heights = [Math.round(height * (country ? COUNTRY : GENERAL)), full];
  const index = raised || searching ? 1 : 0;

  // A newly opened country starts with its page lowered, and is said aloud. The globe follows
  // through the scene's `focus` (Plan 75): it turns to the country, and pulls back when the
  // page is left, whether for all of Explore or for another tab.
  useEffect(() => {
    if (!iso) return;
    setRaised(false);
    setSearching(false);
    AccessibilityInfo.announceForAccessibility(`Exploring ${country?.name ?? ''}`);
    // Only a change of country.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso]);

  const open = (to: string) => router.setParams({ country: to });
  const flyTo = (city: City) => {
    Keyboard.dismiss();
    setRaised(false);
    setSearching(false);
    globe.current?.flyTo(city.lng, city.lat, 5);
  };
  const scene: GlobeScene = {
    tapMode: 'report',
    focus: iso,
    spin: !country && index === 0,
    covered: heights[0]!,
    candidates: country ? exploreCities(country).map(pin) : [],
    onCountryPress: (c) => open(c.iso),
    onCandidatePress: (p) => {
      const city = cityById(p.id);
      if (city) flyTo(city);
    },
  };
  useStageScene('explore', scene);

  return (
    <Drawer
      heights={heights}
      index={index}
      onIndexChange={(i) => setRaised(i > 0)}
      label={country ? `${country.name} page` : 'Explore'}
      padBottom={false}
      scroll="always"
      header={
        country ? (
          <View style={{ gap: 4 }}>
            <View style={{ alignSelf: 'flex-start' }}>
              <Button
                label="All of Explore"
                icon="back"
                variant="link"
                onPress={() => router.setParams({ country: undefined })}
              />
            </View>
            <Text accessibilityRole="header" style={[type.display, { color: t.ink }]}>
              {`Exploring ${country.name}`}
            </Text>
          </View>
        ) : (
          <H1>Explore</H1>
        )
      }
    >
      <Swap id={iso ?? 'general'}>
        {country ? (
          <ExploreCountry country={country} onCity={flyTo} onSearching={setSearching} />
        ) : (
          <ExploreGeneral onPickCountry={(c) => open(c.iso)} onSearching={setSearching} />
        )}
      </Swap>
    </Drawer>
  );
}
