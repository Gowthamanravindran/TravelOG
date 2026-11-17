import { getLocalProfile } from '@travelog/db';
import { spacing } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { TripsList } from '@/components/trips-list';
import { useQuery } from '@/data/provider';
import { hasGlobe } from '@/lib/runtime';
import { H1, Screen } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

export default function TripsScreen() {
  const router = useRouter();
  // With the globe, the tabs layout draws Trips on the shared globe stage (Plan 72).
  if (hasGlobe()) return null;
  return <TripsListScreen onCreate={() => router.push('/new-trip')} />;
}

/** The Trips tab as it was before the globe: used where the web view is not in the app. */
function TripsListScreen({ onCreate }: { onCreate: () => void }) {
  const t = useTheme();
  const profile = useQuery((db) => getLocalProfile(db));
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
      <TripsList onCreate={onCreate} />
    </Screen>
  );
}
