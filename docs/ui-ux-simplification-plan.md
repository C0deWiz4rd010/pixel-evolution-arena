# Pixel Evolution Arena UI/UX Simplification Plan

## Goal

Make the complete game easier to understand for new players without removing existing gameplay. The default interface should present one clear next goal, one dominant action per area, and collection progress as a persistent motivation.

The primary visual reference is `concept-images/generated/pixel-evolution-arena-collector-desktop-v2.png`. The desktop and mobile v1 concepts define the shared shell and responsive hierarchy.

## Information Architecture

The ten current tabs become five primary areas:

- **Evolve**: evolution paths, training, requirements, discoveries.
- **Squad**: formation, reserves, presets, gear, and forge.
- **Battle**: arena preparation, combat, rewards, and campaign.
- **Explore**: expedition preparation, active runs, relics, and results.
- **Archive**: collection, achievements, and handbook.

Settings move into the header utility menu. Existing service actions route to a primary area and optional subview instead of exposing every system as a top-level tab.

## UX Rules

- Keep only one global `Next Goal` surface.
- Show one primary action in each major region; demote destructive and advanced actions.
- Put advanced diagnostics behind `Details`, `Analysis`, or contextual subviews.
- Keep important controls at least 44 by 44 pixels and body copy at least 16 pixels where space permits.
- Use stage colors for status and route meaning, not as large decorative fills.
- Limit glow to selected, ready, reward, and focus states.
- Use desktop top navigation and mobile sticky bottom navigation.
- Never use horizontally clipped dashboard rails on mobile.

## Collector Motivation

- Show Dex completion and the next discovery in Evolve and Archive.
- Make unlocked forms vivid and unidentified forms readable silhouettes.
- Show family completion such as `2 / 6 forms` in the selected-creature inspector.
- Surface three recent discoveries without competing with the current route.
- Give every unlock a short reveal, an explicit Dex increase, and a useful next target.

## Delivery Milestones

1. Preserve existing work, store this plan and all accepted concepts.
2. Replace the global shell with five primary areas and one Next Goal.
3. Redesign Evolve around an active family route and collection progress.
4. Simplify Squad and integrate Forge as its Loadout subview.
5. Structure Battle into Prepare/Battle/Rewards, integrate Campaign, and simplify Explore.
6. Consolidate Archive, shorten onboarding, finish responsive/accessibility QA, and run all quality gates.

Each milestone is committed on `codex/ui-ux-simplification`, pushed to that branch, and fast-forwarded to `origin/develop` after its relevant tests and build pass.

## Acceptance Criteria

- A new player can identify the next useful action within three seconds.
- No more than one global action surface appears above the active feature.
- Every previous core flow remains available.
- Dex progress and a next collectible target are visible from Evolve and Archive.
- Desktop at 1440x960 and 1280x800 and mobile at 390x844 and 360x800 have no page-level horizontal overflow, clipped controls, or unreadable glow.
- `npm.cmd run build`, `npm.cmd run test`, and `npm.cmd run test:e2e` pass.
- `docs/gameplay-implementation-checklist.md` is updated with the final verification.
