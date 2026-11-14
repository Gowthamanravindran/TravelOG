import Constants from 'expo-constants';
import { PixelRatio } from 'react-native';

/**
 * Images from our Cloudflare R2 bucket, resized at the edge (Plan 53). One original is
 * uploaded; Cloudflare serves WebP/AVIF at the width each slot needs. Widths are rounded
 * up to a few steps so phones share the CDN's cached copies.
 */
export const WIDTH_STEPS = [320, 480, 720, 1080, 1440] as const;

export function stepWidth(px: number): number {
  return WIDTH_STEPS.find((w) => w >= px) ?? WIDTH_STEPS[WIDTH_STEPS.length - 1]!;
}

/** A resize URL for `key`, or null when there's no media bucket configured. */
export function mediaUrlFrom(
  base: string | null | undefined,
  key: string,
  { width, quality = 75 }: { width: number; quality?: number },
): string | null {
  if (!base) return null;
  const root = base.replace(/\/+$/, '');
  return `${root}/cdn-cgi/image/width=${stepWidth(width)},quality=${quality},format=auto/${key.replace(/^\/+/, '')}`;
}

/** The bucket's public base URL from the app config (public value); null until it's set. */
export function mediaBase(): string | null {
  const extra = Constants.expoConfig?.extra as { mediaUrl?: string | null } | undefined;
  return extra?.mediaUrl ?? null;
}

/** A resize URL for a slot `points` wide on this phone. */
export function mediaUrl(key: string, points: number, quality?: number): string | null {
  return mediaUrlFrom(mediaBase(), key, {
    width: Math.ceil(points * PixelRatio.get()),
    quality,
  });
}
