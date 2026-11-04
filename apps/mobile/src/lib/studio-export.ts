import { Directory, File, Paths } from 'expo-file-system';
import { PixelRatio } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import type { CanvasRef } from '@/components/studio/studio-canvas';

/**
 * Exporting Studio slides (Plan 15). Each slide is drawn at `1080 / pixel ratio`
 * points, so one canvas pixel is one screen pixel and the capture is exactly
 * 1080 px wide: what you see in the editor is what gets posted.
 */

/** Longest wait for a slide's photos to finish loading before capturing anyway. */
export const IMAGE_WAIT_MS = 4000;

/** Screen points per canvas pixel for an exact-size capture. */
export function exportScale(): number {
  return 1 / PixelRatio.get();
}

export async function captureSlide(
  ref: { current: CanvasRef | null },
  size: { width: number; height: number },
): Promise<string> {
  if (!ref.current) throw new Error('the slide is not ready yet');
  return captureRef(ref, {
    format: 'jpg',
    quality: 0.92,
    width: size.width,
    height: size.height,
    result: 'tmpfile',
  });
}

/**
 * Keeps the exported slides in the app's documents folder (replacing the last
 * export of this project), so they can be shared again without re-exporting.
 * Returns the kept files in slide order.
 */
export async function keepSlides(projectId: string, tmpUris: readonly string[]): Promise<string[]> {
  const dir = new Directory(Paths.document, 'exports', projectId.replace(/[^\w-]/g, ''));
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true, idempotent: true });
  const stamp = Date.now();
  const kept: string[] = [];
  for (const [i, uri] of tmpUris.entries()) {
    const target = new File(dir, `slide-${String(i + 1).padStart(2, '0')}-${stamp}.jpg`);
    await new File(uri).move(target);
    kept.push(target.uri);
  }
  return kept;
}

/** Waits a couple of frames so layout and text are drawn before a capture. */
export function nextFrames(): Promise<void> {
  return new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}
