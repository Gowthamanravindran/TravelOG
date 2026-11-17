/**
 * Whether the globe can run (Plan 71). The check is to load the web view package itself: it
 * throws on import in an app built without it, and that is the only fact that matters. An
 * earlier check looked the native module up by name and said "no" on a build that had it.
 */
describe('hasGlobe', () => {
  afterEach(() => jest.resetModules());

  it('is true when the web view package loads', () => {
    jest.isolateModules(() => {
      const { hasGlobe, globeStatus } = require('@/lib/runtime');
      expect(hasGlobe()).toBe(true);
      expect(globeStatus()).toEqual({ ok: true, why: null });
    });
  });

  it('is false, with the reason kept, when loading it throws', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native-webview', () => {
        throw new Error("'RNCWebViewModule' could not be found");
      });
      const { hasGlobe, globeStatus } = require('@/lib/runtime');
      expect(hasGlobe()).toBe(false);
      expect(globeStatus().why).toContain('RNCWebViewModule');
      // Asked once: a failed load is not retried on every render.
      expect(hasGlobe()).toBe(false);
    });
  });
});
