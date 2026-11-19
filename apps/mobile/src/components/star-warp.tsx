import { defaultTheme } from '@travelog/globe';
import { font, spacing, type } from '@travelog/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useMotionOk } from '@/ui/motion';

/** Stars in the flight. */
const STARS = 180;
/** How wide the field is: larger spreads the stars further out, so the edges stay full. */
const NEAR = 0.35;
/** The depth at which a star is drawn at nearly full size and brightness. */
const CLOSE = 0.15;
/** How far off the line of flight stars can be. */
const SPREAD = 1.6;
/** How far back along its path a streak reaches, per unit of speed. */
const TRAIL = 0.12;
/** Depth travelled per second at speed 1. */
const RATE = 0.6;
/** Cruising at first, then up to warp, where the stars streak. */
const CRUISE = 0.18;
const WARP = 0.5;
const WARP_AFTER_MS = 700;
/** One dim deep-field star per this many square points, so the edges are never empty. */
const FIELD_AREA_PER_STAR = 900;
const FIELD_MAX = 300;
const FADE_MS = 600;
/** The words only show if the globe is slow to come. */
const WORDS_AFTER_MS = 3000;
/** Every streak is this view, stretched and turned. */
const BASE_W = 100;
const BASE_H = 2;
/** The glow's circles, as parts of the sky's shorter side. */
const GLOW_RINGS = Array.from({ length: 18 }, (_, i) => 0.95 - i * 0.048);

/** "#rrggbb" or "rgb(r, g, b)" with an alpha, for the fading end of a streak. */
function withAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  const [r, g, b] = hex
    ? hex.slice(1).map((h) => parseInt(h, 16))
    : (color.match(/\d+/g) ?? ['255', '255', '255']).slice(0, 3).map(Number);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const WHITE = defaultTheme.tagText ?? 'rgb(255, 255, 255)';
const COOL = defaultTheme.starCool ?? WHITE;
const WARM = defaultTheme.starWarm ?? WHITE;
/** Mostly white, a quarter blue-white, a few warm, as in the globe's own sky. */
const tint = (r: number) => (r < 0.25 ? COOL : r < 0.33 ? WARM : WHITE);

