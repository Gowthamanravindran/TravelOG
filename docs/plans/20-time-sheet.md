# Plan 20 — Time picker without a native package ✅

**Status:** Built in the same commit as this file. A full Android export contains the time sheet and the New trip screen and no reference to `RNCDatePicker`.

### Context
New trip crashes on the owner's phone: `TurboModuleRegistry.getEnforcing(...): 'RNCDatePicker' could not be found`. Plan 18 added `@react-native-community/datetimepicker` for times; the app the owner runs (an older development build, or Expo Go) doesn't contain that native module, and simply importing it from `ui/date-field.tsx` crashes every screen that uses a date field. Plan 19's promise (test in Expo Go without builds) needs pickers that need nothing native.

### Change
| File | Change |
|---|---|
| `apps/mobile/src/ui/date-field.tsx` | `TimeField` opens our own **time sheet**, styled like the calendar sheet: a grid of hours 00–23 and minutes in 5-minute steps (plus "exact minute" − / +), the chosen time shown large, and Done / Cancel. Remove the datetimepicker import. |
| `packages/core/src/calendar.ts` | Pure helpers `splitTime` / `joinTime` / `roundTo5`, with tests |
| `apps/mobile/package.json`, lockfile | Remove `@react-native-community/datetimepicker` (`pnpm remove`), so no build needs it |
| Tests | Time sheet picks 18:35 and clears; no test mocks the removed package any more; a guard test asserts no app file imports a native package that Expo Go lacks (`@react-native-community/datetimepicker`) |
| `docs/plans/20-time-sheet.md`, README | Plan log |

### Verification
`pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`; `pnpm dev:go` here serves the bundle with no datetimepicker module in it (grep the bundle). Owner: `git pull && pnpm dev:go` → New trip opens; pick dates and a time. **No new build needed.**

### Correction to Plan 19
Plan 19 said `pnpm dev:go` "served a complete Android bundle". In development Expo Router loads each screen's code on demand, so that bundle didn't include the screens. Bundle checks now use a full `expo export`.
