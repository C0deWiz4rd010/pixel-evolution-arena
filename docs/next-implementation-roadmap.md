# Next Implementation Roadmap

This roadmap is the active plan for the next development passes after the first playable prototype.

The goal is to deepen the gameplay loop without losing the current strengths:

- fast feedback
- readable progression
- original creature identity
- local-only architecture
- snappy singlepage interaction

## Delivery Rules

- Every phase must improve the core loop: select, squad, battle, reward, evolve, plan.
- Gameplay systems come before decorative polish.
- New systems should prefer pure helpers and service-owned state over template logic.
- Each phase should end with `npm.cmd run build` and a focused manual smoke pass.

## Phase 0: Project Alignment

Status: completed

Scope:

- create a dedicated feature branch for roadmap work
- sync project docs to the current prototype reality
- establish this roadmap as the source of truth for follow-up work
- note open technical cleanup items before feature expansion starts

Deliverables:

- branch `codex/gameplay-roadmap-step-01`
- updated docs for current Three.js usage and roadmap location
- documented follow-up note for icon and text-encoding review

Exit criteria:

- no key project doc contradicts the current app architecture
- the team can point to one roadmap file for the next phases

## Phase 1: Rules Extraction

Status: completed

Goal:

Split `GameStateService` into clearer gameplay rule boundaries without changing behavior.

Planned work:

- extract battle math into `rules/battle.rules.ts`
- extract XP and level-up behavior into `rules/xp.rules.ts`
- extract evolution requirement checks into `rules/evolution.rules.ts`
- extract squad scoring and synergy helpers into `rules/squad.rules.ts`
- extract type matchup logic into `rules/type-matchup.rules.ts`

Why this phase matters:

- the service is already doing a lot
- upcoming features will become risky if all rules stay in one file
- tests are much easier once calculations are pure

Exit criteria:

- `GameStateService` mostly coordinates state updates and actions
- battle, XP, evolution, and squad calculations live in isolated pure functions
- no visible regression in battle flow, evolution flow, or collection planning

## Phase 2: Test Foundation

Status: completed

Goal:

Create a real safety net before deeper gameplay expansion.

Planned work:

- add an Angular test target if needed for this repo
- add unit tests for reward calculation, XP overflow, evolution requirements, and squad synergy scoring
- add smoke-level browser checks for the critical player journey

Priority test cases:

- empty squad blocks arena start
- XP overflow can trigger multiple levels correctly
- evolution consumes coins, DNA shards, and items correctly
- win and loss rewards stay within expected ranges
- collection filters reset cleanly

Exit criteria:

- project has repeatable automated checks beyond manual browsing
- core rules can be changed with lower regression risk

## Phase 3: Save And Reset

Status: next

Goal:

Add local persistence so progress survives refreshes.

Planned work:

- introduce a save service backed by `localStorage`
- serialize only saveable simulation state
- add save versioning for future migrations
- add reset-run affordance with confirmation UI

Guardrails:

- no backend
- no login
- no renderer-owned save state

Exit criteria:

- refreshing the page preserves unlocks, squad, inventory, XP, and resource totals
- reset cleanly restores the starter state

## Phase 4: Battle Depth

Status: queued

Goal:

Make arena runs more strategic without slowing the loop.

Planned work:

- add more explicit battle categories such as training, standard, and risk runs
- surface clearer pre-battle expectations such as low, even, or strong win outlook
- add streak or milestone reward hooks
- improve loss hints so the game tells the player how to recover

Guardrails:

- keep combat short
- keep battles auto-resolved
- do not turn the loop into a slow tactics system

Exit criteria:

- players understand why a battle is worth taking
- losses teach a next move instead of feeling random

## Phase 5: Evolution And Roster Expansion

Status: queued

Goal:

Turn more of the 100-creature concept set into playable progression content.

Planned work:

- expand beyond the first 50 playable creatures in controlled batches
- add more complete branch chains and item-gated special routes
- surface evolution history and branch identity more clearly in the UI

Recommended rollout:

- add 10 to 15 creatures per content pass
- ensure each pass completes full branches instead of isolated nodes

Exit criteria:

- at least one new branch family is playable end to end
- new content creates meaningful new chase goals, not just a bigger archive

## Phase 6: Squad Depth

Status: queued

Goal:

Make team building feel smarter and more expressive.

Planned work:

- add squad presets
- reinforce slot roles such as vanguard, core, and anchor
- expose synergy rules more clearly in Squad and Handbook
- improve suggested swaps and composition advice

Exit criteria:

- squad changes feel like strategic decisions, not only power sorting

## Phase 7: Collection As Planning Tool

Status: queued

Goal:

Make Collection answer "what should I do next?" even more directly.

Planned work:

- pin a chase target
- show progress toward the pinned target in the HUD or tree
- add filter presets such as ready soon, item gated, and special route
- add completion rewards or milestones by stage or type

Exit criteria:

- Collection becomes a planning surface, not only a catalog

## Phase 8: Feel And Polish

Status: queued

Goal:

Improve feedback quality after the gameplay foundation is stronger.

Planned work:

- tighten effect timing
- add optional local audio hooks
- improve item-drop and evolution feedback
- refine sprite glow and panel readability

Guardrails:

- no cinematic delays
- reduced-motion support must remain intact
- polish must not bury actionable information

Exit criteria:

- the app feels richer without becoming slower or harder to read

## Open Notes

- Icon and text-encoding audit: the current data set mixes sprite art with emoji-style fallback icons. Before wider content expansion, confirm which labels should stay decorative only and which should be normalized to ASCII-safe UI labels where mojibake or font inconsistency can appear.
- Documentation drift check: after each phase, update the roadmap and any impacted source-of-truth docs in the same pass.
