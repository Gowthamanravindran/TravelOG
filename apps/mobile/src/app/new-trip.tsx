import { createTrip, getLocalProfile } from '@travelog/db';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { tripHref } from '@/lib/trip-route';
import { emptyTripForm, toTripInput, TripForm } from '@/components/trip-form';
import { useMutate, useQuery } from '@/data/provider';
import { errorMessage } from '@/lib/format';
import { Between, Button, ErrorText, H1, Screen } from '@/ui/kit';
import { useCelebrate } from '@/ui/motion';
import { ModeProvider } from '@/ui/theme';

export default function NewTrip() {
  const router = useRouter();
  const mutate = useMutate();
  const profile = useQuery((db) => getLocalProfile(db));
  const [form, setForm] = useState(() => emptyTripForm(profile?.homeCurrency));
  const [error, setError] = useState<string | null>(null);

  const celebrate = useCelebrate();

  const create = () => {
    try {
      const trip = mutate((db) =>
        createTrip(db, toTripInput(form), {
          displayName: profile?.displayName ?? 'Me',
          upiId: profile?.upiId,
        }),
      );
      celebrate('Trip created');
      router.replace(tripHref(trip));
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <ModeProvider mode="home">
      <Screen edges={['top', 'bottom']}>
        <Between>
          <H1>New trip</H1>
          <Button label="Cancel" variant="link" onPress={() => router.back()} />
        </Between>
        <TripForm value={form} onChange={setForm} />
        <ErrorText>{error}</ErrorText>
        <Button label="Create trip" onPress={create} disabled={!form.title.trim()} />
      </Screen>
    </ModeProvider>
  );
}
