# Evolution Tree Worker Notes

## Scope

- Reworked the Evolution Tree tab into a denser route-matrix command surface.
- Kept gameplay state and rules in `GameStateService`.
- Used the existing Monster Card and Detail components for selection/evolution actions.

## Rationale

The Evolution Tree now follows the reference posters more closely: each stage reads as a colored horizontal band, nodes carry route metadata, and the selected line has stronger target/ready/branch language. The command strip was upgraded from a simple footer into a live advisory console with next command, squad dock, battle log, reward readout, and arena readiness.

This helps the player answer three immediate questions from the first screen:

- Which stage and route am I looking at?
- What is the next unlock or evolution chase?
- Should I evolve, fill squad, or battle for resources?

## Files Touched

- `src/app/components/evolution-tree/evolution-tree.component.html`
- `src/app/components/evolution-tree/evolution-tree.component.ts`
- `src/app/components/evolution-tree/evolution-tree.component.scss`

## Verification Notes

- Build verification is handled by the integration pass.
- Browser smoke should check tree scrolling, card selection, target highlighting, and command strip actions.
