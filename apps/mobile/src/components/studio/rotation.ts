/**
 * A rotation transform that is always an array (Plan 25). Switching a view's
 * `transform` from an array to `undefined` crashes the new renderer
 * ("Cannot read property 'forEach' of null"), which happened every time an item
 * rotated back to exactly 0°. Bad numbers draw as 0°.
 */
export function rotationStyle(deg: number | undefined): { rotate: string }[] {
  const d = typeof deg === 'number' && Number.isFinite(deg) ? deg : 0;
  return [{ rotate: `${d}deg` }];
}
