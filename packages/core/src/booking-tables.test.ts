import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parseBookingPages } from './booking-tables';
import type { PdfLine } from './pdf';

// Layouts of the owner's real tickets (Plan 38), with every personal detail replaced.
const layout = (name: string): PdfLine[][] =>
  (
    JSON.parse(
      readFileSync(new URL(`./__fixtures__/layouts/${name}.json`, import.meta.url), 'utf8'),
    ) as { pages: { y: number; size: number; cells: PdfLine['cells'] }[][] }
  ).pages.map((p) => p.map((l) => ({ ...l, text: l.cells.map((c) => c.text).join('   ') })));
const opts = { currency: 'INR', tripStart: '2024-12-20', today: '2024-11-01' };
const pick = (d: object, keys: string[]) =>
  Object.fromEntries(keys.map((k) => [k, (d as Record<string, unknown>)[k]]));
const KEYS = ['type', 'title', 'startDate', 'startTime', 'endDate', 'endTime'];

describe('real hotel confirmations (Plan 38)', () => {
  it.each([
    [
      'hotel-paris',
      'Garden Saint Martin',
      '2024-12-20',
      '15:00',
      '2024-12-24',
      '11:30',
      'Paris, France',
      70140,
      'EUR',
    ],
    [
      'hotel-tromso',
      'TA Stakkevollvegen Studio',
      '2024-12-29',
      '15:00',
      '2025-01-02',
      '11:00',
      'Tromsø, Norway',
      1548000,
      'NOK',
    ],
    [
      'hotel-oslo',
      'The Apartments Company - The Sweet',
      '2025-01-02',
      '15:00',
      '2025-01-05',
      '11:00',
      'Oslo, Norway',
      838760,
      'NOK',
    ],
    [
      'hotel-amsterdam',
      'Stayokay Hostel Amsterdam Oost',
      '2024-12-24',
      '15:00',
      '2024-12-26',
      '10:30',
      'Amsterdam, Netherlands',
      34947,
      'EUR',
    ],
  ])('%s', (name, title, startDate, startTime, endDate, endTime, addressEnd, cost, currency) => {
    const [d, ...rest] = parseBookingPages(layout(name), opts);
    expect(rest).toHaveLength(0);
    expect(pick(d!, KEYS)).toEqual({ type: 'stay', title, startDate, startTime, endDate, endTime });
    expect(d!.address?.endsWith(addressEnd)).toBe(true);
    expect(d!.reference).toMatch(/^4100\.200\.30\d$/);
    expect(d!.provider).toBe('Booking.com');
    expect([d!.costMinor, d!.currency]).toEqual([cost, currency]);
  });
});

describe('real flight tickets (Plan 38)', () => {
  it('an agency e-ticket with a connection gives one booking per flight', () => {
    const drafts = parseBookingPages(layout('flight-agency-chennai-paris'), opts);
    expect(
      drafts.map((d) => pick(d, [...KEYS, 'fromCode', 'toCode', 'reference', 'provider'])),
    ).toEqual([
      {
        type: 'flight',
        title: 'Chennai → Mumbai · AI 571',
        startDate: '2024-12-20',
        startTime: '08:00',
        endDate: '2024-12-20',
        endTime: '10:05',
        fromCode: 'MAA',
        toCode: 'BOM',
        reference: 'QW7RTA',
        provider: 'Air India',
      },
      {
        type: 'flight',
        title: 'Mumbai → Paris · AI 2023',
        startDate: '2024-12-20',
        startTime: '12:45',
        endDate: '2024-12-20',
        endTime: '17:55',
        fromCode: 'BOM',
        toCode: 'CDG',
        reference: 'QW7RTA',
        provider: 'Air India',
      },
    ]);
    expect([drafts[0]!.costMinor, drafts[0]!.currency, drafts[1]!.costMinor]).toEqual([
      6713600,
      'INR',
      null,
    ]);
  });

  it('three legs over two days, the year after the booking date', () => {
    const drafts = parseBookingPages(layout('flight-agency-oslo-chennai'), opts);
    expect(drafts.map((d) => pick(d, [...KEYS, 'fromCode', 'toCode']))).toEqual([
      {
        type: 'flight',
        title: 'Oslo → Istanbul · 6E 4283',
        startDate: '2025-01-05',
        startTime: '12:00',
        endDate: '2025-01-05',
        endTime: '18:10',
        fromCode: 'OSL',
        toCode: 'IST',
      },
      {
        type: 'flight',
        title: 'Istanbul → Delhi · 6E 12',
        startDate: '2025-01-05',
        startTime: '20:15',
        endDate: '2025-01-06',
        endTime: '04:40',
        fromCode: 'IST',
        toCode: 'DEL',
      },
      {
        type: 'flight',
        title: 'Delhi → Chennai · 6E 2281',
        startDate: '2025-01-06',
        startTime: '07:15',
        endDate: '2025-01-06',
        endTime: '10:00',
        fromCode: 'DEL',
        toCode: 'MAA',
      },
    ]);
    expect(drafts.map((d) => d.reference)).toEqual(['KD4MZP', 'HX9BNE', 'HX9BNE']);
  });

  it('a travel document with DEPARTURE / ARRIVAL columns', () => {
    const [d, ...rest] = parseBookingPages(layout('flight-document-tromso-oslo'), opts);
    expect(rest).toHaveLength(0);
    expect(pick(d!, [...KEYS, 'fromCode', 'toCode', 'reference', 'provider'])).toEqual({
      type: 'flight',
      title: 'Tromso → Oslo · SK 4433',
      startDate: '2025-01-02',
      startTime: '18:00',
      endDate: '2025-01-02',
      endTime: '20:00',
      fromCode: 'TOS',
      toCode: 'OSL',
      reference: 'TF6YUH',
      provider: 'Scandinavian Airlines',
    });
  });
});

describe('real train ticket (Plan 38)', () => {
  it('reads the stations, date, times and reference from its tables', () => {
    const [d] = parseBookingPages(layout('train-paris-amsterdam'), opts);
    expect(
      pick(d!, [...KEYS, 'fromText', 'toText', 'reference', 'provider', 'costMinor', 'currency']),
    ).toEqual({
      type: 'train',
      title: 'Paris Nord → Amsterdam Centraal · Train 9439',
      startDate: '2024-12-24',
      startTime: '12:22',
      endDate: '2024-12-24',
      endTime: '15:50',
      fromText: 'Paris Nord',
      toText: 'Amsterdam Centraal',
      reference: 'ZB5KWN',
      provider: 'Eurostar',
      costMinor: 9300,
      currency: 'EUR',
    });
  });
});
