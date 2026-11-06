import {
  airlineName,
  currencyCode,
  parseBookingText,
  readDate,
  readTimes,
  type BookingDraft,
  type DraftField,
  type ParseOptions,
} from './booking-parse';
import { minorDigits } from './money';
import type { PdfLine } from './pdf';

/**
 * Reads tickets laid out as tables (Plan 38): a header with its values stacked
 * underneath, matched by position across the page, not by counting spaces.
 * Hotel confirmations (CHECK-IN / CHECK-OUT), agency e-tickets (times over dates
 * per leg), travel documents (DEPARTURE / ARRIVAL) and rail tickets (TRAVEL DATE,
 * DEPARTURE AT / ARRIVAL AT). Whatever the tables don't give comes from the
 * line-by-line reader (parseBookingText).
 */

interface Cell {
  x: number;
  end: number;
  text: string;
}
interface Row {
  cells: Cell[];
  text: string;
  size: number;
}

const rowsOf = (pages: PdfLine[][]): Row[] =>
  pages.flat().map((l) => ({ cells: l.cells, text: l.text, size: l.size || 10 }));

const overlaps = (a: Cell, b: Cell, tol: number) => a.x < b.end + tol && a.end > b.x - tol;

/** The first cell matching `re`, from row `from` on. */
function findCell(rows: Row[], re: RegExp, from = 0, to = rows.length) {
  for (let i = from; i < Math.min(to, rows.length); i++)
    for (const cell of rows[i]!.cells) if (re.test(cell.text)) return { i, cell };
  return null;
}

/** Cells stacked under a header cell (same column), for the next `max` rows. */
function under(rows: Row[], i: number, header: Cell, max = 6): Cell[] {
  const out: Cell[] = [];
  for (let j = i + 1; j <= i + max && j < rows.length; j++) {
    const tol = rows[j]!.size * 0.6;
    const hit = rows[j]!.cells.find((c) => overlaps(c, header, tol));
    if (hit) out.push(hit);
  }
  return out;
}

/** The nearest cell above, in the same column. */
function above(rows: Row[], i: number, cell: Cell, max = 3): Cell | null {
  for (let j = i - 1; j >= Math.max(0, i - max); j--) {
    const hit = rows[j]!.cells.find((c) => overlaps(c, cell, rows[j]!.size * 0.6));
    if (hit) return hit;
  }
  return null;
}

// ---------------------------------------------------------------- the date to place years by

const BOOKED = /\b(?:booked on|issued|issue date|date of issue|booking date|date of booking)\b/i;

/** The ticket's booking or issue date (dates without a year fall on or after it). */
function bookingDate(rows: Row[], fallback: string): string {
  for (let i = 0; i < rows.length; i++) {
    for (const cell of rows[i]!.cells) {
      if (!BOOKED.test(cell.text)) continue;
      const same = readDate(cell.text.slice(cell.text.search(BOOKED)), fallback);
      if (same && /\d{4}/.test(cell.text)) return same.date;
      const below = under(rows, i, cell, 1)[0];
      const d = below && /\d{4}/.test(below.text) ? readDate(below.text, fallback) : null;
      if (d) return d.date;
    }
  }
  return fallback;
}

// ---------------------------------------------------------------- stays

interface Found {
  draft: Partial<BookingDraft>;
  found: DraftField[];
}

