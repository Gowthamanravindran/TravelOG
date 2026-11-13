import { castVote, deletePoll, listMembers, listPolls, lockPoll, pollResults } from '@travelog/db';
import { type } from '@travelog/ui';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMutate, useQuery } from '@/data/provider';
import { errorMessage } from '@/lib/format';
import { POLL_LABELS } from '@/lib/labels';
import { Between, Body, Button, Card, Chip, ChipRow, Empty, ErrorText, Strong } from '@/ui/kit';
import { Appear } from '@/ui/motion';
import { useTheme } from '@/ui/theme';

export function PollsView({ tripId }: { tripId: string }) {
  const t = useTheme();
  const router = useRouter();
  const mutate = useMutate();
  const members = useQuery((db) => listMembers(db, tripId), [tripId]);
  const polls = useQuery(
    (db) => listPolls(db, tripId).map((p) => ({ poll: p, results: pollResults(db, p.id) })),
    [tripId],
  );
  const [voter, setVoter] = useState(members.find((m) => m.isMe)?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => void) => {
    try {
      setError(null);
      fn();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <View style={{ gap: 14 }}>
      {members.length > 1 ? (
        <View style={{ gap: 6 }}>
          <Body muted small>
            Voting as (until friends can vote from their own phones)
          </Body>
          <ChipRow>
            {members.map((m) => (
              <Chip
                key={m.id}
                label={m.isMe ? 'You' : m.displayName}
                selected={voter === m.id}
                onPress={() => setVoter(m.id)}
              />
            ))}
          </ChipRow>
        </View>
      ) : null}
      <ErrorText>{error}</ErrorText>
      {polls.length ? (
        polls.map(({ poll, results }, i) => {
          const max = Math.max(...results.options.map((o) => o.count));
          return (
            <Appear key={poll.id} index={i}>
              <Card>
                <Between>
                  <Chip label={POLL_LABELS[poll.type]} />
                  <Body small muted>
                    {poll.lockedOptionId
                      ? 'Decided'
                      : `${results.totalVoters} voted · ${poll.style === 'multi' ? 'pick any' : 'pick one'}`}
                  </Body>
                </Between>
                <Strong style={{ fontSize: 17 }}>{poll.question}</Strong>
                {results.options.map((o) => {
                  const mine = o.voterIds.includes(voter);
                  const won = poll.lockedOptionId === o.id;
                  return (
                    <Pressable
                      key={o.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${o.label}, ${o.count} votes`}
                      accessibilityState={{ selected: mine, disabled: !!poll.lockedOptionId }}
                      disabled={!!poll.lockedOptionId || !voter}
                      onPress={() => run(() => mutate((db) => castVote(db, poll.id, o.id, voter)))}
                      style={[styles.option, { borderColor: mine ? t.mango : t.line }]}
                    >
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${Math.round(o.share * 100)}%`,
                            backgroundColor: t.mango,
                            opacity: 0.28,
                          },
                        ]}
                      />
                      <Text style={[type.label, { color: t.ink, flex: 1 }]}>
                        {won ? 'Winner · ' : ''}
                        {o.label}
                        {mine ? ' · your vote' : ''}
                      </Text>
                      <Text style={[type.label, { color: t.ink }]}>{o.count}</Text>
                    </Pressable>
                  );
                })}
                {!poll.lockedOptionId ? (
                  <Between>
                    <Button
                      label="Delete"
                      variant="link"
                      danger
                      onPress={() => run(() => mutate((db) => deletePoll(db, poll.id)))}
                    />
                    <Button
                      label={max > 0 ? 'Lock in the winner' : 'Lock in'}
                      variant="link"
                      onPress={() => run(() => mutate((db) => lockPoll(db, poll.id)))}
                    />
                  </Between>
                ) : null}
              </Card>
            </Appear>
          );
        })
      ) : (
        <Empty
          icon="polls"
          art="ballot"
          artFamily="leaf"
          title="No polls yet"
          body="Can't decide on dates, a stay or Plan A vs B? Put it to a vote."
        />
      )}
      <Button label="New poll" icon="add" onPress={() => router.push(`/trip/${tripId}/poll`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    gap: 8,
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
});
