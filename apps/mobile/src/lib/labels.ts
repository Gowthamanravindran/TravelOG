import type { TileFamily } from '@travelog/ui';
import type { BookingType, BudgetCategory, ItemType, PollType, SplitMethod } from '@travelog/db';

import { isIconName, type IconName } from '@/ui/icon';
import type { ArtName } from '@/ui/art';

export const ITEM_LABELS: Record<ItemType, { label: string; icon: IconName; family: TileFamily }> =
  {
    place: { label: 'Place', icon: 'place', family: 'leaf' },
    activity: { label: 'Activity', icon: 'activity', family: 'leaf' },
    food: { label: 'Food', icon: 'food', family: 'mango' },
    stay: { label: 'Stay', icon: 'stay', family: 'clay' },
    transport: { label: 'Transport', icon: 'transport', family: 'sea' },
    note: { label: 'Note', icon: 'note', family: 'rose' },
  };

export const CATEGORY_LABELS: Record<
  BudgetCategory,
  { label: string; icon: IconName; family: TileFamily }
> = {
  stay: { label: 'Stay', icon: 'stay', family: 'clay' },
  travel: { label: 'Travel', icon: 'car', family: 'sea' },
  food: { label: 'Food', icon: 'food', family: 'mango' },
  activities: { label: 'Activities', icon: 'activity', family: 'leaf' },
  shopping: { label: 'Shopping', icon: 'shopping', family: 'mango' },
  misc: { label: 'Misc', icon: 'misc', family: 'rose' },
};

export const BOOKING_LABELS: Record<
  BookingType,
  { label: string; icon: IconName; family: TileFamily }
> = {
  flight: { label: 'Flight', icon: 'flight', family: 'sea' },
  train: { label: 'Train', icon: 'train', family: 'sea' },
  bus: { label: 'Bus', icon: 'transport', family: 'sea' },
  stay: { label: 'Stay', icon: 'stay', family: 'clay' },
  event: { label: 'Event', icon: 'bookings', family: 'rose' },
  rental: { label: 'Rental', icon: 'car', family: 'clay' },
  other: { label: 'Other', icon: 'note', family: 'rose' },
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
export const TRIP_ICONS: { icon: IconName; label: string; family: TileFamily }[] = [
  { icon: 'trips', label: 'Trip', family: 'rose' },
  { icon: 'beach', label: 'Beach', family: 'sea' },
  { icon: 'mountain', label: 'Mountains', family: 'clay' },
  { icon: 'city', label: 'City', family: 'mango' },
  { icon: 'car', label: 'Road trip', family: 'leaf' },
  { icon: 'flight', label: 'Abroad', family: 'sea' },
  { icon: 'train', label: 'Train', family: 'leaf' },
  { icon: 'camping', label: 'Camping', family: 'clay' },
  { icon: 'hiking', label: 'Trek', family: 'leaf' },
  { icon: 'temple', label: 'Pilgrimage', family: 'rose' },
  { icon: 'festival', label: 'Celebration', family: 'mango' },
  { icon: 'food', label: 'Food', family: 'mango' },
  { icon: 'desert', label: 'Desert', family: 'mango' },
];

/** The 3D object for a trip icon (Plan 52); anything unknown gets the suitcase. */
const TRIP_ART: Partial<Record<IconName, ArtName>> = {
  trips: 'luggage',
  beach: 'beach',
  mountain: 'mountain',
  city: 'city',
  car: 'car',
  flight: 'airplane',
  train: 'train',
  camping: 'camping',
  hiking: 'boot',
  temple: 'temple',
  festival: 'party',
  food: 'food',
  desert: 'desert',
};

export function tripArt(icon: IconName): ArtName {
  return TRIP_ART[icon] ?? 'luggage';
}

/** The tile colour family for a trip icon (Plan 26); unknown icons are rose. */
export function tripIconFamily(icon: IconName): TileFamily {
  return TRIP_ICONS.find((x) => x.icon === icon)?.family ?? 'rose';
}

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
