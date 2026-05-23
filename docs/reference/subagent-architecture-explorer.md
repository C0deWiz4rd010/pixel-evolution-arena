# Subagent Reference: Architecture Explorer

Agent nickname: Wegener

## Recommendation

For `Pixel Evolution Arena`, Angular should own the shell, HUD, and menu layer while the game logic stays in pure TypeScript below it.

Suggested structure:

```txt
src/app/
  app.routes.ts
  core/
    persistence/save-game.service.ts
    input/input.service.ts
    audio/audio.service.ts
    settings/settings.store.ts
  game/
    model/        # Creature, Stage, BattleState, SaveState
    data/         # creatures.catalog.ts, evolution-graph.ts, balance.ts
    engine/       # battle.engine.ts, evolution.engine.ts, rng.ts
    store/        # game.store.ts with Angular Signals
    render/       # pixel-art-renderer.ts, canvas-stage.component.ts
  features/
    starter-select/
    arena/
    training/
    battle/
    evolution-tree/
    dex/
    settings/
  shared/ui/
```

Important: do not hide rules in Angular components. Components show state and trigger actions; `game/engine` should decide deterministically about XP, evolution, combat, unlocks, and rewards. Canvas or pixel-art rendering is not the source of truth.

## Scaffolding Risks

The repo started almost empty: a minimal `README.md`, plus untracked `concepts/` and `docs/`.

Running `ng new` in the repo root may create or overwrite README, `.gitignore`, config files, and package files. Use a clean feature branch and be intentional.

Reference images are large. Decide later whether normal Git is enough or whether Git LFS should be introduced.

Brand risk: the concepts strongly reference an existing digital-monster franchise. The app itself must consistently use original creature names, data, and assets.

## Recommended Scripts

```json
{
  "start": "ng serve",
  "build": "ng build",
  "build:prod": "ng build --configuration production",
  "test": "ng test --watch=false --browsers=ChromeHeadless",
  "test:watch": "ng test",
  "lint": "ng lint",
  "format": "prettier --check .",
  "format:write": "prettier --write .",
  "e2e": "playwright test"
}
```

Unit tests should later focus first on battle, evolution, RNG, and save/load migrations. Playwright should later cover starter choice, training, combat, evolution, and reload with persisted game state.

## Recommended Markdown Files

```txt
docs/architecture.md
docs/game-design.md
docs/data-model.md
docs/asset-guidelines.md
docs/testing.md
docs/scaffolding-notes.md
```

## Summary

Angular should provide UI and routing. Pure TypeScript should provide the game rules. State should be serializable. Catalog data should avoid hardcoded creature logic inside components.
