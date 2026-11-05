import { createPoll, myMember, type OptionPayload } from '@travelog/db';
import { isLocalDate } from '@travelog/core';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { useMutate } from '@/data/provider';
import { errorMessage, shortDate } from '@/lib/format';
import { Between, Body, Button, ErrorText, Field, H1, Row, Screen, Segmented } from '@/ui/kit';
import { ModeProvider } from '@/ui/theme';
import { DateRangeField } from '@/ui/date-field';

type Kind = 'custom' | 'dates';

export default function NewPoll() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mutate = useMutate();
  const [kind, setKind] = useState<Kind>('custom');
  const [question, setQuestion] = useState('');
  const [multi, setMulti] = useState<'single' | 'multi'>('single');
  const [options, setOptions] = useState(['', '']);
  const [ranges, setRanges] = useState([
    { start: '', end: '' },
    { start: '', end: '' },
  ]);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    try {
      const opts: { label: string; payload?: OptionPayload }[] =
        kind === 'dates'
          ? ranges
              .filter((r) => r.start || r.end)
              .map((r) => {
                if (!isLocalDate(r.start) || !isLocalDate(r.end))
                  throw new Error('dates must look like 2026-11-14');
                if (r.end < r.start) throw new Error('an option ends before it starts');
                return {
                  label: `${shortDate(r.start)} – ${shortDate(r.end)}`,
                  payload: { kind: 'dates', startDate: r.start, endDate: r.end },
                };
              })
          : options.map((label) => ({ label }));
      mutate((db) =>
        createPoll(db, {
          tripId: id,
          type: kind === 'dates' ? 'dates' : 'custom',
          question: question || (kind === 'dates' ? 'When can everyone go?' : ''),
          style: kind === 'dates' ? 'multi' : multi,
          createdByMemberId: myMember(db, id)?.id,
          options: opts,
        }),
      );
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <ModeProvider mode="plan">
      <Screen edges={['top', 'bottom']}>
        <Between>
          <H1>New poll</H1>
          <Button label="Cancel" variant="link" onPress={() => router.back()} />
        </Between>
        <Segmented<Kind>
          value={kind}
          onChange={setKind}
          options={[
            { value: 'custom', label: 'Question' },
            { value: 'dates', label: 'Dates' },
          ]}
        />
        <Field
          label="Question"
          value={question}
          onChangeText={setQuestion}
          placeholder={kind === 'dates' ? 'When can everyone go?' : 'Where do we stay in Kaza?'}
        />
        {kind === 'custom' ? (
          <>
            {options.map((o, i) => (
              <Field
                key={i}
                label={`Option ${i + 1}`}
                value={o}
                onChangeText={(v) => setOptions(options.map((x, j) => (j === i ? v : x)))}
              />
            ))}
            <Button
              label="Another option"
              icon="add"
              variant="link"
              onPress={() => setOptions([...options, ''])}
            />
            <Segmented<'single' | 'multi'>
              value={multi}
              onChange={setMulti}
              options={[
                { value: 'single', label: 'Pick one' },
                { value: 'multi', label: 'Pick any' },
              ]}
            />
          </>
        ) : (
          <>
            <Body muted small>
              Everyone ticks every range that works. Locking it in sets the trip dates.
            </Body>
            {ranges.map((r, i) => (
              <DateRangeField
                key={i}
                label={`Option ${i + 1}`}
                start={r.start}
                end={r.end}
                onChange={(start, end) =>
                  setRanges(ranges.map((x, j) => (j === i ? { start, end } : x)))
                }
              />
            ))}
            <Button
              label="Another range"
              icon="add"
              variant="link"
              onPress={() => setRanges([...ranges, { start: '', end: '' }])}
            />
          </>
        )}
        <Body muted small>
          To vote on Plan A vs Plan B for a day, open that day in the Itinerary and tap Compare.
        </Body>
        <ErrorText>{error}</ErrorText>
        <Button label="Create poll" onPress={save} />
      </Screen>
    </ModeProvider>
  );
}
