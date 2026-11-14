# Plan 53 — Remote images done like production apps: never empty, never broken, fast

**Status:** ✅ Built (photos appear once the owner uploads them)

## Context
The owner will upload destination photos to Cloudflare for trip covers. They asked:
- how production apps keep images from looking empty or broken when they're slow or fail;
- how to keep things seamless when Feed and Nearby bring many pictures.

The answer is the standard layered approach:
1. a fallback that needs no network is drawn at once: our 3D art, or a BlurHash preview;
2. a right-sized photo from the CDN cross-fades in;
3. if it fails, the fallback stays;
4. it's cached at the edge and on the phone.

`expo-image`, already in the app, does all of this natively, so no new build is needed.

## Change
- **`ui/remote-image.tsx`:** the shared layer, used now by trip covers and later by Feed and Nearby.
  - The fallback is drawn underneath, with the BlurHash placeholder over it.
  - The photo fades in over 200 ms (none with Reduce motion) and is cached in memory and on disk.
  - On error, the fallback stays.
  - `priority` and `recyclingKey` are there for lists.
  - `prefetchImages()` downloads photos ahead of time.
- **`lib/media.ts`:** `mediaUrl(key, points)` builds a Cloudflare resize URL (`/cdn-cgi/image/width=…,quality=75,format=auto/…`), with the width rounded up to shared steps. It returns null until `EXPO_PUBLIC_MEDIA_URL` is set (`app.config.ts` `extra.mediaUrl`).
- **Destination photos:**
  - `data/destinations/destinations.csv` plus a README with the owner's routine;
  - `pnpm media:destinations` (`scripts/media/destinations.mjs`) computes each photo's BlurHash and size. It requires a credit and a licence for every photo, and writes `apps/mobile/assets/destinations.json`, bundled so covers know their preview and size offline;
  - `lib/destinations.ts` `coverFor` matches a trip's exact place, then its destination name, then its country.
- **Trip covers:**
  - the trip card shows the photo over its 3D art, with a "Photo: …" credit;
  - the trip header tile does the same at high priority;
  - the Trips list prefetches the first six trips' covers.
- **Credits:** a "Destination photos" section on the Licences screen and in `THIRD_PARTY_NOTICES.md`.
- **Docs:**
  - `docs/08` explains how images work, and how Feed and Nearby will reuse it (FlashList, thumbnails, paging, uploads resized on the phone with BlurHash and size);
  - `docs/14` §3 step 6 has the owner's Cloudflare steps;
  - `docs/09` stack row; `docs/07` open item updated.
- **Dev-only tools:** `sharp` and `blurhash` at the repo root, for the script only; nothing new ships in the app.

## Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`; `pnpm check:native` (no new native packages).
- `scripts/media/destinations.test.mjs`: CSV parsing, required credit and licence, name normalising, and a BlurHash from a real generated image.
- `remote-images.test.tsx`:
  - URL building and size steps; null without a bucket;
  - photo matching by place, name, country or none;
  - the fallback is shown at once and kept on error;
  - a trip card with a photo shows it over its art with the credit, and one without is unchanged;
  - photo credits on the Licences screen.
- Owner, after uploading:
  - covers fade in over the art;
  - in airplane mode, cached covers still show and the rest show the art.
