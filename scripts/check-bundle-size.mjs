// Reports the Android JS bundle size against the budget (docs/08).
// Plan 50: the owner paused enforcement until most of the planned app is built, so
// going over the limit only warns. BUNDLE_BUDGET_ENFORCE=1 makes it fail again.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'apps/mobile/dist/_expo/static/js/android';
const budget = JSON.parse(
  readFileSync(process.env.BUNDLE_BUDGET_FILE ?? 'bundle-budget.json', 'utf8'),
);
const files = readdirSync(dir).filter((f) => f.endsWith('.hbc') || f.endsWith('.js'));
const size = files.reduce((total, f) => total + statSync(join(dir, f)).size, 0);
const limit = Math.round(budget.androidBundleBytes * (1 + budget.maxGrowthPercent / 100));
const change = (((size - budget.androidBundleBytes) / budget.androidBundleBytes) * 100).toFixed(1);

console.log(
  `Android bundle: ${size} bytes (baseline ${budget.androidBundleBytes}, ${change}% change, limit ${limit}).`,
);
if (size > limit) {
  if (process.env.BUNDLE_BUDGET_ENFORCE === '1') {
    console.error('Bundle grew more than the budget allows. See docs/08-app-optimizations.md.');
    process.exit(1);
  }
  console.log(
    `::warning::Android bundle is ${change}% over its baseline, past the ${budget.maxGrowthPercent}% budget. ` +
      'Enforcement is paused until most of the planned app is built (Plan 50).',
  );
}
