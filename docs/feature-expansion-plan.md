# Feature Expansion Plan

This plan extends the playable prototype with ten substantial features and a
phased delivery order. It keeps every existing guardrail intact:

- local-only architecture (no backend, no login, no runtime APIs)
- fast feedback and readable progression
- original, brand-safe creature identity
- reduced-motion support and renderer-isolated effects
- the deterministic combat math and reward forecasting stay untouched

The headline track introduces **PixiJS** for a real, visible 2D battle stage.
It is driven by the existing `BattleEvent` timeline from `combat.engine.ts`, so
it visualizes the fight without changing any balance or outcome logic.

---

## Feature Catalogue

### 1. PixiJS Live Battle Stage (headline)
Replace the static DOM/CSS combatant strip with an animated PixiJS canvas:

- squad on the left, enemies on the right, loaded from each unit's `spriteUrl`
- idle bob + breathing, lunge-on-attack, recoil-on-hit, faint dissolve
- per-unit floating HP bars, in-canvas damage numbers, crit hit-flash
- status icons over units (poison, burn, shield, regen, rally)
- type-effectiveness flash ("super effective" / "resisted")
- dedicated Overdrive cinematic beat for the lead unit
- screen shake on crits/finale, particle accents on faint
- full reduced-motion fallback: keep the current DOM stage as the static view
- **no balance change** — choreography is derived from the existing event list

### 2. Procedural Chiptune Audio Engine
Upgrade the oscillator beeps into a small synth engine:

- procedural looping arena theme assembled at runtime (no audio files)
- layered SFX: type-specific hit tones, evolution jingle, UI ticks, milestone
- master volume slider + mute, persisted in the save state
- gracefully no-ops when Web Audio is unavailable or audio is disabled

### 3. Gear / Equipment System
Persistent per-monster gear, distinct from one-shot consumables:

- four slots: Core (attack), Plate (defense), Drive (speed), Relic (special)
- forge and upgrade gear with coins + DNA shards in a new Forge surface
- gear bonuses feed `getMonsterPower` and the battle modifiers
- surfaced in Squad and Monster Detail; pure rules module + tests

### 4. Boss Encounters With Mechanics
Turn every fifth battle into a real fight, not just a stat spike:

- named, themed bosses with telegraphed mechanics and an enrage phase
- boss-specific reward tables and a Boss Codex entry once defeated
- fast-clear bonus that rewards killing before enrage

### 5. Campaign / Quest Chain
Structured progression beyond endless arena:

- chapters with objectives, short narrative beats, and unlock gates
- chapter rewards: exclusive creatures/gear and lore entries
- progress persisted; complements (not replaces) the endless loop

### 6. Prismatic Variants (shiny system)
A long-tail collection chase:

- rare prismatic drop with an alternate palette and a small stat boost
- variant flag on the monster, shimmer shader in the Pixi stage and on cards
- Collection filter for prismatics plus a dedicated medal

### 7. Settings Panel + Save Export/Import + Accessibility
Quality-of-life and inclusivity:

- in-app settings: volume, motion toggle, effect intensity, accent theme
- export the save as a copyable code; import to restore (local-friendly sharing)
- colorblind-safe type glyphs, visible focus rings, fuller ARIA and keyboard nav

### 8. Statistics & Codex Dashboard
Make the Handbook a real reference:

- lifetime stats: win rate, type usage, best margins, streak history
- bestiary of encountered enemies, move glossary, status glossary
- an interactive type-matchup chart

### 9. Onboarding / Tutorial Coach
A guided first-run overlay walking select -> squad -> battle -> evolve, skippable
and shown only until completed (a flag in the save state).

### 10. Juice / Polish Pass
Final feel layer:

- tweened counters for coins/DNA/XP gains in the HUD
- card hover tilt, evolution morph transition, refined toast stacking
- consistent micro-timing across feedback so information stays readable

---

## Delivery Phases (implementation order)

1. **PixiJS battle stage** (Feature 1) — biggest visible payoff, self-contained.
2. **Audio engine** (Feature 2) — small, pairs naturally with the new stage.
3. **Gear system** (Feature 3) — deepest gameplay addition; rules + UI + tests.
4. **Bosses** (Feature 4) — builds on the stage and gear.
5. **Campaign** (Feature 5) — structural meta layer.
6. **Prismatic variants** (Feature 6) — reuses stage shaders + collection.
7. **Settings / Save I/O / a11y** (Feature 7).
8. **Stats & Codex** (Feature 8).
9. **Onboarding** (Feature 9).
10. **Juice pass** (Feature 10).

Each phase ends with: new unit tests where rules changed, `npm.cmd run build`,
and a focused manual smoke pass. No phase may regress reduced-motion behavior or
the deterministic battle outcome.

## Engineering Notes

- PixiJS is loaded with a dynamic `import('pixi.js')` and mounted via
  `afterNextRender`, mirroring the existing Three.js isolation. It runs outside
  the Angular zone and disposes cleanly on destroy and WebGL context loss.
- The Three.js ambient effect layer stays; Pixi owns the foreground battle only.
- New gameplay state lives in service-owned signals and pure rule modules, never
  in template logic, and is added to the versioned save schema with migrations.
