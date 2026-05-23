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

Three.js is not added to the MVP dependency set yet.

Reason:

- The requested first prototype is UI-first: evolution tree, squad selection, collection filtering, and auto-battle logs.
- A full Three.js scene would increase implementation and QA scope without improving the core loop enough for the first playable version.
- CSS gradients, scanlines, glows, hover states, and lightweight keyframe effects can make the UI feel digital while keeping interactions instant.

When Three.js would make sense:

- A real 3D arena preview where squads stand on a rotating cyber platform.
- Creature inspection with a 3D hologram model.
- Battle effects that need depth, camera motion, or particle fields.

Rule for later:

- Add Three.js only when the 3D scene is an actual gameplay or inspection surface, not decoration behind text-heavy UI.