function random(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export interface WarpStar {
  /** Across and up, about −1 to 1: where the star is off the line of flight. */
  x: number;
  y: number;
  /** Where in its journey it starts, 0–1. */
  phase: number;
  /** Its own speed, so near and far ones part (parallax). */
  speed: number;
  tint: string;
}

/** The same flight every time: a fixed seed. */
export function warpStars(): WarpStar[] {
  const next = random(7);
  return Array.from({ length: STARS }, () => ({
    x: (next() * 2 - 1) * SPREAD,
    y: (next() * 2 - 1) * SPREAD,
    phase: next(),
    speed: 0.7 + next() * 0.6,
    tint: tint(next()),
  }));
}

/**
 * Where a star is drawn at depth `z` (1 far, near 0 close) while flying at `speed`, in a
 * `w` × `h` sky (Plan 82). Perspective: the screen offset grows as 1/z, so far stars sit near
 * the middle and near ones rush out past the edges, growing and brightening. The streak runs
 * back to where the star was a moment ago, so it is long for near, fast stars and nothing at a
 * stop. Stars far away fade in, so a star coming round never pops in.
 */
export function starAt(star: WarpStar, z: number, speed: number, w: number, h: number) {
  'worklet';
  const cx = w / 2;
  const cy = h / 2;
  const hx = cx + (star.x * (w / 2) * NEAR) / z;
  const hy = cy + (star.y * (h / 2) * NEAR) / z;
  const back = z + speed * TRAIL;
  const tx = cx + (star.x * (w / 2) * NEAR) / back;
  const ty = cy + (star.y * (h / 2) * NEAR) / back;
  const near = Math.pow(CLOSE / z, 0.8);
  const size = Math.min(3.4, 0.6 + 2.4 * near);
  const bright = Math.pow(Math.min(1, Math.max(0, (1 - z) * 1.15)), 1.2);
  const fadeIn = z > 0.85 ? (1 - z) / 0.15 : 1;
  return {
    x: hx,
    y: hy,
    size,
    opacity: bright * fadeIn,
    length: Math.max(size, Math.hypot(hx - tx, hy - ty)),
    angle: Math.atan2(hy - cy, hx - cx),
  };
}

function MovingStar({
  star,
  travel,
  speed,
  width,
  height,
}: {
  star: WarpStar;
  travel: SharedValue<number>;
  speed: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => {
    const z = Math.max(0.03, 1 - ((travel.get() * star.speed + star.phase) % 1));
    const p = starAt(star, z, speed.get(), width.get(), height.get());
    // The streak's middle: half its length back from the star, towards the centre.
    const mx = p.x - (Math.cos(p.angle) * p.length) / 2;
    const my = p.y - (Math.sin(p.angle) * p.length) / 2;
    return {
      opacity: p.opacity,
      transform: [
        { translateX: mx - BASE_W / 2 },
        { translateY: my - BASE_H / 2 },
        { rotate: `${p.angle}rad` },
        { scaleX: p.length / BASE_W },
        { scaleY: p.size / BASE_H },
      ],
    };
  });
  // Faint at the tail, the star itself at the head.
  const colors = useMemo(
    () => [withAlpha(star.tint, 0), withAlpha(star.tint, 0.55), star.tint] as const,
    [star.tint],
  );
  return (
    <Animated.View testID="moving-star" style={[styles.streak, style]}>
      <LinearGradient
        colors={colors}
        locations={[0, 0.7, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

interface Fixed {
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
}
/** Distant stars that do not seem to move: dim, so the flight is what catches the eye. */
function deepField(w: number, h: number): Fixed[] {
  const next = random(20261119);
  const n = Math.min(FIELD_MAX, Math.round((w * h) / FIELD_AREA_PER_STAR));
  return Array.from({ length: n }, () => ({
    x: next() * w,
    y: next() * h,
    size: 0.8 + next() * 0.6,
    opacity: 0.12 + next() * 0.3,
    color: tint(next()),
  }));
}

/**
 * The night sky shown while the globe starts (Plans 80–82): a flight through a 3D starfield.
 * It cruises, then speeds up until the near stars streak; when the globe is ready (`leaving`) it
 * drops out of warp, the streaks shrink back to points and the sky fades as the globe travels
 * in. A dim deep field behind keeps the edges from being empty, and a faint glow marks the point
 * the stars come from. With Reduce motion the stars stay still, as points.
 */
export function StarWarp({ leaving }: { leaving: boolean }) {
  const ok = useMotionOk();
  const stars = useMemo(warpStars, []);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const field = useMemo(() => deepField(size.w, size.h), [size]);
  const travel = useSharedValue(0.37);
  const speed = useSharedValue(0);
  const target = useSharedValue(0);
  const ease = useSharedValue(2.2);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(1);
  const [gone, setGone] = useState(false);
  const [words, setWords] = useState(false);

  // Each frame the speed eases towards its target and the stars move on by it.
  const frames = useFrameCallback((frame) => {
    const dt = Math.min(0.05, (frame.timeSincePreviousFrame ?? 16) / 1000);
    const s = speed.get() + (target.get() - speed.get()) * Math.min(1, dt * ease.get());
    speed.set(s);
    travel.set(travel.get() + s * dt * RATE);
  }, false);
  useEffect(() => {
    frames.setActive(ok && !gone);
  }, [ok, gone, frames]);

  // Cruise, then warp; at the end, drop out of warp. Comes back if the globe loads again.
  useEffect(() => {
    if (!leaving) {
      setGone(false);
      opacity.set(1);
      ease.set(2.2);
      target.set(CRUISE);
      const warp = setTimeout(() => target.set(WARP), WARP_AFTER_MS);
      const say = setTimeout(() => setWords(true), WORDS_AFTER_MS);
      return () => {
        clearTimeout(warp);
        clearTimeout(say);
      };
    }
    setWords(false);
    ease.set(6);
    target.set(0);
    opacity.set(withTiming(0, { duration: FADE_MS, easing: Easing.in(Easing.quad) }));
    const timer = setTimeout(() => setGone(true), FADE_MS + 50);
    return () => clearTimeout(timer);
  }, [leaving, opacity, target, ease]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  if (gone) return null;
  const glow = Math.min(size.w, size.h);
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
      {field.map((s, i) => (
        <View
          key={i}
          testID="sky-star"
          style={[
            styles.dot,
            {
              left: s.x,
              top: s.y,
              width: s.size,
              height: s.size,
              borderRadius: s.size / 2,
              backgroundColor: s.color,
              opacity: s.opacity,
            },
          ]}
        />
      ))}
      {/* A faint glow where the stars come from: many very faint circles, so it fades with no
          visible rings (there is no radial gradient to draw it with). */}
      {GLOW_RINGS.map((part) => (
        <View
          key={part}
          style={[
            styles.glow,
            {
              width: glow * part,
              height: glow * part,
              borderRadius: (glow * part) / 2,
              left: size.w / 2 - (glow * part) / 2,
              top: size.h / 2 - (glow * part) / 2,
            },
          ]}
        />
      ))}
      {stars.map((star, i) => (
        <MovingStar
          key={i}
          star={star}
          travel={travel}
          speed={speed}
          width={width}
          height={height}
        />
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
  dot: { position: 'absolute' },
  glow: { position: 'absolute', backgroundColor: COOL, opacity: 0.009 },
  streak: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: BASE_W,
    height: BASE_H,
    borderRadius: BASE_H / 2,
    overflow: 'hidden',
  },
  words: { position: 'absolute', left: 0, right: 0, bottom: spacing.lg, alignItems: 'center' },
  // The globe's own colours: it is dark in every app theme.
  wordsText: { color: WHITE, ...font('text', 500) },
});
