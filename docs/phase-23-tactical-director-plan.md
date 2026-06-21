# Phase 23: Tactical Director

## Goal

Turn Battle from a pre-resolved auto simulation into a stateful 3-vs-3 fight with real HP, status effects, knockouts, two Squad Order windows, and one Tactical Pulse. Preserve the fast collector loop by supporting Director, Assist, and Auto control modes.

The approved concepts are:

- `concept-images/generated/pixel-evolution-arena-tactical-director-battle-v2.png`
- `concept-images/generated/pixel-evolution-arena-settings-categories-v1.png`

## Battle Rules

- The engine owns serializable combatant state, rounds, phases, decisions, active orders, statuses, Overdrive, and events. Angular and Pixi only render state and submit decisions.
- Opening runs through rounds 1-2, Pressure through rounds 3-4, and Finish through rounds 5-8.
- Squad Order windows open after rounds 2 and 6. Tactical Pulse opens after round 4. A finished fight skips remaining decisions.
- `Focus Target` forces the next two allied attacks onto a selected foe, adds 12% damage, and raises incoming damage by 8%.
- `Protect Lead` reduces the next two enemy hits by 30% and lowers allied damage by 8% while active.
- `Build Overdrive` adds 30 charge and lowers the next two allied attacks by 12%. At 100 charge the lead fires its signature Overdrive before the next normal action.
- `Break` performs an interrupt strike and cancels one enemy action. `Guard` grants 30% team mitigation for one enemy cycle. `Surge` grants 20% allied damage and 35% Mastery while increasing incoming damage by 10%.
- Decisions time out to the recommendation. Director waits eight seconds, Assist waits three seconds, and Auto applies immediately.
- Battles end on team knockout or after eight rounds. At the round cap, the higher remaining team-HP ratio wins; an exact tie is a loss.
- Rewards, XP, Mastery, items, records, and save state commit only after the finale animation.

## UI And Presentation

- The Arena keeps the battle field dominant, adds a three-phase timeline, individual HP/status HUDs, target rings, a narrow Command Rail, and a bottom Tactical Pulse rail.
- Mobile uses a bottom sheet for decisions and keeps the monsters visible.
- A shared creature portrait component normalizes crop, scale, and sizes across Recent Discoveries, Squad, Forge, Arena, Collection, and Evolution.
- Recent Discoveries uses 56px portraits instead of the current 42px images.
- The new app mark is an original Creature Eye Gate: a lime pixel eye inside a cyan hexagonal arena gate. It replaces browser, PWA, and header icons.

## Settings

- Replace the equal-weight card grid with five categories: Gameplay, Audio, Accessibility, Appearance, and Save Data.
- Gameplay contains Director/Assist/Auto, default battle speed, recommendations, and Combat Beats.
- Audio contains SFX, music, master volume, and a test cue.
- Accessibility contains colorblind glyphs, effect intensity, and System/Reduced motion.
- Appearance contains interface style, typography, accent, and language.
- Save Data contains local save status, export, import, diagnostics, category reset, and confirmed progress reset.
- Changes apply immediately and auto-save. The footer reports `Saved locally`; no staged Apply state is introduced.

## Public Types And Persistence

- Add `BattleControlMode`, `BattleOrderId`, `BattleDecisionKind`, `CombatantState`, and `BattleSessionState`.
- Extend `PlayerSettings` with battle control mode, battle speed, recommendations, motion mode, and music enabled.
- Extend recent battle records with orders, pulse, survivors, rounds, and control mode.
- Bump the local save version and sanitize all new fields. In-progress battle sessions are deliberately not persisted.

## Verification

- Unit-test deterministic seeds, true HP/KO resolution, target selection, order/pulse effects, timeouts, mode behavior, round cap, Mastery events, and save migration.
- Browser-test the full Director flow, Assist, Auto, delayed rewards, Settings persistence/reset, normalized portraits, and icon/manifest delivery.
- Check 1440x960 and 390x844, reduced motion, no horizontal overflow, and no missing Pages resources.
- Required gates: `npm.cmd test -- --run`, `npm.cmd run build:pages`, and `npm.cmd run test:e2e`.
