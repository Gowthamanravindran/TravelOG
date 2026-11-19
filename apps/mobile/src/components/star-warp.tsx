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

/** Stars streaming past, and how long one takes to fly by. */
const MOVING = 96;
const PASS_MS = 3200;
/** Bright stars that glow and twinkle. */
const BRIGHT = 12;
/** One fixed star per this many square points: as dense as the globe's own sky. */
const FIELD_AREA_PER_STAR = 800;
const FIELD_MAX = 320;
/** The fixed stars drift slowly towards you while the globe loads. */
const DRIFT_MS = 20_000;
const DRIFT_SCALE = 1.2;
const FADE_MS = 600;
/** The words only show if the globe is slow to come. */
const WORDS_AFTER_MS = 3000;

const WHITE = defaultTheme.tagText ?? 'white';
const COOL = defaultTheme.starCool ?? WHITE;
const WARM = defaultTheme.starWarm ?? WHITE;

/** The same sky every time: a small fixed-seed generator. */
function random(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}
/** Mostly white, a quarter blue-white, a few warm, as in the globe's own sky. */
function tint(r: number): string {
  return r < 0.25 ? COOL : r < 0.33 ? WARM : WHITE;
}

interface Moving {
  angle: number;
  phase: number;
  size: number;
  color: string;
}
interface Fixed {
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
}

function movingStars(): Moving[] {
  const next = random(7);
  return Array.from({ length: MOVING }, () => ({
    angle: next() * Math.PI * 2,
    phase: next(),
    size: 1 + next() * 1.4,
    color: tint(next()),
  }));
}
function fixedStars(w: number, h: number): Fixed[] {
  const next = random(20261119);
  const n = Math.min(FIELD_MAX, Math.round((w * h) / FIELD_AREA_PER_STAR));
  return Array.from({ length: n }, () => {
    const k = next();
    return {
      x: next() * w,
      y: next() * h,
      size: k < 0.8 ? 1 : 1.6,
      opacity: 0.35 + next() * 0.55,
      color: tint(next()),
    };
  });
}
function brightStars(w: number, h: number): (Fixed & { twinkleMs: number })[] {
  const next = random(4242);
  return Array.from({ length: BRIGHT }, () => ({
    x: next() * w,
    y: next() * h,
    size: 2.4 + next() * 1.2,
    opacity: 1,
    color: tint(next() * 0.5), // the bright ones lean blue-white or warm
    twinkleMs: 1200 + next() * 1600,
  }));
}

function MovingStar({
  star,
  pass,
  width,
  height,
}: {
  star: Moving;
  pass: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const t = (pass.get() + star.phase) % 1;
    // Starts a little way out and speeds up towards the edge, as when flying through them.
    const d = 0.06 + 0.94 * Math.pow(t, 1.7);
    const reach = Math.hypot(width.get(), height.get()) / 2;
    const fadeIn = Math.min(1, t * 5);
    const fadeOut = t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1;
    return {
      opacity: fadeIn * fadeOut,
      transform: [
        { translateX: width.get() / 2 + Math.cos(star.angle) * d * reach },
        { translateY: height.get() / 2 + Math.sin(star.angle) * d * reach },
        { scale: 0.5 + d * 1.6 },
      ],
    };
  });
  return (
    <Animated.View testID="moving-star" style={[styles.dot, dot(star.size, star.color), style]} />
  );
}

function BrightStar({ star, still }: { star: Fixed & { twinkleMs: number }; still: boolean }) {
  const glow = useSharedValue(1);
  useEffect(() => {
    if (still) return;
    glow.set(
      withRepeat(
        withTiming(0.45, { duration: star.twinkleMs, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
    return () => cancelAnimation(glow);
  }, [still, glow, star.twinkleMs]);
  const twinkle = useAnimatedStyle(() => ({ opacity: glow.get() }));
  const halo = star.size * 4;
  return (
    <Animated.View
      testID="bright-star"
      style={[
        styles.bright,
        { left: star.x - halo / 2, top: star.y - halo / 2, width: halo, height: halo },
        twinkle,
      ]}
    >
      <View style={[dot(halo, star.color), styles.halo]} />
      <View style={dot(star.size * 1.8, star.color)} />
      <View style={[dot(star.size, WHITE), styles.core]} />
    </Animated.View>
  );
}

const dot = (size: number, color: string) => ({
  width: size,
  height: size,
  borderRadius: size / 2,
  backgroundColor: color,
});

/**
 * The night sky shown while the globe starts (Plans 80, 81): a field of stars out to every edge
 * drifting slowly closer, a few bright ones that glow and twinkle, and stars streaming outward
 * as if flying through space towards the globe. When the globe is ready (`leaving`) the sky
 * fades and the globe travels in behind it. With Reduce motion everything stays still.
 */
export function StarWarp({ leaving }: { leaving: boolean }) {
  const ok = useMotionOk();
  const moving = useMemo(movingStars, []);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const field = useMemo(() => fixedStars(size.w, size.h), [size]);
  const bright = useMemo(() => brightStars(size.w, size.h), [size]);
  const pass = useSharedValue(0.5);
  const drift = useSharedValue(1);
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
    drift.set(1);
    drift.set(withTiming(DRIFT_SCALE, { duration: DRIFT_MS, easing: Easing.out(Easing.quad) }));
    return () => {
      cancelAnimation(pass);
      cancelAnimation(drift);
    };
  }, [ok, gone, pass, drift]);

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
  const closer = useAnimatedStyle(() => ({ transform: [{ scale: drift.get() }] }));
  if (gone) return null;
  return (
    <Animated.View
      testID="star-warp"
      style={[StyleSheet.absoluteFill, styles.sky, fade]}
      onLayout={(e) => {
        const { width: w, height: h } = e.nativeEvent.layout;
        width.set(w);
        height.set(h);
        setSize({ w, h });
      }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, closer]}>
        {field.map((s, i) => (
          <View
            key={i}
            testID="sky-star"
            style={[styles.dot, dot(s.size, s.color), { left: s.x, top: s.y, opacity: s.opacity }]}
          />
        ))}
        {bright.map((s, i) => (
          <BrightStar key={i} star={s} still={!ok} />
        ))}
      </Animated.View>
      {moving.map((star, i) => (
        <MovingStar key={i} star={star} pass={pass} width={width} height={height} />
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
  dot: { position: 'absolute', left: 0, top: 0 },
  bright: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', opacity: 0.16 },
  core: { position: 'absolute' },
  words: { position: 'absolute', left: 0, right: 0, bottom: spacing.lg, alignItems: 'center' },
  // The globe's own colours: it is dark in every app theme.
  wordsText: { color: WHITE, ...font('text', 500) },
});
