/**
 * On-device database schema (docs/11-local-db-and-sync.md).
 *
 * Every synced table carries the same sync columns so that adding sign-in and
 * Supabase later needs no rework:
 *  - id:         UUID v7 created on the device (works offline, idempotent on push)
 *  - updated_at: last change (ISO string, UTC)
 *  - deleted_at: soft delete, so deletes can sync
 *  - server_seq: the server's change number; null until the row has synced
 *
 * Money is stored as integer minor units (paise) plus a currency code.
 * Dates of a trip are local calendar dates ('YYYY-MM-DD') in the trip's time zone;
 * instants (bookings, expenses) are UTC ISO strings.
 */
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

const syncColumns = {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
  serverSeq: integer('server_seq'),
};

export const trips = sqliteTable(
  'trips',
  {
    ...syncColumns,
    title: text('title').notNull(),
    emoji: text('emoji').notNull().default('🧳'),
    destination: text('destination'),
    startDate: text('start_date'),
    endDate: text('end_date'),
    timeZone: text('time_zone').notNull(),
    currency: text('currency').notNull().default('INR'),
    /** Set when the group ends a trip early or archives it; otherwise state comes from dates. */
    endedAt: text('ended_at'),
    archivedAt: text('archived_at'),
  },
  (t) => [index('trips_start_idx').on(t.startDate)],
);

export const tripMembers = sqliteTable(
  'trip_members',
  {
    ...syncColumns,
    tripId: text('trip_id').notNull(),
    /** Supabase user id once accounts exist; null for people added by name only. */
    userId: text('user_id'),
    displayName: text('display_name').notNull(),
    role: text('role', { enum: ['owner', 'editor', 'viewer'] })
      .notNull()
      .default('editor'),
    isMe: integer('is_me', { mode: 'boolean' }).notNull().default(false),
    upiId: text('upi_id'),
  },
  (t) => [index('trip_members_trip_idx').on(t.tripId)],
);

export const planVariants = sqliteTable(
  'plan_variants',
  {
    ...syncColumns,
    tripId: text('trip_id').notNull(),
    /** Local date of the day this variant plans. */
    dayDate: text('day_date').notNull(),
    name: text('name').notNull(),
    authorMemberId: text('author_member_id'),
    isMain: integer('is_main', { mode: 'boolean' }).notNull().default(false),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('plan_variants_trip_day_idx').on(t.tripId, t.dayDate)],
);

