# Plan 71 — The globe did not show on a build that had it

**Status:** ✅ Fix made · needs the owner's check on the phone

## What happened
The owner installed a new development build (from `b34fe23`, which includes the web view) and the Trips tab still showed the old list, with no globe.

## Why
The app decided whether the globe could run by looking the web view's native module up by name (`TurboModuleRegistry.get('RNCWebViewModule')`). That answered "no" on a build that has the web view. Why the lookup fails there is not established: it could not be reproduced without the phone.

No test caught it. Unit tests replace the web view with a stand-in and set the answer by hand, and the one flow that runs on a real built app (`apps/mobile/e2e`) had not been updated for the globe.

## Change
- **The check is now the thing itself:** `globeStatus()` in `lib/runtime.ts` loads the web view package once. If that works the globe runs; if it throws (an app built without it) the Trips tab is the list, as before. There is no name to get wrong.
- **Profile → This app build** now says "Globe: included." or "Globe: not in this build…" with the reason the app gave, so the answer on any phone is visible without guessing.
- **The end-to-end flow** now waits for the globe on the Trips tab and creates its trip through the globe flow (search Panaji, pick dates, split the days). It runs on a release build on an emulator, so it is the test for "the globe really loads". **Not yet run:** it was rewritten without a device and may need a pass after its first CI run.

## If the globe still does not show
Open Profile → This app build. "Globe: not in this build" with a reason means the installed app really lacks the web view (an older build is still installed); the reason text says what was missing.
