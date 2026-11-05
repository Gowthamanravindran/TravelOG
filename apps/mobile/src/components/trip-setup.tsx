import {
  ensureMainVariant,
  getSetting,
  getTrip,
  myMember,
  setSetting,
  tripSetupStatus,
  type TripSetupStatus,
} from '@travelog/db';
import { type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { Icon, type IconName } from '@/ui/icon';
import { Between, Body, Button, Card, Strong } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

import { IDEAS_DAY } from './itinerary-view';
import { PeopleCard } from './people-card';

const STEPS: { key: keyof TripSetupStatus; icon: IconName; title: string; hint: string }[] = [
  {
    key: 'people',
    icon: 'people',
    title: 'Add people',
    hint: 'Who is coming, to split costs and vote',
  },
  {
    key: 'budget',
    icon: 'budget',
    title: 'Set a budget',
    hint: 'Per person, by stay, travel, food…',
  },
  {
    key: 'bookings',
    icon: 'bookings',
    title: 'Add bookings',
    hint: 'Flights, trains, stays, with tickets',
  },
  {
    key: 'plan',
    icon: 'itinerary',
    title: 'Plan the first day',
    hint: 'Places, food and activities',
  },
];

const hiddenKey = (tripId: string) => `setup-hidden:${tripId}`;

/**
 * "Set up your trip" (Plan 16): after creating a trip, the next steps in one
 * place, each ticked when done. Hidden once everything is done or dismissed.
 */
export function TripSetupCard({ tripId }: { tripId: string }) {
  const t = useTheme();
  const router = useRouter();
  const mutate = useMutate();
  const trip = useQuery((db) => getTrip(db, tripId), [tripId]);
  const status = useQuery((db) => tripSetupStatus(db, tripId), [tripId]);
  const hidden = useQuery((db) => getSetting(db, hiddenKey(tripId)) === '1', [tripId]);
  const [addingPeople, setAddingPeople] = useState(false);
  const done = STEPS.filter((s) => status[s.key]).length;
  if (!trip || hidden || done === STEPS.length) return null;

  const open = (key: keyof TripSetupStatus) => {
    switch (key) {
      case 'people':
        setAddingPeople(true);
        return;
      case 'budget':
        router.push(`/trip/${tripId}/plan/budget?edit=1`);
        return;
      case 'bookings':
        router.push(`/trip/${tripId}/booking`);
        return;
      case 'plan': {
        const day = trip.startDate ?? IDEAS_DAY;
        const v = mutate((db) => ensureMainVariant(db, tripId, day, myMember(db, tripId)?.id));
        router.push(`/trip/${tripId}/item?variantId=${v.id}`);
      }
    }
  };

  return (
    <Card>
      <Between>
        <Strong>Set up your trip</Strong>
        <Body muted small>
          {done} of {STEPS.length} done
        </Body>
      </Between>
      {STEPS.map((s) => {
        const ok = status[s.key];
        return (
          <Pressable
            key={s.key}
            disabled={ok}
            onPress={() => open(s.key)}
            accessibilityRole="button"
            accessibilityLabel={`${s.title}${ok ? ', done' : ''}`}
            accessibilityState={{ disabled: ok }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 8,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: ok ? t.accentSoft : t.surface2,
              }}
            >
              <Icon name={ok ? 'check' : s.icon} size={20} color={ok ? t.accent : t.ink} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  type.headline,
                  { color: ok ? t.ink2 : t.ink, textDecorationLine: ok ? 'line-through' : 'none' },
                ]}
              >
                {s.title}
              </Text>
              {!ok ? <Text style={[type.caption, { color: t.ink2 }]}>{s.hint}</Text> : null}
            </View>
            {!ok ? <Icon name="right" size={18} color={t.ink2} /> : null}
          </Pressable>
        );
      })}
      {addingPeople ? <PeopleCard tripId={tripId} startOpen /> : null}
      <Button
        label="Hide"
        variant="link"
        small
        onPress={() => mutate((db) => setSetting(db, hiddenKey(tripId), '1'))}
      />
    </Card>
  );
}
