import type { BookingType, BudgetCategory, ItemType, PollType, SplitMethod } from '@travelog/db';

export const ITEM_LABELS: Record<ItemType, { label: string; icon: string }> = {
  place: { label: 'Place', icon: '📍' },
  activity: { label: 'Activity', icon: '🎟️' },
  food: { label: 'Food', icon: '🍽️' },
  stay: { label: 'Stay', icon: '🏡' },
  transport: { label: 'Transport', icon: '🚌' },
  note: { label: 'Note', icon: '📝' },
};

export const CATEGORY_LABELS: Record<BudgetCategory, { label: string; icon: string }> = {
  stay: { label: 'Stay', icon: '🏡' },
  travel: { label: 'Travel', icon: '🚗' },
  food: { label: 'Food', icon: '🍽️' },
  activities: { label: 'Activities', icon: '🎟️' },
  shopping: { label: 'Shopping', icon: '🛍️' },
  misc: { label: 'Misc', icon: '🧾' },
};

export const BOOKING_LABELS: Record<BookingType, { label: string; icon: string }> = {
  flight: { label: 'Flight', icon: '✈️' },
  train: { label: 'Train', icon: '🚆' },
  bus: { label: 'Bus', icon: '🚌' },
  stay: { label: 'Stay', icon: '🏨' },
  event: { label: 'Event', icon: '🎫' },
  rental: { label: 'Rental', icon: '🛵' },
  other: { label: 'Other', icon: '📄' },
};

export const POLL_LABELS: Record<PollType, string> = {
  dates: 'Dates',
  variant: 'Day plans',
  destination: 'Destination',
  stay: 'Stay',
  activity: 'Activity',
  custom: 'Question',
};

export const SPLIT_LABELS: Record<SplitMethod, string> = {
  equal: 'Equally',
  shares: 'Shares',
  exact: 'Exact',
  percent: '%',
};

export const TRIP_EMOJIS = ['🧳', '🏖️', '🏔️', '🌴', '🛕', '🌧️', '🏙️', '🚙', '🌸', '🎉'];
