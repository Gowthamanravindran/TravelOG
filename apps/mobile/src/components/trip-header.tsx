import { getTrip, listMembers } from '@travelog/db';
import { daysUntilStart, tripDayNumber, tripState } from '@travelog/core';
import { font, type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useQuery } from '@/data/provider';
import { dateRange } from '@/lib/format';
import { tripIcon } from '@/lib/labels';
import { useTripId } from '@/lib/use-trip-id';
import { Icon, type IconName } from '@/ui/icon';
import { useMode, useTheme } from '@/ui/theme';

/**
 * Trip hero header for Plan and Trip mode (Plan 18): round back and more
 * buttons, a large trip icon tile, title, place and dates, and status chips
 * (countdown or day of trip, people). Switches between Plan and Trip mode.
 */
export function TripHeader() {
  const t = useTheme();
  const mode = useMode();
  const router = useRouter();
  const id = useTripId();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  const people = useQuery((db) => listMembers(db, id).length, [id]);
  if (!trip) return null;

  const state = tripState(trip);
  const day = tripDayNumber(trip);
  const until = daysUntilStart(trip);
  const status: { icon: IconName; text: string } =
    state === 'live' && day
      ? { icon: 'today', text: `Day ${day.day} of ${day.of}` }
      : state === 'upcoming' && until != null
        ? { icon: 'dates', text: until === 1 ? 'Tomorrow' : `In ${until} days` }
        : state === 'planning'
          ? { icon: 'edit', text: 'Planning · dates not set' }
          : { icon: 'check', text: 'Completed' };
  const subtitle = [
    trip.destination,
    trip.startDate ? dateRange(trip.startDate, trip.endDate) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const roundButton = (icon: IconName, label: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: t.surface,
        borderWidth: 1,
        borderColor: t.line,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon name={icon} size={20} color={t.ink} />
    </Pressable>
  );

  const chip = (icon: IconName, text: string, strong = false) => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: strong ? t.accentSoft : t.surface2,
      }}
    >
      <Icon name={icon} size={14} color={strong ? t.accent : t.ink2} />
      <Text style={[type.caption, { color: strong ? t.accent : t.ink2, ...font('text', 600) }]}>
        {text}
      </Text>
    </View>
  );

  const switchTo =
    mode === 'plan' && state === 'live'
      ? { label: 'Open trip mode', icon: 'today' as IconName, href: `/trip/${id}/live` as const }
      : mode === 'trip'
        ? {
            label: 'Edit the plan',
            icon: 'itinerary' as IconName,
            href: `/trip/${id}/plan` as const,
          }
        : null;

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: t.bg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 12, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {roundButton('back', mode === 'trip' ? 'Exit trip mode' : 'Back to trips', () =>
            router.navigate('/'),
          )}
          <View style={{ flex: 1 }} />
          {switchTo ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={switchTo.label}
              onPress={() => router.replace(switchTo.href)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 14,
                height: 40,
                borderRadius: 20,
                backgroundColor: t.accent,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Icon name={switchTo.icon} size={18} color={t.onAccent} />
              <Text style={[type.label, { color: t.onAccent }]}>{switchTo.label}</Text>
            </Pressable>
          ) : null}
          {roundButton('more', 'Trip settings', () => router.push(`/trip/${id}/edit`))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View
            style={{
              width: 60,
              height: 60,
              borderRadius: 20,
              backgroundColor: t.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={tripIcon(trip.emoji)} size={32} color={t.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[type.display, { color: t.ink }]} numberOfLines={1}>
              {trip.title}
            </Text>
            {subtitle ? (
              <Text style={[type.body, { color: t.ink2 }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {chip(status.icon, status.text, true)}
          {chip('people', `${people} ${people === 1 ? 'person' : 'people'}`)}
          {chip('budget', trip.currency)}
        </View>
      </View>
    </SafeAreaView>
  );
}
