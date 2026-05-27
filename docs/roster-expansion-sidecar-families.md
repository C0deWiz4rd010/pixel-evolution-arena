# Roster Expansion Sidecar Families

This sidecar note extends the roster planning space beyond `M050` with original concepts only. It is intentionally docs-only and does not change current gameplay code.

## Family A: Signal Reef Line

| ID | Stage | Type | Rarity | Name | Fantasy brief | Evolution hook |
| --- | --- | --- | --- | --- | --- | --- |
| M101 | Baby | Water | Common | Glintguppy | A tiny prism-finned fry that stores arena light in its transparent scales. | Evolves after early battle wins while carrying a small DNA reserve. |
| M102 | In-Training | Water | Common | Lumenkoi | A bright circuit-koi that leaves glowing wake trails across wet grid tiles. | Evolves when level and coin thresholds are met after repeated arena clears. |
| M103 | Rookie | Water | Rare | Reefvolt | A fast reef striker that converts splash impacts into crackling counter-current bursts. | Evolves when the player keeps it in an active squad long enough to build sustained XP. |
| M104 | Champion | Water | Epic | Tidal Haloid | A ring-crested aquatic sentinel that projects a rotating shield of liquid light around allies. | Late branch hook for an eventual `Solar Crest` or future tidal catalyst route into Ultimate content. |

## Family B: Ember Rail Line

| ID | Stage | Type | Rarity | Name | Fantasy brief | Evolution hook |
| --- | --- | --- | --- | --- | --- | --- |
| M105 | Baby | Fire | Common | Sparklug | A soot-nosed hatchling that coughs tiny engine-flame puffs when excited. | Evolves after basic Fire-line training and a small coin spend. |
| M106 | In-Training | Fire | Rare | Cinderbogie | A rail-skimming runner with furnace paws and a whistle-like battle cry. | Evolves when its level rises during an arena streak or repeated offensive wins. |
| M107 | Rookie | Fire | Rare | Furnace Lynx | A lean flame predator whose rib vents pulse brighter as the arena threat level rises. | Evolves from squad usage plus a stronger DNA requirement than the starter Fire route. |
| M108 | Ultimate | Fire | Legendary | Railflare Sovereign | A blazing monarch beast armored in segmented heat plates and comet-tail exhaust. | Special late-game hook for a risk-run reward item such as a future `Ignition Seal`. |

## Family C: Null Garden Line

| ID | Stage | Type | Rarity | Name | Fantasy brief | Evolution hook |
| --- | --- | --- | --- | --- | --- | --- |
| M109 | Baby | Nature | Common | Mossbit | A shy seedling byte with a glassy sprout shell and static pollen freckles. | Evolves after routine XP growth with no rare item requirement. |
| M110 | Rookie | Nature | Rare | Vine Cipher | A creeping code-vine creature that wraps broken arena panels in luminous leaf bands. | Evolves when the player commits resources into level growth and keeps it selected as an active chase. |
| M111 | Champion | Dark | Epic | Gloam Arbor | A haunted biomech trunk-beast that blooms with shadow petals during hazard cycles. | Cross-type branch hook for a future `Shadow Gem` fork from the Nature family. |
| M112 | Special | Dark | Legendary | Eclipse Trellis | A cathedral-sized lattice spirit woven from roots, void ribbons, and sealed moonlight. | End-branch prestige unlock after branch evolution plus a rare item gate and high resource spend. |

## HUD UI Elements

1. `Branch Pulse Chips`
Small chamfered chips for Collection and Evolution Tree that mark `Core Line`, `Cross-Type Fork`, or `Item Gate` with thin neon borders and compact two-letter glyphs.

2. `Archive Route Markers`
A new route-marker style for the tree: double-line magenta rails for prestige branches, dashed cyan rails for side growth, and an amber lock notch when a branch is item-gated.

3. `Save Archive Capsule`
A compact HUD widget for Handbook or Header that shows `SYNC`, `RESET ARMED`, and `VERSION` states as stacked monospace bands with scanline fill and a warning-red confirm state.

## Implementation Note

These concepts can plug in later without fighting the current architecture because the roster is already data-driven and the rules are separated into helpers. The monster entries would slot into [monsters.data.ts](/D:/Meine%20Projekte/pixel-evolution-arena/src/app/data/monsters.data.ts) as new records with staged requirements, while new art can live under `public/assets/creatures/` using the existing lowercase asset naming. The UI ideas map naturally to the current Evolution Tree, Collection, Header HUD, and Handbook surfaces, and the only rules work needed later would be optional new item hooks or new branch requirement variants rather than a structural rewrite.
