import { formatMoney, splitEqually } from '@travelog/core';
import { useRouter } from 'expo-router';

import { Body, Button, Card, Heading, Screen } from '@/components/screen';
import { useModeTheme } from '@/theme/use-mode-theme';

/** Phase 0 placeholder for Home mode. Real trips arrive in Phase 2. */
export default function HomeScreen() {
  const theme = useModeTheme('home');
  const router = useRouter();
  const shares = splitEqually(284000, 4).map((p) => formatMoney(p, 'INR', { showMinor: false }));

  return (
    <Screen theme={theme}>
      <Heading theme={theme} eyebrow="TravelOG · Phase 0" title="Your trips" />
      <Card theme={theme}>
        <Body theme={theme}>
          The app shell is running. Sign-in, offline data and real trips come next.
        </Body>
        <Body theme={theme} muted>
          Shared money helper check: ₹2,840 split 4 ways is {shares.join(', ')}.
        </Body>
      </Card>
      <Button theme={theme} label="Open Plan mode" onPress={() => router.push('/trip/demo/plan')} />
      <Button
        theme={theme}
        variant="ghost"
        label="Open Trip mode"
        onPress={() => router.push('/trip/demo/live')}
      />
    </Screen>
  );
}
