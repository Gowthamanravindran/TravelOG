# Destination photos (Plan 53)

> **Interim.** This bundles the photo list in the app, so a new photo needs an app release. Plan 56 replaces it with a Supabase catalogue (`destination_photos`) before beta; this folder and `pnpm media:destinations` are then removed.

Trip covers come from photos in our public Cloudflare R2 bucket, `travelog-public` (Plan 55). Anyone with a link can view its files, so put nothing personal there; people's own photos live in the private `travelog-media-*` buckets. To add photos:

1. Upload each original to `travelog-public` as `destinations/<file>`, e.g. `destinations/goa.jpg`. Use only photos you have the rights to use.
2. Add one row per photo to `destinations.csv`:

   | Column | What | Example |
   |---|---|---|
   | `file` | The file name in `destinations/` | `goa.jpg` |
   | `places` | Place names it shows, separated by `;` (matched to a trip's destination) | `Goa;Panaji;North Goa` |
   | `place_ids` | Optional: our places ids, separated by `;` | `gn:1271157` |
   | `country` | Two-letter country code. A row with no `places` stands for the whole country | `IN` |
   | `credit` | Who took it, as shown on the card | `Asha Rao` |
   | `license` | The licence or permission | `Own photo` / `Unsplash Licence` / `CC BY 4.0` |
   | `source` | Optional link to the original | `https://unsplash.com/photos/…` |

3. Run `pnpm media:destinations`. It reads each photo (from `data/destinations/photos/<file>` if you keep local copies, else from the bucket's public URL in `EXPO_PUBLIC_MEDIA_URL`) and writes `apps/mobile/assets/destinations.json`: the photo's tiny blurred preview (BlurHash), size and credit, so covers show something at once and work offline.
4. Commit the CSV and `destinations.json`. Credits appear on the card and in Profile → Licences and credits.

Local copies in `data/destinations/photos/` are not committed (see `.gitignore`).
