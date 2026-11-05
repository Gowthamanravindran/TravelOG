import { radius, type, type ThemeName } from '@travelog/ui';
import { Pressable, Text, View } from 'react-native';

import { useMutate } from '@/data/provider';
import { saveAppearance, useAppearance, type AppearanceMode } from '@/lib/appearance';
import { Body, Card, Segmented } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

/** Theme specimens: a strip of each theme's own colours (exempt from the hex guard). */
const THEME_CARDS: { name: ThemeName; label: string; strip: string[] }[] = [
  { name: 'sunset', label: 'Sunset', strip: ['#FFF4EC', '#B32F18', '#0B6584', '#FFB23F'] },
  { name: 'block', label: 'Colour block', strip: ['#C6D9FF', '#FFFFFF', '#1F4FD1', '#141414'] },
];

/** Profile → Appearance (Plan 26): pick the theme and light, dark or match phone. */
export function AppearanceCard() {
  const t = useTheme();
  const appearance = useAppearance();
  const mutate = useMutate();

  return (
    <Card>
      <Text style={[type.label, { color: t.ink2 }]}>Theme</Text>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {THEME_CARDS.map((c) => {
          const selected = appearance.theme === c.name;
          return (
            <Pressable
              key={c.name}
              accessibilityRole="radio"
              accessibilityLabel={`Theme ${c.label}`}
              accessibilityState={{ selected }}
              onPress={() => mutate((db) => saveAppearance(db, { theme: c.name }))}
              style={{
                flex: 1,
                gap: 8,
                padding: 10,
                borderRadius: radius.card,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? t.accent : t.line,
                backgroundColor: t.surface,
              }}
            >
              <View
                style={{ flexDirection: 'row', height: 34, borderRadius: 8, overflow: 'hidden' }}
              >
                {c.strip.map((colour) => (
                  <View key={colour} style={{ flex: 1, backgroundColor: colour }} />
                ))}
              </View>
              <Text style={[type.headline, { color: t.ink }]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[type.label, { color: t.ink2 }]}>Mode</Text>
      <Segmented<AppearanceMode>
        value={appearance.mode}
        onChange={(mode) => mutate((db) => saveAppearance(db, { mode }))}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'system', label: 'Match phone' },
        ]}
      />
      <Body muted small>
        Match phone follows your phone’s dark-mode setting. Trip mode follows this too.
      </Body>
    </Card>
  );
}
