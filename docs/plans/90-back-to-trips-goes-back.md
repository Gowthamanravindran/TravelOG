# Plan 90 — Back to Trips goes back, instead of opening another Trips screen

**Status:** ✅ Built, not yet seen on a phone · Found by the owner: slow after deleting a trip, and the globe redrawing after every trip

## What was wrong
Since Expo Router v4, `router.navigate` to a route further back in the history pushes a new screen; going back to the one already there is `router.dismissTo`. A trip's header ("Back to trips" / "Exit trip mode") and deleting a trip both used `navigate('/')`. So each time, a whole new Trips screen, with a new globe started from nothing, opened on top of the old one, and the old ones stayed alive underneath. The more trips were opened, the more globes were running.

## Change
Both now use `router.dismissTo('/')`, which closes the screens above until the Trips screen already there (and opens one only if there is none, as from a link). Switching tabs inside the home screen still uses `navigate`, which only changes tab.

## Checks
`back-to-trips.test.tsx`: the header's back button in Plan and Trip mode, and Delete for good, call `dismissTo('/')` and neither `navigate` nor `push`. All three failed before the change.
