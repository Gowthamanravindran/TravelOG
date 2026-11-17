import { tripDayNumber } from '@travelog/core';
import { listTrips, type TripWithState } from '@travelog/db';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { TripCard } from '@/components/trip-card';
import { useQuery } from '@/data/provider';
import { tripIcon } from '@/lib/labels';
import { mediaUrl } from '@/lib/media';
import { tripCover } from '@/lib/trip-cover';
import { tripHref } from '@/lib/trip-route';
import { Body, Button, Card, Empty, Segmented, Strong, WithIcon } from '@/ui/kit';
import { Appear } from '@/ui/motion';
import { prefetchImages } from '@/ui/remote-image';
import { useTheme } from '@/ui/theme';

type Filter = 'upcoming' | 'planning' | 'past';

const matches: Record<Filter, (t: TripWithState) => boolean> = {
  upcoming: (t) => t.state === 'upcoming' || t.state === 'live',
  planning: (t) => t.state === 'planning',
  past: (t) => t.state === 'completed' || t.state === 'archived',
};

/**
 * The trips on the Trips tab: the live trip, the Upcoming / Planning / Past filter, the cards
 * and the empty state. It sits in the screen itself, or in the drawer under the globe (Plan 66).
 */
export function TripsList({ onCreate }: { onCreate: () => void }) {
  const router = useRouter();
  const t = useTheme();
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
    <>
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
          action={<Button label="Plan a trip" onPress={onCreate} />}
        />
      )}
      <Body small muted style={{ color: t.ink2, textAlign: 'center' }}>
        Trips are saved on this phone. Sharing with friends comes with sign-in.
      </Body>
    </>
  );
}
