import { describe, expect, it } from 'vitest';
import { calculateEnemyBattleModifier, resolveBattle } from './battle.rules';

describe('battle rules', () => {
  it('scales win rewards from the reward multiplier', () => {
    const result = resolveBattle({
      teamPower: 1200,
      enemyPower: 900,
      playerModifier: 0,
      enemyModifier: 0,
      rewardMultiplier: 1.2,
      randomBetween: () => 1,
    });

    expect(result.won).toBe(true);
    expect(result.reward).toMatchObject({
      won: true,
      coins: 144,
      dnaShards: 10,
      xp: 42,
    });
  });

  it('keeps loss rewards useful without granting win values', () => {
    const result = resolveBattle({
      teamPower: 700,
      enemyPower: 1100,
      playerModifier: 0,
      enemyModifier: 0,
      rewardMultiplier: 1.35,
      randomBetween: () => 1,
    });

    expect(result.won).toBe(false);
    expect(result.reward).toMatchObject({
      won: false,
      coins: 32,
      dnaShards: 2,
      xp: 13,
    });
  });

  it('clamps the enemy modifier into the allowed combat range', () => {
    expect(calculateEnemyBattleModifier(0.25, 0.2)).toBe(0.32);
    expect(calculateEnemyBattleModifier(-0.25, -0.2)).toBe(-0.12);
  });
});
