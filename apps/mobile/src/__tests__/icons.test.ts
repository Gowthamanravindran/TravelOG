import { tripIcon, TRIP_ICONS } from '@/lib/labels';
import { ICONS, isIconName } from '@/ui/icon';

describe('icons', () => {
  it('every icon has a native name on both platforms', () => {
    for (const [name, pair] of Object.entries(ICONS)) {
      expect([name, typeof pair.ios, typeof pair.android]).toEqual([name, 'string', 'string']);
    }
  });

  it('trips made before icons keep a sensible icon', () => {
    expect(tripIcon('beach')).toBe('beach');
    expect(tripIcon('🏔️')).toBe('mountain');
    expect(tripIcon('🧳')).toBe('trips');
    expect(tripIcon('🤷')).toBe('trips');
    expect(tripIcon(null)).toBe('trips');
    expect(TRIP_ICONS.every((t) => isIconName(t.icon))).toBe(true);
  });
});
