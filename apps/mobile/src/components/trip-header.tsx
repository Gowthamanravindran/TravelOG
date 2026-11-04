import { getTrip } from '@travelog/db';
import { tripDayNumber, tripState } from '@travelog/core';
import { type } from '@travelog/ui';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useQuery } from '@/data/provider';
import { dateRange } from '@/lib/format';
import { Button, Row } from '@/ui/kit';
import { useMode, useTheme } from '@/ui/theme';

/** Header shared by Plan and Trip mode: back/exit, trip name, and the switch between modes. */
export function TripHeader() {
  const t = useTheme();
  const mode = useMode();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  if (!trip) return null;
  const state = tripState(trip);
  const day = tripDayNumber(trip);
  const eyebrow =
    mode === 'trip'
      ? day
        ? `Day ${day.day} of ${day.of}`
        : 'Trip mode'
      : state === 'live'
        ? 'Live now'
        : state === 'upcoming'
          ? `Upcoming · ${dateRange(trip.startDate, trip.endDate)}`
          : state === 'planning'
            ? 'Planning · dates not set'
            : 'Completed';

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: t.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 8 }}>
        <Row>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mode === 'trip' ? 'Exit trip mode' : 'Back to trips'}
            onPress={() => router.navigate('/')}
            hitSlop={8}
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: t.line,
              backgroundColor: t.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: t.ink, fontSize: 18 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text
              style={[type.caption, { color: t.accent, textTransform: 'uppercase' }]}
              numberOfLines={1}
            >
              {eyebrow}
            </Text>
            <Text style={[type.title, { color: t.ink }]} numberOfLines={1}>
              {trip.emoji} {trip.title}
            </Text>
          </View>
          <Button
            label="📸"
            variant="ghost"
            small
            onPress={() => router.push(`/trip/${id}/memories`)}
          />
          <Button label="⋯" variant="ghost" small onPress={() => router.push(`/trip/${id}/edit`)} />
        </Row>
        {mode === 'plan' && state === 'live' ? (
          <Button label="Open trip mode" small onPress={() => router.replace(`/trip/${id}/live`)} />
        ) : null}
        {mode === 'trip' ? (
          <Button
            label="Edit the plan"
            variant="ghost"
            small
            onPress={() => router.replace(`/trip/${id}/plan`)}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}
