import { searchCountries, type CountryInfo } from '@travelog/globe';
import { useState } from 'react';
import { View } from 'react-native';

import { ResultRow } from '@/components/create-trip/parts';
import type { IconName } from '@/ui/icon';
import { Body, Card, Empty, Field, Strong, WithIcon } from '@/ui/kit';

const IDEAS = [
  ['beach', 'Goa long weekend', 'Beaches, cafés, a sunset cruise'],
  ['mountain', 'Spiti road trip', '8 days via Kinnaur'],
  ['flower', 'Japan in Sakura season', 'Tokyo → Kyoto → Osaka, 10 days'],
] as const satisfies readonly (readonly [IconName, string, string])[];

/**
 * Explore with no country picked (Plan 73): a country search, so a country's page can be
 * reached without tapping the globe, then the general content.
 */
export function ExploreGeneral({
  onPickCountry,
  onSearching,
}: {
  onPickCountry: (country: CountryInfo) => void;
  /** The search field has focus: a drawer makes room above the keyboard. */
  onSearching?: (searching: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim();
  const countries = q ? searchCountries(q, 8) : [];
  return (
    <View style={{ gap: 12 }}>
      <Field
        label="Search a country"
        value={query}
        onChangeText={setQuery}
        placeholder="Japan, Italy, Kenya…"
        autoCorrect={false}
        returnKeyType="search"
        onFocus={() => onSearching?.(true)}
        onBlur={() => onSearching?.(false)}
      />
      {q ? (
        <View>
          {countries.map((c) => (
            <ResultRow
              key={c.iso}
              title={c.name}
              tag="Country"
              flag={c.flag}
              accessibilityLabel={c.name}
              onPress={() => {
                setQuery('');
                onPickCountry(c);
              }}
            />
          ))}
          {!countries.length ? <Body muted>No country matches “{q}”.</Body> : null}
        </View>
      ) : (
        <>
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
        </>
      )}
    </View>
  );
}
