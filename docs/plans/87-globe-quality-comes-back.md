# Plan 87 — The globe's satellite look comes back after a drop

**Status:** ✅ Built, not yet seen on a phone · Found by the owner

## What was wrong
To stay smooth, the globe measures its own frame rate while it moves and, if it is slow, switches to its plain look (blue sea, green land, no satellite imagery). Two readings under 28 frames a second were enough, the first 1.5 seconds after ready were the only ones ignored, and there was no way back: once dropped it stayed plain until the app restarted. The busiest moments are right at the start (the star flight, the globe flying in, the drawer, and a development build is slower still), so it dropped often and for good.

## Change
- Readings in the first 4 seconds after ready are ignored, while the globe flies in.
- It takes three slow readings in a row to drop.
- After a drop, once the globe has been still for 20 seconds, it tries the satellite look again. If that drops again within a minute, the wait doubles (40 s, 80 s, at most 160 s); a minute of smooth running resets it to 20 s.
- The rule is one small piece of the page (`qualityPolicyScript`), tested on its own.

## Checks
`packages/globe/src/quality.test.ts` (three in a row, the settling time, coming back when still, not coming back by readings alone, the doubling and its limit, the reset). `scripts/globe/page-check.py` `quality_returns`: in the real page, a globe put in the state of an old drop goes back to the satellite look by itself.
