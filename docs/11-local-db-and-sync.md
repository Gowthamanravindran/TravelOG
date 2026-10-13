# 11 · On-Device Database and Sync

The app keeps a copy of the user's trips in an encrypted SQLite database on the phone. Screens read only from it, so the app is instant and works offline. A small sync engine keeps it in step with Supabase.

## 1. Stack
- **expo-sqlite** with SQLCipher enabled (config plugin) — tickets, PNRs and expenses are personal data. The database key is random per install and kept in the Keychain/Keystore.
- **Drizzle ORM** for the schema, typed queries and live queries (`useLiveQuery`) that re-render screens when rows change.
- **drizzle-kit** for device migrations ([12](12-migrations.md)).
- One database file per signed-in user: `travelog-<userId>.db`.

## 2. What's stored on the phone
Only the user's slice: trips they belong to and everything inside them, plus caches.

| Table | Mirrors server table | Notes |
|---|---|---|
| `trips`, `trip_members` | same | |
| `days`, `plan_variants`, `itinerary_items` | same | |
| `polls`, `poll_options`, `votes` | same | |
| `budgets`, `expenses`, `expense_splits`, `settlements` | same | Amounts in minor units |
| `bookings`, `attachments` | same | `attachments.local_path` for downloaded files |
| `places_cache` | subset of `places` | Places referenced by the user's trips + recent Nearby results |
| `profiles_cache` | subset of `profiles` | Names/avatars of co-members |
| `outbox` | — | Queued local changes |
| `sync_state` | — | Cursor and status per scope |
| `file_queue` | — | Pending photo/attachment uploads and downloads |

Feed, Explore and AI previews are **not** synced; they're fetched online and cached briefly.

## 3. Row rules (server and device)
| Column | Purpose |
|---|---|
| `id` | UUID v7 generated on the device, so rows can be created offline and inserts are idempotent |
| `updated_at` | Last change time (server time once synced) |
| `deleted_at` | Soft delete; rows are hidden, not removed, so deletes sync |
| `server_seq` | Bigint from one global Postgres sequence, set by a trigger on every insert/update; the sync cursor |
| `updated_by` | Who changed it (for "Riya edited this") |

Server-side, a nightly job hard-deletes rows soft-deleted more than 90 days ago (after all active devices have synced past them).

## 4. Pull (server → phone)
```
sync_pull(cursor bigint, schema_version int, limit int default 500)
  → { rows: { table: [row, …] }, next_cursor, has_more }
```
- Returns rows from all synced tables with `server_seq > cursor` for trips where the caller is a member (RLS applies).
- Also returns removals: if the user was removed from a trip, the trip id comes back in `revoked_trips` and the device deletes that trip locally.
- The device applies each page in one transaction, then saves `next_cursor`. Repeats while `has_more`.

**When it runs:** app launch, app returns to foreground, a Realtime nudge for an open trip, after a successful push, and pull-to-refresh. Never on a timer.

## 5. Push (phone → server)
Every local write does two things in one transaction: update the local table and add an `outbox` row.

| `outbox` column | Example |
|---|---|
| `id` | UUID |
| `table` | `expenses` |
| `op` | `upsert` or `delete` |
| `row` | JSON of the row |
| `client_ts` | When it happened on the phone |
| `attempts`, `last_error` | Retry state |

```
sync_push(changes jsonb[]) → { applied: [ids], rejected: [{ id, reason }] }
```
- Sent in batches of up to 100, oldest first, whenever online.
- The server applies each change under RLS. Inserting an id that already exists is an update, so retries are safe.
- **Conflicts — last write wins per row**, using server receive order. Two people editing the same itinerary item: the later save wins; the earlier editor sees the new value on next pull, and the item shows "edited by Arjun just now".
- **Tables that can't conflict by design:** each vote, expense and split is its own row created by one person, so concurrent changes simply add up.
- **Rejected changes** (no permission, trip deleted, validation): removed from the outbox, the local row is restored from the server on the next pull, and the user sees a short message.
- After a successful push the device runs a pull to pick up server-side effects (e.g. a locked poll adding an itinerary item).

## 6. Files
- **Uploads:** photos and attachments go into `file_queue`; uploaded via presigned R2 URLs in the background with retry; the database row is created with the R2 key once uploaded.
- **Downloads:** when a trip becomes Upcoming (or the user taps "Make available offline"), its ticket attachments and an offline map pack for its area download on Wi-Fi by default.
- Cleanup per [08](08-app-optimizations.md): files for trips ended more than 30 days ago are removed (re-downloadable).

## 7. Sync states shown to the user
| State | UI |
|---|---|
| All synced | Nothing shown |
| Offline with queued changes | Small cloud icon with a count; "Will sync when you're online" |
| Syncing | Subtle spinner in the header |
| A change was rejected | Toast explaining what happened, with the restored value |

## 8. Schema versions and recovery
- The device's Drizzle schema has a version; `sync_pull` and `sync_push` receive `schema_version`. The server keeps supporting older versions until `min_supported_version` moves past them ([12](12-migrations.md)).
- **If a device migration fails:** export the outbox to a JSON file, delete the database, recreate it, run a full pull, then replay the outbox. The user sees "Refreshing your trips" once.
- **If the user signs out with unsynced changes:** warn and offer to wait for sync; if they insist, the outbox is discarded.

## 9. What gets tested
- Unit tests for the sync engine with a fake server: offline edits, retries, duplicate pushes, rejected writes, removed membership, paging.
- Two-device end-to-end test (Maestro + two emulators): both edit the same trip offline, reconnect, both converge.
- pgTAP tests that `sync_pull` never returns rows from trips the caller isn't in.
