# 17 · Owner Checklist (end to end)

Everything **you** need to do, from now to after launch, in order. Claude does the coding; these are the steps only you can do (accounts, payments, legal, approvals, testing, marketing).

- Details and exact clicks for each account step: [14 · Owner setup](14-owner-setup.md) (section numbers shown as §).
- What Claude builds in each phase: [13 · Development plan](13-development-plan.md).
- **Never paste secrets into chat** — add them to GitHub / EAS / Supabase / Cloudflare secret stores ([14](14-owner-setup.md), top).

Tick items here as you go (edit this file, or ask Claude to tick them).

---

## A. Before Phase 0 — decisions (this week)
- [ ] Read the design docs once: [01](01-product-spec.md), [04](04-pricing-and-costs.md), [05](05-profit-plan.md), [13](13-development-plan.md), [15](15-go-to-market.md). Note anything you disagree with.
- [ ] Check the name "TravelOG": search trademarks (ipindia.gov.in), the App Store, Google Play and Instagram for clashes.
- [ ] Decide the domain (e.g. `travelog.app` / `travelog.in`) and the app bundle id (e.g. `app.travelog.mobile`) — tell Claude both.
- [ ] Set a monthly budget you're comfortable with for the build period (accounts ≈ ₹12–15k one-time/yearly; infra ≈ ₹0–3k/month until launch).
- [ ] Get a password manager (Bitwarden/1Password) — you'll create many accounts and keys.
- [ ] Enable 2-factor authentication on your Google account, Apple ID and GitHub.

## B. Phase 0 — accounts and project setup
- [ ] §1 GitHub: branch protection on `main`; Actions enabled.
- [ ] §2 Buy the domain; move its DNS to Cloudflare.
- [ ] §3 Cloudflare: account; R2 buckets (staging, prod) + API token; Pages connected to the repo; API token for CI.
- [ ] §4 Supabase: projects `travelog-staging` and `travelog-prod` in **Mumbai**; save DB passwords; add URL/keys/refs to EAS and GitHub secrets; personal access token → `SUPABASE_ACCESS_TOKEN`.
- [ ] §5 Expo: account; `npm i -g eas-cli`; `eas login`; run `eas init` when Claude asks; `EXPO_TOKEN` → GitHub.
- [ ] On your computer (for local runs, optional but useful): install Node.js LTS, pnpm, Docker Desktop.
- [ ] Install the development build on your Android phone (and iPhone after step C).
- [ ] Post on Instagram/LinkedIn/X that you're building TravelOG; share the waitlist page once Claude publishes it.
- [ ] **Approve Phase 0**: CI green, dev build opens on your phone.

## C. Phase 1 — sign-in, offline data, navigation
- [ ] §6 Apple Developer Program (individual, $99/yr): enrol; App ID with Sign in with Apple, Push, Associated Domains; APNs key; App Store Connect app; API key for `eas submit`.
- [ ] Register your iPhone for development builds (`eas device:create`).
- [ ] §7 Google Play Console (personal, $25): sign up and verify identity (can take days — start early); create the app; internal testing list; service account for `eas submit`.
- [ ] §8 Google Cloud: project; OAuth consent screen; OAuth client IDs (web, Android with SHA-1s from EAS, iOS); add them in Supabase → Google provider.
- [ ] §9 Resend: verify your domain; SMTP settings in Supabase.
- [ ] §3 Turnstile site key + enable CAPTCHA in Supabase.
- [ ] §13 Sentry and PostHog projects; keys into EAS.
- [ ] Review the **draft privacy policy and terms** Claude writes (a lawyer review is worth it before launch).
- [ ] Test: sign in with Google, Apple, email code; create a trip in airplane mode and watch it sync.
- [ ] **Approve Phase 1.**

## D. Phase 2 — planning together
- [ ] Confirm the domain serves the universal-link files (Claude adds them; you check the link opens the app).
- [ ] Recruit 2–3 friends to test invites, plan variants and polls on their phones.
- [ ] Keep growing the waitlist (target 1,000+ by Phase 8).
- [ ] **Approve Phase 2.**

## E. Phase 3 — money and bookings
- [ ] Test expense splits with friends; settle up with your real UPI ID (small amount).
- [ ] Add a real ticket PDF and open it in airplane mode.
- [ ] **Approve Phase 3.**

## F. Phase 4 — trip mode
- [ ] §10 Map tiles provider key (free tier); create a small VPS in Mumbai for routing (Claude gives the setup script); decide on Open-Meteo commercial plan or climate data only.
- [ ] §8 Enable Places API (New), restricted key → Supabase secret; set a Google Cloud **budget alert**.
- [ ] Run a real half-day outing with the app (some of it offline); note battery use.
- [ ] **Approve Phase 4.**