function stayTable(rows: Row[], ref: string): Found | null {
  const ci = findCell(rows, /^check-?\s?in$/i);
  if (!ci) return null;
  const co = rows[ci.i]!.cells.find((c) => /^check-?\s?out$/i.test(c.text));
  const draft: Partial<BookingDraft> = {};
  const found: DraftField[] = [];
  const read = (header: Cell, which: 'start' | 'end') => {
    const text = under(rows, ci.i, header, 10)
      .map((c) => c.text)
      .join(' ');
    const d = readDate(text, ref);
    const times = readTimes(text);
    // "15:00-23:30" is the check-in window (from its start); "00:00-11:00" check-out (by its end).
    const time = (which === 'start' ? times[0] : times[times.length - 1]) ?? null;
    return d ? { date: d.date, time } : null;
  };
  const start = read(ci.cell, 'start');
  if (start) {
    draft.startDate = start.date;
    draft.startTime = start.time;
    found.push('start');
  }
  const end = co ? read(co, 'end') : null;
  if (end && start && end.date >= start.date) {
    draft.endDate = end.date;
    draft.endTime = end.time;
    found.push('end');
  }
  // The property's name sits right above its address; the address may run onto the next line.
  const addr = findCell(rows, /^address\s*:/i);
  if (addr) {
    let address = addr.cell.text.replace(/^address\s*:\s*/i, '');
    const next = rows[addr.i + 1]?.cells[0];
    if (
      next &&
      Math.abs(next.x - addr.cell.x) < 4 &&
      !next.text.includes(':') &&
      /^[\p{L} .'-]{3,40}$/u.test(next.text)
    )
      address = `${address.replace(/,\s*$/, '')}, ${next.text}`;
    draft.address = address.replace(/,\s*$/, '').trim();
    found.push('address');
    const name = rows[addr.i - 1]?.cells[0];
    if (name && Math.abs(name.x - addr.cell.x) < 4 && !name.text.includes(':')) {
      draft.title = name.text;
      found.push('title');
    }
  }
  return { draft, found };
}

// ---------------------------------------------------------------- flights

const FLIGHT_CELL = /^([A-Z][A-Z0-9]|[0-9][A-Z])[\s-]?(\d{1,4})$/;
const DURATION = /^\d+\s*h(\s*\d+\s*m)?$/i;
const NOT_CODES = new Set([
  'HRS',
  'PNR',
  'THU',
  'FRI',
  'SAT',
  'SUN',
  'MON',
  'TUE',
  'WED',
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]);

interface Leg {
  flight: string;
  airline: string | undefined;
  fromText: string | null;
  toText: string | null;
  fromCode: string | null;
  toCode: string | null;
  startDate: string | null;
  startTime: string | null;
  endDate: string | null;
  endTime: string | null;
  reference: string | null;
}

const hasTime = (t: string) => readTimes(t).length > 0;
const codeIn = (t: string) => t.match(/\b[A-Z]{3}\b/g)?.find((c) => !NOT_CODES.has(c)) ?? null;
/** "Paris (Charles De" → "Paris". */
const cityName = (t: string | undefined) => t?.replace(/\s*\(.*$/, '').trim() || null;

function flightLegs(rows: Row[], ref: string): Leg[] {
  const anchors: { i: number; cell: Cell; code: string; no: string }[] = [];
  rows.forEach((r, i) =>
    r.cells.forEach((cell) => {
      const m = FLIGHT_CELL.exec(cell.text.split(/\s{2,}/)[0]!.trim());
      if (m && airlineName(m[1]!) && !anchors.some((a) => a.code === m[1] && a.no === m[2]))
        anchors.push({ i, cell, code: m[1]!, no: m[2]! });
    }),
  );
  return anchors.map((a, n) => {
    const from = n === 0 ? Math.max(0, a.i - 2) : Math.max(anchors[n - 1]!.i + 1, a.i - 2);
    const to = Math.min(rows.length, anchors[n + 1]?.i ?? a.i + 14, a.i + 14);
    // The two ends: the first two cells with a time, in reading order.
    const timeCells: { i: number; cell: Cell }[] = [];
    for (let i = a.i; i < to && timeCells.length < 2; i++)
      for (const cell of rows[i]!.cells)
        if (cell !== a.cell && hasTime(cell.text) && timeCells.length < 2)
          timeCells.push({ i, cell });
    const end = (t: { i: number; cell: Cell } | undefined) => {
      if (!t) return { date: null, time: null, code: null };
      const time = readTimes(t.cell.text)[0] ?? null;
      let date = readDate(t.cell.text, ref)?.date ?? null;
      let code = codeIn(t.cell.text);
      // The date is in the same column, just below or above.
      for (const j of [t.i + 1, t.i + 2, t.i - 1, t.i - 2, t.i + 3]) {
        const row = rows[j];
        if (!row || j < from || j >= to || date) continue;
        for (const c of row.cells)
          if (!date && overlaps(c, t.cell, row.size * 0.6))
            date = readDate(c.text, ref)?.date ?? null;
      }
      // A lone airport code in the same column, anywhere in this flight's block.
      for (let j = from; j < to && !code; j++)
        for (const c of rows[j]!.cells)
          if (
            !code &&
            /^[A-Z]{3}$/.test(c.text) &&
            !NOT_CODES.has(c.text) &&
            overlaps(c, t.cell, rows[j]!.size * 0.6)
          )
            code = c.text;
      return { date, time, code };
    };
    const dep = end(timeCells[0]);
    const arr = end(timeCells[1]);
    // Names on the flight's own line: "6E-4283 | Oslo | 4h 10m | Istanbul".
    const names = rows[a.i]!.cells.filter(
      (c) => c !== a.cell && !DURATION.test(c.text) && /\p{L}{3}/u.test(c.text) && !hasTime(c.text),
    );
    const pnr = findCell(rows, /^PNR$/i, from, to);
    const pnrValue = pnr
      ? (rows[pnr.i]!.cells[rows[pnr.i]!.cells.indexOf(pnr.cell) + 1]?.text ?? null)
      : null;
    return {
      flight: `${a.code} ${a.no}`,
      airline: airlineName(a.code),
      fromText: cityName(names[0]?.text) ?? dep.code,
      toText: cityName(names.length > 1 ? names[names.length - 1]!.text : undefined) ?? arr.code,
      fromCode: dep.code,
      toCode: arr.code,
      startDate: dep.date,
      startTime: dep.time,
      endDate: arr.date ?? (arr.time ? dep.date : null),
      endTime: arr.time,
      reference: pnrValue && /^[A-Z0-9]{5,8}$/.test(pnrValue) ? pnrValue : null,
    };
  });
}

// ---------------------------------------------------------------- trains and buses

function railTable(rows: Row[], ref: string): Found | null {
  const dep = findCell(rows, /^departure( at| time)?$/i);
  const arr = dep ? rows[dep.i]!.cells.find((c) => /^arrival( at| time)?$/i.test(c.text)) : null;
  const travel = findCell(rows, /^(travel date|date of journey|journey date|date)$/i);
  if (!dep && !travel) return null;
  const draft: Partial<BookingDraft> = {};
  const found: DraftField[] = [];
  const day = travel ? readDate(under(rows, travel.i, travel.cell, 2)[0]?.text ?? '', ref) : null;
  const depTime = dep ? readTimes(under(rows, dep.i, dep.cell, 2)[0]?.text ?? '')[0] : undefined;
  const arrTime = dep && arr ? readTimes(under(rows, dep.i, arr, 2)[0]?.text ?? '')[0] : undefined;
  if (day) {
    draft.startDate = day.date;
    draft.startTime = depTime ?? day.time;
    found.push('start');
    if (arrTime) {
      draft.endDate = depTime && arrTime < depTime ? nextDay(day.date) : day.date;
      draft.endTime = arrTime;
      found.push('end');
    }
  }
  // The stations are printed just above their columns ("PARIS NORD | AMSTERDAM CENTRAAL").
  if (dep && arr) {
    const a = above(rows, dep.i, dep.cell);
    const b = above(rows, dep.i, arr);
    const place = (c: Cell | null) =>
      c && /\p{L}{3}/u.test(c.text) && !/\d/.test(c.text) ? titleCase(c.text) : null;
    draft.fromText = place(a);
    draft.toText = place(b);
    if (draft.fromText && draft.toText) found.push('where');
  }
  const ref2 = findCell(rows, /^(reference\/pnr|pnr|booking reference|reference)$/i);
  const refValue = ref2 ? under(rows, ref2.i, ref2.cell, 2)[0]?.text : undefined;
  if (refValue && /^[A-Z0-9]{5,10}$/.test(refValue)) {
    draft.reference = refValue;
    found.push('reference');
  }
  const no = findCell(rows, /^train\s*(n[°o]\.?|no\.?|number)$/i);
  const number = no ? under(rows, no.i, no.cell, 2)[0]?.text : undefined;
  if (number && /^\d{3,6}$/.test(number)) draft.title = `Train ${number}`;
  return { draft, found };
}

const nextDay = (d: string) => {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
};

/** "PARIS NORD" → "Paris Nord". */
const titleCase = (s: string) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase()) : s;

// ---------------------------------------------------------------- price

const SIGN = '₹|Rs\\.?|INR|US\\$|\\$|USD|€|EUR|£|GBP|AED|SGD|THB|¥|JPY|NOK|SEK|DKK|CHF';
const MONEY = new RegExp(
  `(?:(${SIGN})\\s*)?(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)(?:\\s*(${SIGN})(?![A-Za-z]))?`,
  'i',
);

interface Price {
  minor: number;
  currency: string;
}

function money(text: string, fallback: string | null): Price | null {
  if (/approx|−|^-/i.test(text)) return null;
  const m = MONEY.exec(text);
  if (!m) return null;
  const currency = currencyCode(m[1]) ?? currencyCode(m[3]) ?? fallback;
  if (!currency || (!m[1] && !m[3] && !fallback)) return null;
  const major = Number(m[2]!.replace(/,/g, ''));
  if (!(major > 0)) return null;
  return { minor: Math.round(major * 10 ** minorDigits(currency)), currency };
}

const TOTAL_LABELS =
  /^(final price|grand total|total amount paid|total paid|amount paid|total price|total fare|total amount|total|price incl\.? vat|price)$/i;

/** The amount actually paid, preferring the trip's currency, then the one the place charges. */
function pickPrice(rows: Row[], tripCurrency: string): Price | null {
  const found: Price[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]!;
    // "You'll pay 701.40 in EUR."
    const pay = /you'?ll pay\s+([\d.,]+)\s+in\s+([A-Z]{3})/i.exec(r.text);
    if (pay) {
      const p = money(`${pay[2]} ${pay[1]}`, null);
      if (p) found.unshift(p);
    }
    // "You have paid INR 67136"
    const paid = new RegExp(`you have paid\\s+((?:${SIGN})\\s*[\\d,.]+)`, 'i').exec(r.text);
    if (paid) {
      const p = money(paid[1]!, tripCurrency);
      if (p) found.push(p);
    }
    for (const [k, cell] of r.cells.entries()) {
      if (!TOTAL_LABELS.test(cell.text.trim())) continue;
      const next = r.cells[k + 1];
      const values = [next, ...(next ? under(rows, i, next, 2) : []), ...under(rows, i, cell, 2)];
      for (const v of values) {
        // Only a cell that is just an amount ("€ 720", "93 EUR"), not a sentence with prices in it.
        const p = v && v.text.length <= 24 ? money(v.text, null) : null;
        if (p) found.push(p);
      }
    }
  }
  return found.find((p) => p.currency === tripCurrency) ?? found[0] ?? null;
}

