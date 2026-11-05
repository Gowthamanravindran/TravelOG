# TravelOG note on this skill

Copied unchanged from `vercel-labs/agent-skills` (`skills/react-native-skills`, commit `1a2c79d`, MIT) in Plan 28. Reviewed before adding: plain Markdown/JSON, no scripts, no hidden text.

This project runs in **Expo Go** (CLAUDE.md), so these rules are exceptions here; don't follow them:
- `navigation-native-navigators`: native tabs and `react-native-bottom-tabs` aren't in Expo Go. Keep the JS tab bar (`ui/tab-bar.tsx`).
- `ui-menus` (zeego) and `ui-image-gallery` (galeria) need native modules that Expo Go lacks.
- `fonts-config-plugin` needs a rebuild. Fonts load with `useFonts` (`lib/fonts.ts`).
- `animation-gesture-detector-press`: presses stay on `Pressable` with Reanimated shared values. Plan 23 moved gestures off gesture-handler hooks for Expo Go reliability.

Everything else applies, in particular:
- animate only `transform` and `opacity`;
- `.get()` / `.set()` on shared values (React Compiler is on);
- `useDerivedValue` for derived values;
- `Pressable` over `Touchable*`.
