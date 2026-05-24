# Arena Worker Notes

## Scope

- Reworked the Arena tab into a battle-control terminal.
- Kept battle rules, rewards, XP, item drops, and logs in `GameStateService`.
- Did not change the Three.js effect service or shared data.

## Rationale

The Arena now reads more like an active digital combat screen instead of a generic two-column dashboard. Allied and enemy formations use larger combatant frames, the VS core exposes team power and enemy pressure, and the reward panel prioritizes the latest result and battle log.

The screen now makes these decisions clearer:

- Is the squad ready to battle?
- Is the current power delta favorable or risky?
- What reward packet did the last run produce?
- What happened most recently in the log?

## Files Touched

- `src/app/components/arena/arena.component.html`
- `src/app/components/arena/arena.component.ts`
- `src/app/components/arena/arena.component.scss`

## Verification Notes

- Build verification is handled by the integration pass.
- Browser smoke should check empty squad blocking, combatant sprite visibility, battle reward updates, and log ordering.
