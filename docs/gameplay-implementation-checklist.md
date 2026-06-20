# Gameplay Implementation Checklist

Use this checklist during Angular implementation.

## Loop Checks

- [x] Player can identify a useful next action from the first screen.
- [x] Selecting a monster updates header and detail immediately.
- [x] Add to Squad updates slots and team power immediately.
- [x] Start Battle is blocked with a clear message when squad is empty.
- [x] Battle log has 6-10 varied lines.
- [x] Win rewards update HUD immediately.
- [x] Loss rewards still grant progress.
- [x] XP overflow carries into the next level.
- [x] Level-up creates a visible log line.
- [x] Item drop creates a visible reward/log line.
- [x] Evolution unlock selects the new creature.
- [x] Missing evolution requirements are readable.
- [x] Collection filters help find locked and unlocked targets.

## Feel Checks

- [x] No interaction feels delayed without reason.
- [x] Buttons and cards have selected/hover/disabled states.
- [x] Empty states tell the player what to do next.
- [x] Locked cards are mysterious but informative.
- [x] The UI feels like a game HUD, not a static dashboard.

## Content Checks

- [x] All 50 creatures from `docs/creature-roster-50.md` are represented.
- [x] No protected franchise names appear in app copy or code.
- [x] Enemy names are original.
- [x] Item names are original.

## QA Scenarios

1. Start with empty squad, go to Arena, click Start Battle, verify blocker.
2. Add one creature, battle, verify rewards and XP.
3. Add three creatures, battle, verify higher team power and log variety.
4. Select a creature with unmet evolution requirements, verify disabled Evolve reason.
5. Level or resource state allows evolution, click Evolve, verify unlock and selection.
6. Filter Collection to locked Rookie creatures, then reset filters.

## Verification Note

2026-05-23:

- `npm.cmd run build` passed.
- Browser smoke test passed on desktop and 390x844 mobile viewport with no console errors.
- Verified tab switching, rendered sprite assets, squad remove/add, empty squad Arena blocker, battle rewards/logs, Aquabun -> Splashfang evolution, Collection stage filter/reset, and Handbook visibility.
- Stochastic item drops and loss rewards are implemented in `GameStateService` and covered by the reward/log code path; they remain chance-dependent in manual play.

2026-05-27:

- `npm.cmd run build` passed; `npm.cmd run test -- --run` passed (34 tests / 6 files).
- Phase 4 (Battle Depth) shipped: battle categories Training/Standard/Risk, pre-battle outlook badge, win streak with milestone callouts (3/5/10/25), loss-hint generator surfaced in Arena and Evolution Tree.
- Phase 5 first batch shipped: roster expanded to 65 (Spectral Dark line M051–M056, Empyreal Light line M057–M062, Special caps M063–M065).
- Phase 6 (Squad Depth) shipped: slot-role labels (Vanguard/Sync Core/Anchor) with tooltips, synergy detail + activation text, up to three named squad presets.
- Phase 7 (Collection planning) shipped: chase pinning with HUD chip, filter presets (Ready Soon, Item-Gated, Special Route, Reachable), name/ID search, stage-completion bonus (+200 coins, +10 DNA).
- Phase 8 (initial polish): optional `AudioService` toggle (Handbook), reward cues for win/loss/evolve/item/level-up, scrollbar restyled to match the HUD blueprint, monster-card hover-jump and name-clipping fixed.
- Save format migrated through v1→v5 with in-place upgrades preserving existing progress.

2026-06-02:

- `npm.cmd run test -- --run` passed (64 tests / 11 files).
- `npm.cmd run build` passed with existing budget warnings only: initial bundle 502.56 kB vs 500 kB warning, Arena SCSS 19.69 kB vs 14 kB warning.
- `npm.cmd run test:e2e` passed (7 Playwright smoke tests).
- Phase 10 improvements shipped: global Next Command guidance in shell/HUD, Arena Tactic Coach, direct Collection `Evolve Now` for ready chase targets, full-squad reserve swapping when a stronger candidate is available, ASCII cleanup for touched runtime UI strings, and smoke coverage for the new flows.

2026-06-06:

