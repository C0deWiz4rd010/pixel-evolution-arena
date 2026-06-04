import { describe, expect, it } from 'vitest';
import { GEAR_DEFS } from '../data/gear.data';
import { GearInstance, GearLoadout } from '../models/gear.model';
import { Monster } from '../models/monster.model';
import {
  applyGearToMonster,
  canAfford,
  clampTier,
  describeGearBonus,
  forgeCost,
  gearInstanceBonus,
  PRISMATIC_STAT_MULTIPLIER,
  totalGearBonus,
} from './gear.rules';

const edgeCore = GEAR_DEFS.find((def) => def.id === 'gear-core-edge')!;

function makeMonster(overrides: Partial<Monster> = {}): Monster {
  return {
    id: 'M001',
    name: 'Tester',
    stage: 'Rookie',
    type: 'Machine',
    icon: 'TS',
    level: 5,
    xp: 0,
    maxXp: 100,
    attack: 100,
    defense: 80,
    speed: 60,
    hp: 200,
    rarity: 'Rare',
    unlocked: true,
    evolutionTargets: [],
    ...overrides,
  };
}

describe('gear.rules', () => {
  it('scales a gear instance bonus by tier', () => {
    const bonus = gearInstanceBonus({ instanceId: 'g1', defId: edgeCore.id, tier: 3 });
    expect(bonus.attack).toBe((edgeCore.base.attack ?? 0) * 3);
  });

  it('sums equipped gear into a total bonus', () => {
    const ownedGear: GearInstance[] = [
      { instanceId: 'g1', defId: 'gear-core-edge', tier: 2 },
      { instanceId: 'g2', defId: 'gear-plate-bastion', tier: 1 },
    ];
    const loadout: GearLoadout = { M001: { core: 'g1', plate: 'g2' } };
    const total = totalGearBonus('M001', loadout, ownedGear);
    expect(total.attack).toBe(28); // Edge Core 14 * tier 2
    expect(total.defense).toBe(14); // Bastion Plate 14 * tier 1
    expect(total.hp).toBe(18);
  });

  it('applies gear bonuses without mutating the source monster', () => {
    const monster = makeMonster();
    const ownedGear: GearInstance[] = [{ instanceId: 'g1', defId: 'gear-core-edge', tier: 1 }];
    const loadout: GearLoadout = { M001: { core: 'g1' } };
    const geared = applyGearToMonster(monster, loadout, ownedGear);
    expect(geared.attack).toBe(114);
    expect(monster.attack).toBe(100); // unchanged
  });

  it('applies the prismatic multiplier on top of gear', () => {
    const monster = makeMonster({ prismatic: true });
    const geared = applyGearToMonster(monster, {}, []);
    expect(geared.attack).toBe(Math.round(100 * PRISMATIC_STAT_MULTIPLIER));
  });

  it('increases forge cost per tier', () => {
    const t1 = forgeCost(edgeCore, 0);
    const t2 = forgeCost(edgeCore, 1);
    expect(t2.coins).toBeGreaterThan(t1.coins);
  });

  it('clamps tier within bounds', () => {
    expect(clampTier(0)).toBe(1);
    expect(clampTier(99)).toBe(5);
  });

  it('checks affordability', () => {
    expect(canAfford({ coins: 100, dnaShards: 5 }, 120, 6)).toBe(true);
    expect(canAfford({ coins: 100, dnaShards: 5 }, 90, 6)).toBe(false);
  });

  it('describes a bonus as a readable string', () => {
    expect(describeGearBonus({ attack: 14, hp: 18 })).toBe('+14 ATK / +18 HP');
    expect(describeGearBonus({})).toBe('No bonus');
  });
});
