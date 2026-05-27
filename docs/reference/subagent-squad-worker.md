# Squad Tab Worker Notes

## Scope

- Updated only the Squad tab component files.
- Added this note for coordination.
- Did not change gameplay rules, services, models, shared data, global styles, or other tabs.

## Rationale

The Squad tab now reads more like a digital team terminal from the provided evolution tree references: three active neon slots, large sprite focus, node-like reserve cards, grid rails, and a right-side diagnostics console.

The player can see the current 3-slot loadout, team power versus the enemy grid, open slots, weakest link, type coverage, missing types, and a next recommended Add/Remove/Unlock/Battle step. All mutations still call existing `GameStateService` methods such as `addToSquad`, `removeFromSquad`, `clearSquad`, and `selectMonster`.

## Verification

- `npm.cmd run build` was attempted.
- The build is currently blocked by a file outside this worker scope: `src/app/components/arena/arena.component.scss` is missing in the shared worktree.
- The prior build attempt also showed style budget failures in other non-squad component styles. The Squad SCSS was reduced after its own budget warning.
