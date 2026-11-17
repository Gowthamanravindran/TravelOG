import { countryByCode, searchCountries, type CountryInfo } from '@travelog/globe';
import { spacing } from '@travelog/ui';
import { useState } from 'react';
import { View } from 'react-native';

import { Chips, PickChip, ResultRow } from '@/components/create-trip/parts';
import { useMutate, useQuery } from '@/data/provider';
import { addVisited, readVisited, removeVisited } from '@/lib/visited';
import { Body, Button, Chip, Expander, Field } from '@/ui/kit';

/** How many countries show before the section is opened (the owner's call, Plan 74). */
const SHOWN = 3;

/** The countries marked as visited, as they are drawn: alpha-2 codes the globe knows. */
export function useVisited(): CountryInfo[] {
  const codes = useQuery((db) => readVisited(db));
  return codes.map((c) => countryByCode(c)).filter((c): c is CountryInfo => !!c);
}

/**
 * Profile → Countries you've visited (Plan 74). Closed it shows three and the total; open it
 * lists them all, each removable, with a search to add more. On the globe a tap marks or
 * unmarks a country too (the panel does that).
 */
export function Visited({
  globe,
  onSearching,
}: {
  /** The globe is on screen, so the hints can point at it. */
  globe: boolean;
  onSearching?: (searching: boolean) => void;
}) {
  const mutate = useMutate();
  const visited = useVisited();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const q = query.trim();
  const found = q ? searchCountries(q, 6).filter((c) => c.countryCode) : [];
  const has = (c: CountryInfo) => visited.some((v) => v.iso === c.iso);

  return (
    <View style={{ gap: spacing.sm }}>
      <Expander
        title="Countries you’ve visited"
        badge={String(visited.length)}
        open={open}
        onToggle={() => setOpen(!open)}
      >
        {open ? (
          <View style={{ gap: spacing.sm }}>
            <Field
              label="Add a country you’ve visited"
              value={query}
              onChangeText={setQuery}
              placeholder="Search a country"
              autoCorrect={false}
              returnKeyType="search"
              onFocus={() => onSearching?.(true)}
              onBlur={() => onSearching?.(false)}
            />
            {q ? (
              <View>
                {found.map((c) => (
                  <ResultRow
                    key={c.iso}
                    title={c.name}
                    tag={has(c) ? 'Visited' : 'Add'}
                    flag={c.flag}
                    accessibilityLabel={has(c) ? `${c.name}, visited` : `Add ${c.name}`}
                    onPress={() => {
                      if (!has(c)) mutate((db) => addVisited(db, c.countryCode!));
                      setQuery('');
                    }}
                  />
                ))}
                {!found.length ? <Body muted>No country matches “{q}”.</Body> : null}
              </View>
            ) : null}
            <Chips>
              {visited.map((c) => (
                <PickChip
                  key={c.iso}
                  label={c.name}
                  flag={c.flag}
                  onRemove={() => mutate((db) => removeVisited(db, c.countryCode!))}
                />
              ))}
            </Chips>
            <Body muted small>
              {globe
                ? 'Tap a country on the globe to mark it, or tap it again to unmark it.'
                : 'Search to add a country; tap one to remove it.'}
            </Body>
          </View>
        ) : null}
      </Expander>
      {open ? null : <Preview globe={globe} onMore={() => setOpen(true)} />}
    </View>
  );
}

/** The closed view: the first three countries, and a way to the rest. */
function Preview({ globe, onMore }: { globe: boolean; onMore: () => void }) {
  const visited = useVisited();
  if (!visited.length) {
    return (
      <Body muted small>
        {globe ? 'Tap a country on the globe to mark it.' : 'Open the section to add one.'}
      </Body>
    );
  }
  return (
    <Chips>
      {visited.slice(0, SHOWN).map((c) => (
        <Chip key={c.iso} label={c.name} />
      ))}
      {visited.length > SHOWN ? (
        <Button label={`+${visited.length - SHOWN} more`} variant="link" small onPress={onMore} />
      ) : null}
    </Chips>
  );
}
