# Plan 11 — Make the build link easy to find ✅

**Status:** Built in the same commit as this file. First build (from Plan 10): https://expo.dev/accounts/travelogapp/projects/travelog/builds/cfbeb2b6-75cf-4f93-9b5a-55d4a68cf429

### Context
The owner added `EXPO_TOKEN` and ran "EAS build (Android development)". The GitHub job finished in under a minute because it only *starts* the build on Expo's servers (`--no-wait`); the APK link lives on expo.dev, buried in the job log (`See logs: https://expo.dev/accounts/travelogapp/projects/travelog/builds/cfbeb2b6-…`). The log also confirmed the setup works: owner `travelogapp` accepted, Android keystore created by EAS, upload succeeded. The owner couldn't find the link.

### Changes
| File | Change |
|---|---|
| `.github/workflows/eas-build.yml` | Run `eas build … --json --no-wait`, parse the build id, and write a **job summary** (shown at the top of the run page) with: the build page link `https://expo.dev/accounts/travelogapp/projects/travelog/builds/<id>`, "takes ~10–20 min; open this on your Android phone and tap Install when it says Finished", and the expo.dev project builds list link. Also print it as a `::notice::` so it shows in the run's annotations. |
| `.github/workflows/*.yml` | Bump `actions/checkout`, `actions/setup-node` to their Node 24 majors (v5/v5) — the run warned Node 20 actions are deprecated. Keep `pnpm/action-setup@v4`, `expo/expo-github-action@v8` unless a newer major exists. |
| `docs/14-owner-setup.md` §5 step 5–6 | Say where the link appears (run summary; expo.dev → TravelOGApp → travelog → Builds; Expo Go app is **not** used for development builds) |
| `docs/plans/11-build-link.md`, `docs/plans/README.md` | Plan log |

### Verification
- Format/lint/typecheck/test unchanged and green.
- Trigger the workflow once via `gh workflow run`; confirm the run page shows the summary with a working build link, and that the build appears on expo.dev (the owner checks on their phone; this environment can't reach expo.dev's API).
