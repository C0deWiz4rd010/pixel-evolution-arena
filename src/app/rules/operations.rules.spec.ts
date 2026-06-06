import { describe, expect, it } from 'vitest';
import { GEAR_SLOTS, GearInstance, GearLoadout } from '../models/gear.model';
import { Monster } from '../models/monster.model';
import { buildSquadLoadoutPlan, recommendForgeQuickAction } from './operations.rules';

function makeMonster(id: string): Monster {
  return {
    id,
    name: id,
    stage: 'Rookie',
    type: 'Data',
    rarity: 'Common',
    level: 10,
    xp: 0,
    maxXp: 100,
    unlocked: true,
    icon: '[]',
    hp: 80,
    attack: 72,
    defense: 68,
    speed: 70,
    description: '',
    evolutionTargets: [],
  };
}

describe('operations rules', () => {
  const squad = [makeMonster('M100'), makeMonster('M101'), makeMonster('M102')];

  it('builds a squad loadout plan from owned gear', () => {
    const ownedGear: GearInstance[] = [
      { instanceId: 'core-1', defId: 'gear-core-surge', tier: 1 },
      { instanceId: 'plate-1', defId: 'gear-plate-bastion', tier: 1 },
      { instanceId: 'drive-1', defId: 'gear-drive-pulse', tier: 1 },
      { instanceId: 'relic-1', defId: 'gear-relic-vital', tier: 1 },
    ];

    const plan = buildSquadLoadoutPlan(squad, ownedGear, {});

    expect(plan.assignedSlots).toBe(4);
    expect(plan.totalSlots).toBe(squad.length * GEAR_SLOTS.length);
    expect(plan.coveragePercent).toBe(33);
    expect(Object.keys(plan.loadout).length).toBeGreaterThan(0);
  });

  it('recommends auto-equip when gear exists but the squad is not loaded out', () => {
    const ownedGear: GearInstance[] = [
      { instanceId: 'core-1', defId: 'gear-core-edge', tier: 1 },
      { instanceId: 'plate-1', defId: 'gear-plate-bastion', tier: 1 },
    ];

    const recommendation = recommendForgeQuickAction({
      squad,
      ownedGear,
      currentLoadout: {},
      coins: 1200,
      dnaShards: 120,
    });

    expect(recommendation.kind).toBe('equip');
    expect(recommendation.actionLabel).toBe('Auto Equip');
  });

  it('recommends forging when slots are missing and resources are available', () => {
    const recommendation = recommendForgeQuickAction({
      squad,
      ownedGear: [],
      currentLoadout: {},
      coins: 2000,
      dnaShards: 200,
    });

    expect(recommendation.kind).toBe('forge');
    expect(recommendation.defId).toBeTruthy();
  });

  it('recommends upgrades when the current loadout is stable', () => {
    const ownedGear: GearInstance[] = [
      { instanceId: 'core-1', defId: 'gear-core-edge', tier: 1 },
      { instanceId: 'plate-1', defId: 'gear-plate-bastion', tier: 1 },
      { instanceId: 'drive-1', defId: 'gear-drive-pulse', tier: 1 },
      { instanceId: 'relic-1', defId: 'gear-relic-prism', tier: 1 },
      { instanceId: 'core-2', defId: 'gear-core-surge', tier: 1 },
      { instanceId: 'plate-2', defId: 'gear-plate-ward', tier: 1 },
      { instanceId: 'drive-2', defId: 'gear-drive-flux', tier: 1 },
      { instanceId: 'relic-2', defId: 'gear-relic-vital', tier: 1 },
      { instanceId: 'core-3', defId: 'gear-core-edge', tier: 1 },
      { instanceId: 'plate-3', defId: 'gear-plate-bastion', tier: 1 },
      { instanceId: 'drive-3', defId: 'gear-drive-pulse', tier: 1 },
      { instanceId: 'relic-3', defId: 'gear-relic-prism', tier: 1 },
    ];
    const currentLoadout: GearLoadout = {
      M100: { core: 'core-1', plate: 'plate-1', drive: 'drive-1', relic: 'relic-1' },
      M101: { core: 'core-2', plate: 'plate-2', drive: 'drive-2', relic: 'relic-2' },
      M102: { core: 'core-3', plate: 'plate-3', drive: 'drive-3', relic: 'relic-3' },
    };

    const recommendation = recommendForgeQuickAction({
      squad,
      ownedGear,
      currentLoadout,
      coins: 2000,
      dnaShards: 200,
    });

    expect(recommendation.kind).toBe('upgrade');
    expect(recommendation.instanceId).toBeTruthy();
  });
});
