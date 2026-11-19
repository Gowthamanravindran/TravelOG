# Plan 86 — Put the stops in a new order by dragging

**Status:** ✅ Built, not yet seen on a phone · The owner's call

## Change
- **Pick your stops** shows the picked cities as a numbered list, one row each (name, region and country, a remove button), instead of wrapping chips: rows can be dragged into place, wrapping chips cannot sensibly.
- **Pick your stops** and **Split your days** both have a handle at the end of each row. Drag it up or down: the other rows slide out of the way, a light haptic marks each new place, and letting go puts the stop there. The handle is its own target, so the drag does not scroll the list or move the drawer.
- A stop keeps its days when it moves. The globe's numbers and route follow the new order.
- **Screen readers:** each row reads as "Stop 2, Kyoto" with Move up and Move down; the remove button and the day buttons stay separate items.
- The rows are a fixed 64 points tall, so a drag of one row's height is one place.

## Checks
`trip-draft-state.test.ts` (the `moveCity` action: order, days kept, out of range), `reorder-stops.test.tsx` (on both steps: a numbered list with handles; dragging down two rows, up one, a short drag, past the end; Move up and Move down; remove still works; days go with the stop).
