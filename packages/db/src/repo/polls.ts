import { and, eq } from 'drizzle-orm';

import { deleteRow, getRow, insertRow, liveRows, now, tx, updateRow, type Db } from '../db';
import { pollOptions, polls, votes, type PollType } from '../schema';
import { setMainVariant } from './itinerary';
import { updateTrip } from './trips';

export type Poll = typeof polls.$inferSelect;
export type PollOption = typeof pollOptions.$inferSelect;

export type OptionPayload =
  | { kind: 'variant'; variantId: string }
  | { kind: 'dates'; startDate: string; endDate: string }
  | { kind: 'text' };

export interface PollInput {
  tripId: string;
  type: PollType;
  question: string;
  style?: 'single' | 'multi';
  deadline?: string | null;
  createdByMemberId?: string | null;
  options: { label: string; payload?: OptionPayload }[];
}

export function createPoll(db: Db, input: PollInput): Poll {
  if (!input.question.trim()) throw new RangeError('please write a question');
  const options = input.options.filter((o) => o.label.trim());
  if (options.length < 2) throw new RangeError('a poll needs at least two options');
  return tx(db, (db) => {
    const poll = insertRow(db, 'polls', {
      tripId: input.tripId,
      type: input.type,
      question: input.question.trim().slice(0, 140),
      style: input.style ?? 'single',
      deadline: input.deadline ?? null,
      createdByMemberId: input.createdByMemberId ?? null,
    });
    options.forEach((o, i) =>
      insertRow(db, 'poll_options', {
        pollId: poll.id,
        label: o.label.trim().slice(0, 80),
        payload: o.payload ? JSON.stringify(o.payload) : null,
        sortOrder: i,
      }),
    );
    return poll;
  });
}

export function listPolls(db: Db, tripId: string): Poll[] {
  return liveRows(db, 'polls', eq(polls.tripId, tripId)).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function listOptions(db: Db, pollId: string): PollOption[] {
  return liveRows(db, 'poll_options', eq(pollOptions.pollId, pollId)).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

/** Votes for `optionId`. Single-choice polls replace your earlier vote; multi-choice polls toggle. */
export function castVote(db: Db, pollId: string, optionId: string, memberId: string): void {
  tx(db, (db) => {
    const poll = getRow(db, 'polls', pollId);
    if (!poll) throw new Error('poll not found');
    if (poll.lockedOptionId) throw new RangeError('this poll is already decided');
    const mine = liveRows(db, 'votes', and(eq(votes.pollId, pollId), eq(votes.memberId, memberId)));
    const existing = mine.find((v) => v.optionId === optionId);
    if (existing) {
      deleteRow(db, 'votes', existing.id);
      return;
    }
    if (poll.style === 'single') for (const v of mine) deleteRow(db, 'votes', v.id);
    // A soft-deleted vote keeps the unique (option, member) slot, so revive it instead of inserting.
    const old = db
      .select()
      .from(votes)
      .where(and(eq(votes.optionId, optionId), eq(votes.memberId, memberId)))
      .get();
    if (old) {
      db.update(votes).set({ deletedAt: null }).where(eq(votes.id, old.id)).run();
      updateRow(db, 'votes', old.id, {});
    } else {
      insertRow(db, 'votes', { pollId, optionId, memberId });
    }
  });
}

export interface OptionResult extends PollOption {
  count: number;
  voterIds: string[];
  share: number;
}

export function pollResults(
  db: Db,
  pollId: string,
): { options: OptionResult[]; totalVoters: number } {
  const options = listOptions(db, pollId);
  const all = liveRows(db, 'votes', eq(votes.pollId, pollId));
  const voters = new Set(all.map((v) => v.memberId));
  const totalVotes = all.length || 1;
  return {
    totalVoters: voters.size,
    options: options.map((o) => {
      const vs = all.filter((v) => v.optionId === o.id);
      return {
        ...o,
        count: vs.length,
        voterIds: vs.map((v) => v.memberId),
        share: vs.length / totalVotes,
      };
    }),
  };
}

/**
 * Decides the poll. Without `optionId` the option with most votes wins (ties go to
 * the earlier option). The result is applied: a plan-variant poll makes that plan the
 * day's main plan; a dates poll sets the trip dates.
 */
export function lockPoll(db: Db, pollId: string, optionId?: string): Poll {
  return tx(db, (db) => {
    const poll = getRow(db, 'polls', pollId);
    if (!poll) throw new Error('poll not found');
    if (poll.lockedOptionId) return poll;
    const { options } = pollResults(db, pollId);
    const winner = optionId
      ? options.find((o) => o.id === optionId)
      : [...options].sort((a, b) => b.count - a.count || a.sortOrder - b.sortOrder)[0];
    if (!winner) throw new Error('option not found');

    const payload = winner.payload
      ? (JSON.parse(winner.payload) as OptionPayload)
      : { kind: 'text' as const };
    if (payload.kind === 'variant') setMainVariant(db, payload.variantId);
    if (payload.kind === 'dates') {
      updateTrip(db, poll.tripId, { startDate: payload.startDate, endDate: payload.endDate });
    }
    return updateRow(db, 'polls', pollId, {
      lockedOptionId: winner.id,
      lockedAt: now().toISOString(),
    });
  });
}

export function deletePoll(db: Db, pollId: string): void {
  tx(db, (db) => {
    for (const v of liveRows(db, 'votes', eq(votes.pollId, pollId))) deleteRow(db, 'votes', v.id);
    for (const o of listOptions(db, pollId)) deleteRow(db, 'poll_options', o.id);
    deleteRow(db, 'polls', pollId);
  });
}
