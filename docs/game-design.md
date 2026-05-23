# Game Design: Pixel Evolution Arena

This is the gameplay source of truth for the first playable prototype. The UI concepts define the mood; this document defines why the prototype should feel fun to click.

## Design Thesis

Pixel Evolution Arena should feel like a compact digital creature toybox: every click either improves the squad, reveals a goal, or creates a small reward moment.

The player fantasy is:

> Build a tiny squad of original pixel creatures, run quick arena simulations, collect resources, and unlock cooler evolution forms.

The prototype does not need deep combat yet. It does need strong feedback, visible progress, and clear next goals.

## Fun Pillars

### Fast Decisions

The player should understand the next useful action within seconds:

- Add an unlocked creature to squad.
- Battle for XP and resources.
- Check a locked evolution requirement.
- Filter collection to see what is missing.

### Visible Progress

Every core action should move at least one visible meter:

- XP bar
- Level
- Coins
- DNA shards
- Battles won
- Unlock count
- Evolution checklist
- Inventory item count

### Small Surprises

Repeated auto-battles need variation:

- Randomized battle log phrases.
- Damage numbers vary.
- Win/loss margins vary.
- 25% item drop chance.
- Occasional level-up messages.
- Different enemy focus target lines.

### Meaningful Goals

Locked creatures should not feel like static grey boxes. They should answer:

- Which creature unlocks this?
- What level is required?
- Which currency or item is missing?
- How close am I?

### Low Friction

The prototype should never make the player hunt for basic actions:

- Selecting a creature updates the HUD and details immediately.
- Add to Squad is visible from monster detail.
- Start Battle explains if no squad exists.
- Evolve is disabled with readable missing requirements.
- Collection filters are obvious and resettable.

## Core Loop

1. Select an unlocked creature in the Evolution Tree.
2. Add useful creatures to a squad of up to three.
3. Start a short arena auto-battle.
4. Read a compact play-by-play result.
5. Gain XP, coins, DNA shards, and sometimes an item.
6. Spend resources to unlock evolutions.
7. Check collection progress and choose the next target.
8. Repeat with a stronger or more interesting squad.

## Loop Timing

### 5-Second Loop

- Hover/click creature.
- See stats, power, evolution targets, and missing requirements.
- Add or remove squad member.

### 30-Second Loop

- Start battle.
- Read battle log.
- See rewards and XP changes.
- Decide whether to battle again or evolve.

### 3-Minute Loop

- Level one or more squad members.
- Unlock at least one new evolution target.
- Improve team power noticeably.

### 10-Minute Session Loop

- Build a preferred squad.
- Win several battles.
- Get at least one item drop.
- Unlock one meaningful new creature.
- Discover a next chase goal.

## Core Verbs

- **Inspect:** compare creatures, stats, stages, and requirements.
- **Choose:** select a squad composition.
- **Fight:** run a short auto-battle.
- **Collect:** gain resources, XP, and items.
- **Evolve:** unlock a stronger or rarer form.
- **Plan:** use collection filters and locked cards to pick the next goal.

## Player Journey

### Minute 0: First Contact

The player lands on the Evolution Tree. They should immediately see:

- A few unlocked cute creatures.
- Many locked future forms.
- A selected creature with Add to Squad and Evolve information.
- HUD values that make the game feel alive.

### Minute 1: First Squad

The player adds one to three unlocked creatures. The squad tab should show:

- Filled slots.
- Power increase.
- Recommendation message.
- Clear path to Arena.

### Minute 2: First Battle

The battle should be quick and readable:

- If squad is empty: show a friendly blocker.
- If squad exists: generate 6-10 log lines.
- On win: visible resource gain and XP.
- On loss: still grant small consolation rewards.

### Minute 4: First Evolution Target

The player should understand that battles feed evolution:

- XP raises levels.
- Coins and DNA shards are spent.
- Some branches need items.
- Evolving unlocks a new card and selects it.

### Minute 8+: First Chase

The player should begin thinking:

- "I need Shadow Gem for this dark line."
- "I need more DNA shards for Champion."
- "This locked Special form looks worth chasing."

## Tab Responsibilities

No tab should be decorative only.

### Evolution Tree

Primary purpose: plan and execute evolution.

Must provide:

- Stage rows.
- Locked and unlocked cards.
- Selected monster detail.
- Requirements checklist.
- Add to Squad.
- Evolve.
- Clear visual path from current form to targets.

Fun test: can the player pick a next evolution goal in under 10 seconds?

### Squad

Primary purpose: make team-building satisfying.

Must provide:

- Three stable squad slots.
- Empty slot affordance.
- Remove and Clear Squad controls.
- Team Power.
- Type/stage mix feedback.
- Recommendation text.
- Roster of unlocked candidates.

Fun test: does adding/removing a creature immediately change the perceived strength of the team?

### Arena

Primary purpose: deliver short reward bursts.

Must provide:

- Enemy team preview.
- Start Battle button.
- Empty squad blocker.
- 6-10 line battle log.
- Win/loss result.
- Rewards.
- XP and level-up feedback.
- Item drop feedback.

Fun test: would the player click Battle Again because the result was quick and rewarding?

### Collection

Primary purpose: show progress and future goals.

Must provide:

