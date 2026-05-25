# Testing And Verification

## Build Checks

Run:

```bash
npm.cmd run build
```

## Automated Checks

Unit tests:

```bash
npm.cmd run test
```

Browser smoke tests:

```bash
npm.cmd run test:e2e
```

Current automated coverage focus:

- battle reward calculation
- XP overflow and repeated level-ups
- evolution requirement checks and item consumption
- squad synergy and modifier clamping
- type matchup summaries
- critical browser flow smoke for tabs, filters, empty-squad blocking, evolution, and battle rewards

## Manual Smoke Test

Verify:

- App loads without framework overlay.
- Header HUD displays player stats.
- Tabs switch between Evolution Tree, Squad, Arena, and Collection.
- Clicking a monster updates selected monster details.
- Unlocked monsters can be added to squad.
- Squad can remove monsters and clear all slots.
- Evolution button unlocks a valid target when requirements are met.
- Arena battle requires at least one squad monster.
- Battle rewards update coins, DNA shards, XP, levels, battle count, and inventory.
- Collection filters by stage, type, rarity, and lock status.
- Automated smoke remains green after any UI or state-management refactor.

## Responsive Checks

Check at:

- `390px` mobile width
- `768px` tablet width
- `1440px` desktop width

Look for:

- Text overflow
- Hidden controls
- Cards resizing unexpectedly
- Neon glow reducing readability
- Detail panels overlapping stage rows
