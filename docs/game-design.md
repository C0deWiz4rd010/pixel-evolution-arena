# Game Design

## Core Fantasy

Pixel Evolution Arena is a digital monster squad game. The player collects original pixel creatures, unlocks evolution paths, and sends a small squad into quick arena simulations.

## Core Loop

1. Inspect evolution tree.
2. Select unlocked monster.
3. Add up to three monsters to squad.
4. Battle in arena.
5. Gain coins, DNA shards, XP, and occasional items.
6. Use rewards to evolve monsters.
7. Repeat with a stronger squad and larger collection.

## Gameplay Feel Pillars

- **Fast decisions:** players should understand squad readiness, evolution requirements, and battle rewards at a glance.
- **Visible progress:** XP bars, level ups, unlock counts, and requirement checklists should make every action feel useful.
- **Small surprises:** item drops and varied battle log lines keep repeated battles from feeling identical.
- **Meaningful goals:** locked monsters should point back to requirements so the next target is obvious.
- **No dead tabs:** every view should help the player collect, improve, fight, or plan.

## Moment-To-Moment Fun

- Clicking a monster immediately updates the HUD and detail panel.
- Adding to squad changes team power instantly.
- Battles produce compact play-by-play logs instead of a single result line.
- XP overflow can level a monster more than once if enough XP is gained.
- Evolution should unlock the next card, spend resources, and select the new form.

## Stages

- Baby
- In-Training
- Rookie
- Champion
- Ultimate
- Mega
- Special

## Types

- Nature
- Fire
- Water
- Dark
- Light
- Machine
- Beast
- Toxic

## Battle Model

Battles are simulated auto-battles. The first prototype compares player team power against enemy power with some randomness, then writes a readable battle log.

Win rewards:

- `+120` coins
- `+8` DNA shards
- `+35` XP for squad monsters
- `+1` battles won
- 25% item chance

Loss rewards:

- `+30` coins
- `+2` DNA shards
- `+12` XP for squad monsters

## Items

- Armor Core
- Shadow Gem
- Solar Crest
- Ancient Gear

Items can be required by specific evolutions.
