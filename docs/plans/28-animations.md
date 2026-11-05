# Plan 28 — Lively animations, plus the React Native skill

**Status:** ✅ Built

## Context
The owner found the app bland: nothing moved except the button press. They chose the **"Lively"** level, asked for animations before places autocomplete (places is still being discussed), and asked to add Vercel's `react-native-skills` skill.

## The skill
`.claude/skills/react-native-skills/` is copied unchanged from `vercel-labs/agent-skills` (commit `1a2c79d`, MIT) after review: 42 Markdown/JSON files with no scripts, no hidden text and no secrets. `NOTE.md` lists the rules that don't fit Expo Go:
- native tabs;
- native menus;
- the gallery image viewer;
- the font config plugin;
- `GestureDetector` presses.

CLAUDE.md points to it.

## What moves
Built with Reanimated 4, already in Expo Go. Everything follows the phone's **Reduce motion** setting, only transform and opacity animate, and nothing is triggered by scrolling.
- **Lists:** trips, itinerary stops, expenses, bookings, polls and collages rise in one after another when a screen opens. New rows grow in and deleted rows fade out (`Appear`).
- **Screens:** each tab and screen fades in when it first opens. Forms slide up as sheets; other screens slide in from the right.
- **Tab bar and segmented controls:** one pill slides to the selection with a settling spring, with a selection haptic.
- **Calendar and time sheets:** the sheet springs up while the backdrop fades.
- **Numbers and bars:** the budget's "Group spent" counts up, and progress bars fill (with a transform, not a width).
- **Celebrations:** a check-mark burst with a success haptic when you create a trip, add an expense, mark a settle-up paid, or finish an export.
- **Small touches:**
  - buttons and cards shrink and dim on the UI thread;
  - the photo selection number pops in;
  - the collage canvas cross-fades on a layout or format change;
  - chips give a selection haptic.

## Code
- `apps/mobile/src/ui/motion.tsx`: `MOTION` durations and spring, plus:
  - `useMotionOk()` (Reduce motion);
  - `Appear`;
  - `CountUp`;
  - `haptic()`, which never throws;
  - `CelebrationHost` / `useCelebrate()`.
- **Kit:** `ui/kit.tsx` and `ui/tab-bar.tsx`.
- **Sheets:** `ui/date-field.tsx`.
- **Lists:** the list views (home, itinerary, budget, bookings, polls, memories).
- **Transitions:** the stack layouts.
- **Celebrations:** new-trip, expense, settle and export screens.
- **Collage editor:** the canvas fade.
- **Haptics:** `expo-haptics` (in Expo Go).
- **Jest:** a chained resolver (`jest.resolver.js`) and `jest.setup.js` run Reanimated's JS build in tests.
- **Fixes a Plan 26 deferred minor:** the press feedback no longer queries reduce motion once per button.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`: 132 app tests.
- New tests:
  - `motion.test.tsx`: reduce motion, `Appear`, `CountUp` final value, celebration and haptic, haptic never throws.
  - Kit: sliding pills and bar fill.
  - `celebrations.test.tsx`: creating a trip shows the burst.
- The Android export is within budget (+2.0%), and the production bundle contains the haptics and celebration code.
- **Owner:**
  1. `git pull && pnpm dev:go`.
  2. Open trips, switch tabs, add an expense, create a trip, change a collage layout.
  3. Turn on Android **Settings → Accessibility → Remove animations** and check things appear without moving.

  No new build is needed.
