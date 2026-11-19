import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { StarWarp } from '@/components/star-warp';

// The night sky while the globe starts (Plans 80, 81): full to the edges, not only a stream of
// white dots from the middle, with some brighter stars among them.

const W = 390;
const H = 470;

async function sky() {
  await render(<StarWarp leaving={false} />);
  await fireEvent(screen.getByTestId('star-warp'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: W, height: H } },
  });
}
const place = (id: string) =>
  screen
    .getAllByTestId(id)
    .map((v) => StyleSheet.flatten(v.props.style) as { left: number; top: number });

describe('the night sky while the globe starts', () => {
  it('is full of stars, out to every edge', async () => {
    await sky();
    const field = place('sky-star');
    expect(field.length).toBeGreaterThanOrEqual(180);
    const xs = field.map((s) => s.left);
    const ys = field.map((s) => s.top);
    expect(Math.min(...xs)).toBeLessThan(W * 0.05);
    expect(Math.max(...xs)).toBeGreaterThan(W * 0.95);
    expect(Math.min(...ys)).toBeLessThan(H * 0.05);
    expect(Math.max(...ys)).toBeGreaterThan(H * 0.95);
    // Every quarter of the sky has its share.
    for (const [x0, y0] of [
      [0, 0],
      [W / 2, 0],
      [0, H / 2],
      [W / 2, H / 2],
    ] as const) {
      const n = field.filter(
        (s) => s.left >= x0 && s.left < x0 + W / 2 && s.top >= y0 && s.top < y0 + H / 2,
      ).length;
      expect(n).toBeGreaterThan(field.length / 8);
    }
  });

  it('has some brighter stars, not all one kind of dot', async () => {
    await sky();
    expect(screen.getAllByTestId('bright-star').length).toBeGreaterThanOrEqual(8);
  });

  it('still streams stars outward, more of them than before', async () => {
    await sky();
    expect(screen.getAllByTestId('moving-star').length).toBeGreaterThanOrEqual(90);
  });
});
