import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/**
 * Posting Studio slides (Plan 15). Instagram and Facebook don't let other apps
 * post for personal accounts, so slides are handed to their apps, ready to post:
 * - Android: all slides open in Instagram's new-post screen / Facebook's share screen.
 * - iPhone: slides are saved to Photos in order and Instagram's library opens.
 * The native part is the local module in apps/mobile/modules/social-share; on an
 * older build without it, everything falls back to the system share sheet.
 */

interface SocialShareNative {
  // Android
  isInstalled?: (packageName: string) => boolean;
  saveToGallery?: (fileUris: string[]) => Promise<boolean>;
  // iOS
  canOpen?: (scheme: string) => Promise<boolean>;
  saveToPhotos?: (fileUris: string[]) => Promise<string[]>;
  openInstagramLibrary?: (localIdentifier: string) => Promise<boolean>;
  // Both
  shareImages: (fileUris: string[], packageName?: string | null) => Promise<boolean>;
  shareToInstagramStory: (fileUri: string, appId: string) => Promise<boolean>;
}

const native = requireOptionalNativeModule<SocialShareNative>('SocialShare');

const INSTAGRAM = 'com.instagram.android';
const FACEBOOK = 'com.facebook.katana';

/** Meta App ID, needed only for Instagram Stories (docs/14 §12). */
export function facebookAppId(): string | null {
  const id = Constants.expoConfig?.extra?.facebookAppId;
  return typeof id === 'string' && id ? id : null;
}

export interface ShareTargets {
  /** False on an older app build: only the share sheet works. */
  native: boolean;
  instagram: boolean;
  facebook: boolean;
  story: boolean;
}

export async function shareTargets(): Promise<ShareTargets> {
  if (!native) return { native: false, instagram: false, facebook: false, story: false };
  const appId = facebookAppId();
  if (Platform.OS === 'android') {
    const instagram = native.isInstalled?.(INSTAGRAM) ?? false;
    return {
      native: true,
      instagram,
      facebook: native.isInstalled?.(FACEBOOK) ?? false,
      story: instagram && !!appId,
    };
  }
  const [instagram, stories, facebook] = await Promise.all([
    native.canOpen?.('instagram') ?? false,
    native.canOpen?.('instagram-stories') ?? false,
    native.canOpen?.('fb') ?? false,
  ]);
  return { native: true, instagram, facebook, story: stories && !!appId };
}

export type PostResult = 'opened' | 'saved-and-opened' | 'saved' | 'shared';

async function fallbackShare(files: readonly string[]): Promise<PostResult> {
  const first = files[0];
  if (!first || !(await Sharing.isAvailableAsync()))
    throw new Error('sharing is not available here');
  await Sharing.shareAsync(first, { mimeType: 'image/jpeg', dialogTitle: 'Share your trip' });
  return 'shared';
}

/** Instagram post with every slide (a carousel). */
export async function postToInstagram(files: readonly string[]): Promise<PostResult> {
  if (!native) return fallbackShare(files);
  if (Platform.OS === 'android') {
    await native.shareImages([...files], INSTAGRAM);
    return 'opened';
  }
  const ids = (await native.saveToPhotos?.([...files])) ?? [];
  if (!ids.length) throw new Error('allow TravelOG to add photos in Settings, then try again');
  const opened = ids[0] ? await native.openInstagramLibrary?.(ids[0]) : false;
  return opened ? 'saved-and-opened' : 'saved';
}

/** Instagram Story with one slide. */
export async function postStory(file: string): Promise<PostResult> {
  const appId = facebookAppId();
  if (!native || !appId) throw new Error('Instagram Stories needs the Meta App ID (docs/14 §12)');
  const ok = await native.shareToInstagramStory(file, appId);
  if (!ok) throw new Error('Instagram is not installed');
  return 'opened';
}

/** Facebook with every slide. */
export async function postToFacebook(files: readonly string[]): Promise<PostResult> {
  if (!native) return fallbackShare(files);
  await native.shareImages([...files], Platform.OS === 'android' ? FACEBOOK : null);
  return 'opened';
}

/** Saves every slide to the phone's gallery, in order. */
export async function saveAll(files: readonly string[]): Promise<PostResult> {
  if (native?.saveToGallery) {
    if (await native.saveToGallery([...files])) return 'saved';
  } else if (native?.saveToPhotos) {
    const ids = await native.saveToPhotos([...files]);
    if (ids.length) return 'saved';
    throw new Error('allow TravelOG to add photos in Settings, then try again');
  }
  // Older Android or older app build: the share sheet has "Save image".
  return shareAll(files);
}

/** The system share sheet with every slide (WhatsApp, Drive, more). */
export async function shareAll(files: readonly string[]): Promise<PostResult> {
  if (!native) return fallbackShare(files);
  await native.shareImages([...files], null);
  return 'shared';
}
