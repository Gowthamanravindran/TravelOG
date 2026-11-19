import { defaultTheme } from '@travelog/globe';
import { font, spacing, type } from '@travelog/ui';
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

/** The flight: layers of stars, each layer at one depth. */
const LAYERS = 12;
const PER_LAYER = 18;
/** How wide the field is: larger spreads the stars further out, so the edges stay full. */
const NEAR = 0.35;
/** How far off the line of flight stars can be. */
const SPREAD = 1.6;
/** The nearest a layer comes before it has passed: its stars are then drawn full size. */
const Z_MIN = 0.12;
/** Stars are drawn at their nearest, and a layer is scaled down by its distance. */
const SCALE_MAX = NEAR / Z_MIN;
/** At the nearest: a star's size and its streak's length, in points. */
const STAR_SIZE = 3.8;
const STREAK = 72;
/**
 * No streaks near the middle (the owner's call, Plan 84): a star streaks only if it is at least
 * this far off the line of flight, and a layer's streaks fade in only once it has spread out
 * (its zoom from `STREAKS_FROM` to `STREAKS_FROM + STREAKS_RAMP`).
 */
const STREAK_FROM_MIDDLE = 0.75;
const STREAKS_FROM = 0.55;
const STREAKS_RAMP = 0.25;
/** Depth travelled per second at speed 1. */
const RATE = 0.6;
/** Cruising at first, then up to warp, where the stars streak. */
const CRUISE = 0.18;
const WARP = 0.5;
const WARP_AFTER_MS = 700;
/** One dim deep-field star per this many square points, so the edges are never empty. */
const FIELD_AREA_PER_STAR = 1400;
const FIELD_MAX = 200;
const FADE_MS = 600;
/** The words only show if the globe is slow to come. */
const WORDS_AFTER_MS = 3000;
/** The glow's circles, as parts of the sky's shorter side. */
const GLOW_RINGS = Array.from({ length: 18 }, (_, i) => 0.95 - i * 0.048);

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

/** A layer's depth (1 far, `Z_MIN` near) once the flight has gone `travel`. */
function depth(travel: number, phase: number, speed: number): number {
  'worklet';
  return Z_MIN + (1 - Z_MIN) * (1 - ((travel * speed + phase) % 1));
}

export interface WarpStar {
  /** Across and up, about −1.6 to 1.6: where the star is off the line of flight. */
  x: number;
  y: number;
  /** Its size and brightness against the others, 0.6–1. */
  size: number;
  bright: number;
  tint: string;
  /** False for stars near the line of flight: they stay points. */
  streak: boolean;
}
export interface WarpLayer {
  phase: number;
  /** Its own speed, so the layers part a little (parallax). */
  speed: number;
  stars: WarpStar[];
  depthAt: (travel: number) => number;
}

/** The same flight every time: a fixed seed. Layers are spread evenly through the depth. */
export function warpLayers(): WarpLayer[] {
  const next = random(11);
  return Array.from({ length: LAYERS }, (_, i) => {
    const phase = i / LAYERS + next() * 0.05;
    const speed = 0.85 + next() * 0.3;
    return {
      phase,
      speed,
      depthAt: (travel: number) => depth(travel, phase, speed),
      stars: Array.from({ length: PER_LAYER }, () => {
        const x = (next() * 2 - 1) * SPREAD;
        const y = (next() * 2 - 1) * SPREAD;
        return {
          x,
          y,
          size: 0.6 + next() * 0.4,
          bright: 0.7 + next() * 0.3,
          tint: tint(next()),
          streak: Math.hypot(x, y) >= STREAK_FROM_MIDDLE,
        };
      }),
    };
  });
}

/**
 * How a layer of stars at depth `z` is drawn while flying at `speed` (Plan 83). `scale` is the
 * perspective factor: a star's offset from the middle is its place times this, so far layers
 * sit near the middle and near ones spread past the edges, their stars growing as they come.
 * Far layers fade in, so stars never pop in, and the nearest fade as they pass. `streaks` is
 * how much the streaks show: fully at warp, not at all at a stop, and not while the layer is
 * still gathered near the middle.
 */
export function layerAt(z: number, speed: number) {
  'worklet';
  const bright = Math.pow(Math.min(1, Math.max(0, (1 - z) * 1.15)), 1.2);
  const fadeIn = z > 0.85 ? (1 - z) / 0.15 : 1;
  const fadeOut = Math.min(1, (z - Z_MIN) / 0.05);
  const scale = NEAR / z;
  const spread = Math.min(1, Math.max(0, (scale - STREAKS_FROM) / STREAKS_RAMP));
  return {
    scale,
    opacity: Math.max(0, bright * fadeIn * fadeOut),
    streaks: Math.min(1, Math.max(0, speed / WARP)) * spread,
  };
}

