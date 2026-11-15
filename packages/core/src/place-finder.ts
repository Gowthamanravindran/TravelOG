// Plan 59: place names in a post's caption or title, found with simple rules on the phone.
// Works well on captions that list places (📍 lines, numbered lists, hashtags) and poorly on
// chatty ones. Each candidate is then looked up with place search; an AI reader can replace
// this later behind the same shape.

import { normalizePlace } from './places';

export interface PlaceCandidate {
  /** The place's name as written. */
  name: string;
  /** The town or area written next to it ("📍 Gunpowder, Assagao" → Assagao). */
  area: string | null;
  /** True when the caption clearly marks it as a place (📍, a numbered list); else a guess. */
  sure: boolean;
}

const PIN = /^\s*(?:📍|📌|🗺️?|🏝️?|🍽️?|☕|📸|➡️|👉|-|•|\*)\s*/u;
const LISTED = /^\s*(?:\d{1,2}|[①-⑳])[.)\]:-]?\s+(?=\p{Lu})/u;
const LABEL =
  /^\s*(?:location|address|where|place|spot|cafe|café|restaurant|stay|hotel)\s*[:\-–]\s*/iu;
const SPLIT = /\s+[–—|-]\s+|\s*[:|]\s+/u;

/** Hashtags and words that are never a specific place. */
const GENERIC = new Set(
  [
    'travel',
    'travelgram',
    'traveltok',
    'wanderlust',
    'reels',
    'reel',
    'instagood',
    'explore',
    'explorepage',
    'foodie',
    'food',
    'cafe',
    'cafes',
    'india',
    'incredibleindia',
    'goa',
    'goadiaries',
    'kerala',
    'trip',
    'vacation',
    'holiday',
    'weekend',
    'fyp',
    'foryou',
    'viral',
    'trending',
    'travelblogger',
    'travelvlog',
    'vlog',
    'beach',
    'beaches',
    'hiddengem',
    'hiddengems',
    'sunset',
    'nature',
    'photography',
    'love',
    'instagram',
    'youtube',
    'shorts',
    'tiktok',
    'budget',
    'budgettravel',
    'solo',
    'solotravel',
    'couple',
    'friends',
    'roadtrip',
    'backpacking',
    'mountains',
    'the',
    'and',
    'best',
    'top',
    'my',
    'our',
    'this',
    'that',
    'these',
    'day',
    'part',
    'episode',
    'follow',
    'save',
    'share',
    'like',
    'comment',
    'subscribe',
    'link',
    'bio',
    'dm',
    'check',
    'must',
    'visit',
    'places',
    'place',
    'things',
    'guide',
    'tips',
    'itinerary',
    'price',
    'cost',
    'open',
    'timings',
    'timing',
    'hours',
    'per',
    'person',
  ].map((w) => normalizePlace(w)),
);

const STOP = new Set([
  'a',
  'an',
  'the',
  'of',
  'in',
  'at',
  'on',
  'to',
  'for',
  'and',
  'or',
  'with',
  'from',
  'by',
  'is',
]);

/** Words in many place names that say what, not which. */
const PLACE_NOUNS = new Set(
  [
    'fort',
    'cafe',
    'beach',
    'temple',
    'church',
    'market',
    'restaurant',
    'hotel',
    'resort',
    'bar',
    'lake',
    'falls',
    'hill',
    'hills',
    'point',
    'park',
    'palace',
    'museum',
    'bakery',
    'kitchen',
    'house',
    'island',
    'road',
    'street',
    'garden',
    'shack',
    'villa',
    'homestay',
  ].map((w) => normalizePlace(w)),
);

const isGeneric = (s: string) => {
  const n = normalizePlace(s);
  return !n || GENERIC.has(n) || GENERIC.has(n.replace(/\s/g, '')) || /^\d+$/.test(n);
};

