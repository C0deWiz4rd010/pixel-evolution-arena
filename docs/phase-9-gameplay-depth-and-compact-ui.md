# Phase 9 — Gameplay-Tiefe (Hybrid-Kampf) + Kompakte Single-View-UI

> Status: **abgeschlossen** (Phasen A–H umgesetzt). Verifiziert: 64 Unit-Tests grün, Production-Build < 500 kB Budget, 5 Playwright-Smoke-Tests grün. Single-Source-of-Truth für diesen Arbeitsdurchgang (analog `next-implementation-roadmap.md`).

## Kontext / Warum

Das Spiel ist strukturell stark (Angular 21, Standalone + Signals, reine `*.rules.ts`, Daten in `*.data.ts`, Three.js nur als View-Layer), aber **mechanisch flach** und stellenweise **nicht kompakt**:

- **Kampf = ein Klick, reines Würfeln.** `startBattle()` → `resolveBattle()` ist `teamPower*(1+mod)*rng` vs `enemyPower*(1+mod)*rng`. Keine Spielerentscheidung im Kampf, Moves sind Flavortext, keine Status-Effekte. Die Animation parst Schaden per Regex aus Log-Strings zurück (`deriveDamageHits`) — fragil.
- **Inventar ist tot** (nur Evolution-Gates), kein Coin-Sink außer Evolution.
- **Keine Meta-Progression** über Win-Milestones hinaus; statische Encounter; kein Session-Hook.
- **Scrollzwang auf breiten Screens** (Evolution-Tree fixe Höhe, Squad-Slots 364px, Battle-Log 310px fix, fehlender Tablet-Breakpoint 1180↔1400).

**Ziel:** Hybrid-Kampf (Stance vor dem Kampf + einmal Overdrive auslösen) mit echten Moves & Status-Effekten; Kampf-Verbrauchsgegenstände; Erfolge/Medaillen; Tägliche Directive + Endlos-Gauntlet; und eine **Single-View-UI**, die auf ausreichend breiten Screens (≈≥1440px) **alles ohne Scrollen (weder nach unten noch nach rechts)** zeigt, mit Priorität auf dem Hauptbereich.

## Designentscheidungen

1. **Combat-Engine als Linchpin.** Neue deterministische, RNG-injizierte Rundensim (`combat.engine.ts`) ersetzt das eine Würfeln und liefert `won/criticalHit/playerRoll/enemyRoll` **plus** eine strukturierte `BattleEvent[]`-Timeline. **Reward-Logik bleibt unverändert** — Reward-Bau aus `resolveBattle` in `buildReward(won,crit,multiplier)` extrahieren und mit dem Sim-Ergebnis füttern (Specs bleiben grün).
2. **Overdrive = commit-before-resolve.** Meter lädt über Kämpfe (persistiert); ist er voll, armt der Spieler den Overdrive vor dem Run; die Engine simuliert deterministisch *mit* ihm, die Animation inszeniert den Burst. Echte taktische Entscheidung, keine Re-Sim mitten in der Animation → ein Reward-Pfad, voll testbar.
3. **Stance ≠ Category ≠ Mode.** Stance (Aggressiv/Ausgewogen/Defensiv) = Haltung im Kampf; Category (Training/Standard/Risk, vorhanden) = Risiko/Reward-Stufe; Mode (Standard vs Gauntlet) = Encounter-Quelle. Orthogonal, kompakt nebeneinander.
4. **Moves abgeleitet statt 71× handgeschrieben.** `TYPE_MOVE_KITS` pro Typ + Skalierung nach Stats/Stage in `getMonsterMoves(monster)`; optional Signature-Overrides.
5. **Animation event-getrieben.** `deriveDamageHits`-Regex-Hack entfällt; `BattleAnimationService.play()` konsumiert die Event-Timeline direkt.
6. **Save v6.** `SAVE_STATE_VERSION` 5→6; neue Felder über `ensurePlayerDefaults` + `sanitizePlayerState` + Starter-Defaults rückwärtskompatibel; alte Saves dürfen nicht brechen.
7. **Kein neuer Renderer (entschieden).** Kein PixiJS. Mehr Variation aus event-getriebener DOM/CSS-FX (Status-Chips, Overdrive-Burst, Treffer-/Tick-Popups, Sprite-Shake, typ-gefärbte Move-Flares) + Erweiterung der bestehenden Three.js-Schicht. Pixelart scharf, 500kB-Budget gewahrt, „Effekte view-only" bleibt.
8. **Single-View-Pflicht.** Bei ≈≥1440px jede View komplett ohne vertikales/horizontales Scrollen; Hauptbereich (`.play-surface`/linke Panels) bekommt Breiten-Priorität, Sidebars engen ihn nicht ein.

