# 14 · Owner Setup Guide

Everything you need to set up yourself, in order. Each step says **when** it's needed (phase), **what it costs**, **what to click**, and **where to put the values**.

> **Never paste secrets (keys, passwords, tokens) into chat.** Put them in the secret stores below. Claude only needs to know *that* a secret exists and its name.

**Where secrets go**
| Store | How to open | Used by |
|---|---|---|
| GitHub Actions secrets | GitHub repo → Settings → Secrets and variables → Actions → New repository secret | CI, migrations, deployments |
| EAS environment variables | expo.dev → your project → Environment variables (or `eas env:create`) | App builds |
| Supabase function secrets | Supabase dashboard → Edge Functions → Secrets (or `supabase secrets set NAME=value`) | Server functions |
| Cloudflare secrets | Cloudflare dashboard → Workers & Pages → your project → Settings → Variables | Web, `/go` redirect |

Names in `UPPER_CASE` below are the exact secret names the code will read.

---

## §1 GitHub — Phase 0 · free
1. Repo `gowthamanravindran/travelog` exists.
2. Settings → Branches → Add rule for `main`: require a pull request and passing status checks.
3. Settings → Actions → General: allow GitHub Actions.

## §2 Domain — Phase 0 · ~₹800–1,500/yr
1. Buy a domain (e.g. `travelog.app` or `travelog.in`) at any registrar.
2. In Cloudflare (§3) add the site and change the registrar's nameservers to Cloudflare's.
3. Later (Phase 2) Claude adds the universal-link files; you only confirm the domain is on Cloudflare.
- Tell Claude: the domain name.

## §3 Cloudflare — Phase 0 · free to start
1. Create an account at cloudflare.com.
2. **R2:** R2 → Create bucket `travelog-media-staging` and `travelog-media-prod` (location: Asia-Pacific). R2 → Manage API tokens → Create token with *Object Read & Write* on these buckets.
   - Supabase function secrets: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.
3. **Pages:** Workers & Pages → Create → Pages → Connect to Git → choose the repo; build settings come later from Claude.
4. **API token for CI:** My Profile → API Tokens → Create token → template "Edit Cloudflare Workers".
   - GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
5. **Turnstile** (Phase 1): Turnstile → Add site → domain → get site key + secret.
   - EAS variable `EXPO_PUBLIC_TURNSTILE_SITE_KEY`; Supabase dashboard → Auth → Attack protection → enable CAPTCHA (Turnstile) with the secret.

## §4 Supabase — Phase 0 · free for staging, Pro $25/mo for production
1. Sign up at supabase.com, create an organisation.
2. Create project **travelog-staging** — region **Mumbai (ap-south-1)**; save the database password in a password manager.
3. Create project **travelog-prod** — same region. Upgrade it to **Pro** before beta (backups, no pausing).
4. For each project: Project Settings → API → copy the Project URL and anon key; Project Settings → General → copy the project ref.
   - EAS variables (per environment): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
   - GitHub secrets: `STAGING_PROJECT_REF`, `PROD_PROJECT_REF`, `STAGING_DB_PASSWORD`, `PROD_DB_PASSWORD`.
5. Account → Access Tokens → Generate token → GitHub secret `SUPABASE_ACCESS_TOKEN`.
6. Authentication → URL configuration: add `travelog://*` and `https://<domain>/*` to redirect URLs.
7. The service-role key stays in Supabase only — never in the app or GitHub.

## §5 Expo / EAS — Phase 0 · free tier to start
1. Create an account at expo.dev.
2. On your computer: `npm i -g eas-cli` → `eas login`.
3. Claude creates the project config; you run `eas init` once when asked (links the project to your account).
4. Account settings → Access tokens → create → GitHub secret `EXPO_TOKEN`.
5. Install the development build on your phone from the link EAS prints (Android: allow install; iOS: register your device with `eas device:create`, needs §6).

## §6 Apple Developer Program — Phase 1 · $99/yr (individual)
1. Enrol at developer.apple.com/programs with your Apple ID (individual; needs 2-factor auth). Approval usually takes 1–2 days.
2. Certificates, Identifiers & Profiles → Identifiers → register App ID `app.travelog.mobile` (Claude confirms the exact id) with capabilities: **Sign in with Apple**, **Push Notifications**, **Associated Domains**.
3. Keys → create an **APNs key** (download the .p8 once) — upload it to EAS with `eas credentials` when Claude asks.
4. App Store Connect → My Apps → New App (name, bundle id, SKU).
5. Supabase → Authentication → Providers → Apple: enable; for native sign-in add the bundle id as a client ID.
6. Users and Access → Integrations → App Store Connect API → create a key (for `eas submit`); store via `eas credentials`.
- Later (company): you can transfer the app to an organisation account; needs a D-U-N-S number.

## §7 Google Play Console — Phase 1 · $25 one-time (personal)
1. Sign up at play.google.com/console as a personal account; complete identity verification (can take a few days).
2. Create app → name, default language, app/free.
3. Testing → Internal testing → create a list with your email.
4. **Plan the closed test now:** personal accounts created after Nov 2023 must run a closed test with **at least 12 testers opted in for 14 consecutive days** before production. Start collecting tester emails (Google accounts) early.
5. Setup → API access → create a service account for `eas submit`; upload its JSON key with `eas credentials`.
6. App signing: let Google manage the app signing key; EAS manages the upload key.

