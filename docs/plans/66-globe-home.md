# Plan 66 — The Trips tab is a globe, with the trip list in a drawer

**Status:** ✅ Built, not yet seen on a phone · Design: [`docs/superpowers/specs/2026-11-17-globe-home-design.md`](../superpowers/specs/2026-11-17-globe-home-design.md) (Part 2, the screen and the globe package)

## Context
The owner found the app felt like filling in forms. The front door becomes the globe from the owner's proof of concept (MapLibre GL JS in a web view), and creating a trip will happen on it (Plan 67).

## Change
- **`packages/globe`:** the proof of concept's globe, moved into the repo.
  - `GlobeMap` (the component), the map page, MapLibre GL JS 5.24.1 (bundled), country shapes (India point of view only), flags, and a list of about 24,000 cities.
  - City and country lookups for the app: `searchCities`, `topCities` (a country's largest cities, spaced apart), `cityById`, `cityPlaceId` (`gn:<id>`, the app's place ids), `searchCountries`, `countryByCode`, `countryByIso`.
  - New on the map: tappable candidate cities, numbered stops joined by a route that draws its newest leg, framing several countries or all stops, switching country taps off, and Reduce motion (camera moves jump, no spin).
- **Trips tab:** the globe on top and a drawer over its lower part with "Your trips", **Create a trip**, the filter and the trip cards. The drawer follows the finger and rests at two heights; the globe shrinks slightly as it rises and stops spinning when the tab is not showing.
- **The globe keeps its own colours and satellite imagery** in every theme (the owner's choice during the build). Offline, the flat map shows.
- **Where the web view is not in the installed app,** the Trips tab is the list as before and both create buttons open the old form. The globe code is only loaded after checking the web view is there, because importing it otherwise throws.
- **Licences:** MapLibre GL JS (BSD 3-Clause), Natural Earth (public domain) and flag-icons (MIT) are in the notices.

## For the owner
- **A new development build is needed** (`react-native-webview` is new native code). Until it is installed, the current build shows the list as before. Expo Go already has the web view.
- **Not yet checked on a phone.** The map page was run in desktop Chrome (taps, numbered stops, route, framing all work); the drawer's feel, the globe's speed in a web view, and all three themes still need a look in Expo Go.

## Measured
- Android bundle: 5.1 MB → 10.6 MB (+5.5 MB). The design estimated 3 MB; data kept as JavaScript grows once compiled. Size enforcement is paused (Plan 50).

## Follow-ups
- Ship the map library, country shapes, flags and cities as asset files (like the places list) and read them when the globe opens, to win back most of the size and keep them out of app start.
- Host the satellite imagery ourselves before launch; today it comes from a public mirror.
- Get the India-view borders reviewed before launch.
