# Destination photos (Plan 53)

Trip covers come from photos in our Cloudflare R2 media bucket. To add photos:

1. Upload each original to the bucket as `destinations/<file>`, e.g. `destinations/goa.jpg`. Use only photos you have the rights to use.
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
