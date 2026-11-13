import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { View } from 'react-native';

import { useTheme } from './theme';

type SymbolName = ComponentProps<typeof SymbolView>['name'];
type Pair = Extract<SymbolName, { ios?: unknown }>;

/**
 * App icons: Apple SF Symbols on iPhone, Google Material Symbols on Android
 * (expo-symbols), so each platform gets its own native-looking icon. One
 * semantic name per meaning; add new ones here.
 */
export const ICONS = {
  // Navigation
  trips: { ios: 'suitcase.rolling', android: 'luggage' },
  feed: { ios: 'rectangle.stack', android: 'dynamic_feed' },
  explore: { ios: 'safari', android: 'explore' },
  profile: { ios: 'person.crop.circle', android: 'account_circle' },
  add: { ios: 'plus', android: 'add' },
  back: { ios: 'chevron.left', android: 'chevron_left' },
  more: { ios: 'ellipsis', android: 'more_horiz' },
  close: { ios: 'xmark', android: 'close' },
  itinerary: { ios: 'calendar', android: 'calendar_month' },
  budget: { ios: 'creditcard', android: 'account_balance_wallet' },
  bookings: { ios: 'ticket', android: 'confirmation_number' },
  polls: { ios: 'checklist', android: 'how_to_vote' },
  memories: { ios: 'photo.on.rectangle', android: 'photo_library' },
  today: { ios: 'sun.max', android: 'today' },
  plan: { ios: 'map', android: 'map' },
  nearby: { ios: 'location', android: 'near_me' },
  // Actions
  expense: { ios: 'indianrupeesign.circle', android: 'payments' },
  checkIn: { ios: 'mappin.and.ellipse', android: 'pin_drop' },
  personAdd: { ios: 'person.badge.plus', android: 'person_add' },
  people: { ios: 'person.2', android: 'group' },
  addPhoto: { ios: 'photo.badge.plus', android: 'add_photo_alternate' },
  text: { ios: 'textformat', android: 'text_fields' },
  sticker: { ios: 'star.circle', android: 'interests' },
  palette: { ios: 'paintpalette', android: 'palette' },
  slides: { ios: 'rectangle.split.3x1', android: 'view_carousel' },
  layout: { ios: 'square.grid.2x2', android: 'dashboard' },
  undo: { ios: 'arrow.uturn.backward', android: 'undo' },
  redo: { ios: 'arrow.uturn.forward', android: 'redo' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
  download: { ios: 'square.and.arrow.down', android: 'download' },
  camera: { ios: 'camera', android: 'photo_camera' },
  check: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  circle: { ios: 'circle', android: 'radio_button_unchecked' },
  edit: { ios: 'pencil', android: 'edit' },
  error: { ios: 'exclamationmark.triangle', android: 'error' },
  bell: { ios: 'bell', android: 'notifications' },
  stats: { ios: 'chart.bar', android: 'bar_chart' },
  // Places, items, categories
  place: { ios: 'mappin', android: 'location_on' },
  activity: { ios: 'figure.walk', android: 'local_activity' },
  food: { ios: 'fork.knife', android: 'restaurant' },
  stay: { ios: 'bed.double', android: 'hotel' },
  transport: { ios: 'bus', android: 'directions_bus' },
  note: { ios: 'note.text', android: 'sticky_note_2' },
  flight: { ios: 'airplane', android: 'flight' },
  train: { ios: 'tram', android: 'train' },
  car: { ios: 'car', android: 'directions_car' },
  event: { ios: 'calendar.badge.clock', android: 'event' },
  shopping: { ios: 'bag', android: 'shopping_bag' },
  misc: { ios: 'square.grid.2x2', android: 'category' },
  dates: { ios: 'calendar', android: 'date_range' },
  route: { ios: 'arrow.triangle.branch', android: 'alt_route' },
  question: { ios: 'questionmark.bubble', android: 'ballot' },
  // Trip kinds and stickers
  beach: { ios: 'beach.umbrella', android: 'beach_access' },
  mountain: { ios: 'mountain.2', android: 'landscape' },
  city: { ios: 'building.2', android: 'location_city' },
  camping: { ios: 'tent', android: 'camping' },
  desert: { ios: 'sun.horizon', android: 'wb_twilight' },
  hiking: { ios: 'figure.hiking', android: 'hiking' },
  festival: { ios: 'party.popper', android: 'celebration' },
  sailing: { ios: 'sailboat', android: 'sailing' },
  snow: { ios: 'snowflake', android: 'ac_unit' },
  temple: { ios: 'building.columns', android: 'temple_hindu' },
  heart: { ios: 'heart.fill', android: 'favorite' },
  sun: { ios: 'sun.max.fill', android: 'wb_sunny' },
  waves: { ios: 'water.waves', android: 'waves' },
  sparkle: { ios: 'sparkles', android: 'auto_awesome' },
  flower: { ios: 'camera.macro', android: 'local_florist' },
  drink: { ios: 'wineglass', android: 'local_bar' },
  globe: { ios: 'globe.asia.australia', android: 'public' },
  idea: { ios: 'lightbulb', android: 'lightbulb' },
  lock: { ios: 'lock.fill', android: 'lock' },
  trophy: { ios: 'trophy', android: 'emoji_events' },
  attach: { ios: 'paperclip', android: 'attach_file' },
  upload: { ios: 'doc.badge.arrow.up', android: 'upload_file' },
  document: { ios: 'doc.text', android: 'description' },
  up: { ios: 'arrow.up', android: 'arrow_upward' },
  down: { ios: 'arrow.down', android: 'arrow_downward' },
  left: { ios: 'chevron.left', android: 'chevron_left' },
  right: { ios: 'chevron.right', android: 'chevron_right' },
  remove: { ios: 'minus', android: 'remove' },
  star: { ios: 'star.fill', android: 'star' },
  located: { ios: 'location.fill', android: 'my_location' },
  seamless: { ios: 'arrow.left.and.right', android: 'swap_horiz' },
  crop: { ios: 'crop', android: 'crop' },
  wave: { ios: 'hand.wave', android: 'waving_hand' },
} as const satisfies Record<string, Pair>;

export type IconName = keyof typeof ICONS;

export function isIconName(value: unknown): value is IconName {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(ICONS, value);
}

export function Icon({
  name,
  size = 20,
  color,
  label,
}: {
  name: IconName;
  size?: number;
  color?: string;
  /** Spoken by screen readers when the icon stands alone; omit when next to text. */
  label?: string;
}) {
  const t = useTheme();
  return (
    <View
      accessible={!!label}
      accessibilityLabel={label}
      importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}
      style={{ width: size, height: size }}
    >
      <SymbolView
        name={ICONS[name] as SymbolName}
        size={size}
        tintColor={color ?? t.ink}
        fallback={<View style={{ width: size, height: size }} />}
      />
    </View>
  );
}
