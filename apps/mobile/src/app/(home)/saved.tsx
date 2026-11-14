import {
  addSavedToTrip,
  deleteSaved,
  listSaved,
  listTrips,
  myMember,
  type ItemType,
  type SavedPlace,
} from '@travelog/db';
import { type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { IDEAS_DAY } from '@/components/itinerary-view';
import { useMutate, useQuery } from '@/data/provider';
import { ITEM_LABELS } from '@/lib/labels';
import { openPlaceInMaps } from '@/lib/maps';
import { groupSaved, matchesSaved, SOURCE_LABELS } from '@/lib/saved';
import { ChoiceSheet, type Choice } from '@/ui/choice-sheet';
import { Icon } from '@/ui/icon';
import {
  Between,
  Body,
  Button,
  Card,
  Chip,
  ChipRow,
  Empty,
  Field,
  H1,
  H2,
  IconTile,
  Screen,
  Strong,
} from '@/ui/kit';
import { Appear } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

const KINDS: { kind: ItemType | 'all'; label: string }[] = [
  { kind: 'all', label: 'All' },
  { kind: 'food', label: 'Food' },
  { kind: 'place', label: 'Places' },
  { kind: 'activity', label: 'Activities' },
  { kind: 'stay', label: 'Stays' },
];

/**
 * Plan 58: places you want to go, kept across trips, grouped by country and area. Each can go
 * into a trip's Ideas; a trip to the same place offers them on its Ideas day too.
 */
export default function SavedScreen() {
  const router = useRouter();
  const mutate = useMutate();
  const saved = useQuery((db) => listSaved(db));
  const trips = useQuery((db) =>
    listTrips(db).filter((t) => t.state !== 'completed' && t.state !== 'archived'),
  );
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<ItemType | 'all'>('all');
  const [adding, setAdding] = useState<SavedPlace | null>(null);
  const [acting, setActing] = useState<SavedPlace | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const shown = saved.filter((p) => (kind === 'all' || p.type === kind) && matchesSaved(p, query));
  const groups = useQuery((db) => groupSaved(db, shown), [shown.map((p) => p.id).join()]);

  const addTo = (place: SavedPlace, tripId: string, title: string) => {
    const n = mutate((db) =>
      addSavedToTrip(db, [place.id], tripId, IDEAS_DAY, myMember(db, tripId)?.id),
    );
    setAdding(null);
    setDone(n ? `${place.title} is in ${title}'s ideas` : `${place.title} is already in ${title}`);
  };

  const tripChoices: Choice[] = adding
    ? trips.map((t) => ({
        icon: 'trips',
        label: t.title,
        body: t.destination ?? 'Added to its Ideas',
        onPress: () => addTo(adding, t.id, t.title),
      }))
    : [];
  const actionChoices: Choice[] = acting
    ? [
        {
          icon: 'add',
          label: 'Add to a trip',
          body: 'Goes into the trip’s Ideas',
          primary: true,
          onPress: () => {
            setAdding(acting);
            setActing(null);
          },
        },
        ...(acting.lat != null || acting.address
          ? [
              {
                icon: 'route' as const,
                label: 'Open in maps',
                body: acting.address ?? acting.title,
                onPress: () => {
                  openPlaceInMaps({ name: acting.title, lat: acting.lat, lng: acting.lng });
                  setActing(null);
                },
              },
            ]
          : []),
        {
          icon: 'delete',
          label: 'Remove from Saved',
          body: 'Stops already on trips stay',
          onPress: () => {
            mutate((db) => deleteSaved(db, acting.id));
            setActing(null);
          },
        },
      ]
    : [];

  return (
    <Screen>
      <Between>
        <H1>Saved</H1>
        <Button label="Add" icon="add" small onPress={() => router.push('/saved-place')} />
      </Between>
      {saved.length === 0 ? (
        <Empty
          icon="saved"
          art="globe"
          artFamily="sea"
          title="Places you want to go"
          body="Save cafés, sights and stays here, from your trips or by searching. When you plan a trip there, they’re waiting in its Ideas."
          action={<Button label="Save a place" onPress={() => router.push('/saved-place')} />}
        />
      ) : (
        <>
          <Field
            label="Search saved"
            value={query}
            onChangeText={setQuery}
            placeholder="Name or area"
          />
          <ChipRow>
            {KINDS.filter((k) => k.kind === 'all' || saved.some((p) => p.type === k.kind)).map(
              (k) => (
                <Chip
                  key={k.kind}
                  label={`${k.label} ${k.kind === 'all' ? saved.length : saved.filter((p) => p.type === k.kind).length}`}
                  selected={kind === k.kind}
                  onPress={() => setKind(k.kind)}
                />
              ),
            )}
          </ChipRow>
          {done ? (
            <Card style={{ padding: 10 }}>
              <Between>
                <Body small>{done}</Body>
                <Button label="OK" variant="link" onPress={() => setDone(null)} />
              </Between>
            </Card>
          ) : null}
          {groups.length === 0 ? <Body muted>Nothing matches.</Body> : null}
          {groups.map((g) => (
            <View key={g.country} style={{ gap: 10 }}>
              <H2
                right={
                  <Body muted small>{`${g.count} ${g.count === 1 ? 'place' : 'places'}`}</Body>
                }
              >
                {g.country}
              </H2>
              {g.areas.map((a) => (
                <View key={a.area} style={{ gap: 8 }}>
                  <Body muted small>
                    {a.area}
                  </Body>
                  {a.places.map((p, i) => (
                    <Appear key={p.id} index={i}>
                      <SavedRow
                        place={p}
                        onPress={() => setActing(p)}
                        onAdd={trips.length ? () => setAdding(p) : undefined}
                      />
                    </Appear>
                  ))}
                </View>
              ))}
            </View>
          ))}
        </>
      )}
      <ChoiceSheet
        visible={!!acting}
        title={acting?.title ?? ''}
        choices={actionChoices}
        onClose={() => setActing(null)}
      />
      <ChoiceSheet
        visible={!!adding}
        title={`Add ${adding?.title ?? ''} to`}
        choices={tripChoices}
        onClose={() => setAdding(null)}
      />
    </Screen>
  );
}

function SavedRow({
  place,
  onPress,
  onAdd,
}: {
  place: SavedPlace;
  onPress: () => void;
  onAdd?: () => void;
}) {
  const t = useTheme();
  const label = ITEM_LABELS[place.type];
  return (
    <Card onPress={onPress} accessibilityLabel={place.title} style={{ padding: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <IconTile icon={label.icon} family={label.family} />
        <View style={{ flex: 1 }}>
          <Strong>{place.title}</Strong>
          <Text style={[type.caption, { color: t.ink2 }]} numberOfLines={1}>
            {[place.address ?? place.area, SOURCE_LABELS[place.source]].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {onAdd ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${place.title} to a trip`}
            hitSlop={8}
            onPress={onAdd}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: t.accentSoft,
            }}
          >
            <Icon name="add" size={18} color={t.accent} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}
