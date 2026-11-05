import { getTrip } from '@travelog/db';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch } from 'react-native';

import { useDb, useMutate, useQuery } from '@/data/provider';
import { checkInLocationOn, checkInNow, setCheckInLocation } from '@/lib/check-in';
import { errorMessage } from '@/lib/format';
import { Between, Body, Button, Card, ErrorText, Field, H1, Screen, Strong } from '@/ui/kit';
import { ModeProvider } from '@/ui/theme';

/** "I'm here" for a place that isn't in the plan. */
export default function CheckInSheet() {
  return (
    <ModeProvider mode="trip">
      <CheckInForm />
    </ModeProvider>
  );
}

function CheckInForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useDb();
  const mutate = useMutate();
  const trip = useQuery((db) => getTrip(db, id), [id]);
  const locationOn = useQuery((db) => checkInLocationOn(db));
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!trip) return null;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await checkInNow(db, mutate, { tripId: id, title, note });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Between>
        <H1>Check in</H1>
        <Button label="Cancel" variant="link" onPress={() => router.back()} />
      </Between>
      <Field
        label="Where are you?"
        value={title}
        onChangeText={setTitle}
        placeholder="Chapora Fort"
        autoFocus
      />
      <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Sunset!" />
      <Card>
        <Between>
          <Strong>Add my location</Strong>
          <Switch
            accessibilityLabel="Add my location"
            value={locationOn}
            onValueChange={(on) => mutate((db) => setCheckInLocation(db, on))}
          />
        </Between>
        <Body muted small>
          Read once when you check in, kept on this phone. TravelOG never tracks you in the
          background.
        </Body>
      </Card>
      <ErrorText>{error}</ErrorText>
      <Button
        label={busy ? (locationOn ? 'Finding you…' : 'Saving…') : "I'm here"}
        icon="checkIn"
        onPress={save}
        disabled={busy || !title.trim()}
      />
    </Screen>
  );
}
