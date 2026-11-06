import { placeLabel, type Place, type PlaceKind } from '@travelog/core';
import { type } from '@travelog/ui';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { usePlaceSearch } from '@/lib/places';

import { Icon, type IconName } from './icon';
import { Body, Field } from './kit';
import { Appear } from './motion';
import { useTheme } from './theme';

const KIND_ICON: Record<PlaceKind, IconName> = {
  city: 'city',
  region: 'place',
  country: 'flight',
  continent: 'explore',
};

/**
 * Destination with autocomplete (Plan 29): cities, regions, countries and
 * continents, shown as "Tokyo · Japan". Typing anything else is fine too: the
 * last row keeps it as typed.
 */
export function PlaceField({
  label,
  value,
  onChangeText,
  onPick,
  homeCountry,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  onPick: (place: Place) => void;
  homeCountry?: string | null;
  placeholder?: string;
  hint?: string;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const { places, searching, attribution } = usePlaceSearch(open ? value : '', homeCountry);
  const typed = value.trim();
  const showList = open && typed.length >= 2;

  return (
    <View style={{ gap: 8 }}>
      <Field
        label={label}
        value={value}
        onChangeText={(text) => {
          setOpen(true);
          onChangeText(text);
        }}
        placeholder={placeholder}
        hint={hint}
        autoCorrect={false}
      />
      {showList ? (
        <View
          accessibilityRole="list"
          style={{
            borderWidth: 1,
            borderColor: t.line,
            borderRadius: 16,
            backgroundColor: t.surface,
            overflow: 'hidden',
          }}
        >
          {places.map((p, i) => {
            const { title, subtitle } = placeLabel(p);
            return (
              <Appear key={p.id} index={i}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${title}, ${subtitle}`}
                  onPress={() => {
                    setOpen(false);
                    onPick(p);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: pressed ? t.surface2 : 'transparent',
                    borderBottomWidth: 1,
                    borderColor: t.line,
                  })}
                >
                  <Icon name={KIND_ICON[p.kind]} size={20} color={t.ink2} />
                  <View style={{ flex: 1 }}>
                    <Text style={[type.headline, { color: t.ink }]} numberOfLines={1}>
                      {title}
                    </Text>
                    <Text style={[type.caption, { color: t.ink2 }]} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  </View>
                </Pressable>
              </Appear>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Use "${typed}" as typed`}
            onPress={() => setOpen(false)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              backgroundColor: pressed ? t.surface2 : 'transparent',
            })}
          >
            <Icon name="edit" size={20} color={t.ink2} />
            <Text style={[type.label, { color: t.ink, flex: 1 }]} numberOfLines={1}>
              Use “{typed}” as typed
            </Text>
          </Pressable>
          {searching || attribution ? (
            <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
              <Body muted small>
                {searching ? 'Searching more places…' : 'Place data © OpenStreetMap contributors'}
              </Body>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
