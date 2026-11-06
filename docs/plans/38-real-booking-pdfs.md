# Plan 38 — Bookings from real PDFs: places, dates and times read properly; a simpler form

**Status:** ✅ Built

## Context
The owner tried 9 real PDFs from a Europe trip and found adding bookings from them too fiddly:
1. The name was blank and required.
2. The start and end dates were separate pickers.
3. The city was wrong in most cases, once in the United States for a Europe hotel.
4. PNR and Provider showed for stays.

The samples were read on the owner's machine only; their personal details never left it unredacted.

## What was wrong
- **Words ran together** in the booking-site hotel PDFs ("GardenSaintMartin"). Those PDFs use Type 3 fonts, whose widths are in font units scaled by a FontMatrix (1/2048 here), not thousandths. The reader took every glyph to be about twice as wide as it is, saw no gaps, and added no spaces. The "fi" ligature also arrived as one character.
- **The facts sit in tables:**
  - Hotels: a `CHECK-IN | CHECK-OUT` header, with the day, month, weekday and time window stacked below, and no year.
  - Agency e-tickets: per-leg times with the dates on the next line, sometimes on the next page.
  - A flight travel document: `DEPARTURE | ARRIVAL` columns.
  - A Eurostar ticket: `TRAVEL DATE`, `DEPARTURE AT | ARRIVAL AT` and `REFERENCE/PNR`.

  Text with "3-space" column breaks lost these whenever a cell was empty.
- **Cities ignored the address's country,** so a same-named town abroad could win.

## Change
- **PDF reader:**
  - Type 3 widths use the font's FontMatrix;
  - text is normalised to NFKC (ligatures become letters);
  - a very large gap within one text run starts a new cell;
  - **`extractPdfLayout`** returns lines of cells with their x positions. `extractPdfText` is built on it.
- **`parseBookingPages`** (`packages/core/src/booking-tables.ts`) reads the tables by position. A value belongs to a header when they overlap across the page. It reads:
  - **hotels:** check-in and check-out day, month and time (from a window's start for check-in and its end for check-out), the property name above "Address:", and the address with its country line;
  - **flights:** one booking per leg. The flight's own line gives the cities, the two times are paired with the dates and airport codes in their columns, and each leg has its PNR;
  - **trains:** the travel date, departure and arrival times, the stations printed above them, the reference and the train number;
  - **years:** taken from the "booked on" or "issued" date, else the trip's start;
  - **prices:** "You'll pay … in EUR" and "You have paid INR …" are read. The trip's currency is preferred, then the amount actually charged, and "approx." display-currency amounts are skipped;
  - **more providers:** SAS and other European airlines, Eurostar and other rail operators, Gotogate;
  - **references:** the airline check-in reference is preferred over an agency order number. A stay's PIN goes into notes.
- **Places:**
  - an address's last part is its country, and the town must be in it (towns before regions, from the end of the address backwards);
  - station and airport names also try their first words ("Paris Nord" → Paris);
  - unclosed brackets and postcodes are ignored.
- **Form:**
  - the name is optional: "{City} stay", "{From} → {To}", or "{Type} in {City}" is filled in when left empty, and shown as the placeholder;
  - **one date-range picker** (check-in – check-out, departs – arrives) with two time fields beside it;
  - stays default to **12:00 check-in and 13:00 check-out** when no time is read;
  - **Provider and PNR only for flights, trains and buses.** Stays have "Confirmation no.", other bookings "Booking ref";
  - the repeated "From your document" line under each field is gone; the card at the top says it once.

## Tests
- **Redacted layouts of the 8 distinct sample PDFs** (`packages/core/src/__fixtures__/layouts/`).
  - Names, references, PINs, phone, ticket and order numbers, e-mails and links were replaced before anything was written.
  - The fixtures were scanned for every original value; none remain.
  - The original files are not in the repo.
- **Table reader** (`booking-tables.test.ts`): every hotel's name, dates, times, address, confirmation number, provider and price; both agency tickets leg by leg (2 and 3 legs, across a date change); the travel document; the Eurostar ticket.
- **PDF reader:** Type 3 spacing, ligatures, and cells with positions.
- **Places:** the address country decides which Paris; station names map to cities.
- **Form:** a stay saves as "Tokyo stay" at 12:00 and 13:00; a journey is named "Bengaluru → Tokyo"; a stay shows Confirmation no. and not PNR or Provider; the range picker sets both dates.
- **Rendered:** the real form, filled from a hotel confirmation, was drawn with react-native-web in light and dark and checked by eye.
- All nine originals were run end to end in memory, and every one filled in correctly.
