import { isLocalDate } from './dates';
import { minorDigits } from './money';

/**
 * Reads booking details out of a ticket's or voucher's text (Plan 31), with
 * patterns and no AI: type, PNR or booking reference, dates and times, places,
 * price, provider and a few notes (passengers, seat, room). Dates and times are
 * the local ones printed on the ticket; the form turns them into UTC with the
 * trip's time zone. Everything found is shown for checking before it's saved.
 */

export type DraftType = 'flight' | 'train' | 'bus' | 'stay' | 'event' | 'rental' | 'other';
export type DraftField =
  | 'type'
  | 'title'
  | 'provider'
  | 'reference'
  | 'start'
  | 'end'
  | 'cost'
  | 'notes'
  | 'where'
  | 'address';

export interface BookingDraft {
  type: DraftType;
  title: string;
  provider: string | null;
  reference: string | null;
  /** Local date 'YYYY-MM-DD' and time 'HH:MM' as printed. */
  startDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  costMinor: number | null;
  currency: string | null;
  notes: string | null;
  /** Places as printed (Plan 35): journeys' ends, or a stay's city. */
  fromText?: string | null;
  toText?: string | null;
  placeText?: string | null;
  /** Airport codes, when the ticket has them. */
  fromCode?: string | null;
  toCode?: string | null;
  address?: string | null;
  /** Filled in on the phone once the places above are found in our places list. */
  fromPlaceId?: string | null;
  toPlaceId?: string | null;
  placeId?: string | null;
  /** The fields filled from the document. */
  found: DraftField[];
}

export interface ParseOptions {
  /** Used when a price has no currency marked, and preferred when a ticket shows several. */
  currency: string;
  /** For dates printed without a year; defaults to now. */
  today?: string;
  /** The trip's first day, for dates printed without a year when the ticket has no booking date. */
  tripStart?: string | null;
}

// ---------------------------------------------------------------- providers

const AIRLINES: [string, string][] = [
  ['6E', 'IndiGo'],
  ['AI', 'Air India'],
  ['IX', 'Air India Express'],
  ['UK', 'Vistara'],
  ['SG', 'SpiceJet'],
  ['QP', 'Akasa Air'],
  ['I5', 'AirAsia India'],
  ['9I', 'Alliance Air'],
  ['S5', 'Star Air'],
  ['EK', 'Emirates'],
  ['QR', 'Qatar Airways'],
  ['EY', 'Etihad Airways'],
  ['FZ', 'flydubai'],
  ['G9', 'Air Arabia'],
  ['SQ', 'Singapore Airlines'],
  ['TR', 'Scoot'],
  ['TG', 'Thai Airways'],
  ['FD', 'Thai AirAsia'],
  ['AK', 'AirAsia'],
  ['MH', 'Malaysia Airlines'],
  ['OD', 'Batik Air'],
  ['VN', 'Vietnam Airlines'],
  ['VJ', 'VietJet Air'],
  ['UL', 'SriLankan Airlines'],
  ['CX', 'Cathay Pacific'],
  ['JL', 'Japan Airlines'],
  ['NH', 'ANA'],
  ['LH', 'Lufthansa'],
  ['BA', 'British Airways'],
  ['AF', 'Air France'],
  ['KL', 'KLM'],
  ['TK', 'Turkish Airlines'],
  ['QF', 'Qantas'],
  ['UA', 'United Airlines'],
  ['DL', 'Delta'],
  ['AA', 'American Airlines'],
  ['LX', 'SWISS'],
  ['EW', 'Eurowings'],
  ['FR', 'Ryanair'],
  ['U2', 'easyJet'],
  ['SK', 'Scandinavian Airlines'],
  ['DY', 'Norwegian'],
  ['D8', 'Norwegian'],
  ['AY', 'Finnair'],
  ['OS', 'Austrian'],
  ['SN', 'Brussels Airlines'],
  ['IB', 'Iberia'],
  ['VY', 'Vueling'],
  ['AZ', 'ITA Airways'],
  ['TP', 'TAP Air Portugal'],
  ['W6', 'Wizz Air'],
  ['EI', 'Aer Lingus'],
  ['VS', 'Virgin Atlantic'],
  ['AC', 'Air Canada'],
  ['WY', 'Oman Air'],
  ['GF', 'Gulf Air'],
  ['SV', 'Saudia'],
  ['ET', 'Ethiopian Airlines'],
];
const AIRLINE_BY_CODE = new Map(AIRLINES);

