# Technical Decisions

## Angular Version

The prototype targets Angular 21.

Current package decision:

- `@angular/core`: `21.2.14`
- `@angular/common`: `21.2.14`
- `@angular/compiler`: `21.2.14`
- `@angular/forms`: `21.2.14`
- `@angular/platform-browser`: `21.2.14`
- `@angular/router`: `21.2.14`
- `@angular/compiler-cli`: `21.2.14`
- `@angular/cli`: `21.2.12`
- `@angular/build`: `21.2.12`

These versions were checked against npm before implementation.

## Three.js Decision

Three.js is included in the current prototype, but only as a view-only feedback layer.

Current rule:

- Core gameplay remains DOM-first: evolution tree, squad selection, collection filtering, HUD state, and battle logs stay in Angular components and services.
- The Three.js layer is optional presentation only. It reacts to battle, selection, and tab cues and must never become the source of truth for rules, rewards, XP, or unlocks.
- The app must stay fully playable if the effects layer is reduced, disabled, or replaced with simpler CSS feedback.

Why this is the current fit:

- The requested prototype is still UI-first and progression-first.
- Lightweight WebGL feedback improves battle and menu feel without forcing gameplay into a renderer-driven architecture.
- The existing implementation keeps simulation in Angular state and uses Three.js only for transient visual cues.

When a larger Three.js role would make sense:

- A real 3D arena preview where squads stand on a rotating cyber platform.
- Creature inspection with a 3D hologram model.
- Battle effects that need depth, camera motion, or particle fields tied to a more explicit combat timeline.

Rule for later:

- Expand Three.js only when the 3D surface becomes an actual gameplay or inspection feature.
- Do not move battle logic, progression state, or menu-heavy UI into the renderer just because a visual layer already exists.