- Total count.
- Unlocked count.
- Locked count.
- Stage counts.
- Type counts.
- Filters for stage, type, rarity, and lock status.
- Locked silhouettes or dimmed cards.
- Selected card preview or goal hint.

Fun test: can the player use this screen to decide what to unlock next?

## Battle Design

The first prototype uses auto-battle because the main gameplay is collection and evolution, not tactical control.

### Battle Inputs

- Player squad power.
- Enemy team power.
- Small randomness factor.
- Creature stats for flavor lines.
- Creature type and speed for log variation.

### Battle Formula

Use:

```ts
playerRoll = teamPower * random(0.85, 1.15)
enemyRoll = enemyPower * random(0.85, 1.15)
win = playerRoll >= enemyRoll
```

Stats should still appear in log generation:

- Higher attack increases damage text.
- Higher defense can trigger block lines.
- Higher speed can trigger first-strike or momentum lines.

### Battle Log Shape

Each battle should produce:

- Start line.
- 3-5 action lines.
- 1 momentum or block line.
- Result line.
- Reward line.
- Optional item or level-up line.

Example rhythm:

1. `Arena battle started.`
2. `Splashfang opens with Aqua Slash for 28 damage.`
3. `Mossgolem braces and reduces the hit.`
4. `Gearfox tags Fangbat with a servo burst.`
5. `Your squad gains momentum.`
6. `Your squad wins the battle!`
7. `Rewards: +120 Coins, +8 DNA Shards, +35 XP.`
8. `Item found: Shadow Gem.`

### Losses Should Still Feel Useful

Losses must not feel like dead time:

- Grant smaller rewards.
- Grant XP.
- Log a useful hint such as `Train one more level or add a third squad member.`

## Squad Design

Squad building should be simple but expressive.

### Squad Size

Max 3 creatures.

Why: three choices are enough to create comparison and identity without slowing the prototype.

### Team Power

```ts
power = attack + defense + speed + hp
teamPower = sum(power)
```

### Recommendation States

- Empty: `Add unlocked monsters from the evolution tree.`
- One or two members: `Your squad has room for more monsters.`
- Three members: `Squad ready for arena battle.`
- Low power vs enemy: `Enemy power is higher. Battles can still pay XP.`
- Missing type spread: `Try mixing stages or types for a stronger squad identity.`

### Future-Friendly Hooks

The first prototype can display simple synergy labels without implementing complex synergy:

- Balanced squad
- Fast squad
- Heavy squad
- Element-focused squad

## Evolution Design

Evolution is the main long-term reward.

### Requirements

Requirements may include:

- Level
- Coins
- DNA shards
- Item

### Evolution Result

When evolution succeeds:

- Unlock target monster.
- Spend coins and DNA shards.
- Consume required item if present.
- Set target level to `max(1, source.level - 2)`.
- Set selected monster to target.
- Add battle/system log line.

### Requirement Feedback

Checklist should show:

- Met requirements in green.
- Missing requirements in red or muted disabled state.
- Current value and required value.

### Branching Goals

Some creatures should have two branches:

- Reliable standard branch.
- Rare or item-gated special branch.

This creates planning without adding complex mechanics.

## Economy And Rewards

The economy should make the first prototype generous enough to keep momentum.

### Starting State

- Coins: `1200`
- DNA Shards: `45`
- Battles Won: `0`
- Inventory: at least one item may be seeded to demonstrate item-gated evolution.

### Win Rewards

- `+120` Coins
- `+8` DNA Shards
- `+35` XP to squad members
- `+1` Battles Won
- 25% chance for one item

### Loss Rewards

- `+30` Coins
- `+2` DNA Shards
- `+12` XP to squad members

### Item Drops

Initial item pool:

- Armor Core
- Shadow Gem
- Solar Crest
- Ancient Gear

Drop chance should feel exciting, not required for every early unlock.

## Progression Bands

Approximate power targets:

- Baby: 80-145
- In-Training: 120-210
- Rookie: 190-330
- Champion: 310-500
- Ultimate: 500-760
- Mega: 760-1050
- Special: 900-1250

Early evolutions should be reachable quickly. Later evolutions should be visible but clearly aspirational.

## 50-Creature Roster Use

Use `docs/creature-roster-50.md` as the prototype catalog reference.

The first implementation should include all 50 creatures locally in `monsters.data.ts`, even if the UI initially emphasizes the 28+ required by the original prompt.

## UX Feedback Rules

- Every button disabled state needs a visible reason nearby.
- Every resource spend should update HUD immediately.
- Every battle should update the battle log.
- Every unlock should make the newly unlocked card visually pop through selected state and log text.
- Collection filters should never produce confusing emptiness; show an empty state with reset guidance.

## MVP Cut Line

Must ship:

- 50 original creatures.
- Evolution tree grouped by stage.
- Squad of up to three.
- Auto-battle with rewards.
- XP and level-up.
- Evolution unlocks.
- Collection filters.

Can wait:

- Real animation system.
- Save/load persistence.
- Audio.
- Complex type advantage.
- Real AI.
- Procedural enemies.
- Multiplayer.

## Design Gate Before Implementation

Implementation should not begin until these are true:

- Gameplay loop is documented.
- Reward values are documented.
- Evolution behavior is documented.
- 50-creature roster exists.
- UI concepts exist for tree, squad, arena, collection, evolution, and rewards.
- Agent instructions say gameplay feel is the priority.
