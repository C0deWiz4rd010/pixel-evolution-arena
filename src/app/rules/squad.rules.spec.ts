import { describe, expect, it } from 'vitest';
import { Monster } from '../models/monster.model';
import {
  calculateSquadBattleModifier,
  evaluateSquadSynergies,
  getMonsterPower,
  getSlotRole,
  SQUAD_SLOT_ROLES,
} from './squad.rules';

function createMonster(overrides: Partial<Monster>): Monster {
  return {
    id: 'M001',
    name: 'Testmon',
    stage: 'Rookie',
    type: 'Water',
    icon: 'T',
    level: 1,
    xp: 0,
    maxXp: 100,
    attack: 10,
    defense: 10,
    speed: 10,
    hp: 50,
    rarity: 'Common',
    unlocked: true,
    evolutionTargets: [],
    ...overrides,
  };
}

describe('squad rules', () => {
  it('calculates monster power from the combat stat block', () => {
    expect(getMonsterPower({ attack: 30, defense: 20, speed: 15, hp: 100 })).toBe(165);
  });

  it('finds synergy signals for a varied three-unit squad', () => {
    const squad = [
      createMonster({ id: 'M001', type: 'Water', stage: 'Rookie', attack: 86, defense: 76, speed: 74 }),
      createMonster({ id: 'M002', type: 'Nature', stage: 'Champion', attack: 88, defense: 78, speed: 70 }),
      createMonster({ id: 'M003', type: 'Fire', stage: 'Ultimate', attack: 90, defense: 82, speed: 72 }),
    ];

    const synergies = evaluateSquadSynergies(squad);
    const synergyIds = synergies.map((synergy) => synergy.id);

    expect(synergyIds).toEqual(expect.arrayContaining(['spectrum', 'velocity', 'bulwark', 'ruin', 'ladder']));
  });

  it('clamps the combined squad modifier into the allowed range', () => {
    const modifier = calculateSquadBattleModifier(
      [
        { id: 'a', label: 'A', detail: 'A', activation: 'fill the line', modifier: 0.2 },
        { id: 'b', label: 'B', detail: 'B', activation: 'fill the line', modifier: 0.15 },
      ],
      0.1,
    );

    expect(modifier).toBe(0.22);
  });

  it('exposes a slot role descriptor for each of the three squad slots', () => {
    expect(SQUAD_SLOT_ROLES.map((role) => role.id)).toEqual(['vanguard', 'core', 'anchor']);
    expect(getSlotRole(0).label).toBe('VANGUARD');
    expect(getSlotRole(1).label).toBe('SYNC CORE');
    expect(getSlotRole(2).label).toBe('ANCHOR');
    expect(getSlotRole(99).id).toBe('anchor');
    expect(getSlotRole(-1).id).toBe('vanguard');
  });

  it('attaches a how-to-activate string to every produced synergy', () => {
    const squad = [
      createMonster({ id: 'M001', type: 'Water', stage: 'Rookie', attack: 86, defense: 76, speed: 74 }),
      createMonster({ id: 'M002', type: 'Nature', stage: 'Champion', attack: 88, defense: 78, speed: 70 }),
      createMonster({ id: 'M003', type: 'Fire', stage: 'Ultimate', attack: 90, defense: 82, speed: 72 }),
    ];

    const synergies = evaluateSquadSynergies(squad);
    expect(synergies.length).toBeGreaterThan(0);
    for (const synergy of synergies) {
      expect(synergy.activation).toBeTruthy();
      expect(synergy.detail).toBeTruthy();
    }
  });
});
