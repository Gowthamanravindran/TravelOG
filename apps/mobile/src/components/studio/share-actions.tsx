import type { StudioFormat } from '@travelog/core';
import { type } from '@travelog/ui';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { errorMessage } from '@/lib/format';
import { shareImage } from '@/lib/photos';
import { Button, ErrorText } from '@/ui/kit';
import { useTheme } from '@/ui/theme';

/**
 * Where exported slides go. Replaced with Instagram / Facebook hand-off in the
 * next step; for now each slide can be shared on its own.
 */
export function ShareActions({
  files,
  current,
}: {
  files: string[];
  current: number;
  format: StudioFormat;
}) {
  const t = useTheme();
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  const file = files[current] ?? files[0];
  return (
    <View style={{ gap: 10 }}>
      <Text style={[type.headline, { color: t.ink }]}>✓ {files.length} slides ready</Text>
      <Button
        label={`Share slide ${current + 1}`}
        onPress={() => run(() => (file ? shareImage(file) : Promise.resolve()))}
      />
      <ErrorText>{error}</ErrorText>
    </View>
  );
}
