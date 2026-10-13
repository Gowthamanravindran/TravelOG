# 12 · Migrations

How database changes are made, tested and released — on the server (Supabase Postgres) and on the phone (SQLite). Claude writes the migrations; the commands below are what runs locally and in CI. Production changes only go out through GitHub Actions.

## 1. Environments
| Environment | Where | Who changes it |
|---|---|---|
| Local | Docker on the developer's machine (`supabase start`) | Anyone, freely; reset any time |
| Staging | Supabase project `travelog-staging` (Mumbai) | GitHub Actions on merge to `main` |
| Production | Supabase project `travelog-prod` (Mumbai) | GitHub Actions on a release tag, after staging passes |

## 2. One-time setup (local machine)
Requires Docker Desktop, Node.js LTS and pnpm.
```bash
pnpm install                       # installs the Supabase CLI as a dev dependency
pnpm supabase login                # opens browser, creates an access token
pnpm supabase start                # starts local Postgres, Auth, Studio, etc.
pnpm supabase db reset             # applies all migrations + seed data locally
```
Local Studio (database UI) runs at the URL printed by `supabase start` (usually http://localhost:54323).

## 3. Server migrations — everyday workflow
```bash
# 1. Create a new, empty migration file (timestamped)
pnpm supabase migration new add_trip_cover_color

# 2. Write SQL in supabase/migrations/<timestamp>_add_trip_cover_color.sql
#    (tables, columns, RLS policies, functions, indexes)

# 3. Apply everything from scratch locally, including seed.sql
pnpm supabase db reset

# 4. Run permission and function tests
pnpm supabase test db

# 5. Regenerate TypeScript types used by the app and functions
pnpm supabase gen types typescript --local > packages/core/src/db.types.ts

# 6. Commit migration + types + tests; open a pull request
```
Alternative for step 2: make changes in local Studio, then capture them with `pnpm supabase db diff -f <name>`, and review the generated SQL before committing.

### CI on every pull request
1. Start a fresh local stack in CI, `supabase db reset`, `supabase test db`.
2. Check that generated types match the committed file.
3. Lint SQL for missing RLS (`alter table … enable row level security` on every new table).

### Releasing to staging and production
```bash
# Run by GitHub Actions — shown for reference
supabase link --project-ref $STAGING_PROJECT_REF
supabase db push            # applies only migrations not yet applied
```
- Merge to `main` → staging.
- Tag `v1.2.0` → production (same command with the production ref), only if the staging job passed.
- Secrets used: `SUPABASE_ACCESS_TOKEN`, `STAGING_PROJECT_REF`, `PROD_PROJECT_REF`, `STAGING_DB_PASSWORD`, `PROD_DB_PASSWORD` (set once by the owner — see [14](14-owner-setup.md)).

## 4. Device migrations (SQLite + Drizzle)
```bash
# 1. Edit apps/mobile/src/db/schema.ts (Drizzle tables)

# 2. Generate a migration (drizzle.config.ts uses driver: "expo")
pnpm --filter mobile drizzle-kit generate

# 3. This writes apps/mobile/drizzle/<n>_<name>.sql and updates migrations.js
#    (Metro is configured to bundle .sql files)

# 4. Run unit tests that open a fresh DB and an old-version DB and migrate both
pnpm --filter mobile test db
```
At app start, `useMigrations(db, migrations)` runs pending migrations before the first screen renders. If it fails, the recovery path in [11](11-local-db-and-sync.md) §8 runs.

## 5. Rules
1. **Never edit a migration that has been merged.** Fix forward with a new migration.
2. **Every new server table** gets RLS enabled, policies, indexes for its policies, and a pgTAP test in the same pull request.
3. **Breaking changes use expand → migrate → contract:**
   - *Expand:* add the new column/table; keep the old one; write to both.
   - *Migrate:* backfill data; ship an app version that reads the new one.
   - *Contract:* once `app_config.min_supported_version` is at or above that app version, remove the old column in a later migration.
4. **Renames** are done as add + copy + drop (never a direct rename while older apps are in use).
5. **Sync-affecting changes** bump `schema_version`; `sync_pull`/`sync_push` keep handling the previous version until the minimum app version moves past it.
6. **Large backfills** run as batched jobs, not inside the migration.
7. **Device migrations are additive where possible**; destructive device changes are acceptable because the server is the source of truth (worst case: wipe and re-pull).

## 6. Forcing app updates
`app_config` table (read on launch and on foreground):
| Key | Example | Effect |
|---|---|---|
| `min_supported_version` | `1.4.0` | Older apps show a blocking "Please update" screen |
| `recommended_version` | `1.6.0` | Older apps show a dismissible banner |
| `features` | `{ "ai_plan": true }` | Remote on/off switches (also via PostHog flags) |

## 7. Runbooks
**Roll back a bad server migration:** write a new migration that reverses it, test locally, merge, release. Don't delete applied migration files.

**Restore data:** Supabase Pro keeps daily backups. In the dashboard: Database → Backups → choose a point → restore to a *new* project first, verify, then switch or copy data. Practise once on staging before launch.

**Hotfix in production:** branch from the release tag, add the migration, tag `v1.2.1`; the workflow applies it to staging then production.

**Check what's applied:** `supabase migration list --linked` shows local vs remote migrations.
