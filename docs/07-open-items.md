# 07 · Open Items

Everything still undecided or not yet done before and during the build. Each item says who owns it and which phase of the [development plan](13-development-plan.md) closes it.

## Legal and business
| Item | Why it matters | Owner | Closes in |
|---|---|---|---|
| Privacy policy and terms of use | Required by both stores and India's DPDP Act 2023 (consent, purpose, data export and deletion, grievance contact) | Claude drafts, owner reviews (ideally with a lawyer) | Draft Phase 1, final Phase 8 |
| App Store privacy labels, Play Data safety form | Store submission blocks without them | Claude prepares answers, owner submits | Phase 8 |
| Company registration (Pvt Ltd or LLP) | Needed for: DLT SMS sender registration (phone OTP), GST invoices, affiliate payouts at scale, organisation store accounts (skips Play's 12-tester rule, shows a company name on Apple) | Owner | Before Phase 6 |
| GST registration | Required once turnover crosses the threshold; foreign platforms (Apple/Google) handle GST on in-app sales they collect | Owner + accountant | When revenue starts |
| Geoapify before launch (Plan 29) | Dev use on the free plan is allowed. Before GA: (1) email info@geoapify.com to confirm production use on the free plan, and that we may keep lookup results permanently in our `places` table, or move to a paid plan; (2) show "Powered by Geoapify" next to "© OpenStreetMap contributors" under place results and in Profile → Place data, required on the free plan. The provider may change before then, so neither is done yet | Owner (email), Claude (credit) | Before GA (Phase 8) |
| AI document reading (paid, after Plan 31) | Plan 31 reads digital PDFs on the phone with pattern rules. A paid AI option would read scans, photos and screenshots of tickets, and any layout the rules miss. It needs the AI service (Phase 7), a price, and the documents leaving the phone only with consent | Owner (pricing), Claude | With Phase 7 (AI) |
| Name and trademark check for "TravelOG" | Avoid a rename after launch | Owner | Phase 0 |
| Domain | Invite links, universal links, email sender, website | Owner | Phase 0 |

## Product
| Item | Decision needed | Closes in |
|---|---|---|
| Moderation | Tooling and process defined in [16](16-admin-and-ops.md); rules for what gets removed still to write | Phase 5 |
| Support channel | In-app "Help" → email first; WhatsApp support later | Phase 8 |
| Analytics event list | Funnel defined in [15](15-go-to-market.md) §7; event names and properties to write | Phase 1, extended each phase |
| Languages | English at launch; Hindi after launch (strings externalised from day one) | Phase 1 (setup), post-launch |
| App icon and store screenshots | Final brand assets | Phase 8 |
| Choose a trip's cover (after Plan 53, Plan 54) | A trip setting **Cover**: *Automatic* (the default, so a new trip never looks empty: destination photo, else 3D art), *one of the trip's own photos* from Memories, or *3D art only*. Stored on the trip as a nullable `cover_photo_id` (`null` = automatic) and synced like other trip fields; shown through the same `RemoteImage` layer, or the local file while the photo is only on the phone. Useful during and after a trip, once Memories has photos | When Memories photos sync (Phase 5) |
| Destination photo catalogue in Supabase (Plans 53, 55, 56) | Covers already load over the 3D art (Plan 53), but today's photo list is bundled in the app, so a new photo needs an app release. Move it to a Supabase `destination_photos` table that the app asks when a trip is created (Plan 56). Owner: domain on Cloudflare, `travelog-public` with a custom domain, the photos (`docs/14` §3 step 6). Claude: table, upload script, app | Before beta (Phase 8) |
| Routing spike, and its cost in pricing (Plan 57) | Travel times between stops are estimated on the phone for now (straight line × road factor, Indian town and open-road speeds, shown with "≈"). Before real road times: a spike that builds OSRM and Valhalla for India in GitHub Actions (peak memory, build time, data size, so the real server size and monthly cost) and compares our estimate against real routes on ~500 Indian place pairs (towns, ghats, ferries). Compare against Geoapify Routing (free 3,000 credits/day, commercial use allowed with credit), OpenRouteService and Google Routes. Answers are cached per pair of places, so calls grow slower than users. The result feeds the cost model in [04](04-pricing-and-costs.md) (the ~$40/month routing line there is a guess, not a measurement) and the pricing strategy | Before maps (Phase 4); cost model before pricing is set |
| Home country and check-ins in Memories (Plans 61–62) | Get ready infers "abroad" from the home currency (INR → India); add a home-country setting in Profile. Must-do check-ins show in Today's timeline only; show check-ins (with notes and places) in Memories and Studio's trip-stats card | With Memories sync (Phase 5) |
| Import places from reels and videos (Plans 59–60 built, removed in Plan 64) | Paste a link and Share to TravelOG were taken out: from the phone, Instagram shares no caption and its video can't be shown without Meta's approval, so they gave users little. Done properly it's a server pipeline (as a reference app does, about 10 s with a progress sheet): fetch the public post page (preview tags carry most of the caption) → optionally download the video for speech-to-text and on-screen text → Claude lists the places → place search matches them; cache by link. TikTok's link info and YouTube's API (description, subtitles) are within their terms; Instagram's terms forbid automated collection, it gets blocked or hits a login wall at times, and video download carries more risk. Cost per reel: under ₹0.5 for caption + AI, about ₹2–5 with speech and frames. Needs a Supabase function plus a small paid worker for video. Within the rules: screenshot reading, or a quick "pick the place" share. Next step: a spike on 10–20 real reel links. The removed code is in commits `4a13473` (link screen, place finder) and `d4599aa` (share sheet) | Phase 7 (AI), or earlier if pulled forward |
| Globe: before launch (Plan 66) | (1) Host the satellite imagery ourselves; it comes from a public mirror today. (2) Get the India-view borders reviewed. (3) Move the map library, country shapes, flags and city list out of the JavaScript bundle into asset files: the bundle grew 5.5 MB. (4) Decide whether to roll the globe out behind a remote switch. | Before beta (Phase 8) |
| Create a trip on the globe: later (Plan 67) | Trips without dates in the globe flow ("Not sure yet"); dragging stops to reorder; existing trips' pins on the home globe; removing the old New trip form once the new development build is installed; category colours that differ in the black and white theme (Plan 65). | When the owner asks |
## Quality and operations
| Item | Plan | Closes in |
|---|---|---|
| Test strategy | Unit (Jest), component (React Native Testing Library), database permission tests (pgTAP), end-to-end (Maestro) on CI. Maestro runs nightly on an emulator since Plan 49 (`apps/mobile/e2e`) | Phase 0 setup, grows each phase |
| AI quality checks | A fixed set of trip requests with expected properties, run before any AI change | Phase 7 |
| Accessibility pass | Screen reader labels, dynamic type, contrast | Each phase; full pass Phase 8 |
| Backups and restore drill | Supabase daily backups (Pro); one practice restore to staging | Phase 8 |
| Monitoring and alerts | Alert list defined in [16](16-admin-and-ops.md) §3 | Phase 1, Phase 7 |
| Kill switch | `app_config.min_supported_version` forces an update; feature flags to turn features off | Phase 1 |
| Incident checklist | Steps defined in [16](16-admin-and-ops.md) §4 | Done (planning) |
