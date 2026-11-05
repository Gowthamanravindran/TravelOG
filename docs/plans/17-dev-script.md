# Plan 17 — Keep the computer's packages in step automatically ✅

**Status:** Built in the same commit as this file.

### Context
After pulling Plans 15/16 the dev server failed with `Unable to resolve "expo-linear-gradient"`. The package was declared and locked; the computer's `node_modules` were from before it was added, because `pnpm install` wasn't re-run after `git pull`.

### Change
- Root script `pnpm dev`: `pnpm install --frozen-lockfile --prefer-offline` (about 1 s when nothing changed) then the mobile dev server with `--dev-client`.
- `CLAUDE.md` and `docs/14-owner-setup.md` §5 step 7 use `pnpm dev`, and note that new phone features need a new development build (Profile → This app build).