export const ITEM_TYPES = ['place', 'activity', 'food', 'stay', 'transport', 'note'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const itineraryItems = sqliteTable(
  'itinerary_items',
  {
    ...syncColumns,
    tripId: text('trip_id').notNull(),
    variantId: text('variant_id').notNull(),
    type: text('type', { enum: ITEM_TYPES }).notNull(),
    title: text('title').notNull(),
    /** Local start time in the trip's time zone, 'HH:MM'. */
    startTime: text('start_time'),
    durationMin: integer('duration_min'),
    estCostMinor: integer('est_cost_minor'),
    currency: text('currency'),
    notes: text('notes'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('itinerary_items_variant_idx').on(t.variantId, t.sortOrder)],
);

export const POLL_TYPES = [
  'dates',
  'variant',
  'destination',
  'stay',
  'activity',
  'custom',
] as const;
export type PollType = (typeof POLL_TYPES)[number];

export const polls = sqliteTable(
  'polls',
  {
    ...syncColumns,
    tripId: text('trip_id').notNull(),
    type: text('type', { enum: POLL_TYPES }).notNull(),
    question: text('question').notNull(),
    style: text('style', { enum: ['single', 'multi'] })
      .notNull()
      .default('single'),
    deadline: text('deadline'),
    lockedOptionId: text('locked_option_id'),
    lockedAt: text('locked_at'),
    createdByMemberId: text('created_by_member_id'),
  },
  (t) => [index('polls_trip_idx').on(t.tripId)],
);

export const pollOptions = sqliteTable(
  'poll_options',
  {
    ...syncColumns,
    pollId: text('poll_id').notNull(),
    label: text('label').notNull(),
    /** JSON: e.g. {"variantId": "..."} or {"startDate": "...", "endDate": "..."} */
    payload: text('payload'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [index('poll_options_poll_idx').on(t.pollId)],
);

export const votes = sqliteTable(
  'votes',
  {
    ...syncColumns,
    pollId: text('poll_id').notNull(),
    optionId: text('option_id').notNull(),
    memberId: text('member_id').notNull(),
  },
  (t) => [
    index('votes_poll_idx').on(t.pollId),
    uniqueIndex('votes_unique_idx').on(t.optionId, t.memberId),
  ],
);

export const BUDGET_CATEGORIES = [
  'stay',
  'travel',
  'food',
  'activities',
  'shopping',
  'misc',
] as const;
export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export const budgets = sqliteTable(
  'budgets',
  {
    ...syncColumns,
    tripId: text('trip_id').notNull(),
    category: text('category', { enum: BUDGET_CATEGORIES }).notNull(),
    /** Planned spend per person, in the trip currency. */
    amountMinor: integer('amount_minor').notNull(),
  },
  (t) => [uniqueIndex('budgets_trip_category_idx').on(t.tripId, t.category)],
);

export const SPLIT_METHODS = ['equal', 'shares', 'exact', 'percent'] as const;
export type SplitMethod = (typeof SPLIT_METHODS)[number];

export const expenses = sqliteTable(
  'expenses',
  {
    ...syncColumns,
    tripId: text('trip_id').notNull(),
    title: text('title').notNull(),
    category: text('category', { enum: BUDGET_CATEGORIES }).notNull(),
    amountMinor: integer('amount_minor').notNull(),
    currency: text('currency').notNull(),
    /** Amount converted to the trip currency at the time it was added. */
    tripAmountMinor: integer('trip_amount_minor').notNull(),
    /** Rate used for that conversion (trip currency per 1 unit paid), as typed or fetched. Plan 13. */
    fxRate: text('fx_rate'),
    paidByMemberId: text('paid_by_member_id').notNull(),
    splitMethod: text('split_method', { enum: SPLIT_METHODS }).notNull(),
    spentAt: text('spent_at').notNull(),
    bookingId: text('booking_id'),
    notes: text('notes'),
  },
  (t) => [index('expenses_trip_idx').on(t.tripId, t.spentAt)],
);

export const expenseSplits = sqliteTable(
  'expense_splits',
  {
    ...syncColumns,
    expenseId: text('expense_id').notNull(),
    memberId: text('member_id').notNull(),
    /** This member's share in the trip currency. */
    shareMinor: integer('share_minor').notNull(),
    /** Input used for shares/percent methods (e.g. 2 shares, 25 %). */
    weight: integer('weight'),
  },
  (t) => [index('expense_splits_expense_idx').on(t.expenseId)],
);

export const settlements = sqliteTable(
  'settlements',
  {
    ...syncColumns,
    tripId: text('trip_id').notNull(),
    fromMemberId: text('from_member_id').notNull(),
    toMemberId: text('to_member_id').notNull(),
    amountMinor: integer('amount_minor').notNull(),
    method: text('method', { enum: ['upi', 'cash', 'other'] }).notNull(),
    settledAt: text('settled_at').notNull(),
  },
  (t) => [index('settlements_trip_idx').on(t.tripId)],
);

export const BOOKING_TYPES = [
  'flight',
  'train',
  'bus',
  'stay',
  'event',
  'rental',
  'other',
] as const;
export type BookingType = (typeof BOOKING_TYPES)[number];

export const bookings = sqliteTable(
  'bookings',
  {
    ...syncColumns,
    tripId: text('trip_id').notNull(),
    type: text('type', { enum: BOOKING_TYPES }).notNull(),
    title: text('title').notNull(),
    provider: text('provider'),
    reference: text('reference'),
    startsAt: text('starts_at'),
    endsAt: text('ends_at'),
    costMinor: integer('cost_minor'),
    currency: text('currency'),
    notes: text('notes'),
  },
  (t) => [index('bookings_trip_idx').on(t.tripId, t.startsAt)],
);

export const attachments = sqliteTable(
  'attachments',
  {
    ...syncColumns,
    tripId: text('trip_id').notNull(),
    bookingId: text('booking_id'),
    name: text('name').notNull(),
    mimeType: text('mime_type'),
    sizeBytes: integer('size_bytes'),
    /** File on this device; null on other devices until downloaded. */
    localUri: text('local_uri'),
    /** Object key in storage once uploaded (Phase 5). */
    remoteKey: text('remote_key'),
  },
  (t) => [index('attachments_booking_idx').on(t.bookingId)],
);

/** Trip photo pool (docs/01 §6). Files stay on the phone until uploads exist (Phase 5). Plan 13. */
export const photos = sqliteTable(
  'photos',
  {
    ...syncColumns,
    tripId: text('trip_id').notNull(),
    addedByMemberId: text('added_by_member_id'),
    /** File on this device; null on other devices until downloaded. */
    localUri: text('local_uri'),
    /** Object key in storage once uploaded (Phase 5). */
    remoteKey: text('remote_key'),
    width: integer('width'),
    height: integer('height'),
    /** When it was taken (UTC ISO) if the photo says so, else when it was added. */
    takenAt: text('taken_at').notNull(),
    /** Local date of the trip day it belongs to. */
    dayDate: text('day_date'),
    caption: text('caption'),
  },
  (t) => [index('photos_trip_idx').on(t.tripId, t.takenAt)],
);

/** Local changes waiting to be sent to the server once sync exists. */
export const outbox = sqliteTable(
  'outbox',
  {
    id: text('id').primaryKey(),
    tableName: text('table_name').notNull(),
    rowId: text('row_id').notNull(),
    op: text('op', { enum: ['upsert', 'delete'] }).notNull(),
    payload: text('payload').notNull(),
    clientTs: text('client_ts').notNull(),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
  },
  (t) => [index('outbox_client_ts_idx').on(t.clientTs)],
);

/** Device-only key/value settings (my name, home currency, sync cursor later). Not synced. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

/** Tables whose rows are synced and recorded in the outbox. */
export const syncedTables = {
  trips,
  trip_members: tripMembers,
  plan_variants: planVariants,
  itinerary_items: itineraryItems,
  polls,
  poll_options: pollOptions,
  votes,
  budgets,
  expenses,
  expense_splits: expenseSplits,
  settlements,
  bookings,
  attachments,
  photos,
} as const;

export type SyncedTableName = keyof typeof syncedTables;
