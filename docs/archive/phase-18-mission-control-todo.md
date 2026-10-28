# Phase 18: Mission Control Todo

Goal: improve the whole game loop by making the next useful action visible from every tab while keeping gameplay rules testable and local.

- [x] Create a 20-point improvement todo for the next gameplay pass.
- [x] Keep the work on the existing `codex/` feature branch.
- [x] Re-read the Angular, game design, balance, and gameplay checklist guidance.
- [x] Preserve brand-safe original creature names and local-only data.
- [x] Add a pure Mission Control rules module for cross-tab priority decisions.
- [x] Cover empty-squad blockers with a clear primary action.
- [x] Cover ready evolution pressure with an immediate evolve action.
- [x] Cover near-ready evolution routes with the next blocker and progress percent.
- [x] Cover arena readiness with win chance, team power, reward, XP, and item forecast.
- [x] Cover archive growth with codex completion and route context.
- [x] Cover meta rewards with daily, chapter, forge, expedition, and battle-intel priorities.
- [x] Expose Mission Control cards from `GameStateService` as a computed signal.
- [x] Add a global Mission Control matrix below Quick Commands.
- [x] Make each Mission Control card clickable and route to the correct action.
- [x] Keep components rendering state and delegating game actions to the service.
- [x] Style the matrix as a compact dark sci-fi HUD with stage-safe neon tones.
- [x] Make the matrix responsive for desktop, tablet, and mobile widths.
- [x] Add unit tests for the new Mission Control rule builder.
- [x] Add Playwright smoke coverage for Mission Control visibility and primary action flow.
- [x] Run unit tests, production build, and browser smoke tests before handoff.
