# Plan 51 — Ignore Gradle's cache in the local native module

**Status:** ✅ Built

## Context
The owner saw uncommitted files on their computer under `apps/mobile/modules/social-share/android/.gradle/`: `.lock`, `.bin` and `.properties` files in `9.7.1`, `9.8.1`, `buildOutputCleanup` and `vcs-1` folders. They're Gradle's working cache, from the Android build tool. Gradle writes them when an editor extension, Android Studio or a local build opens our sharing module (Plan 15) as an Android project. They belong to that one machine and must never be committed. The ignore rules covered the generated `/android` and `/ios` folders, but not this module's own `android/` folder.

## Change
`apps/mobile/.gitignore` ignores `modules/**/android/.gradle/`, `modules/**/android/build/` and `modules/**/android/local.properties`.

## Verification
- Created matching cache, build and `local.properties` files in the module: `git status` stayed clean, and `git check-ignore -v` named each rule. Then deleted them.
- Checks pass.
- Owner: after `git pull`, `git status` is clean. The folder can be deleted at any time (`rm -rf apps/mobile/modules/social-share/android/.gradle`); Gradle recreates it when needed.
