# UI/UX Reference Plan

This plan is the required design checkpoint before implementation. It translates the provided reference images into a brand-safe, singlepage Pixel Evolution Arena HUD without changing gameplay rules, monster data, package files, or backend assumptions.

## Reference Direction

Primary references:

- `docs/concept-images/reference/concept-evolution-tree-poster-v2-primary-reference.png` and user image 1: dark sci-fi poster tree, large title/HUD, stage color bands, legend blocks, link lines, compact monster cards, neon borders.
- `docs/concept-images/reference/concept-evolution-chart-light-reference.png` and user image 2: dense readable evolution chart, thin orthogonal link routing, compact ID cards, clear stage ranges and bottom explanation row.
- User image 3: playable one-view HUD with header stats, tabs, Handbook on the right side of the menu row, large Evolution Tree center-left, selected detail panel on the right, and lower Battle/Squad/Rewards strip.

## Features To Carry Over

- **One-view game HUD:** keep the app as a singlepage tabbed experience, but make the first Evolution Tree tab feel like one complete command surface rather than separate dashboard panels.
- **Evolution Tree prominence:** the Evolution Tree remains the first active tab and takes the largest first-viewport area.
- **Stage bands:** each stage row becomes a strong neon band with the required colors:
  - Baby green
  - In-Training cyan
  - Rookie yellow
  - Champion orange
  - Ultimate red
  - Mega purple
  - Special magenta
- **Stage sidebar labels:** each tree row gets a dense left rail with stage name, unlocked count, total count, and a small original stage glyph.
- **Legends:** the menu area keeps an always-visible link legend, and the tree gets a compact stage legend strip inspired by the poster header.
- **Link lines:** use CSS-only orthogonal and dashed lines behind cards. Lines should communicate standard, branch, and special routes without adding gameplay logic.
- **Compact monster cards:** shrink cards, emphasize ID, icon, name, lock state, level/power, and stage color. The cards should look like pixel-card nodes, not generic dashboard cards.
- **Right detail area:** keep `MonsterDetailComponent` as the sticky right inspection panel, make it more like the selected-monster panel in image 3, and keep Add to Squad / Evolve visible.
- **Lower Battle/Squad bar on Evolution Tree:** add a bottom command strip in the tree view with a small squad dock, rewards readout, latest battle log, and Start Battle action. It reuses existing GameStateService actions and derived state only.
- **Header/Tabs/Handbook right:** preserve the top HUD stats and place Handbook as a distinct right-side menu control, visually matching the reference.
- **Digital blueprint structure:** use chamfered panels, thin 1-2px lines, grid/circuit motifs, restrained glow, uppercase monospace HUD labels, and sharp corners.
- **Responsive behavior:** below wide desktop, stack the right detail panel under the tree and keep the bottom strip readable. On mobile, use horizontal scroll for dense tree lanes and avoid text overlap.

## Features To Avoid

- Do not use protected creature names, franchise logos, copied silhouettes, or third-party sprites from the references.
- Do not copy the reference title text or protected world/franchise terminology into app UI.
- Do not import or generate lookalike third-party assets for runtime use.
- Do not replace local original monster names, IDs, or game data.
- Do not turn the app into a static poster. All existing interactions must stay live: selection, squad add/remove, evolution, battle rewards, tabs, and collection filters.
- Do not add a glossy SaaS/dashboard look, soft pastel cards, decorative orbs, bokeh, or oversized marketing hero sections.
- Do not add cinematic delays that slow the battle/evolution loop.

## Concrete File Changes

### `docs/ui-ux-reference-plan.md`

- Add this plan before implementation.

### `src/styles.scss`

- Expand theme tokens for blueprint surfaces, row heights, compact cards, stage glyphs, status colors, and line styles.
- Refine `body`, `.app-shell`, `.hud-panel`, header HUD, tab navigation, legend, and shared panel/card/button styles.
- Rework `.tree-layout`, `.tree-panel`, `.stage-legend`, `.evolution-rows`, `.stage-row`, `.stage-label`, `.monster-row`, `.monster-card`, `.detail-panel`, `.target-card`, `.squad-*`, `.arena-*`, `.collection-*`, and `.handbook-*`.
- Add CSS-only tree route lines:
  - horizontal rail through each monster row
  - vertical drop stems on cards
  - dashed branch overlays on selected rows
  - special magenta routing accent on Special and Mega rows
- Add `.tree-command-strip`, `.mini-squad-dock`, `.mini-battle-log`, and `.mini-reward-readout` styles for the lower Evolution Tree bar.
- Add responsive breakpoints for wide HUD, tablet stacking, and mobile horizontal tree scrolling.

### `src/app/components/header-hud/header-hud.component.html`

- Tighten stat chip copy and structure.
- Keep original brand mark.
- Use compact ASCII-safe HUD labels/symbols where possible to avoid mojibake in rendered text.
- Keep selected monster visible in the header.

### `src/app/components/tab-navigation/tab-navigation.component.html`

- Keep tabs left, link legend center, Handbook control right.
- Add small semantic wrappers/classes for icon cells and the distinct Handbook control.

### `src/app/components/tab-navigation/tab-navigation.component.ts`

- Optional small UI-only updates to tab icon strings and link labels. No gameplay state.

### `src/app/components/evolution-tree/evolution-tree.component.html`

- Add reference-style stage legend block.
- Add stage glyphs/count metadata to each stage row.
- Keep the tree first and central.
- Add the lower Battle/Squad strip using existing service values/actions.

### `src/app/components/evolution-tree/evolution-tree.component.ts`

- Add UI-only derived helpers:
  - latest battle log slice
  - bottom-strip squad slots
  - stage glyph lookup
  - last reward label/value helpers if needed
- Keep rules and mutations inside `GameStateService`.

### `src/app/components/monster-card/monster-card.component.html`

- Reorder content into compact node-card structure with ID header, icon well, name, meta row, power/level strip, and lock badge.
- Keep click/select behavior unchanged.

### `src/app/components/monster-card/monster-card.component.ts`

- Optional UI-only helper for locked icon/accessible label if needed.

### `src/app/components/monster-detail/monster-detail.component.html`

- Tighten selected detail hierarchy: ID/rarity/type top, large icon, stat matrix, visible XP, Add to Squad, evolution target rows.
- Make disabled evolution requirements readable.
- Avoid new gameplay logic.

### `src/app/components/squad/squad.component.html`, `arena.component.html`, `collection.component.html`, `handbook.component.html`

- Keep existing behavior and data.
- Adjust structure/classes where needed so they share the same blueprint HUD language.
- Avoid app-level route or state changes.

### Component SCSS files under `src/app/components/*/*.scss`

- Keep mostly host-level styles unless a component needs local-only layout.
- Most shared visual language remains in `src/styles.scss` to avoid duplication.

## Verification Plan

- Run `npm.cmd run build`.
- Serve locally and smoke test:
  - tab switching
  - monster selection
  - squad add/remove
  - evolution disabled/ready states
  - battle rewards and log updates
  - collection filtering/reset
- Check desktop and mobile viewports for overlap, clipped text, blank screens, and unreadable glow.
- Complete the checklist in `docs/gameplay-implementation-checklist.md` during verification by observing the live app. Do not change gameplay rules to satisfy UI polish.
