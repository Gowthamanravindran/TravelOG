import {
  resizeLayer,
  rotateHandlePosition,
  rotateWithHandle,
  transformLayer,
  type Corner,
  type GestureDelta,
  type Layer,
  type StudioDoc,
} from '@travelog/core';
import { useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';

import { rotationStyle } from './rotation';

type Guides = { vertical: number[]; horizontal: number[] };
const NO_GUIDES: Guides = { vertical: [], horizontal: [] };

/** Screen points of touch area around the frame, so handles outside it can be grabbed. */
const PAD = 44;
const HANDLE = 30;
const ROTATE_GAP = 34;

interface Props {
  doc: StudioDoc;
  layer: Layer;
  /** Screen points per canvas px. */
  scale: number;
  mode: 'move' | 'crop';
  accent: string;
  photoSize?: { w: number; h: number };
  onLive: (patch: Partial<Layer> | null, guides: Guides) => void;
  onCommit: (patch: Partial<Layer>) => void;
}

/**
 * The selected item (Plan 23), on React Native's own touch system so it works
 * in Expo Go and every build. Drag the frame to move; two fingers pinch and
 * twist; corner handles resize (frames freely, text keeps its shape); the
 * round handle above rotates. In crop mode, drag pans and pinch zooms the photo
 * inside its frame. A change is committed once when the fingers lift.
 */
export function Selection(props: Props) {
  const { layer, scale, mode, accent } = props;
  // Latest props for the touch handlers, which are created once.
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  });

  const [responders] = useState(() => makeResponders(latest));

  const w = layer.w * scale;
  const h = layer.h * scale;
  const corners: { corner: Corner; style: object }[] = [
    { corner: 'tl', style: { left: PAD - HANDLE / 2, top: PAD - HANDLE / 2 } },
    { corner: 'tr', style: { left: PAD + w - HANDLE / 2, top: PAD - HANDLE / 2 } },
    { corner: 'bl', style: { left: PAD - HANDLE / 2, top: PAD + h - HANDLE / 2 } },
    { corner: 'br', style: { left: PAD + w - HANDLE / 2, top: PAD + h - HANDLE / 2 } },
  ];

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: layer.x * scale - PAD,
        top: layer.y * scale - PAD,
        width: w + 2 * PAD,
        height: h + 2 * PAD,
        transform: rotationStyle(layer.rotation),
      }}
    >
      <View
        {...responders.body.panHandlers}
        accessibilityLabel={mode === 'crop' ? 'Cropping photo' : 'Selected item'}
        style={{
          position: 'absolute',
          left: PAD,
          top: PAD,
          width: w,
          height: h,
          borderWidth: 2,
          borderColor: accent,
          opacity: mode === 'crop' ? 0.7 : 1,
        }}
      />
      {mode === 'move' ? (
        <>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: PAD + w / 2 - 1,
              top: PAD - ROTATE_GAP,
              width: 2,
              height: ROTATE_GAP,
              backgroundColor: accent,
            }}
          />
          <View
            {...responders.rotate.panHandlers}
            accessibilityLabel="Rotate"
            style={[
              handleStyle(accent, true),
              { left: PAD + w / 2 - HANDLE / 2, top: PAD - ROTATE_GAP - HANDLE / 2 },
            ]}
          />
          {corners.map(({ corner, style }) => (
            <View
              key={corner}
              {...responders.corners[corner].panHandlers}
              accessibilityLabel={`Resize ${corner}`}
              style={[handleStyle(accent, false), style]}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

function handleStyle(accent: string, round: boolean) {
  return {
    position: 'absolute' as const,
    width: HANDLE,
    height: HANDLE,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    // The visible dot is drawn with a border; the rest is touch area.
    borderRadius: HANDLE / 2,
    borderWidth: round ? 3 : 2,
    borderColor: accent,
    backgroundColor: '#FFFFFF',
    transform: [{ scale: round ? 0.75 : 0.6 }],
  };
}

type Latest = { current: Props };

function makeResponders(latest: Latest) {
  const IDENTITY: GestureDelta = { dx: 0, dy: 0, scale: 1, rotation: 0 };
  let start: Layer | null = null;
  let last: Partial<Layer> | null = null;
  // Movement from earlier phases (a phase ends when the number of fingers changes).
  let acc: GestureDelta = IDENTITY;
  let total: GestureDelta = IDENTITY;
  let phase:
    | { fingers: 1; dx: number; dy: number }
    | { fingers: 2; ids: string; dist: number; angle: number; cx: number; cy: number }
    | null = null;
  // Touch events can arrive faster than the screen draws (120 Hz on many phones):
  // draw at most once per frame, always with the newest position.
  let frame: number | null = null;
  let pending: { patch: Partial<Layer>; guides: Guides } | null = null;
  const flush = () => {
    frame = null;
    if (pending) latest.current.onLive(pending.patch, pending.guides);
    pending = null;
  };

  const begin = () => {
    start = latest.current.layer;
    last = null;
    acc = IDENTITY;
    total = IDENTITY;
    phase = null;
  };
  const show = (patch: Partial<Layer>, guides: Guides = NO_GUIDES) => {
    last = patch;
    pending = { patch, guides };
    if (frame === null) frame = requestAnimationFrame(flush);
  };
  const end = () => {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    pending = null;
    const patch = last;
    start = null;
    last = null;
    phase = null;
    latest.current.onLive(null, NO_GUIDES);
    if (patch && isFinitePatch(patch)) latest.current.onCommit(patch);
  };

  const body = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: begin,
    onPanResponderMove: (e: GestureResponderEvent, g: PanResponderGestureState) => {
      const { doc, scale, mode, photoSize } = latest.current;
      if (!start) return;
      // Android may list the fingers in a different order from one event to the next;
      // sorting by id keeps the twist angle from jumping by 180°.
      const touches: { identifier?: number; pageX: number; pageY: number }[] = [
        ...(e.nativeEvent.touches ?? []),
      ].sort((p, q) => Number(p.identifier ?? 0) - Number(q.identifier ?? 0));
      const fingers = touches.length >= 2 ? 2 : 1;
      let step: GestureDelta;
      if (fingers === 2) {
        const a = touches[0]!;
        const b = touches[1]!;
        const ids = `${a.identifier}:${b.identifier}`;
        const dist = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY) || 1;
        const angle = Math.atan2(b.pageY - a.pageY, b.pageX - a.pageX);
        const cx = (a.pageX + b.pageX) / 2;
        const cy = (a.pageY + b.pageY) / 2;
        if (phase?.fingers !== 2 || phase.ids !== ids) {
          acc = total;
          phase = { fingers: 2, ids, dist, angle, cx, cy };
        }
        step = {
          dx: (cx - phase.cx) / scale,
          dy: (cy - phase.cy) / scale,
          scale: dist / phase.dist,
          rotation: wrapDegrees(((angle - phase.angle) * 180) / Math.PI),
        };
      } else {
        if (phase?.fingers !== 1) {
          acc = total;
          // At the start of the gesture the finger began at its grant point (0, 0);
          // after a two-finger phase, carry on from where the finger is now.
          phase = phase ? { fingers: 1, dx: g.dx, dy: g.dy } : { fingers: 1, dx: 0, dy: 0 };
        }
        step = {
          dx: (g.dx - phase.dx) / scale,
          dy: (g.dy - phase.dy) / scale,
          scale: 1,
          rotation: 0,
        };
      }
      total = {
        dx: acc.dx + step.dx,
        dy: acc.dy + step.dy,
        scale: acc.scale * step.scale,
        rotation: acc.rotation + step.rotation,
      };
      const r = transformLayer(doc, start, total, { mode, snapThreshold: 10 / scale, photoSize });
      show(r.patch, r.guides);
    },
    onPanResponderRelease: end,
    onPanResponderTerminate: end,
  });

  const cornerResponder = (corner: Corner) =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: begin,
      onPanResponderMove: (_e, g) => {
        if (!start) return;
        const { scale } = latest.current;
        show(resizeLayer(start, corner, g.dx / scale, g.dy / scale));
      },
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });

  const rotate = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: begin,
    onPanResponderMove: (_e, g) => {
      if (!start) return;
      const { scale } = latest.current;
      const handle = rotateHandlePosition(start, ROTATE_GAP / scale);
      const pointer = { x: handle.x + g.dx / scale, y: handle.y + g.dy / scale };
      show({ rotation: rotateWithHandle(start, pointer) });
    },
    onPanResponderRelease: end,
    onPanResponderTerminate: end,
  });

  return {
    body,
    rotate,
    corners: {
      tl: cornerResponder('tl'),
      tr: cornerResponder('tr'),
      bl: cornerResponder('bl'),
      br: cornerResponder('br'),
    },
  };
}

/** An angle change as the shortest turn, so crossing ±180° doesn't spin the item. */
function wrapDegrees(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

/** Never commit NaN/Infinity (a bad touch reading must not break the collage). */
function isFinitePatch(patch: Partial<Layer>): boolean {
  return Object.values(patch).every((v) =>
    typeof v === 'number'
      ? Number.isFinite(v)
      : typeof v === 'object' && v !== null
        ? Object.values(v).every((x) => typeof x !== 'number' || Number.isFinite(x))
        : true,
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
  guides: Guides;
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
