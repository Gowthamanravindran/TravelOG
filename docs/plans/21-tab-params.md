# Plan 21 — Empty trip tabs: pass the trip id to every tab ✅

**Status:** Built in the same commit as this file. The new real-router test failed on the previous code (first tab fine, Budget had no "Add expense") and passes now.

### Context
Budget, Bookings and Memories are **still completely empty** in Expo Go with the latest code; only the first tab (Itinerary / Today) shows content. Root cause (read in `expo-router/build/hooks/useLocalSearchParams.js`): for a page route, `useLocalSearchParams()` returns only that route's own params. When the Plan/Trip tab navigator opens at `/trip/<id>/plan`, only the first tab's route gets `{ id }`; tabs opened later are created **without `id`**. Every tab screen reads `id` that way, finds no trip and renders nothing. The trip header is rendered in the layout's context, where Expo Router merges the parent params, so it still showed the trip. The Plan 18 crash fix was real but not the whole story. Screen tests mocked `useLocalSearchParams`, so they could never see this.

### Changes
| File | Change |
|---|---|
| `app/trip/[id]/plan/_layout.tsx`, `app/trip/[id]/live/_layout.tsx` | Read `id` in the layout (where it's available) and give every `Tabs.Screen` `initialParams={{ id }}`, so each tab route carries it |
| `lib/use-trip-id.ts` + all tab screens (`plan/*`, `live/*`) | `useTripId()`: the tab's own `id`, falling back to the global URL params, so a tab can never lose the trip again |
| New `__tests__/trip-navigation.test.tsx` | **Real router test** with `expo-router/testing-library` `renderRouter`: open `/trip/<id>/plan`, tap Budget / Bookings / Memories / Polls in the floating bar and expect their content ("Add expense", "Add booking", "Add photos"); same for Trip mode. Written first and shown failing on the current code. |
| `docs/plans/21-tab-params.md`, README | Plan log, including the correction that Plan 18's fix wasn't the whole cause |

### Verification
The new router test fails before the change and passes after; `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. Owner: `git pull && pnpm dev:go` → every tab shows its content and buttons. No new build needed.

### What was built (change from the plan above)
- `Tabs.Screen` in this Expo Router version doesn't take `initialParams`, so the fix is `useTripId()` alone: the tab's own `id`, else the URL's. It's used by every Plan/Trip tab screen and the trip header.
- Correction: Plan 18 said the crash fix explained the empty tabs. It explained the Budget crash only; the empty tabs were this missing `id`.
