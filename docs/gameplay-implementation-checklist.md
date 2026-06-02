# Gameplay Implementation Checklist

Use this checklist during Angular implementation.

## Loop Checks

- [x] Player can identify a useful next action from the first screen.
- [x] Selecting a monster updates header and detail immediately.
- [x] Add to Squad updates slots and team power immediately.
- [x] Start Battle is blocked with a clear message when squad is empty.
- [x] Battle log has 6-10 varied lines.
- [x] Win rewards update HUD immediately.
- [x] Loss rewards still grant progress.
- [x] XP overflow carries into the next level.
- [x] Level-up creates a visible log line.
- [x] Item drop creates a visible reward/log line.
- [x] Evolution unlock selects the new creature.
- [x] Missing evolution requirements are readable.
- [x] Collection filters help find locked and unlocked targets.

## Feel Checks

- [x] No interaction feels delayed without reason.
- [x] Buttons and cards have selected/hover/disabled states.
- [x] Empty states tell the player what to do next.
- [x] Locked cards are mysterious but informative.
- [x] The UI feels like a game HUD, not a static dashboard.

## Content Checks

- [x] All 50 creatures from `docs/creature-roster-50.md` are represented.
- [x] No protected franchise names appear in app copy or code.
- [x] Enemy names are original.
- [x] Item names are original.

## QA Scenarios

1. Start with empty squad, go to Arena, click Start Battle, verify blocker.
2. Add one creature, battle, verify rewards and XP.
3. Add three creatures, battle, verify higher team power and log variety.
4. Select a creature with unmet evolution requirements, verify disabled Evolve reason.
5. Level or resource state allows evolution, click Evolve, verify unlock and selection.
6. Filter Collection to locked Rookie creatures, then reset filters.

## Verification Note

2026-05-23:

- `npm.cmd run build` passed.
- Browser smoke test passed on desktop and 390x844 mobile viewport with no console errors.
- Verified tab switching, rendered sprite assets, squad remove/add, empty squad Arena blocker, battle rewards/logs, Aquabun -> Splashfang evolution, Collection stage filter/reset, and Handbook visibility.
- Stochastic item drops and loss rewards are implemented in `GameStateService` and covered by the reward/log code path; they remain chance-dependent in manual play.

2026-05-27:

- `npm.cmd run build` passed; `npm.cmd run test -- --run` passed (34 tests / 6 files).
- Phase 4 (Battle Depth) shipped: battle categories Training/Standard/Risk, pre-battle outlook badge, win streak with milestone callouts (3/5/10/25), loss-hint generator surfaced in Arena and Evolution Tree.
- Phase 5 first batch shipped: roster expanded to 65 (Spectral Dark line M051–M056, Empyreal Light line M057–M062, Special caps M063–M065).
- Phase 6 (Squad Depth) shipped: slot-role labels (Vanguard/Sync Core/Anchor) with tooltips, synergy detail + activation text, up to three named squad presets.
- Phase 7 (Collection planning) shipped: chase pinning with HUD chip, filter presets (Ready Soon, Item-Gated, Special Route, Reachable), name/ID search, stage-completion bonus (+200 coins, +10 DNA).
- Phase 8 (initial polish): optional `AudioService` toggle (Handbook), reward cues for win/loss/evolve/item/level-up, scrollbar restyled to match the HUD blueprint, monster-card hover-jump and name-clipping fixed.
- Save format migrated through v1→v5 with in-place upgrades preserving existing progress.

2026-06-02:

- `npm.cmd run test -- --run` passed (64 tests / 11 files).
- `npm.cmd run build` passed with existing budget warnings only: initial bundle 502.56 kB vs 500 kB warning, Arena SCSS 19.69 kB vs 14 kB warning.
- `npm.cmd run test:e2e` passed (7 Playwright smoke tests).
- Phase 10 improvements shipped: global Next Command guidance in shell/HUD, Arena Tactic Coach, direct Collection `Evolve Now` for ready chase targets, full-squad reserve swapping when a stronger candidate is available, ASCII cleanup for touched runtime UI strings, and smoke coverage for the new flows.
