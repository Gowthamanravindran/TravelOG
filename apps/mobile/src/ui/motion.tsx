import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ZoomIn,
  useReducedMotion,
} from 'react-native-reanimated';

import { spacing } from '@travelog/ui';

import { Icon } from './icon';
import { useTheme } from './theme';

/**
 * Motion for the app (Plans 28, 32). One place for durations and easing, all of it
 * following the phone's Reduce motion setting. Only transform and opacity animate
 * (react-native-skills: animation-gpu-properties). Nothing moves because of scrolling.
 */
export const MOTION = {
  fast: 150,
  base: 220,
  slow: 300,
  /** Delay between rows when a list appears, and how many rows get a delay. */
  stagger: 40,
  maxStagger: 8,
  /** Eases out and stops; nothing overshoots or bounces (Plan 32). */
  ease: { duration: 220, easing: Easing.out(Easing.cubic) },
} as const;

/** False when the person has asked their phone to reduce motion. */
export function useMotionOk(): boolean {
  return !useReducedMotion();
}

/** A row that fades and rises into place when a list opens, one after another. */
export function Appear({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const ok = useMotionOk();
  const delay = Math.min(index, MOTION.maxStagger) * MOTION.stagger;
  return (
    <Animated.View
      style={style}
      entering={
        ok
          ? FadeInDown.delay(delay)
              .duration(MOTION.base)
              .withInitialValues({ transform: [{ translateY: 8 }] })
          : undefined
      }
      exiting={ok ? FadeOut.duration(MOTION.fast) : undefined}
      layout={ok ? LinearTransition.duration(MOTION.base) : undefined}
    >
      {children}
    </Animated.View>
  );
}

/** A number that counts up to its value (budget totals). Shows the final value at once with reduced motion. */
export function CountUp({
  value,
  format,
  style,
  duration = 600,
}: {
  value: number;
  format: (n: number) => string;
  style?: StyleProp<import('react-native').TextStyle>;
  duration?: number;
}) {
  const ok = useMotionOk();
  const [shown, setShown] = useState(ok ? 0 : value);
  const from = useRef(ok ? 0 : value);
  useEffect(() => {
    if (!ok) {
      setShown(value);
      return;
    }
    const start = from.current;
    const began = Date.now();
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - began) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = t >= 1 ? value : Math.round(start + (value - start) * eased);
      setShown(next);
      if (t >= 1) {
        from.current = value;
        clearInterval(timer);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, ok, duration]);
  return <Text style={style}>{format(shown)}</Text>;
}

type HapticKind = 'select' | 'light' | 'success';

/** A light haptic; never throws (no motor, web, or a refusing device). */
export function haptic(kind: HapticKind): void {
  if (Platform.OS === 'web') return;
  const run =
    kind === 'select'
      ? () => Haptics.selectionAsync()
      : kind === 'light'
        ? () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  try {
    Promise.resolve(run()).catch(() => {});
  } catch {
    // No haptics on this device.
  }
}

const CelebrateContext = createContext<(label: string) => void>(() => {});

/** Shows a short check-mark burst over the app for big moments (trip created, settled up…). */
export function useCelebrate(): (label: string) => void {
  return useContext(CelebrateContext);
}

/** Hosts the celebration overlay; wrap the app once. */
export function CelebrationHost({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<{ label: string; key: number } | null>(null);
  const celebrate = useCallback((label: string) => {
    haptic('success');
    setShown({ label, key: Date.now() });
  }, []);
  useEffect(() => {
    if (!shown) return;
    const timer = setTimeout(() => setShown(null), 1100);
    return () => clearTimeout(timer);
  }, [shown]);
  return (
    <CelebrateContext.Provider value={celebrate}>
      {children}
      {shown ? <Burst key={shown.key} label={shown.label} /> : null}
    </CelebrateContext.Provider>
  );
}

function Burst({ label }: { label: string }) {
  const t = useTheme();
  const ok = useMotionOk();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={label}
        entering={ok ? FadeIn.duration(MOTION.fast) : undefined}
        exiting={ok ? FadeOut.duration(MOTION.base) : undefined}
        style={styles.burst}
      >
        <Animated.View
          entering={ok ? ZoomIn.duration(MOTION.base) : undefined}
          style={[styles.check, { backgroundColor: t.accent }]}
        >
          <Icon name="check" size={44} color={t.onAccent} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  burst: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Same gap as Screen's content, so wrapped sections keep their spacing.
  deferred: { gap: spacing.lg },
});

/**
 * Draws `fallback` first and `children` a couple of frames later (Plan 46), so a
 * heavy screen appears (and its slide or fade starts) at once, then fills in.
 * Once shown, the content stays; it never goes back to the fallback.
 */
export function Deferred({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const ok = useMotionOk();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  if (!ready) return <>{fallback}</>;
  return (
    <Animated.View entering={ok ? FadeIn.duration(MOTION.fast) : undefined} style={styles.deferred}>
      {children}
    </Animated.View>
  );
}
