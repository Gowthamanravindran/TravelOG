import { ITEM_TYPES, savePlace, type ItemType } from '@travelog/db';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useMutate } from '@/data/provider';
import { errorMessage } from '@/lib/format';
import { ITEM_LABELS } from '@/lib/labels';
import { savedFromStop } from '@/lib/saved';
import { Between, Button, Chip, ChipRow, ErrorText, Field, H1, Screen } from '@/ui/kit';
import { NO_PLACE, StopPlaceField, type StopPlaceValue } from '@/ui/stop-place-field';

const KINDS = ITEM_TYPES.filter((k) => k !== 'transport' && k !== 'note');

/** Plan 58: save a place for later, outside any trip. */
export default function SavedPlaceScreen() {
  const router = useRouter();
  const mutate = useMutate();
  const [place, setPlace] = useState<StopPlaceValue>(NO_PLACE);
  const [kind, setKind] = useState<ItemType>('place');
  const [kindChosen, setKindChosen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    try {
      mutate((db) =>
        savePlace(db, {
          ...savedFromStop(db, null, { title: place.name, type: kind, place }, 'typed'),
          note: note || null,
        }),
      );
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <Between>
        <H1>Save a place</H1>
        <Button label="Cancel" variant="link" onPress={() => router.back()} />
      </Between>
      <StopPlaceField
        tripId={null}
        near={null}
        value={place}
        onChange={setPlace}
        onPick={(p) => {
          if (!kindChosen) setKind(p.kind);
        }}
      />
      <ChipRow>
        {KINDS.map((k) => (
          <Chip
            key={k}
            label={ITEM_LABELS[k].label}
            icon={ITEM_LABELS[k].icon}
            selected={kind === k}
            onPress={() => {
              setKind(k);
              setKindChosen(true);
            }}
          />
        ))}
      </ChipRow>
      <Field
        label="Note"
        value={note}
        onChangeText={setNote}
        multiline
        placeholder="Why you want to go, who told you"
      />
      <ErrorText>{error}</ErrorText>
      <Button label="Save" onPress={save} disabled={!place.name.trim()} />
    </Screen>
  );
}
