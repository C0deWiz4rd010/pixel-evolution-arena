# Balance And Progression

This document turns the gameplay design into implementation-ready numbers.

## Stage Power Bands

| Stage | Target Power Range | Purpose |
| --- | ---: | --- |
| Baby | 80-145 | Starter identity, cute forms, quick early upgrades. |
| In-Training | 120-210 | First meaningful squad choices. |
| Rookie | 190-330 | Main early battle units. |
| Champion | 310-500 | First real power spike. |
| Ultimate | 500-760 | Mid-game chase goals. |
| Mega | 760-1050 | Long-term prestige forms. |
| Special | 900-1250 | Rare branch or item-gated showcase forms. |

Power is:

```ts
attack + defense + speed + hp
```

## XP Curves

Keep XP readable. The first prototype can use simple `maxXp` values on each monster.

Suggested bands:

| Stage | Max XP Range |
| --- | ---: |
| Baby | 80-140 |
| In-Training | 110-180 |
| Rookie | 160-260 |
| Champion | 240-380 |
| Ultimate | 340-520 |
| Mega | 500-760 |
| Special | 600-900 |

When XP reaches max:

1. Level increases by 1.
2. Remainder carries over.
3. Stats increase modestly.
4. Add a log line when battle reward causes level-up.

## Starting Unlocks

Initial unlocked creatures:

- Bubblit
- Sproutbit
- Emberling
- Shadepuff
- Aquabun
- Leafbyte

Reason: enough choice to form a squad, but many visible locked goals.

## Evolution Cost Bands

| Target Stage | Level | Coins | DNA Shards | Item Gate |
| --- | ---: | ---: | ---: | --- |
| In-Training | 2 | 80-120 | 4-6 | No |
| Rookie | 3 | 150 | 8 | Rarely |
| Champion | 7 | 350 | 18 | Sometimes |
| Ultimate | 11 | 550 | 28 | Sometimes |
| Mega | 15 | 800 | 40 | Often |
| Special | 12-18 | 650-1000 | 35-55 | Usually |

Early unlocks should happen quickly; late unlocks should feel like chase goals.

## Economy Targets

### Win

- Coins: `+120`
- DNA Shards: `+8`
- XP: `+35`
- Item chance: `25%`

### Loss

- Coins: `+30`
- DNA Shards: `+2`
- XP: `+12`

### Why This Works

- A player can afford several early evolutions immediately.
- Repeated wins visibly advance Champion requirements.
- Losses still move XP and resources enough to avoid frustration.

## Enemy Team

Initial static enemy team:

| Enemy | Type | Role |
| --- | --- | --- |
| Ironmole | Machine | Defensive anchor. |
| Fangbat | Dark | Fast disruptor. |
| Mossgolem | Nature | High-HP wall. |

Enemy power should be high enough to make one-member squads risky but beatable with a full starter squad.

Recommended enemy total power: `850-1100`.

## Battle Randomness

Use a small random roll to keep battles lively:

```ts
randomFactor = 0.85 + Math.random() * 0.3
```

Avoid randomness so high that upgrades feel meaningless.

## Item Drops

Initial pool:

- Armor Core
- Shadow Gem
- Solar Crest
- Ancient Gear

Implementation:

```ts
if (win && Math.random() < 0.25) {
  award one random item;
}
```

## Battle Log Variety

Each type should have at least two verbs:

| Type | Log Flavor |
| --- | --- |
| Water | wave, splash, pressure burst |
| Nature | vine, thorn, bloom surge |
| Fire | ember, flare, blaze rush |
| Dark | shadow cut, void feint |
| Light | flash, prism, solar pulse |
| Machine | servo strike, gear burst |
| Beast | claw rush, fang break |
| Toxic | venom mist, ooze shot |

## Early Fun Tuning

The first 3 battles should usually create at least one noticeable event:

- A level-up.
- Enough resources for a visible evolution.
- An item drop.
- A new card unlocked.

If that does not happen in manual QA, lower early requirements or increase XP.
