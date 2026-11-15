import { font } from '@travelog/ui';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from './theme';

/**
 * Plans 61–62: a small progress ring ("7/11"), drawn with plain views like the spend donut
 * (Plan 48: no SVG in the installed app). Two clipped half-rings make the arc.
 */
export function ProgressRing({
  done,
  total,
  size = 44,
  stroke = 5,
  label,
}: {
  done: number;
  total: number;
  size?: number;
  stroke?: number;
  /** Text in the middle; defaults to "done/total", or ✓ when all done. */
  label?: string;
}) {
  const t = useTheme();
  const share = total > 0 ? Math.min(1, done / total) : 0;
  const sweep = share * 360;
  const half = size / 2;
  const ring = { width: size, height: size, borderRadius: half, borderWidth: stroke };
  const arc = (start: number, deg: number) => (
    <View
      key={start}
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${start}deg` }] }]}
    >
      <View
        style={{ position: 'absolute', left: half, width: half, height: size, overflow: 'hidden' }}
      >
        <View
          style={{
            position: 'absolute',
            left: -half,
            width: size,
            height: size,
            transform: [{ rotate: `${deg}deg` }],
          }}
        >
          <View style={{ width: half, height: size, overflow: 'hidden' }}>
            <View style={[ring, { borderColor: t.accent }]} />
          </View>
        </View>
      </View>
    </View>
  );
  const text = label ?? (total > 0 && done >= total ? '✓' : `${done}/${total}`);
  return (
    <View
      testID="progress-ring"
      accessibilityLabel={`${done} of ${total} done`}
      style={{ width: size, height: size }}
    >
      <View style={[ring, { borderColor: t.surface2 }]} />
      {sweep > 0 ? arc(0, Math.min(sweep, 180)) : null}
      {sweep > 180 ? arc(180, sweep - 180) : null}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text
          style={{
            ...font('display', 800),
            fontSize: size < 40 ? 10 : 12,
            color: t.ink,
          }}
        >
          {text}
        </Text>
      </View>
    </View>
  );
}
