# Three.js Animation Layer Plan

## Goal

Add a view-only Three.js layer that improves gameplay feedback without owning game rules. The layer listens to Angular signals exposed by the existing app state and renders transient effects behind the DOM HUD.

## Implemented Scope

- `app-arena-effects` is mounted once in the app shell and receives the active tab.
- `ArenaEffectsService` maps UI/game moments into render cues. It does not mutate `GameStateService`.
- The renderer uses generated geometry only: grid lines, additive planes, a hit ring, and particle points.
- Effects are intentionally short:
  - battle result: attack beam, hit ring, particles
  - empty-squad blocker: red warning pulse
  - tab change: activation glow near the menu lane
  - selected monster or squad power change: stage-colored digital particles
- `prefers-reduced-motion` disables the continuous loop and replaces moving cues with a short static pulse.

## Lifecycle Rules

- Initialize after the Angular view renders.
- Run the animation loop outside Angular.
- Use an orthographic camera sized to the viewport.
- Dispose geometries, materials, renderer, timers, listeners, and animation frames on destroy.
- Handle WebGL context loss by stopping the loop, then render and resume on restore.

## Integration Boundary

The component is an adapter between Angular state and Three.js presentation. Game rules, XP, rewards, evolutions, squad logic, and mock data stay in the existing services and data files.

Future gameplay systems can add effect cues through a dedicated effect event stream if battles become step-based. Until then, passive signal observation keeps the current prototype low-risk.
