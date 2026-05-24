# Collection Worker Notes

## Scope

- Updated only the Collection tab component files.
- Kept gameplay rules and state mutations in `GameStateService`.
- Used existing local monster data, stage/type lists, requirements, sprites, and selection actions.

## Rationale

- Reworked the tab into a digital Dex/archive surface closer to the references: dense scan rows, neon stage bands, compact matrix counts, and larger pixel-sprite cards.
- Added a Stage / Type Matrix with `unlocked / total` cells so players can quickly find missing lanes.
- Added a Next Chase panel derived from existing evolution targets and requirement statuses, giving the player a clear next unlock target without changing balance or rules.
- Replaced the generic summary sidebar with selected-record, chase, matrix, and type coverage readouts to answer what to inspect next from the Collection tab.

## Verification

- `npx.cmd tsc -p tsconfig.app.json --noEmit` passed.
- `npm.cmd run build` is currently blocked by missing `src/app/components/arena/arena.component.scss`, outside the Collection worker scope.
- Local render smoke could not be completed until that build blocker is resolved.
