import { Directory, File, Paths } from 'expo-file-system';

/** Lets the user pick a ticket (PDF/photo) and keeps a copy in the app's documents folder. */
export async function pickAttachment(): Promise<{
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  localUri: string;
} | null> {
  const picked = await File.pickFileAsync();
  if (picked.canceled || !picked.result) return null;
  const source = picked.result;
  const dir = new Directory(Paths.document, 'attachments');
  dir.create({ intermediates: true, idempotent: true });
  const name = source.name || 'ticket';
  const target = new File(dir, `${Date.now()}-${name.replace(/[^\w.\-]+/g, '_')}`);
  await source.copy(target);
  return {
    name,
    mimeType: source.type || null,
    sizeBytes: source.size ?? null,
    localUri: target.uri,
  };
}

/** Opens a stored attachment in the phone's viewer. */
export async function openAttachment(localUri: string): Promise<void> {
  await new File(localUri).preview();
}
