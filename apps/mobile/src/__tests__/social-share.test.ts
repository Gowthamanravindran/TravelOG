import { Platform } from 'react-native';

const mockNative = {
  isInstalled: jest.fn((pkg: string) => pkg === 'com.instagram.android'),
  saveToGallery: jest.fn(async () => true),
  openInstagramFeed: jest.fn(async (): Promise<'feed' | 'chooser' | 'none'> => 'feed'),
  launchApp: jest.fn(() => true),
  canOpen: jest.fn(async (scheme: string) => scheme !== 'fb'),
  saveToPhotos: jest.fn(async (uris: string[]) => uris.map((_, i) => `asset-${i}`)),
  openInstagramLibrary: jest.fn(async () => true),
  shareImages: jest.fn(async () => true),
  shareToInstagramStory: jest.fn(async () => true),
};
let mockHasNative = true;
jest.mock('expo', () => ({
  requireOptionalNativeModule: () => (mockHasNative ? mockNative : null),
}));
let mockAppId: string | null = '1234';
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: { facebookAppId: mockAppId } };
    },
  },
}));
const mockShareAsync = jest.fn(async () => undefined);
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: (...a: unknown[]) => mockShareAsync(...(a as [])),
}));

const files = ['file:///s1.jpg', 'file:///s2.jpg', 'file:///s3.jpg'];

function load() {
  let mod!: typeof import('@/lib/social-share');
  jest.isolateModules(() => {
    mod = require('@/lib/social-share');
  });
  return mod;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHasNative = true;
  mockAppId = '1234';
});

describe('Android', () => {
  beforeEach(() => {
    Platform.OS = 'android';
  });

  it('knows what is installed', async () => {
    expect(await load().shareTargets()).toEqual({
      native: true,
      instagram: true,
      facebook: false,
      story: true,
    });
    mockAppId = null;
    expect((await load().shareTargets()).story).toBe(false);
  });

  it('opens Instagram and Facebook with every slide in order', async () => {
    const s = load();
    expect(await s.postToInstagram(files)).toBe('opened');
    expect(mockNative.openInstagramFeed).toHaveBeenLastCalledWith(files);
    await s.postToFacebook(files);
    expect(mockNative.shareImages).toHaveBeenLastCalledWith(files, 'com.facebook.katana');
    await s.postStory(files[1]!);
    expect(mockNative.shareToInstagramStory).toHaveBeenCalledWith(files[1], '1234');
    expect(await s.saveAll(files)).toBe('saved');
    expect(mockNative.saveToGallery).toHaveBeenCalledWith(files);
  });

  it('saves to the gallery and opens Instagram when it has no feed share screen', async () => {
    mockNative.openInstagramFeed.mockResolvedValueOnce('none');
    expect(await load().postToInstagram(files)).toBe('saved-and-opened');
    expect(mockNative.saveToGallery).toHaveBeenCalledWith(files);
    expect(mockNative.launchApp).toHaveBeenCalledWith('com.instagram.android');
  });

  it('falls back to the share sheet on old Android and old app builds', async () => {
    mockNative.saveToGallery.mockResolvedValueOnce(false);
    expect(await load().saveAll(files)).toBe('shared');
    expect(mockNative.shareImages).toHaveBeenLastCalledWith(files, null);

    mockHasNative = false;
    const s = load();
    expect(await s.shareTargets()).toMatchObject({ native: false });
    expect(await s.postToInstagram(files)).toBe('shared');
    expect(mockShareAsync).toHaveBeenCalledWith(files[0], expect.anything());
    await expect(s.postStory(files[0]!)).rejects.toThrow(/Meta App ID/);
  });
});

describe('iPhone', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
  });

  it('saves slides to Photos in order, then opens Instagram on the first', async () => {
    const s = load();
    expect(await s.shareTargets()).toEqual({
      native: true,
      instagram: true,
      facebook: false,
      story: true,
    });
    expect(await s.postToInstagram(files)).toBe('saved-and-opened');
    expect(mockNative.saveToPhotos).toHaveBeenCalledWith(files);
    expect(mockNative.openInstagramLibrary).toHaveBeenCalledWith('asset-0');
    await s.postToFacebook(files);
    expect(mockNative.shareImages).toHaveBeenLastCalledWith(files, null);
  });

  it('explains when Photos access is refused', async () => {
    mockNative.saveToPhotos.mockResolvedValueOnce([]);
    await expect(load().postToInstagram(files)).rejects.toThrow(/allow TravelOG to add photos/);
  });
});
