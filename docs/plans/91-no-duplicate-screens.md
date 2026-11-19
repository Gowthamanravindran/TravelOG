# Plan 91 — No second copies of screens already open

**Status:** ✅ Built, not yet seen on a phone · Follows Plan 90, at the owner's request to look for the same problem everywhere

## The problem
Expo Router's `navigate` and `push` put a new screen on top, even when the screen is already open further back; `replace` swaps the current one for a new one. Going back to a screen that is already open is `dismissTo` (it opens the screen if it is not). Plan 90 fixed "Back to trips" and deleting a trip. Every navigation call in the app was checked for the same mistake (78 calls).

## Fixed
- **Profile → Edit → Save** replaced the form with a new Trips screen (and globe) over the old one. Editing now goes back; the first-run welcome still opens Trips, as there is none yet.
- **Get ready → Budget set / Getting there and back / A stay every night** opened the trip's Plan tabs a second time on top of the sheet. They now go back to the trip's tab underneath.
- **Tapping a reminder** always opened the trip on top, a second copy if it was already open. It now goes back to it if open, and opens it if not.

## Checked and left as they are
- Opening forms and details (bookings, expenses, stops, items, polls, studio, documents) goes forward on purpose; Done, Cancel and saving go back.
- Switching tabs within the home screen or within a trip's Plan or Live tabs only changes tab.
- From Live mode, the Plan tab's links open Plan on top of Live: Plan is not open underneath, so nothing is doubled; switching mode in the header replaces.
- `/trip/<id>` for links redirects once and is replaced, so it is never left open.

## Guard
`no-duplicate-screens.test.tsx` checks each fix, and scans the app's code: nothing may push, navigate or replace to the Trips screen (`'/'`) except tab switching on the home screen and the first-run welcome. Its pattern matches the two lines Plan 90 fixed.
