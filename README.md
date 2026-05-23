# Pixel Evolution Arena

Pixel Evolution Arena is a modern Angular 21 singlepage browsergame prototype about building a squad of original digital pixel creatures, winning quick arena simulations, earning rewards, and unlocking evolution paths.

The focus is game feel first: fast decisions, visible progress, compact battles, satisfying unlock goals, and a dense sci-fi evolution-tree HUD inspired by the project references without using protected names, logos, or copied assets.

## Current Prototype

- Angular 21 standalone app with Signals and `computed` state.
- 50 original playable prototype creatures in local mock data.
- 100 additional original creature concepts plus animated SVG sprites under `public/assets/creatures/generated-100/`; the first 50 are wired into the playable prototype roster.
- Evolution Tree, Squad, Arena, Collection, and Handbook views.
- Local-only game state: no backend, no login, no external runtime APIs.
- Auto-battle loop with XP, level-ups, coins, DNA shards, item drops, and battle logs.
- Brand-safe SVG logo, mark, and favicon.
- Isolated Three.js effects layer for battle/menu feedback.

## Gameplay Loop

1. Inspect the Evolution Tree.
2. Select an unlocked creature.
3. Build a squad of up to three.
4. Start a short Arena battle.
5. Gain XP, coins, DNA shards, and possible items.
6. Evolve creatures when requirements are met.
7. Use Collection filters to choose the next unlock goal.

## Local Development

Install dependencies:

```bash
npm.cmd install
```

Start the app:

```bash
npm.cmd start
```

Build:

```bash
npm.cmd run build
```

PowerShell note: use `npm.cmd`/`npx.cmd` if local execution policy blocks `npm.ps1`.

## Tech Stack

- Angular `21.2.x`
- TypeScript
- SCSS/CSS custom properties
- Angular Signals and standalone components
- Three.js for a view-only effect layer
- Local mock data only

## Important Docs

- [Game Design](docs/game-design.md)
- [Balance And Progression](docs/balance-and-progression.md)
- [Gameplay Checklist](docs/gameplay-implementation-checklist.md)
- [Modern Angular Skill](docs/angular-modern-skill.md)
- [Technical Decisions](docs/technical-decisions.md)
- [Asset Guidelines](docs/asset-guidelines.md)
- [Concept Images](docs/concept-images/README.md)
- [Brand Assets](docs/brand-assets.md)
- [100 Creature Roster](docs/creature-roster-100.md)
- [100 Sprite Manifest](docs/creature-sprite-manifest-100.md)

## Asset Policy

Reference images are stored under `docs/concept-images/reference/` and are inspiration only.

Generated project concepts are stored under `docs/concept-images/generated/`.

Runtime assets live under `public/assets/`.

All app data, names, and sprites should remain original and brand-safe.

## Status

This is an early playable prototype. The next polish goals are tighter one-view UI fidelity to the reference posters, richer battle presentation, and expanding the remaining generated roster into playable progression branches.
