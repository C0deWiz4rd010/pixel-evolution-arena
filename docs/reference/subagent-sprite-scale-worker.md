# Subagent Sprite Scale Worker

## Summary

The creature sprites were reading as small icons instead of digital evolution nodes. This pass increases sprite presence globally through shared CSS sizing tokens and reshapes `MonsterCardComponent` and `MonsterDetailComponent` markup so the creature art owns a stable, framed node area.

## Changes

- Added global sprite scale tokens in `src/styles.scss` for tiny, small, medium, large, node, target, and hero sprite sizes.
- Enlarged monster-card node wells and target evolution previews while keeping fixed minimum card heights to reduce layout jumping.
- Enlarged selected-detail hero sprites and target evolution sprites so the detail panel feels like a readable inspection console.
- Added `.sprite-node` framing styles with crisp grid/crosshair details inspired by the reference evolution charts.
- Added UI-only helper getters in `MonsterCardComponent` for display text and accessible card labels.

## Why

The reference images make each creature a visible node first, with ID/name metadata secondary. The previous app styling kept the SVGs around icon scale, which weakened both collection readability and evolution-plan fidelity. Larger framed sprite wells make the mock sprites feel intentional, digital, and playable without changing any game rules.

## Files Touched

- `src/styles.scss`
- `src/app/components/monster-card/monster-card.component.html`
- `src/app/components/monster-card/monster-card.component.ts`
- `src/app/components/monster-detail/monster-detail.component.html`

## Notes For Other Workers

- No gameplay logic was changed.
- Global sprite classes are now the preferred integration point: `.creature-sprite.tiny`, `.small`, `.medium`, `.large`, `.node`, `.target`, and `.hero`.
- Components owned by other workers can opt into the larger presence by using those classes, but this worker did not edit their files.
