# Plan 84 — No streaks from the middle

**Status:** ✅ Built, not yet seen on a phone · The owner's call · Follows Plan 83

## Change
Streaks from the very middle of the star flight looked wrong; stars streaking out at the sides are right. Now:
- a star streaks only if it is well off the line of flight (at least 0.75 of the field's half-width, about four in five stars); the rest stay points;
- a layer's streaks fade in only once it has spread out from the middle (zoom 0.55 to 0.8).

So the middle shows only points, and streaks run around the sides. Checked over two seconds of flight: no streak is ever drawn within a fifth of the screen's shorter side from the middle (`star-warp.test.tsx`), and frames drawn in desktop Chrome were looked at.
