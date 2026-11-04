# Plan 14 — Test the app without a computer ✅

**Status:** Built in the same commit as this file. Docs only.

### Context
The owner asked whether `pnpm --filter @travelog/mobile start --dev-client` has to be run inside the repo. Yes: a **development** build has no app code inside and loads it from a dev server running in a clone of the repo on a computer (Node 22, pnpm 10, same Wi-Fi). For trying the app that's unnecessary: the **preview** profile (`apps/mobile/eas.json`, already selectable in the "EAS build" workflow) packs the app code into the APK, so it runs on the phone alone, offline.

### Changes
| File | Change |
|---|---|
| `docs/14-owner-setup.md` §5 steps 5 and 7 | Run the workflow with profile `preview` to test; development build + dev server (clone, checkout, install, start) only for live editing; each change needs a new preview build until EAS Update exists |
| `docs/17-owner-checklist.md` | Same note on the install step |
| `docs/plans/14-preview-builds.md`, `docs/plans/README.md` | Plan log |