- `npm.cmd run test -- --run` passed (92 tests / 16 files).
- `npm.cmd run build` passed with existing warnings: Arena SCSS warning budget (19.69 kB vs 14 kB warning) and Pixi CommonJS warning for `@xmldom/xmldom`.
- `npm.cmd run test:e2e` passed (13 Playwright smoke tests).
- Browser visual smoke passed on desktop 1440x1100 and mobile 390x844. Verified Auto Build Best Squad, Arena Run Readiness, Reward Forecast, Collection Chase Queue, direct Evolution Tree route action, and mobile HUD wrapping. Playwright screenshots produced only WebGL ReadPixels capture warnings.
- Phase 11 shipped: Arena readiness and reward forecasting, battle milestone preview, Squad auto-build plus shape diagnostics, direct Tree route actions, Monster Detail training plans, Collection Chase Queue, sharper locked/selected card treatment, mobile HUD/tab readability fixes, and Pages deploy trigger for `develop`.

2026-06-06 Phase 12:

- Added `docs/phase-12-scrollbar-and-quick-ops-todo.md` with the completed 14-point implementation todo.
- Removed nested vertical scrolling from the Collection right rail and global detail panels so the document scrollbar is the only page-level vertical scroller.
- Added global Quick Ops for Auto Squad, ready evolution, and Run Battle, keeping fast loop actions reachable from every tab.
- Added Playwright coverage for Quick Ops and the single-scroll panel behavior.
- `npm.cmd run test -- --run` passed (92 tests / 16 files).
- `npm.cmd run build` passed. Initial bundle stayed under budget at 649.98 kB; existing warnings remain Arena SCSS budget and Pixi `@xmldom/xmldom` CommonJS.
- `npm.cmd run test:e2e` passed (15 Playwright smoke tests).
- Browser visual smoke passed on desktop 1440x900 and mobile 390x844. Verified Quick Ops layout, Collection single-scroll metrics, and no console/page errors.

2026-06-06 Phase 13:

- Added `docs/phase-13-arena-momentum-todo.md` with the completed 14-point implementation todo.
- Added Arena Momentum derived from squad status, win chain, forecast, overdrive, and risk outlook.
- Added Arena Objective Stack for daily directive, next evolution chase, and battle milestone progress.
- Added a compact Sim Field overlay so the Pixi stage has readable standby state without hiding creatures.
- Fixed the wide Arena layout so the terminal grows with its command stack instead of clipping the Start Battle action.
- `npm.cmd run test -- --run` passed (92 tests / 16 files).
- `npm.cmd run build` passed with warnings: initial bundle 656.66 kB vs 650 kB warning, existing Arena SCSS warning, and Pixi `@xmldom/xmldom` CommonJS.
- `npm.cmd run test:e2e` passed (15 Playwright smoke tests).
- Browser visual smoke passed on desktop 1440x900 and mobile 390x844. Verified Momentum, Objective Stack, Sim Field overlay, unclipped Start Battle action, Quick Ops bounds, and no console/page errors.

2026-06-06 Phase 14:

- Added `docs/phase-14-operations-deck-todo.md` with the completed 17-point implementation todo.
- Synced `develop` forward to the current `main` state before starting the next gameplay pass.
- Added pure operations rules for squad auto-equip planning and forge quick recommendations, plus unit coverage for the new logic.
- Added a global Operations Deck with live evolution, forge, campaign, and expedition command cards.
- Added Forge Command, Campaign Command, and Expedition Relay strips so those tabs surface actionable state immediately.
- Added one-click auto-equip, forge quick action, campaign quick-claim, and expedition launch/bank shortcuts.
- `npm.cmd run test -- --run` passed (96 tests / 17 files).
- `npm.cmd run build` passed with warnings: initial bundle 681.26 kB vs 650 kB warning, existing Arena SCSS warning, and Pixi `@xmldom/xmldom` CommonJS.
- `npm.cmd run test:e2e` passed (16 Playwright smoke tests) after setting Playwright to one worker for stable dev-server-backed browser smoke runs.
- Browser smoke passed on desktop 1440x900 and mobile 390x844 with no console or page errors; verified Operations Deck, Forge Command, Expedition Relay, and the updated quick-action flow.

2026-06-07 Phase 15:

- Added `docs/phase-15-command-loop-todo.md` with the completed 16-point implementation + verification todo.
- Added pure training-drill rules plus XP targeting helpers so solo drills and squad calibration sims can grant progression without a full arena run.
- Added `GameStateService` actions for monster drills, squad drills, route-status HUD signaling, and reusable battle prep / prep-and-launch support.
- Upgraded Header HUD, Evolution Tree, Monster Detail, Collection, Squad, and Arena surfaces with live route readiness, drill controls, and prep-console guidance.
- `npm.cmd run test -- --run` passed (99 tests / 18 files).
- `npm.cmd run build` passed with warnings: initial bundle 697.01 kB vs 650 kB warning, Arena SCSS warning budget 20.22 kB vs 14 kB, and Pixi `@xmldom/xmldom` CommonJS.
- `npm.cmd run test:e2e` passed (18 Playwright smoke tests).
- Browser visual smoke passed on desktop 1440x960 and mobile iPhone 13 viewport. Verified training drills, route-pressure cues, prep-and-launch flow, and readable HUD wrapping with no overlap regressions.
- Merged the work into `develop`, pushed commit `909af9c`, and verified GitHub Pages deployment run `27085999042` plus live site `https://c0dewiz4rd010.github.io/pixel-evolution-arena/` (HTTP 200).

2026-06-07 Phase 16:

- Added `docs/phase-16-battle-intel-todo.md` with the completed 17-point implementation + verification todo.
- Added persisted recent battle records plus pure battle-intel summarization rules so the game can surface win trend, preferred run profile, and average payouts from real arena history.
- Upgraded the global shell, Arena, Campaign, Forge, and Expedition tabs with the Intel Strip, Recent Runs dossier, Objective Radar, Loadout Diagnostics, and Preflight Scanner.
- `npm.cmd run test -- --run` passed (102 tests / 19 files).
- `npm.cmd run build` passed with warnings: initial bundle 712.75 kB vs 650 kB warning, Arena SCSS warning budget 20.78 kB vs 14 kB, and Pixi `@xmldom/xmldom` CommonJS.
- `npm.cmd run test:e2e` passed (19 Playwright smoke tests).
- Browser visual smoke passed on desktop 1440x960 and mobile iPhone 13 viewport. Verified the Intel Strip, recent-run dossier, campaign radar, forge diagnostics, expedition preflight scanner, and readable mobile stacking with no blank-panel regressions.
- Merged the work into `develop`, pushed commit `9c1807c`, and verified GitHub Pages deployment run `27087693693` plus live site `https://c0dewiz4rd010.github.io/pixel-evolution-arena/`.

2026-06-07 Phase 17:

- Added `docs/phase-17-command-center-todo.md` with the completed 16-point implementation + verification todo.
- Added pure command-center rule builders plus shared service-level meta actions so Handbook, Medals, Campaign, and Settings can all surface live priorities from the same progress state.
- Upgraded Handbook into a live command center, Medals into a directive/reward hub, Campaign with boss prep + reward runway, and Settings with a system-check strip and profile signal.
- `npm.cmd run test -- --run` passed (106 tests / 20 files).
- `npm.cmd run build` passed with warnings: initial bundle 736.72 kB vs 650 kB warning, Arena SCSS warning budget 20.78 kB vs 14 kB, and Pixi `@xmldom/xmldom` CommonJS.
- `npm.cmd run test:e2e` passed (20 Playwright smoke tests).
- Browser visual smoke passed on desktop 1440x960 and mobile iPhone 13 viewport. Verified handbook command cards, medals focus board, campaign boss prep, settings system checks, and readable mobile stacking with no overlap regressions.

2026-06-10 Phase 18:

- Added `docs/phase-18-mission-control-todo.md` with the completed 20-point improvement todo.
- Added pure Mission Control rules plus service-level computed cards so Squad, Evolution, Arena, Archive, and Meta priorities are visible from every tab.
- Added a global Mission Control matrix with clickable cards for Auto Squad, ready evolution, battle launch, chapter claim, forge quick action, and expedition relay.
- Restored always-visible Intel/Ops surfaces with explicit accessibility labels, improved Quick Command accessible names, and labeled evolution actions by target.
- Moved Arena command-deck styles to global CSS to keep the Arena component below the hard style-budget error while preserving the same visual treatment.
- Fixed Collection side-rail overflow so the document scrollbar remains the only vertical page scroll in the tested flow.
- `npm.cmd run test -- --run` passed (137 tests / 22 files).
- `npm.cmd run build` passed with warnings: initial bundle 758.77 kB vs 650 kB warning, Arena SCSS warning budget 19.33 kB vs 14 kB, and Pixi `@xmldom/xmldom` CommonJS.
- `npm.cmd run test:e2e -- --reporter=list` passed (21 Playwright smoke tests).
- Browser visual smoke passed on desktop 1440x960 and mobile 390x844. Verified Mission Control matrix, Arena tab, Collection tab, and no console/page errors. Screenshots: `tmp/phase-18-desktop.png`, `tmp/phase-18-mobile.png`.

2026-06-10 Phase 19:

