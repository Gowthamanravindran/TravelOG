import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { layerAt, StarWarp, warpLayers } from '@/components/star-warp';

// The night sky while the globe starts (Plans 80–83): a 3D flight through the stars. Stars at
// one depth share a layer, and a layer zooms out from the middle as it comes closer, which is
// how perspective moves them; each frame updates only the layers (Plan 83: 180 separately
// animated stars ran far too slowly on the owner's phone).

const W = 390;
const H = 470;

describe('one layer of stars in the flight', () => {
  it('a near layer is drawn larger and brighter than a far one', () => {
    const far = layerAt(0.9, 0.5);
    const near = layerAt(0.15, 0.5);
    expect(near.scale).toBeGreaterThan(far.scale * 4);
    expect(near.opacity).toBeGreaterThan(far.opacity);
  });

  it('a layer just come round from far away is faint, so its stars never pop in', () => {
    expect(layerAt(0.99, 0.5).opacity).toBeLessThan(0.1);
  });

  it('streaks show at warp and are gone at a stop, leaving points', () => {
    expect(layerAt(0.3, 0.5).streaks).toBeGreaterThan(0.9);
    expect(layerAt(0.3, 0).streaks).toBe(0);
    expect(layerAt(0.3, 0).opacity).toBeGreaterThan(0.5);
  });
});

describe('the whole flight', () => {
  it('no streak is drawn near the middle, only once a star is out to the side (Plan 84)', () => {
    const streaked = warpLayers().flatMap((l) => l.stars.filter((s) => s.streak === true));
    expect(streaked.length).toBeGreaterThan(150);
    const near: string[] = [];
    for (let t = 0; t < 2; t += 0.01) {
      for (const layer of warpLayers()) {
        const at = layerAt(layer.depthAt(t), 0.5);
        if (at.opacity * at.streaks < 0.01) continue;
        for (const s of layer.stars.filter((x) => x.streak)) {
          const out = Math.hypot(s.x * (W / 2) * at.scale, s.y * (H / 2) * at.scale);
          if (out < 0.2 * Math.min(W, H)) near.push(`${t.toFixed(2)}: ${out.toFixed(0)} pt`);
        }
      }
    }
    expect(near).toEqual([]);
  });

  it('stars near the middle still show, as points', () => {
    const middle = warpLayers().flatMap((l) => l.stars.filter((s) => s.streak === false));
    expect(middle.length).toBeGreaterThan(10);
  });

  it('fills the sky: every quarter has stars, and some are out near the edges', () => {
    const shown = warpLayers().flatMap((layer) => {
      const { scale, opacity } = layerAt(layer.depthAt(0.37), 0.5);
      return layer.stars
        .map((s) => ({ x: W / 2 + s.x * (W / 2) * scale, y: H / 2 + s.y * (H / 2) * scale }))
        .filter((p) => opacity > 0.05 && p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H);
    });
    for (const [x0, y0] of [
      [0, 0],
      [W / 2, 0],
      [0, H / 2],
      [W / 2, H / 2],
    ] as const) {
      const n = shown.filter((p) => p.x >= x0 && p.x < x0 + W / 2 && p.y >= y0 && p.y < y0 + H / 2);
      expect(n.length).toBeGreaterThan(shown.length / 10);
    }
    const edge = shown.filter((p) => Math.hypot(p.x - W / 2, p.y - H / 2) > 0.3 * Math.hypot(W, H));
    expect(edge.length).toBeGreaterThan(shown.length / 8);
  });
});

async function sky() {
  await render(<StarWarp leaving={false} />);
  await fireEvent(screen.getByTestId('star-warp'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: W, height: H } },
  });
}

describe('the night sky while the globe starts', () => {
  it('flies through plenty of stars, but moves only a few layers each frame', async () => {
    await sky();
    expect(screen.getAllByTestId('moving-star').length).toBeGreaterThanOrEqual(150);
    // Each layer is two moving parts (its points and its streaks).
    expect(screen.getAllByTestId('star-layer').length).toBeLessThanOrEqual(30);
  });

  it('has no fixed bright stars on top; the deep field behind is dim and reaches the edges', async () => {
    await sky();
    expect(screen.queryAllByTestId('bright-star')).toHaveLength(0);
    const field = screen
      .getAllByTestId('sky-star')
      .map((v) => StyleSheet.flatten(v.props.style) as { left: number; opacity: number });
    expect(field.length).toBeGreaterThanOrEqual(100);
    expect(Math.max(...field.map((s) => s.opacity))).toBeLessThanOrEqual(0.45);
    expect(Math.min(...field.map((s) => s.left))).toBeLessThan(W * 0.05);
    expect(Math.max(...field.map((s) => s.left))).toBeGreaterThan(W * 0.95);
  });
});
