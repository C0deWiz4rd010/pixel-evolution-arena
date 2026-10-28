# Phase 14 Operations Deck Todo

Date: 2026-06-06

This pass tightens the meta loop between battles: instead of leaving Forge, Campaign, Expedition, and evolution planning as isolated tabs, the player now gets a shared operations layer with actionable guidance and quick execution paths.

## Completed Todo

- [x] Sync `develop` forward to the current `main` state before starting new gameplay work.
- [x] Create a fresh `codex/` working branch from the unified state.
- [x] Add a Phase 14 todo with more than ten concrete implementation points.
- [x] Extract pure operations rules for squad auto-equip planning and forge quick recommendations.
- [x] Add unit coverage for the new operations rules.
- [x] Extend `GameStateService` with squad loadout planning, forge quick recommendation, and operations deck card state.
- [x] Add a one-click squad gear auto-equip action.
- [x] Add a forge quick action that can auto-equip, forge, or upgrade from the current recommendation.
- [x] Add a campaign quick-claim wrapper for the next ready chapter.
- [x] Build a new global Operations Deck in the shell with evolution, forge, campaign, and expedition cards.
- [x] Style the Operations Deck so it reads as a live command surface instead of a generic dashboard row.
- [x] Add a Forge Command strip with coverage, projected power, and quick actions.
- [x] Add a Campaign Command strip so chapter state and rewards read clearly before the card grid.
- [x] Add an Expedition Relay strip with launch/resume/bank cues.
- [x] Extend Playwright smoke coverage for the new operations shell and quick actions.
- [x] Run unit tests, production build, E2E smoke tests, and verify branch/release flow.
- [x] Merge the finished work into `develop`, push it, and verify the GitHub Pages release.
