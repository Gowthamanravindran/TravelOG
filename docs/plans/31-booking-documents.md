# Plan 31 — Add bookings from a document (read on the phone)

**Status:** ✅ Built

## Context
The owner wants to add a booking by uploading its document (flight e-ticket, train ticket, hotel voucher and so on) and have the details filled in: start and end dates, PNR or reference, places and price. Uploading is the main way to add a booking; typing the details is the other option.

**No AI for now.** Reading documents with AI will be a paid feature later (backlog in `docs/07`). This version works **offline on the phone**. When a document can't be read, the person types the details.

The booking form also had empty space below it. The owner chose to open it as a **bottom sheet sized to its content**.

## What the person sees
1. **Bookings → Add booking** opens a small sheet with two options:
   - **Upload document** (first, filled): "PDF ticket or voucher: we fill in the details for you".
   - **Enter booking details**: the empty form.
2. **Upload document:**
   - The phone's file picker opens. The file is copied into the app, as attachments already were.
   - The sheet shows "Reading your document…".
   - The booking form opens filled in. The heading reads "Flight · Check the details" and a card says "Filled in from your document: check before saving". Each filled field says "From your document" under it.
   - The document is attached to the booking when it's saved.
3. **A document with several bookings** (a return flight, a connection) opens as "Booking 1 of 2". "Add and go to the next" saves the first and fills in the second; any leg can be skipped. The document is attached to each one. The total price goes on the first booking only, so it isn't counted twice.
4. **A scan, a photo or a locked PDF:** the form opens empty, with "Couldn't read this file: enter the details below". The file is still attached.
5. **Price in another currency** (e.g. a Tokyo hotel in JPY): the booking keeps that currency, and "Also add to expenses" is replaced by "add it under Budget to convert it".
6. The form has a **Notes** field: passengers, seat, coach and berth, room type, nights, guests, address and "Booked on …".

## How it works
- **`packages/core/src/pdf/`: a small PDF text reader in TypeScript.** It needs nothing native, so it works in Expo Go. It:
  - finds every object by scanning the file, so a damaged index doesn't matter, including objects packed in object streams;
  - unpacks compressed content with `fflate` (pure JS, about 8 KB minified), plus the ASCII85 and hex encodings;
  - follows the text operators (`Tj`, `TJ`, `'`, `"`, `Td`, `TD`, `T*`, `Tm`), the graphics matrix and form XObjects;
  - turns bytes into characters through each font's ToUnicode map, or its encoding and glyph names;
  - places the text where the page draws it and rebuilds lines top to bottom, left to right. Wide gaps become three spaces, so table columns stay apart.

  It returns `[]` for encrypted files and image-only pages.
- **`packages/core/src/booking-parse.ts`: `parseBookingText(text, { currency })`.** Pattern rules, no AI:
  - **Type:** keyword scores, plus airline flight numbers, train numbers and the booking site.
  - **Reference:** PNR first, then booking, confirmation or reservation ID, then itinerary or ticket number. The value can be on the same line or in the cell below a table header.
  - **Dates:** `12 Jul 2026`, `12-Jul-26`, `12/07/2026` (day first), `2026-07-12`, `Jul 12, 2026` and dates without a year. Each date is classed as start or end by its label, or by the column header above it (departure or check-in, arrival or check-out). Booking, issue and payment dates are ignored.
  - **Times:** next to the date, labelled ("Departure 06:45"), a range ("06:45 - 08:00"), or in a row under the dates. If a flight arrives earlier on the clock than it left, it arrived the next day.
  - **Places:** "Bengaluru (BLR) → Goa (GOI)", airport-code pairs, "From … To …" labels and "A → B" lines.
  - **Hotel name:** a labelled name, else the first short line that names a stay.
  - **Price:** grand total, then amount paid, then total fare, then total; ₹/Rs/INR/$/€/£/AED/SGD/THB/¥. Stored as integer minor units.
  - **Provider:** the airline, from its code or name, else the bus operator, IRCTC or the booking site.

  Dates and times stay as printed, as local values; the form turns them into UTC with the trip's time zone, as typed dates always were.
- **`apps/mobile/src/lib/booking-import.ts`** reads the picked file's bytes (`File.bytes()`, expo-file-system) and runs the reader and the parser. It never throws: anything unreadable gives an empty form. The result goes to the form screen by an in-memory id, not in the route.
- **`ui/choice-sheet.tsx`** is the two-option sheet. **`SheetScreen`** (`ui/kit.tsx`) is a form body with nothing that stretches. The booking route is `presentation: 'formSheet'` with `sheetAllowedDetents: 'fitToContents'`.

## Limits (said plainly)
- **Scans and photos need OCR**, which Expo Go doesn't have offline. They are attached, with the form left empty. This is for the paid AI reading later.
- **Password-protected PDFs** aren't decrypted: the form opens empty.
- **Times use the trip's time zone.** A flight between time zones shows its arrival in the trip's zone, so check it before saving.
- **The rules were tuned on made-up examples of common layouts**: airline, booking-site, IRCTC, bus, hotel, home-stay and event tickets, plus a ticket printed to PDF by Chromium. Real tickets will find gaps. 3–5 real tickets with personal details blacked out would let me add them as test cases.

## Tests
- `packages/core/src/pdf/pdf.test.ts`:
  - PDFs built in the test with `pdf-lib` (a dev dependency only, not in the app): a standard font, an embedded font with a ToUnicode map, with and without object streams, two pages, columns;
  - a hand-written PDF for two-byte codes, `bfrange` maps, `TJ` gaps and `T*`;
  - an image-only PDF, an encrypted one, a broken one and a non-PDF all give `[]`.
- `packages/core/src/booking-parse.test.ts`: an airline e-ticket, a return trip from a booking site (two legs), a train ticket, a bus ticket, a hotel voucher, a home stay with no year in a table, an event, a price in JPY, text with nothing in it, and the Chromium-printed PDF end to end.
- `apps/mobile/src/__tests__/booking-import.test.tsx`:
  - the choice sheet's order;
  - uploading the ticket PDF fills in the form and saving gives the booking, its attachment, the expense and the right UTC times;
  - a photo gives an empty form with the note and the attachment;
  - cancelling the picker;
  - manual entry;
  - "1 of 2".
- The Android bundle is 5.42 MB, 6.0% over the baseline, inside the 10% budget.

## Owner
- `git pull && pnpm dev:go`, then Bookings → Add booking → Upload document with a real e-ticket PDF. **No new build is needed**: Expo Go is enough.
- If the bottom sheet looks wrong on your phone (for example cut off or too tall), tell me. Going back to a full-screen modal is a one-line change in `app/trip/[id]/_layout.tsx`.
