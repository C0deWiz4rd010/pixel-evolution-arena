# Architecture

Pixel Evolution Arena is a singlepage Angular app with local-only game state.

## Boundaries

- Components render UI and dispatch user actions.
- `GameStateService` owns mutable player and monster state.
- Data files define static catalogs.
- Model files define shared interfaces.
- Pure helper methods should be preferred for calculations such as monster power, team power, requirements, XP gain, and battle rewards.

## Proposed Structure

```txt
src/app/
  app.component.ts
  app.component.html
  app.component.scss
  models/
    monster.model.ts
    battle.model.ts
    player-state.model.ts
  data/
    monsters.data.ts
    enemies.data.ts
  services/
    game-state.service.ts
  components/
    header-hud/
    tab-navigation/
    evolution-tree/
    monster-card/
    monster-detail/
    squad/
    arena/
    collection/
```

## State Model

- Monster unlocks, XP, and levels are local state.
- Player state tracks coins, DNA shards, battles won, selected monster, squad IDs, and inventory.
- Derived values such as team power should be computed from state instead of stored manually.

## UI Model

- The app shell keeps the active tab.
- Feature components read from `GameStateService`.
- Selection should stay global so Header HUD, Evolution Tree, Squad, and Detail Panel remain in sync.

## Future Growth

The current prototype does not need a canvas or Three.js engine. If real movement, 3D arena previews, or live battles are added later, simulation should still stay outside the renderer.
