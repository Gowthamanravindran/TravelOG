import { fitTemplate } from '@travelog/core';
import { render, screen } from '@testing-library/react-native';

import { StudioCanvas } from '@/components/studio/studio-canvas';

/**
 * Exported slides came out with photos half see-through (owner's phone, Plan 27).
 * Android fades a file photo in over 300 ms after it loads, and the export
 * captures right after the load event, mid-fade. Collage photos must draw at
 * full opacity straight away.
 */
it('collage photos draw without a fade-in, so a capture is never half see-through', async () => {
  let n = 0;
  const doc = fitTemplate('bridge', 'post', ['p1', 'p2', 'p3'], () => `id${++n}`, 'Goa');
  const photos = Object.fromEntries(
    ['p1', 'p2', 'p3'].map((id) => [id, { uri: `file:///${id}.jpg`, width: 4000, height: 3000 }]),
  );
  await render(<StudioCanvas doc={doc} scale={0.3} photos={photos} slide={0} />);
  const images: { props: Record<string, unknown> }[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const el = node as { type?: string; props: Record<string, unknown>; children?: unknown[] };
    if (el.type === 'Image') images.push(el);
    el.children?.forEach(walk);
  };
  walk(screen.toJSON());
  expect(images.length).toBeGreaterThan(0);
  for (const img of images) expect(img.props.fadeDuration).toBe(0);
});
