import type { BookingType, BudgetCategory, ItemType, PollType, SplitMethod } from '@travelog/db';

import { isIconName, type IconName } from '@/ui/icon';

export const ITEM_LABELS: Record<ItemType, { label: string; icon: IconName }> = {
  place: { label: 'Place', icon: 'place' },
  activity: { label: 'Activity', icon: 'activity' },
  food: { label: 'Food', icon: 'food' },
  stay: { label: 'Stay', icon: 'stay' },
  transport: { label: 'Transport', icon: 'transport' },
  note: { label: 'Note', icon: 'note' },
};

export const CATEGORY_LABELS: Record<BudgetCategory, { label: string; icon: IconName }> = {
  stay: { label: 'Stay', icon: 'stay' },
  travel: { label: 'Travel', icon: 'car' },
  food: { label: 'Food', icon: 'food' },
  activities: { label: 'Activities', icon: 'activity' },
  shopping: { label: 'Shopping', icon: 'shopping' },
  misc: { label: 'Misc', icon: 'misc' },
};

export const BOOKING_LABELS: Record<BookingType, { label: string; icon: IconName }> = {
  flight: { label: 'Flight', icon: 'flight' },
  train: { label: 'Train', icon: 'train' },
  bus: { label: 'Bus', icon: 'transport' },
  stay: { label: 'Stay', icon: 'stay' },
  event: { label: 'Event', icon: 'bookings' },
  rental: { label: 'Rental', icon: 'car' },
  other: { label: 'Other', icon: 'note' },
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

export const POLL_ICONS: Record<PollType, IconName> = {
  dates: 'dates',
  variant: 'route',
  destination: 'place',
  stay: 'stay',
  activity: 'activity',
  custom: 'question',
};

/** Trip icons offered when creating or editing a trip (stored in trips.emoji). */
export const TRIP_ICONS: { icon: IconName; label: string }[] = [
  { icon: 'trips', label: 'Trip' },
  { icon: 'beach', label: 'Beach' },
  { icon: 'mountain', label: 'Mountains' },
  { icon: 'city', label: 'City' },
  { icon: 'car', label: 'Road trip' },
  { icon: 'flight', label: 'Abroad' },
  { icon: 'train', label: 'Train' },
  { icon: 'camping', label: 'Camping' },
  { icon: 'hiking', label: 'Trek' },
  { icon: 'temple', label: 'Pilgrimage' },
  { icon: 'festival', label: 'Celebration' },
  { icon: 'food', label: 'Food' },
];

/** Trips created before Plan 16 stored an emoji; show the closest icon. */
const LEGACY_EMOJI: Record<string, IconName> = {
  '🧳': 'trips',
  '🏖️': 'beach',
  '🏔️': 'mountain',
  '🌴': 'beach',
  '🛕': 'temple',
  '🌧️': 'waves',
  '🏙️': 'city',
  '🚙': 'car',
  '🌸': 'flower',
  '🎉': 'festival',
};

export function tripIcon(stored: string | null | undefined): IconName {
  if (isIconName(stored)) return stored;
  return (stored && LEGACY_EMOJI[stored]) || 'trips';
}
