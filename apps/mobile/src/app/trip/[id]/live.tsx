import { useLocalSearchParams, useRouter } from 'expo-router';

import { Body, Button, Card, Heading, Screen } from '@/components/screen';
import { useModeTheme } from '@/theme/use-mode-theme';

/** Phase 0 placeholder for Trip mode (always dark). */
export default function TripModeScreen() {
  const theme = useModeTheme('trip');
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen theme={theme}>
      <Heading theme={theme} eyebrow="Live trip" title="Trip mode" />
      <Card theme={theme}>
        <Body theme={theme}>Trip “{id}”: Today, map, Nearby and Budget arrive in Phase 4.</Body>
      </Card>
      <Button theme={theme} label="Exit trip mode" onPress={() => router.back()} />
    </Screen>
  );
}
