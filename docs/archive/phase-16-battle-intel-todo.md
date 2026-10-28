# Phase 16: Battle Intel And Meta Loop Todo

Goal: make the long-loop tabs feel as actionable as Arena and Evolution Tree by surfacing recent combat intel, better preflight guidance, and clearer equipment/campaign decisions.

- [x] Define a new Phase 16 todo with at least 10 concrete work items.
- [x] Add persisted recent battle records to player progress so the game can summarize actual run history.
- [x] Add pure battle-intel rules that summarize win/loss trend, average payouts, and preferred run patterns from recent records.
- [x] Extend save sanitization and starter-state cloning for the new battle-intel data.
- [x] Record every arena result with mode, risk, formation, power matchup, rewards, and streak outcome.
- [x] Add service-level battle-intel summaries and recent-run views for UI surfaces.
- [x] Upgrade the app shell with a compact Intel Strip so the global HUD shows combat trend, campaign pressure, and expedition readiness.
- [x] Upgrade Arena with a Recent Runs dossier that makes the last few results readable at a glance.
- [x] Upgrade Campaign with an Objective Radar that combines chapter state, boss forecast, and combat trend.
- [x] Upgrade Expedition with a Preflight Scanner that explains when to launch, what is missing, and what kind of reward posture the current squad supports.
- [x] Upgrade Forge with a Loadout Diagnostics block that shows selected-monster delta, squad coverage, and next forge pressure more clearly.
- [x] Add unit coverage for the battle-intel summarization rules.
- [x] Add Playwright coverage for the new intel, campaign radar, and expedition preflight surfaces.
- [x] Run `npm.cmd run test -- --run`.
- [x] Run `npm.cmd run build`.
- [x] Run `npm.cmd run test:e2e`.
- [x] Smoke test desktop and mobile layouts for the new intel surfaces.
- [x] Merge the finished work back into `develop`, push it, and verify the GitHub Pages deployment.
