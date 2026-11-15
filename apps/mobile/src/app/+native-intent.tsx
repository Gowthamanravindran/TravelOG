/**
 * Plan 60: iOS's share extension opens the app with a `…://dataUrl=…ShareKey` link that is not
 * a screen; send it home, where the share handler (lib/share-intent.tsx) picks the share up.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return path.includes('dataUrl=') ? '/' : path;
}
