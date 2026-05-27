# Asset Effects Manifest

Runtime SVG assets created or audited for Pixel Evolution Arena. All assets are original, brand-safe, repo-native SVGs with crisp digital geometry and no external dependencies.

## Brand Assets

| Asset | Purpose | Path | Einbindungsvorschlag |
| --- | --- | --- | --- |
| Pixel Evolution Arena logo | Wide wordmark with creature emblem, stage ticks, and route-line motif. | `public/assets/brand/pixel-evolution-arena-logo.svg` | Use on splash, docs, loading states, or large HUD headers. |
| Pixel Evolution Arena mark | Square brand mark with arena shield, creature face, route junctions, and evolution core. | `public/assets/brand/pixel-evolution-arena-mark.svg` | Use for compact header/nav marks, loading badges, and social previews. |
| SVG favicon | Small tab icon with creature face plus route pixels. | `public/favicon.svg` | Prefer as SVG favicon in `index.html`; keep `.ico` only as legacy fallback. |

## Feedback Effects

| Asset | Purpose | Path | Einbindungsvorschlag |
| --- | --- | --- | --- |
| Cyan particle burst | Selection, scan, standard route activation. | `public/assets/effects/particle-burst-cyan.svg` | Overlay briefly on selected monster cards, header-selected, or active tree route. |
| Magenta particle burst | Special route, rare unlock, special-stage feedback. | `public/assets/effects/particle-burst-magenta.svg` | Use around Special/Mega unlock moments and rare rewards. |
| Orange hit spark | Damage hit confirmation. | `public/assets/effects/hit-spark-orange.svg` | Flash over arena combatants or battle center on attack resolution. |
| Green heal glint | Heal, recovery, positive status. | `public/assets/effects/heal-glint-green.svg` | Use for any future recovery/status buff UI without implying new rules. |
| Yellow reward glint | Post-battle reward and item drop sparkle. | `public/assets/effects/reward-glint-yellow.svg` | Place behind reward readouts, coin gains, or item drop rows. |
| Battle impact mark | Larger arena impact slash/mark. | `public/assets/effects/battle-impact-mark.svg` | Use as a short-lived arena overlay when the battle log records damage. |
| Evolution pulse ring | Seven-stage unlock/evolve ring. | `public/assets/effects/evolution-pulse-ring.svg` | Animate scale/opacity behind a creature when an evolution becomes ready or completes. |
| Evolution core pulse | Compact diamond evolution core. | `public/assets/effects/evolution-core-pulse.svg` | Use in empty evolution states, requirement met badges, or node hover details. |
| Arena hazard chevrons | Danger-strip motif. | `public/assets/effects/arena-hazard-chevrons.svg` | Use as a background strip for enemy/arena warning surfaces. |
| Arena warning grid | Warning overlay grid. | `public/assets/effects/arena-warning-grid.svg` | Use sparingly for boss/danger arena states; keep text above it readable. |

## Type Glows

| Asset | Purpose | Path | Einbindungsvorschlag |
| --- | --- | --- | --- |
| Nature type glow | Green leaf/circuit affinity motif. | `public/assets/effects/type-glow-nature.svg` | Background halo for Nature creature nodes or type badges. |
| Fire type glow | Orange-red flame affinity motif. | `public/assets/effects/type-glow-fire.svg` | Background halo for Fire creature nodes or attack feedback. |
| Water type glow | Cyan wave affinity motif. | `public/assets/effects/type-glow-water.svg` | Background halo for Water creature nodes. |
| Dark type glow | Purple shadow affinity motif. | `public/assets/effects/type-glow-dark.svg` | Background halo for Dark creature nodes; avoid over-darkening text. |
| Light type glow | White-gold star affinity motif. | `public/assets/effects/type-glow-light.svg` | Background halo for Light creature nodes or reward/cleanse UI. |
| Machine type glow | Cyan square circuit affinity motif. | `public/assets/effects/type-glow-machine.svg` | Background halo for Machine creature nodes and digital panels. |
| Beast type glow | Amber claw affinity motif. | `public/assets/effects/type-glow-beast.svg` | Background halo for Beast creature nodes and physical attack feedback. |
| Toxic type glow | Lime/violet vial affinity motif. | `public/assets/effects/type-glow-toxic.svg` | Background halo for Toxic creature nodes and hazard status UI. |

## UI Motifs

| Asset | Purpose | Path | Einbindungsvorschlag |
| --- | --- | --- | --- |
| DNA shard | DNA resource icon. | `public/assets/ui/dna-shard.svg` | Replace or supplement text-only DNA resource chips. |
| Coin glint | Coin/resource icon. | `public/assets/ui/coin-glint.svg` | Replace or supplement text-only coin chips and reward rows. |
| Standard route arrow | Cyan route arrow. | `public/assets/ui/route-arrow-standard.svg` | Use in legends or background route callouts. |
| Branch route arrow | Yellow dashed route arrow. | `public/assets/ui/route-arrow-branch.svg` | Use in legends or branch route explanation states. |
| Special route arrow | Magenta double route arrow. | `public/assets/ui/route-arrow-special.svg` | Use in legends or special route overlays. |
| Branch node | Route junction icon. | `public/assets/ui/branch-node.svg` | Use in evolution-tree legends, branching hints, or target rows. |
| Scanline panel | Chamfered HUD panel motif. | `public/assets/ui/scanline-panel.svg` | Use as CSS background-image or decorative empty-state panel layer. |
| Creature node frame | Chamfered node frame. | `public/assets/ui/node-frame.svg` | Use behind larger creature sprites or future sprite preview cells. |
| Stage color strip | Seven-stage palette strip. | `public/assets/ui/stage-color-strip.svg` | Use in docs, legends, and compact stage summaries. |

## Integration Notes

- Use these SVGs as `<img>` elements or CSS `background-image` layers. They should remain presentation-only and must not add gameplay state.
- For animated feedback, prefer CSS transforms/opacity on the SVG element. The SVGs themselves are static so motion timing remains owned by components or future effect services.
- Keep overlays short and low-friction. The prototype should still prioritize immediate squad, evolution, and battle decisions.
