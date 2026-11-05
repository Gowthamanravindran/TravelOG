import { fireEvent } from '@testing-library/react-native';

/**
 * Simulated finger drags for PanResponder views (React Native's own responder
 * events): one or two fingers move along a path of steps. Used to test the
 * collage editor's handles without a phone.
 */
type Point = { x: number; y: number };

function history(fingers: { start: Point; prev: Point; cur: Point }[], ts: number) {
  return {
    numberActiveTouches: fingers.length,
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: ts,
    touchBank: fingers.map((f) => ({
      touchActive: true,
      startPageX: f.start.x,
      startPageY: f.start.y,
      startTimeStamp: 1,
      currentPageX: f.cur.x,
      currentPageY: f.cur.y,
      currentTimeStamp: ts,
      previousPageX: f.prev.x,
      previousPageY: f.prev.y,
      previousTimeStamp: ts - 1,
    })),
  };
}

function event(fingers: { start: Point; prev: Point; cur: Point }[], ts: number) {
  const touches = fingers.map((f, i) => ({
    identifier: i,
    pageX: f.cur.x,
    pageY: f.cur.y,
    locationX: f.cur.x,
    locationY: f.cur.y,
    timestamp: ts,
  }));
  return {
    touchHistory: history(fingers, ts),
    nativeEvent: {
      touches,
      changedTouches: touches,
      pageX: touches[0]!.pageX,
      pageY: touches[0]!.pageY,
      timestamp: ts,
    },
  };
}

/** Moves each finger by the given steps (screen points), then lifts. */
export async function drag(
  el: Parameters<typeof fireEvent>[0],
  steps: Point[][],
  starts: Point[] = steps[0]!.map(() => ({ x: 100, y: 100 })),
) {
  let ts = 2;
  let fingers = starts.map((s) => ({ start: s, prev: s, cur: s }));
  await fireEvent(el, 'responderGrant', event(fingers, ts));
  for (const step of steps) {
    ts += 1;
    fingers = fingers.map((f, i) => {
      const d = step[i] ?? { x: 0, y: 0 };
      const cur = { x: f.cur.x + d.x, y: f.cur.y + d.y };
      return { start: f.start, prev: f.cur, cur };
    });
    await fireEvent(el, 'responderMove', event(fingers, ts));
  }
  await fireEvent(el, 'responderRelease', event(fingers, ts + 1));
}
