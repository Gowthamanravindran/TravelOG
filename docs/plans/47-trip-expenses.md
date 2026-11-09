# Plan 47 — Trip mode "Expenses": no budget setting, solo-aware, switchable charts

**Status:** ✅ Built

## Context
Trip mode's money tab was **Budget**, the same screen as Plan mode's. It had Set/Edit budget, the People card, budget bars by category, Balances with Settle up, and the expense list. The owner asked for:
- the tab to be **Expenses**, since you record spending while travelling;
- **Set budget only in Plan mode**;
- **no split, Balances or Settle up on a one-person trip**;
- spending **by person** and **by category** as **charts you can switch between**.

Owner choices:
- a donut with a legend;
- "By person" shows each person's share of the costs;
- on solo trips, a small "Add people" link in place of the People card.

## Change
- **Trip mode tab** is **Expenses** (`live/expenses.tsx`, `expense` icon): Today · Plan · Nearby · Expenses · Memories.
- **`components/budget-view.tsx`:**
  - Set/Edit budget and the budget editor only in Plan mode. A budget set while planning still shows read-only in Trip mode.
  - **Groups (2+ people):** the People card, "You owe / You're owed", Balances with Settle up, and +/− and "split N ways" on each expense, as before.
  - **Solo trips:** "Travelling with others? **Add people**", which opens the add-person form. Expense rows show amount and category.
- **`components/spend-chart.tsx` (new):**
  - a donut (react-native-svg, included in Expo Go) with the total in the middle;
  - **By category · By person** switch, groups only;
  - legend with amount and percent;
  - in Plan mode each category's budget shows in its legend row with a bar, replacing the old By category card;
  - colours from the theme; switching fades over (none with Reduce motion);
  - one spoken summary for screen readers.
- **`packages/core/src/charts.ts`:** `donutArcs()` works out each slice's start and sweep. It leaves a gap between slices, makes one value a whole ring, and keeps a tiny value visible.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.
- New tests:
  - `donutArcs`;
  - `expenses-view.test.tsx`:
    - Trip mode has no budget buttons but shows a planned budget;
    - Plan mode saves a budget;
    - a solo trip has no Balances, owe line, split text or person switch, and adding a person brings them back;
    - the chart switches between categories and each person's share.
- Rendered with react-native-web at 390 pt: Trip mode solo, Trip mode group (both charts) and Plan mode.
- Owner: `git pull && pnpm dev:go`. `pnpm dev:go` installs react-native-svg, which is in Expo Go, so no new build is needed.
- The Android bundle baseline in `bundle-budget.json` is raised to 5.76 MB, with the reason noted: react-native-svg adds about 190 KB.
