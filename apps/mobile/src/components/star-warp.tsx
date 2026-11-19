import { defaultTheme } from '@travelog/globe';
import { font, spacing, type } from '@travelog/ui';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useMotionOk } from '@/ui/motion';

/** How many stars, how long one takes to fly past, how long the sky takes to fade. */
const STARS = 64;
const PASS_MS = 3200;
const FADE_MS = 600;
/** The words only show if the globe is slow to come. */
const WORDS_AFTER_MS = 3000;

interface Star {
  angle: number;
  /** Where in its pass the star starts, 0–1, so they are spread out. */
  phase: number;
  size: number;
}

/** The same sky every time: a small fixed-seed generator. */
function stars(): Star[] {
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: STARS }, () => ({
    angle: next() * Math.PI * 2,
    phase: next(),
    size: 1 + next() * 1.6,
  }));
}

function StarDot({
  star,
  pass,
  width,
  height,
}: {
  star: Star;
  pass: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const t = (pass.get() + star.phase) % 1;
    // Stars speed up as they near the edge, as when moving forward through them.
    const d = t * t;
    const reach = Math.hypot(width.get(), height.get()) / 2;
    const fadeIn = Math.min(1, t * 5);
    const fadeOut = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
    return {
      opacity: fadeIn * fadeOut,
      transform: [
        { translateX: width.get() / 2 + Math.cos(star.angle) * d * reach },
        { translateY: height.get() / 2 + Math.sin(star.angle) * d * reach },
        { scale: 0.5 + d * 1.8 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.star,
        { width: star.size, height: star.size, borderRadius: star.size / 2 },
        style,
      ]}
    />
  );
}

/**
 * The night sky shown while the globe starts (Plan 80): stars stream outward, as if flying
 * through space towards the globe. When the globe is ready (`leaving`) the sky fades and the
 * globe travels in from far away behind it. With Reduce motion the stars stay still.
 */
export function StarWarp({ leaving }: { leaving: boolean }) {
  const ok = useMotionOk();
  const sky = useMemo(stars, []);
  const pass = useSharedValue(0.5);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(1);
  const [gone, setGone] = useState(false);
  const [words, setWords] = useState(false);

  // Flying while it shows; still when motion is reduced.
  useEffect(() => {
    if (!ok || gone) return;
    pass.set(0);
    pass.set(withRepeat(withTiming(1, { duration: PASS_MS, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(pass);
  }, [ok, gone, pass]);

  // Leaves when the globe is there; comes back if the globe has to load again.
  useEffect(() => {
    if (!leaving) {
      setGone(false);
      opacity.set(1);
      const timer = setTimeout(() => setWords(true), WORDS_AFTER_MS);
      return () => clearTimeout(timer);
    }
    setWords(false);
    opacity.set(withTiming(0, { duration: FADE_MS, easing: Easing.out(Easing.cubic) }));
    const timer = setTimeout(() => setGone(true), FADE_MS + 50);
    return () => clearTimeout(timer);
  }, [leaving, opacity]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  if (gone) return null;
  return (
    <Animated.View
      testID="star-warp"
      style={[StyleSheet.absoluteFill, styles.sky, fade]}
      onLayout={(e) => {
        width.set(e.nativeEvent.layout.width);
        height.set(e.nativeEvent.layout.height);
      }}
    >
      {sky.map((star, i) => (
        <StarDot key={i} star={star} pass={pass} width={width} height={height} />
      ))}
      {words ? (
        <View style={styles.words}>
          <Text style={[type.caption, styles.wordsText]}>Loading the globe…</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sky: { backgroundColor: defaultTheme.space, overflow: 'hidden' },
  // The globe's own colours: it is dark in every app theme.
  star: { position: 'absolute', left: 0, top: 0, backgroundColor: defaultTheme.tagText },
  words: { position: 'absolute', left: 0, right: 0, bottom: spacing.lg, alignItems: 'center' },
  wordsText: { color: defaultTheme.tagText, ...font('text', 500) },
});
