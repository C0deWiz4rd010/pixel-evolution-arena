# Agent And Skill Roster

This file records the agents, skills, and instructions selected before implementation.

## Primary Agent

- Role: Codex implementation lead
- Responsibilities: gameplay-first product direction, repo setup, Angular implementation, asset organization, documentation, Git workflow, verification, and final integration.
- Current operating rule: do not implement a feature unless it supports the core loop documented in `docs/game-design.md`.

## Subagents Used

### Architecture Explorer

- Nickname: Wegener
- Purpose: recommend Angular/game architecture, scaffolding risks, scripts, and repo documentation.
- Full reference: `docs/reference/subagent-architecture-explorer.md`
- Key advice adopted:
  - Angular should own shell, HUD, tabs, and menus.
  - Game rules should stay in TypeScript services/helpers instead of templates.
  - Catalog data, battle logic, evolution rules, and state actions should be separated.
  - Add Markdown docs for architecture, game design, data model, assets, testing, and scaffolding.

### UI And Asset Explorer

- Nickname: James
- Purpose: analyze the reference image and define visual/asset guidance.
- Full reference: `docs/reference/subagent-ui-asset-explorer.md`
- Key advice adopted:
  - Use dark blueprint/circuit backgrounds with stage-colored neon rows.
  - Keep pixel-art crisp and avoid blur.
  - Rename concept images into descriptive names.
  - Separate reference assets from generated concepts.
  - Verify desktop and mobile readability.

## Skills Used

### imagegen

- Used to generate project-bound UI concept images.
- Outputs copied into `docs/concept-images/generated/`.
- The concept direction was revised to feel more digital, more collectible-monster-like, and less generic.

### build-web-apps:frontend-app-builder

- Used for frontend product direction and visual implementation expectations.
- Relevant rules:
  - Build the actual usable app as the first screen.
  - Use a complete app surface, not a marketing landing page.
  - Verify rendered desktop and mobile UI.

### build-web-apps:frontend-testing-debugging

- Used for local browser verification guidance.
- Required checks:
  - Page identity
  - Nonblank render
  - No framework overlay
  - Console health
  - Interaction proof
  - Screenshot evidence

### game-studio:game-studio

- Used to frame the work as a browsergame prototype.
- The app is DOM-heavy rather than canvas-heavy because the requested core is HUD, evolution tree, squad, filters, and simulated auto-battles.

### game-studio:web-game-foundations

- Used for architecture boundaries.
- Rules adopted:
  - Simulation state is source of truth.
  - UI renders state and dispatches actions.
  - Assets use stable names and domains.

### game-studio:game-ui-frontend

- Used for HUD and responsive game UI direction.
- Rules adopted:
  - The interface should feel like a game, not a SaaS dashboard.
  - Use CSS variables for the theme.
  - Keep dense UI readable and responsive.

### browser:browser

- Used for final in-app browser validation when the dev server is running.

### Repository-local Modern Angular 21 Skill

- File: `docs/angular-modern-skill.md`
- Purpose: keep future Angular work aligned with standalone components, signals, `computed`, `inject()`, and new template control flow.

## Gameplay Loop Focus

The active implementation bias is now gameplay-first:

- Every tab should support the core loop instead of feeling like a static showcase.
- Battles should be quick, legible, and rewarding, with logs that feel like play-by-play.
- Squad choices should matter through power, stage, type, and readiness feedback.
- Evolution should feel like a concrete goal with visible requirements and payoff.
- Collection filtering should support "what should I unlock next?" rather than only browsing.
- The UI should feel fluid and responsive with immediate state feedback.
- Balance should make the first few minutes generous: visible XP, at least one early evolution path, and item drops as memorable surprises.
- Visual polish should reinforce decisions and rewards, not hide the play loop.

## Implementation Instructions Snapshot

- Framework: Angular.
- State: Angular service with signals or RxJS-style reactive state.
- Data: local mock data only.
- Visuals: original names, no protected terms, CSS/emoji/SVG pixel-art simulation.
- Interactions: tabs, selection, squad management, evolution, auto-battle, XP/level rewards, inventory items, collection filters.
