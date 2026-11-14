import type { LatLng } from '@travelog/core';
import { type } from '@travelog/ui';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ITEM_LABELS } from '@/lib/labels';
import { openPlaceInMaps } from '@/lib/maps';
import { useStopSearch, type StopPlace } from '@/lib/stop-search';

import { Icon } from './icon';
import { Body, Field } from './kit';
import { Appear } from './motion';
import { useTheme } from './theme';

/** What the stop's place is: a picked map place (with coordinates) or a name as typed. */
export interface StopPlaceValue {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  poiId: string | null;
}

export const NO_PLACE: StopPlaceValue = {
  name: '',
  address: null,
  lat: null,
  lng: null,
  poiId: null,
};

/**
 * Plan 57: where a stop is. Search cafés, sights and shops near the trip; offline, or when
 * nothing matches, the name as typed is kept (no map spot). A picked place shows its address
 * and opens in the phone's maps app.
 */
export function StopPlaceField({
  tripId,
  near,
  value,
  onChange,
  onPick,
}: {
  tripId: string;
  near: LatLng | null;
  value: StopPlaceValue;
  onChange: (value: StopPlaceValue) => void;
  /** Called with a picked map place (to fill the stop's name and kind). */
  onPick?: (place: StopPlace) => void;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const { places, searching, attribution, online } = useStopSearch(
    tripId,
    open ? value.name : '',
    near,
  );
  const typed = value.name.trim();
  const picked = value.lat != null && value.lng != null;

  if (picked && !open) {
    return (
      <View style={{ gap: 6 }}>
        <Text
          style={[type.caption, { color: t.ink2, textTransform: 'uppercase', letterSpacing: 0.6 }]}
        >
          Place
        </Text>
        <View
          testID="stop-place"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 12,
            borderRadius: 16,
            backgroundColor: t.surface2,
          }}
        >
          <Icon name="place" size={20} color={t.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[type.headline, { color: t.ink }]} numberOfLines={1}>
              {value.name}
            </Text>
            {value.address ? (
              <Text style={[type.caption, { color: t.ink2 }]} numberOfLines={2}>
                {value.address}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${value.name} in maps`}
            hitSlop={8}
            onPress={() => openPlaceInMaps(value)}
          >
            <Icon name="route" size={20} color={t.ink2} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change place"
            hitSlop={8}
            onPress={() => {
              onChange({ ...NO_PLACE, name: value.name });
              setOpen(true);
            }}
          >
            <Icon name="edit" size={20} color={t.ink2} />
          </Pressable>
        </View>
      </View>
    );
  }

  const showList = open && typed.length >= 2;
  return (
    <View style={{ gap: 8 }}>
      <Field
        label="Place"
        value={value.name}
        onChangeText={(name) => {
          setOpen(true);
          onChange({ ...NO_PLACE, name });
        }}
        placeholder="Search a café, sight or shop"
        hint={
          showList
            ? undefined
            : online
              ? 'Shows how far it is from your other stops'
              : 'Type a name; searching places needs our server'
        }
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
          {places.map((p, i) => (
            <Appear key={p.id ?? `${p.lat},${p.lng}`} index={i}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${p.name}${p.address ? `, ${p.address}` : ''}`}
                onPress={() => {
                  setOpen(false);
                  onChange({
                    name: p.name,
                    address: p.address,
                    lat: p.lat,
                    lng: p.lng,
                    poiId: p.id,
                  });
                  onPick?.(p);
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
                <Icon name={ITEM_LABELS[p.kind].icon} size={20} color={t.ink2} />
                <View style={{ flex: 1 }}>
                  <Text style={[type.headline, { color: t.ink }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {p.address ? (
                    <Text style={[type.caption, { color: t.ink2 }]} numberOfLines={1}>
                      {p.address}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            </Appear>
          ))}
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
            <View style={{ flex: 1 }}>
              <Text style={[type.label, { color: t.ink }]} numberOfLines={1}>
                Use “{typed}” as typed
              </Text>
              <Text style={[type.caption, { color: t.ink2 }]}>No map spot, so no travel times</Text>
            </View>
          </Pressable>
          {searching || attribution ? (
            <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
              <Body muted small>
                {searching ? 'Searching places…' : 'Place data © OpenStreetMap contributors'}
              </Body>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
