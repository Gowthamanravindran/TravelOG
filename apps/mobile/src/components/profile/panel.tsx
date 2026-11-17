import { countryByIso } from '@travelog/globe';
import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useStage, useStageScene, type GlobeScene } from '@/components/globe-stage';
import { useMutate } from '@/data/provider';
import { addVisited, removeVisited } from '@/lib/visited';
import { Drawer } from '@/ui/drawer';
import { useKeyboardHidden } from '@/ui/keyboard';
import { haptic, Swap } from '@/ui/motion';

import { ProfileHeader, ProfileMain } from './main';
import { ProfileSettings, SettingsHeader } from './settings';
import { useVisited } from './visited';

/** The drawer at rest leaves the globe the top 45 % of the stage. */
const REST = 0.55;

/**
 * Profile on the globe stage (Plan 74). The globe shows the countries the person has marked as
 * visited, and a tap on a country marks or unmarks it. The marks are this tab's alone: the
 * scene goes when the tab is left, and the globe is plain again. Settings sit behind the gear
 * and close when the tab is left (this panel is only mounted on Profile).
 */
export function ProfilePanel() {
  const { globe, height, full } = useStage();
  const mutate = useMutate();
  const visited = useVisited();
  const [settings, setSettings] = useState(false);
  const [raised, setRaised] = useState(false);
  const [searching, setSearching] = useState(false);
  useKeyboardHidden(useCallback(() => setSearching(false), []));
  const heights = [Math.round(height * REST), full];
  const index = settings || raised || searching ? 1 : 0;

  // Whatever the last tab left the globe looking at, Profile starts from the whole globe.
  useEffect(() => {
    globe.current?.goHome();
  }, [globe]);

  const scene: GlobeScene = {
    tapMode: 'report',
    spin: false,
    covered: heights[0]!,
    visitedCountries: visited.map((c) => c.iso),
    onCountryPress: (tapped) => {
      const country = countryByIso(tapped.iso);
      const code = country?.countryCode;
      if (!country || !code) return;
      const was = visited.some((v) => v.iso === country.iso);
      mutate((db) => (was ? removeVisited(db, code) : addVisited(db, code)));
      haptic('light');
      AccessibilityInfo.announceForAccessibility(
        was ? `${country.name} removed` : `${country.name} marked as visited`,
      );
    },
  };
  useStageScene('profile', scene);

  return (
    <Drawer
      heights={heights}
      index={index}
      onIndexChange={(i) => {
        setRaised(i > 0);
        // Pulling Settings down is leaving it: the globe is for the countries.
        if (i === 0) setSettings(false);
      }}
      label={settings ? 'Settings' : 'Profile'}
      padBottom={false}
      scroll="always"
      header={
        settings ? (
          <SettingsHeader onBack={() => setSettings(false)} />
        ) : (
          <ProfileHeader onOpenSettings={() => setSettings(true)} />
        )
      }
    >
      <Swap id={settings ? 'settings' : 'main'}>
        {settings ? <ProfileSettings /> : <ProfileMain globe onSearching={setSearching} />}
      </Swap>
    </Drawer>
  );
}
