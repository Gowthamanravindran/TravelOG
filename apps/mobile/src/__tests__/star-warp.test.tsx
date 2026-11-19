import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { StarWarp, starAt, warpStars } from '@/components/star-warp';

// The night sky while the globe starts (Plans 80–82): a true 3D starfield. Each star has a
// depth; near stars are bigger, brighter and streak, far ones are faint points near the middle.

const W = 390;
const H = 470;
const star = { x: 0.4, y: -0.3, phase: 0, speed: 1, tint: 'white' };

describe('one star in the flight (Plan 82)', () => {
  it('a near star is bigger, brighter and streaks longer than a far one', () => {
    const far = starAt(star, 0.9, 0.5, W, H);
    const near = starAt(star, 0.15, 0.5, W, H);
    expect(near.size).toBeGreaterThan(far.size);
    expect(near.opacity).toBeGreaterThan(far.opacity);
    expect(near.length).toBeGreaterThan(far.length * 3);
  });

  it('a far star sits near the middle; the same star near is far out', () => {
    const far = starAt(star, 0.9, 0.5, W, H);
    const near = starAt(star, 0.15, 0.5, W, H);
    const out = (p: { x: number; y: number }) => Math.hypot(p.x - W / 2, p.y - H / 2);
    expect(out(far)).toBeLessThan(out(near));
  });

  it('streaks point away from the middle', () => {
    const p = starAt(star, 0.3, 0.5, W, H);
    expect(p.angle).toBeCloseTo(Math.atan2(p.y - H / 2, p.x - W / 2), 5);
  });

  it('at a stop the streaks shrink back to points', () => {
    const p = starAt(star, 0.3, 0, W, H);
    expect(p.length).toBeLessThanOrEqual(p.size + 0.001);
  });

  it('a star just come round from far away is faint, so it never pops in', () => {
    expect(starAt(star, 0.99, 0.5, W, H).opacity).toBeLessThan(0.1);
  });
});

describe('the whole flight', () => {
  it('fills the sky: every quarter has stars, and some are out near the edges', () => {
    const at = warpStars().map((s) => starAt(s, 1 - ((0.37 * s.speed + s.phase) % 1), 0.5, W, H));
    const shown = at.filter(
      (p) => p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H && p.opacity > 0.05,
    );
    for (const [x0, y0] of [
      [0, 0],
      [W / 2, 0],
      [0, H / 2],
      [W / 2, H / 2],
    ] as const) {
      const n = shown.filter((p) => p.x >= x0 && p.x < x0 + W / 2 && p.y >= y0 && p.y < y0 + H / 2);
      expect(n.length).toBeGreaterThan(shown.length / 10);
    }
    expect(shown.some((p) => Math.hypot(p.x - W / 2, p.y - H / 2) > 0.4 * Math.hypot(W, H))).toBe(
      true,
    );
  });
});

async function sky() {
  await render(<StarWarp leaving={false} />);
  await fireEvent(screen.getByTestId('star-warp'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: W, height: H } },
  });
}

describe('the night sky while the globe starts', () => {
  it('flies through plenty of stars', async () => {
    await sky();
    expect(screen.getAllByTestId('moving-star').length).toBeGreaterThanOrEqual(120);
  });

  it('has no fixed bright stars on top; the deep field behind is dim and reaches the edges', async () => {
    await sky();
    expect(screen.queryAllByTestId('bright-star')).toHaveLength(0);
    const field = screen
      .getAllByTestId('sky-star')
      .map(
        (v) => StyleSheet.flatten(v.props.style) as { left: number; top: number; opacity: number },
      );
    expect(field.length).toBeGreaterThanOrEqual(150);
    expect(Math.max(...field.map((s) => s.opacity))).toBeLessThanOrEqual(0.45);
    expect(Math.min(...field.map((s) => s.left))).toBeLessThan(W * 0.05);
    expect(Math.max(...field.map((s) => s.left))).toBeGreaterThan(W * 0.95);
  });
});
