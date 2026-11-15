# Plan 60 — Share to TravelOG from other apps

**Status:** ✅ Built (step 4 of 4, after Plans 57–59). **Needs a new development build.**

## Context
The last of the four features chosen from the mocks: TravelOG in other apps' share sheet, so a reel, video or page goes straight to Save from a link (Plan 59) without copy and paste.

## Decisions
- **Package:** `expo-share-intent` 9 (SDK 58), with its config plugin in `app.config.ts`:
  - **Android:** a SEND filter for `text/*` (links and text) on the main activity, which stays `singleTask`.
  - **iPhone:** a share extension that accepts one web link or text, plus an App Group that EAS sets up at build time.
  - It's listed in `native-packages.json`, and `lastBuild` notes that a new build is needed.
- **Never crash without it** (Plans 20 and 48):
  - `lib/share-intent.tsx` loads the package only when its native module (`ExpoShareIntentModule`) is in the build. In Expo Go and older builds it renders nothing.
  - The Expo Go guard test allows the package in that one file only.
- **What a share does:** the handler in the root layout opens `/save-link?text=<shared text and link>`, then clears the share. Save from a link reads the link with `firstLink` and treats the rest as the caption. When Instagram shares a reel, it sends only the link, so the caption is still pasted by hand, as in Plan 59.
- **iPhone's share link:** the extension opens the app with a `dataUrl=` link that isn't a screen. `app/+native-intent.tsx` sends it home, where the handler picks the share up.
- **Profile → This app build** now also says whether this build has Share → TravelOG.

## Owner
Install a new development (or preview) build; see `docs/14` §5. Until then, Save from a link works as before, in Expo Go too.

## Fix after the first release build
The first e2e release build compiled, with the share filter in it, but the app stopped at start with "Cannot read property 'inst' of null".
- **Cause:** the handler called the package's hook through a prop named `hook`. The React Compiler, which only treats `use…` calls as hooks, cached that call, so on the next render the hook's own hooks were skipped. Jest doesn't run the compiler, so the tests passed.
- **Fix:** `makeShareIntentHandler(useIntent)` picks the hook once, at load, and calls it by a `use…` name, with `'use no memo'` as a second guard. Compiling with the compiler on now shows the call isn't cached.
- **Prevention:** the e2e workflow now also runs when `native-packages.json`, `app.config.ts` or `lib/share-intent.tsx` change.
