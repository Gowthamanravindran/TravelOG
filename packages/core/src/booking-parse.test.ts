import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parseBookingText } from './booking-parse';
import { extractPdfText } from './pdf';

// Made-up bookings laid out like the text our PDF reader returns (columns kept
// apart by three spaces). Names, numbers and references are invented.
const opts = { currency: 'INR', today: '2026-06-01' };

describe('parseBookingText', () => {
  it('reads an airline e-ticket', () => {
    const text = `IndiGo
Booking Reference (PNR)   X7K2QP
Booking Date   02 Jun 2026
Flight   From   To
6E 2134   Bengaluru (BLR)   Goa (GOI)
Departure   Sat, 12 Jul 2026 06:45   Terminal 1
Arrival   Sat, 12 Jul 2026 08:00
Passenger Name   Mr Arjun Rao   Seat 14C
Total Fare   ₹ 4,567.00`;
    const [d, ...rest] = parseBookingText(text, opts);
    expect(rest).toHaveLength(0);
    expect(d).toMatchObject({
      type: 'flight',
      title: 'BLR → GOI · 6E 2134',
      provider: 'IndiGo',
      reference: 'X7K2QP',
      startDate: '2026-07-12',
      startTime: '06:45',
      endDate: '2026-07-12',
      endTime: '08:00',
      costMinor: 456700,
      currency: 'INR',
    });
    expect(d).toMatchObject({ fromText: 'BLR', toText: 'GOI', fromCode: 'BLR', toCode: 'GOI' });
    expect(d!.notes).toContain('Passengers: Mr Arjun Rao');
    expect(d!.notes).toContain('Seat 14C');
    expect(d!.found).toEqual(
      expect.arrayContaining(['type', 'title', 'provider', 'reference', 'start', 'end', 'cost']),
    );
  });

  it('splits a return trip from a booking site into two legs', () => {
    const text = `MakeMyTrip
Booking ID: NF2A9B7C1234
Your flight booking is confirmed
ONWARD   Sat, 12 Jul 2026
BLR → GOI   IndiGo 6E-2134   06:45 - 08:00
RETURN   Sun, 19 Jul 2026
GOI → BLR   IndiGo 6E-517   21:10 - 22:25
Traveller   Ms Priya Nair
Grand Total   ₹9,840`;
    const drafts = parseBookingText(text, opts);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]).toMatchObject({
      type: 'flight',
      title: 'BLR → GOI · 6E 2134',
      provider: 'IndiGo',
      reference: 'NF2A9B7C1234',
      startDate: '2026-07-12',
      startTime: '06:45',
      endDate: '2026-07-12',
      endTime: '08:00',
      costMinor: 984000,
    });
    expect(drafts[1]).toMatchObject({
      title: 'GOI → BLR · 6E 517',
      startDate: '2026-07-19',
      startTime: '21:10',
      endTime: '22:25',
      // The total belongs to the first leg only, so it isn't counted twice.
      costMinor: null,
    });
    expect(drafts[1]).toMatchObject({ fromCode: 'GOI', toCode: 'BLR' });
    expect(drafts[0]!.notes).toContain('Booked on MakeMyTrip');
    expect(drafts[0]!.notes).toContain('Ms Priya Nair');
  });

  it('reads a train ticket (10-digit PNR, coach and berth)', () => {
    const text = `Electronic Reservation Slip (ERS)
PNR   Train No./Name   Class
4521367890   16595 / PANCHGANGA EXP   SLEEPER CLASS (SL)
Quota   GENERAL (GN)   Distance 590 KM   Booking Date 01-Jun-2026 10:12:33 HRS
From   KSR BENGALURU (SBC)   Boarding At   KSR BENGALURU (SBC)   To   MADGAON (MAO)
Departure* 18:05 12-Jul-2026   Arrival* 06:30 13-Jul-2026
Passenger Details
1. ARJUN RAO   32   M   CNF / S7 / 41 / LOWER
Total Fare   ₹ 845.00
IRCTC Convenience Fee is charged per e-ticket.`;
    const [d] = parseBookingText(text, opts);
    expect(d).toMatchObject({
      type: 'train',
      title: 'KSR Bengaluru (SBC) → Madgaon (MAO) · Train 16595',
      provider: 'IRCTC',
      reference: '4521367890',
      startDate: '2026-07-12',
      startTime: '18:05',
      endDate: '2026-07-13',
      endTime: '06:30',
      costMinor: 84500,
    });
    expect(d).toMatchObject({
      fromText: 'KSR Bengaluru (SBC)',
      toText: 'Madgaon (MAO)',
      fromCode: null,
    });
    expect(d!.notes).toContain('Coach S7, Berth 41');
  });

  it('reads a bus ticket', () => {
    const text = `redBus
Ticket No: TS8K29XQ   PNR: 7Y2K9Q41
Bus Operator: VRL Travels
Bengaluru → Gokarna
Journey Date: 12 Jul 2026
Boarding Point: Majestic, 21:30   Dropping Point: Gokarna Bus Stand
Seat No: L4, L5
Total Fare: Rs. 1,798.00`;
    const [d] = parseBookingText(text, opts);
    expect(d).toMatchObject({
      type: 'bus',
      title: 'Bengaluru → Gokarna',
      provider: 'VRL Travels',
      reference: '7Y2K9Q41',
      startDate: '2026-07-12',
      startTime: '21:30',
      costMinor: 179800,
    });
    expect(d!.notes).toContain('Seat L4');
    expect(d!.notes).toContain('Booked on redBus');
  });

  it('reads a hotel voucher', () => {
    const text = `Booking.com
Booking confirmation
Confirmation number: 4182.553.907
PIN code: 7741
Hotel Sea Breeze Candolim
Address: Candolim Beach Road, Candolim, Goa 403515, India
Check-in   Friday, 10 July 2026   from 14:00
Check-out   Monday, 13 July 2026   until 11:00
3 nights, 1 room
Room type: Deluxe Double Room with Sea View
Guest name: Arjun Rao
Total price   ₹ 18,450`;
    const [d] = parseBookingText(text, opts);
    expect(d).toMatchObject({
      type: 'stay',
      title: 'Hotel Sea Breeze Candolim',
      provider: 'Booking.com',
      reference: '4182.553.907',
      startDate: '2026-07-10',
      startTime: '14:00',
      endDate: '2026-07-13',
      endTime: '11:00',
      costMinor: 1845000,
    });
    expect(d!.notes).toContain('Room: Deluxe Double Room with Sea View');
    expect(d!.notes).toContain('3 nights');
    expect(d!.address).toBe('Candolim Beach Road, Candolim, Goa 403515, India');
    expect(d!.notes).toContain('Guest: Arjun Rao');
  });

  it('reads a home-stay booking with dates in a table and no year', () => {
    const text = `Airbnb
Your reservation is confirmed
You're going to Coorg!
Misty Hills Homestay
Entire cottage hosted by Kavya
Check-in   Check-out
Fri, 24 Jul   Sun, 26 Jul
3:00 PM   11:00 AM
Guests   4 adults
Confirmation code   HMQ2X8ZT4P
Total (INR)   ₹12,600.00`;
    const [d] = parseBookingText(text, opts);
    expect(d).toMatchObject({
      type: 'stay',
      title: 'Misty Hills Homestay',
      provider: 'Airbnb',
      reference: 'HMQ2X8ZT4P',
      startDate: '2026-07-24',
      startTime: '15:00',
      endDate: '2026-07-26',
      endTime: '11:00',
      costMinor: 1260000,
    });
    expect(d!.notes).toContain('4 adults');
  });

  it('reads an event ticket', () => {
    const text = `BookMyShow
Monsoon Beats Live
Venue: Jio Garden, Bandra Kurla Complex, Mumbai
Sat, 18 Jul 2026 | 7:00 PM
Booking ID: BMS7Q2K91
Tickets: 2   Total Amount: ₹ 3,000.00`;
    const [d] = parseBookingText(text, opts);
    expect(d).toMatchObject({
      type: 'event',
      title: 'Monsoon Beats Live',
      provider: 'BookMyShow',
      reference: 'BMS7Q2K91',
      startDate: '2026-07-18',
      startTime: '19:00',
      costMinor: 300000,
      address: 'Jio Garden, Bandra Kurla Complex, Mumbai',
    });
  });

  it('keeps a price in another currency', () => {
    const [d] = parseBookingText(
      'Hotel Shinjuku Granbell\nCheck-in 2026-04-03\nCheck-out 2026-04-06\nTotal: JPY 54,000',
      opts,
    );
    expect(d).toMatchObject({ costMinor: 54000, currency: 'JPY', startDate: '2026-04-03' });
  });

  it('gives one empty draft when nothing is recognisable', () => {
    const drafts = parseBookingText('Hello there\nSee you soon', opts);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({
      type: 'other',
      title: '',
      reference: null,
      startDate: null,
      costMinor: null,
      found: [],
    });
  });

  it('reads a ticket PDF printed by a browser end to end', () => {
    const bytes = readFileSync(new URL('./pdf/__fixtures__/chromium-ticket.pdf', import.meta.url));
    const [text] = extractPdfText(bytes);
    const [d] = parseBookingText(text!, opts);
    expect(d).toMatchObject({
      type: 'flight',
      title: 'Bengaluru → Goa · 6E 2134',
      fromText: 'Bengaluru',
      toText: 'Goa',
      fromCode: 'BLR',
      toCode: 'GOI',
      provider: 'IndiGo',
      reference: 'X7K2QP',
      startDate: '2026-07-12',
      startTime: '06:45',
      endTime: '08:00',
      costMinor: 456700,
    });
  });
});