/** Booking sites and operators that aren't airlines. */
const SITES = [
  'MakeMyTrip',
  'Goibibo',
  'Cleartrip',
  'Yatra',
  'EaseMyTrip',
  'ixigo',
  'Booking.com',
  'Agoda',
  'Airbnb',
  'Expedia',
  'Trip.com',
  'Hotels.com',
  'OYO',
  'Treebo',
  'FabHotels',
  'Zostel',
  'redBus',
  'AbhiBus',
  'IRCTC',
  'BookMyShow',
  'Klook',
  'GetYourGuide',
  'Viator',
  'Zoomcar',
  'Savaari',
  'KSRTC',
  'MSRTC',
  'HRTC',
  'Eurostar',
  'SNCF',
  'Trenitalia',
  'Deutsche Bahn',
  'Gotogate',
  'Kiwi.com',
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findName = (text: string, names: string[]) => {
  let best: { name: string; at: number } | null = null;
  for (const name of names) {
    const m = new RegExp(`(?<![\\w])${esc(name)}(?![\\w])`, 'i').exec(text);
    if (m && (!best || m.index < best.at)) best = { name, at: m.index };
  }
  return best?.name ?? null;
};

// ---------------------------------------------------------------- type

const TYPE_SIGNALS: [DraftType, RegExp, number][] = [
  [
    'flight',
    /\b(flight|airlines?|airways|boarding pass|terminal|baggage|cabin|e-?ticket number|aircraft)\b/gi,
    2,
  ],
  ['flight', /\bweb check-?in\b/gi, 2],
  [
    'train',
    /\b(train|irctc|coach|berth|railways?|electronic reservation slip|quota|date of journey)\b/gi,
    3,
  ],
  ['bus', /\b(bus|boarding point|dropping point|bus operator|travels|sleeper|seater)\b/gi, 2],
  [
    'stay',
    /\b(hotel|resort|room|nights?|guests?|homestay|villa|hostel|property|accommodation|cottage|host(?:ed)?)\b/gi,
    1,
  ],
  ['stay', /\bcheck-?out\b/gi, 3],
  [
    'event',
    /\b(event|concert|show|venue|admit|museum|entry|tour|activity|tickets? for|tickets)\b/gi,
    1,
  ],
  ['rental', /\b(car rental|self[- ]drive|rental|pick-?up location|drop-?off location)\b/gi, 2],
];

const SITE_TYPES: [RegExp, DraftType][] = [
  [/^(redBus|AbhiBus|KSRTC|MSRTC|HRTC)$/, 'bus'],
  [/^(IRCTC|Eurostar|SNCF|Trenitalia|Deutsche Bahn)$/, 'train'],
  [/^(Booking\.com|Agoda|Airbnb|Hotels\.com|OYO|Treebo|FabHotels|Zostel)$/, 'stay'],
  [/^(BookMyShow|Klook|GetYourGuide|Viator)$/, 'event'],
  [/^(Zoomcar|Savaari)$/, 'rental'],
];

function detectType(
  text: string,
  flightNumbers: number,
  trainNumber: boolean,
  site: string | null,
): DraftType {
  const score: Record<DraftType, number> = {
    flight: flightNumbers * 4,
    train: trainNumber ? 4 : 0,
    bus: 0,
    stay: 0,
    event: 0,
    rental: 0,
    other: 0,
  };
  for (const [type, re, weight] of TYPE_SIGNALS)
    score[type] += (text.match(re)?.length ?? 0) * weight;
  const siteType = site && SITE_TYPES.find(([re]) => re.test(site))?.[1];
  if (siteType) score[siteType] += 3;
  if (/\bPNR\b/i.test(text) && /\b\d{10}\b/.test(text) && /\b(train|coach|irctc)\b/i.test(text))
    score.train += 4;
  const best = (Object.keys(score) as DraftType[]).reduce((a, b) => (score[b] > score[a] ? b : a));
  return score[best] > 0 ? best : 'other';
}

// ---------------------------------------------------------------- lines and labels

interface Line {
  text: string;
  /** Offset of the line in the whole text. */
  at: number;
}

const COL = /\s{3,}/;

function linesOf(text: string): Line[] {
  const out: Line[] = [];
  let at = 0;
  for (const raw of text.split('\n')) {
    out.push({ text: raw.replace(/\s+$/, ''), at });
    at += raw.length + 1;
  }
  return out;
}

/** Which column (split on 3+ spaces) the character at `pos` of a line sits in. */
function columnAt(line: string, pos: number): number {
  let col = 0;
  const re = /\s{3,}/g;
  for (let m = re.exec(line); m && m.index < pos; m = re.exec(line)) col++;
  return col;
}

/**
 * The value printed after a label: on the same line, or under it in the next line
 * (a table header with values below). `shape` must match the whole value token(s).
 */
function valueAfter(lines: Line[], label: RegExp, shape: RegExp): string | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.text;
    const re = new RegExp(
      label.source,
      label.flags.includes('g') ? label.flags : label.flags + 'g',
    );
    for (let m = re.exec(line); m; m = re.exec(line)) {
      const rest = line.slice(m.index + m[0].length).replace(/^[\s:#.\-–|/)]*/, '');
      const sameLine = matchStart(rest, shape);
      if (sameLine) return sameLine;
      // Header row: take the same column of the next line(s).
      const below = lines[i + 1]?.text;
      if (below && (rest === '' || COL.test(line))) {
        const col = columnAt(line, m.index);
        const cells = below.trim().split(COL);
        const cell = cells[col] ?? (cells.length === 1 ? cells[0] : undefined);
        const v = cell && matchStart(cell.trim(), shape);
        if (v) return v;
        const first = matchStart(below.trim(), shape);
        if (first && col === 0) return first;
      }
    }
  }
  return null;
}

function matchStart(text: string, shape: RegExp): string | null {
  const m = new RegExp(`^(?:${shape.source})(?![\\w])`, shape.flags.replace('g', '')).exec(text);
  return m ? m[0] : null;
}

// ---------------------------------------------------------------- reference

const REF_LABELS: RegExp[] = [
  /\b(?:airline\s+)?PNR(?:\s*(?:No\.?|Number|Code))?\b/i,
  /\b(?:airline\s+)?check-?in\s+reference(?:\(s\)|s)?/i,
  /\b(?:booking|confirmation|reservation)\s*(?:id|ref(?:erence)?|no\.?|number|code|#)/i,
  /\b(?:itinerary|trip)\s*(?:id|no\.?|number)/i,
  /\bticket\s*(?:no\.?|number)/i,
];
const REF_SHAPE = /(?=[A-Z0-9.-]*\d|[A-Z]{6}(?![A-Z]))[A-Z0-9](?:[A-Z0-9-]|\.(?=[A-Z0-9])){4,19}/;
const NOT_REFS = new Set(['STATUS', 'CONFIRMED', 'BOOKED', 'ADULT', 'NUMBER']);

function findReference(lines: Line[]): string | null {
  for (const label of REF_LABELS) {
    const v = valueAfter(lines, label, REF_SHAPE);
    if (v && !NOT_REFS.has(v)) return v;
  }
  return null;
}

// ---------------------------------------------------------------- dates and times

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTH_RE =
  '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?';
const TIME_RE =
  /\b([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?(?:\s*(?:hrs|hours|h)\b)?(?:\s*([ap])\.?\s?m\b\.?)?/i;

interface DateHit {
  date: string;
  start: number;
  end: number;
  yearKnown: boolean;
  time: string | null;
  role: 'start' | 'end' | 'ignore' | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

function makeDate(y: number, m: number, d: number): string | null {
  const s = `${y}-${pad(m)}-${pad(d)}`;
  return isLocalDate(s) ? s : null;
}

const fullYear = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));

function toTime(h: string, m: string, ampm?: string): string {
  let hour = Number(h);
  if (ampm) {
    const pm = ampm.toLowerCase() === 'p';
    if (hour === 12) hour = pm ? 12 : 0;
    else if (pm) hour += 12;
  }
  return `${pad(hour)}:${m}`;
}

const START_LABEL =
  /\b(departure|departs?|depart(?:ing)?|dep\b\.?|check[- ]?in(?:\s*date)?|pick[- ]?up|boarding(?:\s*date)?|date of journey|journey date|travel(?:ling)?\s*date|start(?:s|\s*date)?|onward|event date|show date|date of (?:travel|visit|event)|valid from|from)\W*$/i;
const END_LABEL =
  /\b(arrival|arrives?|arr\b\.?|check[- ]?out(?:\s*date)?|drop[- ]?off|ends?(?:\s*date)?|until|till|valid (?:to|until)|to)\W*$/i;
const IGNORE_LABEL =
  /\b(booking date|booked on|booking time|date of booking|issued?(?:\s*on|\s*date)?|date of issue|transaction|payment|paid on|printed|generated|cancel\w*|birth|dob|expir\w*|invoice date|booked)\W*$/i;

function roleFor(context: string): DateHit['role'] {
  // The label closest to the date wins; "from"/"to" only when right next to it.
  const near = context.slice(-60);
  const cands: [DateHit['role'], number][] = [];
  for (const [role, re] of [
    ['ignore', IGNORE_LABEL],
    ['start', START_LABEL],
    ['end', END_LABEL],
  ] as const) {
    // Try every suffix so the nearest label is found even with words in between.
    for (let cut = near.length; cut >= 0; cut--) {
      const m = re.exec(near.slice(0, cut));
      if (!m) continue;
      const distance = near.length - cut;
      const word = m[1]!.toLowerCase();
      if ((word === 'from' || word === 'to') && distance > 2) break;
      cands.push([role, distance]);
      break;
    }
  }
  if (!cands.length) return null;
  cands.sort((a, b) => a[1] - b[1]);
  return cands[0]![0];
}

function findDates(text: string, lines: Line[], today: string): DateHit[] {
  const hits: DateHit[] = [];
  const taken: [number, number][] = [];
  const free = (a: number, b: number) => taken.every(([x, y]) => b <= x || a >= y);
  const add = (start: number, end: number, y: number | null, m: number, d: number) => {
    if (!free(start, end)) return;
    const date = makeDate(y ?? 2000, m, d);
    if (!date) return;
    taken.push([start, end]);
    hits.push({ date, start, end, yearKnown: y !== null, time: null, role: null });
  };
  const scan = (re: RegExp, f: (m: RegExpExecArray) => void) => {
    for (let m = re.exec(text); m; m = re.exec(text)) f(m);
  };
  const month = (s: string) => MONTHS.indexOf(s.slice(0, 3).toLowerCase()) + 1;

  scan(/\b(\d{4})-(\d{2})-(\d{2})\b/g, (m) =>
    add(m.index, m.index + m[0].length, Number(m[1]), Number(m[2]), Number(m[3])),
  );
  scan(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})(?![\d:.])/g, (m) => {
    let d = Number(m[1]);
    let mo = Number(m[2]);
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]; // month first (US style)
    add(m.index, m.index + m[0].length, fullYear(m[3]!), mo, d);
  });
  scan(
    new RegExp(
      `\\b(\\d{1,2})(?:st|nd|rd|th)?[ \\t\\-./]*${MONTH_RE}[ \\t\\-./,']*(\\d{4}|\\d{2}(?![\\d:]))?`,
      'gi',
    ),
    (m) => {
      const end = m[3] ? m.index + m[0].length : m.index + m[0].replace(/[ \t\-./,']+$/, '').length;
      add(m.index, end, m[3] ? fullYear(m[3]) : null, month(m[2]!), Number(m[1]));
    },
  );
  scan(
    new RegExp(`\\b${MONTH_RE}[ \\t]+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:,?\\s*(\\d{4}))?`, 'gi'),
    (m) =>
      add(m.index, m.index + m[0].length, m[3] ? Number(m[3]) : null, month(m[1]!), Number(m[2])),
  );

  // Dates without a year take the year of the dates that have one, else the next one from today.
  const known = hits.find((h) => h.yearKnown);
  for (const h of hits) {
    if (h.yearKnown) continue;
    const md = h.date.slice(5);
    let year = known ? Number(known.date.slice(0, 4)) : Number(today.slice(0, 4));
    if (!known && `${year}-${md}` < addDaysIso(today, -60)) year++;
    h.date = makeDate(year, Number(md.slice(0, 2)), Number(md.slice(3))) ?? h.date;
  }

  for (const h of hits) {
    const line = lineAt(lines, h.start);
    const lineText = line.text;
    const posInLine = h.start - line.at;
    // A time right after the date ("12 Jul 2026 06:45", "12-07-2026, 6:45 PM")…
    const after = lineText.slice(h.end - line.at, h.end - line.at + 16);
    const ta = new RegExp(
      `^[\\s,|@-]*(?:(?:at|from|until|till|by)\\s*)?${TIME_RE.source}`,
      'i',
    ).exec(after);
    // …or right before it ("06:45 12-Jul-2026").
    const before = lineText.slice(Math.max(0, posInLine - 16), posInLine);
    const tb = new RegExp(`${TIME_RE.source}[\\s,|-]*(?:on\\s*)?$`, 'i').exec(before);
    if (ta) h.time = toTime(ta[1]!, ta[2]!, ta[3]);
    else if (tb) h.time = toTime(tb[1]!, tb[2]!, tb[3]);
    const idx = lines.indexOf(line);
    if (!h.time) {
      // A row of times under a row of dates ("Fri, 24 Jul   Sun, 26 Jul" / "3:00 PM   11:00 AM").
      const below = lines[idx + 1]?.text.trim();
      const cell = below?.split(COL)[columnAt(lineText, posInLine)];
      const tc = cell && new RegExp(`^${TIME_RE.source}`, 'i').exec(cell.trim());
      if (tc) h.time = toTime(tc[1]!, tc[2]!, tc[3]);
    }
    const ctxEnd = tb ? posInLine - tb[0].length : posInLine;
    h.role = roleFor(lineText.slice(0, ctxEnd));
    if (!h.role) {
      // A table: the column header in the line above.
      const above = lines[idx - 1]?.text;
      if (above && COL.test(above)) {
        const col = columnAt(lineText, posInLine);
        const header = above.trim().split(COL)[col];
        if (header) h.role = roleFor(header);
      }
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

function addDaysIso(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function lineAt(lines: Line[], pos: number): Line {
  let found = lines[0]!;
  for (const l of lines) {
    if (l.at > pos) break;
    found = l;
  }
  return found;
}

/** A time printed next to a start or end label ("Departure 06:45", "Check-out: 11:00 AM"). */
function labelledTime(text: string, which: 'start' | 'end'): string | null {
  const labels =
    which === 'start'
      ? '(?:departure|departs?|dep\\.?|check[- ]?in|pick[- ]?up|starts?|show|reporting|boarding)'
      : '(?:arrival|arrives?|arr\\.?|check[- ]?out|drop[- ]?off|ends?)';
  const re = new RegExp(
    `\\b${labels}(?:\\s*time)?[\\s*:\\-]*(?:from|until|by|before|after)?\\s*${TIME_RE.source}`,
    'i',
  );
  const m =
    re.exec(text) ??
    new RegExp(`\\b${labels}(?:\\s*point)?[^\\n\\d]{0,30}?${TIME_RE.source}`, 'i').exec(text);
  return m ? toTime(m[1]!, m[2]!, m[3]) : null;
}

// ---------------------------------------------------------------- price

const CURRENCY_SIGNS: [RegExp, string][] = [
  [/^(₹|rs\.?|inr)$/i, 'INR'],
  [/^(\$|us\$|usd)$/i, 'USD'],
  [/^(€|eur)$/i, 'EUR'],
  [/^(£|gbp)$/i, 'GBP'],
  [/^aed$/i, 'AED'],
  [/^sgd$/i, 'SGD'],
  [/^thb$/i, 'THB'],
  [/^(¥|jpy)$/i, 'JPY'],
  [/^nok$/i, 'NOK'],
  [/^sek$/i, 'SEK'],
  [/^dkk$/i, 'DKK'],
  [/^chf$/i, 'CHF'],
  [/^(kr|kr\.)$/i, 'NOK'],
  [/^(myr|rm)$/i, 'MYR'],
  [/^(lkr)$/i, 'LKR'],
];
const CUR = '₹|Rs\\.?|INR|US\\$|\\$|USD|€|EUR|£|GBP|AED|SGD|THB|¥|JPY|NOK|SEK|DKK|CHF|MYR|LKR';
const AMOUNT = new RegExp(
  `(?:(${CUR})\\s*)?(\\d{1,3}(?:,\\d{2,3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)(?![\\d:/%])(?:\\s*(${CUR})(?![A-Za-z]))?`,
  'i',
);
const PRICE_LABELS = [
  /\bgrand\s*total\b/i,
  /\btotal\s*(?:amount\s*)?paid\b/i,
  /\bamount\s*paid\b/i,
  /\byou\s*paid\b/i,
  /\btotal\s*(?:amount|fare|price|cost|charges?|payable)\b/i,
  /\bnet\s*(?:amount|payable)\b/i,
  /\bamount\s*payable\b/i,
  /\btotal\b/i,
];

function currencyOf(sign: string | undefined): string | null {
  if (!sign) return null;
  return CURRENCY_SIGNS.find(([re]) => re.test(sign.trim()))?.[1] ?? null;
}

function findPrice(
  lines: Line[],
  fallbackCurrency: string,
): { minor: number; currency: string } | null {
  const toMinorUnits = (m: RegExpExecArray) => {
    const currency = currencyOf(m[1]) ?? currencyOf(m[3]) ?? fallbackCurrency;
    const major = Number(m[2]!.replace(/,/g, ''));
    if (!Number.isFinite(major) || major <= 0) return null;
    return { minor: Math.round(major * 10 ** minorDigits(currency)), currency };
  };
  for (const label of PRICE_LABELS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!.text;
      const m = label.exec(line);
      if (!m) continue;
      const rest = line
        .slice(m.index + m[0].length)
        .replace(/^[\s:\-–|]*(?:\([^)]*\))?[\s:\-–|]*/, '');
      const a = AMOUNT.exec(rest);
      if (a && a.index < 25) {
        const v = toMinorUnits(a);
        if (v) return v;
      }
      const below = lines[i + 1]?.text.trim();
      if (!rest && below) {
        const cells = below.split(COL);
        const cell = cells[columnAt(line, m.index)] ?? cells[0]!;
        const b = AMOUNT.exec(cell);
        if (b && b.index === 0) {
          const v = toMinorUnits(b);
          if (v) return v;
        }
      }
    }
  }
  // No total label: the largest amount that is marked as money.
  let best: { minor: number; currency: string } | null = null;
  const marked = new RegExp(AMOUNT.source, 'gi');
  for (const l of lines)
    for (let m = marked.exec(l.text); m; m = marked.exec(l.text)) {
      if (!m[1] && !m[3]) continue;
      const v = toMinorUnits(m);
      if (v && (!best || v.minor > best.minor)) best = v;
    }
  return best;
}

// ---------------------------------------------------------------- places

const NOT_AIRPORTS = new Set([
  'THE',
  'AND',
  'FOR',
  'PNR',
  'INR',
  'USD',
  'EUR',
  'GBP',
  'GST',
  'AED',
  'SGD',
  'THB',
  'JPY',
  'MRS',
  'NON',
  'VIA',
  'PAX',
  'ADT',
  'CHD',
  'INF',
  'ETA',
  'ETD',
  'TBA',
  'NOT',
  'YES',
  'ALL',
]);

interface Route {
  from: string;
  to: string;
  /** Airport codes, when the ticket prints them. */
  fromCode?: string;
  toCode?: string;
}

function findRoute(text: string): Route | null {
  // "Bengaluru (BLR) → Goa (GOI)" — names with codes.
  const named =
    /([A-Z][A-Za-z.' ]{1,30}?)\s*\(([A-Z]{3})\)[^\n]{0,40}?(?:→|->|–|—|-|to|✈)\s*([A-Z][A-Za-z.' ]{1,30}?)\s*\(([A-Z]{3})\)/.exec(
      text,
    );
  if (named)
    return { from: named[1]!.trim(), to: named[3]!.trim(), fromCode: named[2]!, toCode: named[4]! };
  // "BLR → GOI", "BLR - GOI", "BLR to GOI"
  const re = /\b([A-Z]{3})\s*(?:→|->|–|—|-|to|✈)\s*([A-Z]{3})\b/g;
  for (let m = re.exec(text); m; m = re.exec(text))
    if (!NOT_AIRPORTS.has(m[1]!) && !NOT_AIRPORTS.has(m[2]!) && m[1] !== m[2])
      return { from: m[1]!, to: m[2]!, fromCode: m[1]!, toCode: m[2]! };
  // Two codes in brackets, in order: "(BLR) … (GOI)"
  const codes = [...text.matchAll(/\(([A-Z]{3})\)/g)]
    .map((m) => m[1]!)
    .filter((c) => !NOT_AIRPORTS.has(c));
  if (codes.length >= 2 && codes[0] !== codes[1])
    return { from: codes[0]!, to: codes[1]!, fromCode: codes[0]!, toCode: codes[1]! };
  return null;
}

const PLACE = /[A-Z][A-Za-z.'()&]*(?: [A-Z(][A-Za-z.'()&]*){0,4}/;

const ARROW_ROUTE = /^([A-Z][A-Za-z.' ]{1,30}?)\s*(?:→|->|⇄|⟶)\s*([A-Z][A-Za-z.' ]{1,30})$/;

function labelledRoute(lines: Line[]): Route | null {
  const cell = (words: string) =>
    new RegExp(`(?:^|\\s{2,}|\\|)\\s*(?:${words})\\s*(?=:|-|\\s{2,}|$)`, 'i');
  const arrow = lines.map((l) => ARROW_ROUTE.exec(l.text.split(COL)[0]!.trim())).find(Boolean);
  if (arrow) return { from: tidyPlace(arrow[1]!), to: tidyPlace(arrow[2]!) };
  const from = valueAfter(lines, cell('from|origin|source|boarding (?:point|at|station)'), PLACE);
  const to = valueAfter(
    lines,
    cell('to|destination|dropping (?:point|at)|reservation upto'),
    PLACE,
  );
  if (from && to && from !== to) return { from: tidyPlace(from), to: tidyPlace(to) };
  return null;
}

/** "KSR BENGALURU (SBC)" → "KSR Bengaluru (SBC)". */
function tidyPlace(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (/^[A-Z]{4,}$/.test(w) ? w[0] + w.slice(1).toLowerCase() : w))
    .join(' ');
}

// ---------------------------------------------------------------- stays and notes

const STAY_NAME =
  /\b(hotel|resort|inn|villa|homestay|home stay|hostel|suites?|residency|palace|lodge|retreat|cottages?|bnb|apartments?|stays?)\b/i;
const NOT_NAME =
  /\b(thank|confirm|voucher|booking|policy|cancel|dear|your|please|check|reservation|guest|address|invoice|total|phone|email)\b/i;

function findStayName(lines: Line[]): string | null {
  const labelled = valueAfter(
    lines,
    /\b(?:hotel|property|accommodation|stay)(?:\s*name)?\s*:/i,
    /[^\s].{1,60}/,
  );
  if (labelled) return labelled.split(COL)[0]!.trim();
  for (const l of lines) {
    const t = l.text.trim().split(COL)[0]!.trim();
    if (t.length >= 4 && t.length <= 60 && STAY_NAME.test(t) && !NOT_NAME.test(t)) return t;
  }
  return null;
}

function findNotes(
  text: string,
  lines: Line[],
  type: DraftType,
  site: string | null,
  provider: string | null,
): string[] {
  const notes: string[] = [];
  const names = [
    ...new Set(
      [
        ...text.matchAll(
          /\b(?:Mr|Mrs|Ms|Miss|Mstr|Master|Dr)\.?\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})/g,
        ),
      ].map((m) => m[0].replace(/\s+/g, ' ').trim()),
    ),
  ].slice(0, 6);
  if (names.length) notes.push(`${type === 'stay' ? 'Guests' : 'Passengers'}: ${names.join(', ')}`);
  else {
    const guest = valueAfter(
      lines,
      /\b(?:passenger|traveller|guest|lead guest)\s*(?:name)?s?\b/i,
      /(?!Details|Information|Info|Name)[A-Z][A-Za-z]+(?: [A-Z][A-Za-z]+){0,3}/,
    );
    if (guest) notes.push(`${type === 'stay' ? 'Guest' : 'Passenger'}: ${guest}`);
  }
  const seat =
    /\bseat(?:\s*(?:no\.?|number|s))?\s*[:\-]?\s*(\d{1,2}[A-K]|[A-Z]?\d{1,2}[A-Z]?)\b/i.exec(text);
  if (seat) notes.push(`Seat ${seat[1]}`);
  const coach = /\bcoach\s*(?:no\.?)?\s*[:\-]?\s*([A-Z]{1,2}\d{1,2})\b/i.exec(text);
  const berth = /\bberth\s*(?:no\.?)?\s*[:\-]?\s*(\d{1,2})\b/i.exec(text);
  const irctc = /\b(CNF|RAC|WL)\s*\/\s*([A-Z]{1,2}\d{1,2})\s*\/\s*(\d{1,2})\b/.exec(text);
  if (irctc && !coach && !berth) notes.push(`Coach ${irctc[2]}, Berth ${irctc[3]}`);
  if (coach || berth)
    notes.push(
      [coach && `Coach ${coach[1]}`, berth && `Berth ${berth[1]}`].filter(Boolean).join(', '),
    );
  const cls =
    /\bclass\s*[:\-(]?\s*(1A|2A|3A|3E|SL|CC|EC|2S|FC|Economy|Premium Economy|Business|First)\b/i.exec(
      text,
    );
  if (cls) notes.push(`Class ${cls[1]}`);
  if (type === 'stay') {
    // The PIN some booking sites give with the confirmation number (Plan 38).
    const pin = /\bPIN\s*(?:CODE)?\s*:?\s*(\d{4,6})\b/i.exec(text);
    if (pin) notes.push(`PIN ${pin[1]}`);
    const room = valueAfter(lines, /\broom\s*(?:type|category)?\s*:/i, /[^\s].{1,50}/);
    if (room) notes.push(`Room: ${room.split(COL)[0]!.trim()}`);
    const people = /\b(\d{1,2})\s*(adults?|guests?)\b/i.exec(text);
    if (people) notes.push(`${people[1]} ${people[2]!.toLowerCase()}`);
    const nights = /\b(\d{1,2})\s*nights?\b/i.exec(text);
    if (nights) notes.push(`${nights[1]} night${nights[1] === '1' ? '' : 's'}`);
  }
  if (site && site !== provider) notes.push(`Booked on ${site}`);
  return notes;
}

// ---------------------------------------------------------------- segments

const FLIGHT_NO = /\b([A-Z][A-Z0-9]|[0-9][A-Z])\s?-?\s?(\d{2,4})\b/g;

function flightNumbers(text: string): { code: string; no: string; at: number }[] {
  const out: { code: string; no: string; at: number }[] = [];
  for (let m = FLIGHT_NO.exec(text); m; m = FLIGHT_NO.exec(text)) {
    if (!AIRLINE_BY_CODE.has(m[1]!)) continue;
    // Skip things like "AI 2026" that are years in a sentence, and seat or gate numbers.
    if (/^(19|20)\d\d$/.test(m[2]!) && m[2]!.length === 4) continue;
    out.push({ code: m[1]!, no: m[2]!, at: m.index });
  }
  return out;
}

// ---------------------------------------------------------------- main

/** Booking drafts from a document's text; one draft per flight leg, else one. */
export function parseBookingText(text: string, opts: ParseOptions): BookingDraft[] {
  const clean = text.replace(/\r/g, '').replace(/[\u00a0\u2007\u202f]/g, ' ');
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const lines = linesOf(clean);
  const flights = flightNumbers(clean);
  const trainNo =
    /\btrain\s*(?:no\.?|number|#)?\s*[:/]?\s*(\d{5})\b/i.exec(clean) ??
    /(?:^|\s)(\d{5})\s*\/\s*[A-Z][A-Z .]{2,30}?(?=\s{2,}|$)/m.exec(clean);
  const site = findName(clean, SITES);
  const type = detectType(clean, new Set(flights.map((f) => f.code + f.no)).size, !!trainNo, site);

  const airline =
    type === 'flight'
      ? ((flights[0] && AIRLINE_BY_CODE.get(flights[0].code)) ??
        findName(
          clean,
          AIRLINES.map((a) => a[1]),
        ))
      : null;
  const operator =
    type === 'bus'
      ? valueAfter(
          lines,
          /\b(?:bus\s*)?operator\b/i,
          /[A-Z][A-Za-z.&]*(?:\s+[A-Z][A-Za-z.&]*){0,4}/,
        )
      : null;
  const provider =
    airline ??
    operator ??
    (type === 'train' && /irctc|indian railways/i.test(clean) ? 'IRCTC' : site);
  const reference = findReference(lines);
  const price = findPrice(lines, opts.currency);
  const notes = findNotes(clean, lines, type, site, provider);

  // Flight legs: split the text at each distinct flight number.
  const legs: { text: string; flight: string | null }[] = [];
  const distinct = flights.filter(
    (f, i) => flights.findIndex((g) => g.code === f.code && g.no === f.no) === i,
  );
  if (type === 'flight' && distinct.length > 1) {
    const starts = distinct.map((f) => {
      const li = lines.indexOf(lineAt(lines, f.at));
      return Math.max(0, li - 2);
    });
    distinct.forEach((f, i) => {
      const from =
        i === 0 ? 0 : Math.max(starts[i]!, lines.indexOf(lineAt(lines, distinct[i - 1]!.at)) + 1);
      const to =
        i + 1 < distinct.length
          ? Math.max(from + 1, starts[i + 1]!, lines.indexOf(lineAt(lines, f.at)) + 1)
          : lines.length;
      legs.push({
        text: lines
          .slice(from, to)
          .map((l) => l.text)
          .join('\n'),
        flight: `${f.code} ${f.no}`,
      });
    });
  } else {
    legs.push({
      text: clean,
      flight: distinct[0] ? `${distinct[0].code} ${distinct[0].no}` : null,
    });
  }

  const drafts = legs.map((leg, i) => {
    const legLines = linesOf(leg.text);
    const dates = findDates(leg.text, legLines, today).filter((d) => d.role !== 'ignore');
    const start =
      dates.find((d) => d.role === 'start') ??
      dates.find((d) => !d.role && d.time) ??
      dates.find((d) => !d.role);
    let end = dates.find(
      (d) => d.role === 'end' && (!start || d.date >= start.date) && d !== start,
    );
    if (!end && type === 'stay' && start)
      end = dates.find((d) => d !== start && !d.role && d.date > start.date);
    const range = new RegExp(`${TIME_RE.source}\\s*(?:-|–|→|to)\\s*${TIME_RE.source}`, 'i').exec(
      leg.text,
    );
    const startTime =
      start?.time ??
      labelledTime(leg.text, 'start') ??
      (range ? toTime(range[1]!, range[2]!, range[3]) : null);
    let endTime =
      end?.time ??
      labelledTime(leg.text, 'end') ??
      (range ? toTime(range[4]!, range[5]!, range[6]) : null);
    let endDate = end?.date ?? null;
    if (!endDate && endTime && start) {
      endDate = startTime && endTime < startTime ? addDaysIso(start.date, 1) : start.date;
    }
    if (endDate && start && endDate < start.date) {
      endDate = null;
      endTime = null;
    }

    let route = type === 'flight' ? findRoute(leg.text) : null;
    route ??=
      labelledRoute(legLines) ?? (type !== 'stay' && type !== 'event' ? findRoute(leg.text) : null);
    const stayName = type === 'stay' ? findStayName(legLines) : null;
    const eventName =
      type === 'event'
        ? valueAfter(legLines, /\b(?:event|show|activity|tour)\s*(?:name)?\s*:/i, /[^\s].{1,60}/)
        : null;

    let title = '';
    const routeText = route ? `${route.from} → ${route.to}` : '';
    if (type === 'flight') title = [routeText, leg.flight].filter(Boolean).join(' · ');
    else if (type === 'train')
      title = [routeText, trainNo ? `Train ${trainNo[1]}` : ''].filter(Boolean).join(' · ');
    else if (type === 'stay') title = stayName ?? '';
    else if (type === 'event')
      title = eventName?.split(COL)[0]?.trim() ?? eventTitle(legLines, site) ?? '';
    else title = routeText;

    // Where it happens (Plan 35): a journey's two ends, or the address of a stay or venue.
    const journey = type === 'flight' || type === 'train' || type === 'bus';
    const address = journey
      ? null
      : (valueAfter(
          legLines,
          /\b(?:hotel\s+|property\s+)?(?:address|venue|location)\s*:/i,
          /[^\s].{4,120}/,
        )
          ?.split(COL)[0]!
          .trim() ?? null);

    const found: DraftField[] = [];
    if (type !== 'other') found.push('type');
    if (journey && route) found.push('where');
    if (address) found.push('address');
    if (title) found.push('title');
    if (provider) found.push('provider');
    if (reference) found.push('reference');
    if (start) found.push('start');
    if (endDate) found.push('end');
    const cost = i === 0 ? price : null;
    if (cost) found.push('cost');
    if (notes.length) found.push('notes');

    return {
      type,
      title: title.slice(0, 100),
      provider,
      reference,
      startDate: start?.date ?? null,
      startTime: start ? startTime : null,
      endDate,
      endTime: endDate ? endTime : null,
      costMinor: cost?.minor ?? null,
      currency: cost?.currency ?? null,
      notes: notes.length ? notes.join('\n') : null,
      fromText: journey ? (route?.from ?? null) : null,
      toText: journey ? (route?.to ?? null) : null,
      placeText: null,
      fromCode: journey ? (route?.fromCode ?? null) : null,
      toCode: journey ? (route?.toCode ?? null) : null,
      address,
      found,
    } satisfies BookingDraft;
  });
  return drafts;
}

/** An event's name: the first short line that isn't the site, a date or boilerplate. */
function eventTitle(lines: Line[], site: string | null): string | null {
  for (const l of lines) {
    const t = l.text.trim().split(COL)[0]!.trim();
    if (t.length < 4 || t.length > 80 || (site && t.toLowerCase() === site.toLowerCase())) continue;
    if (NOT_NAME.test(t) || /\d{1,2}[:/]\d|\b(ticket|e-?ticket|venue|booking)\b/i.test(t)) continue;
    if (!/[A-Za-z]{3}/.test(t)) continue;
    return t;
  }
  return null;
}

/** An empty draft for when nothing could be read. */
export function emptyDraft(): BookingDraft {
  return {
    type: 'other',
    title: '',
    provider: null,
    reference: null,
    startDate: null,
    startTime: null,
    endDate: null,
    endTime: null,
    costMinor: null,
    currency: null,
    notes: null,
    found: [],
  };
}

// ---------------------------------------------------------------- helpers for table reading (Plan 38)

/**
 * The first date in a piece of text, and the time printed next to it. A date
 * without a year is placed on or after `ref` (about two months of slack).
 */
export function readDate(text: string, ref: string): { date: string; time: string | null } | null {
  const hit = findDates(text, linesOf(text), ref).find((h) => h.role !== 'ignore');
  return hit ? { date: hit.date, time: hit.time } : null;
}

/** Every time in a piece of text, as 'HH:MM' ("from 15:00", "15:00-23:30", "6:45 PM"). */
export function readTimes(text: string): string[] {
  const re = new RegExp(TIME_RE.source, 'gi');
  const out: string[] = [];
  for (let m = re.exec(text); m; m = re.exec(text)) out.push(toTime(m[1]!, m[2]!, m[3]));
  return out;
}

/** "SK" → "Scandinavian Airlines", or undefined for codes we don't know. */
export function airlineName(code: string): string | undefined {
  return AIRLINE_BY_CODE.get(code);
}

/** "₹", "Rs.", "EUR", "€"… → ISO code, or null. */
export function currencyCode(sign: string | undefined): string | null {
  return currencyOf(sign);
}
