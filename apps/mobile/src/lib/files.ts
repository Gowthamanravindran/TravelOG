import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const EXTENSIONS: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  gif: 'image/gif',
  txt: 'text/plain',
  html: 'text/html',
  htm: 'text/html',
};
const EXTENSION_FOR: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/gif': 'gif',
};

const startsWith = (head: Uint8Array, bytes: number[], at = 0) =>
  bytes.every((b, i) => head[at + i] === b);

/**
 * A file's type from its name, else from its first bytes (Plan 34). Files shared
 * from mail or booking apps often have no extension, and Android can't open a file
 * whose type it doesn't know.
 */
export function mimeFor(name: string, head?: Uint8Array): string | null {
  const ext = /\.([a-z0-9]{2,5})$/i.exec(name)?.[1]?.toLowerCase();
  if (ext && EXTENSIONS[ext]) return EXTENSIONS[ext];
  if (!head) return null;
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46])) return 'application/pdf'; // %PDF
  if (startsWith(head, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47])) return 'image/png';
  if (startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8))
    return 'image/webp';
  if (startsWith(head, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  return null;
}

const usable = (mime: string | null | undefined) =>
  !!mime && /^[\w.+-]+\/[\w.+-]+$/.test(mime) && mime !== 'application/octet-stream';

/** The first bytes of a file, or undefined when it can't be read. */
function headOf(file: File): Uint8Array | undefined {
  try {
    const handle = file.open();
    try {
      return handle.readBytesSync(16);
    } finally {
      handle.close();
    }
  } catch {
    return undefined;
  }
}

export interface PickedFile {
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  localUri: string;
}

/** Copies a picked file into the app's attachments folder, keeping an extension (Plan 34). */
async function keepCopy(source: File, n = 0): Promise<PickedFile> {
  const dir = new Directory(Paths.document, 'attachments');
  dir.create({ intermediates: true, idempotent: true });
  const name = source.name || 'ticket';
  const mimeType = usable(source.type) ? source.type : mimeFor(name, headOf(source));
  const hasExt = /\.[a-z0-9]{2,5}$/i.test(name);
  const ext = !hasExt && mimeType && EXTENSION_FOR[mimeType] ? `.${EXTENSION_FOR[mimeType]}` : '';
  const target = new File(dir, `${Date.now()}-${n}-${name.replace(/[^\w.\-]+/g, '_')}${ext}`);
  await source.copy(target);
  return { name, mimeType: mimeType || null, sizeBytes: source.size ?? null, localUri: target.uri };
}

/** Lets the user pick a ticket (PDF/photo) and keeps a copy in the app's documents folder. */
export async function pickAttachment(): Promise<PickedFile | null> {
  const picked = await File.pickFileAsync();
  if (picked.canceled || !picked.result) return null;
  return keepCopy(picked.result);
}

export const MAX_UPLOADS = 10;

/**
 * Several tickets at once (Plan 39), at most `max`: the rest are left out and
 * `truncated` says so. Null when the person cancels.
 */
export async function pickAttachments(
  max = MAX_UPLOADS,
): Promise<{ files: PickedFile[]; truncated: boolean } | null> {
  const picked = await File.pickFileAsync({ multipleFiles: true });
  if (picked.canceled || !picked.result) return null;
  const all = Array.isArray(picked.result) ? picked.result : [picked.result];
  if (!all.length) return null;
  const files: PickedFile[] = [];
  for (const [n, f] of all.slice(0, max).entries()) files.push(await keepCopy(f, n));
  return { files, truncated: all.length > max };
}

/**
 * Opens a stored attachment in the phone's viewer, telling it the file's type.
 * If no app can show it, the share sheet lets the person pick one.
 */
export async function openAttachment(attachment: {
  localUri: string;
  mimeType?: string | null;
  name?: string | null;
}): Promise<void> {
  const file = new File(attachment.localUri);
  const mimeType = usable(attachment.mimeType)
    ? attachment.mimeType!
    : (mimeFor(attachment.name ?? file.name ?? '', headOf(file)) ?? 'application/pdf');
  try {
    await file.preview({ mimeType, title: attachment.name ?? undefined });
  } catch (e) {
    if (!(await Sharing.isAvailableAsync())) throw e;
    await Sharing.shareAsync(attachment.localUri, {
      mimeType,
      dialogTitle: attachment.name ?? undefined,
    });
  }
}
