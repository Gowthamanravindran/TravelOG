# Plan 18 — Blank tabs fix, floating nav bar, date picker, trip redesign ✅

**Status:** Built on `claude/kind-allen-2woote`: crash fix `4a49078` (+ `cb6d352`), floating bar and date pickers `0a65faf`, header and screens (the commit that adds this file).

### Context
Owner test on Android (Plan 16 build):
- In Plan mode **only Itinerary shows**; Budget crashes and Bookings/Memories are blank. The owner's log: `React Hook useEffect requires an effect callback` / `Rendered more hooks than during the previous render` in `budget-view.tsx:74`. Cause: Plan 16 added a `useEffect` **after an early return** in `BudgetView`; with the React Compiler on (`app.config.ts experiments.reactCompiler`) the tab crashes and the tabs mounted after it stay blank. Jest didn't catch it, and lint didn't either: `react-hooks/rules-of-hooks` isn't enforced in our ESLint config. A scan with the rule on finds only this one place.
- "Trip section looks bad": the owner chose to redesign the **trip header** and **screen content** (Itinerary, Budget, Bookings, Memories).
- **Floating, detached bottom bar** in the current colours (reference image from the owner); centre **+ stays on Home only**.
- **All date fields use a picker**: a calendar sheet (trip start–end in one calendar; other dates on the same calendar); times use the phone's own time picker.
- On every screen the person must be able to **add**: budget, bookings, memories (clear primary buttons).

### Changes
| # | What | Where |
|---|---|---|
| 1 | **Crash fix:** move the hook above the early return (no hooks after `return`); turn on `react-hooks/rules-of-hooks: error` (and `exhaustive-deps: warn`) so CI fails on this. Add a screen test that renders each Plan-mode and Trip-mode tab route component in turn, including the budget `edit=1` path. | `components/budget-view.tsx`, `apps/mobile/eslint.config.js`, new `__tests__/trip-tabs.test.tsx` |
| 2 | **Floating bar:** rounded pill (radius 28) floating 12 pt above the bottom with side margins and a soft shadow, on the mode's surface colour. The active item is the accent colour with a soft accent pill; inactive items are muted. Home's centre **+** is a raised accent circle that sits in a notch above the bar, as in the reference. The bar sits in the layout under the content (not over it), so nothing is hidden. Same component for Home, Plan and Trip mode (Trip mode stays dark). | `ui/tab-bar.tsx` |
| 3 | **Calendar date picker:** `DateField` opens a bottom sheet with a month calendar (pure code, no new package; week starts Monday, today marked, past days allowed). **Range mode** for trip start–end: tap start, tap end, the days between are highlighted. Used for trip dates, booking dates, poll date options and the expense date. **Times** (`TimeField`): `@react-native-community/datetimepicker` in clock mode (native, so a new build is needed); the text input stays as a fallback. Calendar maths (month grid, range rules) is pure code in `@travelog/core/calendar` with tests. | `ui/date-field.tsx`, `ui/calendar-sheet.tsx`, `core/src/calendar.ts`, `trip-form.tsx`, `booking.tsx`, `poll.tsx`, `item.tsx`, `expense.tsx` |
| 4 | **Trip header redesign:** a compact hero with a large trip icon tile in the accent colour, the title, then destination · date range, then status chips: "In 10 days" / "Day 3 of 5" / "Dates not set", and people count. Round back and more buttons; "Open trip mode" / "Edit the plan" as a pill. | `components/trip-header.tsx` |
| 5 | **Screen content:** consistent section headers with a primary action on the right; a summary card at the top of each tab; icon tiles on list rows; empty states with a button that adds the first thing. Budget: summary (spent / budget with bar), **Set budget** and **Add expense** up front, People, then categories and expenses. Bookings: **Add booking** up front; rows with a type icon tile, date and reference. Memories: **Add photos** and **New carousel** up front. Itinerary: day chips styled as pills, **Add stop** up front. | `budget-view.tsx`, `bookings-view.tsx`, `memories-view.tsx`, `itinerary-view.tsx`, `ui/kit.tsx` (Section, IconTile) |

### Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test` (lint now enforces hook rules); tab-route test renders all 10 trip tabs; calendar maths tests (month grid incl. leap years, range select / reselect); date-field screen test picks a range and saves the trip.
- Android bundle within budget; `expo prebuild` clean with the date-time picker.
- Owner: new **development** build (date-time picker is native) → `pnpm dev` → every Plan / Trip tab shows content; floating bar; create a trip using the calendar; header and screens.

### What was built (changes from the plan above)
- **Crash fix:** the editor opens from the component's initial state instead of an effect; ESLint now enforces the hook rules; a test renders all ten trip tabs (also with `edit=1`).
- **Date pickers:** trip dates and poll date options use a range calendar, booking dates use a single-day calendar, and stop and booking times use the phone's clock. The expense form has no date field today, so none was added.
- **Screens:** Budget, Bookings and Memories open with a summary card that holds their main buttons (Add expense / Set budget, Add booking, Add photos / New carousel); Bookings rows have type icon tiles; empty states have an "add the first one" button. Itinerary already had Add stop and the setup card; it is unchanged apart from the shared kit.
- Not visually checked here (the app's encrypted database doesn't run in a browser); the owner checks on the phone.

### Owner test (Android)
1. New **development** build (the date-time picker is native) → `pnpm dev`.
2. Every Plan and Trip tab shows content; the floating bottom bar.
3. Create a trip and pick dates on the calendar; edit a booking date and time.
4. The trip header; Budget / Bookings / Memories each have their buttons at the top.
