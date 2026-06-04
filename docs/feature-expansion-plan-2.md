# Feature Expansion Plan — Round 2

Second expansion wave on top of the shipped 10-feature set. Four tracks, all
keeping the existing guardrails: local-only, fast feedback, reduced-motion,
renderer-isolated effects, and a deterministic battle outcome whose core math is
not changed (new systems are additive modifiers that default to neutral).

This wave also closes three loose ends found while auditing the game:
`effectIntensity` and `colorblindMode` were persisted but had no consumers,
`accentTheme` was never implemented, and the Pixi battle stage never rendered
the status / super-effective / overdrive events the engine already emits.

## Track A — Expedition (roguelite, headline, uses PixiJS)

- Run-based mode with a branching **PixiJS node-map**: battle, elite, boss,
  shop, rest, and event nodes, with escalating difficulty.
- **Relics**: run-only modifiers (separate from permanent gear) picked up along
  the way; cleared on run end.
- A meta-currency (Cores) banked on clears, spent on persistent unlocks.
- Reuses the combat engine; a defeat (or reaching the boss) ends the run with a
  summary.

## Track B — Combat depth

- **Active Combat Beats**: optional timing prompt on the Pixi stage (hit the
  window to land the lead's Overdrive). Off by default; success-only, capped
  bonus so the loop stays fair and fast.
- **Signature Traits**: a unique passive per creature/type/rarity that hooks the
  engine (e.g. first-strike bonus, regen-on-win, bulwark while healthy).
- **Battlefield Mutators**: rotating conditions (Solar Flare, Static Field,
  Toxic Fog…) that temporarily bend the type chart / stats; telegraphed pre-fight
  with a matching Pixi ambient tint.

## Track C — Polish

- **Pixi Status FX**: floating status icons (burn/poison/shield/regen/shock/
  chill/rally) over units, super-effective/resisted pop text, and an Overdrive
  cinematic beat — completing the original battle-stage intent.
- **Accessibility + theming**: wire `effectIntensity` into Pixi/Three particle
  budgets, `colorblindMode` into type glyph/pattern overlays, add `accentTheme`
  palettes via CSS variables, an ARIA live region announcing battle results, and
  keyboard navigation across card grids.

## Track D — Platform

- **i18n (DE/EN)**: a translation layer with a language toggle, unifying the
  mixed English-UI / German-log text and handling the text-encoding audit.
- **PWA / offline-first**: web manifest + service worker so the local game
  installs and runs fully offline with asset precache.

## Delivery order

Foundation (save v8 + new state/settings) → Pixi Status FX → Signature Traits →
Battlefield Mutators → Active Combat Beats → Expedition → Accessibility/Theming →
i18n → PWA. Each phase ends with vitest specs where rules changed, `npm run
build`, a reduced-motion check, and a commit. New combat modifiers default to
neutral so the existing 77 specs stay green.
