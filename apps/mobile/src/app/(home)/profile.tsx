import { useState } from 'react';

import { ProfileHeader, ProfileMain } from '@/components/profile/main';
import { ProfileSettings, SettingsHeader } from '@/components/profile/settings';
import { hasGlobe } from '@/lib/runtime';
import { Screen } from '@/ui/kit';

/**
 * Profile. With the globe, the tabs layout draws it on the shared globe stage (Plans 72, 74)
 * and this route draws nothing. Where the globe cannot run it is a plain page with the same
 * main view and Settings; countries are added by search there.
 */
export default function ProfileScreen() {
  const [settings, setSettings] = useState(false);
  if (hasGlobe()) return null;
  return settings ? (
    <Screen>
      <SettingsHeader onBack={() => setSettings(false)} />
      <ProfileSettings />
    </Screen>
  ) : (
    <Screen>
      <ProfileHeader onOpenSettings={() => setSettings(true)} />
      <ProfileMain globe={false} />
    </Screen>
  );
}
