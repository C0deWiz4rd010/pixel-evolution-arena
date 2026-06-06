# Phase 12 Scrollbar And Quick Ops Todo

Date: 2026-06-06

This pass focused on removing duplicate right-side scrolling, making the next useful action faster from every tab, and locking those improvements into smoke coverage.

## Completed Todo

- [x] Protect existing local onboarding changes and `.claude/` output from this pass.
- [x] Reproduce the duplicate far-right scrollbar with a rendered Collection screen.
- [x] Identify `.dex-side` as the nested vertical scroll container fighting the document scrollbar.
- [x] Convert the Collection right rail to visible overflow so the document is the only vertical page scroller.
- [x] Apply the same single-scroll treatment to global monster detail panels.
- [x] Add a global Quick Ops command row below the mission strip.
- [x] Add one-click Auto Squad access from every tab.
- [x] Add one-click Run Battle access with squad and animation guards.
- [x] Add one-click ready evolution access through `GameStateService.evolveReadyCandidate()`.
- [x] Style Quick Ops with compact sci-fi HUD panels, stable dimensions, and clipped labels.
- [x] Preserve disabled state clarity for blocked battle/evolution commands.
- [x] Add Playwright smoke coverage for Quick Ops interactions.
- [x] Add Playwright smoke coverage for the single-scroll Collection/detail-panel behavior.
- [x] Update the gameplay implementation checklist with Phase 12 verification notes.
