import { describe, expect, it } from 'vitest';
import { Monster } from '../models/monster.model';
import { applyXpToMonster, applyXpToSquad } from './xp.rules';

function createMonster(overrides: Partial<Monster>): Monster {
  return {
    id: 'M001',
    name: 'Testmon',
    stage: 'Baby',
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

describe('xp rules', () => {
  it('carries overflow across multiple level-ups and writes logs', () => {
    const monster = createMonster({
      xp: 90,
      maxXp: 100,
      attack: 20,
      defense: 18,
      speed: 16,
      hp: 80,
    });

    const result = applyXpToSquad([monster], [monster.id], 130);
    const updated = result.updatedMonsters[0];

    expect(updated.level).toBe(3);
    expect(updated.xp).toBe(4);
    expect(updated.maxXp).toBe(135);
    expect(updated.attack).toBe(26);
    expect(updated.defense).toBe(22);
    expect(updated.speed).toBe(20);
    expect(updated.hp).toBe(96);
    expect(result.logs.map((log) => log.text)).toEqual([
      'Testmon reached level 2!',
      'Testmon reached level 3!',
    ]);
  });

  it('leaves monsters outside the squad unchanged', () => {
    const squadMonster = createMonster({ id: 'M001', name: 'Squaddie' });
    const benchMonster = createMonster({ id: 'M002', name: 'Benchy', xp: 20 });

    const result = applyXpToSquad([squadMonster, benchMonster], [squadMonster.id], 25);

    expect(result.updatedMonsters[0].xp).toBe(25);
    expect(result.updatedMonsters[1].xp).toBe(20);
  });

  it('can apply xp to a single targeted monster', () => {
    const lead = createMonster({ id: 'M001', name: 'Lead' });
    const reserve = createMonster({ id: 'M002', name: 'Reserve', xp: 11 });

    const result = applyXpToMonster([lead, reserve], reserve.id, 22);

    expect(result.updatedMonsters[0].xp).toBe(0);
    expect(result.updatedMonsters[1].xp).toBe(33);
    expect(result.logs).toHaveLength(0);
  });
});