## Phasen & Aufgaben

**A — Combat-Core:** A1 Engine-Modelle (`models/combat.model.ts`) + Simulation (`rules/combat.engine.ts`, +Spec) · A2 Moves (`data/moves.data.ts` + `rules/moves.rules.ts`, +Spec) · A3 Status (`rules/status.rules.ts`, +Spec).

**B — Hybrid-Steuerung:** B1 `BATTLE_STANCES` in `battle.rules.ts` · B2 Overdrive-Ressource (charge/arm/consume) + Signals in `GameStateService`.

**C — startBattle/Animation:** C1 `startBattle()` auf Engine umstellen (`simulateBattle`→`buildReward`→`buildBattleLogsFromEvents`→`play({events})`) · C2 event-basierte Logs (Synergien/Status/Overdrive sichtbar) · C3 `BattleAnimationService` event-getrieben, Regex-Hack raus.

**D — Consumables:** D1 `data/items.data.ts` (`Repair Cell`/`Purge Chip`/`Focus Capsule`/`Aegis Plating`) + Engine-Support (`rules/items.rules.ts`) · D2 transientes Loadout + Coin-Shop „Fabricator" (erster Coin-Sink) + Drops.

**E — Meta/Medaillen:** E1 `data/achievements.data.ts` + `rules/achievements.rules.ts` + PlayerState (`claimedAchievements`, `combatStats`) · E2 kompakter `medals`-Tab (6. Tab, Keyboard 1–6).

**F — Daily + Gauntlet:** F1 `rules/daily.rules.ts` (datum-seeded) + `player.dailyDirective` + Claim · F2 `battleMode` `'standard'|'gauntlet'`, skalierende Wellen, `gauntletBestWave`.

**G — UI/Kompaktheit (Single-View):** G0 Plan→/docs (erledigt) · G1 Tablet-Breakpoint + kein horizontaler Overflow + Hauptbereich-Priorität · G2 Arena Single-Screen (Flex-Log, dichtes arena-core, Stance/Overdrive/Category/Loadout-Pills, Status-Chips) · G3 Squad-Slots verdichten · G4 Evolution-Tree fixe Höhe raus · G5 Collection/Handbook Filter & Sidebars straffen · G6 HUD-Chips (Overdrive/Daily/Medals) + Politur (a11y, reduced-motion).

**H — Persistenz & Tests:** H1 Save-Migration v6 (+`save-state.service.spec.ts`) · H2 neue Specs + bestehende grün + `npm test`/`npm run build` + Playwright-Smoke + manuelle Verifikation (voller Loop + Kompaktheit bei 1440/1280/390px).

## Wiederverwendung
Reward/Streak/Milestone (`calculateStreakBonus`, `applyStreakBonus`, `findCrossedMilestone`, `generateLossHint`), Typmatchup (`getTypeMatchupValue`/`evaluateTypePressure`), Synergie/Power (`evaluateSquadSynergies`, `getMonsterPower`, `calculateSquadBattleModifier`), XP/Evolution (`applyXpToSquad`, `applyEvolutionToPlayer`), Toasts/Audio — alles wiederverwenden, nicht neu bauen.

## Verifikation
1. `npm test` (alte + neue Specs grün; Engine deterministisch via RNG-Mocks).
2. `npm run build` (Budgets eingehalten).
3. `npm start` → voller Loop; alte v5-Saves laden ohne Verlust.
4. Kompaktheit: Arena/Squad/Tree bei 1440px ohne jegliches Scrollen; sauberer Tablet- (≈1280px) und Mobile- (390px) Fallback.