/** "#ArtjunaCafe" → "Artjuna Cafe"; "#chapora_fort" → "Chapora Fort". */
export function hashtagWords(tag: string): string {
  return tag
    .replace(/^#/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/(\p{Ll})(\p{Lu})/gu, '$1 $2')
    .replace(/\b\p{Ll}/gu, (c) => c.toUpperCase())
    .trim();
}

/** Strips emoji, prices and trailing punctuation from a name. */
function tidy(s: string): string {
  return s
    .replace(/\p{Extended_Pictographic}|️/gu, '')
    .replace(/(?:₹|rs\.?|inr)\s*[\d,]+.*$/iu, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[.!,;:]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameAndArea(raw: string): { name: string; area: string | null } {
  const head = tidy(raw.split(SPLIT)[0] ?? raw);
  const [name, ...rest] = head.split(/\s*,\s*/);
  const area = rest.length ? tidy(rest[0]!) : null;
  return { name: tidy(name ?? ''), area: area || null };
}

/** Title Case runs of 2–4 words, e.g. "We loved Fort Aguada at sunset" → "Fort Aguada". */
function titleRuns(line: string): string[] {
  const words = line.split(/\s+/);
  const runs: string[] = [];
  let run: string[] = [];
  const flush = () => {
    while (run.length && STOP.has(run[run.length - 1]!.toLowerCase())) run.pop();
    if (run.length >= 2 && run.length <= 4) runs.push(run.join(' '));
    run = [];
  };
  words.forEach((raw, i) => {
    const w = raw.replace(/[^\p{L}\p{N}'&-]/gu, '');
    const capital = /^\p{Lu}[\p{Ll}'&-]+$|^\p{Lu}{2,}$/u.test(w);
    const joiner = run.length > 0 && STOP.has(w.toLowerCase()) && w.length <= 3;
    // A capital at the start of a sentence doesn't count on its own.
    const sentenceStart = i === 0 || /[.!?]$/.test(words[i - 1] ?? '');
    if (
      capital &&
      !(
        sentenceStart &&
        run.length === 0 &&
        !/^\p{Lu}[\p{Ll}]+$/u.test(words[i + 1]?.replace(/[^\p{L}]/gu, '') ?? '')
      )
    )
      run.push(w);
    else if (joiner) run.push(w);
    else flush();
    if (/[.,!?;:]$/.test(raw)) flush();
  });
  flush();
  return runs;
}

/** Place names in a caption or title, most certain first, without repeats. */
export function findPlaceCandidates(text: string, max = 12): PlaceCandidate[] {
  const out: PlaceCandidate[] = [];
  const seen = new Set<string>();
  const add = (name: string, area: string | null, sure: boolean) => {
    const n = normalizePlace(name);
    if (name.length < 3 || name.length > 60 || isGeneric(name) || seen.has(n)) return;
    seen.add(n);
    out.push({ name, area: area && !isGeneric(area) ? area : null, sure });
  };

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const pinned = PIN.test(line) && /📍|📌/u.test(line);
    if (pinned || LISTED.test(line) || LABEL.test(line)) {
      const rest = line.replace(PIN, '').replace(LISTED, '').replace(LABEL, '');
      const { name, area } = nameAndArea(rest);
      if (name) add(name, area, true);
      continue;
    }
    for (const m of line.matchAll(
      /(?:^|\s)(?:at|@|to|visit|visited)\s+(\p{Lu}[\p{L}'&-]*(?:\s+\p{Lu}[\p{L}'&-]*){0,3})/gu,
    ))
      add(tidy(m[1]!), null, false);
    for (const run of titleRuns(line.replace(/#[\p{L}\p{N}_]+/gu, ' ').replace(/@[\w.]+/g, ' ')))
      add(tidy(run), null, false);
  }
  for (const m of text.matchAll(/#([\p{L}\p{N}_]{4,})/gu)) {
    const words = hashtagWords(m[1]!);
    if (words.includes(' ') || /\p{Lu}.*\p{Lu}/u.test(m[1]!)) add(words, null, false);
  }
  return [...out.filter((c) => c.sure), ...out.filter((c) => !c.sure)].slice(0, max);
}

/** Whether a search result's name is plausibly the candidate (shares most of its words). */
export function sameName(candidate: string, found: string): boolean {
  const words = normalizePlace(candidate)
    .split(' ')
    .filter((w) => w.length > 2 && !STOP.has(w));
  // "Fort", "Café", "Beach" alone don't make two places the same.
  const distinct = words.filter((w) => !PLACE_NOUNS.has(w));
  const a = distinct.length ? distinct : words;
  const b = new Set(normalizePlace(found).split(' '));
  if (!a.length) return false;
  const hits = a.filter((w) => b.has(w)).length;
  return hits / a.length >= 0.5;
}
