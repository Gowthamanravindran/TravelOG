import { getLocalProfile, listTrips, type TripWithState } from '@travelog/db';
import { useRouter } from 'expo-router';
import { spacing } from '@travelog/ui';
import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';

import { TripCard } from '@/components/trip-card';
import { mediaUrl } from '@/lib/media';
import { tripCover } from '@/lib/trip-cover';
import { prefetchImages } from '@/ui/remote-image';
import { tripHref } from '@/lib/trip-route';
import { useQuery } from '@/data/provider';
import { Body, Button, Card, Empty, H1, Screen, Segmented, Strong, WithIcon } from '@/ui/kit';
import { Appear } from '@/ui/motion';
import { useTheme } from '@/ui/theme';
import { tripDayNumber } from '@travelog/core';
import { tripIcon } from '@/lib/labels';

type Filter = 'upcoming' | 'planning' | 'past';

const matches: Record<Filter, (t: TripWithState) => boolean> = {
  upcoming: (t) => t.state === 'upcoming' || t.state === 'live',
  planning: (t) => t.state === 'planning',
  past: (t) => t.state === 'completed' || t.state === 'archived',
};

export default function TripsScreen() {
  const router = useRouter();
  const t = useTheme();
  const profile = useQuery((db) => getLocalProfile(db));
  const trips = useQuery((db) => listTrips(db));
  // Start the first trips' cover photos downloading now, so opening a trip shows its
  // header photo at once (Plan 53). Already-cached photos cost nothing.
  const { width } = useWindowDimensions();
  const prefetch = useQuery(
    (db) =>
      trips.slice(0, 6).flatMap((trip) => {
        const photo = tripCover(db, trip);
        return photo ? [mediaUrl(photo.key, width), mediaUrl(photo.key, 76)] : [];
      }),
    [trips, width],
  );
  useEffect(() => {
    prefetchImages(prefetch);
  }, [prefetch]);
  const live = trips.find((x) => x.state === 'live');
  const [filter, setFilter] = useState<Filter>(
    trips.some(matches.upcoming) || !trips.length ? 'upcoming' : 'planning',
  );
  const shown = trips.filter(matches[filter]);
  // Straight to the trip's own screen, so no empty page slides in first (Plan 36).
  const open = (trip: TripWithState) => router.push(tripHref(trip));

  return (
    <Screen>
      <View
        style={
          t.band
            ? {
                backgroundColor: t.band,
                marginHorizontal: -spacing.lg,
                marginTop: -spacing.lg,
                padding: spacing.lg,
                borderBottomLeftRadius: 26,
                borderBottomRightRadius: 26,
              }
            : undefined
        }
      >
        <H1 eyebrow={`Hi ${profile?.displayName ?? 'there'}`}>Your trips</H1>
      </View>
      {live ? (
        <Card
          onPress={() => open(live)}
          style={{ backgroundColor: t.accent, borderColor: t.accent }}
        >
          <Body small style={{ color: t.onAccent }}>
            LIVE NOW
            {(() => {
              const d = tripDayNumber(live);
              return d ? ` · Day ${d.day} of ${d.of}` : '';
            })()}
          </Body>
          <WithIcon icon={tripIcon(live.emoji)} color={t.onAccent} size={22}>
            <Strong style={{ color: t.onAccent, fontSize: 20 }}>{live.title}</Strong>
          </WithIcon>
          <Body small style={{ color: t.onAccent }}>
            Open trip mode →
          </Body>
        </Card>
      ) : null}
      {trips.length ? (
        <>
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'planning', label: 'Planning' },
              { value: 'past', label: 'Past' },
            ]}
          />
          {shown.length ? (
            shown.map((trip, i) => (
              <Appear key={trip.id} index={i}>
                <TripCard trip={trip} onPress={() => open(trip)} />
              </Appear>
            ))
          ) : (
            <Body muted>No {filter} trips.</Body>
          )}
        </>
      ) : (
        <Empty
          icon="trips"
          art={['luggage', 'airplane']}
          artFamily="clay"
          title="No trips yet"
          body="Start one, add the people coming, and plan it day by day."
          action={<Button label="Plan a trip" onPress={() => router.push('/new-trip')} />}
        />
      )}
      <Body small muted style={{ color: t.ink2, textAlign: 'center' }}>
        Trips are saved on this phone. Sharing with friends comes with sign-in.
      </Body>
    </Screen>
  );
}
