import { getLocalProfile, saveLocalProfile } from '@travelog/db';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { CURRENCIES, errorMessage } from '@/lib/format';
import { Body, Button, Chip, ChipRow, ErrorText, Field, H1, Screen } from '@/ui/kit';
import { useTheme } from '@/ui/theme';
import { Art, ArtBackdrop } from '@/ui/art';

/** First launch: who are you? (Sign-in arrives later; this profile stays on this phone.) */
export default function Welcome() {
  const t = useTheme();
  const router = useRouter();
  const mutate = useMutate();
  const existing = useQuery((db) => getLocalProfile(db));
  const [name, setName] = useState(existing?.displayName ?? '');
  const [currency, setCurrency] = useState(existing?.homeCurrency ?? 'INR');
  const [upi, setUpi] = useState(existing?.upiId ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    try {
      mutate((db) =>
        saveLocalProfile(db, { displayName: name, homeCurrency: currency, upiId: upi || null }),
      );
      router.replace('/');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      {/* 3D welcome (Plan 52): a world map with a plane and sparkles. */}
      <ArtBackdrop family="sea" style={styles.hero}>
        <Art name="map" size={150} float />
        <Art name="airplane" size={64} float delay={400} style={styles.plane} />
        <Art name="sparkles" size={40} float delay={800} style={styles.sparkles} />
      </ArtBackdrop>
      <H1 eyebrow="Welcome to TravelOG">Plan trips with your friends</H1>
      <Body muted>Vote, split, go. Your trips are saved on this phone and work offline.</Body>
      <Field
        label="Your name"
        value={name}
        onChangeText={setName}
        placeholder="What friends call you"
        autoFocus
      />
      <Body muted small>
        Home currency
      </Body>
      <ChipRow>
        {CURRENCIES.slice(0, 6).map((c) => (
          <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />
        ))}
      </ChipRow>
      <Field
        label="UPI ID (optional)"
        value={upi}
        onChangeText={setUpi}
        placeholder="name@okaxis"
        autoCapitalize="none"
        hint="Friends can settle up with you in one tap."
      />
      <ErrorText>{error}</ErrorText>
      <Button label={existing ? 'Save' : "Let's go"} onPress={save} disabled={!name.trim()} />
      <Body small muted style={{ color: t.ink2 }}>
        Signing in and sharing trips with friends comes in a later update.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 190,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  plane: { position: 'absolute', right: '14%', top: 14 },
  sparkles: { position: 'absolute', left: '16%', bottom: 18 },
});
