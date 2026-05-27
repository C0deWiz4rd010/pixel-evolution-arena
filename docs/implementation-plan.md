# Implementation Plan

This file documents the original MVP implementation path that produced the first playable prototype.

For the current post-MVP expansion plan, use [next-implementation-roadmap.md](./next-implementation-roadmap.md).

## Step 1: Repo Prep

- Create feature branch.
- Organize concept images.
- Add repo instructions and project docs.
- Add `.gitignore`.

## Step 2: Angular App Shell

- Confirm gameplay design gate:
  - `docs/game-design.md`
  - `docs/balance-and-progression.md`
  - `docs/gameplay-implementation-checklist.md`
- Confirm technical decision gate:
  - Angular 21 current package versions.
  - No renderer-owned gameplay systems; visual effects remain optional and view-only.
- Scaffold Angular in repository root.
- Add app-wide SCSS theme.
- Create Header HUD and Tab Navigation.

## Step 3: Game Data And State

- Add models.
- Add monster catalog and enemy data.
- Add game state service with player state, selected monster, squad, evolution, battle, XP, and collection helpers.

## Step 4: Feature Components

- Evolution Tree
- Monster Card
- Monster Detail
- Squad
- Arena
- Collection

## Step 5: Docs And QA

- Rewrite README.
- Verify build.
- Run local browser smoke test.
- Complete gameplay checklist.
- Fix responsive and interaction issues.
- Commit logical steps and integrate back to `develop`.
