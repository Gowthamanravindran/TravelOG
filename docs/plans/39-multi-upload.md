# Plan 39 — Upload up to 10 documents at once

**Status:** ✅ Built

## Context
The owner asked for Add booking → Upload to accept several files at once, up to 10: a whole trip's tickets and vouchers in one go. The phone's file picker (`File.pickFileAsync({ multipleFiles: true })`, expo-file-system) already supports this in Expo Go.

## Change
- **"Upload documents"** picks up to 10 PDFs or photos. If more are picked, the first 10 are used and the form says "Only the first 10 files were added."
- **Each file is read on its own,** with progress ("Reading 3 of 7…", then "Finding the places…"). A file that can't be read never stops the others.
- **One step per booking, across all files, in date order** (undated ones last). A file with a connection still gives one step per flight. The form shows "Booking 3 of 9", and the card names **the file that booking came from**, with its own note: filled in, or "Couldn't read this file".
- **Duplicates are skipped:** the same booking from two files (same type, reference and start) appears once. The first step says "1 duplicate skipped."
- **Each saved booking gets its own file attached.** Skip and Cancel work as before.

## Code
- `lib/files.ts`: `pickAttachments(max = 10)`; both pickers share `keepCopy`.
- `lib/booking-import.ts`: `BookingImport` is now `{ steps, skipped, truncated }`, built by `buildImport(reads)`, which flattens, removes duplicates and sorts.
- `components/bookings-view.tsx` and `app/trip/[id]/booking.tsx` were updated to match.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`.
- New tests:
  - three files picked together: date order, each file's name on its step, the duplicate skipped, and the right file attached to each saved booking;
  - 12 files picked: the first 10 are used and the note shows.
- The first step was rendered with react-native-web and checked by eye.
- Owner: `git pull && pnpm dev:go`, then pick all the Europe PDFs at once. No new build is needed.
