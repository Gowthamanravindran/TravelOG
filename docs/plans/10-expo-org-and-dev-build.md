# Plan 10 — Expo organisation, EXPO_TOKEN, Android dev build ✅

**Status:** Built in the same commit as this file. The repo has a single branch, which is its default, so the manual workflow's "Run workflow" button is available.

### Context
Phase 0 is built and CI is green (`6772410`). The owner created the Expo organisation **TravelOGApp** with a project whose slug is **travelog** (project id already linked). They asked where to get `EXPO_TOKEN` and for every detail needed as steps. This plan (a) sets the project owner in the app config, (b) gives the token steps, and (c) adds a manual GitHub Actions workflow that builds an installable **Android development build** with EAS, so the owner can install the app on their phone without setting up a computer. It stays dormant until `EXPO_TOKEN` exists.

### Owner steps (no code — you do these)
**1. Confirm the organisation's account name (1 min)**
- Go to https://expo.dev, sign in, switch to the **TravelOGApp** organisation (account switcher, top left).
- Look at the browser address: `https://expo.dev/accounts/<name>/…`. `<name>` is the exact account name the config needs. I'll use **`travelogapp`** (Expo account names are lowercase); if the address shows something else, tell me.
- Open Projects → **travelog** and check the project ID matches `c1fca343-1181-4e23-a750-137c4ca9447d`.

**2. Create the token — use a "robot" user, not your personal token (2 min)**
A robot user belongs to the organisation and only has the role you give it, so CI never uses your personal login.
- In the TravelOGApp organisation: **Settings → Access tokens** (or **Members → Robot users**, depending on the current dashboard layout).
- **Add robot** → name it `github-actions` → role **Developer** → create.
- On the robot, **Create token** → name `github-actions` → copy the token. It is shown **only once**.
- (Fallback if robots aren't offered on your plan: your personal **Account settings → Access tokens → Create token**.)

**3. Store it in GitHub — never paste it in chat (2 min)**
- Open https://github.com/Gowthamanravindran/TravelOG → **Settings → Secrets and variables → Actions → New repository secret**.
- Name: `EXPO_TOKEN` (exactly). Secret: paste the token. **Add secret**.
- Tell me "EXPO_TOKEN added". I can't see its value, only that it exists.

**4. Run the first Android development build (after I push this plan's workflow)**
- GitHub repo → **Actions → "EAS build (Android development)" → Run workflow** (branch `claude/kind-allen-2woote`).
- It takes ~10–20 min on Expo's servers. The run log and expo.dev → Projects → travelog → Builds show a link/QR.
- On your Android phone: open the link, download the `.apk`, allow "install unknown apps" for your browser, install.
- Then on your computer: `pnpm install` and `pnpm --filter @travelog/mobile start --dev-client`, and open the installed TravelOG app (it finds the dev server on the same Wi-Fi), or I'll set up EAS Update channels later so it loads without your computer.
- iPhone builds need the Apple Developer account (checklist §6) — Phase 1.

### Code changes
| File | Change |
|---|---|
| `apps/mobile/app.config.ts` | Add `owner: 'travelogapp'` (from step 1); slug `travelog` already matches |
| `.github/workflows/eas-build.yml` (new) | `workflow_dispatch` only; skips with a notice if `EXPO_TOKEN` is missing; checkout → pnpm install → `expo/expo-github-action` with `eas-version: latest` and `token: ${{ secrets.EXPO_TOKEN }}` → `eas build --platform android --profile development --non-interactive --no-wait` from `apps/mobile`. EAS creates and stores the Android keystore on the first build. |
| `apps/mobile/package.json` | Add `expo-dev-client` (via `EXPO_OFFLINE=1 npx expo install`) — required for `developmentClient: true` builds |
| `docs/17-owner-checklist.md` | Tick org name; replace the §5 token line with the steps above |
| `docs/14-owner-setup.md` §5 | Robot-user token steps |
| `docs/plans/10-expo-org-and-dev-build.md`, `docs/plans/README.md` | Plan log |

### Verification
- `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`; `expo export` still within the bundle budget after adding `expo-dev-client`.
- Workflow YAML validated by pushing; with no secret yet the job must end green with the "not set" notice (trigger once via `gh workflow run` to confirm).
- After the owner adds `EXPO_TOKEN`: run the workflow, read the log, confirm the build is queued on EAS; fix anything (e.g. owner mismatch) and report the build link.