/**
 * One layer: its points and its streaks, each one view moved as a whole. The stars inside are
 * drawn once, at their nearest, and never move by themselves; only the layer's zoom and
 * opacity change each frame, which the phone does cheaply.
 */
function Layer({
  layer,
  travel,
  speed,
  w,
  h,
}: {
  layer: WarpLayer;
  travel: SharedValue<number>;
  speed: SharedValue<number>;
  w: number;
  h: number;
}) {
  const { phase, speed: own } = layer;
  const points = useAnimatedStyle(() => {
    const at = layerAt(depth(travel.get(), phase, own), speed.get());
    return { opacity: at.opacity, transform: [{ scale: at.scale / SCALE_MAX }] };
  });
  const streaks = useAnimatedStyle(() => {
    const at = layerAt(depth(travel.get(), phase, own), speed.get());
    return { opacity: at.opacity * at.streaks, transform: [{ scale: at.scale / SCALE_MAX }] };
  });
  const placed = useMemo(
    () =>
      layer.stars.map((s) => {
        const dx = s.x * (w / 2) * SCALE_MAX;
        const dy = s.y * (h / 2) * SCALE_MAX;
        return { ...s, x: w / 2 + dx, y: h / 2 + dy, angle: Math.atan2(dy, dx) };
      }),
    [layer, w, h],
  );
  return (
    <>
      <Animated.View testID="star-layer" style={[StyleSheet.absoluteFill, streaks]}>
        {placed.map((s, i) => {
          if (!s.streak) return null;
          const length = STREAK * s.size;
          const thick = STAR_SIZE * s.size;
          return (
            <View
              key={i}
              style={[
                styles.streak,
                {
                  width: length,
                  height: thick,
                  borderRadius: thick / 2,
                  opacity: s.bright,
                  // Its head at the star, its tail back towards the middle.
                  left: s.x - (Math.cos(s.angle) * length) / 2 - length / 2,
                  top: s.y - (Math.sin(s.angle) * length) / 2 - thick / 2,
                  transform: [{ rotate: `${s.angle}rad` }],
                },
              ]}
            >
              {/* Faint along its length, brighter towards the star: two plain shapes, as a
                  gradient view for each of 200 streaks cost too much to draw (Plan 89). */}
              <View style={[styles.tail, { backgroundColor: s.tint }]} />
              <View style={[styles.tailNear, { backgroundColor: s.tint }]} />
            </View>
          );
        })}
      </Animated.View>
      <Animated.View testID="star-layer" style={[StyleSheet.absoluteFill, points]}>
        {placed.map((s, i) => {
          const size = STAR_SIZE * s.size;
          return (
            <View
              key={i}
              testID="moving-star"
              style={[
                styles.dot,
                {
                  left: s.x - size / 2,
                  top: s.y - size / 2,
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: s.tint,
                  opacity: s.bright,
                },
              ]}
            />
          );
        })}
      </Animated.View>
    </>
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
 * The night sky shown while the globe starts (Plans 80–83): a flight through a 3D starfield.
 * It cruises, then speeds up until the near stars streak; when the globe is ready (`leaving`) it
 * drops out of warp, the streaks shrink back to points and the sky fades as the globe travels
 * in. A dim deep field behind keeps the edges from being empty, and a faint glow marks the point
 * the stars come from. With Reduce motion the stars stay still, as points.
 */
export function StarWarp({
  leaving,
  paused = false,
}: {
  leaving: boolean;
  /** Out of sight: the flight stops, so it costs nothing behind another screen (Plan 89). */
  paused?: boolean;
}) {
  const ok = useMotionOk();
  const layers = useMemo(warpLayers, []);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const field = useMemo(() => deepField(size.w, size.h), [size]);
  const travel = useSharedValue(0.37);
  const speed = useSharedValue(0);
  const target = useSharedValue(0);
  const ease = useSharedValue(2.2);
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
    frames.setActive(ok && !gone && !paused);
  }, [ok, gone, paused, frames]);

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
      {size.w > 0
        ? layers.map((layer, i) => (
            <Layer key={i} layer={layer} travel={travel} speed={speed} w={size.w} h={size.h} />
          ))
        : null}
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
  streak: { position: 'absolute', overflow: 'hidden' },
  tail: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, opacity: 0.22 },
  tailNear: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '40%', opacity: 0.6 },
  words: { position: 'absolute', left: 0, right: 0, bottom: spacing.lg, alignItems: 'center' },
  // The globe's own colours: it is dark in every app theme.
  wordsText: { color: WHITE, ...font('text', 500) },
});
