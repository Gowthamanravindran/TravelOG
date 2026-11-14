# Plan 54 — "Choose cover" recorded for later

**Status:** 📝 Backlog (docs only)

## Context
Since Plan 53, a trip's cover is chosen automatically:
1. the photo for its exact place;
2. else a photo whose place names match its destination;
3. else its country's photo;
4. else its 3D art.

The owner confirmed this stays the default: a trip is created before its photos exist (Memories fill up during the trip), so it must never look empty. Later, people should be able to change the cover themselves.

## Decision
Add later, as an item in `docs/07`: a trip setting **Cover**.
- **Choices:** *Automatic* (default), *one of the trip's own photos* from Memories, or *3D art only*.
- **Storage:** a nullable `cover_photo_id` on the trip (`null` means automatic), synced like other trip fields.
- **Display:** through the same `RemoteImage` layer (Plan 53), or the local file while the photo is only on the phone.
- **When:** once Memories photos sync between phones (Phase 5).
