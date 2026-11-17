import { spacing, type } from '@travelog/ui';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';

import { AppearanceCard, appearanceSummary } from '@/components/appearance-card';
import { useMutate, useQuery } from '@/data/provider';
import { useAppearance } from '@/lib/appearance';
import { remindersEnabled, setRemindersEnabled } from '@/lib/reminders';
import { globeStatus, isExpoGo } from '@/lib/runtime';
import { sharingBuildLevel } from '@/lib/social-share';
import { Between, Body, Button, Card, Expander, Strong } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

/** The way back and the title; a drawer shows it in the part that drags. */
export function SettingsHeader({ onBack }: { onBack: () => void }) {
  const t = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <View style={{ alignSelf: 'flex-start' }}>
        <Button label="Back to Profile" icon="back" variant="link" onPress={onBack} />
      </View>
      <Text accessibilityRole="header" style={[type.display, { color: t.ink }]}>
        Settings
      </Text>
    </View>
  );
}

type SectionName = 'reminders' | 'appearance' | 'about';

/**
 * Profile → Settings (Plan 74): everything that is a setting or about the app, each in a
 * section that opens in place. One section is open at a time.
 */
export function ProfileSettings() {
  const router = useRouter();
  const mutate = useMutate();
  const appearance = useAppearance();
  const reminders = useQuery((db) => remindersEnabled(db));
  const sharing = sharingBuildLevel();
  const expoGo = isExpoGo();
  const globe = globeStatus();
  const [open, setOpen] = useState<SectionName | null>(null);
  const section = (name: SectionName) => ({
    open: open === name,
    onToggle: () => setOpen(open === name ? null : name),
  });

  return (
    <View style={{ gap: spacing.md }}>
      <Expander title="Trip reminders" summary={reminders ? 'On' : 'Off'} {...section('reminders')}>
        <Between>
          <Strong>Remind me</Strong>
          <Switch
            accessibilityLabel="Trip reminders"
            value={reminders}
            onValueChange={(on) => mutate((db) => setRemindersEnabled(db, on))}
          />
        </Between>
        <Body muted small>
          Before flights, trains and buses (3 h), other bookings (1 h), planned stops (30 min) and
          poll deadlines (1 h).
        </Body>
      </Expander>
      <Expander
        title="Appearance"
        summary={appearanceSummary(appearance)}
        {...section('appearance')}
      >
        <AppearanceCard />
      </Expander>
      <Expander
        title="About"
        summary="Licences, this app build, account and version"
        {...section('about')}
      >
        <Card onPress={() => router.push('/licenses')} accessibilityLabel="Licences and credits">
          <Strong>Licences and credits</Strong>
          <Body muted small>
            3D art by Microsoft (Fluent Emoji, MIT), fonts, icons, place data from GeoNames and
            OpenStreetMap, and the open-source packages TravelOG is built with.
          </Body>
        </Card>
        <Card>
          <Strong>This app build</Strong>
          <Body muted small>
            {expoGo
              ? "Running in Expo Go: test data is kept apart and isn't encrypted; Instagram posting uses the share sheet."
              : sharing === 2
                ? 'Up to date: posting collages to Instagram and Facebook is included.'
                : sharing === 1
                  ? 'Older build: install the latest build to open Instagram with your slides.'
                  : 'Older build without Instagram/Facebook posting. Install the latest build from GitHub Actions.'}
          </Body>
          {/* Says outright why the Trips tab is a globe or a list on this phone (Plan 71). */}
          <Body muted small>
            {globe.ok
              ? 'Globe: included.'
              : `Globe: not in this build, so Trips shows the list. Install the latest build. (${globe.why})`}
          </Body>
        </Card>
        <Card>
          <Strong>Account and sync</Strong>
          <Body muted small>
            Sign-in, backup and sharing trips with friends arrive in a later update. Until then
            everything is saved on this phone only.
          </Body>
        </Card>
        <Body small muted>
          TravelOG {Constants.expoConfig?.version ?? ''}
        </Body>
      </Expander>
    </View>
  );
}