- Added `docs/phase-19-tactical-directives-todo.md` with the completed 20-point improvement todo.
- Added pure Tactical Directive rules that estimate route ETA, squad patch value, run choice, and payout priority from live game state.
- Added a global Tactical Directives strip below Mission Control so the player sees route blockers, approximate wins-to-goal, reserve swap value, battle forecast, and payout focus from every tab.
- Added service-level tactical directive computed data using live evolution candidates, reward forecast, Daily Directive, Forge, Expedition, and Chapter state.
- Changed Intel/Ops dock back to collapsed-by-default and auto-collapse on tab switches so the play surface stays clickable and tall.
- Added accessible labels for directive cards and updated Playwright coverage for the new route/run planning surface.
- `npm.cmd run test -- --run` passed (141 tests / 23 files).
- `npm.cmd run build` passed with warnings: initial bundle 769.45 kB vs 650 kB warning, Arena SCSS warning budget 19.33 kB vs 14 kB, and Pixi `@xmldom/xmldom` CommonJS.
- `npm.cmd run test:e2e -- --reporter=list` passed (22 Playwright smoke tests).
- Browser visual smoke passed on desktop 1440x960 and mobile 390x844. Verified Tactical Directives, Intel/Ops dock auto-collapse, Arena readability, and no console/page errors. Screenshots: `tmp/phase-19-desktop.png`, `tmp/phase-19-mobile.png`.

2026-06-14 Phase 20:

- Added `docs/phase-20-after-action-queue-todo.md` with the completed 20-point improvement todo.
- Added pure After-Action Queue rules so battle results can route into ready evolution, campaign claims, squad patching, forge upgrades, expedition relay, or another run.
- Exposed After-Action cards from `GameStateService` and rendered them inside the Arena Reward Feed with accessible action buttons.
- Added Playwright coverage for the new reward-to-next-action flow after `Prep + Launch`.
- Compact Arena-focus Mission Control and Tactical Directives, and changed small-screen global HUD cards into horizontal rails so the mobile play surface remains clickable.
- `npm.cmd run test -- --run` passed (145 tests / 24 files).
- `npm.cmd run build` passed with warnings: initial bundle 776.21 kB vs 650 kB warning, Arena SCSS warning budget 19.33 kB vs 14 kB, and Pixi `@xmldom/xmldom` CommonJS.
- `npm.cmd run test:e2e -- --reporter=list` passed (22 Playwright smoke tests).
- Browser visual smoke passed on desktop 1440x960 and mobile 390x844. Verified Arena `Prep + Launch`, rewards, After-Action Queue, compact global HUD rails, and no console/page errors. Screenshots: `tmp/phase-20-desktop.png`, `tmp/phase-20-mobile.png`.

2026-06-14 Phase 21:

- Added `docs/phase-21-battle-contracts-todo.md` with the completed 20-point improvement todo.
- Added pure Battle Contract rules that convert daily objectives, win forecast, evolution route ETA, streak state, Overdrive readiness, and item availability into three actionable pre-battle mission cards.
- Exposed Battle Contracts from `GameStateService` and added service-level apply/launch handling through existing battle prep controls.
- Added the Arena Battle Contracts board before the prep console so players can choose safe, daily, route-farm, or payout-focused runs without hunting through stance/risk controls.
- Kept contract styles global and mobile-friendly with horizontal card rails to protect the playfield and avoid growing the Arena component style budget.
- Fixed an accessible-name collision with the Combat Beat `CHARGE` button by using distinct contract labels (`Prep Core` / `Run Core`).
- `npm.cmd run test -- --run` passed (150 tests / 25 files).
- `npm.cmd run build` passed with warnings: initial bundle 788.41 kB vs 650 kB warning, Arena SCSS warning budget 19.33 kB vs 14 kB, and Pixi `@xmldom/xmldom` CommonJS.
- `npm.cmd run test:e2e -- --reporter=list` passed (23 Playwright smoke tests).
- Browser visual smoke passed on desktop 1440x960 and mobile 390x844. Verified Battle Contracts apply/launch, rewards, After-Action Queue, and no console/page errors. Screenshots: `tmp/phase-21-desktop.png`, `tmp/phase-21-mobile.png`.

2026-06-14 Phase 22:

