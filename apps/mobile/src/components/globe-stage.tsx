import type { CountryTap, Place } from '@travelog/globe';
import { StatusBar } from 'expo-status-bar';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Globe, GLOBE_SPACE, type GlobeHandle } from '@/components/globe';
import { ExplorePanel } from '@/components/explore/panel';
import { ProfilePanel } from '@/components/profile/panel';
import { TripsPanel } from '@/components/trips-panel';

/** The tabs that draw on the shared globe. */
export type StageTab = 'trips' | 'explore' | 'profile';

/**
 * What a tab asks the globe to show while it is the one in front (Plan 72). Plain data plus
 * what its taps do. Only the focused tab's scene ever reaches the globe, so one tab's marks
 * cannot show on another.
 */
export interface GlobeScene {
  /** ISO alpha-3 codes, filled: picked for a trip, or visited. */
  visitedCountries?: string[];
  candidates?: Place[];
  stops?: Place[];
  /** The country (ISO alpha-3) the tab is showing a page for; the globe turns to it and keeps it. */
  focus?: string;
  /** 'focus': the page outlines and zooms to a tapped country. 'report': the app decides. */
  tapMode: 'focus' | 'report';
  countryTapEnabled?: boolean;
  onCountryPress?: (country: CountryTap) => void;
  onCandidatePress?: (place: Place) => void;
  onPlacePress?: (place: Place) => void;
  spin: boolean;
  /** Points of the stage, from the bottom, that the tab's drawer covers. */
  covered: number;
}

interface Stage {
  globe: RefObject<GlobeHandle | null>;
  /** The stage's height: the screen above the tab bar. */
  height: number;
  /** A drawer height that covers the globe completely (up to the status bar). */
  full: number;
  setScene: (tab: StageTab, scene: GlobeScene | null) => void;
}

const StageContext = createContext<Stage | null>(null);

export function useStage(): Stage {
  const stage = useContext(StageContext);
  if (!stage) throw new Error('useStage needs the globe stage');
  return stage;
}

/** Hands the stage this tab's scene on every render, and takes it back when the tab leaves. */
export function useStageScene(tab: StageTab, scene: GlobeScene): void {
  const { setScene } = useStage();
  useEffect(() => {
    setScene(tab, scene);
  });
  useEffect(() => () => setScene(tab, null), [tab, setScene]);
}

/**
 * Whether a path is one of the tabs. Anything else is a screen pushed over them (a trip,
 * Licences): the stage hides, and the tab underneath keeps its page as it was.
 */
export function isTabPath(pathname: string): boolean {
  return ['', '/', '/feed', '/explore', '/profile', '/saved'].includes(pathname);
}

/** Which tab, if any, a path draws on the globe for. */
export function stageTabFor(pathname: string): StageTab | null {
  if (pathname === '/' || pathname === '') return 'trips';
  if (pathname === '/explore') return 'explore';
  if (pathname === '/profile') return 'profile';
  return null;
}

/** The least of the globe that is treated as showing, so a raised drawer never shrinks it to nothing. */
const MIN_BAND = 0.25;

/** The parts of a scene the globe is redrawn for. Handlers are read fresh when they fire. */
const sceneKey = (s: GlobeScene | null) =>
  s
    ? JSON.stringify([
        s.visitedCountries ?? [],
        (s.candidates ?? []).map((p) => p.id),
        (s.stops ?? []).map((p) => p.id),
        s.tapMode,
        s.focus ?? null,
        s.countryTapEnabled ?? true,
        s.spin,
        Math.round(s.covered),
      ])
    : 'none';

/**
 * The one globe shared by Trips, Explore and Profile, with the focused tab's drawer on it
 * (Plan 72). The tabs layout draws it over the tab scenes and above the tab bar; on any other
 * screen it is hidden but kept, so the globe is never loaded twice.
 */
export function GlobeStage({
  tab,
  hidden = false,
  bottom,
}: {
  tab: StageTab | null;
  /** A screen is pushed over the tabs: draw nothing, keep everything. */
  hidden?: boolean;
  /** The tab bar's height: the stage stops above it. */
  bottom: number;
}): ReactElement {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const globe = useRef<GlobeHandle | null>(null);
  // The window is a first guess, so the first frame is already laid out.
  const [height, setHeight] = useState(window.height - bottom);
  const scenes = useRef<Partial<Record<StageTab, GlobeScene | null>>>({});
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const [, redraw] = useState(0);

  const setScene = useCallback((of: StageTab, scene: GlobeScene | null) => {
    const changed = sceneKey(scenes.current[of] ?? null) !== sceneKey(scene);
    scenes.current[of] = scene;
    if (changed && tabRef.current === of) redraw((n) => n + 1);
  }, []);
  const stage = useMemo<Stage>(
    () => ({ globe, height, full: Math.max(0, height - insets.top), setScene }),
    [height, insets.top, setScene],
  );

  const scene = (tab && scenes.current[tab]) || null;
  // Taps go to whichever scene is in front when they happen.
  const current = () => (tabRef.current ? scenes.current[tabRef.current] : null);
  // Between one tab's scene going and the next arriving, the globe keeps the last cover it was
  // told. Saying "nothing covers you" for a moment would send it off to re-centre.
  const lastCovered = useRef(0);
  if (scene) lastCovered.current = scene.covered;
  const covered = Math.min(lastCovered.current, height * (1 - MIN_BAND));
  const shown = !!tab && !hidden;

  return (
    <View
      testID="globe-stage"
      pointerEvents={shown ? 'auto' : 'none'}
      style={[styles.stage, { bottom, display: shown ? 'flex' : 'none' }]}
      onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
    >
      {shown ? <StatusBar style="light" /> : null}
      <Globe
        ref={globe}
        active={shown && !!scene?.spin}
        bottomInset={covered}
        focus={scene?.focus}
        visitedCountries={scene?.visitedCountries}
        candidates={scene?.candidates}
        stops={scene?.stops}
        tapMode={scene?.tapMode ?? 'report'}
        countryTapEnabled={scene?.countryTapEnabled ?? true}
        onCountryPress={(c) => current()?.onCountryPress?.(c)}
        onCandidatePress={(p) => current()?.onCandidatePress?.(p)}
        onPlacePress={(p) => current()?.onPlacePress?.(p)}
      />
      <StageContext.Provider value={stage}>
        {tab === 'trips' ? (
          <TripsPanel />
        ) : tab === 'explore' ? (
          <ExplorePanel />
        ) : tab === 'profile' ? (
          <ProfilePanel />
        ) : null}
      </StageContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: GLOBE_SPACE,
    // A drawer is as tall as its highest stop and slides down to rest, so part of it sits below
    // the stage. Cut it off here, or it covers the tab bar (Plan 76). The tab screens used to
    // do this clipping for the drawer when it lived inside them.
    overflow: 'hidden',
  },
});
