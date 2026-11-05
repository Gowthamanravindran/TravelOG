import { useGlobalSearchParams, useLocalSearchParams } from 'expo-router';

/**
 * The trip id for screens inside a trip (Plan 21). A tab's own params can lack
 * `id` (tabs opened after the first one are created without it), so fall back
 * to the URL, which always has /trip/<id>/….
 */
export function useTripId(): string {
  const local = useLocalSearchParams<{ id?: string }>();
  const global = useGlobalSearchParams<{ id?: string }>();
  return local.id ?? global.id ?? '';
}
