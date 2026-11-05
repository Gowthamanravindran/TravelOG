import { transformLayer, type Layer, type StudioDoc } from '@travelog/core';
import { useRef } from 'react';
import { View } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useRotationGesture,
  useSimultaneousGestures,
} from 'react-native-gesture-handler';

interface Live {
  dx: number;
  dy: number;
  scale: number;
  rotation: number;
}

/**
 * The selected layer's touch area: one finger drags, two fingers pinch and
 * twist, all at once. In crop mode the same gestures pan and zoom the photo
 * inside its frame. While fingers are down the editor shows a live preview
 * (`onLive`); when they lift, the change is committed once (one undo step).
 */
export function Selection({
  doc,
  layer,
  scale,
  mode,
  accent,
  photoSize,
  onLive,
  onCommit,
}: {
  doc: StudioDoc;
  layer: Layer;
  /** Screen points per canvas px. */
  scale: number;
  mode: 'move' | 'crop';
  accent: string;
  photoSize?: { w: number; h: number };
  onLive: (
    patch: Partial<Layer> | null,
    guides: { vertical: number[]; horizontal: number[] },
  ) => void;
  onCommit: (patch: Partial<Layer>) => void;
}) {
  const start = useRef<Layer>(layer);
  const live = useRef<Live>({ dx: 0, dy: 0, scale: 1, rotation: 0 });
  const started = useRef({ pan: false, pinch: false, rotate: false });
  const last = useRef<Partial<Layer> | null>(null);

  const compute = () => {
    const r = transformLayer(doc, start.current, live.current, {
      mode,
      snapThreshold: 10 / scale,
      photoSize,
    });
    last.current = r.patch;
    onLive(r.patch, r.guides);
  };
  type Kind = keyof typeof started.current;
  const anyStarted = () => Object.values(started.current).some(Boolean);
  const begin = (kind: Kind) => {
    if (!anyStarted()) {
      start.current = layer;
      live.current = { dx: 0, dy: 0, scale: 1, rotation: 0 };
      last.current = null;
    }
    started.current[kind] = true;
  };
  // Commits once, when the last finger gesture that actually started ends.
  const end = (kind: Kind) => {
    if (!started.current[kind]) return;
    started.current[kind] = false;
    if (anyStarted()) return;
    const patch = last.current;
    onLive(null, { vertical: [], horizontal: [] });
    if (patch) onCommit(patch);
  };

  const pan = usePanGesture({
    runOnJS: true,
    maxPointers: 2,
    onActivate: () => begin('pan'),
    onUpdate: (e) => {
      live.current.dx = e.translationX / scale;
      live.current.dy = e.translationY / scale;
      compute();
    },
    onFinalize: () => end('pan'),
  });
  const pinch = usePinchGesture({
    runOnJS: true,
    onActivate: () => begin('pinch'),
    onUpdate: (e) => {
      live.current.scale = e.scale;
      compute();
    },
    onFinalize: () => end('pinch'),
  });
  const rotate = useRotationGesture({
    runOnJS: true,
    enabled: mode === 'move',
    onActivate: () => begin('rotate'),
    onUpdate: (e) => {
      live.current.rotation = (e.rotation * 180) / Math.PI;
      compute();
    },
    onFinalize: () => end('rotate'),
  });
  const gesture = useSimultaneousGestures(pan, pinch, rotate);

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessibilityLabel={mode === 'crop' ? 'Cropping photo' : 'Selected item'}
        style={{
          position: 'absolute',
          left: layer.x * scale,
          top: layer.y * scale,
          width: layer.w * scale,
          height: layer.h * scale,
          transform: layer.rotation ? [{ rotate: `${layer.rotation}deg` }] : undefined,
          borderWidth: 2,
          borderColor: accent,
          opacity: mode === 'crop' ? 0.6 : 1,
        }}
      />
    </GestureDetector>
  );
}

/** Snap guide lines across the canvas. */
export function Guides({
  guides,
  scale,
  width,
  height,
  color,
}: {
  guides: { vertical: number[]; horizontal: number[] };
  scale: number;
  width: number;
  height: number;
  color: string;
}) {
  return (
    <>
      {guides.vertical.map((x) => (
        <View
          key={`v${x}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: x * scale,
            top: 0,
            width: 1,
            height: height * scale,
            backgroundColor: color,
          }}
        />
      ))}
      {guides.horizontal.map((y) => (
        <View
          key={`h${y}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: y * scale,
            left: 0,
            height: 1,
            width: width * scale,
            backgroundColor: color,
          }}
        />
      ))}
    </>
  );
}
