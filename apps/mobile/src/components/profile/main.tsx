import { getLocalProfile, listTrips } from '@travelog/db';
import { spacing, type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useQuery } from '@/data/provider';
import { Icon } from '@/ui/icon';
import { Between, Body, Button, Card, Strong } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

import { useVisited, Visited } from './visited';

/** The person's name, how many countries they have visited, and the way to Settings. */
export function ProfileHeader({ onOpenSettings }: { onOpenSettings: () => void }) {
  const t = useTheme();
  const profile = useQuery((db) => getLocalProfile(db));
  const count = useVisited().length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={[type.display, { color: t.ink }]} numberOfLines={1}>
          {profile?.displayName}
        </Text>
        <Text style={[type.caption, { color: t.ink2 }]}>
          {count === 1 ? '1 country visited' : `${count} countries visited`}
        </Text>
      </View>
      {/* An icon alone, so it gets a spoken name and a full 48 pt target. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={onOpenSettings}
        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="settings" size={24} color={t.ink} />
      </Pressable>
    </View>
  );
}

/** Profile's main view (Plan 74): the person, their trips, and the countries they've visited. */
export function ProfileMain({
  globe,
  onSearching,
}: {
  globe: boolean;
  onSearching?: (searching: boolean) => void;
}) {
  const router = useRouter();
  const profile = useQuery((db) => getLocalProfile(db));
  const trips = useQuery((db) => listTrips(db));
  const done = trips.filter((x) => x.state === 'completed' || x.state === 'archived').length;
  return (
    <View style={{ gap: spacing.md }}>
      <Visited globe={globe} onSearching={onSearching} />
      <Card>
        <Body muted small>
          Home currency {profile?.homeCurrency}
          {profile?.upiId ? ` · UPI ${profile.upiId}` : ''}
        </Body>
        <Button label="Edit" variant="secondary" small onPress={() => router.push('/welcome')} />
      </Card>
      <Card>
        <Between>
          <Body>Trips</Body>
          <Strong>{trips.length}</Strong>
        </Between>
        <Between>
          <Body>Completed</Body>
          <Strong>{done}</Strong>
        </Between>
      </Card>
    </View>
  );
}
