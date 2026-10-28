# Phase 15: Command Loop Upgrade Todo

Goal: make the next useful action clearer from every major play surface while adding faster fallback progression when a route is blocked.

- [x] Define a focused Phase 15 todo with at least 10 concrete implementation points.
- [x] Add pure training-drill rules for selected-monster drills and squad calibration drills.
- [x] Extend XP helpers so drills can target either one monster or the full squad while preserving level-up logs.
- [x] Add `GameStateService` actions for monster drills, squad drills, and battle coach auto-prep + launch support.
- [x] Add service-level route pressure/readiness signals for HUD and evolution planning surfaces.
- [x] Upgrade the header HUD with a live route-status chip so ready evolutions are visible outside the tree.
- [x] Upgrade Monster Detail with a Training Lab panel, drill previews, affordability states, and blocker cues.
- [x] Upgrade Evolution Tree with route pressure metrics per stage and quick drill support from the route advisor.
- [x] Upgrade Arena with a prep console that supports auto-prep, prep-and-launch, and calibration-drill fallback.
- [x] Add visual polish for the new command surfaces so the training and prep systems feel like part of the same neon HUD language.
- [x] Add unit coverage for training rules and XP targeting behavior.
- [x] Add Playwright smoke coverage for drills and the new arena prep flow.
- [x] Run `npm.cmd run test -- --run`.
- [x] Run `npm.cmd run build`.
- [x] Run `npm.cmd run test:e2e`.
- [x] Smoke test desktop and mobile flows for drills, route guidance, and arena prep.
- [x] Merge the finished work back into `develop`, push it, and verify the GitHub Pages deployment.
