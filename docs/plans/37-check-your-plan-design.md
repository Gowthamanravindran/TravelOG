# Plan 37 — "Check your plan" designed properly

**Status:** ✅ Built

## Context
In the "Check your plan" card (Plan 35), each question's actions were plain text links ("Add stay", "I'm sorted", "Dismiss") only 4 pt apart. They read as one run-on sentence, had no hierarchy, made Dismiss as loud as Add stay, and had tap targets under 44 pt. That broke the redesign's own rules (`docs/superpowers/specs/2026-11-05-app-redesign-design.md`): a filled pill only for the main action, outlined pills for every other button, and links only inline.

## Change
- **One block per question,** with hairline dividers between them. Each block has:
  - a 32 pt icon tile;
  - a strong **title** ("No stay for 14–15 Jul", "Landing in Panaji, sleeping in Gokarna", "Two stays on 13 Jul");
  - one muted line of detail;
  - its **actions as small outlined pills** (36 pt, 8 pt apart, wrapping);
  - **Dismiss as a ✕ in the corner,** with a 44 pt tap area.

  "Landing elsewhere" has no ✕, because "That's right" answers it. None of the actions is filled: the screen's main action stays the only filled button.
- **The card's heading is a small label** ("CHECK YOUR PLAN · 3 QUESTIONS"), so each question's title leads.
- **Route strip:** the starting city is a pill like the other stops (captioned "From"), journeys sit in round markers, and the lone "Add a place without a booking" link became an outlined **Place** pill at the end of the strip ("Add a place" before there are bookings).

## How it was checked
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`. A new design test checks that actions are 36 pt outlined pills (never links), that Dismiss is a ✕ with at least 44 pt of tap area, and the titles.
- **The real components were rendered** with react-native-web in Playwright at 390 pt, in Sunset and Colour block, light and dark. The screenshots were reviewed, and two problems were fixed before handing over: the heading was as large as the titles, and the starting city didn't match the other stops. (Icons are placeholders on the web, because the native symbol font isn't available there.)
