import { useLocalSearchParams, useRouter } from 'expo-router';

import { Body, Button, Card, Heading, Screen } from '@/components/screen';
import { useModeTheme } from '@/theme/use-mode-theme';

/** Phase 0 placeholder for Plan mode (itinerary, budget, bookings, polls). */
export default function PlanModeScreen() {
  const theme = useModeTheme('plan');
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <Screen theme={theme}>
      <Heading theme={theme} eyebrow="Planning" title="Plan mode" />
      <Card theme={theme}>
        <Body theme={theme}>
          Trip “{id}”: itinerary, budget, bookings and polls arrive in Phases 2–3.
        </Body>
      </Card>
      <Button theme={theme} variant="ghost" label="Back to trips" onPress={() => router.back()} />
    </Screen>
  );
}
