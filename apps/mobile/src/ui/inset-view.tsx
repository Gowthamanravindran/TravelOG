import { StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Edge = 'top' | 'bottom' | 'left' | 'right';

/**
 * Pads its content away from the status bar, notch and gesture bar (Plan 33).
 * The insets come from the app's root provider, so they stay the same while a
 * page slides in. (The native safe-area view measures from where it sits on screen,
 * so its padding changed at the end of the slide and the content dropped.)
 */
export function InsetView({
  edges = ['top', 'bottom', 'left', 'right'],
  style,
  ...rest
}: ViewProps & { edges?: Edge[] }) {
  const insets = useSafeAreaInsets();
  const flat = StyleSheet.flatten(style) ?? {};
  const base = (side: 'Top' | 'Bottom' | 'Left' | 'Right') => {
    const axis =
      side === 'Top' || side === 'Bottom' ? flat.paddingVertical : flat.paddingHorizontal;
    const v = flat[`padding${side}`] ?? axis ?? flat.padding ?? 0;
    return typeof v === 'number' ? v : 0;
  };
  const pad = (edge: Edge, side: 'Top' | 'Bottom' | 'Left' | 'Right') =>
    edges.includes(edge) ? { [`padding${side}`]: base(side) + insets[edge] } : {};
  return (
    <View
      {...rest}
      style={[
        flat,
        pad('top', 'Top'),
        pad('bottom', 'Bottom'),
        pad('left', 'Left'),
        pad('right', 'Right'),
      ]}
    />
  );
}
