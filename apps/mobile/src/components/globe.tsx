import { defaultTheme, type GlobeMapHandle, type GlobeMapProps } from '@travelog/globe';
import type GlobeMapComponent from '@travelog/globe/src/GlobeMap';
import { font, spacing, type } from '@travelog/ui';
import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { StarWarp } from '@/components/star-warp';
import { hasGlobe, noteGlobeProblem } from '@/lib/runtime';
import { Button } from '@/ui/kit';
import { useMotionOk } from '@/ui/motion';

export type GlobeHandle = GlobeMapHandle;
export type GlobeProps = Omit<
  GlobeMapProps,
  'theme' | 'reduceMotion' | 'fallback' | 'loading' | 'label' | 'style'
>;

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
    <View style={[styles.fill, styles.space]}>
      <GlobeMap
        ref={ref}
        {...props}
        // One element for screen readers: the map inside cannot be read out.
        label="Globe"
        reduceMotion={!ok}
        onReady={(info) => {
          // How long starts take on real phones decides the stall limit (Plan 79).
          if (__DEV__) console.log(`[globe] ready in ${info.ms} ms`);
          props.onReady?.(info);
        }}
        onError={(message, fatal) => {
          if (fatal) noteGlobeProblem(message);
          props.onError?.(message, fatal);
        }}
        // While the map starts, a night sky flying towards the globe; it fades as the globe
        // travels in (Plans 79, 80).
        loading={(ready) => <StarWarp leaving={ready} />}
        // After three failed starts in a row.
        fallback={(retry) => (
          <View style={styles.note}>
            <Text style={[type.body, styles.noteText]}>The globe couldn’t load.</Text>
            <Button label="Try again" variant="secondary" small onPress={retry} />
          </View>
        )}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  space: { backgroundColor: GLOBE_SPACE },
  note: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
  // The globe's own colours: it is dark in every app theme.
  noteText: { color: defaultTheme.tagText, textAlign: 'center', ...font('text', 500) },
});
