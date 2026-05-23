# Gameplay Implementation Checklist

Use this checklist during Angular implementation.

## Loop Checks

- [ ] Player can identify a useful next action from the first screen.
- [ ] Selecting a monster updates header and detail immediately.
- [ ] Add to Squad updates slots and team power immediately.
- [ ] Start Battle is blocked with a clear message when squad is empty.
- [ ] Battle log has 6-10 varied lines.
- [ ] Win rewards update HUD immediately.
- [ ] Loss rewards still grant progress.
- [ ] XP overflow carries into the next level.
- [ ] Level-up creates a visible log line.
- [ ] Item drop creates a visible reward/log line.
- [ ] Evolution unlock selects the new creature.
- [ ] Missing evolution requirements are readable.
- [ ] Collection filters help find locked and unlocked targets.

## Feel Checks

- [ ] No interaction feels delayed without reason.
- [ ] Buttons and cards have selected/hover/disabled states.
- [ ] Empty states tell the player what to do next.
- [ ] Locked cards are mysterious but informative.
- [ ] The UI feels like a game HUD, not a static dashboard.

## Content Checks

- [ ] All 50 creatures from `docs/creature-roster-50.md` are represented.
- [ ] No protected franchise names appear in app copy or code.
- [ ] Enemy names are original.
- [ ] Item names are original.

## QA Scenarios

1. Start with empty squad, go to Arena, click Start Battle, verify blocker.
2. Add one creature, battle, verify rewards and XP.
3. Add three creatures, battle, verify higher team power and log variety.
4. Select a creature with unmet evolution requirements, verify disabled Evolve reason.
5. Level or resource state allows evolution, click Evolve, verify unlock and selection.
6. Filter Collection to locked Rookie creatures, then reset filters.
