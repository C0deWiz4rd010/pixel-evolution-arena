import { describe, expect, it } from 'vitest';
import { Monster } from '../models/monster.model';
import { PlayerState } from '../models/player-state.model';
import { applyEvolutionToPlayer, canEvolve, getRequirementStatuses, unlockEvolutionTarget } from './evolution.rules';

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

function createPlayer(overrides: Partial<PlayerState>): PlayerState {
  return {
    coins: 1200,
    dnaShards: 45,
    battlesFought: 0,
    battlesWon: 0,
    selectedMonsterId: 'M001',
    squadIds: ['M001'],
    inventory: ['Shadow Gem'],
    ...overrides,
  };
}

describe('evolution rules', () => {
  it('reports requirement status and allows a ready evolution', () => {
    const source = createMonster({ id: 'M007', name: 'Aquabun', stage: 'In-Training', level: 3 });
    const target = createMonster({
      id: 'M014',
      name: 'Splashfang',
      stage: 'Rookie',
      unlocked: false,
      requirements: { level: 3, coins: 150, dnaShards: 8, item: 'Shadow Gem' },
    });
    const player = createPlayer({});

    const statuses = getRequirementStatuses(source, target, player);

    expect(statuses.every((status) => status.met)).toBe(true);
    expect(canEvolve(source, target, player)).toBe(true);
  });

  it('consumes resources and inventory when evolution succeeds', () => {
    const target = createMonster({
      id: 'M014',
      name: 'Splashfang',
      unlocked: false,
      requirements: { coins: 150, dnaShards: 8, item: 'Shadow Gem' },
    });
    const player = createPlayer({});

    const updatedPlayer = applyEvolutionToPlayer(player, target);

    expect(updatedPlayer.coins).toBe(1050);
    expect(updatedPlayer.dnaShards).toBe(37);
    expect(updatedPlayer.selectedMonsterId).toBe('M014');
    expect(updatedPlayer.inventory).toEqual([]);
  });

  it('unlocks the target and seeds its carry-over level', () => {
    const source = createMonster({ id: 'M007', level: 6 });
    const target = createMonster({ id: 'M014', unlocked: false, level: 1, xp: 40 });
    const monsters = [source, target];

    const updatedMonsters = unlockEvolutionTarget(monsters, source, target);
    const updatedTarget = updatedMonsters.find((monster) => monster.id === target.id);

    expect(updatedTarget?.unlocked).toBe(true);
    expect(updatedTarget?.level).toBe(4);
    expect(updatedTarget?.xp).toBe(0);
  });
});