- Added `docs/phase-22-squad-orders-todo.md` with the completed 20-point improvement todo.
- Added pure Squad Order rules that rank formation fill, reserve swap, gear sync, squad training, ready evolution, and arena readiness from live squad state.
- Exposed Squad Orders from `GameStateService` and added service-level execution for Auto Squad, reserve swap, training, auto-equip, ready evolution routing, and Arena routing.
- Added a compact Squad Orders console to the Squad diagnostics rail so the team-building tab now has three actionable next steps instead of only a single recommendation.
- Moved Squad Order styles to global CSS to keep the Squad component below the style-budget warning while preserving the neon HUD treatment.
- `npm.cmd run test -- --run` passed (155 tests / 26 files).
- `npm.cmd run build` passed with warnings: initial bundle 795.51 kB vs 650 kB warning, Arena SCSS warning budget 19.33 kB vs 14 kB, and Pixi `@xmldom/xmldom` CommonJS.
- `npm.cmd run test:e2e -- --reporter=list` passed (24 Playwright smoke tests).
- Browser visual smoke passed on desktop 1440x960 and mobile 390x844. Verified Squad Orders rebuild, responsive diagnostics rail, and no console/page errors. Screenshots: `tmp/phase-22-desktop.png`, `tmp/phase-22-mobile.png`.

2026-06-14 Release:

- Consolidated the remaining `codex/` and `feat/` branch work into `develop`.
- Bumped the release version to `0.22.0`.
- Verified the build, tests, and GitHub Pages deployment path after the merge.

2026-06-20 UI/UX simplification:

- Replaced ten equally weighted tabs and the global command dashboards with five primary areas, contextual subviews, and one Next Goal action.
- Rebuilt Evolve around one active family, Dex completion, mystery silhouettes, recent discoveries, family progress, and a vertical mobile route.
- Simplified Squad, Loadout, Arena, Campaign, Expedition, and Collection while preserving all underlying progression and action paths.
- Reduced onboarding from five system-heavy steps to the three-part core loop: discover, build, battle/evolve.
- `npm.cmd run test -- --run` passed (155 tests / 26 files).
- `npm.cmd run build` passed with the existing Pixi CommonJS warning and a reduced initial bundle warning (679.42 kB vs 650 kB); the previous Arena component-style warning is resolved.
- `npm.cmd run test:e2e -- --reporter=list` passed (12 Playwright smoke tests).
- Visual QA passed at 1440x960, 1280x800, 390x844, and 360x800 with no page errors or horizontal document overflow. Verified tab/subview switching, evolution, training, squad rebuild, loadout, battle rewards, Campaign, Expedition, Collection filters, Settings, persistence, reset, and the three-step onboarding.

2026-06-20 Collector Tech card system:

- Added the accepted Collector Tech concept and decision-complete implementation plan under `docs/`.
- Added locally bundled Pixelify Sans and Space Grotesk fonts with licenses; no external runtime font requests are used.
- Unified shell, Next Goal, evolution family cards, monster detail, squad, battle, explore, archive, and settings around neutral card surfaces, readable type tiers, and narrow stage accents.
- Added persistent `Collector Tech`, `Pixel Arcade`, and `Tactical Minimal` interface profiles plus independent `Dual Font`, `Pixel`, and `Tech Sans` typography profiles. Existing saves default safely to Collector Tech and Dual Font.
- Mobile Evolve now prioritizes Next Goal, Dex progress, next discovery, and the active family before the selected-creature inspector.
- `npm.cmd run test -- --run` passed (155 tests / 26 files).
- `npm.cmd run build` passed with the existing initial bundle budget warning (693.72 kB vs 650 kB) and Pixi `@xmldom/xmldom` CommonJS warning.
- `npm.cmd run test:e2e -- --reporter=list` passed (13 Playwright smoke tests), including style/typography persistence.
- Playwright visual QA passed on desktop 1440x960 across all five primary areas and on mobile 390x844 with no page errors or horizontal document overflow. Browser plugin was not available, so the repository Playwright workflow was used.

2026-06-20 Build warning cleanup:

- Installed and enabled `browser@openai-bundled` version `26.609.41114`; a new Codex session is required before its MCP browser tools become available.
- Converted all ten tab feature views in the root template to Angular `@defer (on immediate)` blocks with accessible loading placeholders.
- Reduced the production initial bundle from 693.72 kB to 445.74 kB, clearing the 650 kB warning without changing the budget.
- Documented Pixi's transitive `@xmldom/xmldom` dependency in Angular's `allowedCommonJsDependencies`; the production build now completes without warnings.
- `npm.cmd run test -- --run` passed (155 tests / 26 files).
- `npm.cmd run test:e2e -- --reporter=list` passed (13 Playwright smoke tests), including rapid primary/secondary view loading and persisted presentation settings.
