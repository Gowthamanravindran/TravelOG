import { defaultTheme, type GlobeMapHandle, type GlobeMapProps } from '@travelog/globe';
import type GlobeMapComponent from '@travelog/globe/src/GlobeMap';
import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { hasGlobe, noteGlobeProblem } from '@/lib/runtime';
import { useMotionOk } from '@/ui/motion';

export type GlobeHandle = GlobeMapHandle;
export type GlobeProps = Omit<GlobeMapProps, 'theme' | 'reduceMotion' | 'fallback' | 'style'>;

/** The colour behind the globe, for whatever sits around it. */
export const GLOBE_SPACE = defaultTheme.space;

/**
 * The globe, following Reduce motion (Plan 66). It keeps its own colours and satellite imagery
 * in every app theme (the owner's choice): only the app around it is themed.
 *
 * The component is loaded with `require` and only where `hasGlobe()` is true: the web view
 * package throws on import in an app that was built without it, so nothing here (or anywhere
 * else in the app) imports it at the top of a file. Draws nothing where it is missing.
 */
export const Globe = forwardRef<GlobeHandle, GlobeProps>(function Globe(props, ref) {
  const ok = useMotionOk();
  if (!hasGlobe()) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const GlobeMap = require('@travelog/globe/src/GlobeMap').default as typeof GlobeMapComponent;
  return (
    // One element for screen readers: the map inside cannot be read out.
    <View accessible accessibilityLabel="Globe" style={[styles.fill, styles.space]}>
      <GlobeMap
        ref={ref}
        {...props}
        reduceMotion={!ok}
        onError={(message, fatal) => {
          if (fatal) noteGlobeProblem(message);
          props.onError?.(message, fatal);
        }}
        fallback={<View style={[styles.fill, styles.space]} />}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  space: { backgroundColor: GLOBE_SPACE },
});