// ---------------------------------------------------------------- putting it together

/**
 * Booking drafts from a PDF's positioned lines (extractPdfLayout). Tables give
 * the dates, times, places and references; the rest comes from the text.
 */
export function parseBookingPages(pages: PdfLine[][], opts: ParseOptions): BookingDraft[] {
  const rows = rowsOf(pages);
  const text = rows.map((r) => r.text).join('\n');
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const ref = bookingDate(rows, opts.tripStart ?? today);
  const base = parseBookingText(text, { ...opts, today: ref });
  const head = base[0]!;
  const price = pickPrice(rows, opts.currency);
  const withPrice = (d: BookingDraft, first: boolean): BookingDraft =>
    first && price
      ? { ...d, costMinor: price.minor, currency: price.currency, found: add(d.found, ['cost']) }
      : d;

  if (head.type === 'flight') {
    const legs = flightLegs(rows, ref).filter((l) => l.startDate || l.startTime);
    if (legs.length) {
      return legs.map((l, i) =>
        withPrice(
          {
            ...head,
            title: [l.fromText && l.toText ? `${l.fromText} → ${l.toText}` : '', l.flight]
              .filter(Boolean)
              .join(' · '),
            provider: l.airline ?? head.provider,
            reference: l.reference ?? head.reference,
            startDate: l.startDate,
            startTime: l.startTime,
            endDate: l.endDate,
            endTime: l.endTime,
            fromText: l.fromText,
            toText: l.toText,
            fromCode: l.fromCode,
            toCode: l.toCode,
            costMinor: i === 0 ? head.costMinor : null,
            currency: i === 0 ? head.currency : null,
            found: add(head.found, [
              'title',
              'start',
              ...(l.endDate ? (['end'] as const) : []),
              'where',
            ]),
          },
          i === 0,
        ),
      );
    }
  }

  let out = head;
  const table =
    head.type === 'stay'
      ? stayTable(rows, ref)
      : head.type === 'train' || head.type === 'bus'
        ? railTable(rows, ref)
        : null;
  if (table) {
    const d = table.draft;
    const title =
      head.type === 'stay'
        ? (d.title ?? head.title)
        : [d.fromText && d.toText ? `${d.fromText} → ${d.toText}` : head.title, d.title]
            .filter(Boolean)
            .join(' · ');
    out = { ...head, ...stripNulls(d), title, found: add(head.found, table.found) };
    // A date from the table brings its own time, even when none is printed (no stray times).
    if (table.found.includes('start')) out = { ...out, startTime: d.startTime ?? null };
    if (table.found.includes('end')) out = { ...out, endTime: d.endTime ?? null };
  }
  return [withPrice(out, true), ...base.slice(1)];
}

function add(list: DraftField[], more: readonly DraftField[]): DraftField[] {
  return [...new Set([...list, ...more])];
}

function stripNulls<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v != null)) as Partial<T>;
}