## G. Phase 5 — memories and social
- [ ] §12 Meta for Developers app → App ID into EAS (Instagram Stories sharing).
- [ ] Write moderation rules: what gets removed, response time (Claude drafts; you decide).
- [ ] Sign up 10 travel micro-creators and 10 campus ambassadors for launch ([15](15-go-to-market.md) §4).
- [ ] Post a test collage to your Instagram Story.
- [ ] **Approve Phase 5.**

## H. Phase 6 — money-making
- [ ] Decide whether to **register a company now** (recommended before real payouts — see [07](07-open-items.md)); if yes, start it (Pvt Ltd/LLP, PAN, current account) — takes weeks.
- [ ] App Store Connect and Play Console: **tax and banking forms** (PAN, bank account) — required to sell anything.
- [ ] §12 Create products: "Plus Yearly" subscription and "Trip Pass" in both stores; prices ₹1,199 and ₹199.
- [ ] §12 RevenueCat project; keys into EAS; webhook secret into Supabase.
- [ ] Sign up with affiliate networks (vCommission, EarnKaro, Involve Asia, Travelpayouts) using PAN; send Claude the tracking IDs via secrets.
- [ ] Test a sandbox purchase on both platforms; restore after reinstall.
- [ ] **Approve Phase 6.**

## I. Phase 7 — AI planner
- [ ] §11 Anthropic Console: organisation, billing, **monthly spend limit**, usage alerts; API keys into Supabase (staging and prod).
- [ ] Review the first 20 trip blueprints (Japan Sakura, Bali, Thailand, Goa, Kerala, Spiti…): fix anything that looks wrong for a real traveller.
- [ ] Try 10 of your own trip requests; report any odd answers.
- [ ] **Approve Phase 7.**

## J. Phase 8 — beta and launch
- [ ] **Google Play closed test:** add **at least 12 testers** (from the waitlist) and keep them opted in for **14 consecutive days**. If someone drops out, add a replacement immediately (the count must stay ≥ 12). Confirm the current rule in Play Console Help.
- [ ] TestFlight: add external testers; Apple reviews the first beta build.
- [ ] Final privacy policy and terms (lawyer review recommended); publish on the domain.
- [ ] App Store privacy labels and Play Data safety form (Claude prepares answers; you submit).
- [ ] Store listings: app name, subtitle, description, keywords, screenshots, promo video, support email, age rating questionnaires.
- [ ] Upgrade Supabase **production** to Pro ($25/mo) for backups and no pausing.
- [ ] Watch the backup restore drill on staging.
- [ ] Set yourself up for alerts (Sentry, Supabase, Anthropic, RevenueCat emails/push) — [16](16-admin-and-ops.md) §3.
- [ ] Get Cloudflare Access set up for the admin app with your email (and any moderators).
- [ ] Submit both apps for review; answer reviewer questions within a day.
- [ ] **Approve launch.**

## K. Launch and pilot (first 2 months)
- [ ] Release to production on both stores.
- [ ] Onboard the **pilot: 50 friend groups** (campus ambassadors, creators, travel communities).
- [ ] Weekly: 20-minute calls with 5 groups (Claude provides the interview script).
- [ ] Weekly: check the dashboard — invites per trip, invitee join rate, D30 retention, Plus/Pass conversion, % trips booking, AI cost per user ([15](15-go-to-market.md) §7).
- [ ] Daily during pilot: moderation queue.
- [ ] Monthly: put real numbers into the [profit calculator](../mockups/profit-calculator.html) and compare with the targets in [05](05-profit-plan.md).
- [ ] Monthly: pay creator earnings; approve new blueprints.

## L. Months 2–6
- [ ] Decide on paid ad tests only if the pilot hits the "continue if" targets ([15](15-go-to-market.md) §6); cap at ₹25k/month until paid users pay back.
- [ ] Hire / pay the lean team only when the trailing contribution covers it ([05](05-profit-plan.md) §8).
- [ ] If the company is registered: **DLT registration** (entity, sender ID, OTP template) → SMS provider in Supabase → turn on phone sign-in (§14).
- [ ] Move store accounts to the company (Apple needs a D-U-N-S number).
- [ ] GST registration when turnover requires it (accountant).
- [ ] Every 6 months: restore drill; review data-retention jobs; review spend limits.

---

## Costs you'll pay (summary)
| Item | When | Cost |
|---|---|---|
| Domain | Phase 0 | ~₹800–1,500 / year |
| Apple Developer Program | Phase 1 | $99 / year |
| Google Play Console | Phase 1 | $25 once |
| Supabase Pro (production) | Phase 8 | $25 / month |
| Routing VPS | Phase 4 | ~$10–25 / month |
| Weather (optional commercial plan) | Phase 4 | Per Open-Meteo pricing |
| Anthropic API | Phase 7 | Usage, capped by your spend limit |
| Lawyer review of privacy/terms (recommended) | Phase 8 | Varies |
| Company registration (later) | Before Phase 6 or after launch | Varies |
| Pilot marketing | Launch | ₹0–50k |
Everything else starts on free tiers ([09](09-tech-stack.md)).
