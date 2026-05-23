# Project Instructions

## Goal

Create a responsive Angular singlepage browsergame prototype named **Pixel Evolution Arena**.

The player should be able to:

- View a futuristic evolution tree.
- Select monsters and inspect stats.
- Build a squad of up to three unlocked monsters.
- Evolve monsters when requirements are met.
- Start simulated auto-battles.
- Receive XP, coins, DNA shards, and occasional items.
- Filter the full collection.

## Non-Goals

- No backend.
- No real database.
- No login.
- No external runtime APIs.
- No protected monster names, franchise names, logos, or copied assets.

## Required Tabs

- Evolution Tree
- Squad
- Arena
- Collection

## Required Initial Player State

- Coins: `1200`
- DNA Shards: `45`
- Battles Won: `0`
- Selected Monster: first unlocked monster
- Squad: empty or seed with unlocked monsters only

## Required Data

The app must include at least 50 original monsters for this prototype:

- 6 Baby
- 7 In-Training
- 9 Rookie
- 9 Champion
- 7 Ultimate
- 6 Mega
- 6 Special

Use `docs/creature-roster-50.md` as the current roster reference.

Only early monsters start unlocked:

- Bubblit
- Sproutbit
- Emberling
- Shadepuff
- Aquabun
- Leafbyte

## Implementation Rules

- Keep mock data in `src/app/data/`.
- Keep interfaces in `src/app/models/`.
- Keep state and actions in `src/app/services/game-state.service.ts`.
- Keep repeated UI in focused components.
- Use SCSS variables or CSS custom properties for stage colors and surfaces.
- Use deterministic helper methods where possible so the feature can be tested later.
