// Fails CI if the Android JS bundle grows more than the allowed percentage (docs/08).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'apps/mobile/dist/_expo/static/js/android';
const budget = JSON.parse(readFileSync('bundle-budget.json', 'utf8'));
const files = readdirSync(dir).filter((f) => f.endsWith('.hbc') || f.endsWith('.js'));
const size = files.reduce((total, f) => total + statSync(join(dir, f)).size, 0);
const limit = Math.round(budget.androidBundleBytes * (1 + budget.maxGrowthPercent / 100));
const change = (((size - budget.androidBundleBytes) / budget.androidBundleBytes) * 100).toFixed(1);

console.log(
  `Android bundle: ${size} bytes (baseline ${budget.androidBundleBytes}, ${change}% change, limit ${limit}).`,
);
if (size > limit) {
  console.error('Bundle grew more than the budget allows. See docs/08-app-optimizations.md.');
  process.exit(1);
}
