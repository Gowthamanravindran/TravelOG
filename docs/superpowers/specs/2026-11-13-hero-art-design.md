# Hero art (3D illustrations) — design

**Date:** 2026-11-13 · **Plan:** 52 · **Status:** approved by the owner after two rounds of mockups

## Intent
The app felt empty and not fun: plain trip cards, a plain trip header, and empty screens that were an icon and two lines. The owner chose glossy 3D objects on soft theme gradients for the welcome screen, trip cards, trip headers, Trip mode Today and every empty screen, with the art licensed properly.

## Goals, non-goals
- **Goals:** every trip has a visual identity from its trip type; every empty screen has a friendly object and one clear action; the art works offline from the first launch and follows every theme; licences are complete and visible in the app.
- **Non-goals (later):** real destination photos for trip covers (fetched per trip through our server, cached on the phone, with credits); choosing your own trip photo as a cover.
- **Anti-goals:** no new native packages (Plan 48); no hex colours in app chrome; nothing that breaks Reduce motion; no art whose licence we can't show.

## Approaches considered
1. **Code-drawn scenes** (shapes and gradients): themeable and tiny, but the owner judged them "very bad".
2. **Free 2D illustration sets** (unDraw, Open Peeps, DrawKit, ManyPixels): judged too basic; unDraw's licence also limits embedding in an app.
3. **3D objects (Microsoft Fluent Emoji 3D, MIT) on theme gradients**: chosen. Rich and playful, licence clear, about 0.8 MB bundled.
4. Real destination photos: chosen for later, alongside 3D.

## The design
**Art registry (`src/ui/art.tsx`).** It holds the objects:
- luggage, airplane, beach with umbrella, snow-capped mountain, cityscape, desert, automobile, high-speed train, camping, hiking boot, Hindu temple, party popper, curry rice;
- world map, globe, sparkles, ticket, money bag, camera, ballot box with ballot, page facing up, framed picture, round pushpin.

It provides three pieces:
- **`<Art name size float?>`:** draws an object with `expo-image`. It floats gently through `ui/motion.tsx` (Reanimated, transform only), and stays still with Reduce motion on.
- **`<ArtBackdrop family>`:** an `expo-linear-gradient` from the theme's tile tint to its surface colour. Colours come only from `useTheme()`, so it passes the style guard.
- **`<ArtImage>`:** a non-floating version for small spots.

**Which object a trip gets.** It follows the trip's existing icon, the one picked in the trip form and stored in `trips.emoji` (`lib/labels.ts` `TRIP_ICONS`), so no database change is needed:

| Trip icon | Object |
|---|---|
| Trip | luggage |
| Beach | beach with umbrella |
| Mountains | snow-capped mountain |
| City | cityscape |
| Road trip | automobile |
| Abroad | airplane |
| Train | high-speed train |
| Camping | camping |
| Trek | hiking boot |
| Pilgrimage | Hindu temple |
| Celebration | party popper |
| Food | curry rice |
| Desert (new) | desert |

The new **Desert** option is added to the picker, with a matching icon in `ui/icon.tsx`. The helper is `tripArt(icon)` plus the existing `tripIconFamily(icon)` for the gradient.

**Where it shows:**
- **Trip card (`components/trip-card.tsx`):** the cover band becomes an `ArtBackdrop`, with the trip's object on the right and the state pill on the left (as mocked).
- **Trip header (`components/trip-header.tsx`):** a band with the object behind the title area. Title, dates and chips keep their current readable surface, so nothing drops below 4.5:1.
- **Welcome (`app/welcome.tsx`):** the world map, an airplane and sparkles above the heading.
- **Trip mode Today (`app/trip/[id]/live/index.tsx`):** a hero band with the trip's object, showing "Day 3 of 5 · Paris" (the existing data).
- **Empty screens:** `Empty` in `ui/kit.tsx` gets an optional `art` prop. With it, an art panel replaces the icon circle; without it, it looks as now. Every current call site gets one:

| Screen | Object |
|---|---|
| No trips | luggage + airplane |
| Itinerary empty day / Ideas | beach with umbrella / globe (per trip art) |
| Bookings | ticket |
| Documents | page facing up |
| Expenses | money bag |
| Memories | camera |
| Polls | ballot box |
| Today with nothing planned | the trip's object |
| Nearby | round pushpin |
| Feed and Explore | world map / globe |

The texts stay the same, so the e2e flow ("Collect ideas here", "Add the first stop") is unaffected.

**Licences, done properly:**
1. **`apps/mobile/assets/art/LICENSE`:** Microsoft's MIT licence text and copyright notice, next to the images. A `SOURCE.md` lists each file and its original path in the Fluent repo.
2. **`THIRD_PARTY_NOTICES.md`** at the repo root:
   - Fluent Emoji 3D (MIT, full text);
   - the bundled fonts: Plus Jakarta Sans and Figtree (SIL OFL 1.1) and Material Symbols (Apache 2.0), checked against the licence files in their `@expo-google-fonts` packages;
   - place data: GeoNames (CC-BY 4.0) and OpenStreetMap (ODbL), moved here from Profile's wording;
   - a pointer to the generated package list.
3. **In the app, a new "Licences" screen (`app/licenses.tsx`)**, opened from a "Licences and credits" row in Profile that replaces the current Place data card. It has sections for:
   - illustrations (Fluent Emoji 3D, © Microsoft, MIT; full text expandable);
   - fonts;
   - place data;
   - **open-source packages:** every production dependency of the mobile app with its version and licence name, from a generated list.
4. **Generated package list:** `scripts/licenses/build.mjs` (`pnpm licenses:build`) runs `pnpm licenses list --prod --json` for `@travelog/mobile` and writes `apps/mobile/assets/licenses.json` (name, version, licence, homepage). It's committed, and a test fails if the list is missing a current dependency, so it can't go stale silently.


## Left to the builder
Exact object sizes per screen within 64–112 pt, gradient angles, and float timing (within `ui/motion.tsx` durations).
