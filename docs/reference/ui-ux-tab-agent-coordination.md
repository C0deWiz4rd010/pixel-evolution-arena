# UI/UX Tab Agent Coordination

Date: 2026-05-23

This note coordinates the second UI/UX implementation pass after the playable prototype was merged to `develop`.

## Reference Priorities

- `docs/concept-images/reference/concept-evolution-tree-poster-v2-primary-reference.png`
  - Dense dark sci-fi evolution poster.
  - Large readable creature nodes.
  - Strong stage-colored horizontal bands.
  - Route legend and colored arrows are always visible.
- `docs/concept-images/reference/concept-evolution-chart-light-reference.png`
  - Clear stage rows and thin orthogonal link routing.
  - Small but readable ID labels.
  - Bottom explainer blocks that teach the player what the chart means.
- `docs/concept-images/reference/concept-evolution-tree-wide-reference.png`
  - Creature silhouettes must read at a glance.
  - Later-stage forms should feel larger and more impressive than early forms.

## Worker Split

- Evolution Tree worker owns the tree command surface and stage-row hierarchy.
- Squad worker owns team slots, power readout, candidate strip, and type coverage clarity.
- Arena worker owns battle staging, VS core, reward urgency, and combatant readability.
- Collection worker owns archive/Dex scanning, filters, counts, and next-chase clarity.
- Handbook/Nav worker owns the right-side manual tab and top navigation/legend clarity.
- Sprite/Asset worker owns global sprite scale and Monster Card/Detail sprite presentation.

## Integration Rules

- Keep gameplay rules in `GameStateService`; tab workers should not change battle, XP, evolution, or reward logic.
- Prefer local component SCSS for tab-specific polish.
- Use `src/styles.scss` only for shared sprite/card/panel language.
- SVG sprites should look like primary game pieces, not tiny status icons.
- Mobile remains functional with horizontal tab/tree scrolling and no clipped labels.
