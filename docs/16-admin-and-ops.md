# 16 · Admin and Operations

Internal tools for running TravelOG, how long data is kept, and what to do when something breaks.

## 1. Admin web app (`apps/admin`)
- **Hosting:** Cloudflare Pages, protected by **Cloudflare Access** (only listed staff emails can open it), plus Supabase sign-in.
- **Staff roles:** `staff(user_id, role)` with `admin`, `moderator`, `support`. Admin functions check the role server-side.
- **Audit log:** every admin action writes `admin_audit_log(staff_id, action, target, details, created_at)`; admins can read it, nobody can edit it.

| Section | What it does | Roles | Built in phase |
|---|---|---|---|
| **Config** | Edit `app_config` (minimum app version, feature switches); see current values per environment | admin | 1 |
| **Moderation queue** | Reported posts, itineraries and comments with preview and report reasons; actions: hide, remove, warn, suspend; reporter is told the outcome | moderator, admin | 5 |
| **Affiliate report** | Clicks, conversions and commission by partner, destination and day; creator earnings to pay out | admin | 6 |
| **Blueprint review** | Generated blueprints with their automatic checks (opening days, travel times, budget); edit, approve, publish, version history | admin | 7 |
| **AI and costs** | `ai_usage` by route, model and day; AI cost per active user vs target; per-user quota overrides; spend alerts | admin | 7 |
| **Support lookup** | Find a user by email: account status, sign-in methods, number of trips, purchases, last sync and sync errors. **Trip contents are hidden** unless the user shares a one-time support code from the app; every lookup is logged | support, admin | 8 |

## 2. Data retention
| Data | Kept for | Then |
|---|---|---|
| Account, trips, itineraries, expenses | Until the user deletes them or their account | Deleted per [10](10-auth.md) §9 |
| Photos | Until the user deletes them or their account | Removed from R2 |
| Location visits ("time spent") | 12 months after the trip ends | Deleted; trip summary totals kept |
| Soft-deleted rows | 90 days | Purged (after devices have synced) |
| AI request and response text | 30 days (for debugging) | Deleted; token counts and costs kept |
| Server and function logs | 30 days | Deleted |
| Affiliate clicks | 24 months (commission disputes) | Aggregated, user id removed |
| Reports and moderation actions | 24 months | Deleted |
| Admin audit log | 3 years | Deleted |
| Database backups | Per Supabase plan (daily, rolling) | Roll off automatically |

These go into the privacy policy. Scheduled jobs (pg_cron) enforce them; the admin Config page shows the last run.

## 3. Alerts
| Alert | Source | Threshold (start) | Goes to |
|---|---|---|---|
| Crash spike | Sentry | Crash-free sessions < 99 % in 1 hour | Email + phone push |
| Sign-in failures | Supabase logs → Edge Function check | > 5 % of attempts fail in 15 min | Email |
| Sync errors | `sync_push` rejections + client error events | > 2 % of pushes rejected in 1 hour | Email |
| AI spend | Anthropic Console + `ai_usage` | 50 % / 80 % of monthly limit | Email |
| Database and storage usage | Supabase usage | 80 % of plan limits | Email |
| Payment webhooks failing | RevenueCat webhook errors | Any failure for 30 min | Email |
| Website/redirect down | Cloudflare health check | 3 failed checks | Email |

On-call: the owner (you) at first. Claude can investigate from logs when asked.

## 4. Incident steps
1. **Confirm** — check the alert and Sentry/Supabase dashboards; note the start time.
2. **Contain** — turn the affected feature off from the admin Config page (feature switch), or raise `min_supported_version` if a bad app release is the cause.
3. **Communicate** — short in-app banner (via `app_config`) and a post on social if users are affected for more than 30 minutes.
4. **Fix** — hotfix via EAS Update (JavaScript) or a new build; server fixes via a forward migration ([12](12-migrations.md) §7).
5. **Review** — write a short note in `docs/incidents/YYYY-MM-DD.md`: what happened, impact, fix, how to prevent it.

## 5. Routine operations
| Task | How often | Who |
|---|---|---|
| Check dashboards (crashes, funnel, AI cost) | Weekly | Owner |
| Review moderation queue | Daily during pilot | Owner / moderator |
| Approve new blueprints | Monthly, and before each season | Owner |
| Pay creator earnings | Monthly | Owner |
| Dependency and Expo SDK updates | Each new SDK (roughly every 4 months) | Claude, owner approves |
| Backup restore drill on staging | Every 6 months | Claude, owner watches |
