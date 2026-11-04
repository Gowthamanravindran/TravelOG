import { localToUtcIso } from '@travelog/core';
import type { PhotoInput } from '@travelog/db';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/**
 * Trip photos live in the app's own folder, so the pool keeps working if the
 * original is deleted from the gallery. Uploading to the shared pool is Phase 5.
 */

/** EXIF "2026:11:12 16:05:33" (camera's local time) → UTC ISO in the trip's time zone. */
export function exifTakenAt(
  exif: Record<string, unknown> | null | undefined,
  timeZone: string,
): string | null {
  const raw = exif?.DateTimeOriginal ?? exif?.DateTime;
  if (typeof raw !== 'string') return null;
  const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/.exec(raw);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const offset = exif?.OffsetTimeOriginal;
  if (typeof offset === 'string' && /^[+-]\d{2}:\d{2}$/.test(offset)) {
    const iso = `${y}-${mo}-${d}T${h}:${mi}:00${offset}`;
    return Number.isNaN(Date.parse(iso)) ? null : new Date(iso).toISOString();
  }
  try {
    return localToUtcIso(`${y}-${mo}-${d}`, `${h}:${mi}`, timeZone);
  } catch {
    return null;
  }
}

/** Lets the person pick photos and keeps copies in the app. */
export async function pickPhotos(timeZone: string): Promise<PhotoInput[]> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 30,
    exif: true,
    quality: 1,
  });
  if (picked.canceled) return [];
  const dir = new Directory(Paths.document, 'photos');
  dir.create({ intermediates: true, idempotent: true });
  const out: PhotoInput[] = [];
  for (const [i, asset] of picked.assets.entries()) {
    const ext = (asset.fileName?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const target = new File(dir, `${Date.now()}-${i}.${ext || 'jpg'}`);
    await new File(asset.uri).copy(target);
    out.push({
      localUri: target.uri,
      width: asset.width || null,
      height: asset.height || null,
      takenAt: exifTakenAt(asset.exif, timeZone),
    });
  }
  return out;
}

/** Removes the app's copy of a photo (best effort). */
export function deletePhotoFile(localUri: string | null): void {
  if (!localUri) return;
  try {
    const f = new File(localUri);
    if (f.exists) f.delete();
  } catch {
    // Already gone.
  }
}