## §8 Google Cloud (sign-in and Places) — Phase 1 · free (Places pay-as-you-go later)
1. console.cloud.google.com → create project `travelog`.
2. APIs & Services → OAuth consent screen → External → app name, support email, domain, privacy policy URL (Claude provides) → publish.
3. Credentials → Create OAuth client ID:
   - **Web application** (used by Supabase to verify tokens) → copy Client ID + secret into Supabase → Authentication → Providers → Google.
   - **Android** → package name + SHA-1 from `eas credentials` (Claude shows the command) — one for the upload key and one for Play's app signing key.
   - **iOS** → bundle id.
   - EAS variables: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
   - In Supabase's Google provider, add all client IDs in "Authorized Client IDs".
4. Phase 4: APIs & Services → enable **Places API (New)** → Credentials → API key restricted to Places API → Supabase function secret `GOOGLE_PLACES_KEY`. Set a budget alert in Billing.

## §9 Resend (email codes) — Phase 1 · free tier
1. Sign up at resend.com → Domains → add your domain → add the DNS records it shows in Cloudflare → verify.
2. API Keys → create.
3. Supabase → Project Settings → Authentication → SMTP: host `smtp.resend.com`, port 465, user `resend`, password = API key, sender `TravelOG <login@yourdomain>`.
4. Supabase → Authentication → Email templates: Claude provides the 6-digit code template.

## §10 Maps and routing — Phase 4
1. **Tiles:** sign up for a vector-tile provider free tier (e.g. MapTiler or Stadia Maps) → create a key restricted to your app ids → EAS variable `EXPO_PUBLIC_MAP_STYLE_URL` (Claude gives the format).
2. **Routing server:** create a small VPS (2–4 GB RAM, Mumbai region) at any provider; Claude provides a setup script for OSRM/Valhalla with the India map extract → Supabase function secret `ROUTING_URL`.
3. **Weather:** Open-Meteo commercial plan → `OPEN_METEO_KEY` (or skip and use precomputed climate data only).

## §11 Anthropic (AI) — Phase 7
1. console.anthropic.com → create an organisation → Billing → add credit and set a **monthly spend limit**.
2. API Keys → create a key for production and one for staging → Supabase function secret `ANTHROPIC_API_KEY` in each project.
3. Turn on usage alerts at 50 % and 80 % of the limit.

## §12 Money-making and sharing — Phases 5–6
1. **Meta for Developers** (Phase 5): create an app → copy the App ID → EAS variable `EXPO_PUBLIC_FACEBOOK_APP_ID` (needed to share to Instagram Stories).
2. **RevenueCat** (Phase 6): sign up → create project → add iOS and Android apps (needs App Store Connect API key and Play service account from §6–§7) → EAS variables `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`; webhook secret → Supabase `REVENUECAT_WEBHOOK_SECRET`.
3. **Store products:** App Store Connect → Subscriptions → "Plus Yearly"; In-App Purchases → "Trip Pass". Play Console → Monetize → same products. Fill tax and banking forms in both consoles (needs PAN and a bank account).
4. **Affiliate networks:** sign up (e.g. vCommission, EarnKaro, Involve Asia, Travelpayouts) with PAN; tracking IDs go into the `/go` Worker config (Claude adds).

## §13 Monitoring — Phase 1 · free tiers
1. **Sentry:** sentry.io → create project (React Native) → DSN → EAS variable `EXPO_PUBLIC_SENTRY_DSN`; auth token for source maps → EAS secret `SENTRY_AUTH_TOKEN`.
2. **PostHog:** posthog.com (choose EU or US cloud) → project API key → EAS variable `EXPO_PUBLIC_POSTHOG_KEY`.

## §14 Later — when you register a company
1. Register a Pvt Ltd or LLP; get PAN, GST (when needed), a current account.
2. **DLT registration** (for phone OTP): register the entity on a DLT portal (e.g. Jio, Airtel, Vodafone Idea), register a sender ID (header) and the OTP message template.
3. Choose an SMS provider supported by Supabase (Textlocal or Twilio Verify), link the DLT entity, add keys in Supabase → Authentication → Providers → Phone.
4. Move store accounts to the organisation (Apple: D-U-N-S number; Google: organisation account — exempt from the 12-tester rule for new apps).

---

## Checklist
| § | Item | Phase | Cost | Done |
|---|---|---|---|---|
| 1 | GitHub branch protection | 0 | Free | ☐ |
| 2 | Domain on Cloudflare | 0 | ~₹1k/yr | ☐ |
| 3 | Cloudflare R2, Pages, API token, Turnstile | 0–1 | Free | ☐ |
| 4 | Supabase staging + prod (Mumbai) | 0 | $0 → $25/mo | ☐ |
| 5 | Expo / EAS | 0 | Free | ☐ |
| 6 | Apple Developer (individual) | 1 | $99/yr | ☐ |
| 7 | Google Play Console (personal) | 1 | $25 once | ☐ |
| 8 | Google Cloud OAuth (+ Places later) | 1, 4 | Free / usage | ☐ |
| 9 | Resend email | 1 | Free | ☐ |
| 10 | Map tiles, routing VPS, weather | 4 | ~$0–25/mo | ☐ |
| 11 | Anthropic API + spend limit | 7 | Usage | ☐ |
| 12 | Meta app, RevenueCat, store products, affiliates | 5–6 | Free / % of revenue | ☐ |
| 13 | Sentry, PostHog | 1 | Free | ☐ |
| 14 | Company, DLT, SMS, org accounts | Later | Varies | ☐ |

Sources for time-sensitive rules: [Supabase Textlocal guide](https://supabase.com/docs/guides/auth/phone-login/textlocal) · [Supabase phone login](https://supabase.com/features/phone-logins) · [DLT sender requirement (Zoho help)](https://help.zoho.com/portal/en/kb/desk/support-channels/help-center/articles/help-center-auth-sms-otp) · [Play 12-tester rule overview](https://extendsclass.com/blog/google-plays-closed-testing-requirement-what-developers-need-to-know-in-2026) (confirm in Play Console Help when you create the account).
